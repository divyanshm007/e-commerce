using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public enum CancelRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

/// <summary>
/// A customer's request to cancel an order that has already been dispatched (shipped, or handed to the courier).
/// Such an order is cancelled only after an administrator approves the request.
/// </summary>
public class CancelRequest : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid? UserId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public CancelRequestStatus Status { get; set; } = CancelRequestStatus.Pending;
    /// <summary>True when the order was already shipped / handed to the courier when the request was made.</summary>
    public bool WasDispatched { get; set; }
    public string? AdminNotes { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public Order Order { get; set; } = null!;
}
