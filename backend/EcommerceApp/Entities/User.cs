using EcommerceApp.Domain.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Customer;
    public bool EmailVerified { get; set; } = false;
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }
    // OTP-based password reset. Only hashes are stored; PasswordResetToken holds the hash of the grant issued after OTP verification.
    public string? PasswordResetOtpHash { get; set; }
    public int PasswordResetAttempts { get; set; }
    public DateTime? PasswordResetLastSentAt { get; set; }
    public int PasswordResetSendCount { get; set; }
    public DateTime? PasswordResetWindowStart { get; set; }
    /// <summary>Tokens issued before this moment are rejected (set when the password is reset).</summary>
    public DateTime? PasswordChangedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    /// <summary>Razorpay customer id created for this user in the legacy system.</summary>
    public string? RazorpayCustomerId { get; set; }
    /// <summary>Comma-separated permission keys for SubAdmin users.</summary>
    public string? Permissions { get; set; }

    public ICollection<Address> Addresses { get; set; } = new List<Address>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Cart> Carts { get; set; } = new List<Cart>();
    public ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<ProductView> ProductViews { get; set; } = new List<ProductView>();
    public ICollection<LoginHistory> LoginHistories { get; set; } = new List<LoginHistory>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
