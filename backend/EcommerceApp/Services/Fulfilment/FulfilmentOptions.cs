namespace EcommerceApp.Infrastructure.Services.Fulfilment;

/// <summary>Non-secret settings (section "Delhivery:Fulfilment").</summary>
public sealed class FulfilmentOptions
{
    public bool Enabled { get; set; } = true;
    public int TickSeconds { get; set; } = 30;
    /// <summary>Test mode against a Production host environment is refused unless this is set.</summary>
    public bool AllowTestModeInProduction { get; set; }
    public int BatchSize { get; set; } = 20;
    public int LeaseMinutes { get; set; } = 3;
    public int MaxCreateAttempts { get; set; } = 3;
    public int RetryBackoffMinutes { get; set; } = 5;
    public int ReconcileDelayMinutes { get; set; } = 10;
    public int MaxReconcileAttempts { get; set; } = 6;
    public int TrackIntervalMinutes { get; set; } = 60;
    public int OutForDeliveryIntervalMinutes { get; set; } = 30;
    public int MaxTrackFailures { get; set; } = 10;
    public int MaxNotifyFailures { get; set; } = 5;
}
