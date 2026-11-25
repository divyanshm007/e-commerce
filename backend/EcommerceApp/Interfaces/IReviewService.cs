using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Reviews;

namespace EcommerceApp.Application.Interfaces;

public interface IReviewService
{
    Task<ApiResponse<PagedResult<ReviewDto>>> GetAllAsync(PaginationParams paging);
    Task<ApiResponse<List<ReviewDto>>> GetByProductAsync(Guid productId);
    Task<ApiResponse<ReviewDto>> CreateAsync(Guid userId, CreateReviewDto dto);
    Task<ApiResponse<string>> ApproveAsync(Guid id);
    Task<ApiResponse<string>> RejectAsync(Guid id);
    Task<ApiResponse<string>> DeleteAsync(Guid id);
}
