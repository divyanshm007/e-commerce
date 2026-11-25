using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ShippingConfig : BaseEntity
{
    public decimal ShippingCharge { get; set; } = 0;
    public decimal FreeShippingAbove { get; set; } = 0;
    public bool FreeShippingEnabled { get; set; } = false;
}
