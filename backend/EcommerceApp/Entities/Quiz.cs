using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Quiz : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string HeroGradient { get; set; } = "linear-gradient(135deg, #166534, #15803d)";
    public int SortOrder { get; set; }

    public ICollection<QuizQuestion>   Questions   { get; set; } = [];
    public ICollection<QuizResultType> ResultTypes { get; set; } = [];
}
