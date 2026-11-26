using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>The Active switch in the admin coupon list: it must reach the server, flip the coupon, and a switched-off coupon must stop working.</summary>
public class CouponToggleTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public CouponToggleTests(ApiFixture f) => _f = f;

    private async Task<Coupon> CouponAsync(string code, bool active = true)
    {
        await using var db = _f.Db.NewContext();
        var c = new Coupon { Code = code, DiscountType = EcommerceApp.Domain.Enums.DiscountType.Percentage, DiscountValue = 10, IsActive = active, MinOrderAmount = 0 };
        db.Coupons.Add(c);
        await db.SaveChangesAsync();
        return c;
    }

    [Fact]
    public async Task The_switch_flips_the_coupon_both_ways_and_reports_the_new_state()
    {
        var c = await CouponAsync("TOGGLE10");
        var url = $"/api/v1/coupons/{c.Id}/toggle-status";

        var off = await _f.Api.SendAsync(HttpMethod.Patch, url, _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, off.Status);
        Assert.False(off.Body.GetProperty("data").GetBoolean());
        await using (var db = _f.Db.NewContext()) Assert.False((await db.Coupons.AsNoTracking().SingleAsync(x => x.Id == c.Id)).IsActive);

        var on = await _f.Api.SendAsync(HttpMethod.Patch, url, _f.AdminToken);
        Assert.True(on.Body.GetProperty("data").GetBoolean());
        await using (var db = _f.Db.NewContext()) Assert.True((await db.Coupons.AsNoTracking().SingleAsync(x => x.Id == c.Id)).IsActive);
    }

    [Fact]
    public async Task A_switched_off_coupon_is_refused_at_checkout_and_a_switched_on_one_is_accepted()
    {
        var c = await CouponAsync("CHECKOUT10");
        var validate = (string code) => _f.Api.SendAsync(HttpMethod.Post, "/api/v1/coupons/validate", null, new { code, orderAmount = 500 });

        Assert.True((await validate("CHECKOUT10")).Body.GetProperty("data").GetProperty("isValid").GetBoolean());
        await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/coupons/{c.Id}/toggle-status", _f.AdminToken);
        Assert.False((await validate("CHECKOUT10")).Body.GetProperty("data").GetProperty("isValid").GetBoolean());
        await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/coupons/{c.Id}/toggle-status", _f.AdminToken);
        Assert.True((await validate("CHECKOUT10")).Body.GetProperty("data").GetProperty("isValid").GetBoolean());
    }

    [Fact]
    public async Task Only_an_admin_can_use_it_and_an_unknown_coupon_is_not_found()
    {
        var c = await CouponAsync("ADMINONLY10");
        var url = $"/api/v1/coupons/{c.Id}/toggle-status";
        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Patch, url)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Patch, url, _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await _f.Api.SendAsync(HttpMethod.Patch, $"/api/v1/coupons/{Guid.NewGuid()}/toggle-status", _f.AdminToken)).Status);
        await using var db = _f.Db.NewContext();
        Assert.True((await db.Coupons.AsNoTracking().SingleAsync(x => x.Id == c.Id)).IsActive);             // untouched
    }
}
