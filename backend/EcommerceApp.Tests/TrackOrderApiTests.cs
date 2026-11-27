using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Tests.Support;

namespace EcommerceApp.Tests;

/// <summary>The public Track order endpoint, through the real API: guest orders and account orders, active and cancelled, by e-mail or mobile number.</summary>
public class TrackOrderApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public TrackOrderApiTests(ApiFixture f) => _f = f;

    private async Task<Order> OrderAsync(Guid? userId, OrderStatus status, string? guestEmail = null, string? guestPhone = null)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 10);
        return await Seed.OrderAsync(db, p, userId, status, PaymentStatus.Pending, PaymentMethod.CashOnDelivery, 1, guestEmail, guestPhone);
    }

    private Task<(HttpStatusCode Status, System.Text.Json.JsonElement Body)> Track(string order, string contact) =>
        _f.Api.SendAsync(HttpMethod.Post, "/api/v1/orders/track", null, new { orderNumber = order, contact });

    [Theory]
    [InlineData(OrderStatus.Pending)]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled)]
    public async Task A_guest_order_in_any_status_is_found_by_email_or_phone(OrderStatus status)
    {
        var o = await OrderAsync(null, status, "guest.track@example.test", "9811122233");
        foreach (var contact in new[] { "guest.track@example.test", "GUEST.TRACK@example.test", " guest.track@example.test ", "9811122233", "+91 98111 22233" })
        {
            var r = await Track(o.OrderNumber.ToLowerInvariant(), contact);
            Assert.Equal(HttpStatusCode.OK, r.Status);
            Assert.Equal((int)status, r.Body.GetProperty("data").GetProperty("status").GetInt32());
            Assert.Equal(o.OrderNumber, r.Body.GetProperty("data").GetProperty("orderNumber").GetString());
        }
    }

    [Theory]
    [InlineData(OrderStatus.Pending)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled)]
    public async Task An_account_order_in_any_status_is_found_with_the_account_email_or_phone(OrderStatus status)
    {
        var o = await OrderAsync(_f.Alice.Id, status);
        var r = await Track(o.OrderNumber, _f.Alice.Email);
        Assert.Equal(HttpStatusCode.OK, r.Status);
        Assert.Equal((int)status, r.Body.GetProperty("data").GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Wrong_details_and_missing_orders_give_the_same_not_found_answer_and_nothing_leaks()
    {
        var guest = await OrderAsync(null, OrderStatus.Cancelled, "owner.only@example.test", "9822233344");
        var member = await OrderAsync(_f.Bob.Id, OrderStatus.Cancelled);

        var wrongGuest = await Track(guest.OrderNumber, "someone.else@example.test");
        var wrongMember = await Track(member.OrderNumber, _f.Alice.Email);                 // another customer's e-mail
        var missing = await Track("ORD-20260101-NOSUCH", "owner.only@example.test");
        foreach (var r in new[] { wrongGuest, wrongMember, missing }) Assert.Equal(HttpStatusCode.NotFound, r.Status);
        Assert.Equal(wrongGuest.Body.ToString(), missing.Body.ToString());
        Assert.Equal(wrongMember.Body.ToString(), missing.Body.ToString());

        var ok = (await Track(guest.OrderNumber, "owner.only@example.test")).Body.ToString();
        foreach (var leaked in new[] { "9822233344", "owner.only@example.test", "Secret", "Street", "110001", "totalAmount" })
            Assert.DoesNotContain(leaked, ok, StringComparison.OrdinalIgnoreCase);
    }
}
