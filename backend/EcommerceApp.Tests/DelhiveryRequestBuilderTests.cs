using System.Text.Json;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Services.Delhivery;

namespace EcommerceApp.Tests;

/// <summary>
/// Request construction for the two documented calls. The field names, the wrapper `format=json&amp;data=` and the restricted characters come
/// from Delhivery's documentation (Stage 1 / Stage 2.3 discovery). The expected JSON below is built from the documented REQUEST fields only.
/// </summary>
public class DelhiveryRequestBuilderTests
{
    public const string Pickup = "Ganpati Herbal Ayurveda";

    internal static DelhiveryShipmentRequest Sample(Action<Dictionary<string, object?>>? tweak = null) => new()
    {
        Name = "Test Consignee", Add = "12 Main Road, Delhi", Pin = "110001", City = "Delhi", State = "Delhi", Country = "India",
        Phone = "9876543210", OrderRef = "ORD-20261109-ABC123", PaymentMode = "Prepaid", PickupLocation = Pickup,
        ProductsDesc = "Wheat Grass Capsules", Quantity = "1", TotalAmount = 380.00m
    };

    private static Order OrderOf(PaymentMethod method = PaymentMethod.Razorpay, PaymentStatus pay = PaymentStatus.Paid, decimal total = 380m)
    {
        var o = new Order
        {
            OrderNumber = "ORD-20261109-ABC123", PaymentMethod = method, PaymentStatus = pay, TotalAmount = total, SubTotal = total,
            GuestEmail = "private.buyer@example.test", GuestName = "Private Buyer",
            ShippingFullName = "Test Consignee", ShippingPhone = "+91 98765-43210", ShippingLine1 = "12 Main Road", ShippingLine2 = "Near Park",
            ShippingCity = "Delhi", ShippingState = "Delhi", ShippingPostalCode = "110001", ShippingCountry = "India"
        };
        o.Items.Add(new OrderItem { ProductName = "Wheat Grass Capsules", Quantity = 1 });
        o.Items.Add(new OrderItem { ProductName = "Shilajit Resin", Quantity = 2 });
        return o;
    }

    // ───────── serialization ─────────

    [Fact]
    public void The_create_json_has_exactly_the_documented_fields_in_a_stable_order()
    {
        var json = DelhiveryRequestBuilder.SerializeCreateJson(Sample());

        Assert.Equal(
            "{\"shipments\":[{\"name\":\"Test Consignee\",\"add\":\"12 Main Road, Delhi\",\"pin\":\"110001\",\"city\":\"Delhi\",\"state\":\"Delhi\"," +
            "\"country\":\"India\",\"phone\":\"9876543210\",\"order\":\"ORD-20261109-ABC123\",\"payment_mode\":\"Prepaid\"," +
            "\"products_desc\":\"Wheat Grass Capsules\",\"total_amount\":380.00,\"quantity\":\"1\",\"waybill\":\"\"}]," +
            "\"pickup_location\":{\"name\":\"Ganpati Herbal Ayurveda\"}}", json);
    }

    [Fact]
    public void Only_documented_create_fields_are_ever_written()
    {
        var documented = new HashSet<string>
        {
            "name","order","phone","add","pin","address_type","ewbn","hsn_code","shipping_mode","seller_inv","city","weight","return_name","return_address",
            "return_city","return_phone","return_state","return_country","return_pin","seller_name","fragile_shipment","shipment_height","shipment_width",
            "shipment_length","cod_amount","products_desc","state","dangerous_good","waybill","total_amount","seller_add","country","plastic_packaging",
            "quantity","pickup_location","transport_speed","payment_mode","order_date"
        };
        var full = new DelhiveryShipmentRequest
        {
            Name = "A", Add = "B", Pin = "110001", Phone = "9876543210", OrderRef = "R1", PaymentMode = "COD", CodAmount = 100m, PickupLocation = Pickup,
            City = "C", State = "S", Country = "India", ProductsDesc = "P", Quantity = "2", TotalAmount = 100m, WeightGrams = 500
        };

        using var doc = JsonDocument.Parse(DelhiveryRequestBuilder.SerializeCreateJson(full));
        var fields = doc.RootElement.GetProperty("shipments")[0].EnumerateObject().Select(p => p.Name).ToList();

        Assert.All(fields, f => Assert.Contains(f, documented));
        Assert.Equal(["shipments", "pickup_location"], doc.RootElement.EnumerateObject().Select(p => p.Name));
        Assert.DoesNotContain("email", string.Join(",", fields), StringComparison.OrdinalIgnoreCase);       // no consignee e-mail field is documented
    }

