using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class Review : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid UserId { get; set; }
    public Guid? OrderId { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Comment { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;
    public DateTime? ApprovedAt { get; set; }

    public Product Product { get; set; } = null!;
    public User User { get; set; } = null!;
}
