using EcommerceApp.Application.DTOs.Auth;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EcommerceApp.API.Controllers.v1;

public class AuthController : BaseController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto) =>
        ApiResult(await _authService.RegisterAsync(dto));

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto) =>
        ApiResult(await _authService.LoginAsync(dto));

    [HttpPost("forgot-password")]
    [EnableRateLimiting("password-reset")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto) =>
        ApiResult(await _authService.ForgotPasswordAsync(dto));

    [HttpPost("verify-reset-otp")]
    [EnableRateLimiting("password-reset")]
    public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyResetOtpDto dto) =>
        ApiResult(await _authService.VerifyResetOtpAsync(dto));

    [HttpPost("reset-password")]
    [EnableRateLimiting("password-reset")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto) =>
        ApiResult(await _authService.ResetPasswordAsync(dto));

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto) =>
        ApiResult(await _authService.ChangePasswordAsync(CurrentUserId, dto));

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile() =>
        ApiResult(await _authService.GetProfileAsync(CurrentUserId));

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto) =>
        ApiResult(await _authService.UpdateProfileAsync(CurrentUserId, dto));
}
