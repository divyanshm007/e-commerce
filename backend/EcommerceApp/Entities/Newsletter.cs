using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Newsletter : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public bool IsSubscribed { get; set; } = true;
    public DateTime? UnsubscribedAt { get; set; }
}
