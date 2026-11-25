using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EcommerceApp.API.Controllers.v1;

public class ReferralController : BaseController
{
    private readonly AppDbContext _db;
    public ReferralController(AppDbContext db) { _db = db; }

    [HttpGet("my-code"), Authorize]
    public async Task<IActionResult> GetMyCode()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var existing = await _db.Referrals.FirstOrDefaultAsync(r => r.ReferrerId == userId && r.ReferredUserId == null);
        if (existing != null)
            return Ok(ApiResponse<object>.Ok(new { code = existing.ReferralCode, rewardAmount = existing.RewardAmount }));

        var code = GenerateCode(userId);
        var referral = new Referral { ReferrerId = userId, ReferralCode = code };
        _db.Referrals.Add(referral);
        await _db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { code, rewardAmount = referral.RewardAmount }));
    }

    [HttpGet("my-referrals"), Authorize]
    public async Task<IActionResult> GetMyReferrals()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var referrals = await _db.Referrals
            .Where(r => r.ReferrerId == userId && r.ReferredUserId != null)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.ReferredEmail, r.Status, r.RewardAmount, r.RewardClaimed, r.CreatedAt })
            .ToListAsync();
        var totalEarned = referrals.Where(r => r.Status == ReferralStatus.Completed).Sum(r => r.RewardAmount);
        return Ok(ApiResponse<object>.Ok(new { referrals, totalEarned }));
    }

    [HttpPost("apply")]
    public async Task<IActionResult> ApplyCode([FromBody] ApplyReferralDto dto)
    {
        var referral = await _db.Referrals.FirstOrDefaultAsync(r => r.ReferralCode == dto.Code && r.ReferredUserId == null);
        if (referral == null) return BadRequest(ApiResponse<object>.Fail("Invalid or expired referral code"));
        return Ok(ApiResponse<object>.Ok(new { discount = referral.RewardAmount }, $"Referral code applied! You get ₹{referral.RewardAmount} off."));
    }

    [HttpGet, Authorize]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var total = await _db.Referrals.CountAsync();
        var items = await _db.Referrals
            .Include(r => r.Referrer)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new {
                r.Id, r.ReferralCode, r.ReferredEmail, r.Status, r.RewardAmount, r.RewardClaimed, r.CreatedAt,
                ReferrerName = r.Referrer.FirstName + " " + r.Referrer.LastName,
                ReferrerEmail = r.Referrer.Email
            })
            .ToListAsync();
        return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
    }

    private static string GenerateCode(Guid userId)
        => "AYU" + userId.ToString("N")[..6].ToUpper();
}

public record ApplyReferralDto(string Code);
