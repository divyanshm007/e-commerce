using System.Net;
using System.Text.Json;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EcommerceApp.Tests;

/// <summary>The Delhivery mode service (database setting + environment credentials). Fake tokens only.</summary>
public class DelhiveryConfigServiceTests : IClassFixture<DbFixture>
{
    private const string FakeTestToken = "FAKE-TEST-TOKEN-do-not-leak-1";
    private const string FakeLiveToken = "FAKE-LIVE-TOKEN-do-not-leak-2";
    private readonly TestDatabase _t;
    public DelhiveryConfigServiceTests(DbFixture f) => _t = f.Db;

    private AuditContext Admin = null!;

    private async Task<AppDbContext> CleanAsync()
    {
        var db = _t.NewContext();
        db.WebsiteSettings.RemoveRange(db.WebsiteSettings);
        db.ActivityLogs.RemoveRange(db.ActivityLogs);
        await db.SaveChangesAsync();
        // a real admin: the audit row's UserId is a foreign key to Users
        var admin = await Seed.UserAsync(db, "CfgAdmin", UserRole.SuperAdmin);
        Admin = new AuditContext(admin.Id, "203.0.113.7", "xunit-agent/1.0");
        return db;
    }

    private static DelhiveryConfigService Service(AppDbContext db, string? testToken = FakeTestToken, string? liveToken = FakeLiveToken)
    {
        var values = new Dictionary<string, string?>();
        if (testToken != null) values["Delhivery:ApiTokenTest"] = testToken;
        if (liveToken != null) values["Delhivery:ApiToken"] = liveToken;
        var config = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        return new DelhiveryConfigService(config, new SettingsService(db, Seed.Mapper()), db);
    }

