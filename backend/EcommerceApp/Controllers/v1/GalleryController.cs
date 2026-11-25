using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public class GalleryController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public GalleryController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // ---------- Public ----------

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var images = await _db.GalleryImages
            .Where(g => g.IsActive)
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new
            {
                id        = g.Id,
                title     = g.Title,
                subtitle  = g.Subtitle,
                imageUrl  = g.ImageUrl,
                sortOrder = g.SortOrder,
                createdAt = g.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(images));
    }

    // ---------- Admin ----------

    [HttpGet("admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAllAdmin()
    {
        var images = await _db.GalleryImages
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new
            {
                id        = g.Id,
                title     = g.Title,
                subtitle  = g.Subtitle,
                imageUrl  = g.ImageUrl,
                sortOrder = g.SortOrder,
                isActive  = g.IsActive,
                createdAt = g.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(images));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] GalleryImage image)
    {
        await _db.GalleryImages.AddAsync(image);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(image));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] GalleryImage updated)
    {
        var image = await _db.GalleryImages.FindAsync(id);
        if (image == null) return NotFound(ApiResponse<object>.Fail("Not found"));

        image.Title    = updated.Title;
        image.Subtitle = updated.Subtitle;
        image.ImageUrl = updated.ImageUrl;
        image.SortOrder = updated.SortOrder;
        image.IsActive = updated.IsActive;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(image));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var image = await _db.GalleryImages.FindAsync(id);
        if (image == null) return NotFound(ApiResponse<object>.Fail("Not found"));
        _db.GalleryImages.Remove(image);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(true));
    }

    // ---------- Image upload ----------

    [HttpPost("upload-image")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file provided"));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (!allowed.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Invalid file type"));

        var folder = Path.Combine(_env.WebRootPath, "uploads", "gallery");
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(folder, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(ApiResponse<object>.Ok(new { url = $"/uploads/gallery/{fileName}" }));
    }
}
