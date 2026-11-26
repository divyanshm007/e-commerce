using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Coupons;

namespace EcommerceApp.Application.Interfaces;

public interface ICouponService
{
    Task<ApiResponse<List<CouponDto>>> GetAllAsync();
    Task<ApiResponse<CouponDto>> GetByIdAsync(Guid id);
    Task<ApiResponse<CouponDto>> CreateAsync(CreateCouponDto dto);
    Task<ApiResponse<CouponDto>> UpdateAsync(Guid id, UpdateCouponDto dto);
    Task<ApiResponse<string>> DeleteAsync(Guid id);

    /// <summary>Switches a coupon on or off (an inactive coupon is refused at checkout). Returns the new state.</summary>
    Task<ApiResponse<bool>> ToggleStatusAsync(Guid id);
    Task<ApiResponse<CouponValidationDto>> ValidateAsync(string code, decimal orderAmount);
}
