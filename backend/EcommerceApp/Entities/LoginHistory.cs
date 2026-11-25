using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class LoginHistory : BaseEntity
{
    public Guid UserId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; } = true;
    public DateTime LoginAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
