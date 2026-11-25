using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

/// <summary>Courier shipping. In this phase it only exposes the Delhivery Test/Live setting (SuperAdmin only).</summary>
public class ShipmentsController : BaseController
{
    private readonly IDelhiveryConfigService _delhivery;

    public ShipmentsController(IDelhiveryConfigService delhivery) => _delhivery = delhivery;

    // admin panel: current mode and whether each token is configured (never the token itself)
    [HttpGet("delhivery/mode")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetMode() =>
        ApiResult(Application.Common.ApiResponse<DelhiveryModeDto>.Ok(await _delhivery.GetInfoAsync()));

    [HttpPut("delhivery/mode")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> SetMode([FromBody] SetDelhiveryModeDto dto) =>
        ApiResult(await _delhivery.SetModeAsync(dto?.Mode ?? "",
            new AuditContext(CurrentUserId, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString())));
}
