using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class QuizResultType : BaseEntity
{
    public Guid QuizId { get; set; }
    public Quiz Quiz { get; set; } = null!;

    public string Key { get; set; } = string.Empty;        // e.g. "vata"
    public string Title { get; set; } = string.Empty;      // e.g. "Vata Dominant"
    public string? Emoji { get; set; }                     // e.g. "🌬️"
    public string? Description { get; set; }
    public string? Traits { get; set; }                    // newline-separated list
    public string? Recommendations { get; set; }           // newline-separated list
    public string? SearchTerms { get; set; }               // newline-separated list
    public string? ColorGradient { get; set; }             // CSS gradient string
    public int SortOrder { get; set; }
}
