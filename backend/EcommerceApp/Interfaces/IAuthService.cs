using EcommerceApp.Application.DTOs.Auth;
using EcommerceApp.Application.Common;

namespace EcommerceApp.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterDto dto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginDto dto);
    Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordDto dto);
    Task<ApiResponse<string>> VerifyResetOtpAsync(VerifyResetOtpDto dto);
    Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordDto dto);
    Task<ApiResponse<string>> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<ApiResponse<UserProfileDto>> GetProfileAsync(Guid userId);
    Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
}
