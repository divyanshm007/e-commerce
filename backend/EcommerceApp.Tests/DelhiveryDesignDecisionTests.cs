using System.Net;
using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Infrastructure.Services.Delhivery;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;
using C = EcommerceApp.Domain.Entities.ShipmentConstants.CreationStates;

namespace EcommerceApp.Tests;

/// <summary>
/// Design point 1: "holds the order", "is final" and "needs tracking" are three different questions with one definition each.
/// A DELIVERED shipment is final (never polled) but still holds its order (so the order cannot be shipped twice).
/// </summary>
public class ShipmentRulesTests
{
    public static IEnumerable<object[]> AllCombinations() =>
        from state in C.All from status in S.All select new object[] { state, status };

    private static Shipment Row(string state, string status, bool? isFinal = null)
    {
        var s = new Shipment { CreationState = state, Status = status };
        s.IsFinal = isFinal ?? ShipmentRules.IsFinalStatus(status);
        return s;
    }

    [Fact]
    public void Exactly_delivered_rto_delivered_and_cancelled_are_final()
    {
        Assert.Equal(new[] { S.Delivered, S.RtoDelivered, S.Cancelled }.OrderBy(x => x), S.All.Where(ShipmentRules.IsFinalStatus).OrderBy(x => x));
        Assert.False(ShipmentRules.IsFinalStatus(null));
        Assert.False(ShipmentRules.IsFinalStatus("anything else"));
    }

    [Fact]
    public void Apply_status_keeps_the_final_flag_in_step_with_the_status()
    {
        foreach (var status in S.All)
        {
            var s = new Shipment();
            ShipmentRules.ApplyStatus(s, status);
            Assert.Equal(status, s.Status);
            Assert.Equal(ShipmentRules.IsFinalStatus(status), s.IsFinal);
        }
    }

    [Theory]
    [MemberData(nameof(AllCombinations))]
    public void Tracking_is_only_ever_needed_by_a_shipment_that_also_holds_its_order_and_is_not_final(string state, string status)
    {
        var row = Row(state, status);
        var holds = ShipmentRules.HoldsOrder.Compile()(row);
        var needs = ShipmentRules.NeedsTracking.Compile()(row);

        if (needs) Assert.True(holds);                                    // polling is a subset of "holds the order"
        Assert.Equal(state == C.Created && !ShipmentRules.IsFinalStatus(status), needs);
        Assert.Equal((state is C.InFlight or C.Created or C.Unknown) && status is not (S.Cancelled or S.RtoDelivered), holds);
    }

    [Fact]
    public void A_delivered_shipment_holds_its_order_but_is_never_polled()
    {
        var delivered = Row(C.Created, S.Delivered);

        Assert.True(ShipmentRules.HoldsOrder.Compile()(delivered));        // an already delivered order must not be shipped again
        Assert.False(ShipmentRules.NeedsTracking.Compile()(delivered));
    }

    [Theory]
    [InlineData(S.Cancelled)]
    [InlineData(S.RtoDelivered)]
    public void Cancelled_and_returned_shipments_release_the_order_and_are_not_polled(string status)
    {
        var row = Row(C.Created, status);
        Assert.False(ShipmentRules.HoldsOrder.Compile()(row));
        Assert.False(ShipmentRules.NeedsTracking.Compile()(row));
    }

    [Theory]
    [InlineData(C.InFlight)]
    [InlineData(C.Unknown)]
    public void A_shipment_whose_creation_is_unfinished_holds_the_order_but_cannot_be_polled_without_an_awb(string state)
    {
        var row = Row(state, S.Created);
        Assert.True(ShipmentRules.HoldsOrder.Compile()(row));
        Assert.False(ShipmentRules.NeedsTracking.Compile()(row));          // it is reconciled, not polled
    }

    [Fact]
    public void A_failed_creation_neither_holds_the_order_nor_needs_tracking()
    {
        var row = Row(C.Failed, S.Created);
        Assert.False(ShipmentRules.HoldsOrder.Compile()(row));
        Assert.False(ShipmentRules.NeedsTracking.Compile()(row));
    }

