using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class VisitorLog : BaseEntity
{
    public string? SessionId { get; set; }
    public Guid? UserId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? PageUrl { get; set; }
    public string? Referrer { get; set; }
    public bool IsGuest { get; set; } = true;
    public DateTime VisitedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
