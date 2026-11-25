using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class QuizQuestion : BaseEntity
{
    public Guid QuizId { get; set; }
    public Quiz Quiz { get; set; } = null!;

    public string Text { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<QuizOption> Options { get; set; } = [];
}
