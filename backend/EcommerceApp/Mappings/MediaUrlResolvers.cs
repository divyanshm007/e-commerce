using AutoMapper;
using EcommerceApp.Application.DTOs.Dashboard;
using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Domain.Entities;

namespace EcommerceApp.Application.Mappings;

public sealed class PrimaryImageUrlResolver : IValueResolver<Product, ProductListDto, string?>
{
    public string? Resolve(Product src, ProductListDto dest, string? dm, ResolutionContext ctx)
        => src.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl
           ?? src.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.ImageUrl;
}

public sealed class ProductImageUrlResolver : IValueResolver<ProductImage, ProductImageDto, string>
{
    public string Resolve(ProductImage src, ProductImageDto dest, string dm, ResolutionContext ctx)
        => src.ImageUrl ?? string.Empty;
}

public sealed class BestSellerImageUrlResolver : IValueResolver<Product, BestSellerDto, string?>
{
    public string? Resolve(Product src, BestSellerDto dest, string? dm, ResolutionContext ctx)
        => src.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl;
}

public sealed class LowStockImageUrlResolver : IValueResolver<Product, LowStockDto, string?>
{
    public string? Resolve(Product src, LowStockDto dest, string? dm, ResolutionContext ctx)
        => src.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl;
}
