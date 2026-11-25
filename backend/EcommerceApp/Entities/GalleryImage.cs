using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class GalleryImage : BaseEntity
{
    public string Title     { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string ImageUrl  { get; set; } = string.Empty;
    public int SortOrder    { get; set; } = 0;
}
