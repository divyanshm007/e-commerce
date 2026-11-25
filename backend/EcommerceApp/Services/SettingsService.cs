using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Settings;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public SettingsService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<ApiResponse<WebsiteSettingsDto>> GetWebsiteSettingsAsync()
    {
        var settings = await _db.WebsiteSettings.ToListAsync();
        var dto = new WebsiteSettingsDto
        {
            SiteName = Get(settings, "site_name"),
            LogoUrl = Get(settings, "logo_url"),
            FaviconUrl = Get(settings, "favicon_url"),
            Email = Get(settings, "contact_email"),
            Phone = Get(settings, "contact_phone"),
            Address = Get(settings, "contact_address"),
            Facebook = Get(settings, "social_facebook"),
            Instagram = Get(settings, "social_instagram"),
            Twitter = Get(settings, "social_twitter"),
            LinkedIn = Get(settings, "social_linkedin"),
            YouTube = Get(settings, "social_youtube"),
            WhatsApp = Get(settings, "social_whatsapp"),
            GoogleAnalyticsId = Get(settings, "google_analytics_id"),
            MetaTitle = Get(settings, "meta_title"),
            MetaDescription = Get(settings, "meta_description"),
            RobotsText = Get(settings, "robots_txt")
        };
        return ApiResponse<WebsiteSettingsDto>.Ok(dto);
    }

    public async Task<ApiResponse<string>> UpdateWebsiteSettingsAsync(UpdateWebsiteSettingsDto dto)
    {
        await SetAsync("site_name", dto.SiteName ?? "", "general");
        await SetAsync("logo_url", dto.LogoUrl ?? "", "general");
        await SetAsync("favicon_url", dto.FaviconUrl ?? "", "general");
        await SetAsync("contact_email", dto.Email ?? "", "contact");
        await SetAsync("contact_phone", dto.Phone ?? "", "contact");
        await SetAsync("contact_address", dto.Address ?? "", "contact");
        await SetAsync("social_facebook", dto.Facebook ?? "", "social");
        await SetAsync("social_instagram", dto.Instagram ?? "", "social");
        await SetAsync("social_twitter", dto.Twitter ?? "", "social");
        await SetAsync("social_linkedin", dto.LinkedIn ?? "", "social");
        await SetAsync("social_youtube", dto.YouTube ?? "", "social");
        await SetAsync("social_whatsapp", dto.WhatsApp ?? "", "social");
        await SetAsync("google_analytics_id", dto.GoogleAnalyticsId ?? "", "analytics");
        await SetAsync("meta_title", dto.MetaTitle ?? "", "seo");
        await SetAsync("meta_description", dto.MetaDescription ?? "", "seo");
        await SetAsync("robots_txt", dto.RobotsText ?? "", "seo");
        return ApiResponse<string>.Ok("Settings updated.");
    }

    public async Task<ApiResponse<ShippingConfigDto>> GetShippingConfigAsync()
    {
        var config = await _db.ShippingConfigs.FirstOrDefaultAsync()
            ?? new ShippingConfig();
        return ApiResponse<ShippingConfigDto>.Ok(_mapper.Map<ShippingConfigDto>(config));
    }

    public async Task<ApiResponse<string>> UpdateShippingConfigAsync(UpdateShippingConfigDto dto)
    {
        var config = await _db.ShippingConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new ShippingConfig();
            await _db.ShippingConfigs.AddAsync(config);
        }
        config.ShippingCharge = dto.ShippingCharge;
        config.FreeShippingAbove = dto.FreeShippingAbove;
        config.FreeShippingEnabled = dto.FreeShippingEnabled;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Shipping config updated.");
    }

    public async Task<ApiResponse<TaxConfigDto>> GetTaxConfigAsync()
    {
        var config = await _db.TaxConfigs.FirstOrDefaultAsync()
            ?? new TaxConfig();
        return ApiResponse<TaxConfigDto>.Ok(_mapper.Map<TaxConfigDto>(config));
    }

    public async Task<ApiResponse<string>> UpdateTaxConfigAsync(UpdateTaxConfigDto dto)
    {
        var config = await _db.TaxConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new TaxConfig();
            await _db.TaxConfigs.AddAsync(config);
        }
        config.Name = dto.Name;
        config.Percentage = dto.Percentage;
        config.IsApplicable = dto.IsApplicable;
        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Tax config updated.");
    }

    public async Task<ApiResponse<string>> GetSettingValueAsync(string key)
    {
        var setting = await _db.WebsiteSettings.FirstOrDefaultAsync(s => s.Key == key);
        return setting == null
            ? ApiResponse<string>.NotFound($"Setting '{key}' not found.")
            : ApiResponse<string>.Ok(setting.Value);
    }

    public async Task<ApiResponse<string>> SetSettingValueAsync(string key, string value, string? group = null)
    {
        await SetAsync(key, value, group);
        return ApiResponse<string>.Ok("Setting saved.");
    }

    private string? Get(List<WebsiteSetting> settings, string key) =>
        settings.FirstOrDefault(s => s.Key == key)?.Value;

    private async Task SetAsync(string key, string value, string? group)
    {
        var existing = await _db.WebsiteSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (existing == null)
            await _db.WebsiteSettings.AddAsync(new WebsiteSetting { Key = key, Value = value, Group = group });
        else
            existing.Value = value;
        await _db.SaveChangesAsync();
    }
}
