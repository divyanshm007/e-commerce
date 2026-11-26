using System.Net;
using System.Text.Json;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Tests.Support;

namespace EcommerceApp.Tests;

/// <summary>The customer list and addresses come back in the API's usual {data} envelope (the admin Customers page was empty without it).</summary>
public class CustomersApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public CustomersApiTests(ApiFixture f) => _f = f;

    [Fact]
    public async Task The_admin_customer_list_has_the_customers_inside_data_items_and_is_admin_only()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers", _f.AliceToken)).Status);

        var res = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers?page=1&pageSize=100", _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, res.Status);
        var data = res.Body.GetProperty("data");
        var emails = data.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("email").GetString()).ToList();
        Assert.Contains(_f.Alice.Email, emails);
        Assert.Contains(_f.Bob.Email, emails);
        Assert.DoesNotContain(_f.Admin.Email, emails);                              // admins are not customers
        Assert.True(data.GetProperty("totalCount").GetInt32() >= 2);
    }

    [Fact]
    public async Task Spent_counts_paid_and_delivered_orders_but_not_cancelled_ones()
    {
        await using (var db = _f.Db.NewContext())
        {
            var p = await Seed.ProductAsync(db, stock: 100, price: 100m);
            await Seed.OrderAsync(db, p, _f.Bob.Id, OrderStatus.Delivered, PaymentStatus.Pending, PaymentMethod.CashOnDelivery, 1);          // COD delivered: counts (100)
            await Seed.OrderAsync(db, p, _f.Bob.Id, OrderStatus.Confirmed, PaymentStatus.Paid, PaymentMethod.Razorpay, 2);                    // paid online: counts (200)
            await Seed.OrderAsync(db, p, _f.Bob.Id, OrderStatus.Cancelled, PaymentStatus.Paid, PaymentMethod.Razorpay, 5);                    // cancelled: does not
            await Seed.OrderAsync(db, p, _f.Bob.Id, OrderStatus.Pending, PaymentStatus.Pending, PaymentMethod.CashOnDelivery, 7);             // not delivered yet: does not
        }
        var res = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers?page=1&pageSize=100", _f.AdminToken);
        var bob = res.Body.GetProperty("data").GetProperty("items").EnumerateArray().Single(i => i.GetProperty("email").GetString() == _f.Bob.Email);
        Assert.Equal(300m, bob.GetProperty("totalSpent").GetDecimal());
        Assert.Equal(4, bob.GetProperty("orderCount").GetInt32());
    }

    [Fact]
    public async Task A_customers_saved_addresses_come_back_inside_data()
    {
        var add = await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/customers/addresses", _f.AliceToken, new
        {
            fullName = "Alice", phone = "9876543210", line1 = "1 Test Road", city = "Delhi", state = "Delhi", postalCode = "110001", country = "India", addressType = 1, isDefault = true
        });
        Assert.Equal(HttpStatusCode.OK, add.Status);

        var list = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers/addresses", _f.AliceToken);
        Assert.Equal(JsonValueKind.Array, list.Body.GetProperty("data").ValueKind);
        Assert.Contains(list.Body.GetProperty("data").EnumerateArray(), a => a.GetProperty("line1").GetString() == "1 Test Road");

        var bobs = await _f.Api.SendAsync(HttpMethod.Get, "/api/v1/customers/addresses", _f.BobToken);
        Assert.DoesNotContain(bobs.Body.GetProperty("data").EnumerateArray(), a => a.GetProperty("line1").GetString() == "1 Test Road");   // not shared
    }
}
