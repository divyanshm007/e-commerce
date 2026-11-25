namespace EcommerceApp.Domain.Enums;

public enum UserRole
{
    Customer = 1,
    SuperAdmin = 2,
    /// <summary>Back-office user with a limited set of permissions (migrated from the legacy admin_users).</summary>
    SubAdmin = 3
}

public enum OrderStatus
{
    Pending = 1,
    Confirmed = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5,
    Returned = 6
}

public enum PaymentStatus
{
    Pending = 1,
    Paid = 2,
    Failed = 3,
    Refunded = 4,
    PartialRefund = 5
}

public enum PaymentMethod
{
    Razorpay = 1,
    CashOnDelivery = 2
}

public enum DiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

public enum ReviewStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

public enum AddressType
{
    Shipping = 1,
    Billing = 2
}

public enum BannerType
{
    Hero = 1,
    Promotion = 2
}

public enum CartStatus
{
    Active = 1,
    Abandoned = 2,
    Converted = 3
}

public enum RefundStatus
{
    NotRequested = 0,
    Requested = 1,
    Processing = 2,
    Completed = 3,
    Rejected = 4
}

