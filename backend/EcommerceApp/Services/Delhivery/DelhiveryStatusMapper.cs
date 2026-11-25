using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Domain.Entities;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;

namespace EcommerceApp.Infrastructure.Services.Delhivery;

/// <summary>The customer-facing category for one Delhivery status, with the raw values kept exactly as received.</summary>
public sealed record MappedStatus(string Category, bool IsKnown, bool IsFinal, string? RawStatusType, string RawStatus, string? ScanCode, string Reason);

/// <summary>The shipment-level result of looking at a batch of scans.</summary>
public sealed record ResolvedStatus(string Category, bool IsFinal, DateTime? LastEventTime, MappedStatus? LastApplied,
    int IgnoredOlderScans, int UnrecognisedScans, bool ChangedCategory);

/// <summary>
/// Pure mapping from Delhivery's (status type, status) pairs to our categories. The vocabulary is the one Delhivery documents in the Developer Portal
/// ("Package Lifecycle" and the webhook page, read for Stage 2.3):
///   UD Manifested · UD Not Picked · UD In Transit · UD Pending · UD Dispatched · DL Delivered
///   RT In Transit · RT Pending · RT Dispatched · DL RTO
///   CN Canceled · CN Closed          (reverse shipments: PP Open/Scheduled/Dispatched, PU In Transit/Pending/Dispatched, DL DTO – out of scope)
/// It never matches on free text, only on the (type, status) pair, and it never produces PICKED_UP: Delhivery's vocabulary has no separate "picked up"
/// status ("UD In Transit" is defined as in transit AFTER physical pick-up), and telling a first pick-up scan from later hops needs scan context
/// that the documentation does not describe. Unknown pairs map to NEEDS_REVIEW with the raw values preserved.
/// The scan code (NSL) is carried through but does not change the category.
/// </summary>
public static class DelhiveryStatusMapper
{
    private static string Norm(string? v) => string.Join(' ', (v ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();

    private static readonly Dictionary<(string, string), string> Documented = new()
    {
        [("UD", "MANIFESTED")]  = S.Created,           // order created in the Delhivery system
        [("UD", "NOT PICKED")]  = S.Created,           // not physically picked up yet
        [("UD", "IN TRANSIT")]  = S.InTransit,         // in transit to its DC after physical pick-up
        [("UD", "PENDING")]     = S.InTransit,         // reached the destination DC, not yet dispatched
        [("UD", "DISPATCHED")]  = S.OutForDelivery,    // dispatched for delivery to the customer
        [("DL", "DELIVERED")]   = S.Delivered,
        [("RT", "IN TRANSIT")]  = S.RtoInTransit,      // converted into a return shipment
        [("RT", "PENDING")]     = S.RtoInTransit,      // reached the DC nearest to origin
        [("RT", "DISPATCHED")]  = S.RtoInTransit,
        [("DL", "RTO")]         = S.RtoDelivered,      // returned to origin
        [("CN", "CANCELED")]    = S.Cancelled,         // documented spelling
        [("CN", "CLOSED")]      = S.Cancelled,
    };

    /// <summary>Documented but belong to reverse / replacement journeys, which are out of scope: shown for review, never as customer progress.</summary>
    private static readonly HashSet<(string, string)> OutOfScopeReverse =
    [
        ("PP", "OPEN"), ("PP", "SCHEDULED"), ("PP", "DISPATCHED"),
        ("PU", "IN TRANSIT"), ("PU", "PENDING"), ("PU", "DISPATCHED"),
        ("DL", "DTO"),
    ];

    public static MappedStatus Map(string? statusType, string? status, string? scanCode = null)
    {
        var type = Norm(statusType);
        var st = Norm(status);
        var rawType = string.IsNullOrWhiteSpace(statusType) ? null : statusType.Trim();
        var rawStatus = (status ?? "").Trim();
        var code = string.IsNullOrWhiteSpace(scanCode) ? null : scanCode.Trim();

        if (Documented.TryGetValue((type, st), out var category))
            return new MappedStatus(category, true, ShipmentRules.IsFinalStatus(category), rawType, rawStatus, code, "documented status");

        if (OutOfScopeReverse.Contains((type, st)))
            return new MappedStatus(S.NeedsReview, true, false, rawType, rawStatus, code, "documented reverse/replacement status (out of scope)");

        var reason = st.Length == 0 ? "status missing" : type.Length == 0 ? "status type missing" : "status not in the documented vocabulary";
        return new MappedStatus(S.NeedsReview, false, false, rawType, rawStatus, code, reason);
    }

    private static int ForwardRank(string category) => category switch
    {
        S.Created => 0, S.PickedUp => 1, S.InTransit => 2, S.OutForDelivery => 3, S.Delivered => 4, _ => -1
    };

    /// <summary>
    /// Looks at a batch of scans and decides the shipment's category.
    ///  - scans are processed oldest first; a scan older than the shipment's last known event never changes it (older scans cannot overwrite newer ones)
    ///  - a forward status never moves backwards (Out for delivery is not replaced by an earlier In transit)
    ///  - RTO and Cancelled are branches: they apply when their scan is not older than the last event
    ///  - once final (Delivered, RTO delivered, Cancelled) nothing changes the category
    ///  - an unrecognised scan is counted but never changes the category
    /// </summary>
    public static ResolvedStatus Resolve(string? currentCategory, DateTime? currentEventTime, IEnumerable<DelhiveryScan> scans)
    {
        var category = string.IsNullOrEmpty(currentCategory) ? S.Created : currentCategory;
        var lastTime = currentEventTime;
        MappedStatus? last = null;
        int older = 0, unknown = 0;
        var changed = false;

        var ordered = scans.Select((s, i) => (Scan: s, Index: i))
            .OrderBy(x => x.Scan.ScanTime ?? DateTime.MinValue)       // scans without a time are the oldest
            .ThenBy(x => x.Index)
            .Select(x => x.Scan);

        foreach (var scan in ordered)
        {
            var mapped = Map(scan.StatusType, scan.Status, scan.ScanCode);

            if (ShipmentRules.IsFinalStatus(category)) { older++; continue; }                     // final: nothing can change it
            if (scan.ScanTime is { } t && lastTime is { } lt && t < lt) { older++; continue; }    // older than what we already know

            if (mapped.Category == S.NeedsReview) { unknown++; continue; }

            var branch = mapped.Category is S.RtoInTransit or S.RtoDelivered or S.Cancelled;
            var candidateRank = ForwardRank(mapped.Category);
            var currentRank = ForwardRank(category);

            if (!branch && currentRank >= 0 && candidateRank < currentRank) { older++; continue; }   // would move a forward status backwards
            if (!branch && category is S.RtoInTransit) { older++; continue; }                          // returning parcels do not go forward again

            if (mapped.Category != category) changed = true;
            category = mapped.Category;
            last = mapped;
            if (scan.ScanTime != null && (lastTime == null || scan.ScanTime > lastTime)) lastTime = scan.ScanTime;
        }

        return new ResolvedStatus(category, ShipmentRules.IsFinalStatus(category), lastTime, last, older, unknown, changed);
    }
}
