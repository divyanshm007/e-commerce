using EcommerceApp.Application.Common;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EcommerceApp.Tests;

/// <summary>The Razorpay test/live flag: fail-closed on a corrupt value, and every change audited. Fake keys only.</summary>
public class RazorpayModeTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    private AuditContext _admin = null!;

    public async Task InitializeAsync()
    {
        _t = await TestDatabase.CreateAsync();
        await using var db = _t.NewContext();
        _admin = new AuditContext((await Seed.UserAsync(db, "PayAdmin", UserRole.SuperAdmin)).Id, "203.0.113.9", "xunit/1.0");
    }

    public async Task DisposeAsync() => await _t.DisposeAsync();

    private static RazorpayConfigService Service(AppDbContext db, bool test = true, bool live = true)
    {
        var v = new Dictionary<string, string?>();
        if (test) { v["Razorpay:Test:KeyId"] = "rzp_test_FAKE"; v["Razorpay:Test:KeySecret"] = "FAKE-TEST-SECRET-xyz"; }
        if (live) { v["Razorpay:Live:KeyId"] = "rzp_live_FAKE"; v["Razorpay:Live:KeySecret"] = "FAKE-LIVE-SECRET-xyz"; }
        return new RazorpayConfigService(new ConfigurationBuilder().AddInMemoryCollection(v).Build(), new SettingsService(db, Seed.Mapper()), db);
    }

    private async Task StoreAsync(string value)
    {
        await using var db = _t.NewContext();
        db.WebsiteSettings.Add(new WebsiteSetting { Key = "razorpay_mode", Value = value, Group = "payment" });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task A_missing_setting_is_test_not_an_error()
    {
        await using var db = _t.NewContext();
        Assert.Equal("test", await Service(db).GetModeAsync());
        Assert.Null((await Service(db).GetInfoAsync()).ConfigurationError);
    }

    [Theory]
    [InlineData("test")]
    [InlineData("live")]
    [InlineData(" LIVE ")]
    public async Task Valid_values_are_accepted_case_and_space_insensitively(string stored)
    {
        await StoreAsync(stored);
        await using var db = _t.NewContext();
        Assert.Equal(stored.Trim().ToLowerInvariant(), await Service(db).GetModeAsync());
    }

    [Theory]
    [InlineData("banana")]
    [InlineData("")]
    [InlineData("production")]
    [InlineData("1")]
    public async Task A_corrupt_value_fails_closed_instead_of_becoming_test(string stored)
    {
        await StoreAsync(stored);
        await using var db = _t.NewContext();
        var svc = Service(db);

        await Assert.ThrowsAsync<RazorpayConfigurationException>(() => svc.GetModeAsync());
        await Assert.ThrowsAsync<RazorpayConfigurationException>(() => svc.GetActiveCredentialsAsync());

        var info = await svc.GetInfoAsync();                                                     // the admin screen still loads
        Assert.Equal("invalid", info.Mode);
        Assert.Contains("must be 'test' or 'live'", info.ConfigurationError);
        Assert.Null(info.KeyId);
        Assert.DoesNotContain("FAKE", info.ConfigurationError);
    }

    [Fact]
    public async Task A_corrupt_value_can_be_repaired_by_choosing_a_mode_and_the_repair_is_audited()
    {
        await StoreAsync("banana");
        await using var db = _t.NewContext();
        var result = await Service(db).SetModeAsync("test", _admin);

        Assert.True(result.Success);
        Assert.Equal("test", result.Data!.Mode);
        var log = await db.ActivityLogs.SingleAsync(a => a.Action == "RazorpayModeChanged");
        Assert.Equal("invalid -> test", log.Description);
    }

    [Fact]
    public async Task Every_mode_change_writes_who_when_and_from_to()
    {
        await using var db = _t.NewContext();
        var svc = Service(db);
        Assert.True((await svc.SetModeAsync("live", _admin)).Success);
        Assert.True((await svc.SetModeAsync(" TEST ", _admin)).Success);

        var logs = await db.ActivityLogs.AsNoTracking().Where(a => a.Action == "RazorpayModeChanged").OrderBy(a => a.CreatedAt).ToListAsync();
        Assert.Equal(["test -> live", "live -> test"], logs.Select(l => l.Description));
        Assert.All(logs, l =>
        {
            Assert.Equal(_admin.UserId, l.UserId); Assert.Equal("203.0.113.9", l.IpAddress); Assert.Equal("xunit/1.0", l.UserAgent);
            Assert.Equal("razorpay_mode", l.EntityId);
        });
    }

    [Fact]
    public async Task A_refused_change_is_audited_too_and_leaves_the_mode_alone()
    {
        await using var db = _t.NewContext();
        var svc = Service(db, live: false);

        var live = await svc.SetModeAsync("live", _admin);
        Assert.False(live.Success);
        Assert.False((await svc.SetModeAsync("banana", _admin)).Success);
        Assert.Equal("test", await svc.GetModeAsync());
        Assert.Contains(await db.ActivityLogs.ToListAsync(), a => a.Action == "RazorpayModeChangeRejected" && a.Description!.Contains("live keys are not configured"));
        Assert.DoesNotContain(await db.ActivityLogs.ToListAsync(), a => a.Action == "RazorpayModeChanged");
    }

    [Fact]
    public async Task The_audit_trail_never_contains_a_key()
    {
        await using var db = _t.NewContext();
        await Service(db).SetModeAsync("live", _admin);
        Assert.All(await db.ActivityLogs.ToListAsync(), a => Assert.DoesNotContain("FAKE", a.Description ?? ""));
    }
}
