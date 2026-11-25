namespace EcommerceApp.Application.DTOs.Shipments;

/// <summary>
/// What the admin screen may see about the Delhivery configuration. Booleans and non-secret values only:
/// no token, no token fragment, no hash of a token.
/// </summary>
public class DelhiveryModeDto
{
    /// <summary>test, live, or "invalid" when the stored value cannot be trusted (see <see cref="ConfigurationError"/>).</summary>
    public string Mode { get; set; } = "test";
    /// <summary>Set when the stored mode is invalid: Delhivery is disabled (fail closed) until a SuperAdmin selects a mode.</summary>
    public string? ConfigurationError { get; set; }
    public bool TestConfigured { get; set; }
    public bool LiveConfigured { get; set; }
    public string PickupLocation { get; set; } = string.Empty;
    /// <summary>The pickup location used for the active mode (staging and production differ).</summary>
    public string ActivePickupLocation { get; set; } = string.Empty;
    public string ActiveBaseUrl { get; set; } = string.Empty;
    /// <summary>Always false in this phase; automatic shipment creation cannot be switched on from the admin panel.</summary>
    public bool AutoCreateShipment { get; set; }
    public bool WebhookEnabled { get; set; }
}

public class SetDelhiveryModeDto
{
    public string Mode { get; set; } = string.Empty;
}

/// <summary>What a shipment e-mail needs. Category is one of the notifiable shipment statuses.</summary>
public record ShipmentEmailInfo(string OrderNumber, string Category, string? Awb, string Courier, DateOnly? ExpectedDelivery,
    bool IsGuest = true, Guid? OrderId = null);
