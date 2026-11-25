using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Settings;

namespace EcommerceApp.Application.Interfaces;

public interface ISettingsService
{
    Task<ApiResponse<WebsiteSettingsDto>> GetWebsiteSettingsAsync();
    Task<ApiResponse<string>> UpdateWebsiteSettingsAsync(UpdateWebsiteSettingsDto dto);
    Task<ApiResponse<ShippingConfigDto>> GetShippingConfigAsync();
    Task<ApiResponse<string>> UpdateShippingConfigAsync(UpdateShippingConfigDto dto);
    Task<ApiResponse<TaxConfigDto>> GetTaxConfigAsync();
    Task<ApiResponse<string>> UpdateTaxConfigAsync(UpdateTaxConfigDto dto);
    Task<ApiResponse<string>> GetSettingValueAsync(string key);
    Task<ApiResponse<string>> SetSettingValueAsync(string key, string value, string? group = null);
}
