using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>The Reports page numbers: the date range is honoured, totals cover every order, and cancelled orders are not revenue.</summary>
public class OrderReportTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    public async Task InitializeAsync() => _t = await TestDatabase.CreateAsync();
    public async Task DisposeAsync() => await _t.DisposeAsync();

    private async Task<Order> AddAsync(AppDbContext db, Product p, Guid userId, DateTime createdUtc, OrderStatus status, decimal total)
    {
        var o = await Seed.OrderAsync(db, p, userId, status, PaymentStatus.Pending, PaymentMethod.CashOnDelivery, 1);
        o.CreatedAt = createdUtc; o.TotalAmount = total; o.SubTotal = total;
        await db.SaveChangesAsync();
        return o;
    }

    [Fact]
    public async Task The_date_range_totals_and_exclusions_are_right()
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "Rep");
        var p = await Seed.ProductAsync(db, stock: 1000);

        // India calendar days: 10 Nov 00:00 IST = 9 Nov 18:30 UTC
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 9, 18, 29, 0, DateTimeKind.Utc), OrderStatus.Delivered, 999);   // 9 Nov 23:59 IST: outside
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 9, 18, 30, 0, DateTimeKind.Utc), OrderStatus.Delivered, 100);   // 10 Nov 00:00 IST: inside
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 11, 10, 0, 0, DateTimeKind.Utc), OrderStatus.Pending, 300);
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 11, 12, 0, 0, DateTimeKind.Utc), OrderStatus.Cancelled, 500);   // not revenue
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 12, 18, 29, 0, DateTimeKind.Utc), OrderStatus.Shipped, 200);    // 12 Nov 23:59 IST: inside
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 12, 18, 30, 0, DateTimeKind.Utc), OrderStatus.Delivered, 888);  // 13 Nov 00:00 IST: outside

        var r = (await Seed.OrderService(db).GetReportAsync(new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 12))).Data!;

        Assert.Equal(4, r.OrdersCount);                         // 100, 300, 500, 200
        Assert.Equal(3, r.CountedOrders);                       // the cancelled one is not counted
        Assert.Equal(600m, r.Revenue);
        Assert.Equal(200m, r.AverageOrderValue);
        Assert.Equal(1, r.DeliveredCount);
        Assert.Equal(1, r.CancelledCount);
        Assert.Equal([300m, 200m, 100m], r.TopOrders.Select(o => o.TotalAmount));       // highest first, cancelled left out
    }

    [Fact]
    public async Task A_reversed_range_is_swapped_and_no_range_means_everything()
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "Rep2");
        var p = await Seed.ProductAsync(db, stock: 1000);
        await AddAsync(db, p, u.Id, new DateTime(2026, 11, 11, 10, 0, 0, DateTimeKind.Utc), OrderStatus.Confirmed, 50);
        var svc = Seed.OrderService(db);

        var swapped = (await svc.GetReportAsync(new DateOnly(2026, 11, 12), new DateOnly(2026, 11, 10))).Data!;
        Assert.Equal(50m, swapped.Revenue);
        Assert.Equal(new DateOnly(2026, 11, 10), swapped.From);

        var all = (await svc.GetReportAsync(null, null)).Data!;
        Assert.Equal(1, all.OrdersCount);
        Assert.Equal(0m, (await svc.GetReportAsync(new DateOnly(2030, 1, 1), null)).Data!.Revenue);
    }

    [Fact]
    public async Task Totals_cover_more_than_a_hundred_orders()
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "Rep3");
        var p = await Seed.ProductAsync(db, stock: 100000);
        for (var i = 0; i < 130; i++)
            await AddAsync(db, p, u.Id, new DateTime(2026, 11, 11, 10, 0, 0, DateTimeKind.Utc).AddMinutes(i), OrderStatus.Delivered, 10);

        var r = (await Seed.OrderService(db).GetReportAsync(new DateOnly(2026, 11, 11), new DateOnly(2026, 11, 11))).Data!;
        Assert.Equal(130, r.OrdersCount);
        Assert.Equal(1300m, r.Revenue);                         // the old page stopped at 100 orders
        Assert.Equal(10, r.TopOrders.Count);
    }
}

public class OrderReportApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public OrderReportApiTests(ApiFixture f) => _f = f;

    [Fact]
    public async Task Only_an_admin_can_read_the_report()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/orders/report")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/orders/report", _f.AliceToken)).Status);
        var ok = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/orders/report?from=2026-01-01&to=2026-12-31", _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        Assert.True(ok.Body.GetProperty("data").TryGetProperty("revenue", out _));
    }
}
