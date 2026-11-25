using System.Net;
using System.Text.Json;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>The real API process with real JWT authentication and routing, on a disposable local database.</summary>
public class ApiFixture : IAsyncLifetime
{
    protected virtual int TrackLimit => 1000;
    protected virtual IDictionary<string, string>? ExtraEnvironment => null;
    public TestDatabase Db { get; private set; } = null!;
    public ApiHost Api { get; private set; } = null!;
    public User Alice { get; private set; } = null!;
    public User Bob { get; private set; } = null!;
    public User Admin { get; private set; } = null!;
    public string AliceToken { get; private set; } = "";
    public string BobToken { get; private set; } = "";
    public string AdminToken { get; private set; } = "";

    public async Task InitializeAsync()
    {
        Db = await TestDatabase.CreateAsync();
        await using (var db = Db.NewContext())
        {
            Alice = await Seed.UserAsync(db, "Alice");
            Bob = await Seed.UserAsync(db, "Bob");
            Admin = await Seed.UserAsync(db, "Root", UserRole.SuperAdmin);
        }
        Api = await ApiHost.StartAsync(Db.ConnectionString, TrackLimit, ExtraEnvironment);
        AliceToken = await Api.LoginAsync(Alice.Email, Seed.Password);
        BobToken = await Api.LoginAsync(Bob.Email, Seed.Password);
        AdminToken = await Api.LoginAsync(Admin.Email, Seed.Password);
    }

    public async Task DisposeAsync()
    {
        await Api.DisposeAsync();
        await Db.DisposeAsync();
    }
}

