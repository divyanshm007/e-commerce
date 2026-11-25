using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Categories;
using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly ISlugService _slug;

    public CategoryService(AppDbContext db, IMapper mapper, ISlugService slug)
    {
        _db = db;
        _mapper = mapper;
        _slug = slug;
    }

    private IQueryable<Category> BaseQuery() =>
        _db.Categories
            .Include(c => c.ParentCategory)
            .Include(c => c.SubCategories)
            .Include(c => c.Products)
            .AsNoTracking();

    public async Task<ApiResponse<List<CategoryDto>>> GetAllAsync()
    {
        var items = await BaseQuery().ToListAsync();
        return ApiResponse<List<CategoryDto>>.Ok(_mapper.Map<List<CategoryDto>>(items));
    }

    public async Task<ApiResponse<List<CategoryDto>>> GetRootCategoriesAsync()
    {
        var items = await BaseQuery()
            .Where(c => c.ParentCategoryId == null && c.IsActive)
            .OrderBy(c => c.SortOrder).ToListAsync();
        return ApiResponse<List<CategoryDto>>.Ok(_mapper.Map<List<CategoryDto>>(items));
    }

    public async Task<ApiResponse<CategoryDto>> GetByIdAsync(Guid id)
    {
        var cat = await BaseQuery().FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null) return ApiResponse<CategoryDto>.NotFound("Category not found.");
        return ApiResponse<CategoryDto>.Ok(_mapper.Map<CategoryDto>(cat));
    }

    public async Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryDto dto)
    {
        if (await _db.Categories.AnyAsync(c => c.Name == dto.Name))
            return ApiResponse<CategoryDto>.Fail("Category with this name already exists.");

        var existingSlugs = await _db.Categories.Select(c => c.Slug ?? "").ToListAsync();
        var category = _mapper.Map<Category>(dto);
        category.Slug = _slug.GenerateUnique(dto.Name, existingSlugs);

        await _db.Categories.AddAsync(category);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(category.Id);
    }

    public async Task<ApiResponse<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryDto dto)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return ApiResponse<CategoryDto>.NotFound("Category not found.");

        _mapper.Map(dto, cat);
        var existingSlugs = await _db.Categories.Where(c => c.Id != id)
            .Select(c => c.Slug ?? "").ToListAsync();
        cat.Slug = _slug.GenerateUnique(dto.Name, existingSlugs);

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<ApiResponse<string>> DeleteAsync(Guid id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return ApiResponse<string>.NotFound("Category not found.");

        var productCount = await _db.Products.CountAsync(p => p.CategoryId == id);
        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok($"Category deleted. {productCount} product(s) moved to uncategorized.");
    }

    public async Task<ApiResponse<string>> ToggleStatusAsync(Guid id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return ApiResponse<string>.NotFound("Category not found.");
        cat.IsActive = !cat.IsActive;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok($"Category {(cat.IsActive ? "activated" : "deactivated")}.");
    }

    public async Task<ApiResponse<CategoryDto>> GetBySlugAsync(string slug)
    {
        var cat = await BaseQuery().FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive);
        if (cat == null) return ApiResponse<CategoryDto>.NotFound("Category not found.");
        return ApiResponse<CategoryDto>.Ok(_mapper.Map<CategoryDto>(cat));
    }

    public async Task<ApiResponse<PagedResult<ProductListDto>>> GetCategoryProductsAsync(Guid id, ProductFilterParams filter)
    {
        // Build full descendant set (BFS) — one lightweight DB call
        var allCats = await _db.Categories
            .Select(c => new { c.Id, c.ParentCategoryId })
            .ToListAsync();

        var categoryIds = new HashSet<Guid> { id };
        var queue = new Queue<Guid>();
        queue.Enqueue(id);
        while (queue.TryDequeue(out var current))
        {
            foreach (var childId in allCats
                .Where(c => c.ParentCategoryId == current)
                .Select(c => c.Id))
            {
                if (categoryIds.Add(childId)) queue.Enqueue(childId);
            }
        }

        var query = _db.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Where(p => p.CategoryId.HasValue && categoryIds.Contains(p.CategoryId.Value))
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Search))
            query = query.Where(p => p.Name.Contains(filter.Search) ||
                                     (p.Description != null && p.Description.Contains(filter.Search)));
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
            "rating" or "averagerating" => query.OrderByDescending(p => p.AverageRating),
            "popular" or "soldcount" => query.OrderByDescending(p => p.SoldCount),
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
}
