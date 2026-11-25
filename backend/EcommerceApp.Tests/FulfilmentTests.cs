using System.Net;
using System.Text;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Infrastructure.Services.Delhivery;
using EcommerceApp.Infrastructure.Services.Fulfilment;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using C = EcommerceApp.Domain.Entities.ShipmentConstants.CreationStates;

namespace EcommerceApp.Tests;

public sealed class RecordingEmail : EmailService
{
    public List<(string To, string Category)> Sent { get; } = [];
    public bool Succeed { get; set; } = true;
    public RecordingEmail() : base(new ConfigurationBuilder().Build(), NullLogger<EmailService>.Instance) { }
    public override Task<bool> TrySendShipmentEmailAsync(string toEmail, string customerName, ShipmentEmailInfo info)
    {
        if (Succeed) Sent.Add((toEmail, info.Category));
        return Task.FromResult(Succeed);
    }
}

sealed class FakeEnv : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = "t";
    public string ContentRootPath { get; set; } = ".";
    public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
}

sealed class NoSignal : IFulfilmentSignal { public int Pokes; public void Poke() => Pokes++; }

/// <summary>A processor wired to the REAL Delhivery client, whose HTTP answers are scripted (fixtures from Delhivery staging).</summary>
sealed class Rig
{
    public FakeHandler Handler { get; }
    public FakeDelhiveryConfig Config { get; } = new();
    public RecordingEmail Email { get; } = new();
    public FakeEnv Env { get; } = new();
    public FulfilmentOptions Options { get; } = new();
    public int CreateCalls => Handler.Requests.Count(r => r.Method == HttpMethod.Post);
    public int TrackCalls => Handler.Requests.Count(r => r.Method == HttpMethod.Get);

    public Rig(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) => Handler = new FakeHandler((r, _) => respond(r));

    public static HttpResponseMessage Json(string body, HttpStatusCode code = HttpStatusCode.OK) =>
        new(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    public FulfilmentProcessor Processor(AppDbContext db) =>
        new(db, new DelhiveryClient(new HttpClient(Handler), Config, Microsoft.Extensions.Options.Options.Create(new DelhiveryClientOptions()), NullLogger<DelhiveryClient>.Instance),
            Config, Email, Env, Microsoft.Extensions.Options.Options.Create(Options), NullLogger<FulfilmentProcessor>.Instance);

    public static string CreateOk(string orderRef, string awb = "84925410100041") =>
        DelhiveryFixtureParserTests.Fixture("create-success.json").Replace("TEST-STG-0001", orderRef).Replace("84925410100041", awb);

    public static string CreateRefused(string orderRef) =>
        DelhiveryFixtureParserTests.Fixture("create-failure-invalid-pin.json").Replace("TEST-STG-0002", orderRef);

    /// <summary>A tracking answer in the confirmed Delhivery schema with the given scans (type, status, code, local time).</summary>
    public static string Tracking(string awb, string orderRef, params (string Type, string Status, string Code, string Time)[] scans)
    {
        var last = scans[^1];
        var items = string.Join(",", scans.Select(s =>
            $"{{\"ScanDetail\":{{\"Scan\":\"{s.Status}\",\"ScanType\":\"{s.Type}\",\"StatusCode\":\"{s.Code}\",\"ScanDateTime\":\"{s.Time}\",\"ScannedLocation\":\"Delhi_Hub (Delhi)\",\"Instructions\":\"x\"}}}}"));
        return "{\"ShipmentData\":[{\"Shipment\":{\"AWB\":\"" + awb + "\",\"ReferenceNo\":\"" + orderRef + "\",\"ExpectedDeliveryDate\":null," +
               $"\"Status\":{{\"Status\":\"{last.Status}\",\"StatusType\":\"{last.Type}\",\"StatusCode\":\"{last.Code}\",\"StatusDateTime\":\"{last.Time}\",\"StatusLocation\":\"Delhi_Hub (Delhi)\"}}," +
               "\"Scans\":[" + items + "]}}]}";
    }
}

/// <summary>Every test gets its own disposable database, so the worker phases only ever see that test's orders.</summary>
public class FulfilmentTests : IAsyncLifetime
{
    private TestDatabase _t = null!;
    private AuditContext Admin = null!;

    public async Task InitializeAsync()
    {
        _t = await TestDatabase.CreateAsync();
        await using var db = _t.NewContext();
        Admin = new AuditContext((await Seed.UserAsync(db, "Auditor", UserRole.SuperAdmin)).Id, "127.0.0.1", "test");
    }

