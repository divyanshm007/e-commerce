using EcommerceApp.Application.DTOs.Settings;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class SettingsController : BaseController
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet("website")]
    public async Task<IActionResult> GetWebsiteSettings() =>
        ApiResult(await _settingsService.GetWebsiteSettingsAsync());

    [HttpPut("website")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateWebsiteSettings([FromBody] UpdateWebsiteSettingsDto dto) =>
        ApiResult(await _settingsService.UpdateWebsiteSettingsAsync(dto));

    [HttpGet("shipping")]
    public async Task<IActionResult> GetShipping() =>
        ApiResult(await _settingsService.GetShippingConfigAsync());

    [HttpPut("shipping")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateShipping([FromBody] UpdateShippingConfigDto dto) =>
        ApiResult(await _settingsService.UpdateShippingConfigAsync(dto));

    [HttpGet("tax")]
    public async Task<IActionResult> GetTax() =>
        ApiResult(await _settingsService.GetTaxConfigAsync());

    [HttpPut("tax")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateTax([FromBody] UpdateTaxConfigDto dto) =>
        ApiResult(await _settingsService.UpdateTaxConfigAsync(dto));
}
