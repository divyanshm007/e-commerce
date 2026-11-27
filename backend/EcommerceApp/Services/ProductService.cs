using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly ISlugService _slug;

    public ProductService(AppDbContext db, IMapper mapper, ISlugService slug)
    {
        _db = db;
        _mapper = mapper;
        _slug = slug;
    }

    private IQueryable<Product> BaseQuery() =>
        _db.Products
            .Include(p => p.Category)
            .Include(p => p.ProductCategories).ThenInclude(pc => pc.Category)
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Include(p => p.Reviews.Where(r => r.Status != Domain.Enums.ReviewStatus.Rejected))
                .ThenInclude(r => r.User)
            .AsSplitQuery()
            .AsNoTracking();

    public async Task<ApiResponse<PagedResult<ProductListDto>>> GetAllAsync(ProductFilterParams filter)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(p => p.Name.Contains(filter.Search) ||
                                     (p.Description != null && p.Description.Contains(filter.Search)));

        if (filter.CategoryId.HasValue) query = query.Where(p => p.CategoryId == filter.CategoryId || p.ProductCategories.Any(pc => pc.CategoryId == filter.CategoryId));
        if (filter.MinPrice.HasValue) query = query.Where(p => p.Price >= filter.MinPrice);
        if (filter.MaxPrice.HasValue) query = query.Where(p => p.Price <= filter.MaxPrice);
        if (filter.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == filter.IsFeatured);
        if (filter.IsNewArrival.HasValue) query = query.Where(p => p.IsNewArrival == filter.IsNewArrival);
        if (filter.IsBestSeller.HasValue) query = query.Where(p => p.IsBestSeller == filter.IsBestSeller);
        if (filter.IsSpecialOffer.HasValue) query = query.Where(p => p.IsSpecialOffer == filter.IsSpecialOffer);
        if (filter.InStock.HasValue && filter.InStock.Value) query = query.Where(p => p.StockQuantity > 0);
        if (filter.IsActive.HasValue) query = query.Where(p => p.IsActive == filter.IsActive);
        else query = query.Where(p => p.IsActive);
        if (filter.PrescriptionRequired.HasValue)
            query = query.Where(p => p.PrescriptionRequired == filter.PrescriptionRequired);

        query = filter.SortBy?.ToLower() switch
        {
            "price" => filter.SortDirection == "desc"
                ? query.OrderByDescending(p => p.DiscountPrice ?? p.Price)
                : query.OrderBy(p => p.DiscountPrice ?? p.Price),
            "rating" => query.OrderByDescending(p => p.AverageRating),
            "popular" => query.OrderByDescending(p => p.SoldCount),
            "newest" => query.OrderByDescending(p => p.CreatedAt),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<ProductListDto>>.Ok(new PagedResult<ProductListDto>
        {
            Items = _mapper.Map<List<ProductListDto>>(items),
            TotalCount = total,
            Page = filter.Page,
            PageSize = filter.PageSize
        });
    }

    public async Task<ApiResponse<ProductDetailDto>> GetByIdAsync(Guid id)
    {
        var product = await BaseQuery().FirstOrDefaultAsync(p => p.Id == id);
        if (product == null) return ApiResponse<ProductDetailDto>.NotFound("Product not found.");
        return ApiResponse<ProductDetailDto>.Ok(_mapper.Map<ProductDetailDto>(product));
    }

    public async Task<ApiResponse<ProductDetailDto>> GetBySlugAsync(string slug)
    {
        var product = await BaseQuery().FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        if (product == null) return ApiResponse<ProductDetailDto>.NotFound("Product not found.");
        return ApiResponse<ProductDetailDto>.Ok(_mapper.Map<ProductDetailDto>(product));
    }

    public async Task<ApiResponse<ProductDetailDto>> CreateAsync(CreateProductDto dto)
    {
        var existingSlugs = await _db.Products.Select(p => p.Slug).ToListAsync();
        var productSlug = _slug.GenerateUnique(dto.Name, existingSlugs);

        var product = _mapper.Map<Product>(dto);
        product.Slug = productSlug;
        ApplyCategories(product, dto);

        await _db.Products.AddAsync(product);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(product.Id);
    }

    public async Task<ApiResponse<ProductDetailDto>> UpdateAsync(Guid id, UpdateProductDto dto)
    {
        var product = await _db.Products
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Include(p => p.ProductCategories)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return ApiResponse<ProductDetailDto>.NotFound("Product not found.");

        var oldName = product.Name;
        _mapper.Map(dto, product);
        ApplyCategories(product, dto);

        if (product.Name != oldName)
        {
            var existingSlugs = await _db.Products
                .Where(p => p.Id != id)
                .Select(p => p.Slug).ToListAsync();
            product.Slug = _slug.GenerateUnique(dto.Name, existingSlugs);
        }

        if (dto.ImageIdsToDelete.Any())
        {
            var toDelete = product.Images
                .Where(i => dto.ImageIdsToDelete.Contains(i.Id)).ToList();
            _db.ProductImages.RemoveRange(toDelete);
        }

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    /// <summary>The first chosen category is the main one (Product.CategoryId); every chosen category gets a ProductCategories row.</summary>
    private void ApplyCategories(Product product, CreateProductDto dto)
    {
        var chosen = ProductCategoryRules.Chosen(dto.CategoryId, dto.CategoryIds);
        product.CategoryId = chosen.Count > 0 ? chosen[0] : null;
        var keep = chosen.ToHashSet();
        foreach (var gone in product.ProductCategories.Where(pc => !keep.Contains(pc.CategoryId)).ToList())
            product.ProductCategories.Remove(gone);
        var have = product.ProductCategories.Select(pc => pc.CategoryId).ToHashSet();
        foreach (var id in chosen.Where(id => !have.Contains(id)))
            product.ProductCategories.Add(new ProductCategory { ProductId = product.Id, CategoryId = id });
    }

    public async Task<ApiResponse<string>> DeleteAsync(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return ApiResponse<string>.NotFound("Product not found.");

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Product deleted.");
    }

    public async Task<ApiResponse<string>> ToggleStatusAsync(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return ApiResponse<string>.NotFound("Product not found.");
        product.IsActive = !product.IsActive;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok($"Product {(product.IsActive ? "activated" : "deactivated")}.");
    }

    public async Task<ApiResponse<string>> UpdateStockAsync(Guid id, int quantity)
    {
        var product = await _db.Products.FindAsync(id);
        if (product == null) return ApiResponse<string>.NotFound("Product not found.");
        product.StockQuantity = quantity;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Stock updated.");
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetFeaturedAsync()
    {
        var items = await BaseQuery()
            .Where(p => p.IsFeatured && p.IsActive)
            .OrderByDescending(p => p.CreatedAt).Take(12).ToListAsync();
        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetNewArrivalsAsync()
    {
        var items = await BaseQuery()
            .Where(p => p.IsNewArrival && p.IsActive)
            .OrderByDescending(p => p.CreatedAt).Take(12).ToListAsync();
        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetBestSellersAsync()
    {
        var items = await BaseQuery()
            .Where(p => p.IsBestSeller && p.IsActive)
            .OrderByDescending(p => p.SoldCount).Take(12).ToListAsync();
        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetSpecialOffersAsync()
    {
        var items = await BaseQuery()
            .Where(p => p.IsSpecialOffer && p.IsActive)
            .OrderByDescending(p => p.CreatedAt).Take(12).ToListAsync();
        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetRelatedAsync(Guid productId)
    {
        var product = await _db.Products.FindAsync(productId);
        if (product == null) return ApiResponse<List<ProductListDto>>.Ok([]);

        var items = await BaseQuery()
            .Where(p => (p.CategoryId == product.CategoryId || p.ProductCategories.Any(pc => _db.ProductCategories.Any(m => m.ProductId == productId && m.CategoryId == pc.CategoryId))) && p.Id != productId && p.IsActive)
            .OrderByDescending(p => p.SoldCount).Take(8).ToListAsync();

        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task<ApiResponse<List<ProductListDto>>> GetLowStockAsync()
    {
        var items = await BaseQuery()
            .Where(p => p.StockQuantity <= p.LowStockThreshold && p.IsActive)
            .OrderBy(p => p.StockQuantity).ToListAsync();
        return ApiResponse<List<ProductListDto>>.Ok(_mapper.Map<List<ProductListDto>>(items));
    }

    public async Task RecordViewAsync(Guid productId, Guid? userId, string? sessionId, string? ipAddress)
    {
        await _db.ProductViews.AddAsync(new ProductView
        {
            ProductId = productId,
            UserId = userId,
            SessionId = sessionId,
            IpAddress = ipAddress,
            ViewedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}
