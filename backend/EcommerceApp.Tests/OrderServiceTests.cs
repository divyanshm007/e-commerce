using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

public class DbFixture : IAsyncLifetime
{
    public TestDatabase Db { get; private set; } = null!;
    public async Task InitializeAsync() => Db = await TestDatabase.CreateAsync();
    public async Task DisposeAsync() => await Db.DisposeAsync();
}

/// <summary>Order service behaviour against a disposable local PostgreSQL database (real transactions and locks).</summary>
public class OrderServiceTests : IClassFixture<DbFixture>
{
    private readonly TestDatabase _t;
    public OrderServiceTests(DbFixture f) => _t = f.Db;

    // ----- cancellation and stock -----

    [Fact]
    public async Task Repeated_cancellation_restores_stock_only_once()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Cancel1");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, qty: 2);          // stock is 8 now
        var svc = Seed.OrderService(db);

        var first = await svc.CancelAsync(order.Id, "changed my mind", user.Id, false);
        var second = await svc.CancelAsync(order.Id, "again", user.Id, false);
        var third = await svc.CancelAsync(order.Id, "and again", user.Id, false);

        Assert.True(first.Success); Assert.Equal("Order cancelled.", first.Data);
        Assert.True(second.Success); Assert.Contains("already", second.Data);
        Assert.True(third.Success);
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));                     // 8 + 2, never 12 or 14
    }

    [Fact]
    public async Task Two_simultaneous_cancellations_restore_stock_once()
    {
        await using var seedDb = _t.NewContext();
        var user = await Seed.UserAsync(seedDb, "Race1");
        var product = await Seed.ProductAsync(seedDb, stock: 10);
        var order = await Seed.OrderAsync(seedDb, product, user.Id, qty: 3);

        await using var dbA = _t.NewContext();
        await using var dbB = _t.NewContext();
        var results = await Task.WhenAll(
            Seed.OrderService(dbA).CancelAsync(order.Id, "a", user.Id, false),
            Seed.OrderService(dbB).CancelAsync(order.Id, "b", user.Id, false));

        Assert.All(results, r => Assert.True(r.Success));
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));
    }

    [Fact]
    public async Task Another_customer_cannot_cancel_the_order()
    {
        await using var db = _t.NewContext();
        var owner = await Seed.UserAsync(db, "Owner2");
        var other = await Seed.UserAsync(db, "Other2");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, owner.Id, qty: 2);

        var result = await Seed.OrderService(db).CancelAsync(order.Id, "not mine", other.Id, false);

        Assert.False(result.Success);
        Assert.Equal(404, result.StatusCode);                                         // same answer as a missing order
        await using var check = _t.NewContext();
        Assert.Equal(OrderStatus.Pending, (await check.Orders.FindAsync(order.Id))!.Status);
        Assert.Equal(8, await Seed.StockAsync(_t, product.Id));
    }

    [Fact]
    public async Task Guest_order_can_only_be_cancelled_by_an_admin()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "NotGuest");
        var admin = await Seed.UserAsync(db, "Admin3", UserRole.SuperAdmin);
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, null, qty: 1, guestEmail: "g@example.test", guestPhone: "9876543210");

        Assert.Equal(404, (await Seed.OrderService(db).CancelAsync(order.Id, "x", user.Id, false)).StatusCode);
        Assert.True((await Seed.OrderService(db).CancelAsync(order.Id, "x", admin.Id, true)).Success);
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));
    }

    [Fact]
    public async Task Paid_order_cancellation_needs_an_admin_and_is_flagged_for_refund_review()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Paid4");
        var admin = await Seed.UserAsync(db, "Admin4", UserRole.SuperAdmin);
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, OrderStatus.Confirmed, PaymentStatus.Paid, PaymentMethod.Razorpay, qty: 2);
        var svc = Seed.OrderService(db);

        var byCustomer = await svc.CancelAsync(order.Id, "refund me", user.Id, false);
        Assert.False(byCustomer.Success);
        Assert.Equal(403, byCustomer.StatusCode);
        await using (var check = _t.NewContext())
            Assert.Equal(OrderStatus.Confirmed, (await check.Orders.FindAsync(order.Id))!.Status);
        Assert.Equal(8, await Seed.StockAsync(_t, product.Id));

        var byAdmin = await svc.CancelAsync(order.Id, "refund review", admin.Id, true);
        Assert.True(byAdmin.Success);
        await using var after = _t.NewContext();
        var o = (await after.Orders.FindAsync(order.Id))!;
        Assert.Equal(OrderStatus.Cancelled, o.Status);
        Assert.Equal(PaymentStatus.Paid, o.PaymentStatus);                           // money is NOT touched
        Assert.Equal(RefundStatus.Requested, o.RefundStatus);                        // only flagged, no automatic refund
        Assert.Equal(0, await after.Payments.CountAsync(p => p.OrderId == order.Id));
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));
    }

    [Theory]
    [InlineData(OrderStatus.Shipped)]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Returned)]
    public async Task Orders_past_confirmation_cannot_be_cancelled(OrderStatus status)
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Late5");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, status, qty: 2);

        var result = await Seed.OrderService(db).CancelAsync(order.Id, "x", user.Id, false);

        Assert.False(result.Success);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal(8, await Seed.StockAsync(_t, product.Id));
    }

    // ----- status transitions -----

    public static IEnumerable<object[]> StatusPairs() => OrderRulesTests.AllPairs();

    [Theory]
    [MemberData(nameof(StatusPairs))]
    public async Task Admin_status_updates_follow_the_transition_rules(OrderStatus from, OrderStatus to, bool allowed)
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Trans");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, from, qty: 1);

        var result = await Seed.OrderService(db).UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = to });

        var expectedOk = from == to || allowed;                                       // setting the same status again is a harmless no-op
        Assert.Equal(expectedOk, result.Success);
        if (!expectedOk) Assert.Equal(409, result.StatusCode);
        await using var check = _t.NewContext();
        Assert.Equal(expectedOk ? to : from, (await check.Orders.FindAsync(order.Id))!.Status);
    }

    [Fact]
    public async Task Cancelling_through_the_status_endpoint_restores_stock_once()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "ViaStatus");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, qty: 4);
        var svc = Seed.OrderService(db);

        Assert.True((await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Cancelled })).Success);
        Assert.True((await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Cancelled })).Success);
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));
    }

    [Fact]
    public async Task Shipping_dates_and_tracking_number_are_recorded_on_the_valid_transition()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Dates");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, OrderStatus.Confirmed, qty: 1);
        var svc = Seed.OrderService(db);

        Assert.True((await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Shipped, TrackingNumber = "TRK123" })).Success);
        Assert.True((await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Delivered })).Success);

        await using var check = _t.NewContext();
        var o = (await check.Orders.FindAsync(order.Id))!;
        Assert.Equal("TRK123", o.TrackingNumber);
        Assert.NotNull(o.ShippedAt);
        Assert.NotNull(o.DeliveredAt);
    }

    private sealed class ShipmentOwnsOrder : IOrderShipmentGuard
    {
        public Task<bool> HasOpenShipmentAsync(Guid orderId, CancellationToken ct = default) => Task.FromResult(true);
    }

    [Fact]
    public async Task While_a_courier_shipment_owns_the_order_manual_shipping_changes_and_cancellation_are_refused()
    {
        await using var db = _t.NewContext();
        var user = await Seed.UserAsync(db, "Courier");
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, user.Id, OrderStatus.Confirmed, qty: 1);
        var svc = new OrderService(db, Seed.Mapper(), Seed.Email(), new CartService(db, Seed.Mapper()), new ShipmentOwnsOrder());

        Assert.Equal(409, (await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Shipped })).StatusCode);
        Assert.Equal(409, (await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Confirmed, TrackingNumber = "HAND" })).StatusCode);
        Assert.Equal(409, (await svc.CancelAsync(order.Id, "x", user.Id, false)).StatusCode);
        Assert.Equal(409, (await svc.CancelAsync(order.Id, "x", null, true)).StatusCode);   // even an admin: cancel the shipment first

        await using var check = _t.NewContext();
        var o = (await check.Orders.FindAsync(order.Id))!;
        Assert.Equal(OrderStatus.Confirmed, o.Status);
        Assert.Null(o.TrackingNumber);
        Assert.Equal(9, await Seed.StockAsync(_t, product.Id));
    }

    // ----- reading orders -----

    [Fact]
    public async Task Customer_cannot_read_another_customers_order_or_a_guest_order_but_admin_can()
    {
        await using var db = _t.NewContext();
        var owner = await Seed.UserAsync(db, "Read1");
        var other = await Seed.UserAsync(db, "Read2");
        var product = await Seed.ProductAsync(db);
        var mine = await Seed.OrderAsync(db, product, owner.Id);
        var guest = await Seed.OrderAsync(db, product, null, guestEmail: "g@example.test", guestPhone: "9876543210");
        var svc = Seed.OrderService(db);

        Assert.True((await svc.GetByIdForCallerAsync(mine.Id, owner.Id, false)).Success);
        Assert.Equal(404, (await svc.GetByIdForCallerAsync(mine.Id, other.Id, false)).StatusCode);
        Assert.Equal(404, (await svc.GetByOrderNumberForCallerAsync(mine.OrderNumber, other.Id, false)).StatusCode);
        Assert.Equal(404, (await svc.GetByIdForCallerAsync(guest.Id, other.Id, false)).StatusCode);   // guest orders are not open to signed-in users
        Assert.Equal(404, (await svc.GetByOrderNumberForCallerAsync(guest.OrderNumber, owner.Id, false)).StatusCode);
        Assert.True((await svc.GetByIdForCallerAsync(guest.Id, other.Id, true)).Success);
    }

    [Fact]
    public async Task Invoice_access_requires_ownership_or_admin()
    {
        await using var db = _t.NewContext();
        var owner = await Seed.UserAsync(db, "Inv1");
        var other = await Seed.UserAsync(db, "Inv2");
        var product = await Seed.ProductAsync(db);
        var order = await Seed.OrderAsync(db, product, owner.Id);
        var guest = await Seed.OrderAsync(db, product, null, guestEmail: "g@example.test", guestPhone: "9876543210");
        var svc = Seed.OrderService(db);

        Assert.True((await svc.GenerateInvoiceAsync(order.Id, owner.Id, false)).Success);
        Assert.Equal(404, (await svc.GenerateInvoiceAsync(order.Id, other.Id, false)).StatusCode);
        Assert.Equal(404, (await svc.GenerateInvoiceAsync(guest.Id, other.Id, false)).StatusCode);
        Assert.True((await svc.GenerateInvoiceAsync(order.Id, other.Id, true)).Success);
    }

    // ----- guest tracking -----

    [Fact]
    public async Task Guest_lookup_succeeds_with_matching_email_or_phone_in_any_format()
    {
        await using var db = _t.NewContext();
        var product = await Seed.ProductAsync(db);
        var order = await Seed.OrderAsync(db, product, null, guestEmail: "Buyer@Example.test", guestPhone: "9876543210");
        var svc = Seed.OrderService(db);

        foreach (var contact in new[] { "buyer@example.test", "  BUYER@EXAMPLE.TEST ", "9876543210", "+91 98765-43210", "09876543210" })
        {
            var r = await svc.TrackGuestOrderAsync(order.OrderNumber.ToLowerInvariant(), contact);
            Assert.True(r.Success, $"contact '{contact}' should match");
            Assert.Equal(order.OrderNumber, r.Data!.OrderNumber);
            Assert.Single(r.Data.Items);
        }
    }

    [Fact]
    public async Task Wrong_unknown_and_member_lookups_all_get_the_same_generic_answer()
    {
        await using var db = _t.NewContext();
        var member = await Seed.UserAsync(db, "Member6");
        var product = await Seed.ProductAsync(db);
        var guestOrder = await Seed.OrderAsync(db, product, null, guestEmail: "buyer@example.test", guestPhone: "9876543210");
        var memberOrder = await Seed.OrderAsync(db, product, member.Id);
        var svc = Seed.OrderService(db);

        var attempts = new[]
        {
            await svc.TrackGuestOrderAsync(guestOrder.OrderNumber, "someone.else@example.test"),     // right order, wrong e-mail
            await svc.TrackGuestOrderAsync(guestOrder.OrderNumber, "9123456780"),                    // right order, wrong phone
            await svc.TrackGuestOrderAsync("ORD-20260101-ZZZZZZ", "buyer@example.test"),             // no such order
            await svc.TrackGuestOrderAsync(memberOrder.OrderNumber, "stranger@example.test"),        // a member's order with someone else's e-mail
            await svc.TrackGuestOrderAsync(guestOrder.OrderNumber, ""),                              // nothing supplied
            await svc.TrackGuestOrderAsync("", "buyer@example.test"),
        };

        Assert.All(attempts, r => { Assert.False(r.Success); Assert.Equal(404, r.StatusCode); Assert.Null(r.Data); });
        Assert.Single(attempts.Select(r => r.Message).Distinct());        // identical text: nothing reveals whether an order exists
    }

    [Fact]
    public void Guest_tracking_dto_contains_no_address_contact_or_payment_fields()
    {
        var forbidden = new[] { "Address", "Phone", "Email", "Payment", "Total", "Amount", "Shipping", "Billing", "User", "Guest", "Coupon", "Razorpay" };
        var names = typeof(OrderTrackingDto).GetProperties().Select(p => p.Name)
            .Concat(typeof(OrderTrackingItemDto).GetProperties().Select(p => p.Name)).ToList();

        Assert.DoesNotContain(names, n => forbidden.Any(f => n.Contains(f, StringComparison.OrdinalIgnoreCase)));
    }

    // ----- order creation: validation and transaction safety -----

    private static CreateOrderDto NewOrder(Guid productId, int qty, string phone = "+91 98765-43210", string pin = "110001") => new()
    {
        GuestName = "Guest Buyer", GuestEmail = "buyer@example.test", GuestPhone = phone,
        PaymentMethod = PaymentMethod.CashOnDelivery,
        ShippingAddress = Address(phone, pin), BillingAddress = Address(phone, pin),
        Items = [new CreateOrderItemDto { ProductId = productId, Quantity = qty }]
    };

    private static CreateAddressDto Address(string phone, string pin) => new()
    { FullName = "Guest Buyer", Phone = phone, Line1 = "12 Main Road", City = "Delhi", State = "Delhi", PostalCode = pin, Country = "India" };

    [Fact]
    public async Task Valid_order_is_created_with_a_normalised_phone_and_stock_reduced()
    {
        await using var db = _t.NewContext();
        var product = await Seed.ProductAsync(db, stock: 5);

        var result = await Seed.OrderService(db).CreateAsync(NewOrder(product.Id, 2));

        Assert.True(result.Success);
        await using var check = _t.NewContext();
        var o = await check.Orders.SingleAsync(x => x.Id == result.Data!.Id);
        Assert.Equal("9876543210", o.ShippingPhone);
        Assert.Equal("9876543210", o.BillingPhone);
        Assert.Equal("9876543210", o.GuestPhone);
        Assert.Equal(3, await Seed.StockAsync(_t, product.Id));
    }

    [Theory]
    [InlineData("12345", "110001")]
    [InlineData("5876543210", "110001")]
    [InlineData("98765 4321", "110001")]
    [InlineData("9876543210", "1100")]
    [InlineData("9876543210", "ABCDEF")]
    [InlineData("9876543210", "011001")]
    public async Task Invalid_phone_or_pin_is_rejected_and_nothing_is_saved(string phone, string pin)
    {
        await using var db = _t.NewContext();
        var product = await Seed.ProductAsync(db, stock: 5);
        var before = await db.Orders.CountAsync();

        var result = await Seed.OrderService(db).CreateAsync(NewOrder(product.Id, 1, phone, pin));

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        await using var check = _t.NewContext();
        Assert.Equal(before, await check.Orders.CountAsync());
        Assert.Equal(5, await Seed.StockAsync(_t, product.Id));
    }

    [Fact]
    public async Task Zero_or_negative_quantity_is_rejected()
    {
        await using var db = _t.NewContext();
        var product = await Seed.ProductAsync(db, stock: 5);

        Assert.False((await Seed.OrderService(db).CreateAsync(NewOrder(product.Id, 0))).Success);
        Assert.False((await Seed.OrderService(db).CreateAsync(NewOrder(product.Id, -3))).Success);
        Assert.Equal(5, await Seed.StockAsync(_t, product.Id));          // a negative quantity can no longer ADD stock
    }

    [Fact]
    public async Task A_failure_on_a_later_item_leaves_stock_and_orders_untouched()
    {
        await using var db = _t.NewContext();
        var a = await Seed.ProductAsync(db, stock: 5);
        var b = await Seed.ProductAsync(db, stock: 1);
        var before = await db.Orders.CountAsync();
        var dto = NewOrder(a.Id, 2);
        dto.Items.Add(new CreateOrderItemDto { ProductId = b.Id, Quantity = 9 });          // not enough of the second product

        var result = await Seed.OrderService(db).CreateAsync(dto);

        Assert.False(result.Success);
        await using var check = _t.NewContext();
        Assert.Equal(before, await check.Orders.CountAsync());
        Assert.Equal(5, await Seed.StockAsync(_t, a.Id));
        Assert.Equal(1, await Seed.StockAsync(_t, b.Id));
    }

    private sealed class FixedNumberOrderService(EcommerceApp.Infrastructure.Data.AppDbContext db, string number)
        : OrderService(db, Seed.Mapper(), Seed.Email(), new CartService(db, Seed.Mapper()), new ShipmentOrderGuard(db))
    {
        protected override string GenerateOrderNumber() => number;
    }

    [Fact]
    public async Task A_database_error_while_saving_rolls_back_stock_coupon_and_order()
    {
        await using var seedDb = _t.NewContext();
        var product = await Seed.ProductAsync(seedDb, stock: 6);
        var existing = await Seed.OrderAsync(seedDb, product, null, guestEmail: "x@example.test", guestPhone: "9876543210", qty: 1);   // stock 5
        var coupon = new EcommerceApp.Domain.Entities.Coupon { Code = "ROLLBACK1", DiscountType = DiscountType.FixedAmount, DiscountValue = 10, IsActive = true };
        seedDb.Coupons.Add(coupon);
        await seedDb.SaveChangesAsync();
        var ordersBefore = await seedDb.Orders.CountAsync();

        var dto = NewOrder(product.Id, 2);
        dto.CouponCode = "ROLLBACK1";
        await using var db = _t.NewContext();
        // the new order gets a number that already exists -> the unique index makes SaveChanges fail after stock and coupon were changed
        await Assert.ThrowsAnyAsync<Exception>(() => new FixedNumberOrderService(db, existing.OrderNumber).CreateAsync(dto));

        await using var check = _t.NewContext();
        Assert.Equal(ordersBefore, await check.Orders.CountAsync());
        Assert.Equal(5, await Seed.StockAsync(_t, product.Id));                              // unchanged: the whole transaction rolled back
        Assert.Equal(0, (await check.Coupons.SingleAsync(c => c.Code == "ROLLBACK1")).UsedCount);
    }

    [Fact]
    public async Task Two_simultaneous_orders_for_the_last_unit_produce_exactly_one_order()
    {
        await using var seedDb = _t.NewContext();
        var product = await Seed.ProductAsync(seedDb, stock: 1);

        await using var dbA = _t.NewContext();
        await using var dbB = _t.NewContext();
        var results = await Task.WhenAll(
            Seed.OrderService(dbA).CreateAsync(NewOrder(product.Id, 1)),
            Seed.OrderService(dbB).CreateAsync(NewOrder(product.Id, 1)));

        Assert.Equal(1, results.Count(r => r.Success));
        Assert.Equal(0, await Seed.StockAsync(_t, product.Id));                              // never negative
    }
}
