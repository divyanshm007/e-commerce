namespace EcommerceApp.Application.DTOs.Products;

public class ProductListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal TaxPercentage { get; set; }
    public string Currency { get; set; } = "INR";
    public int StockQuantity { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsNewArrival { get; set; }
    public bool IsBestSeller { get; set; }
    public bool IsSpecialOffer { get; set; }
    public bool IsActive { get; set; }
    public bool PrescriptionRequired { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductDetailDto : ProductListDto
{
    public Guid? CategoryId { get; set; }
    public string? Manufacturer { get; set; }
    public string? Sku { get; set; }
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
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public List<ProductImageDto> Images { get; set; } = [];
    public List<ProductVariantDto> Variants { get; set; } = [];
    public List<ReviewSummaryDto> Reviews { get; set; } = [];
}

public class ProductImageDto
{
    public Guid Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}

public class ProductVariantDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public decimal? PriceAdjustment { get; set; }
    public int StockQuantity { get; set; }
    public string? Sku { get; set; }
}

public class ReviewSummaryDto
{
    public Guid Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? Manufacturer { get; set; }
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
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public List<CreateProductVariantDto> Variants { get; set; } = [];
}

public class UpdateProductDto : CreateProductDto
{
    public List<Guid> ImageIdsToDelete { get; set; } = [];
}

public class CreateProductVariantDto
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public decimal? PriceAdjustment { get; set; }
    public int StockQuantity { get; set; } = 0;
    public string? Sku { get; set; }
}

public class ProductFilterParams : PaginationParams
{
    public Guid? CategoryId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? IsFeatured { get; set; }
    public bool? IsNewArrival { get; set; }
    public bool? IsBestSeller { get; set; }
    public bool? IsSpecialOffer { get; set; }
    public bool? InStock { get; set; }
    public bool? IsActive { get; set; }
    public bool? PrescriptionRequired { get; set; }
}

public class PaginationParams
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public string SortDirection { get; set; } = "asc";
}
