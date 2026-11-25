using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Banner : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public BannerType BannerType { get; set; } = BannerType.Hero;
    public int SortOrder { get; set; } = 0;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
