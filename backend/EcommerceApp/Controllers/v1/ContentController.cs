using EcommerceApp.Application.Common;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public class ContentController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IEmailService _emailService;

    public ContentController(AppDbContext db, IWebHostEnvironment env, IEmailService emailService)
    {
        _db = db;
        _env = env;
        _emailService = emailService;
    }

    // ---------- Banners ----------
    [HttpGet("banners")]
    public async Task<IActionResult> GetBanners([FromQuery] string? type)
    {
        var query = _db.Banners.Where(b => b.IsActive);
        if (!string.IsNullOrEmpty(type) && Enum.TryParse<BannerType>(type, true, out var bannerType))
            query = query.Where(b => b.BannerType == bannerType);

        var banners = await query.OrderBy(b => b.SortOrder).ToListAsync();

        var result = banners.Select(b => new
        {
            id        = b.Id,
            title     = b.Title,
            subtitle  = b.Subtitle,
            imageUrl  = b.ImageUrl,
            linkUrl   = b.LinkUrl,
            type      = b.BannerType.ToString().ToLower(),   // "hero" or "promotion"
            sortOrder = b.SortOrder,
            isActive  = b.IsActive
        });

        return Ok(ApiResponse<object>.Ok(result));
    }

    [HttpPost("banners")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateBanner([FromBody] Banner banner)
    {
        await _db.Banners.AddAsync(banner);
        await _db.SaveChangesAsync();
        return Ok(banner);
    }

    [HttpPut("banners/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateBanner(Guid id, [FromBody] Banner updated)
    {
        var banner = await _db.Banners.FindAsync(id);
        if (banner == null) return NotFound();
        banner.Title = updated.Title;
        banner.Subtitle = updated.Subtitle;
        banner.ImageUrl = updated.ImageUrl;
        banner.LinkUrl = updated.LinkUrl;
        banner.BannerType = updated.BannerType;
        banner.SortOrder = updated.SortOrder;
        banner.IsActive = updated.IsActive;
        await _db.SaveChangesAsync();
        return Ok(banner);
    }

    [HttpDelete("banners/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteBanner(Guid id)
    {
        var banner = await _db.Banners.FindAsync(id);
        if (banner == null) return NotFound();
        _db.Banners.Remove(banner);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---------- Promotion Headers ----------
    [HttpGet("promotion-headers")]
    public async Task<IActionResult> GetPromotionHeaders() =>
        Ok(ApiResponse<object>.Ok(await _db.PromotionHeaders.Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync()));

    [HttpPost("promotion-headers")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreatePromotionHeader([FromBody] PromotionHeader header)
    {
        await _db.PromotionHeaders.AddAsync(header);
        await _db.SaveChangesAsync();
        return Ok(header);
    }

    [HttpPut("promotion-headers/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdatePromotionHeader(Guid id, [FromBody] PromotionHeader updated)
    {
        var header = await _db.PromotionHeaders.FindAsync(id);
        if (header == null) return NotFound();
        header.Text = updated.Text;
        header.LinkUrl = updated.LinkUrl;
        header.BackgroundColor = updated.BackgroundColor;
        header.TextColor = updated.TextColor;
        header.SortOrder = updated.SortOrder;
        header.IsActive = updated.IsActive;
        await _db.SaveChangesAsync();
        return Ok(header);
    }

    [HttpDelete("promotion-headers/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeletePromotionHeader(Guid id)
    {
        var h = await _db.PromotionHeaders.FindAsync(id);
        if (h == null) return NotFound();
        _db.PromotionHeaders.Remove(h);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---------- Testimonials ----------
    [HttpGet("testimonials")]
    public async Task<IActionResult> GetTestimonials() =>
        Ok(ApiResponse<object>.Ok(await _db.Testimonials.Where(t => t.IsActive).OrderBy(t => t.SortOrder).ToListAsync()));

    [HttpGet("testimonials/admin")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetTestimonialsAdmin() =>
        Ok(ApiResponse<object>.Ok(await _db.Testimonials.OrderBy(t => t.SortOrder).ToListAsync()));

    [HttpPost("testimonials")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateTestimonial([FromBody] Testimonial t)
    {
        await _db.Testimonials.AddAsync(t);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(t));
    }

    [HttpPut("testimonials/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateTestimonial(Guid id, [FromBody] Testimonial updated)
    {
        var t = await _db.Testimonials.FindAsync(id);
        if (t == null) return NotFound(ApiResponse<object>.Fail("Not found"));
        t.CustomerName  = updated.CustomerName;
        t.CustomerTitle = updated.CustomerTitle;
        t.AvatarUrl     = updated.AvatarUrl;
        t.Message       = updated.Message;
        t.Rating        = updated.Rating;
        t.SortOrder     = updated.SortOrder;
        t.IsActive      = updated.IsActive;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(t));
    }

    [HttpDelete("testimonials/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteTestimonial(Guid id)
    {
        var t = await _db.Testimonials.FindAsync(id);
        if (t == null) return NotFound();
        _db.Testimonials.Remove(t);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(true));
    }

    [HttpPost("testimonials/upload-avatar")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file provided"));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Invalid file type"));

        var folder = Path.Combine(_env.WebRootPath, "uploads", "avatars");
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(folder, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(ApiResponse<object>.Ok(new { url = $"/uploads/avatars/{fileName}" }));
    }

    // ---------- FAQs ----------
    [HttpGet("faqs")]
    public async Task<IActionResult> GetFaqs() =>
        Ok(ApiResponse<object>.Ok(await _db.Faqs.Where(f => f.IsActive).OrderBy(f => f.SortOrder).ToListAsync()));

    [HttpPost("faqs")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateFaq([FromBody] Faq faq)
    {
        await _db.Faqs.AddAsync(faq);
        await _db.SaveChangesAsync();
        return Ok(faq);
    }

    [HttpPut("faqs/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateFaq(Guid id, [FromBody] Faq updated)
    {
        var faq = await _db.Faqs.FindAsync(id);
        if (faq == null) return NotFound();
        faq.Question = updated.Question;
        faq.Answer = updated.Answer;
        faq.Category = updated.Category;
        faq.SortOrder = updated.SortOrder;
        faq.IsActive = updated.IsActive;
        await _db.SaveChangesAsync();
        return Ok(faq);
    }

    [HttpDelete("faqs/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteFaq(Guid id)
    {
        var faq = await _db.Faqs.FindAsync(id);
        if (faq == null) return NotFound();
        _db.Faqs.Remove(faq);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---------- Static Pages ----------
    [HttpGet("pages/{slug}")]
    public async Task<IActionResult> GetPage(string slug) =>
        await _db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive) is { } page
            ? Ok(ApiResponse<object>.Ok(page)) : NotFound();

    [HttpPut("pages/{slug}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpsertPage(string slug, [FromBody] StaticPage updated)
    {
        var page = await _db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug);
        if (page == null)
        {
            updated.Slug = slug;
            await _db.StaticPages.AddAsync(updated);
        }
        else
        {
            page.Title = updated.Title;
            page.Content = updated.Content;
            page.MetaTitle = updated.MetaTitle;
            page.MetaDescription = updated.MetaDescription;
        }
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ---------- Newsletter ----------
    [HttpPost("newsletter/subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "Invalid email address." });

        var existing = await _db.Newsletters.FirstOrDefaultAsync(n => n.Email == req.Email.ToLower());
        if (existing != null)
        {
            existing.IsSubscribed = true;
            existing.UnsubscribedAt = null;
        }
        else
        {
            await _db.Newsletters.AddAsync(new Newsletter
            { Email = req.Email.ToLower().Trim() });
        }
        var isNewSubscriber = existing == null;
        await _db.SaveChangesAsync();
        // Only send welcome email to genuinely new subscribers — not re-subscriptions
        if (isNewSubscriber)
            _ = _emailService.SendNewsletterWelcomeAsync(req.Email.ToLower().Trim());
        return Ok(new { subscribed = true });
    }

    [HttpGet("newsletter/subscribers")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetSubscribers() =>
        Ok(await _db.Newsletters.Where(n => n.IsSubscribed).ToListAsync());

    // ---------- Contact ----------
    [HttpPost("contact")]
    public async Task<IActionResult> SendContact([FromBody] ContactMessage msg)
    {
        await _db.ContactMessages.AddAsync(msg);
        await _db.SaveChangesAsync();
        _ = _emailService.SendContactFormToAdminAsync(msg.Name, msg.Email, msg.Phone ?? "", msg.Message);
        _ = _emailService.SendContactConfirmationAsync(msg.Email, msg.Name, msg.Subject, msg.Message);
        return Ok(new { sent = true });
    }

    [HttpGet("contact/messages")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetMessages() =>
        Ok(await _db.ContactMessages.OrderByDescending(m => m.CreatedAt).ToListAsync());

    [HttpDelete("contact/messages/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteMessage(Guid id)
    {
        var msg = await _db.ContactMessages.FindAsync(id);
        if (msg == null) return NotFound(new { error = "Message not found." });
        _db.ContactMessages.Remove(msg);
        await _db.SaveChangesAsync();
        return Ok(new { deleted = true });
    }

    // ---------- Image upload (category logos, banners) ----------
    [HttpPost("upload")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromQuery] string folder = "general")
    {
        if (file.Length == 0) return BadRequest("No file.");
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext is not ".jpg" and not ".jpeg" and not ".png" and not ".webp" and not ".svg")
            return BadRequest("Invalid file type.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", folder);
        Directory.CreateDirectory(uploadPath);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/{folder}/{fileName}" });
    }

    public record SubscribeRequest(string Email);
}