    private static async Task<string?> SettingAsync(AppDbContext db, string key) =>
        (await db.WebsiteSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key))?.Value;

    [Fact]
    public async Task Mode_defaults_to_test_with_automatic_creation_off_and_webhook_off()
    {
        await using var db = await CleanAsync();
        var info = await Service(db).GetInfoAsync();

        Assert.Equal("test", info.Mode);
        Assert.False(info.AutoCreateShipment);
        Assert.False(info.WebhookEnabled);
        Assert.Equal("https://staging-express.delhivery.com", info.ActiveBaseUrl);
        Assert.Equal("Ganpati Herbal Ayurveda", info.PickupLocation);
    }

    [Fact]
    public async Task Test_and_live_use_their_own_base_url_and_token()
    {
        await using var db = await CleanAsync();
        var svc = Service(db);

        var test = svc.GetCredentials("test")!;
        var live = svc.GetCredentials("live")!;
        Assert.Equal("https://staging-express.delhivery.com", test.BaseUrl);
        Assert.Equal(FakeTestToken, test.Token);
        Assert.Equal("https://track.delhivery.com", live.BaseUrl);
        Assert.Equal(FakeLiveToken, live.Token);
    }

    [Theory]
    [InlineData(null, null, false, false)]
    [InlineData("", "   ", false, false)]
    [InlineData("t", null, true, false)]
    [InlineData(null, "l", false, true)]
    public async Task Missing_or_blank_tokens_are_reported_as_not_configured(string? testToken, string? liveToken, bool testConfigured, bool liveConfigured)
    {
        await using var db = await CleanAsync();
        var info = await Service(db, testToken, liveToken).GetInfoAsync();

        Assert.Equal(testConfigured, info.TestConfigured);
        Assert.Equal(liveConfigured, info.LiveConfigured);
    }

    [Theory]
    [InlineData("production")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task An_invalid_mode_is_rejected_and_nothing_changes(string? mode)
    {
        await using var db = await CleanAsync();
        var result = await Service(db).SetModeAsync(mode!, Admin);

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Null(await SettingAsync(db, "delhivery_mode"));
        Assert.Equal(0, await db.ActivityLogs.CountAsync());
    }

    [Fact]
    public async Task Live_mode_is_rejected_when_the_live_token_is_missing_and_the_attempt_is_logged()
    {
        await using var db = await CleanAsync();
        var result = await Service(db, liveToken: null).SetModeAsync("live", Admin);

        Assert.False(result.Success);
        Assert.Contains("not configured", result.Message);
        Assert.Equal("test", await Service(db, liveToken: null).GetModeAsync());              // still test
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("DelhiveryModeChangeRejected", log.Action);
        Assert.Equal(Admin.UserId, log.UserId);
    }

    [Fact]
    public async Task Changing_mode_works_and_forces_automatic_creation_off()
    {
        await using var db = await CleanAsync();
        db.WebsiteSettings.Add(new WebsiteSetting { Key = "delhivery_auto_create", Value = "true", Group = "shipping" });   // someone left it on
        await db.SaveChangesAsync();

        var live = await Service(db).SetModeAsync(" LIVE ", Admin);
        Assert.True(live.Success);
        Assert.Equal("live", live.Data!.Mode);
        Assert.Equal("https://track.delhivery.com", live.Data.ActiveBaseUrl);
        Assert.False(live.Data.AutoCreateShipment);
        Assert.Equal("live", await SettingAsync(db, "delhivery_mode"));
        Assert.Equal("false", await SettingAsync(db, "delhivery_auto_create"));

        // switching back to test is always allowed, even without a test token
        var back = await Service(db, testToken: null).SetModeAsync("test", Admin);
        Assert.True(back.Success);
        Assert.Equal("test", await SettingAsync(db, "delhivery_mode"));
        Assert.Equal("false", await SettingAsync(db, "delhivery_auto_create"));
    }

    [Fact]
    public async Task Every_mode_change_writes_an_activity_log_with_previous_and_new_mode_and_request_details()
    {
        await using var db = await CleanAsync();
        await Service(db).SetModeAsync("live", Admin);
        await Service(db).SetModeAsync("test", Admin);

        var logs = await db.ActivityLogs.OrderBy(l => l.CreatedAt).ToListAsync();
        Assert.Equal(2, logs.Count);
        Assert.All(logs, l =>
        {
            Assert.Equal("DelhiveryModeChanged", l.Action);
            Assert.Equal("delhivery_mode", l.EntityId);
            Assert.Equal(Admin.UserId, l.UserId);
            Assert.Equal("203.0.113.7", l.IpAddress);
            Assert.Equal("xunit-agent/1.0", l.UserAgent);
        });
        Assert.Contains("test -> live", logs[0].Description);
        Assert.Contains("live -> test", logs[1].Description);
        Assert.Contains("forced off", logs[0].Description);
    }

    [Fact]
    public async Task The_razorpay_mode_setting_is_not_touched()
    {
        await using var db = await CleanAsync();
        db.WebsiteSettings.Add(new WebsiteSetting { Key = "razorpay_mode", Value = "live", Group = "payment" });
        await db.SaveChangesAsync();
        var before = await db.WebsiteSettings.AsNoTracking().SingleAsync(s => s.Key == "razorpay_mode");

        await Service(db).SetModeAsync("live", Admin);
        await Service(db).SetModeAsync("test", Admin);

        var after = await db.WebsiteSettings.AsNoTracking().SingleAsync(s => s.Key == "razorpay_mode");
        Assert.Equal("live", after.Value);
        Assert.Equal(before.UpdatedAt, after.UpdatedAt);                  // not even re-saved
        Assert.Equal(1, await db.WebsiteSettings.CountAsync(s => s.Group == "payment"));
    }

    [Fact]
    public async Task Tokens_never_appear_in_the_dto_the_credentials_text_or_the_audit_log()
    {
        await using var db = await CleanAsync();
        var svc = Service(db);
        var result = await svc.SetModeAsync("live", Admin);
        var info = await svc.GetInfoAsync();

        foreach (var text in new[]
        {
            JsonSerializer.Serialize(info), JsonSerializer.Serialize(result),
            svc.GetCredentials("live")!.ToString(), svc.GetCredentials("test")!.ToString(),
            string.Join("|", await db.ActivityLogs.Select(l => l.Description + l.Action).ToListAsync()),
            string.Join("|", await db.WebsiteSettings.Select(s => s.Key + s.Value).ToListAsync())
        })
        {
            Assert.DoesNotContain(FakeTestToken, text);
            Assert.DoesNotContain(FakeLiveToken, text);
            Assert.DoesNotContain("do-not-leak", text);
        }
    }
}

/// <summary>Both fake tokens configured, like a fully set-up server.</summary>
public class DelhiveryBothTokensFixture : ApiFixture
{
    public const string TestToken = "FAKE-TEST-TOKEN-http-aaaa1111";
    public const string LiveToken = "FAKE-LIVE-TOKEN-http-bbbb2222";
    protected override IDictionary<string, string>? ExtraEnvironment => new Dictionary<string, string>
    { ["Delhivery__ApiTokenTest"] = TestToken, ["Delhivery__ApiToken"] = LiveToken };
}

/// <summary>Only the test token configured: live must be unavailable.</summary>
public class DelhiveryTestTokenOnlyFixture : ApiFixture
{
    protected override IDictionary<string, string>? ExtraEnvironment => new Dictionary<string, string>
    { ["Delhivery__ApiTokenTest"] = DelhiveryBothTokensFixture.TestToken };
}

public class DelhiveryModeApiTests : IClassFixture<DelhiveryBothTokensFixture>
{
    private readonly DelhiveryBothTokensFixture _f;
    public DelhiveryModeApiTests(DelhiveryBothTokensFixture f) => _f = f;
    private const string Url = "/api/v1/shipments/delhivery/mode";

