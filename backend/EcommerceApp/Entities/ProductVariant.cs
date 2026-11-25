using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public decimal? PriceAdjustment { get; set; }
    public int StockQuantity { get; set; } = 0;
    public string? Sku { get; set; }

    public Product Product { get; set; } = null!;
}
