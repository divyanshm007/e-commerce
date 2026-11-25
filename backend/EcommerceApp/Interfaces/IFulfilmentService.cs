using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;

namespace EcommerceApp.Application.Interfaces;

/// <summary>Admin approval and the queues of the automated fulfilment workflow, plus the shipment view of an order.</summary>
public interface IFulfilmentService
{
    Task<ApiResponse<FulfilmentDashboardDto>> GetDashboardAsync();

    /// <summary>kind: awaiting-approval, awaiting-shipment, creation-failures, in-transit, delivered, exceptions.</summary>
    Task<ApiResponse<PagedResult<FulfilmentRowDto>>> ListAsync(string kind, int page, int pageSize);

    Task<ApiResponse<string>> ApproveAsync(Guid orderId, AuditContext audit);
    Task<ApiResponse<string>> RejectAsync(Guid orderId, string? reason, AuditContext audit);

    /// <summary>Puts an order from the exception queue back into automatic processing (creation is retried with a new reference).</summary>
    Task<ApiResponse<string>> RetryAsync(Guid orderId, AuditContext audit);

    /// <summary>Marks an exception as reviewed so automatic processing continues (tracking-type exceptions).</summary>
    Task<ApiResponse<string>> ResolveAsync(Guid orderId, string? note, AuditContext audit);

    /// <summary>Owner or admin only; anyone else gets NotFound.</summary>
    Task<ApiResponse<OrderShipmentDto>> GetOrderShipmentAsync(Guid orderId, Guid? callerId, bool callerIsAdmin);
}

/// <summary>Wakes the background worker early (e.g. right after an approval).</summary>
public interface IFulfilmentSignal
{
    void Poke();
}
