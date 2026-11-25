using System.Text.RegularExpressions;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Application.Common;

/// <summary>Who may see or change an order. A guest order (no owner) is only ever reachable by SuperAdmin.</summary>
public static class OrderAccess
{
    public static bool CanAccess(Guid? orderOwnerId, Guid? callerId, bool callerIsAdmin) =>
        callerIsAdmin || (orderOwnerId.HasValue && callerId.HasValue && orderOwnerId.Value == callerId.Value);
}

/// <summary>The only order status changes an admin may make. Cancelled and Returned are terminal.</summary>
public static class OrderStatusRules
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Allowed = new()
    {
        [OrderStatus.Pending]   = [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed] = [OrderStatus.Shipped, OrderStatus.Cancelled],
        [OrderStatus.Shipped]   = [OrderStatus.Delivered, OrderStatus.Returned],
        [OrderStatus.Delivered] = [OrderStatus.Returned],
        [OrderStatus.Cancelled] = [],
        [OrderStatus.Returned]  = [],
    };

    public static bool CanTransition(OrderStatus from, OrderStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);
}

/// <summary>Normalises contact details so they can be compared and validated the same way everywhere.</summary>
public static class ContactNormalizer
{
    private static readonly Regex IndianMobile = new(@"^[6-9][0-9]{9}$", RegexOptions.Compiled);
    private static readonly Regex Pin = new(@"^[1-9][0-9]{5}$", RegexOptions.Compiled);

    public static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    /// <summary>Strips spaces, dashes and a +91 / 91 / 0 prefix; returns the 10-digit Indian mobile number, or null when it is not one.</summary>
    public static string? TryNormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsAsciiDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("91")) digits = digits[2..];
        else if (digits.Length == 11 && digits.StartsWith('0')) digits = digits[1..];
        return IndianMobile.IsMatch(digits) ? digits : null;
    }

    public static bool IsValidPin(string? pin) => pin != null && Pin.IsMatch(pin.Trim());
}
