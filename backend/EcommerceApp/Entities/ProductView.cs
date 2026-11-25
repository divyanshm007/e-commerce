using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ProductView : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid? UserId { get; set; }
    public string? SessionId { get; set; }
    public string? IpAddress { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
    public User? User { get; set; }
}
