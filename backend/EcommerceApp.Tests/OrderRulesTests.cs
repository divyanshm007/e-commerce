using EcommerceApp.Application.Common;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Tests;

/// <summary>Pure rules: no database needed.</summary>
public class OrderRulesTests
{
    public static IEnumerable<object[]> AllPairs()
    {
        var allowed = new HashSet<(OrderStatus, OrderStatus)>
        {
            (OrderStatus.Pending, OrderStatus.Confirmed), (OrderStatus.Pending, OrderStatus.Cancelled),
            (OrderStatus.Confirmed, OrderStatus.Shipped), (OrderStatus.Confirmed, OrderStatus.Cancelled),
            (OrderStatus.Shipped, OrderStatus.Delivered), (OrderStatus.Shipped, OrderStatus.Returned),
            (OrderStatus.Delivered, OrderStatus.Returned),
        };
        foreach (var from in Enum.GetValues<OrderStatus>())
            foreach (var to in Enum.GetValues<OrderStatus>())
                yield return new object[] { from, to, allowed.Contains((from, to)) };
    }

    [Theory]
    [MemberData(nameof(AllPairs))]
    public void Transition_table_matches_the_approved_rules(OrderStatus from, OrderStatus to, bool expected) =>
        Assert.Equal(expected, OrderStatusRules.CanTransition(from, to));

    [Theory]
    [InlineData("9876543210", "9876543210")]
    [InlineData("+91 98765 43210", "9876543210")]
    [InlineData("91-9876543210", "9876543210")]
    [InlineData("09876543210", "9876543210")]
    [InlineData(" 98765-43210 ", "9876543210")]
    public void Valid_mobile_numbers_are_normalised(string input, string expected) =>
        Assert.Equal(expected, ContactNormalizer.TryNormalizePhone(input));

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("12345")]
    [InlineData("5876543210")]          // Indian mobiles start with 6-9
    [InlineData("98765432101")]
    [InlineData("abcdefghij")]
    [InlineData("+1 415 555 2671")]
    public void Invalid_mobile_numbers_are_rejected(string? input) =>
        Assert.Null(ContactNormalizer.TryNormalizePhone(input));

    [Theory]
    [InlineData("110001", true)]
    [InlineData(" 110001 ", true)]
    [InlineData("011001", false)]      // a PIN never starts with 0
    [InlineData("1100", false)]
    [InlineData("1100011", false)]
    [InlineData("ABCDEF", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void Pin_must_be_six_digits(string? pin, bool expected) =>
        Assert.Equal(expected, ContactNormalizer.IsValidPin(pin));

    [Fact]
    public void Email_is_compared_case_and_space_insensitively() =>
        Assert.Equal("a@b.com", ContactNormalizer.NormalizeEmail("  A@B.Com "));

    [Fact]
    public void Owner_and_admin_may_access_but_guest_orders_only_admin()
    {
        var owner = Guid.NewGuid();
        Assert.True(OrderAccess.CanAccess(owner, owner, false));
        Assert.False(OrderAccess.CanAccess(owner, Guid.NewGuid(), false));
        Assert.False(OrderAccess.CanAccess(owner, null, false));
        Assert.True(OrderAccess.CanAccess(owner, Guid.NewGuid(), true));
        Assert.False(OrderAccess.CanAccess(null, Guid.NewGuid(), false));   // guest order, ordinary user
        Assert.True(OrderAccess.CanAccess(null, null, true));                // guest order, admin
    }
}
