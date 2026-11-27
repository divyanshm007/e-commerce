using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Coupons;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class CouponService : ICouponService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public CouponService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<ApiResponse<List<CouponDto>>> GetAllAsync()
    {
        var coupons = await _db.Coupons.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return ApiResponse<List<CouponDto>>.Ok(_mapper.Map<List<CouponDto>>(coupons));
    }

    public async Task<ApiResponse<CouponDto>> GetByIdAsync(Guid id)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon == null) return ApiResponse<CouponDto>.NotFound("Coupon not found.");
        return ApiResponse<CouponDto>.Ok(_mapper.Map<CouponDto>(coupon));
    }

    public async Task<ApiResponse<CouponDto>> CreateAsync(CreateCouponDto dto)
    {
        var code = dto.Code.ToUpper().Trim();
        if (await _db.Coupons.AnyAsync(c => c.Code == code))
            return ApiResponse<CouponDto>.Fail("Coupon code already exists.");

        var coupon = _mapper.Map<Coupon>(dto);
        coupon.Code = code;
        await _db.Coupons.AddAsync(coupon);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(coupon.Id);
    }

    public async Task<ApiResponse<CouponDto>> UpdateAsync(Guid id, UpdateCouponDto dto)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon == null) return ApiResponse<CouponDto>.NotFound("Coupon not found.");

        _mapper.Map(dto, coupon);
        coupon.Code = dto.Code.ToUpper().Trim();
        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<ApiResponse<bool>> ToggleStatusAsync(Guid id)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon == null) return ApiResponse<bool>.NotFound("Coupon not found.");
        coupon.IsActive = !coupon.IsActive;
        coupon.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(coupon.IsActive, coupon.IsActive ? "Coupon is now active." : "Coupon is now inactive.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(Guid id)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon == null) return ApiResponse<string>.NotFound("Coupon not found.");
        _db.Coupons.Remove(coupon);
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Coupon deleted.");
    }

    public async Task<ApiResponse<CouponValidationDto>> ValidateAsync(string code, decimal orderAmount)
    {
        var coupon = await _db.Coupons.FirstOrDefaultAsync(c =>
            c.Code == code.ToUpper() && c.IsActive &&
            (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow) &&
            (c.StartDate == null || c.StartDate <= DateTime.UtcNow));

        if (coupon == null)
            return ApiResponse<CouponValidationDto>.Ok(new CouponValidationDto
            { IsValid = false, Message = "Invalid or expired coupon code." });

        if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
            return ApiResponse<CouponValidationDto>.Ok(new CouponValidationDto
            { IsValid = false, Message = "Coupon usage limit reached." });

        if (coupon.MinOrderAmount.HasValue && orderAmount < coupon.MinOrderAmount)
            return ApiResponse<CouponValidationDto>.Ok(new CouponValidationDto
            { IsValid = false, Message = $"Minimum order amount of ₹{coupon.MinOrderAmount:0.##} is required to use this coupon." });

        var discountAmount = coupon.DiscountType == DiscountType.Percentage
            ? Math.Min(orderAmount * coupon.DiscountValue / 100, coupon.MaxDiscountAmount ?? decimal.MaxValue)
            : Math.Min(coupon.DiscountValue, orderAmount);

        return ApiResponse<CouponValidationDto>.Ok(new CouponValidationDto
        {
            IsValid = true,
            Message = "Coupon applied successfully.",
            CouponId = coupon.Id,
            Code = coupon.Code,
            DiscountType = coupon.DiscountType,
            DiscountValue = coupon.DiscountValue,
            DiscountAmount = Math.Round(discountAmount, 2)
        });
    }
}
