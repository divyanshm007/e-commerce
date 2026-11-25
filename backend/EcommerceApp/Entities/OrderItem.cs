using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    /// <summary>pending, confirmed, shipped, delivered, cancelled, returned ... Items ship and refund individually.</summary>
    public string? ItemStatus { get; set; }
    public string? CancelReason { get; set; }
    /// <summary>Courier waybill/shipment id (Delhivery).</summary>
    public string? ShipmentId { get; set; }
    public Guid? PickupId { get; set; }
    public string? CouponCode { get; set; }
    public decimal CouponDiscount { get; set; }
    public string? TransactionId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public Guid? RefundId { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? RefundReason { get; set; }
    public string? RefundStatus { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantInfo { get; set; }
    public string? ProductImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public decimal TaxPercentage { get; set; } = 0;
    public decimal TaxAmount { get; set; } = 0;
    public decimal TotalPrice { get; set; }

    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
