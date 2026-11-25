using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int SortOrder { get; set; } = 0;

    public Product Product { get; set; } = null!;
}