public class OrderApiSecurityTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public OrderApiSecurityTests(ApiFixture f) => _f = f;

    private ApiHost Api => _f.Api;
    private static string Num(JsonElement e) => e.GetProperty("data").GetProperty("orderNumber").GetString()!;

    private async Task<(Product Product, Order Order)> OrderOfAsync(User? owner, OrderStatus status = OrderStatus.Pending,
        PaymentStatus pay = PaymentStatus.Pending, string? guestEmail = null, string? guestPhone = null, int qty = 2)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 10);
        var o = await Seed.OrderAsync(db, p, owner?.Id, status, pay,
            owner == null && guestEmail == null ? PaymentMethod.CashOnDelivery : PaymentMethod.CashOnDelivery, qty, guestEmail, guestPhone);
        return (p, o);
    }

    // ----- reading -----

    [Fact]
    public async Task Customer_cannot_read_another_customers_order()
    {
        var (_, order) = await OrderOfAsync(_f.Alice);

        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}", _f.AliceToken)).Status);
        var other = await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}", _f.BobToken);
        Assert.Equal(HttpStatusCode.NotFound, other.Status);
        Assert.DoesNotContain("Secret", other.Body.ToString());                                     // no address in the refusal
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}", _f.AdminToken)).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}")).Status);
    }

    [Fact]
    public async Task Order_number_lookup_is_no_longer_anonymous_and_is_owner_only()
    {
        var (_, order) = await OrderOfAsync(_f.Alice);

        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/number/{order.OrderNumber}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/number/{order.OrderNumber}", _f.BobToken)).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/number/{order.OrderNumber}", _f.AliceToken)).Status);
    }

    [Fact]
    public async Task Guest_orders_are_not_exposed_to_ordinary_signed_in_users()
    {
        var (_, guest) = await OrderOfAsync(null, guestEmail: "guest@example.test", guestPhone: "9876543210");

        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{guest.Id}", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/number/{guest.OrderNumber}", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{guest.Id}", _f.AdminToken)).Status);
    }

    // ----- guest tracking endpoint -----

    [Fact]
    public async Task Guest_tracking_returns_only_minimal_data_and_a_generic_error_otherwise()
    {
        var (_, guest) = await OrderOfAsync(null, guestEmail: "guest@example.test", guestPhone: "9876543210");

        var ok = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders/track", null, new { orderNumber = guest.OrderNumber, contact = "GUEST@example.test" });
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        var text = ok.Body.ToString();
        foreach (var leaked in new[] { "Secret", "Street", "9876543210", "guest@example.test", "110001", "razorpay", "totalAmount", "address", "phone" })
            Assert.DoesNotContain(leaked, text, StringComparison.OrdinalIgnoreCase);

        var wrong = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders/track", null, new { orderNumber = guest.OrderNumber, contact = "nobody@example.test" });
        var missing = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders/track", null, new { orderNumber = "ORD-20260101-NOSUCH", contact = "guest@example.test" });
        Assert.Equal(HttpStatusCode.NotFound, wrong.Status);
        Assert.Equal(HttpStatusCode.NotFound, missing.Status);
        Assert.Equal(wrong.Body.ToString(), missing.Body.ToString());                               // byte-identical: no way to tell the cases apart
    }

    // ----- cancellation -----

    [Fact]
    public async Task Customer_cannot_cancel_another_customers_order_but_can_cancel_their_own_exactly_once()
    {
        var (product, order) = await OrderOfAsync(_f.Alice, qty: 2);                                // stock 8

        var byBob = await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", _f.BobToken, new { reason = "mine now" });
        Assert.Equal(HttpStatusCode.NotFound, byBob.Status);
        Assert.Equal(8, await Seed.StockAsync(_f.Db, product.Id));

        var first = await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", _f.AliceToken, new { reason = "changed my mind" });
        var again = await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", _f.AliceToken, new { reason = "again" });
        Assert.Equal(HttpStatusCode.OK, first.Status);
        Assert.Equal(HttpStatusCode.OK, again.Status);
        Assert.Equal(10, await Seed.StockAsync(_f.Db, product.Id));                                 // 8 + 2, restored once
    }

    [Fact]
    public async Task Anonymous_cancel_is_refused()
    {
        var (_, order) = await OrderOfAsync(_f.Alice);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", null, new { reason = "x" })).Status);
    }

    [Fact]
    public async Task Paid_order_cancel_follows_the_admin_only_rule()
    {
        var (product, order) = await OrderOfAsync(_f.Alice, OrderStatus.Confirmed, PaymentStatus.Paid);

        var byOwner = await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", _f.AliceToken, new { reason = "refund" });
        Assert.Equal(HttpStatusCode.Forbidden, byOwner.Status);
        var byAdmin = await Api.SendAsync(HttpMethod.Patch, $"/api/v1/orders/{order.Id}/cancel", _f.AdminToken, new { reason = "refund review" });
        Assert.Equal(HttpStatusCode.OK, byAdmin.Status);

        await using var db = _f.Db.NewContext();
        var o = await db.Orders.FindAsync(order.Id);
        Assert.Equal(RefundStatus.Requested, o!.RefundStatus);
        Assert.Equal(0, await db.Payments.CountAsync(p => p.OrderId == order.Id));                  // nothing was refunded or recorded
        Assert.Equal(10, await Seed.StockAsync(_f.Db, product.Id));
    }

    // ----- status transitions over HTTP -----

    [Fact]
    public async Task Status_updates_need_an_admin_and_follow_the_transition_rules()
    {
        var (_, order) = await OrderOfAsync(_f.Alice);
        string Url() => $"/api/v1/orders/{order.Id}/status";

        Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AliceToken, new { status = 2 })).Status);   // a customer cannot
        Assert.Equal(HttpStatusCode.Conflict, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 3 })).Status);    // Pending -> Shipped
        Assert.Equal(HttpStatusCode.Conflict, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 4 })).Status);    // Pending -> Delivered
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 2 })).Status);          // -> Confirmed
        Assert.Equal(HttpStatusCode.Conflict, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 1 })).Status);    // back to Pending
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 3, trackingNumber = "T-1" })).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 4 })).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 6 })).Status);          // Delivered -> Returned
        Assert.Equal(HttpStatusCode.Conflict, (await Api.SendAsync(HttpMethod.Patch, Url(), _f.AdminToken, new { status = 2 })).Status);    // terminal
    }

    // ----- returns -----

    [Fact]
    public async Task Return_listing_and_status_changes_are_admin_only()
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(HttpMethod.Get, "/api/v1/returns", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Get, "/api/v1/returns")).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, "/api/v1/returns", _f.AdminToken)).Status);

        var (_, order) = await OrderOfAsync(_f.Alice, OrderStatus.Delivered);
        var create = await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", _f.AliceToken, new { orderId = order.Id, reason = "damaged", description = "box crushed" });
        Assert.Equal(HttpStatusCode.OK, create.Status);
        var id = create.Body.GetProperty("data").GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(HttpMethod.Patch, $"/api/v1/returns/{id}/status", _f.AliceToken, new { status = "Approved", adminNotes = "self-approved" })).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Patch, $"/api/v1/returns/{id}/status", _f.AdminToken, new { status = "Approved", adminNotes = "ok" })).Status);
    }

    [Fact]
    public async Task Return_creation_requires_ownership_and_a_delivered_order()
    {
        var (_, delivered) = await OrderOfAsync(_f.Alice, OrderStatus.Delivered);
        var (_, pending) = await OrderOfAsync(_f.Alice, OrderStatus.Pending);
        var (_, guest) = await OrderOfAsync(null, OrderStatus.Delivered, guestEmail: "g@example.test", guestPhone: "9876543210");

        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", _f.BobToken, new { orderId = delivered.Id, reason = "x" })).Status);     // someone else's order
        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", _f.BobToken, new { orderId = guest.Id, reason = "x" })).Status);         // a guest order
        Assert.Equal(HttpStatusCode.BadRequest, (await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", _f.AliceToken, new { orderId = pending.Id, reason = "x" })).Status);   // not delivered yet
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", null, new { orderId = delivered.Id, reason = "x" })).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Post, "/api/v1/returns", _f.AliceToken, new { orderId = delivered.Id, reason = "x" })).Status);
    }

    // ----- invoice -----

    [Fact]
    public async Task Invoice_is_for_the_owner_or_an_admin_only()
    {
        var (_, order) = await OrderOfAsync(_f.Alice);
        var (_, guest) = await OrderOfAsync(null, guestEmail: "g@example.test", guestPhone: "9876543210");

        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}/invoice")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}/invoice", _f.BobToken)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{guest.Id}/invoice", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}/invoice", _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Get, $"/api/v1/orders/{order.Id}/invoice", _f.AdminToken)).Status);
    }

    // ----- checkout validation through the real API -----

    private static object Body(Guid productId, string phone, string pin, int paymentMethod = 1) => new
    {
        guestName = "Guest Buyer", guestEmail = "buyer@example.test", guestPhone = phone, paymentMethod,
        shippingAddress = new { fullName = "Guest Buyer", phone, line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = pin, country = "India" },
        billingAddress = new { fullName = "Guest Buyer", phone, line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = pin, country = "India" },
        items = new[] { new { productId, quantity = 1 } }
    };

    [Theory]
    [InlineData("12345", "110001")]
    [InlineData("5876543210", "110001")]
    [InlineData("9876543210", "1100")]
    [InlineData("9876543210", "ABCDEF")]
    public async Task Checkout_rejects_an_invalid_phone_or_pin(string phone, string pin)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 5);

        var res = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders", null, Body(p.Id, phone, pin));

        Assert.Equal(HttpStatusCode.BadRequest, res.Status);
        Assert.Equal(5, await Seed.StockAsync(_f.Db, p.Id));
    }

    [Fact]
    public async Task A_guest_cannot_choose_cash_on_delivery_but_can_pay_online()
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 5);

        var cod = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders", null, Body(p.Id, "9876543210", "110001", paymentMethod: 2));
        Assert.Equal(HttpStatusCode.BadRequest, cod.Status);
        Assert.Contains("logged-in", cod.Body.GetProperty("message").GetString());
        Assert.Equal(5, await Seed.StockAsync(_f.Db, p.Id));                                        // nothing was ordered

        var online = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders", null, Body(p.Id, "9876543210", "110001", paymentMethod: 1));
        Assert.Equal(HttpStatusCode.OK, online.Status);
    }

    [Fact]
    public async Task A_logged_in_customer_can_still_choose_cash_on_delivery()
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 5);
        var body = new
        {
            paymentMethod = 2,
            shippingAddress = new { fullName = "Alice", phone = "9876543210", line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = "110001", country = "India" },
            billingAddress = new { fullName = "Alice", phone = "9876543210", line1 = "12 Main Road", city = "Delhi", state = "Delhi", postalCode = "110001", country = "India" },
            items = new[] { new { productId = p.Id, quantity = 1 } }
        };
        var res = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders", _f.AliceToken, body);
        Assert.Equal(HttpStatusCode.OK, res.Status);
    }

    [Fact]
    public async Task Checkout_accepts_a_valid_order_and_stores_the_normalised_phone()
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db, stock: 5);

        var res = await Api.SendAsync(HttpMethod.Post, "/api/v1/orders", null, Body(p.Id, "+91 98765-43210", "110001"));

        Assert.Equal(HttpStatusCode.OK, res.Status);
        await using var check = _f.Db.NewContext();
        var o = await check.Orders.SingleAsync(x => x.OrderNumber == Num(res.Body));
        Assert.Equal("9876543210", o.ShippingPhone);
        Assert.Equal(4, await Seed.StockAsync(_f.Db, p.Id));
    }
}

/// <summary>Separate API instance with a tiny limit so the rate-limit test cannot affect the other tests.</summary>
public class LimitedApiFixture : ApiFixture
{
    protected override int TrackLimit => 3;
}

public class GuestTrackingRateLimitTests : IClassFixture<LimitedApiFixture>
{
    private readonly LimitedApiFixture _f;
    public GuestTrackingRateLimitTests(LimitedApiFixture f) => _f = f;

    [Fact]
    public async Task Repeated_guest_lookups_are_rate_limited()
    {
        var codes = new List<HttpStatusCode>();
        for (var i = 0; i < 6; i++)
            codes.Add((await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/orders/track", null,
                new { orderNumber = "ORD-20260101-GUESS" + i, contact = "a@b.test" })).Status);

        Assert.Equal(3, codes.Count(c => c == HttpStatusCode.NotFound));          // allowed, but generic "not found"
        Assert.Equal(3, codes.Count(c => c == HttpStatusCode.TooManyRequests));   // then blocked
    }
}
