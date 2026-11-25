using System.Net;
using System.Security.Cryptography;
using System.Text;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EcommerceApp.Tests;

/// <summary>
/// Characterisation tests: they pin down what the EXISTING payment verification does. PaymentService.cs is not part
/// of the Stage 2.1 change, so these must pass both before and after it. Razorpay is replaced by a local stub – no
/// network call is made and the keys below are fake test values.
/// </summary>
public class RazorpayVerificationTests : IClassFixture<DbFixture>
{
    private const string Secret = "test_only_secret";
    private const string RzpOrder = "order_TEST0001";
    private readonly TestDatabase _t;
    public RazorpayVerificationTests(DbFixture f) => _t = f.Db;

    private sealed class FakeRazorpayConfig : IRazorpayConfigService
    {
        public Task<string> GetModeAsync() => Task.FromResult("test");
        public RazorpayCredentials? GetCredentials(string mode) => new(mode, "rzp_test_fake", Secret);
        public Task<RazorpayCredentials?> GetActiveCredentialsAsync() => Task.FromResult<RazorpayCredentials?>(GetCredentials("test"));
        public Task<RazorpayModeDto> GetInfoAsync() => Task.FromResult(new RazorpayModeDto());
        public Task<ApiResponse<RazorpayModeDto>> SetModeAsync(string mode, AuditContext audit) => throw new NotSupportedException();
    }

    private sealed class StubRazorpay(long amountPaise) : HttpMessageHandler, IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(this);
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            { Content = new StringContent($"{{\"id\":\"{RzpOrder}\",\"amount\":{amountPaise}}}", Encoding.UTF8, "application/json") });
    }

    private static string Sign(string orderId, string paymentId)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(Secret));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes($"{orderId}|{paymentId}"))).ToLowerInvariant();
    }

    private PaymentService Service(AppDbContext db, long razorpayAmountPaise)
    {
        var mapper = Seed.Mapper();
        var email = Seed.Email();
        var cart = new CartService(db, mapper);
        var orders = new OrderService(db, mapper, email, cart, new ShipmentOrderGuard(db));
        return new PaymentService(db, mapper, new ConfigurationBuilder().Build(), email, orders,
            new FakeRazorpayConfig(), new StubRazorpay(razorpayAmountPaise), cart);
    }

    private async Task<EcommerceApp.Domain.Entities.Order> PendingOnlineOrderAsync(AppDbContext db)
    {
        var user = await Seed.UserAsync(db, "Rzp");
        var product = await Seed.ProductAsync(db, price: 100m);
        var order = await Seed.OrderAsync(db, product, user.Id, OrderStatus.Pending, PaymentStatus.Pending, PaymentMethod.Razorpay, qty: 2);   // total 200
        order.RazorpayOrderId = RzpOrder;
        await db.SaveChangesAsync();
        return order;
    }

    [Fact]
    public async Task A_correctly_signed_payment_marks_the_order_paid_and_confirmed_once()
    {
        await using var db = _t.NewContext();
        var order = await PendingOnlineOrderAsync(db);
        var dto = new VerifyPaymentDto { OrderId = order.Id, RazorpayOrderId = RzpOrder, RazorpayPaymentId = "pay_TEST1", RazorpaySignature = Sign(RzpOrder, "pay_TEST1") };

        var first = await Service(db, 20000).VerifyPaymentAsync(dto, null);
        var again = await Service(db, 20000).VerifyPaymentAsync(dto, null);

        Assert.True(first.Success); Assert.Equal("Payment verified successfully.", first.Data);
        Assert.True(again.Success); Assert.Equal("Payment already verified.", again.Data);        // idempotent
        await using var check = _t.NewContext();
        var o = (await check.Orders.FindAsync(order.Id))!;
        Assert.Equal(PaymentStatus.Paid, o.PaymentStatus);
        Assert.Equal(OrderStatus.Confirmed, o.Status);
        Assert.Equal("pay_TEST1", o.RazorpayPaymentId);
        var payments = await check.Payments.Where(p => p.OrderId == order.Id).ToListAsync();
        Assert.Single(payments);
        Assert.Equal(200m, payments[0].Amount);
    }

    [Fact]
    public async Task A_wrong_signature_is_rejected_and_changes_nothing()
    {
        await using var db = _t.NewContext();
        var order = await PendingOnlineOrderAsync(db);
        var dto = new VerifyPaymentDto { OrderId = order.Id, RazorpayOrderId = RzpOrder, RazorpayPaymentId = "pay_TEST2", RazorpaySignature = "deadbeef" };

        var result = await Service(db, 20000).VerifyPaymentAsync(dto, null);

        Assert.False(result.Success); Assert.Equal("Invalid payment signature.", result.Message);
        await using var check = _t.NewContext();
        var o = (await check.Orders.FindAsync(order.Id))!;
        Assert.Equal(PaymentStatus.Pending, o.PaymentStatus);
        Assert.Equal(OrderStatus.Pending, o.Status);
        Assert.Equal(0, await check.Payments.CountAsync(p => p.OrderId == order.Id));
    }

    [Fact]
    public async Task A_payment_for_a_different_razorpay_order_is_rejected()
    {
        await using var db = _t.NewContext();
        var order = await PendingOnlineOrderAsync(db);
        var dto = new VerifyPaymentDto { OrderId = order.Id, RazorpayOrderId = "order_OTHER", RazorpayPaymentId = "pay_TEST3", RazorpaySignature = Sign("order_OTHER", "pay_TEST3") };

        var result = await Service(db, 20000).VerifyPaymentAsync(dto, null);

        Assert.False(result.Success); Assert.Equal("Payment does not match this order.", result.Message);
        await using var check = _t.NewContext();
        Assert.Equal(PaymentStatus.Pending, (await check.Orders.FindAsync(order.Id))!.PaymentStatus);
    }

    [Fact]
    public async Task A_razorpay_amount_that_differs_from_the_order_total_is_rejected()
    {
        await using var db = _t.NewContext();
        var order = await PendingOnlineOrderAsync(db);
        var dto = new VerifyPaymentDto { OrderId = order.Id, RazorpayOrderId = RzpOrder, RazorpayPaymentId = "pay_TEST4", RazorpaySignature = Sign(RzpOrder, "pay_TEST4") };

        var result = await Service(db, 100).VerifyPaymentAsync(dto, null);                     // Razorpay says ₹1.00, the order is ₹200

        Assert.False(result.Success); Assert.Equal("Payment order could not be confirmed with Razorpay.", result.Message);
        await using var check = _t.NewContext();
        Assert.Equal(PaymentStatus.Pending, (await check.Orders.FindAsync(order.Id))!.PaymentStatus);
    }
}
