using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class CartItem : BaseEntity
{
    public Guid CartId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; } = 1;

    public Cart Cart { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