    [Fact]
    public void Cod_includes_the_amount_prepaid_does_not_and_weight_is_only_sent_when_known()
    {
        var cod = DelhiveryRequestBuilder.FromOrder(OrderOf(PaymentMethod.CashOnDelivery, PaymentStatus.Pending, 450.50m), "ORD-1", Pickup, weightGrams: 750).Value!;
        using var c = JsonDocument.Parse(DelhiveryRequestBuilder.SerializeCreateJson(cod));
        var codRow = c.RootElement.GetProperty("shipments")[0];
        Assert.Equal("COD", codRow.GetProperty("payment_mode").GetString());
        Assert.Equal(450.50m, codRow.GetProperty("cod_amount").GetDecimal());
        Assert.Equal(750, codRow.GetProperty("weight").GetInt32());

        var prepaid = DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-2", Pickup).Value!;
        using var p = JsonDocument.Parse(DelhiveryRequestBuilder.SerializeCreateJson(prepaid));
        var prepaidRow = p.RootElement.GetProperty("shipments")[0];
        Assert.Equal("Prepaid", prepaidRow.GetProperty("payment_mode").GetString());
        Assert.False(prepaidRow.TryGetProperty("cod_amount", out _));
        Assert.False(prepaidRow.TryGetProperty("weight", out _));
        Assert.False(prepaidRow.TryGetProperty("shipment_length", out _));             // no dimensions exist in our data, so none are sent
    }

    [Fact]
    public void The_pickup_location_is_sent_exactly_as_registered()
    {
        var json = DelhiveryRequestBuilder.SerializeCreateJson(Sample());
        using var doc = JsonDocument.Parse(json);

        Assert.Equal("Ganpati Herbal Ayurveda", doc.RootElement.GetProperty("pickup_location").GetProperty("name").GetString());
    }

    [Fact]
    public void The_waybill_is_sent_empty_exactly_like_the_documented_sample_so_delhivery_assigns_it()
    {
        using var doc = JsonDocument.Parse(DelhiveryRequestBuilder.SerializeCreateJson(Sample()));
        Assert.Equal("", doc.RootElement.GetProperty("shipments")[0].GetProperty("waybill").GetString());
    }

    [Fact]
    public void The_json_content_type_body_follows_the_documented_sample_format_data_json()
    {
        var body = DelhiveryRequestBuilder.SerializeCreateBody(Sample(), "application/json");

        Assert.StartsWith("format=json&data={\"shipments\":[", body);
        Assert.Equal(DelhiveryRequestBuilder.SerializeCreateJson(Sample()), body["format=json&data=".Length..]);
    }

    [Fact]
    public void The_form_encoded_alternative_url_encodes_the_json_and_round_trips()
    {
        var body = DelhiveryRequestBuilder.SerializeCreateBody(Sample(), "application/x-www-form-urlencoded");

        Assert.StartsWith("format=json&data=%7B%22shipments%22", body);
        Assert.Equal(DelhiveryRequestBuilder.SerializeCreateJson(Sample()), Uri.UnescapeDataString(body["format=json&data=".Length..]));
    }

    // ───────── restricted characters ─────────

    [Theory]
    [InlineData("A & B Traders", "A and B Traders")]
    [InlineData("Flat #12", "Flat No 12")]
    [InlineData("50% off", "50 percent off")]
    [InlineData("Lane 1; Block 2", "Lane 1, Block 2")]
    [InlineData("Plot 4\\5", "Plot 4/5")]
    [InlineData("The \"Big\" House", "The 'Big' House")]
    [InlineData("Line1\r\nLine2\tEnd", "Line1 Line2 End")]
    [InlineData("  too    many   spaces ", "too many spaces")]
    public void Characters_delhivery_does_not_accept_are_replaced_not_dropped(string input, string expected)
    {
        var (text, changed) = DelhiveryRequestBuilder.Sanitize(input);

        Assert.Equal(expected, text);
        Assert.True(changed);
    }

    [Fact]
    public void Clean_text_is_left_alone_including_non_ascii_names()
    {
        var (text, changed) = DelhiveryRequestBuilder.Sanitize("Ritu Sharma, 12 Main Road");
        Assert.Equal("Ritu Sharma, 12 Main Road", text);
        Assert.False(changed);

        var (hindi, c2) = DelhiveryRequestBuilder.Sanitize("रितु शर्मा");
        Assert.Equal("रितु शर्मा", hindi);
        Assert.False(c2);
    }

