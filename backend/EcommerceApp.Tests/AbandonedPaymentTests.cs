using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>An online order whose payment was closed or failed must not linger as a Pending order next to the COD order the customer then places.</summary>
public class AbandonedPaymentTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    public async Task InitializeAsync() => _t = await TestDatabase.CreateAsync();
    public async Task DisposeAsync() => await _t.DisposeAsync();

    private async Task<(User User, Order Order, Product Product)> OnlineOrderAsync(int minutesOld = 0, PaymentStatus pay = PaymentStatus.Pending)
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "Payer");
        var p = await Seed.ProductAsync(db, stock: 10);
        var o = await Seed.OrderAsync(db, p, u.Id, OrderStatus.Pending, pay, PaymentMethod.Razorpay, 2);        // stock is 8
        db.Payments.Add(new Payment { OrderId = o.Id, Method = PaymentMethod.Razorpay, Status = pay, Amount = o.TotalAmount, RazorpayOrderId = "order_test" });
        o.CreatedAt = DateTime.UtcNow.AddMinutes(-minutesOld);
        await db.SaveChangesAsync();
        return (u, o, p);
    }

    [Fact]
    public async Task Closing_the_payment_cancels_the_order_fails_the_payment_and_restores_stock()
    {
        var (u, o, p) = await OnlineOrderAsync();
        await using var db = _t.NewContext();
        var svc = Seed.OrderService(db);

        var res = await svc.CancelUnpaidOnlineOrderAsync(o.Id, u.Id);
        Assert.True(res.Success);

        await using var c = _t.NewContext();
        var order = await c.Orders.AsNoTracking().Include(x => x.Payments).SingleAsync(x => x.Id == o.Id);
        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal(PaymentStatus.Failed, order.PaymentStatus);
        Assert.All(order.Payments, pay => Assert.Equal(PaymentStatus.Failed, pay.Status));
        Assert.Equal(10, (await c.Products.AsNoTracking().SingleAsync(x => x.Id == p.Id)).StockQuantity);

        // closing twice is harmless and never restores stock again
        Assert.True((await Seed.OrderService(c).CancelUnpaidOnlineOrderAsync(o.Id, u.Id)).Success);
        Assert.Equal(10, (await c.Products.AsNoTracking().SingleAsync(x => x.Id == p.Id)).StockQuantity);
    }

    [Fact]
    public async Task A_paid_cod_or_someone_elses_order_is_never_cancelled_this_way()
    {
        var (u, paid, _) = await OnlineOrderAsync(pay: PaymentStatus.Paid);
        var (_, other, _) = await OnlineOrderAsync();
        Order cod;
        await using (var d = _t.NewContext()) { var p = await Seed.ProductAsync(d); cod = await Seed.OrderAsync(d, p, u.Id, OrderStatus.Pending, PaymentStatus.Pending, PaymentMethod.CashOnDelivery); }

        await using var db = _t.NewContext();
        var svc = Seed.OrderService(db);
        Assert.Equal(409, (await svc.CancelUnpaidOnlineOrderAsync(paid.Id, u.Id)).StatusCode);                  // already paid
        Assert.Equal(400, (await svc.CancelUnpaidOnlineOrderAsync(cod.Id, u.Id)).StatusCode);                   // not an online order
        Assert.Equal(404, (await svc.CancelUnpaidOnlineOrderAsync(other.Id, u.Id)).StatusCode);                 // not theirs

        await using var c = _t.NewContext();
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == paid.Id)).Status);
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == other.Id)).Status);
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == cod.Id)).Status);
    }

    [Fact]
    public async Task The_cleanup_cancels_only_old_unpaid_online_orders()
    {
        var (_, old, _) = await OnlineOrderAsync(minutesOld: 45);
        var (_, recent, _) = await OnlineOrderAsync(minutesOld: 5);
        var (_, paid, _) = await OnlineOrderAsync(minutesOld: 90, pay: PaymentStatus.Paid);

        await using var db = _t.NewContext();
        Assert.Equal(1, await Seed.OrderService(db).CancelAbandonedOnlineOrdersAsync(TimeSpan.FromMinutes(30)));

        await using var c = _t.NewContext();
        Assert.Equal(OrderStatus.Cancelled, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == old.Id)).Status);
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == recent.Id)).Status);
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == paid.Id)).Status);
        Assert.Equal(0, await Seed.OrderService(c).CancelAbandonedOnlineOrdersAsync(TimeSpan.FromMinutes(30)));      // nothing left to do
    }
}

public class AbandonedPaymentApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public AbandonedPaymentApiTests(ApiFixture f) => _f = f;

    private async Task<Order> UnpaidOnlineOrderAsync(User owner, int minutesOld)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 50);
        var o = await Seed.OrderAsync(db, p, owner.Id, OrderStatus.Pending, PaymentStatus.Pending, PaymentMethod.Razorpay, 1);
        o.CreatedAt = DateTime.UtcNow.AddMinutes(-minutesOld);
        await db.SaveChangesAsync();
        return o;
    }

    [Fact]
    public async Task The_checkout_calls_this_when_the_payment_window_is_closed()
    {
        var o = await UnpaidOnlineOrderAsync(_f.Alice, 0);
        Assert.Equal(HttpStatusCode.NotFound, (await _f.Api.SendAsync(HttpMethod.Post, $"/api/v1/payments/razorpay/abandon/{o.Id}", _f.BobToken)).Status);   // someone else
        var ok = await _f.Api.SendAsync(HttpMethod.Post, $"/api/v1/payments/razorpay/abandon/{o.Id}", _f.AliceToken);
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        await using var db = _f.Db.NewContext();
        var order = await db.Orders.AsNoTracking().SingleAsync(x => x.Id == o.Id);
        Assert.Equal(OrderStatus.Cancelled, order.Status); Assert.Equal(PaymentStatus.Failed, order.PaymentStatus);
    }

    [Fact]
    public async Task Placing_a_new_order_closes_the_customers_earlier_unpaid_online_order_but_not_one_opened_a_moment_ago()
    {
        var earlier = await UnpaidOnlineOrderAsync(_f.Alice, 10);
        var justNow = await UnpaidOnlineOrderAsync(_f.Alice, 0);
        Guid productId;
        await using (var db = _f.Db.NewContext()) productId = (await Seed.ProductAsync(db, stock: 20)).Id;

        var body = new
        {
            paymentMethod = 2,
            shippingAddress = new { fullName = "Alice", phone = "9876543210", line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = "110001", country = "India" },
            billingAddress = new { fullName = "Alice", phone = "9876543210", line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = "110001", country = "India" },
            items = new[] { new { productId, quantity = 1 } }
        };
        Assert.Equal(HttpStatusCode.OK, (await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/orders", _f.AliceToken, body)).Status);

        await using var c = _f.Db.NewContext();
        Assert.Equal(OrderStatus.Cancelled, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == earlier.Id)).Status);
        Assert.Equal(OrderStatus.Pending, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == justNow.Id)).Status);
    }
}
