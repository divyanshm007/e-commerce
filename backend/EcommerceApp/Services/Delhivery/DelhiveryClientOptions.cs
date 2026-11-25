namespace EcommerceApp.Infrastructure.Services.Delhivery;

/// <summary>Non-secret client settings (section "Delhivery:Client"). Tokens are never here.</summary>
public sealed class DelhiveryClientOptions
{
    /// <summary>Delhivery documents an average of ~0.3 s and a p99 of ~1.6 s for creation; this leaves a wide margin.</summary>
    public int CreateTimeoutSeconds { get; set; } = 20;

    /// <summary>Documented p99 for tracking is ~0.5 s.</summary>
    public int TrackTimeoutSeconds { get; set; } = 15;

    /// <summary>
    /// UNCONFIRMED by the documentation. Delhivery's sample sends the header "Content-Type: application/json" with a body that starts
    /// "format=json&amp;data=", which is a form-style body. The default follows the sample exactly; the alternative is
    /// "application/x-www-form-urlencoded". To be settled by the first approved staging call.
    /// </summary>
    public string CreateContentType { get; set; } = "application/json";

    /// <summary>Offset of Delhivery's zone-less scan times from UTC (India Standard Time = 330). Unconfirmed assumption.</summary>
    public int ScanTimeOffsetMinutes { get; set; } = 330;
}
