using System.Net;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using C = EcommerceApp.Domain.Entities.ShipmentConstants.CreationStates;

namespace EcommerceApp.Tests;

/// <summary>Records the request / decision e-mails instead of sending them.</summary>
public sealed class SpyEmail : EmailService
{
    public List<string> Log { get; } = [];
    public SpyEmail() : base(new ConfigurationBuilder().Build(), NullLogger<EmailService>.Instance) { }
    public override Task SendCancelRequestedAsync(string toEmail, string customerName, string orderNumber, string reason) { Log.Add("cancel-requested:user:" + toEmail); return Task.CompletedTask; }
    public override Task SendCancelRequestedAdminAsync(string orderNumber, string customerName, string customerEmail, string reason, bool wasDispatched) { Log.Add("cancel-requested:admin"); return Task.CompletedTask; }
    public override Task SendCancelDecisionAsync(string toEmail, string customerName, string orderNumber, bool approved, string? adminNotes) { Log.Add((approved ? "cancel-approved:" : "cancel-rejected:") + toEmail); return Task.CompletedTask; }
}

/// <summary>An order that is already dispatched is cancelled only after an administrator approves the customer's request.</summary>
public class CancellationTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    private AuditContext _admin = null!;

    public async Task InitializeAsync()
    {
        _t = await TestDatabase.CreateAsync();
        await using var db = _t.NewContext();
        _admin = new AuditContext((await Seed.UserAsync(db, "CancelAdmin", UserRole.SuperAdmin)).Id, "127.0.0.1", "test");
    }

    public async Task DisposeAsync() => await _t.DisposeAsync();

    private CancellationService Service(AppDbContext db, SpyEmail email) => new(db, email, new ShipmentOrderGuard(db));

    private async Task<(User User, Order Order, Product Product)> OrderAsync(OrderStatus status, bool shipment = false, PaymentStatus pay = PaymentStatus.Pending)
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "Buyer");
        var p = await Seed.ProductAsync(db, stock: 10);
        var o = await Seed.OrderAsync(db, p, u.Id, status, pay, PaymentMethod.CashOnDelivery, 2);       // stock is 8
        if (shipment)
        {
            db.Shipments.Add(new Shipment { OrderId = o.Id, Mode = "test", ClientOrderRef = o.OrderNumber, CreationState = C.Created, CreateAttempts = 1, Awb = "AWB-C1", Status = "IN_TRANSIT" });
            db.OrderFulfilments.Add(new OrderFulfilment { OrderId = o.Id, State = FulfilmentStates.Shipped, ApprovedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }
        return (u, o, p);
    }

    [Fact]
    public async Task An_order_not_yet_dispatched_is_left_to_the_ordinary_direct_cancel()
    {
        var (u, o, _) = await OrderAsync(OrderStatus.Pending);
        var spy = new SpyEmail();
        await using var db = _t.NewContext();
        Assert.Null(await Service(db, spy).RequestIfDispatchedAsync(o.Id, "x", u.Id));
        Assert.Empty(spy.Log);
        Assert.False(await db.CancelRequests.AnyAsync());
    }

    [Fact]
    public async Task A_shipped_order_only_creates_a_request_and_mails_the_customer_and_the_admin()
    {
        var (u, o, _) = await OrderAsync(OrderStatus.Shipped);
        var spy = new SpyEmail();
        await using var db = _t.NewContext();
        var res = await Service(db, spy).RequestIfDispatchedAsync(o.Id, "ordered by mistake", u.Id);

        Assert.True(res!.Success);
        Assert.Contains("approval", res.Data);
        Assert.Equal(OrderStatus.Shipped, (await db.Orders.AsNoTracking().SingleAsync(x => x.Id == o.Id)).Status);          // nothing cancelled yet
        var r = await db.CancelRequests.SingleAsync();
        Assert.Equal(CancelRequestStatus.Pending, r.Status); Assert.True(r.WasDispatched); Assert.Equal("ordered by mistake", r.Reason);
        Assert.Equal(2, spy.Log.Count);
        Assert.Contains(spy.Log, l => l.StartsWith("cancel-requested:user:")); Assert.Contains("cancel-requested:admin", spy.Log);
    }

    [Fact]
    public async Task An_order_handed_to_the_courier_counts_as_dispatched_even_if_still_confirmed()
    {
        var (u, o, _) = await OrderAsync(OrderStatus.Confirmed, shipment: true);
        await using var db = _t.NewContext();
        var res = await Service(db, new SpyEmail()).RequestIfDispatchedAsync(o.Id, null, u.Id);
        Assert.NotNull(res); Assert.True(res!.Success);
        Assert.Equal("Cancelled by customer", (await db.CancelRequests.SingleAsync()).Reason);
    }

    [Fact]
    public async Task Asking_twice_does_not_create_a_second_request_or_more_mails()
    {
        var (u, o, _) = await OrderAsync(OrderStatus.Shipped);
        var spy = new SpyEmail();
        for (var i = 0; i < 3; i++) { await using var db = _t.NewContext(); await Service(db, spy).RequestIfDispatchedAsync(o.Id, "again", u.Id); }
        await using var c = _t.NewContext();
        Assert.Equal(1, await c.CancelRequests.CountAsync());
        Assert.Equal(2, spy.Log.Count);
    }

    [Fact]
    public async Task Someone_elses_order_and_delivered_orders_are_not_turned_into_requests()
    {
        var (_, o, _) = await OrderAsync(OrderStatus.Shipped);
        var (u2, delivered, _) = await OrderAsync(OrderStatus.Delivered);
        await using var db = _t.NewContext();
        var svc = Service(db, new SpyEmail());
        Assert.Null(await svc.RequestIfDispatchedAsync(o.Id, "x", Guid.NewGuid()));                   // not the owner
        Assert.Null(await svc.RequestIfDispatchedAsync(delivered.Id, "x", u2.Id));                    // delivered: a return, not a cancellation
        Assert.False(await db.CancelRequests.AnyAsync());
    }

    [Fact]
    public async Task Approval_cancels_the_order_stops_tracking_and_tells_the_customer()
    {
        var (u, o, p) = await OrderAsync(OrderStatus.Shipped, shipment: true, pay: PaymentStatus.Paid);
        var spy = new SpyEmail();
        Guid id;
        await using (var db = _t.NewContext()) { await Service(db, spy).RequestIfDispatchedAsync(o.Id, "changed mind", u.Id); id = (await db.CancelRequests.SingleAsync()).Id; }

        await using var d = _t.NewContext();
        var res = await Service(d, spy).ApproveAsync(id, "ok", _admin);
        Assert.True(res.Success); Assert.Contains("Delhivery portal", res.Data);

        await using var c = _t.NewContext();
        var order = await c.Orders.AsNoTracking().SingleAsync(x => x.Id == o.Id);
        Assert.Equal(OrderStatus.Cancelled, order.Status); Assert.Equal(RefundStatus.Requested, order.RefundStatus);   // paid: flagged for refund review
        var ship = await c.Shipments.AsNoTracking().SingleAsync(x => x.OrderId == o.Id);
        Assert.Equal("CANCELLED", ship.Status); Assert.True(ship.IsFinal);
        Assert.Equal(FulfilmentStates.Completed, (await c.OrderFulfilments.AsNoTracking().SingleAsync(x => x.OrderId == o.Id)).State);
        Assert.Equal(8, (await c.Products.AsNoTracking().SingleAsync(x => x.Id == p.Id)).StockQuantity);                // parcel is out: stock not restored
        var r = await c.CancelRequests.AsNoTracking().SingleAsync();
        Assert.Equal(CancelRequestStatus.Approved, r.Status); Assert.Equal(_admin.UserId, r.ReviewedByUserId);
        Assert.Contains(spy.Log, l => l.StartsWith("cancel-approved:"));
        Assert.Contains(await c.ActivityLogs.ToListAsync(), a => a.Action == "Cancel.Approved");

        var again = await Service(c, spy).ApproveAsync(id, null, _admin);
        Assert.False(again.Success); Assert.Equal(409, again.StatusCode);                              // decided once
    }

    [Fact]
    public async Task Declining_keeps_the_order_and_tells_the_customer()
    {
        var (u, o, _) = await OrderAsync(OrderStatus.Shipped);
        var spy = new SpyEmail();
        Guid id;
        await using (var db = _t.NewContext()) { await Service(db, spy).RequestIfDispatchedAsync(o.Id, "x", u.Id); id = (await db.CancelRequests.SingleAsync()).Id; }
        await using var d = _t.NewContext();
        Assert.True((await Service(d, spy).RejectAsync(id, "Already out for delivery", _admin)).Success);

        await using var c = _t.NewContext();
        Assert.Equal(OrderStatus.Shipped, (await c.Orders.AsNoTracking().SingleAsync(x => x.Id == o.Id)).Status);
        Assert.Equal(CancelRequestStatus.Rejected, (await c.CancelRequests.AsNoTracking().SingleAsync()).Status);
        Assert.Contains(spy.Log, l => l.StartsWith("cancel-rejected:"));
        Assert.False((await Service(c, spy).ApproveAsync(id, null, _admin)).Success);                  // cannot be approved after a decline
    }
}

