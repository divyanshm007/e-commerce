using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Coupon : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    /// <summary>global, product or category (see CouponProducts / CouponCategories).</summary>
    public string Scope { get; set; } = "global";
    public string? Description { get; set; }
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public decimal DiscountValue { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; } = 0;
    public int? PerUserLimit { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? StartDate { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
