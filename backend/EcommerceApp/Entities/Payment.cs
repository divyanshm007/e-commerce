using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid OrderId { get; set; }
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayPaymentId { get; set; }
    public string? RazorpayRefundId { get; set; }
    public PaymentMethod Method { get; set; } = PaymentMethod.Razorpay;
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public RefundStatus RefundStatus { get; set; } = RefundStatus.NotRequested;
    public decimal? RefundAmount { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? RefundedAt { get; set; }
    public string? FailureReason { get; set; }
    public string? WebhookPayload { get; set; }

    public Order Order { get; set; } = null!;
}
