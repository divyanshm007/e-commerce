using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

[Authorize(Roles = "SuperAdmin")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats() =>
        ApiResult(await _dashboardService.GetStatsAsync());

    [HttpGet("sales-chart")]
    public async Task<IActionResult> GetSalesChart([FromQuery] string period = "weekly") =>
        ApiResult(await _dashboardService.GetSalesChartAsync(period));

    [HttpGet("recent-orders")]
    public async Task<IActionResult> GetRecentOrders([FromQuery] int count = 10) =>
        ApiResult(await _dashboardService.GetRecentOrdersAsync(count));

    [HttpGet("best-sellers")]
    public async Task<IActionResult> GetBestSellers([FromQuery] int count = 10) =>
        ApiResult(await _dashboardService.GetBestSellersAsync(count));

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock() =>
        ApiResult(await _dashboardService.GetLowStockProductsAsync());

    [HttpGet("visitor-stats")]
    public async Task<IActionResult> GetVisitorStats() =>
        ApiResult(await _dashboardService.GetVisitorStatsAsync());
}
