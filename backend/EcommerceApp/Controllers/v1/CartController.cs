using EcommerceApp.Application.DTOs.Cart;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class CartController : BaseController
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    private string? SessionId =>
        Request.Cookies["session_id"] ??
        Request.Headers["X-Session-Id"].FirstOrDefault();
    private Guid? UserId => IsAuthenticated ? CurrentUserId : null;

    [HttpGet]
    public async Task<IActionResult> GetCart() =>
        ApiResult(await _cartService.GetCartAsync(UserId, SessionId));

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddCartItemDto dto) =>
        ApiResult(await _cartService.AddItemAsync(UserId, SessionId, dto));

    [HttpPut("items/{cartItemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid cartItemId, [FromBody] UpdateQuantityRequest req) =>
        ApiResult(await _cartService.UpdateItemAsync(UserId, SessionId, cartItemId, req.Quantity));

    [HttpDelete("items/{cartItemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid cartItemId) =>
        ApiResult(await _cartService.RemoveItemAsync(UserId, SessionId, cartItemId));

    [HttpDelete]
    public async Task<IActionResult> ClearCart() =>
        ApiResult(await _cartService.ClearCartAsync(UserId, SessionId));

    [HttpPost("coupon")]
    public async Task<IActionResult> ApplyCoupon([FromBody] ApplyCouponRequest req) =>
        ApiResult(await _cartService.ApplyCouponAsync(UserId, SessionId, req.Code));

    [HttpDelete("coupon")]
    public async Task<IActionResult> RemoveCoupon() =>
        ApiResult(await _cartService.RemoveCouponAsync(UserId, SessionId));

    [HttpPatch("guest-info")]
    public async Task<IActionResult> SaveGuestInfo([FromBody] GuestInfoRequest req) =>
        ApiResult(await _cartService.SaveGuestInfoAsync(req.SessionId, req.Name, req.Email, req.Phone));

    [HttpPost("merge")]
    [Authorize]
    public async Task<IActionResult> MergeCart()
    {
        if (SessionId != null)
            await _cartService.MergeGuestCartAsync(SessionId, CurrentUserId);
        return Ok(new { merged = true });
    }

    [HttpGet("abandoned")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAbandonedCarts() =>
        ApiResult(await _cartService.GetAbandonedCartsAsync());

    [HttpGet("all")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAllCarts() =>
        ApiResult(await _cartService.GetAllCartsAsync());

    public record UpdateQuantityRequest(int Quantity);
    public record ApplyCouponRequest(string Code);
    public record GuestInfoRequest(string SessionId, string? Name, string? Email, string? Phone);
}
