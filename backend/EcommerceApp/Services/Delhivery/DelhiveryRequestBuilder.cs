using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;

namespace EcommerceApp.Infrastructure.Services.Delhivery;

/// <summary>
/// Builds the two requests Stage 2.3 covers, using only what Delhivery's B2C documentation states:
///  - POST /api/cmu/create.json : body `format=json&amp;data=&lt;JSON&gt;` exactly as the documented sample, JSON = { shipments:[{...}], pickup_location:{name} }
///  - GET  /api/v1/packages/json/?waybill=a,b,...&amp;ref_ids=... (up to 50 waybills)
/// A missing mandatory value is reported as an error; it is never replaced by a made-up one.
/// </summary>
public static class DelhiveryRequestBuilder
{
    public const string CreatePath = "/api/cmu/create.json";
    public const string TrackPath = "/api/v1/packages/json/";
    public const int MaxWaybillsPerTrackRequest = 50;          // documented: "Track upto 50 waybills (comma-separated) with a single request"

    // documented: the raw JSON body does not accept & # % ; \  (and JSON itself needs " escaped, which would add a backslash)
    private static readonly Regex Restricted = new("[&#%;\\\\\"\\u0000-\\u001F\\u007F]", RegexOptions.Compiled);
    private static readonly Regex Spaces = new("\\s{2,}", RegexOptions.Compiled);
    private static readonly Regex Token = new("^[A-Za-z0-9._-]{1,60}$", RegexOptions.Compiled);

