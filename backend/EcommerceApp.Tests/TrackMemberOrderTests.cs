using EcommerceApp.Domain.Enums;
using EcommerceApp.Tests.Support;

namespace EcommerceApp.Tests;

/// <summary>The Track order page finds an order by its number plus the e-mail or mobile number that belongs to it, however it was placed, and also once it is cancelled.</summary>
public class TrackMemberOrderTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    public async Task InitializeAsync() => _t = await TestDatabase.CreateAsync();
    public async Task DisposeAsync() => await _t.DisposeAsync();

    [Fact]
    public async Task An_order_placed_from_an_account_is_found_with_the_account_email_or_phone()
    {
        await using var db = _t.NewContext();
        var member = await Seed.UserAsync(db, "Tracker");
        member.Phone = "9876501234";
        await db.SaveChangesAsync();
        var order = await Seed.OrderAsync(db, await Seed.ProductAsync(db), member.Id);
        var svc = Seed.OrderService(db);

        var byEmail = await svc.TrackGuestOrderAsync(order.OrderNumber, member.Email.ToUpperInvariant());
        Assert.True(byEmail.Success);
        Assert.Equal(order.OrderNumber, byEmail.Data!.OrderNumber);
        Assert.True((await svc.TrackGuestOrderAsync(order.OrderNumber, "+91 98765 01234")).Success);
        Assert.False((await svc.TrackGuestOrderAsync(order.OrderNumber, "someone.else@example.test")).Success);
    }

    [Fact]
    public async Task A_cancelled_order_can_still_be_tracked_and_shows_as_cancelled()
    {
        await using var db = _t.NewContext();
        var member = await Seed.UserAsync(db, "Canceller");
        var guest = await Seed.OrderAsync(db, await Seed.ProductAsync(db), null, OrderStatus.Cancelled, guestEmail: "gone@example.test", guestPhone: "9000000001");
        var mine = await Seed.OrderAsync(db, await Seed.ProductAsync(db), member.Id, OrderStatus.Cancelled);
        var svc = Seed.OrderService(db);

        var g = await svc.TrackGuestOrderAsync(guest.OrderNumber, "gone@example.test");
        Assert.True(g.Success); Assert.Equal(OrderStatus.Cancelled, g.Data!.Status);
        var m = await svc.TrackGuestOrderAsync(mine.OrderNumber, member.Email);
        Assert.True(m.Success); Assert.Equal(OrderStatus.Cancelled, m.Data!.Status);
    }
}
