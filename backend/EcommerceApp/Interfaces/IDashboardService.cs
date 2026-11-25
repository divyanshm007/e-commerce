using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Dashboard;

namespace EcommerceApp.Application.Interfaces;

public interface IDashboardService
{
    Task<ApiResponse<DashboardStatsDto>> GetStatsAsync();
    Task<ApiResponse<List<SalesChartDto>>> GetSalesChartAsync(string period);
    Task<ApiResponse<List<OrderListItemDto>>> GetRecentOrdersAsync(int count);
    Task<ApiResponse<List<BestSellerDto>>> GetBestSellersAsync(int count);
    Task<ApiResponse<List<LowStockDto>>> GetLowStockProductsAsync();
    Task<ApiResponse<VisitorStatsDto>> GetVisitorStatsAsync();
}
