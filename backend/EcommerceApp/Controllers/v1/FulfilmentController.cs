using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

/// <summary>
/// The admin side of automated order fulfilment: approve or reject an order for dispatch and watch the queues.
/// There is deliberately no "create shipment" endpoint: shipments are created by the background worker after approval.
/// Everything here is SuperAdmin only.
/// </summary>
[Authorize(Roles = "SuperAdmin")]
public class FulfilmentController : BaseController
{
    private readonly IFulfilmentService _fulfilment;

    public FulfilmentController(IFulfilmentService fulfilment) => _fulfilment = fulfilment;

    private AuditContext Audit() => new(CurrentUserId, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard() => ApiResult(await _fulfilment.GetDashboardAsync());

    /// <param name="kind">awaiting-approval, awaiting-shipment, creation-failures, in-transit, delivered or exceptions</param>
    [HttpGet("queue/{kind}")]
    public async Task<IActionResult> Queue(string kind, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        ApiResult(await _fulfilment.ListAsync(kind, page, pageSize));

    [HttpPost("orders/{orderId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid orderId) => ApiResult(await _fulfilment.ApproveAsync(orderId, Audit()));

    [HttpPost("orders/{orderId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid orderId, [FromBody] RejectFulfilmentDto dto) =>
        ApiResult(await _fulfilment.RejectAsync(orderId, dto?.Reason, Audit()));

    [HttpPost("orders/{orderId:guid}/retry")]
    public async Task<IActionResult> Retry(Guid orderId) => ApiResult(await _fulfilment.RetryAsync(orderId, Audit()));

    [HttpPost("orders/{orderId:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid orderId, [FromBody] ResolveFulfilmentDto? dto) =>
        ApiResult(await _fulfilment.ResolveAsync(orderId, dto?.Note, Audit()));

    [HttpGet("orders/{orderId:guid}/shipment")]
    public async Task<IActionResult> Shipment(Guid orderId) =>
        ApiResult(await _fulfilment.GetOrderShipmentAsync(orderId, CurrentUserId, true));
}
