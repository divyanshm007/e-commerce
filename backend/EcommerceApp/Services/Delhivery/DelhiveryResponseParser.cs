using System.Globalization;
using System.Text.Json;
using EcommerceApp.Application.DTOs.Shipments;

namespace EcommerceApp.Infrastructure.Services.Delhivery;

public sealed record ResponseInspection(bool IsValidJson, bool IsObject, bool IsArray, int Length);

public enum CreateVerdict
{
    /// <summary>The body is not one of the confirmed shapes. The outcome is unknown.</summary>
    Unrecognised,
    /// <summary>Confirmed success shape: success=true, packages[0].status="Success", a waybill and our reference.</summary>
    Created,
    /// <summary>Confirmed failure shape: success=false, packages[0].status="Fail", empty waybill. Nothing was created.</summary>
    Refused
}

public sealed record ParsedCreate(ResponseInspection Inspection, CreateVerdict Verdict, string? Awb, string? ClientRef, string? UploadRef, IReadOnlyList<string> Remarks)
{
    public bool SchemaConfirmed => Verdict != CreateVerdict.Unrecognised;
}

public enum TrackingVerdict
{
    Unrecognised,
    /// <summary>Confirmed success shape: ShipmentData[].Shipment.</summary>
    Found,
    /// <summary>Confirmed "no such waybill" answer: Success=false and an Error saying the data does not exist.</summary>
    NotFound
}

public sealed record ParsedTracking(ResponseInspection Inspection, TrackingVerdict Verdict, IReadOnlyList<DelhiveryTrackedShipment> Shipments)
{
    public bool SchemaConfirmed => Verdict != TrackingVerdict.Unrecognised;
}

/// <summary>
/// Reads Delhivery response bodies using ONLY the shapes captured from Delhivery's staging environment on 2026-11-09
/// (docs/delhivery/fixtures/staging-2026-11-09/): create success, create failure, tracking success, tracking unknown waybill.
/// Anything else is "Unrecognised", which callers treat as an unknown outcome – never as success or failure. A body that does not match,
/// has extra fields, or has missing optional fields never throws.
///
/// Still UNCONFIRMED: the time zone of scan times (assumed India Standard Time, offset configurable), the shape of a multi-scan answer
/// beyond the Scans array, the HTTP status codes, and the 401/403/429/5xx bodies.
/// </summary>
public static class DelhiveryResponseParser
{
    public const int MaxBodyBytes = 1_048_576;

    /// <summary>Operations whose response shape is confirmed by a captured Delhivery sample: create success, create failure, tracking, unknown waybill.</summary>
    public const int DocumentedSamples = 4;

    /// <summary>Delhivery's scan times carry no zone; they are read as India Standard Time (UTC+05:30), the account's local time. Unconfirmed assumption.</summary>
    public const int DefaultScanOffsetMinutes = 330;

    public static ResponseInspection Inspect(string? body)
    {
        if (string.IsNullOrWhiteSpace(body)) return new ResponseInspection(false, false, false, 0);
        if (body.Length > MaxBodyBytes) return new ResponseInspection(false, false, false, body.Length);
        try
        {
            using var doc = JsonDocument.Parse(body, new JsonDocumentOptions { MaxDepth = 64, AllowTrailingCommas = false });
            var kind = doc.RootElement.ValueKind;
            return new ResponseInspection(true, kind == JsonValueKind.Object, kind == JsonValueKind.Array, body.Length);
        }
        catch (JsonException)
        {
            return new ResponseInspection(false, false, false, body.Length);
        }
    }

    // ───────────────────────── create ─────────────────────────

    public static ParsedCreate ParseCreate(string? body, string? expectedRef = null)
    {
        var inspection = Inspect(body);
        var unrecognised = new ParsedCreate(inspection, CreateVerdict.Unrecognised, null, null, null, []);
        if (!inspection.IsObject) return unrecognised;

        try
        {
            using var doc = JsonDocument.Parse(body!, new JsonDocumentOptions { MaxDepth = 64 });
            var root = doc.RootElement;
            if (!TryBool(root, "success", out var success)) return unrecognised;
            if (!root.TryGetProperty("packages", out var packages) || packages.ValueKind != JsonValueKind.Array || packages.GetArrayLength() != 1) return unrecognised;

            var pkg = packages[0];
            if (pkg.ValueKind != JsonValueKind.Object) return unrecognised;
            var status = Str(pkg, "status");
            var waybill = Str(pkg, "waybill") ?? "";
            var refnum = Str(pkg, "refnum");
            var upload = Str(root, "upload_wbn");
            var remarks = Remarks(pkg);

            // a response for some other reference is not evidence about ours
            if (expectedRef != null && !string.Equals(refnum, expectedRef, StringComparison.Ordinal)) return unrecognised;

            if (success && status == "Success" && waybill.Length > 0)
                return new ParsedCreate(inspection, CreateVerdict.Created, waybill, refnum, upload, remarks);

            if (!success && status == "Fail" && waybill.Length == 0)
                return new ParsedCreate(inspection, CreateVerdict.Refused, null, refnum, upload, remarks);

            return unrecognised;
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            return unrecognised;
        }
    }

