using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ReturnRequest : BaseEntity
{
    public Guid OrderId { get; set; }
    public Guid? UserId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ReturnRequestStatus Status { get; set; } = ReturnRequestStatus.Pending;
    public string? AdminNotes { get; set; }

    public Order Order { get; set; } = null!;
    public User? User { get; set; }
}

public enum ReturnRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Completed = 4
}