    public async Task DisposeAsync() => await _t.DisposeAsync();

    private async Task<(Order Order, Guid AdminId)> ApprovedOrderAsync(PaymentMethod method = PaymentMethod.CashOnDelivery, PaymentStatus pay = PaymentStatus.Pending)
    {
        await using var db = _t.NewContext();
        var admin = await Seed.UserAsync(db, "Adm", UserRole.SuperAdmin);
        var user = await Seed.UserAsync(db, "Cust");
        var product = await Seed.ProductAsync(db);
        var order = await Seed.OrderAsync(db, product, user.Id, OrderStatus.Pending, pay, method);
        var svc = new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal());
        var res = await svc.ApproveAsync(order.Id, new AuditContext(admin.Id, null, null));
        Assert.True(res.Success, string.Join(",", res.Errors ?? []) + res.Message);
        return (order, admin.Id);
    }

    private async Task<OrderFulfilment> FulfilmentOf(Guid orderId) { await using var db = _t.NewContext(); return await db.OrderFulfilments.AsNoTracking().SingleAsync(f => f.OrderId == orderId); }
    private async Task<List<Shipment>> ShipmentsOf(Guid orderId) { await using var db = _t.NewContext(); return await db.Shipments.AsNoTracking().Where(s => s.OrderId == orderId).ToListAsync(); }
    private async Task<Order> OrderOf(Guid orderId) { await using var db = _t.NewContext(); return await db.Orders.AsNoTracking().SingleAsync(o => o.Id == orderId); }
    private readonly DateTime Now = DateTime.UtcNow.AddMinutes(1);       // fixed per test, later than the approval time

    private static Rig CreatingRig(Func<Order, string>? body = null, string orderNumber = "") => new(async r =>
    {
        if (r.Method == HttpMethod.Post)
        {
            var text = await r.Content!.ReadAsStringAsync();
            var number = System.Text.RegularExpressions.Regex.Match(text, "\"order\":\"([^\"]+)\"").Groups[1].Value;
            return Rig.Json(Rig.CreateOk(number));
        }
        return Rig.Json("{}");
    });

    // ───────────── approval ─────────────

    [Fact]
    public async Task Approval_is_recorded_with_user_time_and_audit_and_confirms_a_cod_order()
    {
        var (order, adminId) = await ApprovedOrderAsync();
        var f = await FulfilmentOf(order.Id);
        Assert.Equal(FulfilmentStates.Approved, f.State);
        Assert.Equal(adminId, f.ApprovedByUserId);
        Assert.NotNull(f.ApprovedAt);
        Assert.Equal(OrderStatus.Confirmed, (await OrderOf(order.Id)).Status);

        await using var db = _t.NewContext();
        var log = await db.ActivityLogs.SingleAsync(a => a.Action == "Fulfilment.Approved" && a.EntityId == order.Id.ToString());
        Assert.Equal(adminId, log.UserId);
    }

    [Fact]
    public async Task Duplicate_approval_is_refused_and_concurrent_approvals_create_one_record()
    {
        var (order, _) = await ApprovedOrderAsync();
        await using var db = _t.NewContext();
        var again = await new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal()).ApproveAsync(order.Id, Admin);
        Assert.False(again.Success); Assert.Equal(409, again.StatusCode);