    [Fact]
    public void The_serialised_body_contains_none_of_the_restricted_characters_except_the_documented_wrapper()
    {
        var order = OrderOf();
        order.ShippingFullName = "A & B \"Boss\" 100%";
        order.ShippingLine1 = "Flat #12; Tower \\ 4";
        var req = DelhiveryRequestBuilder.FromOrder(order, "ORD-9", Pickup).Value!;

        var body = DelhiveryRequestBuilder.SerializeCreateBody(req, "application/json");
        var data = body["format=json&data=".Length..];                  // the wrapper's own '&' is part of the documented sample

        foreach (var ch in new[] { '&', '#', '%', ';', '\\' }) Assert.DoesNotContain(ch, data);
        using var doc = JsonDocument.Parse(data);                       // and it is still valid JSON
        Assert.Equal("A and B 'Boss' 100 percent", doc.RootElement.GetProperty("shipments")[0].GetProperty("name").GetString());
        Assert.Contains("name", req.SanitizedFields);                   // the replacement is reported, never silent
        Assert.Contains("add", req.SanitizedFields);
    }

    // ───────── building from an order: nothing fabricated, nothing silently replaced ─────────

    [Fact]
    public void A_valid_order_maps_to_the_documented_fields_with_a_normalised_phone()
    {
        var r = DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-20261109-ABC123", Pickup);

        Assert.True(r.Success);
        var v = r.Value!;
        Assert.Equal("Test Consignee", v.Name);
        Assert.Equal("12 Main Road, Near Park", v.Add);
        Assert.Equal("9876543210", v.Phone);                             // "+91 98765-43210" normalised, not guessed
        Assert.Equal("110001", v.Pin);
        Assert.Equal("Prepaid", v.PaymentMode);
        Assert.Equal("Wheat Grass Capsules, Shilajit Resin", v.ProductsDesc);
        Assert.Equal("3", v.Quantity);
        Assert.Equal(380m, v.TotalAmount);
        Assert.Equal(Pickup, v.PickupLocation);
    }

    [Fact]
    public void Customer_details_that_are_not_documented_request_fields_never_appear_in_the_body()
    {
        var req = DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-20261109-ABC123", Pickup).Value!;
        var body = DelhiveryRequestBuilder.SerializeCreateBody(req, "application/json");

        Assert.DoesNotContain("private.buyer@example.test", body);       // e-mail
        Assert.DoesNotContain("Private Buyer", body);                    // guest name (only the shipping name is sent)
    }

    [Theory]
    [InlineData("name")]
    [InlineData("phone")]
    [InlineData("phone-invalid")]
    [InlineData("pin")]
    [InlineData("pin-invalid")]
    [InlineData("address")]
    public void A_missing_or_invalid_mandatory_value_is_reported_and_nothing_is_built(string problem)
    {
        var o = OrderOf();
        switch (problem)
        {
            case "name": o.ShippingFullName = "  "; break;
            case "phone": o.ShippingPhone = ""; break;
            case "phone-invalid": o.ShippingPhone = "12345"; break;
            case "pin": o.ShippingPostalCode = ""; break;
            case "pin-invalid": o.ShippingPostalCode = "1100"; break;
            case "address": o.ShippingLine1 = ""; o.ShippingLine2 = null; break;
        }

        var r = DelhiveryRequestBuilder.FromOrder(o, "ORD-1", Pickup);

        Assert.False(r.Success);
        Assert.Null(r.Value);
        Assert.NotEmpty(r.Errors);
    }

    [Fact]
    public void Several_problems_are_all_reported_together()
    {
        var o = OrderOf();
        o.ShippingFullName = ""; o.ShippingPhone = "1"; o.ShippingPostalCode = "x";
        var r = DelhiveryRequestBuilder.FromOrder(o, "bad ref!", "");

        Assert.False(r.Success);
        Assert.True(r.Errors.Count >= 5);
    }

    [Fact]
    public void An_unpaid_online_order_is_never_sent_as_prepaid()
    {
        var r = DelhiveryRequestBuilder.FromOrder(OrderOf(PaymentMethod.Razorpay, PaymentStatus.Pending), "ORD-1", Pickup);
        Assert.False(r.Success);
        Assert.Contains(r.Errors, e => e.Contains("payment is verified"));

        Assert.False(DelhiveryRequestBuilder.FromOrder(OrderOf(PaymentMethod.Razorpay, PaymentStatus.Failed), "ORD-1", Pickup).Success);
    }

