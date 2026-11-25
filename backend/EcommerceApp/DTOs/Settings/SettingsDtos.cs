namespace EcommerceApp.Application.DTOs.Settings;

public class WebsiteSettingsDto
{
    public string? SiteName { get; set; }
    public string? LogoUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Facebook { get; set; }
    public string? Instagram { get; set; }
    public string? Twitter { get; set; }
    public string? LinkedIn { get; set; }
    public string? YouTube { get; set; }
    public string? WhatsApp { get; set; }
    public string? GoogleAnalyticsId { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? RobotsText { get; set; }
}

public class UpdateWebsiteSettingsDto : WebsiteSettingsDto { }

public class ShippingConfigDto
{
    public Guid Id { get; set; }
    public decimal ShippingCharge { get; set; }
    public decimal FreeShippingAbove { get; set; }
    public bool FreeShippingEnabled { get; set; }
}

public class UpdateShippingConfigDto
{
    public decimal ShippingCharge { get; set; }
    public decimal FreeShippingAbove { get; set; }
    public bool FreeShippingEnabled { get; set; }
}

public class TaxConfigDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "GST";
    public decimal Percentage { get; set; }
    public bool IsApplicable { get; set; }
}

public class UpdateTaxConfigDto
{
    public string Name { get; set; } = "GST";
    public decimal Percentage { get; set; }
    public bool IsApplicable { get; set; }
}
