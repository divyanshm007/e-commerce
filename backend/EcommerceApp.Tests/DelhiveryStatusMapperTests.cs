using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Services.Delhivery;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;

namespace EcommerceApp.Tests;

/// <summary>
/// The status vocabulary below is the one Delhivery documents in its Developer Portal ("Package Lifecycle" and the webhook page). These tests use
/// only that documented vocabulary – no response bodies are involved, so none is invented.
/// </summary>
public class DelhiveryStatusMapperTests
{
    [Theory]
    [InlineData("UD", "Manifested", S.Created, false)]
    [InlineData("UD", "Not Picked", S.Created, false)]
    [InlineData("UD", "In Transit", S.InTransit, false)]
    [InlineData("UD", "Pending", S.InTransit, false)]
    [InlineData("UD", "Dispatched", S.OutForDelivery, false)]
    [InlineData("DL", "Delivered", S.Delivered, true)]
    [InlineData("RT", "In Transit", S.RtoInTransit, false)]
    [InlineData("RT", "Pending", S.RtoInTransit, false)]
    [InlineData("RT", "Dispatched", S.RtoInTransit, false)]
    [InlineData("DL", "RTO", S.RtoDelivered, true)]
    [InlineData("CN", "Canceled", S.Cancelled, true)]
    [InlineData("CN", "Closed", S.Cancelled, true)]
    public void Every_documented_forward_return_and_cancel_status_maps_to_its_category(string type, string status, string category, bool final)
    {
        var m = DelhiveryStatusMapper.Map(type, status);

        Assert.Equal(category, m.Category);
        Assert.True(m.IsKnown);
        Assert.Equal(final, m.IsFinal);
    }

    [Theory]
    [InlineData("ud", "in transit")]
    [InlineData(" UD ", "  IN   TRANSIT ")]
    [InlineData("Ud", "In  Transit")]
    public void Matching_ignores_case_and_extra_spaces_but_the_raw_text_is_preserved(string type, string status)
    {
        var m = DelhiveryStatusMapper.Map(type, status);

        Assert.Equal(S.InTransit, m.Category);
        Assert.Equal(type.Trim(), m.RawStatusType);
        Assert.Equal(status.Trim(), m.RawStatus);
    }

    [Theory]
    [InlineData("PP", "Open")]
    [InlineData("PP", "Scheduled")]
    [InlineData("PP", "Dispatched")]
    [InlineData("PU", "In Transit")]
    [InlineData("PU", "Pending")]
    [InlineData("PU", "Dispatched")]
    [InlineData("DL", "DTO")]
    public void Documented_reverse_statuses_are_known_but_out_of_scope_and_go_to_review(string type, string status)
    {
        var m = DelhiveryStatusMapper.Map(type, status);

        Assert.Equal(S.NeedsReview, m.Category);
        Assert.True(m.IsKnown);                 // documented, just not part of forward shipping
        Assert.False(m.IsFinal);
        Assert.Contains("out of scope", m.Reason);
    }

    [Theory]
    [InlineData("UD", "Lost")]                  // the documentation mentions 'Lost' in prose but gives no status pair for it
    [InlineData("XX", "Whatever")]
    [InlineData("UD", "Delivered")]             // a real status name under the wrong type is not guessed
    [InlineData("DL", "Dispatched")]
    [InlineData("CN", "Cancelled")]             // only the documented spelling 'Canceled' is recognised
    [InlineData("", "Delivered")]
    public void Unknown_combinations_map_to_needs_review_with_the_raw_values_kept(string type, string status)
    {
        var m = DelhiveryStatusMapper.Map(type, status, "EOD-74");

        Assert.Equal(S.NeedsReview, m.Category);
        Assert.False(m.IsKnown);
        Assert.False(m.IsFinal);
        Assert.Equal(status, m.RawStatus);
        Assert.Equal("EOD-74", m.ScanCode);
    }

    [Fact]
    public void Missing_optional_fields_do_not_crash_and_never_invent_a_status()
    {
        var none = DelhiveryStatusMapper.Map(null, null);
        Assert.Equal(S.NeedsReview, none.Category);
        Assert.Equal("", none.RawStatus);
        Assert.Null(none.RawStatusType);
        Assert.Null(none.ScanCode);

        var noType = DelhiveryStatusMapper.Map(null, "Delivered");
        Assert.Equal(S.NeedsReview, noType.Category);             // a status without its type is ambiguous (DL Delivered vs anything else)
        Assert.Contains("type missing", noType.Reason);

        var noStatus = DelhiveryStatusMapper.Map("DL", "   ");
        Assert.Equal(S.NeedsReview, noStatus.Category);
    }

