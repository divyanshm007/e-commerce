using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EcommerceApp.Infrastructure.Services;

public class RazorpayConfigService : IRazorpayConfigService
{
    public const string Test = "test";
    public const string Live = "live";
    private const string ModeKey = "razorpay_mode";

    private readonly IConfiguration _config;
    private readonly ISettingsService _settings;
    private readonly AppDbContext _db;

    public RazorpayConfigService(IConfiguration config, ISettingsService settings, AppDbContext db)
    {
        _config = config;
        _settings = settings;
        _db = db;
    }

    public async Task<string> GetModeAsync()
    {
        var res = await _settings.GetSettingValueAsync(ModeKey);
        // never set at all: test, so a fresh environment never takes real payments by accident
        if (!res.Success) return Test;

        // anything else that is not exactly test or live is a corrupt setting: stop instead of guessing
        var value = (res.Data ?? "").Trim().ToLowerInvariant();
        if (value == Test || value == Live) return value;
        throw new RazorpayConfigurationException($"The payment setting '{ModeKey}' is invalid: it must be 'test' or 'live'. Online payment is disabled until a SuperAdmin selects a mode.");
    }

    public RazorpayCredentials? GetCredentials(string mode)
    {
        var section = mode == Live ? "Razorpay:Live" : "Razorpay:Test";
        var keyId = _config[$"{section}:KeyId"];
        var keySecret = _config[$"{section}:KeySecret"];
        return string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret)
            ? null
            : new RazorpayCredentials(mode, keyId, keySecret);
    }

    public async Task<RazorpayCredentials?> GetActiveCredentialsAsync() =>
        GetCredentials(await GetModeAsync());

    public async Task<RazorpayModeDto> GetInfoAsync()
    {
        string mode;
        string? error = null;
        try { mode = await GetModeAsync(); }
        catch (RazorpayConfigurationException ex) { mode = "invalid"; error = ex.Message; }     // shown to the admin so it can be repaired
        return new RazorpayModeDto
        {
            Mode = mode,
            ConfigurationError = error,
            KeyId = error == null ? GetCredentials(mode)?.KeyId : null,
            TestConfigured = GetCredentials(Test) != null,
            LiveConfigured = GetCredentials(Live) != null
        };
    }

    public async Task<ApiResponse<RazorpayModeDto>> SetModeAsync(string mode, AuditContext audit)
    {
        mode = (mode ?? "").Trim().ToLowerInvariant();
        if (mode != Test && mode != Live)
            return ApiResponse<RazorpayModeDto>.Fail("Mode must be 'test' or 'live'.");
        // a corrupt stored mode must be repairable from the admin panel, so it is only reported here, not thrown
        string previous;
        try { previous = await GetModeAsync(); }
        catch (RazorpayConfigurationException) { previous = "invalid"; }

        if (GetCredentials(mode) == null)
        {
            await WriteAuditAsync("RazorpayModeChangeRejected", $"{previous} -> {mode} refused: {mode} keys are not configured on the server", audit);
            return ApiResponse<RazorpayModeDto>.Fail($"Razorpay {mode} keys are not configured on the server.");
        }

        // the new mode and its audit row are saved together
        await using var tx = await _db.Database.BeginTransactionAsync();
        await _settings.SetSettingValueAsync(ModeKey, mode, "payment");
        await WriteAuditAsync("RazorpayModeChanged", $"{previous} -> {mode}", audit);
        await tx.CommitAsync();
        return ApiResponse<RazorpayModeDto>.Ok(await GetInfoAsync(), $"Payments are now in {mode.ToUpperInvariant()} mode.");
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
