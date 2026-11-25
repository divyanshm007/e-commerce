using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class QuizOption : BaseEntity
{
    public Guid QuestionId { get; set; }
    public QuizQuestion Question { get; set; } = null!;

    public string Text { get; set; } = string.Empty;
    public string ResultTypeKey { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