    [Fact]
    public void The_scan_code_is_carried_through_but_never_changes_the_category()
    {
        foreach (var code in new[] { null, "", "EOD-74", "EOD-777", "X-UC", "anything" })
        {
            var m = DelhiveryStatusMapper.Map("UD", "Dispatched", code);
            Assert.Equal(S.OutForDelivery, m.Category);
            Assert.Equal(string.IsNullOrWhiteSpace(code) ? null : code, m.ScanCode);
        }
    }

    [Fact]
    public void Picked_up_is_never_inferred_because_delhivery_documents_no_separate_pickup_status()
    {
        var all = new (string, string)[]
        {
            ("UD","Manifested"),("UD","Not Picked"),("UD","In Transit"),("UD","Pending"),("UD","Dispatched"),("DL","Delivered"),
            ("RT","In Transit"),("RT","Pending"),("RT","Dispatched"),("DL","RTO"),("CN","Canceled"),("CN","Closed"),
            ("PP","Open"),("PU","In Transit"),("DL","DTO"),("XX","Unknown")
        };
        Assert.DoesNotContain(all, p => DelhiveryStatusMapper.Map(p.Item1, p.Item2, "any-code").Category == S.PickedUp);
        // and a first "In Transit" scan after "Manifested" is not turned into Picked up either
        var r = DelhiveryStatusMapper.Resolve(null, null, new[]
        {
            new DelhiveryScan("UD", "Manifested", ScanTime: T(1)), new DelhiveryScan("UD", "In Transit", ScanTime: T(2))
        });
        Assert.Equal(S.InTransit, r.Category);
    }

    [Fact]
    public void Final_flags_agree_with_the_shared_rule()
    {
        foreach (var s in S.All) Assert.Equal(ShipmentRules.IsFinalStatus(s), s is S.Delivered or S.RtoDelivered or S.Cancelled);
    }

    // ───────── shipment-level resolution, including older scans ─────────

