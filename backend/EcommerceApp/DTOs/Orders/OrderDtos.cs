using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Application.DTOs.Orders;

public class OrderListDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public OrderStatus Status { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderDetailDto : OrderListDto
{
    public Guid? UserId { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippingCharge { get; set; }
    public decimal TaxAmount { get; set; }
    public string? CouponCode { get; set; }
    public string? Notes { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? CancellationReason { get; set; }
    public RefundStatus RefundStatus { get; set; }

    public AddressSnapshotDto ShippingAddress { get; set; } = null!;
    public AddressSnapshotDto BillingAddress { get; set; } = null!;
    public List<OrderItemDto> Items { get; set; } = [];
    public List<PaymentSummaryDto> Payments { get; set; } = [];
}

public class AddressSnapshotDto
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantInfo { get; set; }
    public string? ProductImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalPrice { get; set; }
}

public class PaymentSummaryDto
{
    public Guid Id { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }
    public decimal Amount { get; set; }
    public string? RazorpayPaymentId { get; set; }
    public DateTime? PaidAt { get; set; }
    public RefundStatus RefundStatus { get; set; }
}

public class CreateOrderDto
{
    public Guid? UserId { get; set; }
    /// <summary>Set by the API from the X-Session-Id header (never trusted from the body); used to clear a guest cart.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? SessionId { get; set; }
    public string? GuestEmail { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestName { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Razorpay;
    public string? CouponCode { get; set; }
    public string? Notes { get; set; }
    public CreateAddressDto ShippingAddress { get; set; } = null!;
    public CreateAddressDto BillingAddress { get; set; } = null!;
    public List<CreateOrderItemDto> Items { get; set; } = [];
}

public class CreateAddressDto
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
}

public class CreateOrderItemDto
{
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; }
}

public class UpdateOrderStatusDto
{
    public OrderStatus Status { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Notes { get; set; }
}

public class DashboardOrderStatsDto
{
    public int Total { get; set; }
    public int Pending { get; set; }
    public int Confirmed { get; set; }
    public int Shipped { get; set; }
    public int Delivered { get; set; }
    public int Cancelled { get; set; }
    public int Returned { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TodayRevenue { get; set; }
    public int TodayOrders { get; set; }
}