    private static readonly JsonWriterOptions WriterOptions = new() { Indented = false, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>Replaces the characters Delhivery does not accept (never drops text silently) and tidies spaces.</summary>
    public static (string Text, bool Changed) Sanitize(string? value)
    {
        if (string.IsNullOrEmpty(value)) return ("", false);
        var s = value
            .Replace("&", " and ").Replace("#", " No ").Replace("%", " percent").Replace(";", ",")
            .Replace("\\", "/").Replace("\"", "'");
        s = Regex.Replace(s, "[\\u0000-\\u001F\\u007F]", " ");
        s = Spaces.Replace(s, " ").Trim();
        return (s, s != value.Trim());
    }

    /// <summary>
    /// Maps an order's stored delivery data to the documented create-request fields. Eligibility (payment verified, approved, not
    /// cancelled) is decided elsewhere; this only checks that the data Delhivery needs is present and valid, and that an online order
    /// is not sent as Prepaid unless it is actually paid.
    /// </summary>
    public static BuildResult<DelhiveryShipmentRequest> FromOrder(Order order, string clientOrderRef, string pickupLocation, int? weightGrams = null)
    {
        var errors = new List<string>();
        var sanitized = new List<string>();

        string Clean(string field, string? value, bool required, string label)
        {
            var (text, changed) = Sanitize(value);
            if (changed) sanitized.Add(field);
            if (required && text.Length == 0) errors.Add($"{label} is missing.");
            return text;
        }

        var name = Clean("name", order.ShippingFullName, true, "Consignee name");
        var line = Clean("add", string.Join(", ", new[] { order.ShippingLine1, order.ShippingLine2 }.Where(x => !string.IsNullOrWhiteSpace(x))), true, "Delivery address");
        var city = Clean("city", order.ShippingCity, false, "City");
        var state = Clean("state", order.ShippingState, false, "State");
        var country = Clean("country", order.ShippingCountry, false, "Country");

        var phone = ContactNormalizer.TryNormalizePhone(order.ShippingPhone);
        if (phone == null) errors.Add("A valid 10-digit consignee mobile number is required.");

        var pin = order.ShippingPostalCode?.Trim() ?? "";
        if (!ContactNormalizer.IsValidPin(pin)) errors.Add("A valid 6-digit PIN code is required.");

        if (string.IsNullOrWhiteSpace(clientOrderRef) || clientOrderRef.Length > 60 || !Token.IsMatch(clientOrderRef))
            errors.Add("The order reference is missing or contains characters Delhivery does not accept.");

        if (string.IsNullOrEmpty(pickupLocation) || Restricted.IsMatch(pickupLocation))
            errors.Add("The pickup location is missing or contains characters Delhivery does not accept.");

        string paymentMode = "";
        decimal? cod = null;
        if (order.PaymentMethod == PaymentMethod.CashOnDelivery)
        {
            paymentMode = "COD";
            if (order.TotalAmount <= 0) errors.Add("The COD amount must be greater than zero.");
            cod = order.TotalAmount;
        }
        else if (order.PaymentMethod == PaymentMethod.Razorpay)
        {
            paymentMode = "Prepaid";
            if (order.PaymentStatus != PaymentStatus.Paid) errors.Add("An online order can only be sent as Prepaid once its payment is verified.");
        }
        else errors.Add("The payment method is not supported for a forward shipment.");

        var items = order.Items ?? [];
        var products = Clean("products_desc", string.Join(", ", items.Select(i => i.ProductName).Where(n => !string.IsNullOrWhiteSpace(n))), false, "Products");
        var quantity = items.Sum(i => i.Quantity);

        if (weightGrams is <= 0) errors.Add("The package weight must be greater than zero when supplied.");

        if (errors.Count > 0) return BuildResult<DelhiveryShipmentRequest>.Fail(errors);

        return BuildResult<DelhiveryShipmentRequest>.Ok(new DelhiveryShipmentRequest
        {
            Name = name, Add = line, Pin = pin, Phone = phone!, OrderRef = clientOrderRef, PaymentMode = paymentMode,
            PickupLocation = pickupLocation,
            City = city.Length > 0 ? city : null, State = state.Length > 0 ? state : null, Country = country.Length > 0 ? country : null,
            ProductsDesc = products.Length > 0 ? products : null,
            Quantity = quantity > 0 ? quantity.ToString(CultureInfo.InvariantCulture) : null,
            TotalAmount = order.TotalAmount > 0 ? order.TotalAmount : null,
            CodAmount = cod,
            WeightGrams = weightGrams,
            SanitizedFields = sanitized
        });
    }

    /// <summary>Re-checks a request that was built elsewhere (defence in depth before anything is sent).</summary>
    public static IReadOnlyList<string> Validate(DelhiveryShipmentRequest r)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(r.Name)) errors.Add("Consignee name is missing.");
        if (string.IsNullOrWhiteSpace(r.Add)) errors.Add("Delivery address is missing.");
        if (!ContactNormalizer.IsValidPin(r.Pin)) errors.Add("A valid 6-digit PIN code is required.");
        if (ContactNormalizer.TryNormalizePhone(r.Phone) != r.Phone) errors.Add("A valid 10-digit consignee mobile number is required.");
        if (string.IsNullOrWhiteSpace(r.OrderRef) || !Token.IsMatch(r.OrderRef)) errors.Add("The order reference is missing or invalid.");
        if (r.PaymentMode is not ("Prepaid" or "COD")) errors.Add("The payment mode must be Prepaid or COD.");
        if (r.PaymentMode == "COD" && (r.CodAmount is null or <= 0)) errors.Add("The COD amount must be greater than zero.");
        if (string.IsNullOrEmpty(r.PickupLocation) || Restricted.IsMatch(r.PickupLocation)) errors.Add("The pickup location is missing or invalid.");
        foreach (var (label, v) in new[] { ("name", r.Name), ("add", r.Add), ("city", r.City), ("state", r.State), ("country", r.Country), ("products_desc", r.ProductsDesc) })
            if (v != null && Restricted.IsMatch(v)) errors.Add($"The {label} contains a character Delhivery does not accept.");
        return errors;
    }

    /// <summary>
    /// The documented body: `format=json&amp;data=` followed by the JSON. With the documented header Content-Type: application/json the JSON follows as is
    /// (as in Delhivery's sample); with application/x-www-form-urlencoded the JSON is URL-encoded. Which content type the live service really expects
    /// is NOT confirmed by the documentation, so it is a setting.
    /// </summary>
    public static string SerializeCreateBody(DelhiveryShipmentRequest r, string contentType)
    {
        var json = SerializeCreateJson(r);
        return contentType == "application/x-www-form-urlencoded"
            ? "format=json&data=" + Uri.EscapeDataString(json)
            : "format=json&data=" + json;
    }

    public static string SerializeCreateJson(DelhiveryShipmentRequest r)
    {
        using var ms = new MemoryStream();
        using (var w = new Utf8JsonWriter(ms, WriterOptions))
        {
            w.WriteStartObject();
            w.WriteStartArray("shipments");
            w.WriteStartObject();
            w.WriteString("name", r.Name);
            w.WriteString("add", r.Add);
            w.WriteString("pin", r.Pin);
            if (r.City != null) w.WriteString("city", r.City);
            if (r.State != null) w.WriteString("state", r.State);
            if (r.Country != null) w.WriteString("country", r.Country);
            w.WriteString("phone", r.Phone);
            w.WriteString("order", r.OrderRef);
            w.WriteString("payment_mode", r.PaymentMode);
            if (r.ProductsDesc != null) w.WriteString("products_desc", r.ProductsDesc);
            if (r.CodAmount != null) w.WriteNumber("cod_amount", r.CodAmount.Value);
            if (r.TotalAmount != null) w.WriteNumber("total_amount", r.TotalAmount.Value);
            if (r.Quantity != null) w.WriteString("quantity", r.Quantity);
            w.WriteString("waybill", "");                 // documented sample: empty = no pre-fetched waybill; Delhivery assigns one
            if (r.WeightGrams != null) w.WriteNumber("weight", r.WeightGrams.Value);
            w.WriteEndObject();
            w.WriteEndArray();
            w.WriteStartObject("pickup_location");
            w.WriteString("name", r.PickupLocation);
            w.WriteEndObject();
            w.WriteEndObject();
        }
        return Encoding.UTF8.GetString(ms.ToArray());
    }

    /// <summary>A reference-only lookup: ref_ids=x (the documented optional parameter used without a waybill – shape unconfirmed).</summary>
    public static BuildResult<string> BuildReferenceQuery(string? orderRef)
    {
        var r = orderRef?.Trim() ?? "";
        return Token.IsMatch(r) ? BuildResult<string>.Ok("ref_ids=" + Uri.EscapeDataString(r))
                                : BuildResult<string>.Fail(["The order reference is missing or contains characters that are not accepted."]);
    }

    /// <summary>The query string for the tracking call: waybill=a,b,c (max 50) and optionally ref_ids=x,y.</summary>
    public static BuildResult<string> BuildTrackingQuery(IReadOnlyCollection<string>? waybills, IReadOnlyCollection<string>? orderRefs = null)
    {
        var errors = new List<string>();
        var ways = (waybills ?? []).Select(w => w?.Trim() ?? "").Where(w => w.Length > 0).Distinct(StringComparer.Ordinal).ToList();
        var refs = (orderRefs ?? []).Select(w => w?.Trim() ?? "").Where(w => w.Length > 0).Distinct(StringComparer.Ordinal).ToList();

        if (ways.Count == 0) errors.Add("At least one waybill is required (the documentation marks it mandatory).");
        if (ways.Count > MaxWaybillsPerTrackRequest) errors.Add($"At most {MaxWaybillsPerTrackRequest} waybills can be tracked in one request.");
        if (ways.Any(w => !Token.IsMatch(w))) errors.Add("A waybill contains characters that are not accepted.");
        if (refs.Any(r => !Token.IsMatch(r))) errors.Add("An order reference contains characters that are not accepted.");
        if (errors.Count > 0) return BuildResult<string>.Fail(errors);

        var q = new StringBuilder("waybill=").Append(string.Join(",", ways.Select(Uri.EscapeDataString)));
        if (refs.Count > 0) q.Append("&ref_ids=").Append(string.Join(",", refs.Select(Uri.EscapeDataString)));
        return BuildResult<string>.Ok(q.ToString());
    }
}
