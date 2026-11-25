using System.Net;
using System.Text;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Infrastructure.Services.Delhivery;

namespace EcommerceApp.Tests;

/// <summary>Parses the four responses captured from Delhivery's staging environment on 2026-11-09 (docs/delhivery/fixtures).</summary>
public class DelhiveryFixtureParserTests
{
    internal static string Fixture(string name)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !Directory.Exists(Path.Combine(dir.FullName, "docs", "delhivery", "fixtures", "staging-2026-11-09"))) dir = dir.Parent;
        Assert.NotNull(dir);
        return File.ReadAllText(Path.Combine(dir!.FullName, "docs", "delhivery", "fixtures", "staging-2026-11-09", name));
    }

    [Fact]
    public void Create_success_is_recognised_with_awb_and_reference()
    {
        var p = DelhiveryResponseParser.ParseCreate(Fixture("create-success.json"), "TEST-STG-0001");
        Assert.Equal(CreateVerdict.Created, p.Verdict);
        Assert.Equal("84925410100041", p.Awb);
        Assert.StartsWith("UPL", p.UploadRef);
        Assert.Empty(p.Remarks);
    }

    [Fact]
    public void Create_success_for_another_reference_is_not_trusted()
    {
        var p = DelhiveryResponseParser.ParseCreate(Fixture("create-success.json"), "SOMETHING-ELSE");
        Assert.Equal(CreateVerdict.Unrecognised, p.Verdict);
        Assert.Null(p.Awb);
    }

    [Fact]
    public void Create_failure_is_refused_with_remark_and_no_awb()
    {
        var p = DelhiveryResponseParser.ParseCreate(Fixture("create-failure-invalid-pin.json"));
        Assert.Equal(CreateVerdict.Refused, p.Verdict);
        Assert.Null(p.Awb);
        Assert.Contains("Consignee pin code is invalid", p.Remarks);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("{\"success\":true}")]
    [InlineData("{\"success\":true,\"packages\":[]}")]
    [InlineData("{\"success\":true,\"packages\":[{\"status\":\"Success\",\"waybill\":\"\"}]}")]
    [InlineData("{\"success\":false,\"packages\":[{\"status\":\"Success\",\"waybill\":\"123\"}]}")]
    public void Create_other_shapes_are_unrecognised_and_never_throw(string body) =>
        Assert.Equal(CreateVerdict.Unrecognised, DelhiveryResponseParser.ParseCreate(body).Verdict);

    [Fact]
    public void Tracking_success_reads_shipment_status_and_scans_with_utc_times()
    {
        var p = DelhiveryResponseParser.ParseTracking(Fixture("tracking-success-single-scan.json"));
        Assert.Equal(TrackingVerdict.Found, p.Verdict);
        var s = Assert.Single(p.Shipments);
        Assert.Equal("84925410100041", s.Awb);
        Assert.Equal("TEST-STG-0001", s.ReferenceNo);
        Assert.Null(s.ExpectedDeliveryDate);
        Assert.Equal("Manifested", s.CurrentStatus!.Status);
        var scan = Assert.Single(s.Scans);
        Assert.Equal("UD", scan.StatusType);
        Assert.Equal("X-UCI", scan.ScanCode);
        // 2026-11-09T16:08:14.553 India time = 10:38:14.553 UTC
        Assert.Equal(new DateTime(2026, 11, 9, 10, 38, 14, 553, DateTimeKind.Utc), scan.ScanTime);
    }

    [Fact]
    public void Tracking_unknown_waybill_is_NotFound()
    {
        var p = DelhiveryResponseParser.ParseTracking(Fixture("tracking-unknown-waybill.json"));
        Assert.Equal(TrackingVerdict.NotFound, p.Verdict);
        Assert.Empty(p.Shipments);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"ShipmentData\":[]}")]
    [InlineData("{\"ShipmentData\":[{\"Shipment\":{}}]}")]
    [InlineData("{\"Success\":false,\"Error\":\"something else\"}")]
    [InlineData("garbage")]
    public void Tracking_other_shapes_are_unrecognised(string body) =>
        Assert.Equal(TrackingVerdict.Unrecognised, DelhiveryResponseParser.ParseTracking(body).Verdict);

    [Fact]
    public void Tracking_with_odd_field_types_does_not_throw()
    {
        var body = "{\"ShipmentData\":[{\"Shipment\":{\"AWB\":\"1\",\"Status\":{\"Status\":5},\"Scans\":[{\"ScanDetail\":{\"Scan\":\"X\",\"ScanDateTime\":12}}],\"ExpectedDeliveryDate\":\"nonsense\"}}]}";
        var p = DelhiveryResponseParser.ParseTracking(body);
        Assert.Equal(TrackingVerdict.Found, p.Verdict);
        Assert.Null(p.Shipments[0].CurrentStatus);
        Assert.Null(p.Shipments[0].ExpectedDeliveryDate);
        Assert.Null(p.Shipments[0].Scans[0].ScanTime);
    }
}
