using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Address : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Line1 { get; set; } = string.Empty;
    public string? Line2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
    public AddressType AddressType { get; set; } = AddressType.Shipping;
    public bool IsDefault { get; set; } = false;
    /// <summary>Free-text label such as home or office (the AddressType enum only distinguishes shipping/billing).</summary>
    public string? Label { get; set; }
    public string? SecondaryPhone { get; set; }
    public string? DeliveryInstructions { get; set; }

    public User User { get; set; } = null!;
}