    [Fact]
    public async Task Only_a_signed_in_SuperAdmin_can_read_or_change_the_mode()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Get, Url)).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Put, Url, null, new { mode = "live" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Get, Url, _f.AliceToken)).Status);               // an ordinary customer
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AliceToken, new { mode = "live" })).Status);

        var read = await _f.Api.SendAsync(HttpMethod.Get, Url, _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, read.Status);
        Assert.Equal("test", read.Body.GetProperty("data").GetProperty("mode").GetString());   // default

        await using var db = _f.Db.NewContext();
        Assert.Null(await db.WebsiteSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "delhivery_mode"));        // refused calls changed nothing
    }

    [Fact]
    public async Task Admin_switches_mode_over_http_with_the_audit_trail_and_without_leaking_a_token()
    {
        var invalid = await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "staging" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.Status);

        var live = await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "live" });
        Assert.Equal(HttpStatusCode.OK, live.Status);
        var data = live.Body.GetProperty("data");
        Assert.Equal("live", data.GetProperty("mode").GetString());
        Assert.True(data.GetProperty("testConfigured").GetBoolean());
        Assert.True(data.GetProperty("liveConfigured").GetBoolean());
        Assert.False(data.GetProperty("autoCreateShipment").GetBoolean());
        Assert.Equal("Ganpati Herbal Ayurveda", data.GetProperty("pickupLocation").GetString());

        var back = await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "test" });
        Assert.Equal("test", back.Body.GetProperty("data").GetProperty("mode").GetString());

        // the audit rows name the admin
        await using var db = _f.Db.NewContext();
        var logs = await db.ActivityLogs.AsNoTracking().Where(l => l.Action == "DelhiveryModeChanged").OrderBy(l => l.CreatedAt).ToListAsync();
        Assert.Equal(2, logs.Count);
        Assert.All(logs, l => Assert.Equal(_f.Admin.Id, l.UserId));
        Assert.Contains("test -> live", logs[0].Description);
        Assert.False(string.IsNullOrEmpty(logs[0].IpAddress));

        // no response and nothing the API process printed contains either token
        var texts = new[] { invalid.Body.ToString(), live.Body.ToString(), back.Body.ToString(),
            (await _f.Api.SendAsync(HttpMethod.Get, Url, _f.AdminToken)).Body.ToString(), _f.Api.Output };
        foreach (var t in texts)
        {
            Assert.DoesNotContain(DelhiveryBothTokensFixture.TestToken, t);
            Assert.DoesNotContain(DelhiveryBothTokensFixture.LiveToken, t);
            Assert.DoesNotContain("FAKE-", t);
        }
    }

    [Fact]
    public async Task Changing_the_delhivery_mode_leaves_the_razorpay_mode_exactly_as_it_was()
    {
        await using (var db = _f.Db.NewContext())
        {
            var existing = await db.WebsiteSettings.FirstOrDefaultAsync(s => s.Key == "razorpay_mode");
            if (existing == null) db.WebsiteSettings.Add(new WebsiteSetting { Key = "razorpay_mode", Value = "test", Group = "payment" });
            else existing.Value = "test";
            await db.SaveChangesAsync();
        }
        var before = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/payments/razorpay/mode", _f.AdminToken);

        await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "live" });
        await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "test" });

        var after = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/payments/razorpay/mode", _f.AdminToken);
        Assert.Equal(before.Body.ToString(), after.Body.ToString());
        await using var check = _f.Db.NewContext();
        Assert.Equal("test", (await check.WebsiteSettings.AsNoTracking().SingleAsync(s => s.Key == "razorpay_mode")).Value);
    }
}

public class DelhiveryLiveWithoutTokenApiTests : IClassFixture<DelhiveryTestTokenOnlyFixture>
{
    private readonly DelhiveryTestTokenOnlyFixture _f;
    public DelhiveryLiveWithoutTokenApiTests(DelhiveryTestTokenOnlyFixture f) => _f = f;

    [Fact]
    public async Task Live_mode_is_refused_over_http_when_the_live_token_is_not_set()
    {
        var info = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/shipments/delhivery/mode", _f.AdminToken);
        Assert.True(info.Body.GetProperty("data").GetProperty("testConfigured").GetBoolean());
        Assert.False(info.Body.GetProperty("data").GetProperty("liveConfigured").GetBoolean());

        var res = await _f.Api.SendAsync(HttpMethod.Put, "/api/v1/shipments/delhivery/mode", _f.AdminToken, new { mode = "live" });
        Assert.Equal(HttpStatusCode.BadRequest, res.Status);

        var after = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/shipments/delhivery/mode", _f.AdminToken);
        Assert.Equal("test", after.Body.GetProperty("data").GetProperty("mode").GetString());
        await using var db = _f.Db.NewContext();
        Assert.Equal("DelhiveryModeChangeRejected", (await db.ActivityLogs.AsNoTracking().SingleAsync()).Action);
    }
}
