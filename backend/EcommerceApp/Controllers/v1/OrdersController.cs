using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EcommerceApp.API.Controllers.v1;

public class OrdersController : BaseController
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams paging) =>
        ApiResult(await _orderService.GetAllAsync(paging));

    private bool IsAdmin => User.IsInRole("SuperAdmin");

    // an order belongs to its buyer; only that user or an admin may read it, and a guest order only an admin
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id) =>
        ApiResult(await _orderService.GetByIdForCallerAsync(id, CurrentUserId, IsAdmin));

    /// <summary>The courier shipment of an order: AWB, courier, status and timeline. Owner or admin only; other callers get 404.</summary>
    [HttpGet("{id:guid}/shipment")]
    [Authorize]
    public async Task<IActionResult> GetShipment(Guid id, [FromServices] IFulfilmentService fulfilment) =>
        ApiResult(await fulfilment.GetOrderShipmentAsync(id, CurrentUserId, IsAdmin));

    [HttpGet("number/{orderNumber}")]
    [Authorize]
    public async Task<IActionResult> GetByOrderNumber(string orderNumber) =>
        ApiResult(await _orderService.GetByOrderNumberForCallerAsync(orderNumber, CurrentUserId, IsAdmin));

    /// <summary>Guest tracking: order number + the e-mail or mobile number used at checkout. Minimal data, generic failure.</summary>
    [HttpPost("track")]
    [AllowAnonymous]
    [EnableRateLimiting("order-track")]
    public async Task<IActionResult> Track([FromBody] TrackOrderRequest req) =>
        ApiResult(await _orderService.TrackGuestOrderAsync(req?.OrderNumber ?? "", req?.Contact ?? ""));

    [HttpGet("my-orders")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMyOrders() =>
        ApiResult(await _orderService.GetByUserAsync(CurrentUserId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        // The buyer is always the authenticated caller — never an id supplied in the request body.
        dto.UserId = IsAuthenticated ? CurrentUserId : null;
        if (!IsAuthenticated)
        {
            if (string.IsNullOrWhiteSpace(dto.GuestName))
                return ApiResult(ApiResponse<OrderDetailDto>.Fail("Guest name is required for guest checkout."));
            if (!System.Net.Mail.MailAddress.TryCreate(dto.GuestEmail, out _))
                return ApiResult(ApiResponse<OrderDetailDto>.Fail("A valid guest email is required for guest checkout."));
            // without an account an order can only be paid online: cash on delivery needs a logged-in customer
            if (dto.PaymentMethod == PaymentMethod.CashOnDelivery)
                return ApiResult(ApiResponse<OrderDetailDto>.Fail("Cash on delivery is available only for logged-in customers. Please pay online or log in."));
        }
        dto.SessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
        return ApiResult(await _orderService.CreateAsync(dto));
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusDto dto) =>
        ApiResult(await _orderService.UpdateStatusAsync(id, dto));

    [HttpPatch("{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelRequest req, [FromServices] ICancellationService cancellation)
    {
        // a customer cancelling an order that is already shipped / with the courier only sends a request for approval
        if (!IsAdmin)
        {
            var asRequest = await cancellation.RequestIfDispatchedAsync(id, req?.Reason, CurrentUserId);
            if (asRequest != null) return ApiResult(asRequest);
        }
        return ApiResult(await _orderService.CancelAsync(id, req?.Reason, CurrentUserId, IsAdmin));
    }

    /// <summary>The caller's latest cancellation request for the order (status Pending / Approved / Rejected), or null.</summary>
    [HttpGet("{id:guid}/cancel-request")]
    [Authorize]
    public async Task<IActionResult> GetCancelRequest(Guid id, [FromServices] ICancellationService cancellation) =>
        ApiResult(await cancellation.GetMineAsync(id, CurrentUserId));

    [HttpGet("{id:guid}/invoice")]
    [Authorize]
    public async Task<IActionResult> DownloadInvoice(Guid id)
    {
        var result = await _orderService.GenerateInvoiceAsync(id, CurrentUserId, IsAdmin);
        if (!result.Success) return ApiResult(result);
        return File(result.Data!, "application/pdf", $"invoice-{id}.pdf");
    }

    /// <summary>Reports page: totals for a date range (yyyy-MM-dd, India calendar days). Admin only.</summary>
    [HttpGet("report")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetReport([FromQuery] DateOnly? from, [FromQuery] DateOnly? to) =>
        ApiResult(await _orderService.GetReportAsync(from, to));

    [HttpGet("stats")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetStats() =>
        ApiResult(await _orderService.GetStatsAsync());

    public record CancelRequest(string? Reason);
}
