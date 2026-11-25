using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class Referral : BaseEntity
{
    public Guid ReferrerId { get; set; }
    public string ReferralCode { get; set; } = string.Empty;
    public string? ReferredEmail { get; set; }
    public Guid? ReferredUserId { get; set; }
    public ReferralStatus Status { get; set; } = ReferralStatus.Pending;
    public decimal RewardAmount { get; set; } = 50;
    public bool RewardClaimed { get; set; } = false;

    public User Referrer { get; set; } = null!;
    public User? ReferredUser { get; set; }
}

public enum ReferralStatus
{
    Pending = 1,
    Completed = 2,
    Expired = 3
}
