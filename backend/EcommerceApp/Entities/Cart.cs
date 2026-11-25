using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Cart : BaseEntity
{
    public Guid? UserId { get; set; }
    public string? SessionId { get; set; }
    public CartStatus Status { get; set; } = CartStatus.Active;
    public DateTime? AbandonedAt { get; set; }
    public DateTime? ConvertedAt { get; set; }
    public Guid? ConvertedOrderId { get; set; }

    public string? GuestName  { get; set; }
    public string? GuestEmail { get; set; }
    public string? GuestPhone { get; set; }

    public string? AppliedCouponCode { get; set; }

    public User? User { get; set; }
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}
