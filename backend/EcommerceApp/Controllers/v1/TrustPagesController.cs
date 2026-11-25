using System.Text.Json;
using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public record TrustSectionDto(string Icon, string Heading, string Body, string? AttachedFileUrl = null, string? AttachedFileName = null);
public record TrustPageDto(
    string Slug, string Title, string Subtitle,
    string? HeroImageUrl, string? AttachedFileUrl, string? AttachedFileName,
    List<TrustSectionDto> Sections);
public record UpdateTrustPageDto(string Title, string Subtitle, List<TrustSectionDto> Sections);

[Route("api/v1/trust-pages")]
[ApiController]
public class TrustPagesController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public TrustPagesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    // ── Default seed data ───────────────────────────────────────────────────
    private static readonly Dictionary<string, TrustPageDto> _defaults = new()
    {
        ["why-choose-us"] = new("why-choose-us", "Why Choose Sidham Pharmacy?",
            "We are committed to bringing you the purest, most effective Ayurvedic products with complete transparency.",
            null, null, null, [
                new("verified",   "100% Authentic Ayurveda",       "All our products are crafted using time-tested Ayurvedic formulations passed down through generations."),
                new("science",    "Science-Backed Formulations",    "Every product is developed by our BAMS-qualified doctors combining ancient wisdom with modern standards."),
                new("check_circle","Quality You Can Trust",         "GMP-certified, AYUSH-approved and third-party lab-tested before reaching you."),
                new("eco",        "Ethically & Sustainably Sourced","We partner with certified organic farms and follow fair-trade practices."),
                new("support_agent","Expert Guidance",              "Our certified Ayurvedic consultants guide you towards the right products for your constitution."),
                new("local_shipping","Fast & Reliable Delivery",    "Temperature-controlled packaging ensures products arrive in perfect condition, anywhere in India."),
            ]),
        ["quality-assurance"] = new("quality-assurance", "Quality Assurance",
            "Every product that reaches you has passed through our rigorous multi-stage quality process.",
            null, null, null, [
                new("grass",      "Raw Material Selection",         "Sourced only from AYUSH-approved, organically certified suppliers. Each batch tested before entry."),
                new("factory",    "GMP-Certified Manufacturing",    "State-of-the-art plant meeting WHO and national pharmaceutical manufacturing standards."),
                new("labs",       "In-Process Quality Checks",      "Real-time monitoring at every stage — mixing, granulation, filling, and packaging."),
                new("biotech",    "Finished Product Testing",       "Comprehensive tests for potency, microbiological safety, heavy metals, and shelf-life stability."),
                new("inventory_2","Packaging Integrity",            "Tamper-evident seals, moisture-proof packaging and UV-protective labels on all products."),
                new("assignment", "Batch Traceability",             "Unique batch number enables full traceability from raw material origin to final delivery."),
            ]),
        ["manufacturing"] = new("manufacturing", "Our Manufacturing Process",
            "Tradition meets technology in our state-of-the-art Ayurvedic manufacturing facility.",
            null, null, null, [
                new("local_florist","Step 1: Herb Sourcing",        "Direct partnerships with organic farms across Uttarakhand, Kerala, HP and Rajasthan."),
                new("cleaning_services","Step 2: Cleaning & Sorting","Rigorous cleaning, visual inspection and moisture analysis. Only premium grades proceed."),
                new("settings",   "Step 3: Extraction & Processing","Classical methods like Kwatha and modern low-temperature extraction preserve bioactive compounds."),
                new("labs",       "Step 4: Formulation",           "Standardized extracts blended per validated Ayurvedic formulas under BAMS doctor supervision."),
                new("medication", "Step 5: Manufacturing",          "Tablets, capsules, oils and powders manufactured in ISO & GMP-certified clean-rooms."),
                new("verified",   "Step 6: Quality Testing & Release","NABL-accredited lab tests confirm safety and potency before every product release."),
            ]),
        ["certifications"] = new("certifications", "Our Certifications",
            "We hold the most respected quality certifications in the Ayurvedic and nutraceutical industry.",
            null, null, null, [
                new("workspace_premium","AYUSH Approval",           "All products approved by the Ministry of AYUSH, Government of India."),
                new("factory",    "GMP Certification",              "Facilities and processes meet WHO and national pharmaceutical manufacturing standards."),
                new("eco",        "Organic Certifications",         "USDA Organic and India Organic (NPOP) certifications on key products."),
                new("verified_user","ISO 9001:2015",               "Quality management systems certified for consistent quality from procurement to delivery."),
                new("food_bank",  "FSSAI License",                  "Valid FSSAI license for all food supplement and nutraceutical products."),
                new("biotech",    "NABL-Accredited Lab Testing",    "All products tested in NABL-accredited third-party laboratories."),
            ]),
        ["lab-testing"] = new("lab-testing", "Lab Testing & Safety",
            "Every batch is independently tested to guarantee your safety and satisfaction.",
            null, null, null, [
                new("biotech",    "NABL-Accredited Laboratories",   "We partner with NABL-accredited third-party labs. Request certificates of analysis for any product."),
                new("warning",    "Heavy Metal Testing",            "All products tested for arsenic, lead, mercury and cadmium below WHO/USP safe limits."),
                new("eco",        "Pesticide Residue Testing",      "Raw herbs and products tested for over 500 pesticide residues with organic sourcing."),
                new("coronavirus","Microbiological Safety",         "Tests for aerobic count, yeast, mould, Salmonella, E.coli and Staphylococcus on every batch."),
                new("medication", "Potency & Standardisation",      "Active marker compounds quantified to verify each dose delivers stated strength."),
                new("assignment", "Certificate of Analysis (COA)", "Certificates of Analysis available for every product. Contact quality@sidhampharmacy.in."),
            ]),
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    private static List<TrustSectionDto> Deserialize(string json)
    {
        try { return JsonSerializer.Deserialize<List<TrustSectionDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? []; }
        catch { return []; }
    }

    private TrustPageDto Merge(TrustPageContent db)
    {
        var sections = Deserialize(db.SectionsJson);
        if (sections.Count == 0 && _defaults.TryGetValue(db.Slug, out var def))
            sections = def.Sections;
        return new TrustPageDto(db.Slug, db.Title, db.Subtitle, db.HeroImageUrl, db.AttachedFileUrl, db.AttachedFileName, sections);
    }

    // ── Public ─────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var slugs = _defaults.Keys.ToList();
        var rows = await _db.TrustPageContents.AsNoTracking().ToListAsync();
        var result = slugs.Select(slug =>
        {
            var row = rows.FirstOrDefault(r => r.Slug == slug);
            if (row != null) return Merge(row);
            return _defaults[slug];
        }).ToList();
        return Ok(ApiResponse<List<TrustPageDto>>.Ok(result));
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        if (!_defaults.ContainsKey(slug)) return NotFound();
        var row = await _db.TrustPageContents.AsNoTracking().FirstOrDefaultAsync(r => r.Slug == slug);
        var dto = row != null ? Merge(row) : _defaults[slug];
        return Ok(ApiResponse<TrustPageDto>.Ok(dto));
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    [HttpPut("{slug}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Upsert(string slug, [FromBody] UpdateTrustPageDto dto)
    {
        if (!_defaults.ContainsKey(slug)) return NotFound();

        var row = await _db.TrustPageContents.FirstOrDefaultAsync(r => r.Slug == slug);
        if (row == null)
        {
            row = new TrustPageContent { Slug = slug };
            await _db.TrustPageContents.AddAsync(row);
        }

        row.Title    = dto.Title;
        row.Subtitle = dto.Subtitle;
        row.SectionsJson = JsonSerializer.Serialize(dto.Sections);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<TrustPageDto>.Ok(Merge(row)));
    }

    [HttpPost("{slug}/upload-image")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadImage(string slug, IFormFile file)
    {
        if (!_defaults.ContainsKey(slug)) return NotFound();
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext is not ".jpg" and not ".jpeg" and not ".png" and not ".webp")
            return BadRequest("Only jpg/png/webp allowed.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "trust-pages");
        Directory.CreateDirectory(uploadPath);
        var fileName = $"{slug}-hero-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);
        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var row = await _db.TrustPageContents.FirstOrDefaultAsync(r => r.Slug == slug);
        if (row == null)
        {
            var def = _defaults[slug];
            row = new TrustPageContent { Slug = slug, Title = def.Title, Subtitle = def.Subtitle };
            await _db.TrustPageContents.AddAsync(row);
        }
        row.HeroImageUrl = $"/uploads/trust-pages/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { url = row.HeroImageUrl }));
    }

    [HttpPost("{slug}/upload-file")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadFile(string slug, IFormFile file)
    {
        if (!_defaults.ContainsKey(slug)) return NotFound();
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "trust-pages", "docs");
        Directory.CreateDirectory(uploadPath);
        var ext = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{slug}-doc-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);
        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var row = await _db.TrustPageContents.FirstOrDefaultAsync(r => r.Slug == slug);
        if (row == null)
        {
            var def = _defaults[slug];
            row = new TrustPageContent { Slug = slug, Title = def.Title, Subtitle = def.Subtitle };
            await _db.TrustPageContents.AddAsync(row);
        }
        row.AttachedFileUrl  = $"/uploads/trust-pages/docs/{fileName}";
        row.AttachedFileName = file.FileName;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { url = row.AttachedFileUrl, name = row.AttachedFileName }));
    }

    [HttpPost("{slug}/sections/{index}/upload-file")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UploadSectionFile(string slug, int index, IFormFile file)
    {
        if (!_defaults.ContainsKey(slug)) return NotFound();
        if (file == null || file.Length == 0) return BadRequest("No file provided.");

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "trust-pages", "docs");
        Directory.CreateDirectory(uploadPath);
        var ext = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{slug}-section{index}-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);
        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var url = $"/uploads/trust-pages/docs/{fileName}";
        return Ok(ApiResponse<object>.Ok(new { url, name = file.FileName }));
    }

    [HttpDelete("{slug}/file")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteFile(string slug)
    {
        var row = await _db.TrustPageContents.FirstOrDefaultAsync(r => r.Slug == slug);
        if (row == null) return NotFound();
        row.AttachedFileUrl  = null;
        row.AttachedFileName = null;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<string>.Ok("File removed."));
    }
}
