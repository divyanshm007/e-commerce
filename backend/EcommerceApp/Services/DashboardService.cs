using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Dashboard;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public DashboardService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync()
    {
        var today = DateTime.UtcNow.Date;

        var totalRevenue = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Paid)
            .SumAsync(o => o.TotalAmount);

        var todayRevenue = await _db.Orders
            .Where(o => o.CreatedAt.Date == today && o.PaymentStatus == PaymentStatus.Paid)
            .SumAsync(o => o.TotalAmount);

        var stats = new DashboardStatsDto
        {
            TotalOrders = await _db.Orders.CountAsync(),
            TotalCustomers = await _db.Users.CountAsync(u => u.Role == UserRole.Customer && u.IsActive),
            TotalProducts = await _db.Products.CountAsync(p => p.IsActive),
            TotalCategories = await _db.Categories.CountAsync(c => c.IsActive),
            TotalRevenue = totalRevenue,
            TodayRevenue = todayRevenue,
            TodayOrders = await _db.Orders.CountAsync(o => o.CreatedAt.Date == today),
            PendingOrders = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Pending),
            DeliveredOrders = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Delivered),
            CancelledOrders = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Cancelled),
            ReturnedOrders = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Returned),
            LowStockProducts = await _db.Products.CountAsync(p =>
                p.IsActive && p.StockQuantity <= p.LowStockThreshold),
            AbandonedCarts = await _db.Carts.CountAsync(c => c.Status == CartStatus.Abandoned),
            Visitors = await GetVisitorStatsInternalAsync()
        };

        return ApiResponse<DashboardStatsDto>.Ok(stats);
    }

    public async Task<ApiResponse<List<SalesChartDto>>> GetSalesChartAsync(string period)
    {
        var result = new List<SalesChartDto>();
        var now = DateTime.UtcNow;

        if (period == "weekly")
        {
            for (int i = 6; i >= 0; i--)
            {
                var date = now.AddDays(-i).Date;
                var revenue = await _db.Orders
                    .Where(o => o.CreatedAt.Date == date && o.PaymentStatus == PaymentStatus.Paid)
                    .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
                var orders = await _db.Orders.CountAsync(o => o.CreatedAt.Date == date);
                result.Add(new SalesChartDto
                {
                    Label = date.ToString("ddd dd"),
                    Revenue = revenue,
                    Orders = orders
                });
            }
        }
        else if (period == "monthly")
        {
            for (int i = 11; i >= 0; i--)
            {
                var month = now.AddMonths(-i);
                var revenue = await _db.Orders
                    .Where(o => o.CreatedAt.Year == month.Year &&
                                o.CreatedAt.Month == month.Month &&
                                o.PaymentStatus == PaymentStatus.Paid)
                    .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
                var orders = await _db.Orders.CountAsync(o =>
                    o.CreatedAt.Year == month.Year && o.CreatedAt.Month == month.Month);
                result.Add(new SalesChartDto
                {
                    Label = month.ToString("MMM yy"),
                    Revenue = revenue,
                    Orders = orders
                });
            }
        }

        return ApiResponse<List<SalesChartDto>>.Ok(result);
    }

    public async Task<ApiResponse<List<OrderListItemDto>>> GetRecentOrdersAsync(int count)
    {
        var orders = await _db.Orders
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt)
            .Take(count)
            .AsNoTracking()
            .ToListAsync();

        return ApiResponse<List<OrderListItemDto>>.Ok(_mapper.Map<List<OrderListItemDto>>(orders));
    }

    public async Task<ApiResponse<List<BestSellerDto>>> GetBestSellersAsync(int count)
    {
        var products = await _db.Products
            .Include(p => p.Images)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.SoldCount)
            .Take(count)
            .AsNoTracking()
            .ToListAsync();

        return ApiResponse<List<BestSellerDto>>.Ok(_mapper.Map<List<BestSellerDto>>(products));
    }

    public async Task<ApiResponse<List<LowStockDto>>> GetLowStockProductsAsync()
    {
        var products = await _db.Products
            .Include(p => p.Images)
            .Where(p => p.IsActive && p.StockQuantity <= p.LowStockThreshold)
            .OrderBy(p => p.StockQuantity)
            .AsNoTracking()
            .ToListAsync();

        return ApiResponse<List<LowStockDto>>.Ok(_mapper.Map<List<LowStockDto>>(products));
    }

    public async Task<ApiResponse<VisitorStatsDto>> GetVisitorStatsAsync() =>
        ApiResponse<VisitorStatsDto>.Ok(await GetVisitorStatsInternalAsync());

    private async Task<VisitorStatsDto> GetVisitorStatsInternalAsync()
    {
        var today = DateTime.UtcNow.Date;
        return new VisitorStatsDto
        {
            TotalVisitors = await _db.VisitorLogs.CountAsync(),
            GuestVisitors = await _db.VisitorLogs.CountAsync(v => v.IsGuest),
            RegisteredUsers = await _db.VisitorLogs.CountAsync(v => !v.IsGuest),
            TodayVisitors = await _db.VisitorLogs.CountAsync(v => v.VisitedAt.Date == today),
            WeeklyVisitors = await _db.VisitorLogs.CountAsync(v => v.VisitedAt >= DateTime.UtcNow.AddDays(-7)),
            MonthlyVisitors = await _db.VisitorLogs.CountAsync(v => v.VisitedAt >= DateTime.UtcNow.AddDays(-30))
        };
    }
}
