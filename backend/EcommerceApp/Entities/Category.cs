using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Slug { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public int SortOrder { get; set; } = 0;
    public string? ImageUrl { get; set; }
    public bool IsFeatured { get; set; } = false;

    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
