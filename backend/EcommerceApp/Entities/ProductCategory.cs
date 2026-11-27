namespace EcommerceApp.Domain.Entities;

/// <summary>A product can sit in several categories: one row per (product, category). Product.CategoryId stays the main one.</summary>
public class ProductCategory
{
    public Guid ProductId { get; set; }
    public Guid CategoryId { get; set; }

    public Product Product { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
