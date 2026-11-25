using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EcommerceApp.Infrastructure.Services;

/// <summary>
/// Same pattern as RazorpayConfigService: the mode is a database setting (default test), the credentials come from the
/// server configuration. The tokens are read only from the environment variables Delhivery__ApiTokenTest and
/// Delhivery__ApiToken; they are never stored, logged, returned by an API or sent to the browser.
/// </summary>
public class DelhiveryConfigService : IDelhiveryConfigService
{
    public const string Test = ShipmentConstants.Test;
    public const string Live = ShipmentConstants.Live;
    public const string ModeKey = "delhivery_mode";
    public const string AutoCreateKey = "delhivery_auto_create";
    private const string Group = "shipping";

    private const string DefaultTestUrl = "https://staging-express.delhivery.com";
    private const string DefaultLiveUrl = "https://track.delhivery.com";
    private const string DefaultPickupLocation = "Ganpati Herbal Ayurveda";

    private readonly IConfiguration _config;
    private readonly ISettingsService _settings;
    private readonly AppDbContext _db;

    public DelhiveryConfigService(IConfiguration config, ISettingsService settings, AppDbContext db)
    {
        _config = config;
        _settings = settings;
        _db = db;
    }

    /// <summary>The exact name registered in Delhivery One – it must match case and spaces.</summary>
    public string PickupLocation =>
        string.IsNullOrWhiteSpace(_config["Delhivery:PickupLocation"]) ? DefaultPickupLocation : _config["Delhivery:PickupLocation"]!;

    private const string DefaultPickupLocationTest = "GANPATIHERBAL SURFACE";

    /// <summary>Staging and production have different registered pickup locations; the right one is chosen by mode.</summary>
    public string PickupLocationFor(string mode)
    {
        if (mode == ShipmentConstants.Test)
            return string.IsNullOrWhiteSpace(_config["Delhivery:PickupLocationTest"]) ? DefaultPickupLocationTest : _config["Delhivery:PickupLocationTest"]!;
        return string.IsNullOrWhiteSpace(_config["Delhivery:PickupLocationLive"]) ? PickupLocation : _config["Delhivery:PickupLocationLive"]!;
    }

    /// <summary>
    /// Not set at all = the documented default, test (a fresh environment can never talk to the live account by accident).
    /// A stored value that is neither 'test' nor 'live' FAILS CLOSED with a configuration error – it is never read as test.
    /// </summary>
    public async Task<string> GetModeAsync()
    {
        var res = await _settings.GetSettingValueAsync(ModeKey);
        if (!res.Success) return Test;

        var value = (res.Data ?? "").Trim().ToLowerInvariant();
        if (value == Test || value == Live) return value;
        throw new DelhiveryConfigurationException($"The Delhivery setting '{ModeKey}' is invalid: it must be 'test' or 'live'. Delhivery is disabled until a SuperAdmin selects a mode.");
    }

    private string BaseUrl(string mode) => mode == Live
        ? Url(_config["Delhivery:BaseUrlLive"], DefaultLiveUrl)
        : Url(_config["Delhivery:BaseUrlTest"], DefaultTestUrl);

    private static string Url(string? configured, string fallback) =>
        string.IsNullOrWhiteSpace(configured) ? fallback : configured.Trim().TrimEnd('/');

    public DelhiveryCredentials? GetCredentials(string mode)
    {
        var token = _config[mode == Live ? "Delhivery:ApiToken" : "Delhivery:ApiTokenTest"];
        return string.IsNullOrWhiteSpace(token) ? null : new DelhiveryCredentials(mode, BaseUrl(mode), token.Trim());
    }

    public async Task<DelhiveryCredentials?> GetActiveCredentialsAsync() => GetCredentials(await GetModeAsync());

    public async Task<DelhiveryModeDto> GetInfoAsync()
    {
        string mode;
        string? error = null;
        try { mode = await GetModeAsync(); }
        catch (DelhiveryConfigurationException ex) { mode = "invalid"; error = ex.Message; }     // shown to the admin so it can be repaired

        var auto = await _settings.GetSettingValueAsync(AutoCreateKey);
        return new DelhiveryModeDto
        {
            Mode = mode,
            ConfigurationError = error,
            TestConfigured = GetCredentials(Test) != null,
            LiveConfigured = GetCredentials(Live) != null,
            PickupLocation = PickupLocation,
            ActivePickupLocation = error == null ? PickupLocationFor(mode) : "",
            ActiveBaseUrl = error == null ? BaseUrl(mode) : "",
            AutoCreateShipment = error == null && auto.Success && auto.Data == "true",
            WebhookEnabled = _config.GetValue("Delhivery:EnableWebhook", false)
        };
    }

    public async Task<ApiResponse<DelhiveryModeDto>> SetModeAsync(string mode, AuditContext audit)
    {
        mode = (mode ?? "").Trim().ToLowerInvariant();
        if (mode != Test && mode != Live)
            return ApiResponse<DelhiveryModeDto>.Fail("Mode must be 'test' or 'live'.");

        // a corrupt stored mode must be repairable from the admin panel, so it is only reported here, not thrown
        string previous;
        try { previous = await GetModeAsync(); }
        catch (DelhiveryConfigurationException) { previous = "invalid"; }

        if (mode == Live && GetCredentials(Live) == null)
        {
            await WriteAuditAsync("DelhiveryModeChangeRejected", $"{previous} -> {mode} refused: live token is not configured on the server", audit);
            return ApiResponse<DelhiveryModeDto>.Fail("The Delhivery live API token is not configured on the server, so Live mode cannot be selected.");
        }

        // the new mode, the forced-off automatic creation and the audit row are saved together
        await using var tx = await _db.Database.BeginTransactionAsync();
        await _settings.SetSettingValueAsync(ModeKey, mode, Group);
        await _settings.SetSettingValueAsync(AutoCreateKey, "false", Group);     // a mode change never leaves automatic creation on
        await WriteAuditAsync("DelhiveryModeChanged", $"{previous} -> {mode}; automatic shipment creation forced off", audit);
        await tx.CommitAsync();

        return ApiResponse<DelhiveryModeDto>.Ok(await GetInfoAsync(), $"Delhivery is now in {mode.ToUpperInvariant()} mode.");
    }

    private async Task WriteAuditAsync(string action, string description, AuditContext audit)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = audit.UserId,
            Action = action,
            EntityType = nameof(WebsiteSetting),
            EntityId = ModeKey,
            Description = description,
            IpAddress = audit.IpAddress,
            UserAgent = audit.UserAgent is { Length: > 500 } ua ? ua[..500] : audit.UserAgent
        });
        await _db.SaveChangesAsync();
    }
}
