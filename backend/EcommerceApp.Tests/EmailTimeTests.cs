using EcommerceApp.Infrastructure.Services;

namespace EcommerceApp.Tests;

/// <summary>Times in e-mails are shown in Indian Standard Time, clearly labelled.</summary>
public class EmailTimeTests
{
    [Fact]
    public void A_utc_time_is_shown_as_ist_with_the_label_and_crosses_midnight()
    {
        Assert.Equal("27 Nov 2026, 12:00 AM IST", EmailTemplates.Ist(new DateTime(2026, 11, 26, 18, 30, 0, DateTimeKind.Utc)));
        Assert.Equal("26 Nov 2026, 05:30 PM IST", EmailTemplates.Ist(new DateTime(2026, 11, 26, 12, 0, 0, DateTimeKind.Utc)));
        Assert.Equal("27 Nov 2026", EmailTemplates.Ist(new DateTime(2026, 11, 26, 20, 0, 0, DateTimeKind.Utc), false));
    }

    [Fact]
    public void A_time_read_back_from_the_database_without_a_kind_is_treated_as_utc()
    {
        Assert.Equal("26 Nov 2026, 05:30 PM IST", EmailTemplates.Ist(new DateTime(2026, 11, 26, 12, 0, 0, DateTimeKind.Unspecified)));
    }
}