    // ───────────────────────── tracking ─────────────────────────

    public static ParsedTracking ParseTracking(string? body, int scanOffsetMinutes = DefaultScanOffsetMinutes)
    {
        var inspection = Inspect(body);
        var unrecognised = new ParsedTracking(inspection, TrackingVerdict.Unrecognised, []);
        if (!inspection.IsObject) return unrecognised;

        try
        {
            using var doc = JsonDocument.Parse(body!, new JsonDocumentOptions { MaxDepth = 64 });
            var root = doc.RootElement;

            if (root.TryGetProperty("ShipmentData", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                var list = new List<DelhiveryTrackedShipment>();
                foreach (var item in data.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty("Shipment", out var s) || s.ValueKind != JsonValueKind.Object) continue;
                    var awb = Str(s, "AWB");
                    if (string.IsNullOrWhiteSpace(awb)) continue;                     // without its waybill a shipment cannot be matched to ours

                    var scans = new List<DelhiveryScan>();
                    if (s.TryGetProperty("Scans", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        foreach (var sc in arr.EnumerateArray())
                            if (sc.ValueKind == JsonValueKind.Object && sc.TryGetProperty("ScanDetail", out var d) && d.ValueKind == JsonValueKind.Object)
                            {
                                var text = Str(d, "Scan");
                                if (string.IsNullOrWhiteSpace(text)) continue;
                                scans.Add(new DelhiveryScan(Str(d, "ScanType"), text, Str(d, "StatusCode"), Time(d, "ScanDateTime", scanOffsetMinutes),
                                    Str(d, "ScannedLocation"), Str(d, "Instructions")));
                            }

                    DelhiveryScan? current = null;
                    if (s.TryGetProperty("Status", out var st) && st.ValueKind == JsonValueKind.Object && !string.IsNullOrWhiteSpace(Str(st, "Status")))
                        current = new DelhiveryScan(Str(st, "StatusType"), Str(st, "Status")!, Str(st, "StatusCode"), Time(st, "StatusDateTime", scanOffsetMinutes),
                            Str(st, "StatusLocation"), Str(st, "Instructions"));

                    list.Add(new DelhiveryTrackedShipment(awb!, Str(s, "ReferenceNo"), Date(s, "ExpectedDeliveryDate"), current, scans));
                }
                return list.Count > 0 ? new ParsedTracking(inspection, TrackingVerdict.Found, list) : unrecognised;
            }

            if (TryBool(root, "Success", out var ok) && !ok)
            {
                var error = Str(root, "Error") ?? "";
                if (error.Contains("does not exist", StringComparison.OrdinalIgnoreCase))
                    return new ParsedTracking(inspection, TrackingVerdict.NotFound, []);
            }
            return unrecognised;
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            return unrecognised;
        }
    }

    // ───────────────────────── helpers (never throw on an unexpected type) ─────────────────────────

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static bool TryBool(JsonElement e, string name, out bool value)
    {
        value = false;
        if (!e.TryGetProperty(name, out var v) || v.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return false;
        value = v.GetBoolean();
        return true;
    }

    private static IReadOnlyList<string> Remarks(JsonElement pkg)
    {
        var list = new List<string>();
        if (pkg.TryGetProperty("remarks", out var r) && r.ValueKind == JsonValueKind.Array)
            foreach (var x in r.EnumerateArray())
            {
                if (x.ValueKind != JsonValueKind.String) continue;
                var t = new string((x.GetString() ?? "").Where(c => !char.IsControl(c)).ToArray()).Trim();
                if (t.Length == 0) continue;                                      // the success sample carries one empty remark
                list.Add(t.Length > 200 ? t[..200] : t);
                if (list.Count == 5) break;
            }
        return list;
    }

    /// <summary>A date-time without a zone, read as local India time and returned as UTC. Unparseable text is ignored, never guessed.</summary>
    private static DateTime? Time(JsonElement e, string name, int offsetMinutes)
    {
        var text = Str(e, name);
        if (text == null) return null;
        if (!DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed)) return null;
        // AssumeUniversal treated the clock reading as UTC; shift it by the zone offset to get the real UTC instant
        return DateTime.SpecifyKind(parsed.AddMinutes(-offsetMinutes), DateTimeKind.Utc);
    }

    private static DateOnly? Date(JsonElement e, string name)
    {
        var text = Str(e, name);
        return text != null && DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? DateOnly.FromDateTime(d) : null;
    }
}
