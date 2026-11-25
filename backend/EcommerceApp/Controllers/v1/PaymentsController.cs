using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class PaymentsController : BaseController
{
    private readonly IPaymentService _paymentService;
    private readonly IRazorpayConfigService _rzpConfig;

    public PaymentsController(IPaymentService paymentService, IRazorpayConfigService rzpConfig)
    {
        _paymentService = paymentService;
        _rzpConfig = rzpConfig;
    }

    // admin panel: current mode and whether both key sets are configured
    [HttpGet("razorpay/mode")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetMode() =>
        ApiResult(ApiResponse<RazorpayModeDto>.Ok(await _rzpConfig.GetInfoAsync()));

    [HttpPut("razorpay/mode")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> SetMode([FromBody] SetRazorpayModeDto dto) =>
        ApiResult(await _rzpConfig.SetModeAsync(dto?.Mode ?? "",
            new AuditContext(CurrentUserId, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString())));

    [HttpPost("razorpay/create-order/{orderId:guid}")]
    public async Task<IActionResult> CreateRazorpayOrder(Guid orderId) =>
        ApiResult(await _paymentService.CreateRazorpayOrderAsync(
            orderId, IsAuthenticated ? CurrentUserId : null, User.IsInRole("SuperAdmin")));

    [HttpPost("razorpay/verify")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentDto dto) =>
        ApiResult(await _paymentService.VerifyPaymentAsync(dto, Request.Headers["X-Session-Id"].FirstOrDefault()));

    [HttpPost("razorpay/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();
        return ApiResult(await _paymentService.ProcessWebhookAsync(payload, signature));
    }

    [HttpPost("{orderId:guid}/refund")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> InitiateRefund(Guid orderId, [FromBody] RefundRequest? req) =>
        ApiResult(await _paymentService.InitiateRefundAsync(orderId, req?.Amount));

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams paging) =>
        ApiResult(await _paymentService.GetAllAsync(paging));

    [HttpGet("order/{orderId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetByOrder(Guid orderId) =>
        ApiResult(await _paymentService.GetByOrderIdAsync(orderId, CurrentUserId, User.IsInRole("SuperAdmin")));

    public record RefundRequest(decimal? Amount);
}
