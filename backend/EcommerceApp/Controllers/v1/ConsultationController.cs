using EcommerceApp.Application.Common;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

public class ConsultationController : BaseController
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;

    public ConsultationController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookConsultationDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.PreferredDate))
        {
            if (!DateOnly.TryParse(dto.PreferredDate, System.Globalization.CultureInfo.InvariantCulture, out var wanted))
                return BadRequest(ApiResponse<object>.Fail("Please choose a valid date for the consultation."));
            var todayIndia = DateOnly.FromDateTime(DateTime.UtcNow.AddMinutes(330));
            if (wanted < todayIndia)
                return BadRequest(ApiResponse<object>.Fail("The date you chose has already passed. Please choose today or a later date."));
        }

        var request = new ConsultationRequest
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            Concern = dto.Concern,
            PreferredDate = dto.PreferredDate,
            PreferredTime = dto.PreferredTime,
            DoshaType = dto.DoshaType
        };
        _db.ConsultationRequests.Add(request);
        await _db.SaveChangesAsync();

        _ = _emailService.SendConsultationConfirmationAsync(dto.Email, dto.Name, dto.PreferredDate, dto.PreferredTime, dto.Concern);
        _ = _emailService.SendConsultationNotifyAdminAsync(dto.Name, dto.Email, dto.Phone, dto.Concern, dto.PreferredDate, dto.PreferredTime, dto.DoshaType);

        return Ok(ApiResponse<object>.Ok(new { id = request.Id }, "Consultation booked successfully! We'll contact you soon."));
    }

    [HttpGet, Authorize]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
    {
        var query = _db.ConsultationRequests.AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ConsultationStatus>(status, true, out var s))
            query = query.Where(c => c.Status == s);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
    }

    [HttpPatch("{id}/status"), Authorize]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateConsultationStatusDto dto)
    {
        var request = await _db.ConsultationRequests.FindAsync(id);
        if (request == null) return NotFound(ApiResponse<object>.NotFound());
        if (Enum.TryParse<ConsultationStatus>(dto.Status, true, out var status))
            request.Status = status;
        request.AdminNotes = dto.AdminNotes ?? request.AdminNotes;
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { }, "Status updated"));
    }
}

public record BookConsultationDto(string Name, string Email, string Phone, string Concern, string? PreferredDate, string? PreferredTime, string? DoshaType);
public record UpdateConsultationStatusDto(string Status, string? AdminNotes);
