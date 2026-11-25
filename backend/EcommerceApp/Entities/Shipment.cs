using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

/// <summary>
/// One courier shipment of an order (Delhivery). Nothing creates these rows yet – this phase only provides the table.
/// See docs/delhivery/06_DELHIVERY_DATABASE_DESIGN.md.
/// </summary>
public class Shipment : BaseEntity
{
    public Guid OrderId { get; set; }

    /// <summary>test or live: which Delhivery environment the shipment belongs to.</summary>
    public string Mode { get; set; } = ShipmentConstants.Test;
    public string CourierName { get; set; } = "Delhivery";

    /// <summary>The value sent to Delhivery as its `order` field; unique per environment.</summary>
    public string ClientOrderRef { get; set; } = string.Empty;

    /// <summary>IN_FLIGHT, CREATED, FAILED or UNKNOWN (see <see cref="ShipmentConstants.CreationStates"/>).</summary>
    public string CreationState { get; set; } = ShipmentConstants.CreationStates.InFlight;
    public int CreateAttempts { get; set; }

    public string? Awb { get; set; }

    /// <summary>Identifiers only (never the full Delhivery response).</summary>
    public string? CreateResponseRef { get; set; }

    /// <summary>Customer-facing category (see <see cref="ShipmentConstants.Statuses"/>).</summary>
    public string Status { get; set; } = ShipmentConstants.Statuses.Created;
    public string? DelhiveryStatus { get; set; }
    public string? DelhiveryStatusType { get; set; }

    /// <summary>Only when Delhivery supplies it – never invented.</summary>
    public DateOnly? ExpectedDeliveryDate { get; set; }
    public string? TrackingUrl { get; set; }

    /// <summary>True once the shipment can no longer change; the tracking worker skips final shipments.</summary>
    public bool IsFinal { get; set; }

    public DateTime? LastEventAt { get; set; }
    public DateTime? LastCheckedAt { get; set; }
    public DateTime? NextCheckAt { get; set; }
    public int TrackFailureCount { get; set; }

    /// <summary>Sanitised, short, no secrets or personal data.</summary>
    public string? LastError { get; set; }
    public DateTime? LastErrorAt { get; set; }

    /// <summary>Categories already e-mailed to the customer (duplicate-notification guard).</summary>
    public List<string> NotifiedStatuses { get; set; } = [];

    /// <summary>How many reconciliation lookups an UNKNOWN creation has had.</summary>
    public int ReconcileAttempts { get; set; }
    /// <summary>Consecutive failed attempts to e-mail the customer about this shipment.</summary>
    public int NotifyFailures { get; set; }
    public DateTime? NextNotifyAt { get; set; }

    public Guid? CreatedByUserId { get; set; }

    public Order Order { get; set; } = null!;
    public User? CreatedByUser { get; set; }
    public ICollection<ShipmentTrackingEvent> TrackingEvents { get; set; } = new List<ShipmentTrackingEvent>();
}

/// <summary>An actual scan received from Delhivery. Nothing is synthesised.</summary>
public class ShipmentTrackingEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShipmentId { get; set; }

    public string? StatusType { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ScanCode { get; set; }
    public string? Location { get; set; }
    public DateTime? ScanTime { get; set; }
    public string? Description { get; set; }

    /// <summary>The customer-facing category computed when the event was stored.</summary>
    public string MappedStatus { get; set; } = ShipmentConstants.Statuses.NeedsReview;

    /// <summary>SHA-256 (hex) of StatusType|Status|ScanCode|ScanTime|Location – makes a repeated scan a no-op.</summary>
    public string EventHash { get; set; } = string.Empty;

    /// <summary>poll or webhook.</summary>
    public string Source { get; set; } = ShipmentConstants.EventSources.Poll;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Shipment Shipment { get; set; } = null!;
}
