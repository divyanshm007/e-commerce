using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string? GuestEmail { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestName { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Razorpay;
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayPaymentId { get; set; }
    public string? RazorpaySignature { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public decimal ShippingCharge { get; set; } = 0;
    public decimal TaxAmount { get; set; } = 0;
    public decimal TotalAmount { get; set; }
    public Guid? CouponId { get; set; }
    public string? CouponCode { get; set; }
    public string? Notes { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public RefundStatus RefundStatus { get; set; } = RefundStatus.NotRequested;
    public string? RefundId { get; set; }

    // Shipping address snapshot (stored separately from user address book)
    public string ShippingFullName { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string ShippingLine1 { get; set; } = string.Empty;
    public string? ShippingLine2 { get; set; }
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingState { get; set; } = string.Empty;
    public string ShippingPostalCode { get; set; } = string.Empty;
    public string ShippingCountry { get; set; } = "India";

    // Billing address snapshot
    public string BillingFullName { get; set; } = string.Empty;
    public string BillingPhone { get; set; } = string.Empty;
    public string BillingLine1 { get; set; } = string.Empty;
    public string? BillingLine2 { get; set; }
    public string BillingCity { get; set; } = string.Empty;
    public string BillingState { get; set; } = string.Empty;
    public string BillingPostalCode { get; set; } = string.Empty;
    public string BillingCountry { get; set; } = "India";

    public User? User { get; set; }
    public Coupon? Coupon { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
