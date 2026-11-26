using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Orders;

namespace EcommerceApp.Application.Interfaces;

public interface IOrderService
{
    Task<ApiResponse<PagedResult<OrderListDto>>> GetAllAsync(PaginationParams paging);

    /// <summary>Totals for the Reports page. Dates are calendar days in India time, both ends included; either may be omitted.</summary>
    Task<ApiResponse<OrderReportDto>> GetReportAsync(DateOnly? from, DateOnly? to);
    Task<ApiResponse<OrderDetailDto>> GetByIdAsync(Guid id);
    /// <summary>The order only if the caller owns it or is SuperAdmin; otherwise the same "not found" answer as a missing order.</summary>
    Task<ApiResponse<OrderDetailDto>> GetByIdForCallerAsync(Guid id, Guid? callerId, bool callerIsAdmin);
    Task<ApiResponse<OrderDetailDto>> GetByOrderNumberAsync(string orderNumber);
    Task<ApiResponse<OrderDetailDto>> GetByOrderNumberForCallerAsync(string orderNumber, Guid? callerId, bool callerIsAdmin);
    /// <summary>Guest lookup: order number + checkout e-mail or phone. Minimal DTO, generic failure.</summary>
    Task<ApiResponse<OrderTrackingDto>> TrackGuestOrderAsync(string orderNumber, string contact);
    Task<ApiResponse<List<OrderListDto>>> GetByUserAsync(Guid userId);
    Task<ApiResponse<OrderDetailDto>> CreateAsync(CreateOrderDto dto);
    Task SendOrderConfirmationAsync(EcommerceApp.Domain.Entities.Order order, OrderDetailDto detail);
    Task<ApiResponse<string>> UpdateStatusAsync(Guid id, UpdateOrderStatusDto dto);
    Task<ApiResponse<string>> CancelAsync(Guid id, string? reason, Guid? callerId, bool callerIsAdmin);

    /// <summary>
    /// The customer closed or failed the online payment: the unpaid online order is cancelled (stock restored) and its payment marked
    /// Failed, so no half-finished order is left behind. A paid order is never touched. Guest orders have no owner to check.
    /// </summary>
    Task<ApiResponse<string>> CancelUnpaidOnlineOrderAsync(Guid orderId, Guid? callerId, bool anyOwner = false, string? reason = null);

    /// <summary>Safety net for a closed browser: cancels unpaid online orders older than the given age. Returns how many were cancelled.</summary>
    Task<int> CancelAbandonedOnlineOrdersAsync(TimeSpan olderThan);
    Task<ApiResponse<byte[]>> GenerateInvoiceAsync(Guid id, Guid? callerId, bool callerIsAdmin);
    Task<ApiResponse<DashboardOrderStatsDto>> GetStatsAsync();
}
