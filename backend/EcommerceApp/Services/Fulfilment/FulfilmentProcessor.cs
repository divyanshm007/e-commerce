using System.Security.Cryptography;
using System.Text;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services.Delhivery;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using C = EcommerceApp.Domain.Entities.ShipmentConstants.CreationStates;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;

namespace EcommerceApp.Infrastructure.Services.Fulfilment;

/// <summary>
/// The automation behind an approved order. Every phase reads its work from the database, so a restart loses nothing:
///  1. creation      APPROVED -> (lease) CREATING -> shipment row IN_FLIGHT is saved BEFORE Delhivery is called -> CREATED / FAILED / UNKNOWN
///  2. reconciliation an UNKNOWN creation is looked up by our order reference; it is never created again blindly
///  3. tracking      scans are stored once (hash), the status moves forward only, the order status follows
///  4. notification  one e-mail per category, recorded before sending and withdrawn if the send fails
/// Callers hold a database-wide lock so only one instance runs these phases at a time.
/// </summary>
public class FulfilmentProcessor
{
    private readonly AppDbContext _db;
    private readonly IDelhiveryClient _client;
    private readonly IDelhiveryConfigService _config;
    private readonly IEmailService _email;
    private readonly IHostEnvironment _env;
    private readonly FulfilmentOptions _o;
    private readonly ILogger<FulfilmentProcessor> _log;

    public FulfilmentProcessor(AppDbContext db, IDelhiveryClient client, IDelhiveryConfigService config, IEmailService email,
        IHostEnvironment env, IOptions<FulfilmentOptions> options, ILogger<FulfilmentProcessor> log)
    {
        _db = db; _client = client; _config = config; _email = email; _env = env; _o = options.Value; _log = log;
    }

    public async Task RunAllAsync(DateTime? nowOverride = null, CancellationToken ct = default)
    {
        var now = nowOverride ?? DateTime.UtcNow;
        string mode;
        try { mode = await _config.GetModeAsync(); }
        catch (DelhiveryConfigurationException ex) { _log.LogWarning("Fulfilment paused: {Reason}", ex.Message); return; }

        if (_env.IsProduction() && mode == ShipmentConstants.Test && !_o.AllowTestModeInProduction)
        {
            _log.LogWarning("Fulfilment paused: Delhivery is in test mode on a Production host (set Delhivery:Fulfilment:AllowTestModeInProduction to override).");
            return;
        }

        await Phase("recover", () => RecoverExpiredLeasesAsync(now, ct));
        await Phase("create", () => RunCreationAsync(mode, now, ct));
        await Phase("reconcile", () => RunReconciliationAsync(mode, now, ct));
        await Phase("track", () => RunTrackingAsync(mode, now, ct));
        await Phase("notify", () => RunNotificationsAsync(mode, now, ct));
    }

