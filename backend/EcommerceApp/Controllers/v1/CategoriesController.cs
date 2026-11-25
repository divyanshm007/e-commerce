using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Categories;
using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class CategoriesController : BaseController
{
    private readonly ICategoryService _categoryService;
    private readonly IWebHostEnvironment _env;

    public CategoriesController(ICategoryService categoryService, IWebHostEnvironment env)
    {
        _categoryService = categoryService;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        ApiResult(await _categoryService.GetAllAsync());

    [HttpGet("root")]
    public async Task<IActionResult> GetRoot() =>
        ApiResult(await _categoryService.GetRootCategoriesAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        ApiResult(await _categoryService.GetByIdAsync(id));

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug) =>
        ApiResult(await _categoryService.GetBySlugAsync(slug));

    [HttpGet("{id:guid}/products")]
    public async Task<IActionResult> GetCategoryProducts(Guid id, [FromQuery] ProductFilterParams filter) =>
        ApiResult(await _categoryService.GetCategoryProductsAsync(id, filter));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto) =>
        ApiResult(await _categoryService.CreateAsync(dto));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryDto dto) =>
        ApiResult(await _categoryService.UpdateAsync(id, dto));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id) =>
        ApiResult(await _categoryService.DeleteAsync(id));

    [HttpPatch("{id:guid}/toggle-status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ToggleStatus(Guid id) =>
        ApiResult(await _categoryService.ToggleStatusAsync(id));

    [HttpPost("upload-image")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file provided."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (!allowed.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Invalid file type."));

        var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "categories");
        Directory.CreateDirectory(uploadDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(ApiResponse<object>.Ok(new { url = $"/uploads/categories/{fileName}" }));
    }
}
