using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Auth;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace EcommerceApp.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    // Password-reset policy
    private const int OtpValidMinutes = 10;
    private const int MaxOtpAttempts = 5;
    private const int ResendCooldownSeconds = 60;
    private const int MaxSendsPerHour = 5;
    private const int ResetGrantMinutes = 10;

    public AuthService(AppDbContext db, IMapper mapper, ITokenService tokenService, IEmailService emailService,
        IConfiguration config, ILogger<AuthService> logger)
    {
        _db = db;
        _mapper = mapper;
        _tokenService = tokenService;
        _emailService = emailService;
        _config = config;
        _logger = logger;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
            return ApiResponse<AuthResponseDto>.Fail("Email already registered.");

        var user = new User
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Phone = dto.Phone,
            Role = UserRole.Customer
        };

        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        _ = _emailService.SendWelcomeAsync(user.Email, user.FirstName);

        return BuildAuthResponse(user, "Registration successful.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return ApiResponse<AuthResponseDto>.Fail("Invalid email or password.", 401);

        if (!user.IsActive)
            return ApiResponse<AuthResponseDto>.Fail("Account is deactivated. Contact support.", 403);

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.LoginHistories.AddAsync(new LoginHistory
        {
            UserId = user.Id,
            Success = true,
            LoginAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return BuildAuthResponse(user, "Login successful.");
    }

    // ── Password reset (email OTP) ───────────────────────────────────────────
    // Step 1 forgot-password: email an OTP. Step 2 verify-reset-otp: exchange the OTP for a single-use grant.
    // Step 3 reset-password: set the new password with the grant. Only hashes are stored.

    private const string GenericSentMessage = "If this email is registered, a verification code has been sent.";
    private const string InvalidOtpMessage = "Invalid or expired code.";
    private const string InvalidSessionMessage = "Your reset session is invalid or has expired. Please start again.";

    private async Task<User?> FindResetUserAsync(string email, string? portal)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.Trim().ToLower());
        if (user == null || !user.IsActive) return null;

        // each login portal only resets its own kind of account
        var isAdmin = user.Role == UserRole.SuperAdmin;
        if (string.Equals(portal, "admin", StringComparison.OrdinalIgnoreCase) && !isAdmin) return null;
        if (string.Equals(portal, "customer", StringComparison.OrdinalIgnoreCase) && isAdmin) return null;
        return user;
    }

    private string HashOtp(Guid userId, string otp)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{userId}:{otp}")));
    }

    private static string HashGrant(string grant) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(grant)));

    private static bool SafeEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));

    public async Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await FindResetUserAsync(dto.Email, dto.Portal);
        // Same answer whether or not the account exists, so emails cannot be enumerated.
        if (user == null) return ApiResponse<string>.Ok(string.Empty, GenericSentMessage);

        var now = DateTime.UtcNow;

        if (user.PasswordResetLastSentAt.HasValue &&
            (now - user.PasswordResetLastSentAt.Value).TotalSeconds < ResendCooldownSeconds)
        {
            _logger.LogWarning("Password reset OTP requested too soon for user {UserId}", user.Id);
            return ApiResponse<string>.Ok(string.Empty, GenericSentMessage);
        }

        if (!user.PasswordResetWindowStart.HasValue || (now - user.PasswordResetWindowStart.Value).TotalHours >= 1)
        {
            user.PasswordResetWindowStart = now;
            user.PasswordResetSendCount = 0;
        }
        if (user.PasswordResetSendCount >= MaxSendsPerHour)
        {
            _logger.LogWarning("Password reset OTP hourly limit reached for user {UserId}", user.Id);
            return ApiResponse<string>.Ok(string.Empty, GenericSentMessage);
        }

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        user.PasswordResetOtpHash = HashOtp(user.Id, otp);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = now.AddMinutes(OtpValidMinutes);
        user.PasswordResetAttempts = 0;
        user.PasswordResetLastSentAt = now;
        user.PasswordResetSendCount++;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset OTP issued for user {UserId}", user.Id);
        _ = _emailService.SendPasswordResetOtpAsync(user.Email, user.FirstName, otp, OtpValidMinutes);

        return ApiResponse<string>.Ok(string.Empty, GenericSentMessage);
    }

    public async Task<ApiResponse<string>> VerifyResetOtpAsync(VerifyResetOtpDto dto)
    {
        var user = await FindResetUserAsync(dto.Email, dto.Portal);
        if (user == null || user.PasswordResetOtpHash == null ||
            !user.PasswordResetExpiry.HasValue || user.PasswordResetExpiry.Value < DateTime.UtcNow)
            return ApiResponse<string>.Fail(InvalidOtpMessage, 400);

        if (!SafeEquals(user.PasswordResetOtpHash, HashOtp(user.Id, dto.Otp)))
        {
            user.PasswordResetAttempts++;
            var locked = user.PasswordResetAttempts >= MaxOtpAttempts;
            if (locked)
            {
                // too many wrong guesses - burn the code so a new one must be requested
                user.PasswordResetOtpHash = null;
                user.PasswordResetExpiry = null;
            }
            await _db.SaveChangesAsync();
            _logger.LogWarning("Wrong password reset OTP for user {UserId} (attempt {Attempt})", user.Id, user.PasswordResetAttempts);
            return ApiResponse<string>.Fail(locked ? "Too many incorrect attempts. Please request a new code." : InvalidOtpMessage, 400);
        }

        var grant = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        user.PasswordResetOtpHash = null;
        user.PasswordResetAttempts = 0;
        user.PasswordResetToken = HashGrant(grant);
        user.PasswordResetExpiry = DateTime.UtcNow.AddMinutes(ResetGrantMinutes);
        await _db.SaveChangesAsync();

        return ApiResponse<string>.Ok(grant, "Code verified.");
    }

    public async Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await FindResetUserAsync(dto.Email, dto.Portal);
        // the grant only exists after the OTP step succeeded (the OTP hash is cleared by then)
        if (user == null || user.PasswordResetOtpHash != null || user.PasswordResetToken == null ||
            !user.PasswordResetExpiry.HasValue || user.PasswordResetExpiry.Value < DateTime.UtcNow ||
            !SafeEquals(user.PasswordResetToken, HashGrant(dto.ResetToken)))
            return ApiResponse<string>.Fail(InvalidSessionMessage, 400);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.PasswordChangedAt = DateTime.UtcNow;   // invalidates every token issued before now
        user.PasswordResetToken = null;
        user.PasswordResetOtpHash = null;
        user.PasswordResetExpiry = null;
        user.PasswordResetAttempts = 0;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset completed for user {UserId}", user.Id);
        _ = _emailService.SendPasswordResetConfirmationAsync(user.Email, user.FirstName);

        return ApiResponse<string>.Ok(string.Empty, "Password reset successful. Please sign in with your new password.");
    }

    public async Task<ApiResponse<string>> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return ApiResponse<string>.NotFound("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return ApiResponse<string>.Fail("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync();

        return ApiResponse<string>.Ok("Password changed successfully.");
    }

    public async Task<ApiResponse<UserProfileDto>> GetProfileAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return ApiResponse<UserProfileDto>.NotFound("User not found.");
        return ApiResponse<UserProfileDto>.Ok(_mapper.Map<UserProfileDto>(user));
    }

    public async Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return ApiResponse<UserProfileDto>.NotFound("User not found.");

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.Phone = dto.Phone;
        await _db.SaveChangesAsync();

        return ApiResponse<UserProfileDto>.Ok(_mapper.Map<UserProfileDto>(user));
    }

    private ApiResponse<AuthResponseDto> BuildAuthResponse(User user, string message)
    {
        var token = _tokenService.GenerateToken(user);
        var refresh = _tokenService.GenerateRefreshToken();
        var dto = new AuthResponseDto
        {
            Token = token,
            RefreshToken = refresh,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            User = _mapper.Map<UserProfileDto>(user)
        };
        return ApiResponse<AuthResponseDto>.Ok(dto, message);
    }
}
