using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Categories;
using EcommerceApp.Application.DTOs.Products;

namespace EcommerceApp.Application.Interfaces;

public interface ICategoryService
{
    Task<ApiResponse<List<CategoryDto>>> GetAllAsync();
    Task<ApiResponse<List<CategoryDto>>> GetRootCategoriesAsync();
    Task<ApiResponse<CategoryDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<CategoryDto>> GetBySlugAsync(string slug);
    Task<ApiResponse<PagedResult<ProductListDto>>> GetCategoryProductsAsync(Guid id, ProductFilterParams filter);
    Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryDto dto);
    Task<ApiResponse<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryDto dto);
    Task<ApiResponse<string>> DeleteAsync(Guid id);
    Task<ApiResponse<string>> ToggleStatusAsync(Guid id);
}
