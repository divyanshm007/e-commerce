using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Products;

namespace EcommerceApp.Application.Interfaces;

public interface IProductService
{
    Task<ApiResponse<PagedResult<ProductListDto>>> GetAllAsync(ProductFilterParams filter);
    Task<ApiResponse<ProductDetailDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<ProductDetailDto>> GetBySlugAsync(string slug);
    Task<ApiResponse<ProductDetailDto>> CreateAsync(CreateProductDto dto);
    Task<ApiResponse<ProductDetailDto>> UpdateAsync(Guid id, UpdateProductDto dto);
    Task<ApiResponse<string>> DeleteAsync(Guid id);
    Task<ApiResponse<string>> ToggleStatusAsync(Guid id);
    Task<ApiResponse<string>> UpdateStockAsync(Guid id, int quantity);
    Task<ApiResponse<List<ProductListDto>>> GetFeaturedAsync();
    Task<ApiResponse<List<ProductListDto>>> GetNewArrivalsAsync();
    Task<ApiResponse<List<ProductListDto>>> GetBestSellersAsync();
    Task<ApiResponse<List<ProductListDto>>> GetSpecialOffersAsync();
    Task<ApiResponse<List<ProductListDto>>> GetRelatedAsync(Guid productId);
    Task<ApiResponse<List<ProductListDto>>> GetLowStockAsync();
    Task RecordViewAsync(Guid productId, Guid? userId, string? sessionId, string? ipAddress);
}
