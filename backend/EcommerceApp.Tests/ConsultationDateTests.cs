using System.Net;
using EcommerceApp.Tests.Support;

namespace EcommerceApp.Tests;

/// <summary>A consultation can be booked for today or later, never for a day that has already passed.</summary>
public class ConsultationDateTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public ConsultationDateTests(ApiFixture f) => _f = f;

    private static object Body(string? date) => new
    {
        name = "Test Person", email = "test.person@example.test", phone = "9876543210",
        concern = "Test concern", preferredDate = date, preferredTime = "10:00 AM", doshaType = ""
    };

    [Fact]
    public async Task A_past_date_is_refused()
    {
        var yesterday = DateTime.UtcNow.AddMinutes(330).AddDays(-1).ToString("yyyy-MM-dd");
        var res = await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/consultation", null, Body(yesterday));
        Assert.Equal(HttpStatusCode.BadRequest, res.Status);
        Assert.Contains("passed", res.Body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Today_a_later_date_and_no_date_are_accepted()
    {
        var today = DateTime.UtcNow.AddMinutes(330);
        foreach (var d in new string?[] { today.ToString("yyyy-MM-dd"), today.AddDays(5).ToString("yyyy-MM-dd"), null, "" })
            Assert.Equal(HttpStatusCode.OK, (await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/consultation", null, Body(d))).Status);
    }

    [Fact]
    public async Task Nonsense_text_is_refused_instead_of_stored()
    {
        Assert.Equal(HttpStatusCode.BadRequest, (await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/consultation", null, Body("not-a-date"))).Status);
    }
}