    [Fact]
    public void A_row_whose_final_flag_drifted_from_its_status_is_still_never_polled()
    {
        // IsFinal=false but Status=DELIVERED: the poll index would include it, the rule must not
        Assert.False(ShipmentRules.NeedsTracking.Compile()(Row(C.Created, S.Delivered, isFinal: false)));
        Assert.False(ShipmentRules.NeedsTracking.Compile()(Row(C.Created, S.Cancelled, isFinal: false)));
        // and IsFinal=true on a live status is not polled either
        Assert.False(ShipmentRules.NeedsTracking.Compile()(Row(C.Created, S.InTransit, isFinal: true)));
    }
}

/// <summary>The same definitions evaluated by PostgreSQL on tables created by the real migration.</summary>
public class ShipmentRulesDatabaseTests : IClassFixture<MigratedDbFixture>
{
    private readonly TestDatabase _t;
    public ShipmentRulesDatabaseTests(MigratedDbFixture f) => _t = f.Db;

    private async Task<Guid> OrderAsync(AppDbContext db)
    {
        var product = await Seed.ProductAsync(db);
        return (await Seed.OrderAsync(db, product, null, guestEmail: "g@example.test", guestPhone: "9876543210")).Id;
    }

    private static Shipment NewShipment(Guid orderId, string state, string status, bool isFinal) => new()
    {
        OrderId = orderId, Mode = "test", ClientOrderRef = "R-" + Guid.NewGuid().ToString("N")[..10],
        CreationState = state, Status = status, IsFinal = isFinal, Awb = state == C.Created ? "AWB" + Guid.NewGuid().ToString("N")[..8] : null
    };

    [Theory]
    [MemberData(nameof(ShipmentRulesTests.AllCombinations), MemberType = typeof(ShipmentRulesTests))]
    public async Task The_database_evaluates_holds_order_and_needs_tracking_exactly_like_the_c_sharp_rules(string state, string status)
    {
        await using var seed = _t.NewContext();
        var orderId = await OrderAsync(seed);
        var row = NewShipment(orderId, state, status, ShipmentRules.IsFinalStatus(status));
        seed.Shipments.Add(row);
        await seed.SaveChangesAsync();

        await using var db = _t.NewContext();
        var holds = await db.Shipments.Where(ShipmentRules.HoldsOrder).AnyAsync(s => s.Id == row.Id);
        var needs = await db.Shipments.Where(ShipmentRules.NeedsTracking).AnyAsync(s => s.Id == row.Id);

        Assert.Equal(ShipmentRules.HoldsOrder.Compile()(row), holds);
        Assert.Equal(ShipmentRules.NeedsTracking.Compile()(row), needs);
    }

    [Fact]
    public async Task The_polling_query_returns_only_created_non_final_shipments_even_if_a_flag_drifted()
    {
        await using var seed = _t.NewContext();
        var live = NewShipment(await OrderAsync(seed), C.Created, S.InTransit, false);
        var delivered = NewShipment(await OrderAsync(seed), C.Created, S.Delivered, true);
        var driftedDelivered = NewShipment(await OrderAsync(seed), C.Created, S.Delivered, false);     // flag drifted
        var cancelled = NewShipment(await OrderAsync(seed), C.Created, S.Cancelled, true);
        var unknown = NewShipment(await OrderAsync(seed), C.Unknown, S.Created, false);
        var failed = NewShipment(await OrderAsync(seed), C.Failed, S.Created, false);
        seed.Shipments.AddRange(live, delivered, driftedDelivered, cancelled, unknown, failed);
        await seed.SaveChangesAsync();

        await using var db = _t.NewContext();
        var ids = new[] { live, delivered, driftedDelivered, cancelled, unknown, failed }.Select(s => s.Id).ToList();
        var polled = await db.Shipments.Where(ShipmentRules.NeedsTracking).Where(s => ids.Contains(s.Id)).Select(s => s.Id).ToListAsync();

        Assert.Equal([live.Id], polled);
    }

    [Fact]
    public async Task A_delivered_order_cannot_get_a_second_shipment_but_a_cancelled_one_can()
    {
        await using var db = _t.NewContext();
        var deliveredOrder = await OrderAsync(db);
        var cancelledOrder = await OrderAsync(db);
        db.Shipments.Add(NewShipment(deliveredOrder, C.Created, S.Delivered, true));
        db.Shipments.Add(NewShipment(cancelledOrder, C.Created, S.Cancelled, true));
        await db.SaveChangesAsync();

        await using var again = _t.NewContext();
        again.Shipments.Add(NewShipment(deliveredOrder, C.InFlight, S.Created, false));
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => again.SaveChangesAsync());
        Assert.Equal("UX_Shipments_Order_Open", ((Npgsql.PostgresException)ex.InnerException!).ConstraintName);