public class CancellationApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public CancellationApiTests(ApiFixture f) => _f = f;

    private async Task<Order> OrderAsync(User owner, OrderStatus status)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db);
        return await Seed.OrderAsync(db, p, owner.Id, status);
    }

    [Fact]
    public async Task A_customer_cancelling_a_shipped_order_sends_a_request_and_a_pending_order_still_cancels_directly()
    {
        var shipped = await OrderAsync(_f.Alice, OrderStatus.Shipped);
        var res = await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{shipped.Id}/cancel", _f.AliceToken, new { reason = "test" });
        Assert.Equal(HttpStatusCode.OK, res.Status);
        Assert.Contains("approval", res.Body.GetProperty("data").GetString());
        await using (var db = _f.Db.NewContext())
            Assert.Equal(OrderStatus.Shipped, (await db.Orders.AsNoTracking().SingleAsync(o => o.Id == shipped.Id)).Status);

        var mine = await _f.Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{shipped.Id}/cancel-request", _f.AliceToken);
        Assert.Equal("Pending", mine.Body.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _f.Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{shipped.Id}/cancel-request", _f.BobToken)).Status);
        Assert.Equal(JsonKindNull, (await _f.Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{shipped.Id}/cancel-request", _f.BobToken)).Body.GetProperty("data").ValueKind);   // Bob sees nothing

        var pending = await OrderAsync(_f.Alice, OrderStatus.Pending);
        var direct = await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{pending.Id}/cancel", _f.AliceToken, new { reason = "test" });
        Assert.Equal("Order cancelled.", direct.Body.GetProperty("data").GetString());
    }

    private static readonly System.Text.Json.JsonValueKind JsonKindNull = System.Text.Json.JsonValueKind.Null;

    [Fact]
    public async Task Only_an_admin_can_list_approve_or_decline_requests()
    {
        var shipped = await OrderAsync(_f.Bob, OrderStatus.Shipped);
        await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{shipped.Id}/cancel", _f.BobToken, new { reason = "x" });
        Guid reqId;
        await using (var db = _f.Db.NewContext()) reqId = (await db.CancelRequests.AsNoTracking().SingleAsync(r => r.OrderId == shipped.Id)).Id;

        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/cancel-requests")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/cancel-requests", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Post, $"/api/v1/cancel-requests/{reqId}/approve", _f.BobToken, new { })).Status);
        Assert.Equal(HttpStatusCode.OK, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/cancel-requests", _f.AdminToken)).Status);

        var ok = await _f.Api.SendAsync(HttpMethod.Post, $"/api/v1/cancel-requests/{reqId}/approve", _f.AdminToken, new { notes = "fine" });
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        await using var c = _f.Db.NewContext();
        Assert.Equal(OrderStatus.Cancelled, (await c.Orders.AsNoTracking().SingleAsync(o => o.Id == shipped.Id)).Status);
    }
}
