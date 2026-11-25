using EcommerceApp.Application.Common;

namespace EcommerceApp.Application.Interfaces;

public class CancelRequestRowDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool WasDispatched { get; set; }
    public string OrderStatus { get; set; } = string.Empty;
    public string? Awb { get; set; }
    public string? AdminNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CancelRequestStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReviewCancelRequestDto
{
    public string? Notes { get; set; }
}

/// <summary>An order that has already been dispatched is cancelled only after an administrator approves the customer's request.</summary>
public interface ICancellationService
{
    /// <summary>
    /// For a customer who wants to cancel their own order: when the order is already shipped or handed to the courier, records a
    /// request, e-mails the customer and the admin and returns that answer. Returns null when the order is not dispatched
    /// (the ordinary direct-cancel flow then applies) or does not belong to the caller.
    /// </summary>
    Task<ApiResponse<string>?> RequestIfDispatchedAsync(Guid orderId, string? reason, Guid callerId);

    /// <summary>The caller's latest cancellation request for that order, or null.</summary>
    Task<ApiResponse<CancelRequestStatusDto?>> GetMineAsync(Guid orderId, Guid callerId);

    Task<ApiResponse<PagedResult<CancelRequestRowDto>>> ListAsync(string? status, int page, int pageSize);
    Task<ApiResponse<string>> ApproveAsync(Guid requestId, string? notes, AuditContext audit);
    Task<ApiResponse<string>> RejectAsync(Guid requestId, string? notes, AuditContext audit);
}
