using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class PromotionHeader : BaseEntity
{
    public string Text { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
    public int SortOrder { get; set; } = 0;
}
