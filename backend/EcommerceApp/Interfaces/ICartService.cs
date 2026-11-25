using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Cart;

namespace EcommerceApp.Application.Interfaces;

/// <summary>One purchased line, used to remove exactly those items from the cart after checkout.</summary>
public record PurchasedItem(Guid ProductId, Guid? VariantId, int Quantity);

public interface ICartService
{
    Task<ApiResponse<CartDto>> GetCartAsync(Guid? userId, string? sessionId);
    Task<ApiResponse<CartDto>> AddItemAsync(Guid? userId, string? sessionId, AddCartItemDto dto);
    Task<ApiResponse<CartDto>> UpdateItemAsync(Guid? userId, string? sessionId, Guid cartItemId, int quantity);
    Task<ApiResponse<CartDto>> RemoveItemAsync(Guid? userId, string? sessionId, Guid cartItemId);
    Task<ApiResponse<CartDto>> ClearCartAsync(Guid? userId, string? sessionId);
    Task<ApiResponse<CartDto>> ApplyCouponAsync(Guid? userId, string? sessionId, string couponCode);
    Task<ApiResponse<CartDto>> RemoveCouponAsync(Guid? userId, string? sessionId);
    Task MergeGuestCartAsync(string sessionId, Guid userId);
    Task RemovePurchasedItemsAsync(Guid? userId, string? sessionId, IEnumerable<PurchasedItem> purchased, Guid orderId);
    Task<ApiResponse<List<CartSummaryDto>>> GetAbandonedCartsAsync();
    Task<ApiResponse<List<CartSummaryDto>>> GetAllCartsAsync();
    Task<ApiResponse<string>> SaveGuestInfoAsync(string sessionId, string? name, string? email, string? phone);
    Task MarkAbandonedCartsAsync();
}
