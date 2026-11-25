using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Application.DTOs.Orders;

/// <summary>Guest order lookup: the order number plus the e-mail or mobile number used at checkout.</summary>
public class TrackOrderRequest
{
    public string OrderNumber { get; set; } = string.Empty;
    /// <summary>The e-mail address or mobile number given at checkout.</summary>
    public string Contact { get; set; } = string.Empty;
}

/// <summary>Everything a guest may learn about an order: no address, phone, e-mail or payment data.</summary>
public class OrderTrackingDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public OrderStatus Status { get; set; }
    public DateTime PlacedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? TrackingNumber { get; set; }
    public List<OrderTrackingItemDto> Items { get; set; } = [];
    /// <summary>Courier, AWB, status and timeline once a shipment exists; no internal fields.</summary>
    public EcommerceApp.Application.DTOs.Shipments.OrderShipmentDto? Shipment { get; set; }
}

public class OrderTrackingItemDto
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}
