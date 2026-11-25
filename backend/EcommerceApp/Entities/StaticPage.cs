using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class StaticPage : BaseEntity
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
}
