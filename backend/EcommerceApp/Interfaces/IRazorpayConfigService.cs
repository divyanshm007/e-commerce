using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;

namespace EcommerceApp.Application.Interfaces;

public record RazorpayCredentials(string Mode, string KeyId, string KeySecret);

/// <summary>Resolves which Razorpay key set (test or live) is active. The admin panel switches it.</summary>
public interface IRazorpayConfigService
{
    /// <summary>test (default when never set) or live. A stored value that is neither FAILS CLOSED with a RazorpayConfigurationException.</summary>
    Task<string> GetModeAsync();

    /// <summary>Keys for a mode, or null when that mode is not configured.</summary>
    RazorpayCredentials? GetCredentials(string mode);

    /// <summary>Keys for the active mode, or null when the active mode is not configured.</summary>
    Task<RazorpayCredentials?> GetActiveCredentialsAsync();

    Task<RazorpayModeDto> GetInfoAsync();
    /// <summary>Changes the mode and writes an audit-log row (who, when, from -> to) in the same transaction.</summary>
    Task<ApiResponse<RazorpayModeDto>> SetModeAsync(string mode, AuditContext audit);
}
