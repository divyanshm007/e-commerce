using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public class BlogController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public BlogController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // ---------- Public reads ----------

    [HttpGet]
    public async Task<IActionResult> GetPosts([FromQuery] string? category)
    {
        var query = _db.BlogPosts.AsQueryable();

        // Public endpoint: only active posts (admin GETs pass activeOnly=false)
        if (!User.Identity!.IsAuthenticated)
            query = query.Where(p => p.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(p => p.Category == category);

        var posts = await query
            .OrderByDescending(p => p.PublishedAt ?? p.CreatedAt)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(posts));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var post = await _db.BlogPosts.FindAsync(id);
        return post == null ? NotFound() : Ok(ApiResponse<object>.Ok(post));
    }

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var post = await _db.BlogPosts.FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        return post == null ? NotFound() : Ok(ApiResponse<object>.Ok(post));
    }

    // ---------- Admin writes ----------

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] BlogPost post)
    {
        if (await _db.BlogPosts.AnyAsync(p => p.Slug == post.Slug))
            return BadRequest(ApiResponse<object>.Fail("Slug already exists"));

        await _db.BlogPosts.AddAsync(post);
        await _db.SaveChangesAsync();
        return Ok(post);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] BlogPost updated)
    {
        var post = await _db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();

        if (await _db.BlogPosts.AnyAsync(p => p.Slug == updated.Slug && p.Id != id))
            return BadRequest(ApiResponse<object>.Fail("Slug already exists"));

        post.Title         = updated.Title;
        post.Slug          = updated.Slug;
        post.Excerpt       = updated.Excerpt;
        post.Content       = updated.Content;
        post.CoverImageUrl = updated.CoverImageUrl;
        post.Category      = updated.Category;
        post.Author        = updated.Author;
        post.PublishedAt   = updated.PublishedAt;
        post.SortOrder     = updated.SortOrder;
        post.IsActive      = updated.IsActive;

        await _db.SaveChangesAsync();
        return Ok(post);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var post = await _db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();
        _db.BlogPosts.Remove(post);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---------- Cover image upload ----------

    [HttpPost("upload-cover")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadCover([FromForm] IFormFile file)
    {
        if (file.Length == 0) return BadRequest("No file.");
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext is not ".jpg" and not ".jpeg" and not ".png" and not ".webp")
            return BadRequest("Invalid file type.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "blogs");
        Directory.CreateDirectory(uploadPath);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/blogs/{fileName}" });
    }
}
