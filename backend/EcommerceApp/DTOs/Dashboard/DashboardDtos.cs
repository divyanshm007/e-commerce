namespace EcommerceApp.Application.DTOs.Dashboard;

public class DashboardStatsDto
{
    public int TotalOrders { get; set; }
    public int TotalCustomers { get; set; }
    public int TotalProducts { get; set; }
    public int TotalCategories { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TodayRevenue { get; set; }
    public int TodayOrders { get; set; }
    public int PendingOrders { get; set; }
    public int DeliveredOrders { get; set; }
    public int CancelledOrders { get; set; }
    public int ReturnedOrders { get; set; }
    public int LowStockProducts { get; set; }
    public int AbandonedCarts { get; set; }
    public VisitorStatsDto Visitors { get; set; } = new();
}

public class VisitorStatsDto
{
    public int TotalVisitors { get; set; }
    public int GuestVisitors { get; set; }
    public int RegisteredUsers { get; set; }
    public int TodayVisitors { get; set; }
    public int WeeklyVisitors { get; set; }
    public int MonthlyVisitors { get; set; }
}

public class SalesChartDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
}

public class OrderListItemDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class BestSellerDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int SoldCount { get; set; }
    public decimal Revenue { get; set; }
}

public class LowStockDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int StockQuantity { get; set; }
    public int LowStockThreshold { get; set; }
}