        Order o2;
        await using (var d = _t.NewContext()) { var u = await Seed.UserAsync(d, "C2"); var p = await Seed.ProductAsync(d); o2 = await Seed.OrderAsync(d, p, u.Id); }
        var tasks = Enumerable.Range(0, 5).Select(async _ =>
        {
            await using var c = _t.NewContext();
            return await new FulfilmentService(c, new FakeDelhiveryConfig(), new NoSignal()).ApproveAsync(o2.Id, Admin);
        });
        var results = await Task.WhenAll(tasks);
        Assert.Equal(1, results.Count(r => r.Success));
        await using var check = _t.NewContext();
        Assert.Equal(1, await check.OrderFulfilments.CountAsync(f => f.OrderId == o2.Id));
    }

    [Fact]
    public async Task Unpaid_online_orders_cancelled_orders_and_bad_addresses_cannot_be_approved()
    {
        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "C3"); var p = await Seed.ProductAsync(db);
        var svc = new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal());

        var unpaid = await Seed.OrderAsync(db, p, u.Id, OrderStatus.Pending, PaymentStatus.Pending, PaymentMethod.Razorpay);
        var r1 = await svc.ApproveAsync(unpaid.Id, Admin);
        Assert.False(r1.Success); Assert.Contains(r1.Errors!, e => e.Contains("never dispatched"));

        var cancelled = await Seed.OrderAsync(db, p, u.Id, OrderStatus.Cancelled);
        Assert.False((await svc.ApproveAsync(cancelled.Id, Admin)).Success);

        var badPin = await Seed.OrderAsync(db, p, u.Id);
        badPin.ShippingPostalCode = "12"; await db.SaveChangesAsync();
        var r3 = await svc.ApproveAsync(badPin.Id, Admin);
        Assert.False(r3.Success); Assert.Contains(r3.Errors!, e => e.Contains("PIN"));

        Assert.False((await svc.ApproveAsync(Guid.NewGuid(), Admin)).Success);
        Assert.Equal(0, await db.OrderFulfilments.CountAsync(f => f.OrderId == unpaid.Id || f.OrderId == cancelled.Id || f.OrderId == badPin.Id));
    }

    [Fact]
    public async Task Paid_online_order_is_eligible_and_a_rejection_is_final()
    {
        var (paid, _) = await ApprovedOrderAsync(PaymentMethod.Razorpay, PaymentStatus.Paid);
        Assert.Equal(FulfilmentStates.Approved, (await FulfilmentOf(paid.Id)).State);

        await using var db = _t.NewContext();
        var u = await Seed.UserAsync(db, "C4"); var p = await Seed.ProductAsync(db);
        var o = await Seed.OrderAsync(db, p, u.Id);
        var svc = new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal());
        Assert.False((await svc.RejectAsync(o.Id, "", Admin)).Success);
        Assert.True((await svc.RejectAsync(o.Id, "Address looks fake", Admin)).Success);
        var f = await FulfilmentOf(o.Id);
        Assert.Equal(FulfilmentStates.Rejected, f.State); Assert.Equal("Address looks fake", f.RejectReason);
        Assert.False((await svc.ApproveAsync(o.Id, Admin)).Success);
        Assert.False((await svc.RejectAsync(o.Id, "again", Admin)).Success);
    }

    // ───────────── automatic creation ─────────────

    [Fact]
    public async Task Approved_order_gets_a_shipment_automatically_with_awb_saved_and_the_staging_pickup_location()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = CreatingRig();
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);

        var s = Assert.Single(await ShipmentsOf(order.Id));
        Assert.Equal(C.Created, s.CreationState); Assert.Equal("84925410100041", s.Awb);
        Assert.Equal(order.OrderNumber, s.ClientOrderRef); Assert.Equal("test", s.Mode);
        Assert.StartsWith("UPL", s.CreateResponseRef);
        Assert.Equal(FulfilmentStates.Shipped, (await FulfilmentOf(order.Id)).State);
        Assert.Equal("84925410100041", (await OrderOf(order.Id)).TrackingNumber);

        var sent = Assert.Single(rig.Handler.Requests);
        Assert.Equal("staging-express.delhivery.com", sent.Uri.Host);
        Assert.Contains("GANPATIHERBAL SURFACE", sent.Body);                                     // the environment's own pickup location
        Assert.DoesNotContain("Ganpati Herbal Ayurveda", sent.Body);
        Assert.Equal("Token " + FakeDelhiveryConfig.TestToken, sent.Authorization);
    }

    [Fact]
    public async Task Order_with_missing_data_never_reaches_delhivery_but_goes_to_the_exception_queue()
    {
        var (order, _) = await ApprovedOrderAsync();
        await using (var d = _t.NewContext()) { var o = await d.Orders.SingleAsync(x => x.Id == order.Id); o.ShippingPhone = "123"; await d.SaveChangesAsync(); }
        var rig = CreatingRig();
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);

        Assert.Equal(0, rig.CreateCalls);
        var f = await FulfilmentOf(order.Id);
        Assert.Equal(FulfilmentStates.Exception, f.State); Assert.Contains("mobile", f.AttentionReason);
        Assert.Empty(await ShipmentsOf(order.Id));
    }

    [Fact]
    public async Task Delhivery_refusal_is_recorded_with_its_reason_and_creates_no_awb()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = new Rig(r => Task.FromResult(Rig.Json(Rig.CreateRefused(order.OrderNumber))));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);

        var s = Assert.Single(await ShipmentsOf(order.Id));
        Assert.Equal(C.Failed, s.CreationState); Assert.Null(s.Awb);
        Assert.Contains("Consignee pin code is invalid", s.LastError);
        var f = await FulfilmentOf(order.Id);
        Assert.Equal(FulfilmentStates.Exception, f.State); Assert.Contains("pin code", f.AttentionReason);
        Assert.Equal(1, rig.CreateCalls);                                                           // a definite refusal is not retried automatically
    }

    [Fact]
    public async Task Temporary_failures_before_anything_is_created_are_retried_a_limited_number_of_times()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = new Rig(r => Task.FromResult(Rig.Json("{}", (HttpStatusCode)429)));
        var t = Now;
        for (var i = 0; i < 5; i++)
        {
            await using var db = _t.NewContext();
            await rig.Processor(db).RunCreationAsync("test", t);
            t = t.AddHours(1);
        }
        Assert.Equal(rig.Options.MaxCreateAttempts, rig.CreateCalls);
        var f = await FulfilmentOf(order.Id);
        Assert.Equal(FulfilmentStates.Exception, f.State); Assert.Equal(rig.Options.MaxCreateAttempts, f.Attempts);
        Assert.All(await ShipmentsOf(order.Id), s => Assert.Equal(C.Failed, s.CreationState));
    }

    [Fact]
    public async Task Running_creation_repeatedly_or_concurrently_never_creates_two_shipments()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = CreatingRig();
        await Task.WhenAll(Enumerable.Range(0, 6).Select(async _ =>
        {
            await using var db = _t.NewContext();
            await rig.Processor(db).RunCreationAsync("test", Now);
        }));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now.AddMinutes(5));

        Assert.Equal(1, rig.CreateCalls);
        Assert.Single(await ShipmentsOf(order.Id));
    }

    // ───────────── ambiguity, reconciliation, restart ─────────────

    [Fact]
    public async Task A_timeout_makes_the_shipment_unknown_and_it_is_never_created_again_blindly()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = new Rig(r => throw new TaskCanceledException("timeout"));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);

        var s = Assert.Single(await ShipmentsOf(order.Id));
        Assert.Equal(C.Unknown, s.CreationState); Assert.Null(s.Awb);
        Assert.Equal(FulfilmentStates.Creating, (await FulfilmentOf(order.Id)).State);

        for (var i = 1; i <= 3; i++)
        {
            await using var db = _t.NewContext();
            await rig.Processor(db).RunCreationAsync("test", Now.AddHours(i));
        }
        Assert.Equal(1, rig.CreateCalls);
    }

    [Fact]
    public async Task Reconciliation_adopts_the_awb_when_delhivery_already_has_the_shipment()
    {
        var (order, _) = await ApprovedOrderAsync();
        var creating = true;
        var rig = new Rig(r => creating ? throw new TaskCanceledException("timeout")
            : Task.FromResult(Rig.Json(Rig.Tracking("84925410100099", order.OrderNumber, ("UD", "Manifested", "X-UCI", "2026-11-09T16:08:14.553")))));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);
        creating = false;
        await using (var db = _t.NewContext()) await rig.Processor(db).RunReconciliationAsync("test", Now.AddMinutes(30));

        var s = Assert.Single(await ShipmentsOf(order.Id));
        Assert.Equal(C.Created, s.CreationState); Assert.Equal("84925410100099", s.Awb);
        Assert.Equal(FulfilmentStates.Shipped, (await FulfilmentOf(order.Id)).State);
        Assert.Equal(1, rig.CreateCalls);
        Assert.Contains("ref_ids=", rig.Handler.Requests.Last().Uri.Query);
    }

    [Fact]
    public async Task Reconciliation_that_cannot_confirm_ends_in_the_exception_queue_without_a_second_create()
    {
        var (order, _) = await ApprovedOrderAsync();
        var creating = true;
        var rig = new Rig(r => creating ? throw new TaskCanceledException("timeout")
            : Task.FromResult(Rig.Json(DelhiveryFixtureParserTests.Fixture("tracking-unknown-waybill.json"))));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);
        creating = false;
        var t = Now.AddMinutes(30);
        for (var i = 0; i < rig.Options.MaxReconcileAttempts + 1; i++)
        {
            await using var db = _t.NewContext();
            await rig.Processor(db).RunReconciliationAsync("test", t);
            t = t.AddDays(1);
        }
        var f = await FulfilmentOf(order.Id);
        Assert.Equal(FulfilmentStates.Exception, f.State); Assert.Contains("could not confirm", f.AttentionReason);
        Assert.Equal(C.Unknown, Assert.Single(await ShipmentsOf(order.Id)).CreationState);
        Assert.Equal(1, rig.CreateCalls);
    }

    [Fact]
    public async Task Restart_with_an_expired_lease_and_nothing_sent_resumes_creation()
    {
        var (order, _) = await ApprovedOrderAsync();
        await using (var d = _t.NewContext())
        {
            var f = await d.OrderFulfilments.SingleAsync(x => x.OrderId == order.Id);
            f.State = FulfilmentStates.Creating; f.LeaseUntil = Now.AddMinutes(-5); await d.SaveChangesAsync();
        }
        var rig = CreatingRig();
        await using (var db = _t.NewContext()) await rig.RunAllAsyncForTest(db, Now);
        Assert.Equal(C.Created, Assert.Single(await ShipmentsOf(order.Id)).CreationState);
        Assert.Equal(1, rig.CreateCalls);
    }

    [Fact]
    public async Task Restart_with_a_request_in_flight_goes_to_reconciliation_and_never_resends()
    {
        var (order, _) = await ApprovedOrderAsync();
        await using (var d = _t.NewContext())
        {
            var f = await d.OrderFulfilments.SingleAsync(x => x.OrderId == order.Id);
            f.State = FulfilmentStates.Creating; f.LeaseUntil = Now.AddMinutes(-5);
            d.Shipments.Add(new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = order.OrderNumber, CreationState = C.InFlight, CreateAttempts = 1 });
            await d.SaveChangesAsync();
        }
        var rig = new Rig(r => Task.FromResult(Rig.Json(DelhiveryFixtureParserTests.Fixture("tracking-unknown-waybill.json"))));
        await using (var db = _t.NewContext()) await rig.Processor(db).RecoverExpiredLeasesAsync(Now);
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);

        Assert.Equal(C.Unknown, Assert.Single(await ShipmentsOf(order.Id)).CreationState);
        Assert.Equal(0, rig.CreateCalls);
    }

    // ───────────── tracking ─────────────

    private async Task<(Order Order, Shipment Shipment)> ShippedAsync(string awb)
    {
        var (order, _) = await ApprovedOrderAsync();
        await using var d = _t.NewContext();
        d.Shipments.Add(new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = order.OrderNumber, CreationState = C.Created, CreateAttempts = 1, Awb = awb, Status = "CREATED" });
        var f = await d.OrderFulfilments.SingleAsync(x => x.OrderId == order.Id); f.State = FulfilmentStates.Shipped;
        await d.SaveChangesAsync();
        return (order, await d.Shipments.AsNoTracking().SingleAsync(s => s.OrderId == order.Id));
    }

    [Fact]
    public async Task Tracking_stores_events_once_and_a_repeated_poll_adds_nothing()
    {
        var (order, _) = await ShippedAsync("AWB-T1");
        var rig = new Rig(r => Task.FromResult(Rig.Json(Rig.Tracking("AWB-T1", order.OrderNumber, ("UD", "Manifested", "X-UCI", "2026-11-09T16:08:14.553")))));
        for (var i = 0; i < 3; i++) { await using var db = _t.NewContext(); await rig.Processor(db).RunTrackingAsync("test", Now.AddHours(i * 2)); }

        await using var c = _t.NewContext();
        var s = await c.Shipments.SingleAsync(x => x.OrderId == order.Id);
        Assert.Equal(1, await c.ShipmentTrackingEvents.CountAsync(e => e.ShipmentId == s.Id));
        Assert.Equal("CREATED", s.Status); Assert.Equal("Manifested", s.DelhiveryStatus); Assert.Equal(3, rig.TrackCalls);
        Assert.Null(s.ExpectedDeliveryDate);                                                         // Delhivery supplied none: none is invented
    }

    [Fact]
    public async Task Tracking_moves_the_shipment_and_the_order_forward_and_stops_after_delivery()
    {
        var (order, _) = await ShippedAsync("AWB-T2");
        string body = Rig.Tracking("AWB-T2", order.OrderNumber, ("UD", "Manifested", "X-UCI", "2026-11-09T10:00:00"), ("UD", "In Transit", "X-PPOM", "2026-11-10T09:00:00"));
        var rig = new Rig(r => Task.FromResult(Rig.Json(body)));

        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now);
        Assert.Equal("IN_TRANSIT", (await ShipmentsOf(order.Id)).Single().Status);
        Assert.Equal(OrderStatus.Shipped, (await OrderOf(order.Id)).Status);

        body = Rig.Tracking("AWB-T2", order.OrderNumber, ("UD", "Manifested", "X-UCI", "2026-11-09T10:00:00"), ("UD", "In Transit", "X-PPOM", "2026-11-10T09:00:00"),
            ("UD", "Dispatched", "OFD", "2026-11-11T08:00:00"));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now.AddHours(3));
        Assert.Equal("OUT_FOR_DELIVERY", (await ShipmentsOf(order.Id)).Single().Status);

        body = Rig.Tracking("AWB-T2", order.OrderNumber, ("UD", "Manifested", "X-UCI", "2026-11-09T10:00:00"), ("UD", "In Transit", "X-PPOM", "2026-11-10T09:00:00"),
            ("UD", "Dispatched", "OFD", "2026-11-11T08:00:00"), ("DL", "Delivered", "EOD-38", "2026-11-11T14:00:00"));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now.AddHours(6));

        var s = (await ShipmentsOf(order.Id)).Single();
        Assert.Equal("DELIVERED", s.Status); Assert.True(s.IsFinal); Assert.Null(s.NextCheckAt);
        var o = await OrderOf(order.Id);
        Assert.Equal(OrderStatus.Delivered, o.Status); Assert.NotNull(o.DeliveredAt);
        Assert.Equal(FulfilmentStates.Completed, (await FulfilmentOf(order.Id)).State);

        var calls = rig.TrackCalls;
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now.AddDays(3));
        Assert.Equal(calls, rig.TrackCalls);                                                         // final: no more polling
        await using var c = _t.NewContext();
        Assert.Equal(4, await c.ShipmentTrackingEvents.CountAsync(e => e.ShipmentId == s.Id));
    }

    [Fact]
    public async Task An_older_scan_never_moves_a_shipment_backwards()
    {
        var (order, _) = await ShippedAsync("AWB-T3");
        var body = Rig.Tracking("AWB-T3", order.OrderNumber, ("UD", "Dispatched", "OFD", "2026-11-11T08:00:00"));
        var rig = new Rig(r => Task.FromResult(Rig.Json(body)));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now);
        body = Rig.Tracking("AWB-T3", order.OrderNumber, ("UD", "In Transit", "X-PPOM", "2026-11-10T09:00:00"));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now.AddHours(2));
        Assert.Equal("OUT_FOR_DELIVERY", (await ShipmentsOf(order.Id)).Single().Status);
    }

    [Fact]
    public async Task An_unrecognised_status_and_a_return_go_to_the_exception_queue()
    {
        var (o1, _) = await ShippedAsync("AWB-T4");
        var rig = new Rig(r => Task.FromResult(Rig.Json(Rig.Tracking("AWB-T4", o1.OrderNumber, ("UD", "Some New Status", "ZZ", "2026-11-10T09:00:00")))));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now);
        var f = await FulfilmentOf(o1.Id);
        Assert.Equal(FulfilmentStates.Exception, f.State); Assert.Contains("do not recognise", f.AttentionReason);

        var (o2, _) = await ShippedAsync("AWB-T5");
        var rig2 = new Rig(r => Task.FromResult(Rig.Json(Rig.Tracking("AWB-T5", o2.OrderNumber, ("UD", "In Transit", "X", "2026-11-10T09:00:00"), ("RT", "In Transit", "RT-1", "2026-11-12T09:00:00")))));
        await using (var db = _t.NewContext()) await rig2.Processor(db).RunTrackingAsync("test", Now);
        Assert.Equal("RTO_IN_TRANSIT", (await ShipmentsOf(o2.Id)).Single().Status);
        Assert.Equal(FulfilmentStates.Exception, (await FulfilmentOf(o2.Id)).State);
    }

    [Fact]
    public async Task Tracking_failures_back_off_and_do_not_lose_the_shipment()
    {
        var (order, _) = await ShippedAsync("AWB-T6");
        var rig = new Rig(r => Task.FromResult(Rig.Json("{}", HttpStatusCode.InternalServerError)));
        await using (var db = _t.NewContext()) await rig.Processor(db).RunTrackingAsync("test", Now);
        var s = (await ShipmentsOf(order.Id)).Single();
        Assert.Equal(1, s.TrackFailureCount); Assert.True(s.NextCheckAt > Now); Assert.Equal("CREATED", s.Status);
    }

    // ───────────── notifications ─────────────

    [Fact]
    public async Task Each_shipment_stage_is_e_mailed_exactly_once()
    {
        var (order, _) = await ShippedAsync("AWB-N1");
        var rig = new Rig(r => Task.FromResult(Rig.Json("{}")));
        for (var i = 0; i < 3; i++) { await using var db = _t.NewContext(); await rig.Processor(db).RunNotificationsAsync("test", Now.AddMinutes(i)); }
        Assert.Equal(["CREATED"], rig.Email.Sent.Select(x => x.Category));

        await using (var d = _t.NewContext()) { var s = await d.Shipments.SingleAsync(x => x.OrderId == order.Id); ShipmentRules.ApplyStatus(s, "DELIVERED"); await d.SaveChangesAsync(); }
        for (var i = 0; i < 3; i++) { await using var db = _t.NewContext(); await rig.Processor(db).RunNotificationsAsync("test", Now.AddMinutes(10 + i)); }
        Assert.Equal(["CREATED", "DELIVERED"], rig.Email.Sent.Select(x => x.Category));
    }

    [Fact]
    public async Task A_failed_e_mail_is_retried_later_and_still_sent_only_once()
    {
        var (order, _) = await ShippedAsync("AWB-N2");
        var rig = new Rig(r => Task.FromResult(Rig.Json("{}"))) ;
        rig.Email.Succeed = false;
        await using (var db = _t.NewContext()) await rig.Processor(db).RunNotificationsAsync("test", Now);
        var s = (await ShipmentsOf(order.Id)).Single();
        Assert.Empty(s.NotifiedStatuses); Assert.Equal(1, s.NotifyFailures); Assert.Empty(rig.Email.Sent);

        rig.Email.Succeed = true;
        await using (var db = _t.NewContext()) await rig.Processor(db).RunNotificationsAsync("test", Now.AddSeconds(5));      // too early: backoff
        Assert.Empty(rig.Email.Sent);
        for (var i = 0; i < 2; i++) { await using var db = _t.NewContext(); await rig.Processor(db).RunNotificationsAsync("test", Now.AddHours(1 + i)); }
        Assert.Single(rig.Email.Sent);
        Assert.Contains("CREATED", (await ShipmentsOf(order.Id)).Single().NotifiedStatuses);
    }

    [Fact]
    public async Task Test_mode_on_a_production_host_pauses_the_whole_workflow()
    {
        var (order, _) = await ApprovedOrderAsync();
        var rig = CreatingRig();
        rig.Env.EnvironmentName = "Production";
        await using (var db = _t.NewContext()) await rig.Processor(db).RunAllAsync(Now);
        Assert.Empty(rig.Handler.Requests);
        Assert.Equal(FulfilmentStates.Approved, (await FulfilmentOf(order.Id)).State);
    }

    // ───────────── exception actions and customer view ─────────────

    [Fact]
    public async Task Retry_reopens_a_failed_order_with_a_new_reference_but_never_when_a_shipment_exists()
    {
        var (order, _) = await ApprovedOrderAsync();
        var refused = new Rig(r => Task.FromResult(Rig.Json(Rig.CreateRefused(order.OrderNumber))));
        await using (var db = _t.NewContext()) await refused.Processor(db).RunCreationAsync("test", Now);
        Assert.Equal(FulfilmentStates.Exception, (await FulfilmentOf(order.Id)).State);

        await using (var db = _t.NewContext())
            Assert.True((await new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal()).RetryAsync(order.Id, Admin)).Success);
        var ok = CreatingRig();
        await using (var db = _t.NewContext()) await ok.Processor(db).RunCreationAsync("test", Now.AddMinutes(1));
        var all = await ShipmentsOf(order.Id);
        Assert.Equal(2, all.Count);
        Assert.Contains(all, s => s.CreationState == C.Created && s.ClientOrderRef == order.OrderNumber + "-R2");

        await using (var db = _t.NewContext())
        {
            var f = await db.OrderFulfilments.SingleAsync(x => x.OrderId == order.Id); f.State = FulfilmentStates.Exception; await db.SaveChangesAsync();
            var again = await new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal()).RetryAsync(order.Id, Admin);
            Assert.False(again.Success); Assert.Equal(409, again.StatusCode);
        }
    }

    [Fact]
    public async Task Customers_see_only_their_own_shipment_and_never_internal_fields()
    {
        var (order, _) = await ShippedAsync("AWB-V1");
        await using var db = _t.NewContext();
        var svc = new FulfilmentService(db, new FakeDelhiveryConfig(), new NoSignal());
        var owner = await db.Orders.AsNoTracking().Where(o => o.Id == order.Id).Select(o => o.UserId).SingleAsync();
        var stranger = Guid.NewGuid();

        var mine = await svc.GetOrderShipmentAsync(order.Id, owner, false);
        Assert.True(mine.Success); Assert.Equal("AWB-V1", mine.Data!.Awb); Assert.Equal("Delhivery", mine.Data.Courier);
        Assert.Null(mine.Data.FulfilmentState); Assert.Null(mine.Data.LastError); Assert.Null(mine.Data.Mode); Assert.Null(mine.Data.ApprovedBy);

        Assert.Equal(404, (await svc.GetOrderShipmentAsync(order.Id, stranger, false)).StatusCode);
        Assert.Equal(404, (await svc.GetOrderShipmentAsync(order.Id, null, false)).StatusCode);

        var admin = await svc.GetOrderShipmentAsync(order.Id, stranger, true);
        Assert.Equal(FulfilmentStates.Shipped, admin.Data!.FulfilmentState); Assert.Equal("test", admin.Data.Mode);
    }

    [Fact]
    public async Task A_guest_tracking_an_order_sees_the_shipment_but_not_internal_fields()
    {
        await using var db = _t.NewContext();
        var p = await Seed.ProductAsync(db);
        var order = await Seed.OrderAsync(db, p, null, guestEmail: "guest@example.test", guestPhone: "9876543210");
        db.Shipments.Add(new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = order.OrderNumber, CreationState = C.Created, CreateAttempts = 1, Awb = "AWB-G1", LastError = "internal" });
        await db.SaveChangesAsync();

        var svc = Seed.OrderService(db);
        var ok = await svc.TrackGuestOrderAsync(order.OrderNumber, "guest@example.test");
        Assert.True(ok.Success);
        Assert.Equal("AWB-G1", ok.Data!.Shipment!.Awb); Assert.Equal("Delhivery", ok.Data.Shipment.Courier);
        Assert.Null(ok.Data.Shipment.LastError); Assert.Null(ok.Data.Shipment.FulfilmentState); Assert.Null(ok.Data.Shipment.Mode);
        Assert.False((await svc.TrackGuestOrderAsync(order.OrderNumber, "other@example.test")).Success);
    }

    [Fact]
    public async Task Queues_and_dashboard_reflect_the_workflow()
    {
        var before = (await Dash()).Data!;
        var (order, _) = await ApprovedOrderAsync();
        var mid = (await Dash()).Data!;
        Assert.Equal(before.ApprovedAwaitingShipment + 1, mid.ApprovedAwaitingShipment);

        var rig = CreatingRig();
        await using (var db = _t.NewContext()) await rig.Processor(db).RunCreationAsync("test", Now);
        var after = (await Dash()).Data!;
        Assert.Equal(mid.InTransit + 1, after.InTransit);

        await using var c = _t.NewContext();
        var list = await new FulfilmentService(c, new FakeDelhiveryConfig(), new NoSignal()).ListAsync("in-transit", 1, 100);
        var row = list.Data!.Items.Single(r => r.OrderId == order.Id);
        Assert.Equal("84925410100041", row.Awb); Assert.False((await new FulfilmentService(c, new FakeDelhiveryConfig(), new NoSignal()).ListAsync("nope", 1, 10)).Success);

        async Task<EcommerceApp.Application.Common.ApiResponse<FulfilmentDashboardDto>> Dash()
        { await using var d = _t.NewContext(); return await new FulfilmentService(d, new FakeDelhiveryConfig(), new NoSignal()).GetDashboardAsync(); }
    }
}

static class RigExtensions
{
    public static async Task RunAllAsyncForTest(this Rig rig, AppDbContext db, DateTime now) => await rig.Processor(db).RunAllAsync(now);
}
