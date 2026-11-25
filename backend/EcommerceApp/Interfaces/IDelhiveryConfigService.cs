using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;

namespace EcommerceApp.Application.Interfaces;

/// <summary>
/// The API token for a Delhivery environment, for the Delhivery HTTP client of a later phase. It exists only in server
/// memory (read from environment variables) and its ToString never prints the token.
/// </summary>
public sealed class DelhiveryCredentials
{
    public DelhiveryCredentials(string mode, string baseUrl, string token)
    {
        Mode = mode; BaseUrl = baseUrl; Token = token;
    }
    public string Mode { get; }
    public string BaseUrl { get; }
    public string Token { get; }
    public override string ToString() => $"Delhivery {Mode} credentials ({BaseUrl})";
}

/// <summary>Who changed a setting, for the audit log.</summary>
public record AuditContext(Guid? UserId, string? IpAddress, string? UserAgent);

/// <summary>Resolves which Delhivery environment (test or live) is active. The admin panel switches it; tokens never leave the server.</summary>
public interface IDelhiveryConfigService
{
    /// <summary>test (default) or live – stored in WebsiteSettings as delhivery_mode.</summary>
    Task<string> GetModeAsync();

    /// <summary>Credentials for a mode, or null when its token variable is not set.</summary>
    DelhiveryCredentials? GetCredentials(string mode);

    /// <summary>Credentials for the active mode, or null when the active mode has no token.</summary>
    Task<DelhiveryCredentials?> GetActiveCredentialsAsync();

    /// <summary>The live pickup location (kept for compatibility).</summary>
    string PickupLocation { get; }

    /// <summary>The pickup location registered in that environment's Delhivery account. Staging and production use different names.</summary>
    string PickupLocationFor(string mode);

    Task<DelhiveryModeDto> GetInfoAsync();

    /// <summary>Changes the mode, forces automatic shipment creation off, and writes an audit-log row.</summary>
    Task<ApiResponse<DelhiveryModeDto>> SetModeAsync(string mode, AuditContext audit);
}
