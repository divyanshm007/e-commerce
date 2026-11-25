namespace EcommerceApp.Application.DTOs.Cart;

public class CartDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? SessionId { get; set; }
    public List<CartItemDto> Items { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippingCharge { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? AppliedCouponCode { get; set; }
    public int? CouponDiscountType { get; set; }   // 1=Percentage, 2=Fixed
    public decimal? CouponDiscountValue { get; set; }
    public int ItemCount { get; set; }
}

public class CartItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSlug { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public Guid? VariantId { get; set; }
    public string? VariantInfo { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPrice { get; set; }
    public decimal TaxPercentage { get; set; }
    public decimal LineTotal { get; set; }
    public decimal OriginalLineTotal { get; set; }
    public decimal ItemDiscountAmount { get; set; }
    public int StockQuantity { get; set; }
    public bool InStock { get; set; }
}

public class AddCartItemDto
{
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class CartSummaryDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public string? SessionId { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? AbandonedAt { get; set; }
    public bool IsGuest { get; set; }
    public string Status { get; set; } = "Active";
    public string? GuestName  { get; set; }
    public string? GuestEmail { get; set; }
    public string? GuestPhone { get; set; }
    public List<CartItemDto> Items { get; set; } = [];
}
