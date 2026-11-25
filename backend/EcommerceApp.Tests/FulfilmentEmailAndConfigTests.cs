using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace EcommerceApp.Tests;

public class FulfilmentEmailTests
{
    [Theory]
    [InlineData("CREATED", "Shipment created")]
    [InlineData("IN_TRANSIT", "In transit")]
    [InlineData("OUT_FOR_DELIVERY", "Out for delivery")]
    [InlineData("DELIVERED", "Delivered")]
    public void Each_stage_has_its_own_message(string category, string badge)
    {
        var html = EmailTemplates.ShipmentProgress("Asha", new ShipmentEmailInfo("ORD-1", category, "AWB123", "Delhivery", null));
        Assert.Contains(badge, html);
        Assert.Contains("AWB123", html);
        Assert.DoesNotContain("Expected delivery", html);                                    // none is invented
    }

    [Fact]
    public void Expected_date_appears_only_when_supplied_and_values_are_html_encoded()
    {
        var html = EmailTemplates.ShipmentProgress("<b>x</b>", new ShipmentEmailInfo("ORD-1", "IN_TRANSIT", "A<script>", "Delhivery", new DateOnly(2026, 11, 20)));
        Assert.Contains("20 Nov 2026", html);
        Assert.DoesNotContain("<script>", html);
        Assert.DoesNotContain("<b>x</b>", html);
    }

    [Fact]
    public void Links_use_the_real_domain_and_guests_get_the_public_tracking_page()
    {
        var guest = EmailTemplates.ShipmentProgress("A", new ShipmentEmailInfo("ORD-1", "CREATED", "AWB1", "Delhivery", null, true, null));
        Assert.Contains("https://sidham.in/track-order?order=ORD-1", guest);
        Assert.DoesNotContain("sidhampharmacy.com", guest);

        var id = Guid.NewGuid();
        var member = EmailTemplates.ShipmentProgress("A", new ShipmentEmailInfo("ORD-1", "CREATED", "AWB1", "Delhivery", null, false, id));
        Assert.Contains($"https://sidham.in/account/orders/{id}", member);

        var order = new EcommerceApp.Application.DTOs.Orders.OrderDetailDto { Id = id, OrderNumber = "ORD-9", UserId = null };
        Assert.Contains("https://sidham.in/track-order?order=ORD-9", EmailTemplates.OrderConfirmation("A", order));
        order.UserId = Guid.NewGuid();
        Assert.Contains($"https://sidham.in/account/orders/{id}", EmailTemplates.OrderConfirmation("A", order));
        Assert.DoesNotContain("sidhampharmacy.com", EmailTemplates.OrderConfirmation("A", order));
    }

    [Fact]
    public async Task Unknown_category_and_missing_smtp_report_not_sent()
    {
        var svc = new EmailService(new ConfigurationBuilder().Build(), NullLogger<EmailService>.Instance);
        Assert.False(await svc.TrySendShipmentEmailAsync("a@b.test", "A", new ShipmentEmailInfo("1", "NEEDS_REVIEW", null, "Delhivery", null)));
        Assert.False(await svc.TrySendShipmentEmailAsync("a@b.test", "A", new ShipmentEmailInfo("1", "CREATED", null, "Delhivery", null)));   // SMTP not configured
    }
}

public class PickupLocationConfigTests
{
    private static IConfiguration Cfg(params (string, string)[] kv) =>
        new ConfigurationBuilder().AddInMemoryCollection(kv.ToDictionary(x => x.Item1, x => (string?)x.Item2)).Build();

    private static EcommerceApp.Infrastructure.Services.DelhiveryConfigService Make(IConfiguration c) =>
        new(c, null!, null!);

    [Fact]
    public void Staging_and_production_use_their_own_pickup_locations()
    {
        var svc = Make(Cfg());
        Assert.Equal("GANPATIHERBAL SURFACE", svc.PickupLocationFor("test"));
        Assert.Equal("Ganpati Herbal Ayurveda", svc.PickupLocationFor("live"));
    }

    [Fact]
    public void Each_location_can_be_configured_separately()
    {
        var svc = Make(Cfg(("Delhivery:PickupLocationTest", "Test Wherehouse"), ("Delhivery:PickupLocationLive", "Main Hub")));
        Assert.Equal("Test Wherehouse", svc.PickupLocationFor("test"));
        Assert.Equal("Main Hub", svc.PickupLocationFor("live"));
    }
}
