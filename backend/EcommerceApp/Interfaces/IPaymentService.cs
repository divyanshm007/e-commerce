using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;

namespace EcommerceApp.Application.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<RazorpayOrderDto>> CreateRazorpayOrderAsync(Guid orderId, Guid? callerId, bool callerIsAdmin);
    Task<ApiResponse<string>> VerifyPaymentAsync(VerifyPaymentDto dto, string? sessionId);
    Task<ApiResponse<string>> ProcessWebhookAsync(string payload, string signature);
    Task<ApiResponse<string>> InitiateRefundAsync(Guid orderId, decimal? amount);
    Task<ApiResponse<PagedResult<PaymentListDto>>> GetAllAsync(PaginationParams paging);
    Task<ApiResponse<PaymentDetailDto>> GetByOrderIdAsync(Guid orderId, Guid? callerId, bool callerIsAdmin);
}