        await using var replacement = _t.NewContext();
        replacement.Shipments.Add(NewShipment(cancelledOrder, C.InFlight, S.Created, false));
        await replacement.SaveChangesAsync();                              // allowed
    }

    [Fact]
    public async Task The_guard_still_holds_a_delivered_shipments_order()
    {
        await using var seed = _t.NewContext();
        var orderId = await OrderAsync(seed);
        seed.Shipments.Add(NewShipment(orderId, C.Created, S.Delivered, true));
        await seed.SaveChangesAsync();

        await using var db = _t.NewContext();
        Assert.True(await new ShipmentOrderGuard(db).HasOpenShipmentAsync(orderId));
    }
}

/// <summary>Design point 2: a stored mode that is not exactly test or live fails closed – it is never read as test.</summary>
public class DelhiveryFailClosedTests : IClassFixture<DbFixture>
{
    private readonly TestDatabase _t;
    public DelhiveryFailClosedTests(DbFixture f) => _t = f.Db;

    private static readonly Dictionary<string, string?> Tokens = new()
    {
        ["Delhivery:ApiTokenTest"] = "FAKE-TEST-TOKEN-fc1", ["Delhivery:ApiToken"] = "FAKE-LIVE-TOKEN-fc2"
    };

    private async Task<(AppDbContext Db, DelhiveryConfigService Service)> ArrangeAsync(string? storedMode)
    {
        var db = _t.NewContext();
        db.WebsiteSettings.RemoveRange(db.WebsiteSettings);
        db.ActivityLogs.RemoveRange(db.ActivityLogs);
        await db.SaveChangesAsync();
        if (storedMode != null)
        {
            db.WebsiteSettings.Add(new WebsiteSetting { Key = "delhivery_mode", Value = storedMode, Group = "shipping" });
            await db.SaveChangesAsync();
        }
        var config = new ConfigurationBuilder().AddInMemoryCollection(Tokens).Build();
        return (db, new DelhiveryConfigService(config, new SettingsService(db, Seed.Mapper()), db));
    }

    [Fact]
    public async Task A_missing_setting_is_the_documented_default_test_not_an_error()
    {
        var (db, svc) = await ArrangeAsync(null);
        await using var _ = db;

        Assert.Equal("test", await svc.GetModeAsync());
        Assert.Null((await svc.GetInfoAsync()).ConfigurationError);
    }

