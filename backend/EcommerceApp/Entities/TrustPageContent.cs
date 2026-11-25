using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class TrustPageContent : BaseEntity
{
    public string Slug             { get; set; } = string.Empty;
    public string Title            { get; set; } = string.Empty;
    public string Subtitle         { get; set; } = string.Empty;
    public string? HeroImageUrl    { get; set; }
    public string? AttachedFileUrl { get; set; }
    public string? AttachedFileName{ get; set; }
    // JSON array: [{icon, heading, body}]
    public string SectionsJson     { get; set; } = "[]";
}