    // one failing phase must not stop the others
    private async Task Phase(string name, Func<Task> body)
    {
        try { await body(); }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _db.ChangeTracker.Clear();
            _log.LogError(ex, "Fulfilment phase {Phase} failed", name);
        }
    }

    // ───────────────────────── restart recovery ─────────────────────────

    /// <summary>A worker that died while holding a lease leaves a CREATING row with an expired lease. Decide what is safe.</summary>
    public async Task RecoverExpiredLeasesAsync(DateTime now, CancellationToken ct = default)
    {
        var expired = await _db.OrderFulfilments.Where(f => f.State == FulfilmentStates.Creating && f.LeaseUntil != null && f.LeaseUntil < now)
            .Select(f => new { f.Id, f.OrderId }).ToListAsync(ct);
        foreach (var f in expired)
        {
            // a shipment row that was reserved but never answered: the request MAY have reached Delhivery -> unknown, reconcile (never resend)
            var inflight = await _db.Shipments.Where(s => s.OrderId == f.OrderId && s.CreationState == C.InFlight).ToListAsync(ct);
            foreach (var s in inflight)
            {
                s.CreationState = C.Unknown;
                s.LastError = "The application stopped while the shipment was being created; checking with Delhivery.";
                s.LastErrorAt = now;
                s.NextCheckAt = now;
            }
            if (inflight.Count > 0)
                await _db.OrderFulfilments.Where(x => x.Id == f.Id && x.State == FulfilmentStates.Creating)
                    .ExecuteUpdateAsync(u => u.SetProperty(x => x.LeaseUntil, (DateTime?)null).SetProperty(x => x.UpdatedAt, now), ct);
            else
                // no request was ever prepared: simply make it available again
                await _db.OrderFulfilments.Where(x => x.Id == f.Id && x.State == FulfilmentStates.Creating)
                    .ExecuteUpdateAsync(u => u.SetProperty(x => x.State, FulfilmentStates.Approved).SetProperty(x => x.LeaseUntil, (DateTime?)null)
                        .SetProperty(x => x.NextAttemptAt, (DateTime?)now).SetProperty(x => x.UpdatedAt, now), ct);
            await _db.SaveChangesAsync(ct);
        }
    }

    // ───────────────────────── 1. creation ─────────────────────────

    public async Task RunCreationAsync(string mode, DateTime now, CancellationToken ct = default)
    {
        var ids = await _db.OrderFulfilments
            .Where(f => f.State == FulfilmentStates.Approved && (f.NextAttemptAt == null || f.NextAttemptAt <= now))
            .OrderBy(f => f.ApprovedAt).Select(f => f.Id).Take(_o.BatchSize).ToListAsync(ct);

        foreach (var id in ids)
        {
            // atomic claim: if another instance took it, zero rows change and we skip
            var lease = now.AddMinutes(_o.LeaseMinutes);
            var claimed = await _db.OrderFulfilments.Where(f => f.Id == id && f.State == FulfilmentStates.Approved)
                .ExecuteUpdateAsync(u => u.SetProperty(f => f.State, FulfilmentStates.Creating).SetProperty(f => f.LeaseUntil, (DateTime?)lease)
                    .SetProperty(f => f.Attempts, f => f.Attempts + 1).SetProperty(f => f.UpdatedAt, now), ct);
            if (claimed == 0) continue;

            try { await CreateOneAsync(id, mode, now, ct); }
            catch (OperationCanceledException) { throw; }
            catch (Exception ex)
            {
                _db.ChangeTracker.Clear();
                _log.LogError(ex, "Creating the shipment for fulfilment {Id} failed unexpectedly", id);
                // we do not know how far it got: leave the lease to expire so recovery decides (never a blind resend)
            }
        }
    }

    private async Task CreateOneAsync(Guid fulfilmentId, string mode, DateTime now, CancellationToken ct)
    {
        var f = await _db.OrderFulfilments.Include(x => x.Order).ThenInclude(o => o.Items).AsSplitQuery().FirstAsync(x => x.Id == fulfilmentId, ct);
        var order = f.Order;

        // the order may have been cancelled between approval and now
        if (order.Status is OrderStatus.Cancelled or OrderStatus.Returned)
        { await ToException(f, "The order was cancelled or returned after approval; no shipment was created.", null, now, ct); return; }

        var existing = await _db.Shipments.Where(s => s.OrderId == order.Id).ToListAsync(ct);
        if (existing.Any(s => s.CreationState == C.Created))
        { f.State = FulfilmentStates.Shipped; f.LeaseUntil = null; f.UpdatedAt = now; await _db.SaveChangesAsync(ct); return; }
        if (existing.Any(s => s.CreationState is C.InFlight or C.Unknown))
        { f.LeaseUntil = null; f.UpdatedAt = now; await _db.SaveChangesAsync(ct); return; }                // reconciliation owns it

        var n = existing.Count(s => s.Mode == mode) + 1;
        var clientRef = n == 1 ? order.OrderNumber : $"{order.OrderNumber}-R{n}";
        var built = DelhiveryRequestBuilder.FromOrder(order, clientRef, _config.PickupLocationFor(mode));
        if (!built.Success)
        { await ToException(f, "Cannot send to Delhivery: " + string.Join(" ", built.Errors), null, now, ct); return; }

        // reserve the shipment BEFORE the call. The unique index on (order, open) makes a second concurrent creation impossible.
        var shipment = new Shipment
        {
            OrderId = order.Id, Mode = mode, ClientOrderRef = clientRef, CreationState = C.InFlight, CreateAttempts = 1,
            Status = S.Created, CreatedByUserId = f.ApprovedByUserId
        };
        _db.Shipments.Add(shipment);
        try { await _db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            _db.ChangeTracker.Clear();
            await _db.OrderFulfilments.Where(x => x.Id == fulfilmentId).ExecuteUpdateAsync(u => u.SetProperty(x => x.LeaseUntil, (DateTime?)null), ct);
            _log.LogWarning("A shipment for fulfilment {Id} already exists; not creating another.", fulfilmentId);
            return;
        }

        var result = await _client.CreateShipmentAsync(built.Value!, ct);
        _log.LogInformation("Shipment create for order {Order}: {Outcome}", order.OrderNumber, result.Outcome);

        if (result.Processing == CreateProcessingState.Created && !string.IsNullOrWhiteSpace(result.Awb))
        {
            shipment.CreationState = C.Created;
            shipment.Awb = result.Awb;
            shipment.CreateResponseRef = Cap(result.UploadRef, 200);
            shipment.Status = S.Created;
            shipment.NextCheckAt = now.AddMinutes(_o.TrackIntervalMinutes);
            shipment.LastError = null;
            f.State = FulfilmentStates.Shipped; f.LeaseUntil = null; f.LastError = null; f.AttentionReason = null; f.UpdatedAt = now;
            if (string.IsNullOrEmpty(order.TrackingNumber)) order.TrackingNumber = result.Awb;
            await _db.SaveChangesAsync(ct);
            return;
        }

        switch (result.Processing)
        {
            case CreateProcessingState.NotCreated:
                shipment.CreationState = C.Failed;                                                          // certain: nothing exists at Delhivery
                shipment.LastError = Cap(Reason(result), 500); shipment.LastErrorAt = now;
                var permanent = result.Outcome is DelhiveryOutcome.Refused or DelhiveryOutcome.DefinitelyRejected or DelhiveryOutcome.AuthenticationFailed;
                if (permanent || f.Attempts >= _o.MaxCreateAttempts)
                    await ToException(f, Cap("Delhivery did not create the shipment: " + Reason(result), 500), shipment, now, ct);
                else
                {
                    f.State = FulfilmentStates.Approved; f.LeaseUntil = null; f.LastError = Cap(Reason(result), 500); f.UpdatedAt = now;
                    f.NextAttemptAt = now.Add(result.RetryAfter ?? TimeSpan.FromMinutes(_o.RetryBackoffMinutes * f.Attempts));
                    await _db.SaveChangesAsync(ct);
                }
                break;

            default:                                                                                         // unknown: it may exist -> reconcile first
                shipment.CreationState = C.Unknown;
                shipment.LastError = Cap("Delhivery's answer did not confirm the outcome (" + result.Outcome + ").", 500); shipment.LastErrorAt = now;
                shipment.NextCheckAt = now.AddMinutes(_o.ReconcileDelayMinutes);
                f.LeaseUntil = null; f.LastError = shipment.LastError; f.UpdatedAt = now;
                await _db.SaveChangesAsync(ct);
                break;
        }
    }

    private static string Reason(DelhiveryCreateResult r) =>
        r.Remarks.Count > 0 ? string.Join("; ", r.Remarks) : r.Message;

    private async Task ToException(OrderFulfilment f, string reason, Shipment? shipment, DateTime now, CancellationToken ct)
    {
        f.State = FulfilmentStates.Exception; f.LeaseUntil = null; f.AttentionReason = Cap(reason, 500); f.LastError = Cap(reason, 500); f.UpdatedAt = now;
        _db.ActivityLogs.Add(new ActivityLog
        {
            Action = "Fulfilment.Exception", EntityType = nameof(Order), EntityId = f.OrderId.ToString(),
            Description = Cap("Moved to the exception queue: " + reason, 1000)
        });
        await _db.SaveChangesAsync(ct);
    }

    // ───────────────────────── 2. reconciliation ─────────────────────────

    public async Task RunReconciliationAsync(string mode, DateTime now, CancellationToken ct = default)
    {
        var unknown = await _db.Shipments.Include(s => s.Order)
            .Where(s => s.Mode == mode && s.CreationState == C.Unknown && (s.NextCheckAt == null || s.NextCheckAt <= now))
            .OrderBy(s => s.CreatedAt).Take(_o.BatchSize).ToListAsync(ct);

        foreach (var s in unknown)
        {
            var result = await _client.TrackByReferenceAsync(s.ClientOrderRef, ct);
            var fulfilment = await _db.OrderFulfilments.FirstOrDefaultAsync(f => f.OrderId == s.OrderId, ct);
            s.ReconcileAttempts++;

            var match = result.Outcome == DelhiveryOutcome.Succeeded
                ? result.Shipments.FirstOrDefault(t => string.Equals(t.ReferenceNo, s.ClientOrderRef, StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(t.Awb))
                : null;

            if (match != null)
            {
                // Delhivery has it: adopt its waybill instead of creating anything
                s.CreationState = C.Created; s.Awb = match.Awb; s.LastError = null; s.NextCheckAt = now;
                if (string.IsNullOrEmpty(s.Order.TrackingNumber)) s.Order.TrackingNumber = match.Awb;
                if (fulfilment != null) { fulfilment.State = FulfilmentStates.Shipped; fulfilment.AttentionReason = null; fulfilment.LastError = null; fulfilment.UpdatedAt = now; }
                try { await _db.SaveChangesAsync(ct); }
                catch (DbUpdateException ex) { _db.ChangeTracker.Clear(); _log.LogError(ex, "Could not store the reconciled waybill for {Ref}", s.ClientOrderRef); continue; }
                await ApplyTrackingAsync(s, match, now, ct);
                continue;
            }

            // "not found" or an unreadable answer is NOT proof that nothing was created (the lookup form is unconfirmed): keep checking, then ask a human
            s.LastError = Cap("Could not confirm with Delhivery whether the shipment exists (" + result.Outcome + ").", 500);
            s.LastErrorAt = now;
            if (s.ReconcileAttempts >= _o.MaxReconcileAttempts)
            {
                s.NextCheckAt = null;
                if (fulfilment != null)
                    await ToException(fulfilment, "Delhivery could not confirm whether the shipment was created. Check the Delhivery portal for reference " + s.ClientOrderRef +
                        ", then choose Retry (if it does not exist) or contact support.", s, now, ct);
                else await _db.SaveChangesAsync(ct);
            }
            else
            {
                s.NextCheckAt = now.AddMinutes(_o.ReconcileDelayMinutes * s.ReconcileAttempts);
                await _db.SaveChangesAsync(ct);
            }
        }
    }

    // ───────────────────────── 3. tracking ─────────────────────────

    public async Task RunTrackingAsync(string mode, DateTime now, CancellationToken ct = default)
    {
        var due = await _db.Shipments.Where(ShipmentRules.NeedsTracking).Where(s => s.Mode == mode && s.Awb != null && (s.NextCheckAt == null || s.NextCheckAt <= now))
            .OrderBy(s => s.NextCheckAt).Take(DelhiveryRequestBuilder.MaxWaybillsPerTrackRequest).ToListAsync(ct);
        if (due.Count == 0) return;

        var result = await _client.TrackAsync(due.Select(s => s.Awb!).ToList(), null, ct);

        if (result.Outcome == DelhiveryOutcome.Succeeded)
        {
            foreach (var s in due)
            {
                var t = result.Shipments.FirstOrDefault(x => string.Equals(x.Awb, s.Awb, StringComparison.Ordinal));
                if (t == null) { await TrackFailedAsync(s, "Delhivery did not return this waybill.", now, ct); continue; }
                await ApplyTrackingAsync(s, t, now, ct);
            }
        }
        else if (result.Outcome == DelhiveryOutcome.NotFound && due.Count > 1)
        {
            // one unknown waybill may spoil a batch answer: ask one by one so the good ones still progress
            foreach (var s in due)
            {
                var single = await _client.TrackAsync([s.Awb!], null, ct);
                var t = single.Outcome == DelhiveryOutcome.Succeeded ? single.Shipments.FirstOrDefault(x => x.Awb == s.Awb) : null;
                if (t != null) await ApplyTrackingAsync(s, t, now, ct);
                else await TrackFailedAsync(s, "Delhivery could not provide tracking (" + single.Outcome + ").", now, ct);
            }
        }
        else
        {
            foreach (var s in due) await TrackFailedAsync(s, "Delhivery could not provide tracking (" + result.Outcome + ").", now, ct, result.RetryAfter);
        }
    }

    private async Task TrackFailedAsync(Shipment s, string reason, DateTime now, CancellationToken ct, TimeSpan? retryAfter = null)
    {
        s.TrackFailureCount++; s.LastCheckedAt = now; s.LastError = Cap(reason, 500); s.LastErrorAt = now;
        var minutes = Math.Min(360, _o.TrackIntervalMinutes * Math.Max(1, s.TrackFailureCount));
        s.NextCheckAt = now.Add(retryAfter ?? TimeSpan.FromMinutes(minutes));
        if (s.TrackFailureCount == _o.MaxTrackFailures)
        {
            var f = await _db.OrderFulfilments.FirstOrDefaultAsync(x => x.OrderId == s.OrderId, ct);
            if (f != null && f.State == FulfilmentStates.Shipped)
            {
                f.State = FulfilmentStates.Exception; f.AttentionReason = "Tracking has failed repeatedly; check the shipment with Delhivery."; f.UpdatedAt = now;
            }
        }
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Stores new scans once, moves the status forward only, and keeps the order in step.</summary>
    public async Task ApplyTrackingAsync(Shipment s, DelhiveryTrackedShipment t, DateTime now, CancellationToken ct = default)
    {
        var scans = t.Scans.ToList();
        // the headline status is normally also the latest scan; add it only when it is not already one of the scans
        if (t.CurrentStatus is { } cur && !scans.Any(x => x.Status == cur.Status && x.StatusType == cur.StatusType && x.ScanTime == cur.ScanTime))
            scans.Add(cur);

        var known = (await _db.ShipmentTrackingEvents.Where(e => e.ShipmentId == s.Id).Select(e => e.EventHash).ToListAsync(ct)).ToHashSet();
        var added = 0; var unrecognised = 0;
        foreach (var sc in scans)
        {
            var hash = Hash(sc);
            if (!known.Add(hash)) continue;                                                              // already stored: a repeated scan is a no-op
            var mapped = DelhiveryStatusMapper.Map(sc.StatusType, sc.Status, sc.ScanCode);
            if (!mapped.IsKnown) unrecognised++;
            _db.ShipmentTrackingEvents.Add(new ShipmentTrackingEvent
            {
                ShipmentId = s.Id, StatusType = Cap(sc.StatusType, 10), Status = Cap(sc.Status, 100)!, ScanCode = Cap(sc.ScanCode, 30),
                Location = Cap(sc.Location, 200), ScanTime = sc.ScanTime, Description = Cap(sc.Description, 500),
                MappedStatus = mapped.Category, EventHash = hash, Source = ShipmentConstants.EventSources.Poll
            });
            added++;
        }

        var before = s.Status;
        var resolved = DelhiveryStatusMapper.Resolve(s.Status, s.LastEventAt, scans);
        ShipmentRules.ApplyStatus(s, resolved.Category);
        if (resolved.LastApplied != null) { s.DelhiveryStatus = Cap(resolved.LastApplied.RawStatus, 100); s.DelhiveryStatusType = Cap(resolved.LastApplied.RawStatusType, 10); }
        if (resolved.LastEventTime != null) s.LastEventAt = resolved.LastEventTime;
        if (t.ExpectedDeliveryDate != null) s.ExpectedDeliveryDate = t.ExpectedDeliveryDate;               // only what Delhivery supplied
        s.LastCheckedAt = now; s.TrackFailureCount = 0; s.LastError = null;
        s.NextCheckAt = s.IsFinal ? null : now.AddMinutes(s.Status == S.OutForDelivery ? _o.OutForDeliveryIntervalMinutes : _o.TrackIntervalMinutes);

        await UpdateOrderAndFulfilmentAsync(s, before, unrecognised, now, ct);
        await _db.SaveChangesAsync(ct);
    }

    private async Task UpdateOrderAndFulfilmentAsync(Shipment s, string before, int unrecognised, DateTime now, CancellationToken ct)
    {
        var f = await _db.OrderFulfilments.FirstOrDefaultAsync(x => x.OrderId == s.OrderId, ct);

        // order status follows the courier (no manual step, no legacy e-mail: customer e-mails come from the notification phase)
        if (s.Status is S.InTransit or S.OutForDelivery)
            await _db.Orders.Where(o => o.Id == s.OrderId && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed))
                .ExecuteUpdateAsync(u => u.SetProperty(o => o.Status, OrderStatus.Shipped).SetProperty(o => o.ShippedAt, now).SetProperty(o => o.UpdatedAt, now), ct);
        else if (s.Status == S.Delivered)
            await _db.Orders.Where(o => o.Id == s.OrderId && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Shipped))
                .ExecuteUpdateAsync(u => u.SetProperty(o => o.Status, OrderStatus.Delivered).SetProperty(o => o.DeliveredAt, now)
                    .SetProperty(o => o.ShippedAt, o => o.ShippedAt ?? now).SetProperty(o => o.UpdatedAt, now), ct);

        if (f == null) return;
        if (s.Status == S.Delivered) { f.State = FulfilmentStates.Completed; f.AttentionReason = null; f.UpdatedAt = now; }
        else if (s.Status is S.RtoInTransit or S.RtoDelivered or S.Cancelled && before != s.Status)
        {
            f.State = FulfilmentStates.Exception; f.UpdatedAt = now;
            f.AttentionReason = s.Status == S.Cancelled ? "Delhivery cancelled the shipment." : "The parcel is being returned to origin (RTO).";
        }
        else if (unrecognised > 0 && f.State == FulfilmentStates.Shipped)
        {
            f.State = FulfilmentStates.Exception; f.UpdatedAt = now;
            f.AttentionReason = "Delhivery reported a status we do not recognise; please review the tracking history.";
        }
    }

    // ───────────────────────── 4. notifications ─────────────────────────

    private static readonly string[] Notifiable = [S.Created, S.InTransit, S.OutForDelivery, S.Delivered];

    public async Task RunNotificationsAsync(string mode, DateTime now, CancellationToken ct = default)
    {
        var due = await _db.Shipments.Include(s => s.Order).ThenInclude(o => o.User)
            .Where(s => s.Mode == mode && s.CreationState == C.Created && s.NotifyFailures < _o.MaxNotifyFailures
                        && (s.NextNotifyAt == null || s.NextNotifyAt <= now) && Notifiable.Contains(s.Status))
            .OrderBy(s => s.CreatedAt).Take(_o.BatchSize).ToListAsync(ct);

        foreach (var s in due)
        {
            var category = s.Status;
            if (s.NotifiedStatuses.Contains(category)) continue;

            var to = s.Order.User?.Email ?? s.Order.GuestEmail;
            if (string.IsNullOrWhiteSpace(to)) { MarkNotified(s, category); await _db.SaveChangesAsync(ct); continue; }   // nobody to tell

            // record BEFORE sending: a crash then loses at most one e-mail instead of sending it twice
            MarkNotified(s, category);
            await _db.SaveChangesAsync(ct);

            var name = s.Order.User?.FirstName ?? s.Order.GuestName ?? "Customer";
            var ok = await _email.TrySendShipmentEmailAsync(to, name, new ShipmentEmailInfo(s.Order.OrderNumber, category, s.Awb, s.CourierName, s.ExpectedDeliveryDate, s.Order.UserId == null, s.OrderId));
            if (!ok)
            {
                s.NotifiedStatuses = s.NotifiedStatuses.Where(x => x != category).ToList();                 // withdraw: it will be retried
                s.NotifyFailures++;
                s.NextNotifyAt = now.AddMinutes(_o.RetryBackoffMinutes * s.NotifyFailures);
                await _db.SaveChangesAsync(ct);
            }
            else if (s.NotifyFailures != 0)
            {
                s.NotifyFailures = 0; s.NextNotifyAt = null;
                await _db.SaveChangesAsync(ct);
            }
        }
    }

    private static void MarkNotified(Shipment s, string category) => s.NotifiedStatuses = [.. s.NotifiedStatuses, category];

    // ───────────────────────── helpers ─────────────────────────

    public static string Hash(DelhiveryScan s)
    {
        var text = string.Join("|", s.StatusType, s.Status, s.ScanCode, s.ScanTime?.ToString("O"), s.Location);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();
    }

    private static string? Cap(string? v, int max) => v == null ? null : v.Length <= max ? v : v[..max];
}
