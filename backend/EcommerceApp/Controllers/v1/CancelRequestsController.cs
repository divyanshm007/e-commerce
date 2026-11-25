using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

/// <summary>Admin side of "cancel a dispatched order": the customer asks, an administrator approves or declines.</summary>
[Route("api/v1/cancel-requests")]
[Authorize(Roles = "SuperAdmin")]
public class CancelRequestsController : BaseController
{
    private readonly ICancellationService _cancellation;
    public CancelRequestsController(ICancellationService cancellation) => _cancellation = cancellation;

    private AuditContext Audit() => new(CurrentUserId, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20) =>
        ApiResult(await _cancellation.ListAsync(status, page, pageSize));

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ReviewCancelRequestDto? dto) =>
        ApiResult(await _cancellation.ApproveAsync(id, dto?.Notes, Audit()));

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ReviewCancelRequestDto? dto) =>
        ApiResult(await _cancellation.RejectAsync(id, dto?.Notes, Audit()));
}
