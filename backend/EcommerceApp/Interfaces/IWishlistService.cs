using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Products;

namespace EcommerceApp.Application.Interfaces;

public interface IWishlistService
{
    Task<ApiResponse<List<ProductListDto>>> GetWishlistAsync(Guid userId);
    Task<ApiResponse<string>> AddAsync(Guid userId, Guid productId);
    Task<ApiResponse<string>> RemoveAsync(Guid userId, Guid productId);
    Task<ApiResponse<bool>> IsInWishlistAsync(Guid userId, Guid productId);
}
