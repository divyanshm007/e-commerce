using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class WebsiteSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Group { get; set; }
    public string? Description { get; set; }
}
