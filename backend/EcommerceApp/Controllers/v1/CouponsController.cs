using EcommerceApp.Application.DTOs.Coupons;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class CouponsController : BaseController
{
    private readonly ICouponService _couponService;

    public CouponsController(ICouponService couponService)
    {
        _couponService = couponService;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll() =>
        ApiResult(await _couponService.GetAllAsync());

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetById(Guid id) =>
        ApiResult(await _couponService.GetByIdAsync(id));

    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateCouponRequest req) =>
        ApiResult(await _couponService.ValidateAsync(req.Code, req.OrderAmount));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateCouponDto dto) =>
        ApiResult(await _couponService.CreateAsync(dto));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCouponDto dto) =>
        ApiResult(await _couponService.UpdateAsync(id, dto));

    /// <summary>The Active switch in the admin coupon list.</summary>
    [HttpPatch("{id:guid}/toggle-status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ToggleStatus(Guid id) =>
        ApiResult(await _couponService.ToggleStatusAsync(id));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id) =>
        ApiResult(await _couponService.DeleteAsync(id));

    public record ValidateCouponRequest(string Code, decimal OrderAmount);
}
