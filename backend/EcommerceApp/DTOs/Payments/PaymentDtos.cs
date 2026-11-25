using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Application.DTOs.Payments;

public class RazorpayOrderDto
{
    public string RazorpayOrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Key { get; set; } = string.Empty;
    public string Mode { get; set; } = "test";
    public Guid OrderId { get; set; }
}

public class RazorpayModeDto
{
    /// <summary>test, live, or "invalid" when the stored value cannot be trusted (payments are then refused).</summary>
    public string Mode { get; set; } = "test";
    public string? ConfigurationError { get; set; }
    public string? KeyId { get; set; }
    public bool TestConfigured { get; set; }
    public bool LiveConfigured { get; set; }
}

public class SetRazorpayModeDto
{
    public string Mode { get; set; } = string.Empty;
}

public class VerifyPaymentDto
{
    public Guid OrderId { get; set; }
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string RazorpayPaymentId { get; set; } = string.Empty;
    public string RazorpaySignature { get; set; } = string.Empty;
}

public class PaymentListDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }
    public decimal Amount { get; set; }
    public string? RazorpayPaymentId { get; set; }
    public RefundStatus RefundStatus { get; set; }
    public decimal? RefundAmount { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaymentDetailDto : PaymentListDto
{
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayRefundId { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? RefundedAt { get; set; }
}
