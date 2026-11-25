using EcommerceApp.Application.Common;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EcommerceApp.API.Controllers.v1;

[Route("api/v1/returns")]
public class ReturnController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    public ReturnController(AppDbContext db, IEmailService email) { _db = db; _email = email; }

    [HttpPost, Authorize]
    public async Task<IActionResult> Create([FromBody] CreateReturnRequestDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        // only the buyer can ask to return their own order, and only once it has been delivered
        var order = await _db.Orders.Include(o => o.User).FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.UserId == userId);
        if (order == null) return NotFound(ApiResponse<object>.NotFound("Order not found"));
        if (order.Status != OrderStatus.Delivered)
            return BadRequest(ApiResponse<object>.Fail("A return can only be requested for a delivered order."));

        var existing = await _db.ReturnRequests.AnyAsync(r => r.OrderId == dto.OrderId);
        if (existing) return BadRequest(ApiResponse<object>.Fail("A return request already exists for this order"));

        var request = new ReturnRequest
        {
            OrderId = dto.OrderId,
            UserId = userId,
            OrderNumber = order.OrderNumber,
            CustomerName = order.User != null ? $"{order.User.FirstName} {order.User.LastName}" : order.GuestName ?? "",
            CustomerEmail = order.User?.Email ?? order.GuestEmail ?? "",
            Reason = dto.Reason,
            Description = dto.Description
        };
        _db.ReturnRequests.Add(request);
        await _db.SaveChangesAsync();

        // nothing is returned yet: the customer and the admin are told the request is waiting for approval
        if (!string.IsNullOrWhiteSpace(request.CustomerEmail)) _ = _email.SendReturnRequestedAsync(request.CustomerEmail, request.CustomerName, request.OrderNumber, request.Reason);
        _ = _email.SendReturnRequestedAdminAsync(request.OrderNumber, request.CustomerName, request.CustomerEmail, request.Reason, request.Description);
        return Ok(ApiResponse<object>.Ok(new { id = request.Id }, "Return request submitted. We have e-mailed you; the return starts after our team approves it."));
    }

    [HttpGet("my"), Authorize]
    public async Task<IActionResult> GetMine()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requests = await _db.ReturnRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.OrderNumber, r.Reason, r.Status, r.CreatedAt, r.AdminNotes })
            .ToListAsync();
        return Ok(ApiResponse<object>.Ok(requests));
    }

    [HttpGet, Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
    {
        var query = _db.ReturnRequests.AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ReturnRequestStatus>(status, true, out var s))
            query = query.Where(r => r.Status == s);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new { r.Id, r.OrderNumber, r.CustomerName, r.CustomerEmail, r.Reason, r.Status, r.CreatedAt })
            .ToListAsync();
        return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
    }

    [HttpPatch("{id}/status"), Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateReturnStatusDto dto)
    {
        var request = await _db.ReturnRequests.FindAsync(id);
        if (request == null) return NotFound(ApiResponse<object>.NotFound());
        var before = request.Status;
        if (Enum.TryParse<ReturnRequestStatus>(dto.Status, true, out var status))
            request.Status = status;
        request.AdminNotes = dto.AdminNotes ?? request.AdminNotes;
        await _db.SaveChangesAsync();

        // the customer hears about every real change of decision (approved / rejected / completed), once
        if (request.Status != before && request.Status != ReturnRequestStatus.Pending && !string.IsNullOrWhiteSpace(request.CustomerEmail))
            _ = _email.SendReturnDecisionAsync(request.CustomerEmail, request.CustomerName, request.OrderNumber, request.Status.ToString(), request.AdminNotes);
        return Ok(ApiResponse<object>.Ok(new { }, "Status updated"));
    }
}

public record CreateReturnRequestDto(Guid OrderId, string Reason, string? Description);
public record UpdateReturnStatusDto(string Status, string? AdminNotes);
