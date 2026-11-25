using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Testimonial : BaseEntity
{
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerTitle { get; set; }
    public string? AvatarUrl { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public int SortOrder { get; set; } = 0;
}