    [Theory]
    [InlineData("banana")]
    [InlineData("production")]
    [InlineData("staging")]
    [InlineData("1")]
    [InlineData("tes t")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task An_invalid_stored_mode_throws_a_configuration_error_and_is_never_read_as_test(string stored)
    {
        var (db, svc) = await ArrangeAsync(stored);
        await using var _ = db;

        var ex = await Assert.ThrowsAsync<DelhiveryConfigurationException>(() => svc.GetModeAsync());
        Assert.Contains("must be 'test' or 'live'", ex.Message);
        Assert.DoesNotContain("FAKE-", ex.Message);
        await Assert.ThrowsAsync<DelhiveryConfigurationException>(() => svc.GetActiveCredentialsAsync());
    }

    [Theory]
    [InlineData("TEST", "test")]
    [InlineData("  Live ", "live")]
    [InlineData("test", "test")]
    [InlineData("live", "live")]
    public async Task Recognised_values_are_accepted_regardless_of_case_and_spaces(string stored, string expected)
    {
        var (db, svc) = await ArrangeAsync(stored);
        await using var _ = db;

        Assert.Equal(expected, await svc.GetModeAsync());
    }

    [Fact]
    public async Task The_admin_info_reports_the_error_with_no_environment_and_no_automatic_creation()
    {
        var (db, svc) = await ArrangeAsync("banana");
        await using var _ = db;
        db.WebsiteSettings.Add(new WebsiteSetting { Key = "delhivery_auto_create", Value = "true", Group = "shipping" });
        await db.SaveChangesAsync();

        var info = await svc.GetInfoAsync();

        Assert.Equal("invalid", info.Mode);
        Assert.NotNull(info.ConfigurationError);
        Assert.Equal("", info.ActiveBaseUrl);                             // no environment is shown or assumed
        Assert.False(info.AutoCreateShipment);                            // forced off while the configuration is untrusted
        Assert.True(info.TestConfigured && info.LiveConfigured);          // token flags still reported (booleans only)
    }

    [Fact]
    public async Task A_super_admin_can_repair_an_invalid_mode_and_the_repair_is_audited()
    {
        var (db, svc) = await ArrangeAsync("banana");
        await using var _ = db;
        var admin = await Seed.UserAsync(db, "Repairer", UserRole.SuperAdmin);

        var result = await svc.SetModeAsync("test", new Application.Interfaces.AuditContext(admin.Id, "203.0.113.9", "xunit"));

        Assert.True(result.Success);
        Assert.Equal("test", result.Data!.Mode);
        Assert.Null(result.Data.ConfigurationError);
        Assert.Equal("test", await svc.GetModeAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Contains("invalid -> test", log.Description);
    }

    [Fact]
    public async Task Setting_live_is_still_refused_without_the_live_token_even_when_repairing()
    {
        var (db, _) = await ArrangeAsync("banana");
        await using var _ = db;
        var noLive = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Delhivery:ApiTokenTest"] = "FAKE-TEST-TOKEN-x" }).Build();
        var svc = new DelhiveryConfigService(noLive, new SettingsService(db, Seed.Mapper()), db);

        var result = await svc.SetModeAsync("live", new Application.Interfaces.AuditContext(null, null, null));

        Assert.False(result.Success);
        await Assert.ThrowsAsync<DelhiveryConfigurationException>(() => svc.GetModeAsync());      // still invalid, still closed
    }

    [Fact]
    public async Task The_real_client_sends_nothing_while_the_stored_mode_is_invalid()
    {
        var (db, svc) = await ArrangeAsync("banana");
        await using var _ = db;
        var handler = FakeHandler.Returning(HttpStatusCode.OK);
        var client = new DelhiveryClient(new HttpClient(handler), svc, Options.Create(new DelhiveryClientOptions()), NullLogger<DelhiveryClient>.Instance);

        var create = await client.CreateShipmentAsync(DelhiveryRequestBuilderTests.Sample());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(Application.DTOs.Shipments.DelhiveryOutcome.NotSent, create.Outcome);
        Assert.Equal(Application.DTOs.Shipments.DelhiveryOutcome.NotSent, track.Outcome);
        Assert.Empty(handler.Requests);
    }
}

public class DelhiveryFailClosedApiTests : IClassFixture<DelhiveryBothTokensFixture>
{
    private readonly DelhiveryBothTokensFixture _f;
    public DelhiveryFailClosedApiTests(DelhiveryBothTokensFixture f) => _f = f;
    private const string Url = "/api/v1/shipments/delhivery/mode";

    [Fact]
    public async Task The_admin_screen_endpoint_reports_an_invalid_mode_and_the_admin_can_repair_it_over_http()
    {
        await using (var db = _f.Db.NewContext())
        {
            db.WebsiteSettings.Add(new WebsiteSetting { Key = "delhivery_mode", Value = "banana", Group = "shipping" });
            await db.SaveChangesAsync();
        }

        var read = await _f.Api.SendAsync(HttpMethod.Get, Url, _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, read.Status);                                             // the endpoint itself does not fail
        var data = read.Body.GetProperty("data");
        Assert.Equal("invalid", data.GetProperty("mode").GetString());
        Assert.Contains("must be 'test' or 'live'", data.GetProperty("configurationError").GetString());
        Assert.DoesNotContain("FAKE-", read.Body.ToString());

        var repair = await _f.Api.SendAsync(HttpMethod.Put, Url, _f.AdminToken, new { mode = "test" });
        Assert.Equal(HttpStatusCode.OK, repair.Status);
        Assert.Equal("test", repair.Body.GetProperty("data").GetProperty("mode").GetString());
        Assert.Equal(JsonValueKindNull, repair.Body.GetProperty("data").GetProperty("configurationError").ValueKind);
    }

    private const System.Text.Json.JsonValueKind JsonValueKindNull = System.Text.Json.JsonValueKind.Null;
}
