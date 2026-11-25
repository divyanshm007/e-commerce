using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Application.DTOs.Reviews;

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }
    public ReviewStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateReviewDto
{
    public Guid ProductId { get; set; }
    public Guid? OrderId { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }
}
