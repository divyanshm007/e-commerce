using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>The real API process: who may approve, reject and see the queues, and who may see a shipment.</summary>
public class FulfilmentApiTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public FulfilmentApiTests(ApiFixture f) => _f = f;
    private ApiHost Api => _f.Api;

    private async Task<Order> OrderAsync(User owner)
    {
        await using var db = _f.Db.NewContext();
        var p = await Seed.ProductAsync(db);
        return await Seed.OrderAsync(db, p, owner.Id);
    }

    [Theory]
    [InlineData("GET", "dashboard")]
    [InlineData("GET", "queue/awaiting-approval")]
    [InlineData("GET", "queue/exceptions")]
    public async Task Queues_need_an_admin(string method, string path)
    {
        var url = "/api/v1/fulfilment/" + path;
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(new HttpMethod(method), url)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(new HttpMethod(method), url, _f.AliceToken)).Status);
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(new HttpMethod(method), url, _f.AdminToken)).Status);
    }

    [Fact]
    public async Task Only_an_admin_can_approve_reject_retry_or_resolve()
    {
        var order = await OrderAsync(_f.Alice);
        foreach (var action in new[] { "approve", "reject", "retry", "resolve" })
        {
            var url = $"/api/v1/fulfilment/orders/{order.Id}/{action}";
            Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Post, url, null, new { reason = "x" })).Status);
            Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(HttpMethod.Post, url, _f.AliceToken, new { reason = "x" })).Status);
            Assert.Equal(HttpStatusCode.Forbidden, (await Api.SendAsync(HttpMethod.Post, url, _f.BobToken, new { reason = "x" })).Status);
        }
        await using var db = _f.Db.NewContext();
        Assert.False(await db.OrderFulfilments.AnyAsync(x => x.OrderId == order.Id));            // nothing happened
    }

    [Fact]
    public async Task Admin_approval_over_http_works_once_and_a_second_attempt_conflicts()
    {
        var order = await OrderAsync(_f.Alice);
        var url = $"/api/v1/fulfilment/orders/{order.Id}/approve";
        Assert.Equal(HttpStatusCode.OK, (await Api.SendAsync(HttpMethod.Post, url, _f.AdminToken)).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await Api.SendAsync(HttpMethod.Post, url, _f.AdminToken)).Status);
    }

    [Fact]
    public async Task There_is_no_manual_create_shipment_endpoint()
    {
        var order = await OrderAsync(_f.Alice);
        foreach (var path in new[] { "create", "shipments", "orders/" + order.Id + "/create-shipment", "orders/" + order.Id + "/ship" })
        {
            var r = await Api.SendAsync(HttpMethod.Post, "/api/v1/fulfilment/" + path, _f.AdminToken, new { });
            Assert.Contains(r.Status, new[] { HttpStatusCode.NotFound, HttpStatusCode.MethodNotAllowed });
        }
    }

    [Fact]
    public async Task A_customer_can_read_only_their_own_shipment()
    {
        var order = await OrderAsync(_f.Alice);
        await using (var db = _f.Db.NewContext())
        {
            db.Shipments.Add(new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = order.OrderNumber, CreationState = "CREATED", Awb = "AWB-API-1", CreateAttempts = 1, LastError = "internal" });
            await db.SaveChangesAsync();
        }
        var url = $"/api/v1/orders/{order.Id}/shipment";

        var mine = await Api.SendAsync(HttpMethod.Get, url, _f.AliceToken);
        Assert.Equal(HttpStatusCode.OK, mine.Status);
        Assert.Equal("AWB-API-1", mine.Body.GetProperty("data").GetProperty("awb").GetString());
        Assert.DoesNotContain("internal", mine.Body.ToString());
        var data = mine.Body.GetProperty("data");
        foreach (var internalField in new[] { "lastError", "fulfilmentState", "mode", "creationState", "approvedBy" })
            Assert.True(!data.TryGetProperty(internalField, out var v) || v.ValueKind == System.Text.Json.JsonValueKind.Null, internalField);

        Assert.Equal(HttpStatusCode.NotFound, (await Api.SendAsync(HttpMethod.Get, url, _f.BobToken)).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.SendAsync(HttpMethod.Get, url)).Status);
        var admin = await Api.SendAsync(HttpMethod.Get, url, _f.AdminToken);
        Assert.Equal(HttpStatusCode.OK, admin.Status);
    }
}