    private static DateTime T(int hour) => new(2026, 11, 9, hour, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void A_batch_of_scans_is_applied_oldest_first_whatever_order_it_arrives_in()
    {
        var inOrder = new[] { new DelhiveryScan("UD", "Manifested", ScanTime: T(1)), new DelhiveryScan("UD", "In Transit", ScanTime: T(2)), new DelhiveryScan("UD", "Dispatched", ScanTime: T(3)) };
        var shuffled = new[] { inOrder[2], inOrder[0], inOrder[1] };

        foreach (var scans in new[] { inOrder, shuffled })
        {
            var r = DelhiveryStatusMapper.Resolve(null, null, scans);
            Assert.Equal(S.OutForDelivery, r.Category);
            Assert.False(r.IsFinal);
            Assert.Equal(T(3), r.LastEventTime);
            Assert.True(r.ChangedCategory);
        }
    }

    [Fact]
    public void An_older_scan_never_overwrites_a_newer_status()
    {
        // we already know the shipment is out for delivery as of 15:00; a scan from 14:00 arrives late
        var r = DelhiveryStatusMapper.Resolve(S.OutForDelivery, T(15), new[] { new DelhiveryScan("UD", "In Transit", ScanTime: T(14)) });

        Assert.Equal(S.OutForDelivery, r.Category);
        Assert.Equal(1, r.IgnoredOlderScans);
        Assert.False(r.ChangedCategory);
        Assert.Equal(T(15), r.LastEventTime);
    }

    [Fact]
    public void A_forward_status_never_moves_backwards_even_when_the_scan_looks_newer()
    {
        var r = DelhiveryStatusMapper.Resolve(S.OutForDelivery, T(15), new[] { new DelhiveryScan("UD", "Pending", ScanTime: T(16)) });

        Assert.Equal(S.OutForDelivery, r.Category);
        Assert.Equal(1, r.IgnoredOlderScans);
    }

    [Fact]
    public void Return_to_origin_is_a_branch_and_ends_in_a_final_state()
    {
        var scans = new[]
        {
            new DelhiveryScan("UD", "Dispatched", ScanTime: T(10)),
            new DelhiveryScan("RT", "In Transit", ScanTime: T(11)),
            new DelhiveryScan("RT", "Pending", ScanTime: T(12)),
            new DelhiveryScan("DL", "RTO", ScanTime: T(13)),
        };
        var r = DelhiveryStatusMapper.Resolve(null, null, scans);

        Assert.Equal(S.RtoDelivered, r.Category);
        Assert.True(r.IsFinal);
    }

    [Fact]
    public void A_returning_parcel_does_not_go_forward_again()
    {
        var r = DelhiveryStatusMapper.Resolve(S.RtoInTransit, T(11), new[] { new DelhiveryScan("UD", "Dispatched", ScanTime: T(12)) });

        Assert.Equal(S.RtoInTransit, r.Category);
        Assert.Equal(1, r.IgnoredOlderScans);
    }

    [Theory]
    [InlineData(S.Delivered)]
    [InlineData(S.RtoDelivered)]
    [InlineData(S.Cancelled)]
    public void A_final_shipment_is_never_changed_by_later_scans(string finalCategory)
    {
        var r = DelhiveryStatusMapper.Resolve(finalCategory, T(10), new[]
        {
            new DelhiveryScan("UD", "Dispatched", ScanTime: T(11)), new DelhiveryScan("RT", "In Transit", ScanTime: T(12)), new DelhiveryScan("CN", "Canceled", ScanTime: T(13))
        });

        Assert.Equal(finalCategory, r.Category);
        Assert.True(r.IsFinal);
        Assert.False(r.ChangedCategory);
    }

    [Fact]
    public void A_cancel_scan_ends_the_shipment()
    {
        var r = DelhiveryStatusMapper.Resolve(S.Created, T(8), new[] { new DelhiveryScan("CN", "Canceled", ScanTime: T(9)) });

        Assert.Equal(S.Cancelled, r.Category);
        Assert.True(r.IsFinal);
    }

    [Fact]
    public void An_unrecognised_scan_is_counted_but_changes_nothing()
    {
        var r = DelhiveryStatusMapper.Resolve(S.InTransit, T(10), new[] { new DelhiveryScan("ZZ", "Mystery", ScanCode: "EOD-6", ScanTime: T(11)) });

        Assert.Equal(S.InTransit, r.Category);
        Assert.Equal(1, r.UnrecognisedScans);
        Assert.False(r.ChangedCategory);
        Assert.Null(r.LastApplied);
    }

    [Fact]
    public void Scans_without_a_time_are_treated_as_oldest_and_keep_their_arrival_order()
    {
        var r = DelhiveryStatusMapper.Resolve(null, null, new[] { new DelhiveryScan("UD", "In Transit"), new DelhiveryScan("UD", "Dispatched") });
        Assert.Equal(S.OutForDelivery, r.Category);
        Assert.Null(r.LastEventTime);

        // the untimed scan is applied first; the later (timed) Manifested scan would move a forward status backwards, so it is ignored
        var timed = DelhiveryStatusMapper.Resolve(null, null, new[] { new DelhiveryScan("UD", "Dispatched"), new DelhiveryScan("UD", "Manifested", ScanTime: T(1)) });
        Assert.Equal(S.OutForDelivery, timed.Category);
        Assert.Equal(1, timed.IgnoredOlderScans);
    }

    [Fact]
    public void Resolving_the_same_scans_twice_is_idempotent()
    {
        var scans = new[] { new DelhiveryScan("UD", "Manifested", ScanTime: T(1)), new DelhiveryScan("UD", "In Transit", ScanTime: T(2)) };

        var first = DelhiveryStatusMapper.Resolve(null, null, scans);
        var second = DelhiveryStatusMapper.Resolve(first.Category, first.LastEventTime, scans);

        Assert.Equal(first.Category, second.Category);
        Assert.False(second.ChangedCategory);
        Assert.Equal(1, second.IgnoredOlderScans);       // the first scan is older than what is already known; the second equals it and changes nothing
    }

    [Fact]
    public void An_empty_batch_leaves_the_shipment_unchanged()
    {
        var r = DelhiveryStatusMapper.Resolve(S.InTransit, T(5), []);
        Assert.Equal(S.InTransit, r.Category);
        Assert.Equal(T(5), r.LastEventTime);
        Assert.False(r.ChangedCategory);
    }
}
