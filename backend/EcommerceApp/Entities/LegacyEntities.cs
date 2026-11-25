using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

// Entities that exist in the original Sidham production system and are needed after the migration.

/// <summary>Indian state/UT list used for address and shipping selection.</summary>
public class State : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CountryCode { get; set; } = "IN";
}

/// <summary>Short promotional message shown on the storefront.</summary>
public class PromoOffer : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
}

/// <summary>A payment method the admin can enable/disable at checkout (separate from the PaymentMethod enum).</summary>
public class PaymentOption : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
}

/// <summary>One courier/status event for a single order item (Delhivery timeline).</summary>
public class OrderItemTracking : BaseEntity
{
    public Guid OrderItemId { get; set; }
    public string StatusKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime EventTime { get; set; } = DateTime.UtcNow;
    public string? Location { get; set; }
    public string? CourierName { get; set; }
    public string? AwbNumber { get; set; }
    public string? Source { get; set; }
    public string? Meta { get; set; }
}

/// <summary>A courier pickup request (Delhivery) that can cover several shipments.</summary>
public class OrderPickup : BaseEntity
{
    public string PickupId { get; set; } = string.Empty;
    public string? PickupLocationName { get; set; }
    public string? ClientName { get; set; }
    public string? IncomingCenterName { get; set; }
    public DateOnly? PickupDate { get; set; }
    public TimeOnly? PickupTime { get; set; }
    public int ExpectedPackageCount { get; set; }
    public string? RequestPayload { get; set; }
    public string? ResponsePayload { get; set; }
}

/// <summary>Limits a coupon to specific products (coupon scope = product).</summary>
public class CouponProduct : BaseEntity
{
    public Guid CouponId { get; set; }
    public Guid ProductId { get; set; }
}

/// <summary>Limits a coupon to specific categories (coupon scope = category).</summary>
public class CouponCategory : BaseEntity
{
    public Guid CouponId { get; set; }
    public Guid CategoryId { get; set; }
}
