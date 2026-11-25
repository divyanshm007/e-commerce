using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class ProductsController : BaseController
{
    private readonly IProductService _productService;
    private readonly IWebHostEnvironment _env;

    public ProductsController(IProductService productService, IWebHostEnvironment env)
    {
        _productService = productService;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProductFilterParams filter) =>
        ApiResult(await _productService.GetAllAsync(filter));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        ApiResult(await _productService.GetByIdAsync(id));

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var result = await _productService.GetBySlugAsync(slug);
        if (result.Data != null)
        {
            try
            {
                var sessionId = Request.Cookies["session_id"];
                Guid? userId = IsAuthenticated ? CurrentUserId : null;
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                await _productService.RecordViewAsync(result.Data.Id, userId, sessionId, ip);
            }
            catch { /* view tracking failure must never break the product response */ }
        }
        return ApiResult(result);
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured() =>
        ApiResult(await _productService.GetFeaturedAsync());

    [HttpGet("new-arrivals")]
    public async Task<IActionResult> GetNewArrivals() =>
        ApiResult(await _productService.GetNewArrivalsAsync());

    [HttpGet("best-sellers")]
    public async Task<IActionResult> GetBestSellers() =>
        ApiResult(await _productService.GetBestSellersAsync());

    [HttpGet("special-offers")]
    public async Task<IActionResult> GetSpecialOffers() =>
        ApiResult(await _productService.GetSpecialOffersAsync());

    [HttpGet("{id:guid}/related")]
    public async Task<IActionResult> GetRelated(Guid id) =>
        ApiResult(await _productService.GetRelatedAsync(id));

    [HttpGet("low-stock")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetLowStock() =>
        ApiResult(await _productService.GetLowStockAsync());

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto) =>
        ApiResult(await _productService.CreateAsync(dto));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductDto dto) =>
        ApiResult(await _productService.UpdateAsync(id, dto));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id) =>
        ApiResult(await _productService.DeleteAsync(id));

    [HttpPatch("{id:guid}/toggle-status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ToggleStatus(Guid id) =>
        ApiResult(await _productService.ToggleStatusAsync(id));

    [HttpPatch("{id:guid}/stock")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateStock(Guid id, [FromBody] UpdateStockRequest req) =>
        ApiResult(await _productService.UpdateStockAsync(id, req.Quantity));

    [HttpPost("{id:guid}/images")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadImages(Guid id, [FromForm] List<IFormFile> files,
        [FromServices] AppDbContext db)
    {
        if (files.Count > 10) return BadRequest("Maximum 10 images allowed.");

        var product = await db.Products.FindAsync(id);
        if (product == null) return NotFound();

        var existingCount = db.ProductImages.Count(i => i.ProductId == id);
        if (existingCount + files.Count > 10)
            return BadRequest($"Product can have maximum 10 images. Currently has {existingCount}.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "products");
        Directory.CreateDirectory(uploadPath);

        var images = new List<Domain.Entities.ProductImage>();
        var isPrimary = existingCount == 0;

        foreach (var file in files.Take(10 - existingCount))
        {
            if (file.Length == 0) continue;
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (ext is not ".jpg" and not ".jpeg" and not ".png" and not ".webp")
                continue;

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadPath, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            images.Add(new Domain.Entities.ProductImage
            {
                ProductId = id,
                ImageUrl = $"/uploads/products/{fileName}",
                IsPrimary = isPrimary,
                SortOrder = existingCount + images.Count
            });
            isPrimary = false;
        }

        await db.ProductImages.AddRangeAsync(images);
        await db.SaveChangesAsync();

        return Ok(new { uploaded = images.Count, images = images.Select(i => i.ImageUrl) });
    }

    public record UpdateStockRequest(int Quantity);
}
