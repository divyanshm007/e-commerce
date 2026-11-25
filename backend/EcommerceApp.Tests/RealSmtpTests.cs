using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace EcommerceApp.Tests;

/// <summary>
/// Opt-in: sends the four shipment e-mails through the real SMTP server configured in the API project's local settings.
/// Runs only when ECOM_REAL_SMTP_TO is set (to an address you own); otherwise it passes without sending anything.
/// </summary>
public class RealSmtpTests
{
    [Fact]
    public async Task Shipment_emails_are_delivered_through_the_real_smtp_server()
    {
        var to = Environment.GetEnvironmentVariable("ECOM_REAL_SMTP_TO");
        if (string.IsNullOrWhiteSpace(to)) return;

        var cfg = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(ApiProject.Directory, "appsettings.json"))
            .AddJsonFile(Path.Combine(ApiProject.Directory, "appsettings.Local.json"), optional: false).Build();
        var svc = new EmailService(cfg, NullLogger<EmailService>.Instance);

        foreach (var category in new[] { "CREATED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED" })
            Assert.True(await svc.TrySendShipmentEmailAsync(to, "Test Customer",
                new ShipmentEmailInfo("TEST-SMTP-0001", category, "84925410100041", "Delhivery", null)), $"{category} was not sent");
    }
}
