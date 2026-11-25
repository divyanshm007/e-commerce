using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using System.Security.Claims;

namespace EcommerceApp.API.Middleware;

public class VisitorTrackingMiddleware
{
    private readonly RequestDelegate _next;

    public VisitorTrackingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        // Only track page-like routes, skip API calls and static files
        var path = context.Request.Path.Value ?? "";
        if (!path.StartsWith("/api") && !path.Contains("."))
        {
            Guid? userId = null;
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(idClaim, out var uid)) userId = uid;
            }

            var sessionId = context.Request.Cookies["session_id"];
            if (string.IsNullOrEmpty(sessionId))
            {
                sessionId = Guid.NewGuid().ToString("N");
                context.Response.Cookies.Append("session_id", sessionId, new CookieOptions
                {
                    HttpOnly = true,
                    Expires = DateTimeOffset.UtcNow.AddDays(30),
                    SameSite = SameSiteMode.Strict,
                    Secure = true
                });
            }

            await db.VisitorLogs.AddAsync(new VisitorLog
            {
                SessionId = sessionId,
                UserId = userId,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers["User-Agent"].ToString(),
                PageUrl = path,
                Referrer = context.Request.Headers["Referer"].ToString(),
                IsGuest = userId == null,
                VisitedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
        }

        await _next(context);
    }
}
