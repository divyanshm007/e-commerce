using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public static class FulfilmentStates
{
    public const string Approved = "APPROVED";     // admin approved; shipment creation is pending
    public const string Creating = "CREATING";     // a worker holds a lease and is creating the shipment
    public const string Shipped = "SHIPPED";       // shipment exists at Delhivery, tracking runs
    public const string Completed = "COMPLETED";   // delivered / final
    public const string Exception = "EXCEPTION";   // needs an administrator
    public const string Rejected = "REJECTED";     // admin declined dispatch
    public static readonly string[] All = [Approved, Creating, Shipped, Completed, Exception, Rejected];
}

/// <summary>
/// The admin decision and automation state of one order's dispatch. One row per order (unique): a second approval is impossible.
/// Everything after approval is driven from this row by the background worker.
/// </summary>
public class OrderFulfilment : BaseEntity
{
    public Guid OrderId { get; set; }
    public string State { get; set; } = FulfilmentStates.Approved;

    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? RejectedByUserId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectReason { get; set; }

    public int Attempts { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    /// <summary>A worker owns the row until this time; after it passes the row is recovered (restart safety).</summary>
    public DateTime? LeaseUntil { get; set; }

    public string? LastError { get; set; }
    /// <summary>Why the order is in the exception queue (short, no secrets).</summary>
    public string? AttentionReason { get; set; }

    public Order Order { get; set; } = null!;
}