    [Fact]
    public void A_cod_order_needs_a_positive_amount_that_equals_the_order_total()
    {
        Assert.False(DelhiveryRequestBuilder.FromOrder(OrderOf(PaymentMethod.CashOnDelivery, PaymentStatus.Pending, 0m), "ORD-1", Pickup).Success);
        var ok = DelhiveryRequestBuilder.FromOrder(OrderOf(PaymentMethod.CashOnDelivery, PaymentStatus.Pending, 1234.50m), "ORD-1", Pickup).Value!;
        Assert.Equal(1234.50m, ok.CodAmount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("has space")]
    [InlineData("semi;colon")]
    [InlineData("amp&ersand")]
    public void An_order_reference_with_unsafe_characters_is_refused_not_rewritten(string reference)
    {
        var r = DelhiveryRequestBuilder.FromOrder(OrderOf(), reference, Pickup);
        Assert.False(r.Success);
    }

    [Fact]
    public void The_pickup_location_is_never_altered_and_must_be_safe()
    {
        Assert.False(DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-1", "").Success);
        Assert.False(DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-1", "Ganpati & Sons").Success);
        Assert.Equal("Ganpati Herbal Ayurveda", DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-1", "Ganpati Herbal Ayurveda").Value!.PickupLocation);
    }

    [Fact]
    public void Optional_fields_without_data_are_omitted_not_filled_with_placeholders()
    {
        var o = OrderOf();
        o.ShippingCity = ""; o.ShippingState = " "; o.ShippingCountry = "";
        o.Items.Clear();
        var req = DelhiveryRequestBuilder.FromOrder(o, "ORD-1", Pickup).Value!;

        using var doc = JsonDocument.Parse(DelhiveryRequestBuilder.SerializeCreateJson(req));
        var row = doc.RootElement.GetProperty("shipments")[0];
        foreach (var field in new[] { "city", "state", "country", "products_desc", "quantity" })
            Assert.False(row.TryGetProperty(field, out _), field);
    }

    [Fact]
    public void A_zero_weight_is_refused_but_an_unknown_weight_is_simply_omitted()
    {
        Assert.False(DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-1", Pickup, weightGrams: 0).Success);
        Assert.True(DelhiveryRequestBuilder.FromOrder(OrderOf(), "ORD-1", Pickup, weightGrams: null).Success);
    }

    [Fact]
    public void Validate_rechecks_a_hand_built_request()
    {
        Assert.Empty(DelhiveryRequestBuilder.Validate(Sample()));

        var bad = new DelhiveryShipmentRequest { Name = "", Add = "x", Pin = "1", Phone = "2", OrderRef = "a b", PaymentMode = "Cash", PickupLocation = "" };
        Assert.True(DelhiveryRequestBuilder.Validate(bad).Count >= 6);

        var restricted = new DelhiveryShipmentRequest
        {
            Name = "A & B", Add = "x", Pin = "110001", Phone = "9876543210", OrderRef = "R1", PaymentMode = "Prepaid", PickupLocation = Pickup
        };
        Assert.Contains(DelhiveryRequestBuilder.Validate(restricted), e => e.Contains("name"));
    }

    // ───────── tracking request ─────────

    [Fact]
    public void The_tracking_query_lists_waybills_comma_separated_and_optionally_order_references()
    {
        var q = DelhiveryRequestBuilder.BuildTrackingQuery(["1122345678722", "1122345678733"], ["ORD-1"]);

        Assert.True(q.Success);
        Assert.Equal("waybill=1122345678722,1122345678733&ref_ids=ORD-1", q.Value);
        Assert.Equal("waybill=1122345678722", DelhiveryRequestBuilder.BuildTrackingQuery(["1122345678722"]).Value);
    }

    [Fact]
    public void Up_to_fifty_waybills_are_allowed_and_fifty_one_are_not()
    {
        var fifty = Enumerable.Range(1, 50).Select(i => "10000000" + i).ToList();
        Assert.True(DelhiveryRequestBuilder.BuildTrackingQuery(fifty).Success);

        var tooMany = DelhiveryRequestBuilder.BuildTrackingQuery(fifty.Append("99999999999").ToList());
        Assert.False(tooMany.Success);
        Assert.Contains(tooMany.Errors, e => e.Contains("50"));
    }

    [Fact]
    public void Tracking_waybills_are_trimmed_deduplicated_and_validated()
    {
        Assert.Equal("waybill=123,456", DelhiveryRequestBuilder.BuildTrackingQuery([" 123 ", "456", "123", ""]).Value);
        Assert.False(DelhiveryRequestBuilder.BuildTrackingQuery([]).Success);
        Assert.False(DelhiveryRequestBuilder.BuildTrackingQuery(null).Success);
        Assert.False(DelhiveryRequestBuilder.BuildTrackingQuery(["123&x=1"]).Success);          // no parameter injection
        Assert.False(DelhiveryRequestBuilder.BuildTrackingQuery(["123"], ["a b"]).Success);
    }
}
