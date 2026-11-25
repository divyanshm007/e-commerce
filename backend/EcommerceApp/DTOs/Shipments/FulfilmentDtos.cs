namespace EcommerceApp.Application.DTOs.Shipments;

public class RejectFulfilmentDto
{
    public string Reason { get; set; } = string.Empty;
}

public class ResolveFulfilmentDto
{
    public string? Note { get; set; }
}

public class FulfilmentDashboardDto
{
    public int AwaitingApproval { get; set; }
    public int ApprovedAwaitingShipment { get; set; }
    public int CreationFailures { get; set; }
    public int InTransit { get; set; }
    public int Delivered { get; set; }
    public int Exceptions { get; set; }
    /// <summary>test or live, or invalid when the stored mode cannot be trusted.</summary>
    public string Mode { get; set; } = "test";
}

/// <summary>One line of an admin queue. No tokens, no raw courier responses.</summary>
public class FulfilmentRowDto
{
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public string? FulfilmentState { get; set; }
    public string? Awb { get; set; }
    public string? ShipmentStatus { get; set; }
    public string? CreationState { get; set; }
    public string? AttentionReason { get; set; }
    public string? LastError { get; set; }
    public int Attempts { get; set; }
    public bool Eligible { get; set; }
    public List<string> Issues { get; set; } = [];
}

public class ShipmentEventDto
{
    public string Status { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime? Time { get; set; }
}

/// <summary>Shipment information for an order. Admin sees the whole of it; customers only the first group.</summary>
public class OrderShipmentDto
{
    public bool HasShipment { get; set; }
    public string? Courier { get; set; }
    public string? Awb { get; set; }
    public string? Status { get; set; }
    /// <summary>Only when Delhivery supplied one.</summary>
    public DateOnly? ExpectedDeliveryDate { get; set; }
    public List<ShipmentEventDto> Timeline { get; set; } = [];

    // admin only (null for customers)
    public string? FulfilmentState { get; set; }
    public string? CreationState { get; set; }
    public string? AttentionReason { get; set; }
    public string? LastError { get; set; }
    public int? Attempts { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public string? Mode { get; set; }
}
