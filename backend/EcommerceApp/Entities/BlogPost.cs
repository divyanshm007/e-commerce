using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class BlogPost : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string Author { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public int SortOrder { get; set; }
}
