using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Cart;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class CartService : ICartService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public CartService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    private async Task<Cart?> FindCartAsync(Guid? userId, string? sessionId)
    {
        if (userId.HasValue)
            return await _db.Carts
                .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Images)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Status == CartStatus.Active);

        if (!string.IsNullOrEmpty(sessionId))
            return await _db.Carts
                .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Images)
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.UserId == null && c.Status == CartStatus.Active);

        return null;
    }

    public async Task<ApiResponse<CartDto>> GetCartAsync(Guid? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null)
            return ApiResponse<CartDto>.Ok(new CartDto { SessionId = sessionId });

        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> AddItemAsync(Guid? userId, string? sessionId, AddCartItemDto dto)
    {
        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId && p.IsActive);

        if (product == null) return ApiResponse<CartDto>.NotFound("Product not found.");
        if (product.StockQuantity < dto.Quantity)
            return ApiResponse<CartDto>.Fail("Insufficient stock.");

        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null)
        {
            // a signed-in user's cart is identified by user id only, so it is never reachable through a browser session id
            cart = new Cart { UserId = userId, SessionId = userId.HasValue ? null : sessionId, Status = CartStatus.Active };
            _db.Carts.Add(cart);
        }

        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);

        if (existingItem != null)
            existingItem.Quantity += dto.Quantity;
        else
            await _db.CartItems.AddAsync(new CartItem
            {
                CartId = cart.Id,
                ProductId = dto.ProductId,
                VariantId = dto.VariantId,
                Quantity = dto.Quantity
            });

        await _db.SaveChangesAsync();
        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> UpdateItemAsync(Guid? userId, string? sessionId, Guid cartItemId, int quantity)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return ApiResponse<CartDto>.NotFound("Cart not found.");

        var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);
        if (item == null) return ApiResponse<CartDto>.NotFound("Cart item not found.");

        if (quantity <= 0)
        {
            cart.Items.Remove(item);
            _db.CartItems.Remove(item);
        }
        else
        {
            item.Quantity = quantity;
        }

        await _db.SaveChangesAsync();
        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> RemoveItemAsync(Guid? userId, string? sessionId, Guid cartItemId)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return ApiResponse<CartDto>.NotFound("Cart not found.");

        var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);
        if (item == null) return ApiResponse<CartDto>.NotFound("Cart item not found.");

        _db.CartItems.Remove(item);
        await _db.SaveChangesAsync();
        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> ClearCartAsync(Guid? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return ApiResponse<CartDto>.Ok(new CartDto());

        _db.CartItems.RemoveRange(cart.Items);
        await _db.SaveChangesAsync();
        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> ApplyCouponAsync(Guid? userId, string? sessionId, string couponCode)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return ApiResponse<CartDto>.NotFound("Cart not found.");

        var coupon = await _db.Coupons.FirstOrDefaultAsync(c =>
            c.Code == couponCode.ToUpper() && c.IsActive &&
            (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow) &&
            (c.StartDate == null || c.StartDate <= DateTime.UtcNow));

        if (coupon == null) return ApiResponse<CartDto>.Fail("Invalid or expired coupon code.");

        // below the coupon's minimum: tell the customer instead of "applying" a coupon that gives nothing
        if (coupon.MinOrderAmount.HasValue)
        {
            var current = await BuildCartDtoAsync(cart);
            if (current.SubTotal < coupon.MinOrderAmount.Value)
                return ApiResponse<CartDto>.Fail($"Minimum order amount of ₹{coupon.MinOrderAmount.Value:0.##} is required to use this coupon.");
        }

        cart.AppliedCouponCode = couponCode.ToUpper();
        await _db.SaveChangesAsync();
        return ApiResponse<CartDto>.Ok(await BuildCartDtoAsync(cart));
    }

    public async Task<ApiResponse<CartDto>> RemoveCouponAsync(Guid? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return ApiResponse<CartDto>.NotFound("Cart not found.");
        cart.AppliedCouponCode = null;
        await _db.SaveChangesAsync();
        var dto = await BuildCartDtoAsync(cart);
        return ApiResponse<CartDto>.Ok(dto);
    }

    /// <summary>
    /// Removes only the purchased quantities from the buyer's own cart (by user id, or guest session id).
    /// Anything the buyer added that was not purchased stays. An emptied cart is closed as Converted.
    /// </summary>
    public async Task RemovePurchasedItemsAsync(Guid? userId, string? sessionId, IEnumerable<PurchasedItem> purchased, Guid orderId)
    {
        var cart = await FindCartAsync(userId, sessionId);
        if (cart == null) return;

        foreach (var p in purchased)
        {
            var item = cart.Items.FirstOrDefault(i => i.ProductId == p.ProductId && i.VariantId == p.VariantId);
            if (item == null) continue;

            if (item.Quantity > p.Quantity)
            {
                item.Quantity -= p.Quantity;
            }
            else
            {
                cart.Items.Remove(item);
                _db.CartItems.Remove(item);
            }
        }

        if (!cart.Items.Any())
        {
            cart.Status = CartStatus.Converted;
            cart.ConvertedAt = DateTime.UtcNow;
            cart.ConvertedOrderId = orderId;
            cart.AppliedCouponCode = null;
        }

        await _db.SaveChangesAsync();
    }

    public async Task MergeGuestCartAsync(string sessionId, Guid userId)
    {
        var guestCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.SessionId == sessionId && c.UserId == null && c.Status == CartStatus.Active);

        if (guestCart == null) return;

        var userCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Status == CartStatus.Active);

        if (userCart == null)
        {
            guestCart.UserId = userId;
            guestCart.SessionId = null;
        }
        else
        {
            foreach (var guestItem in guestCart.Items)
            {
                var existing = userCart.Items.FirstOrDefault(i =>
                    i.ProductId == guestItem.ProductId && i.VariantId == guestItem.VariantId);

                if (existing != null) existing.Quantity += guestItem.Quantity;
                else await _db.CartItems.AddAsync(new CartItem
                {
                    CartId = userCart.Id,
                    ProductId = guestItem.ProductId,
                    VariantId = guestItem.VariantId,
                    Quantity = guestItem.Quantity
                });
            }
            guestCart.Status = CartStatus.Converted;
        }

        await _db.SaveChangesAsync();
    }

    public async Task<ApiResponse<List<CartSummaryDto>>> GetAllCartsAsync()
    {
        var carts = await _db.Carts
            .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Images)
            .Include(c => c.User)
            .Where(c => c.Status == CartStatus.Active && c.Items.Any()
                && (c.UserId == null || c.User!.Role != UserRole.SuperAdmin))
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var dtos = carts.Select(c => new CartSummaryDto
        {
            Id = c.Id,
            UserId = c.UserId,
            CustomerEmail = c.User?.Email ?? c.GuestEmail,
            CustomerName = c.User != null ? $"{c.User.FirstName} {c.User.LastName}".Trim() : c.GuestName,
            SessionId = c.SessionId,
            IsGuest = c.UserId == null,
            Status = "Active",
            GuestName  = c.GuestName,
            GuestEmail = c.GuestEmail,
            GuestPhone = c.GuestPhone,
            ItemCount = c.Items.Sum(i => i.Quantity),
            TotalAmount = c.Items.Sum(i => (i.Product.DiscountPrice ?? i.Product.Price) * i.Quantity),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            Items = _mapper.Map<List<CartItemDto>>(c.Items)
        }).ToList();

        return ApiResponse<List<CartSummaryDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<string>> SaveGuestInfoAsync(string sessionId, string? name, string? email, string? phone)
    {
        var cart = await _db.Carts.FirstOrDefaultAsync(c => c.SessionId == sessionId && c.Status == CartStatus.Active);
        if (cart == null) return ApiResponse<string>.NotFound("Cart not found.");
        cart.GuestName  = name;
        cart.GuestEmail = email;
        cart.GuestPhone = phone;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Saved");
    }

    public async Task<ApiResponse<List<CartSummaryDto>>> GetAbandonedCartsAsync()
    {
        var carts = await _db.Carts
            .Include(c => c.Items)
            .Include(c => c.User)
            .Where(c => c.Status == CartStatus.Abandoned)
            .OrderByDescending(c => c.AbandonedAt)
            .ToListAsync();

        var dtos = carts.Select(c => new CartSummaryDto
        {
            Id = c.Id,
            UserId = c.UserId,
            CustomerEmail = c.User?.Email,
            CustomerName = c.User != null ? $"{c.User.FirstName} {c.User.LastName}" : null,
            SessionId = c.SessionId,
            ItemCount = c.Items.Count,
            CreatedAt = c.CreatedAt,
            AbandonedAt = c.AbandonedAt,
            IsGuest = c.UserId == null
        }).ToList();

        return ApiResponse<List<CartSummaryDto>>.Ok(dtos);
    }

    public async Task MarkAbandonedCartsAsync()
    {
        var threshold = DateTime.UtcNow.AddHours(-24);
        var staleCarts = await _db.Carts
            .Where(c => c.Status == CartStatus.Active && c.UpdatedAt < threshold)
            .ToListAsync();

        foreach (var cart in staleCarts)
        {
            cart.Status = CartStatus.Abandoned;
            cart.AbandonedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private async Task<CartDto> BuildCartDtoAsync(Cart cart)
    {
        // Reload to get fresh product data
        var freshCart = await _db.Carts
            .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.Images)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cart.Id) ?? cart;

        var itemDtos = _mapper.Map<List<CartItemDto>>(freshCart.Items);

        foreach (var item in itemDtos)
        {
            var effectivePrice = item.DiscountPrice > 0 ? item.DiscountPrice : item.UnitPrice;
            var taxAmount = effectivePrice * item.TaxPercentage / 100;
            item.LineTotal = (effectivePrice + taxAmount) * item.Quantity;
            item.OriginalLineTotal = item.LineTotal;
        }

        var shippingConfig = await _db.ShippingConfigs.FirstOrDefaultAsync();
        var subTotal = itemDtos.Sum(i => (i.DiscountPrice > 0 ? i.DiscountPrice : i.UnitPrice) * i.Quantity);
        var taxTotal = itemDtos.Sum(i => (i.DiscountPrice > 0 ? i.DiscountPrice : i.UnitPrice) * i.TaxPercentage / 100 * i.Quantity);
        var shipping = shippingConfig != null && shippingConfig.FreeShippingEnabled && subTotal >= shippingConfig.FreeShippingAbove
            ? 0 : (shippingConfig?.ShippingCharge ?? 0);

        // Calculate coupon discount
        decimal discountAmount = 0;
        int? couponDiscountType = null;
        decimal? couponDiscountValue = null;
        string? appliedCouponCode = freshCart.AppliedCouponCode;

        if (!string.IsNullOrEmpty(appliedCouponCode))
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c =>
                c.Code == appliedCouponCode && c.IsActive &&
                (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow));

            if (coupon != null && (coupon.MinOrderAmount == null || subTotal >= coupon.MinOrderAmount))
            {
                couponDiscountType = (int)coupon.DiscountType;
                couponDiscountValue = coupon.DiscountValue;

                discountAmount = coupon.DiscountType == EcommerceApp.Domain.Enums.DiscountType.Percentage
                    ? Math.Min(subTotal * coupon.DiscountValue / 100, coupon.MaxDiscountAmount ?? decimal.MaxValue)
                    : Math.Min(coupon.DiscountValue, subTotal);
                discountAmount = Math.Round(discountAmount, 2);

                // Distribute discount proportionally across items, ensuring exact sum
                if (discountAmount > 0 && itemDtos.Count > 0)
                {
                    var grandLineTotal = itemDtos.Sum(i => i.OriginalLineTotal);
                    var distributed = 0m;

                    for (int i = 0; i < itemDtos.Count; i++)
                    {
                        var item = itemDtos[i];
                        decimal itemShare;
                        if (i == itemDtos.Count - 1)
                            itemShare = discountAmount - distributed; // last item absorbs rounding remainder
                        else
                            itemShare = Math.Round(discountAmount * (item.OriginalLineTotal / grandLineTotal), 2);

                        item.ItemDiscountAmount = itemShare;
                        item.LineTotal = Math.Max(0, Math.Round(item.OriginalLineTotal - itemShare, 2));
                        distributed += itemShare;
                    }
                }
            }
            else
            {
                appliedCouponCode = null;
            }
        }

        return new CartDto
        {
            Id = freshCart.Id,
            UserId = freshCart.UserId,
            SessionId = freshCart.SessionId,
            Items = itemDtos,
            SubTotal = Math.Round(subTotal, 2),
            TaxAmount = Math.Round(taxTotal, 2),
            ShippingCharge = Math.Round(shipping, 2),
            DiscountAmount = discountAmount,
            TotalAmount = Math.Round(subTotal + taxTotal + shipping - discountAmount, 2),
            AppliedCouponCode = appliedCouponCode,
            CouponDiscountType = couponDiscountType,
            CouponDiscountValue = couponDiscountValue,
            ItemCount = itemDtos.Sum(i => i.Quantity)
        };
    }
}
