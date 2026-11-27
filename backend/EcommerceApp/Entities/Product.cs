using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? Manufacturer { get; set; }
    public string? Brand { get; set; }
    public string? Unit { get; set; }
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal TaxPercentage { get; set; } = 0;
    public string Currency { get; set; } = "INR";
    public int StockQuantity { get; set; } = 0;
    public int LowStockThreshold { get; set; } = 10;
    public string? Description { get; set; }
    public string? Composition { get; set; }
    public string? DosageForm { get; set; }
    public string? Packaging { get; set; }
    public string? Benefits { get; set; }
    public string? StorageInstructions { get; set; }
    public string? SideEffects { get; set; }
    public string? Ingredients { get; set; }
    public string? HowToUse { get; set; }
    public string? DosageInstructions { get; set; }
    public string? SafetyInformation { get; set; }
    public string? Certifications { get; set; }
    public bool PrescriptionRequired { get; set; } = false;
    public bool IsFeatured { get; set; } = false;
    public bool IsNewArrival { get; set; } = false;
    public bool IsBestSeller { get; set; } = false;
    public bool IsSpecialOffer { get; set; } = false;
    public int ViewCount { get; set; } = 0;
    public int SoldCount { get; set; } = 0;
    public double AverageRating { get; set; } = 0;
    public int ReviewCount { get; set; } = 0;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }

    public Category Category { get; set; } = null!;
    public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<ProductView> ProductViews { get; set; } = new List<ProductView>();
}
