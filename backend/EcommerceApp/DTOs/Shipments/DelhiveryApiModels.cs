namespace EcommerceApp.Application.DTOs.Shipments;

/// <summary>
/// How a call to Delhivery ended, from the point of view of "what do we know about the outcome".
/// Derived only from the transport and the HTTP status – never from a response body whose schema is not documented.
/// </summary>
public enum DelhiveryOutcome
{
    /// <summary>Nothing left this server (invalid request, token missing, configuration error). Fix and retry is safe.</summary>
    NotSent,
    /// <summary>HTTP 4xx other than 401/403/408/429: the request was refused.</summary>
    DefinitelyRejected,
    /// <summary>HTTP 401/403: the token is wrong or not allowed. A configuration problem, not a data problem.</summary>
    AuthenticationFailed,
    /// <summary>HTTP 429: not processed; try again later (see RetryAfter).</summary>
    RateLimited,
    /// <summary>HTTP 5xx: Delhivery failed; for a create call we cannot know whether it did any work.</summary>
    ServerError,
    /// <summary>No answer within the timeout: ambiguous for a create call.</summary>
    Timeout,
    /// <summary>Connection failure / transport exception: ambiguous for a create call.</summary>
    NetworkFailure,
    /// <summary>A status we did not expect (1xx, 3xx, 408, ...).</summary>
    UnexpectedStatus,
    /// <summary>HTTP 2xx but the body is not valid JSON (or too large).</summary>
    ResponseMalformed,
    /// <summary>HTTP 2xx with valid JSON that is not one of the confirmed response shapes, so nothing is read from it.</summary>
    ResponseUnconfirmed,
    /// <summary>HTTP 2xx and the body is a confirmed success shape (create: success=true with a waybill; tracking: ShipmentData).</summary>
    Succeeded,
    /// <summary>HTTP 2xx and the body is the confirmed failure shape for create: Delhivery refused the shipment, nothing was created.</summary>
    Refused,
    /// <summary>HTTP 2xx and the body is the confirmed "data does not exist" answer for tracking.</summary>
    NotFound
}

/// <summary>What we can say about whether the shipment exists at Delhivery after a create call.</summary>
public enum CreateProcessingState
{
    /// <summary>Certain: Delhivery did not create anything. Safe to correct and retry.</summary>
    NotCreated,
    /// <summary>Not known. Never retry blindly; reconcile first (look the order reference up).</summary>
    Unknown,
    /// <summary>Delhivery confirmed the creation (only produced once a response schema is confirmed – never in Stage 2.3).</summary>
    Created
}

public class DelhiveryCallResult
{
    public string Operation { get; init; } = "";
    public DelhiveryOutcome Outcome { get; init; }
    public int? HttpStatus { get; init; }
    /// <summary>A fixed, sanitised sentence. Never contains the response body, a token or customer data.</summary>
    public string Message { get; init; } = "";
    /// <summary>test or live, or null when the mode could not be determined.</summary>
    public string? Mode { get; init; }
    public TimeSpan? RetryAfter { get; init; }
    public TimeSpan Duration { get; init; }
    public int ResponseBytes { get; init; }

    /// <summary>Worth trying again later without changing anything (for read calls; a create call must reconcile first).</summary>
    public bool IsTransient => Outcome is DelhiveryOutcome.RateLimited or DelhiveryOutcome.ServerError
                                        or DelhiveryOutcome.Timeout or DelhiveryOutcome.NetworkFailure;
}

public sealed class DelhiveryCreateResult : DelhiveryCallResult
{
    public CreateProcessingState Processing { get; init; } = CreateProcessingState.Unknown;
    /// <summary>The waybill. Null until a response schema is confirmed: it is never guessed.</summary>
    public string? Awb { get; init; }
    /// <summary>Delhivery's upload/batch reference (upload_wbn) – an identifier only.</summary>
    public string? UploadRef { get; init; }
    /// <summary>Delhivery's reasons when it refused the shipment (capped, control characters removed).</summary>
    public IReadOnlyList<string> Remarks { get; init; } = [];
    public bool ResponseSchemaConfirmed { get; init; }
}

/// <summary>One scan of a shipment. Every field except the status is optional because only the documented status vocabulary is confirmed.</summary>
public sealed record DelhiveryScan(string? StatusType, string Status, string? ScanCode = null, DateTime? ScanTime = null,
    string? Location = null, string? Description = null);

/// <summary>One shipment in a tracking answer (ShipmentData[].Shipment). Only fields confirmed by captured Delhivery responses.</summary>
public sealed record DelhiveryTrackedShipment(string Awb, string? ReferenceNo, DateOnly? ExpectedDeliveryDate, DelhiveryScan? CurrentStatus,
    IReadOnlyList<DelhiveryScan> Scans);

public sealed class DelhiveryTrackingResult : DelhiveryCallResult
{
    public IReadOnlyList<DelhiveryTrackedShipment> Shipments { get; init; } = [];
    /// <summary>All scans of all returned shipments (kept for callers that track a single waybill).</summary>
    public IReadOnlyList<DelhiveryScan> Scans => Shipments.SelectMany(s => s.Scans).ToList();
    public bool ResponseSchemaConfirmed { get; init; }
}

/// <summary>The documented fields of a shipment-creation request, taken from existing order data. Nothing here is invented.</summary>
public sealed class DelhiveryShipmentRequest
{
    // mandatory in the documentation
    public string Name { get; init; } = "";
    public string OrderRef { get; init; } = "";
    public string Phone { get; init; } = "";
    public string Add { get; init; } = "";
    public string Pin { get; init; } = "";
    /// <summary>Prepaid or COD (forward shipments).</summary>
    public string PaymentMode { get; init; } = "";
    /// <summary>Exactly as registered in Delhivery One – case and spaces matter.</summary>
    public string PickupLocation { get; init; } = "";

    // optional in the documentation; omitted when we have no value
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Country { get; init; }
    public string? ProductsDesc { get; init; }
    public string? Quantity { get; init; }
    public decimal? TotalAmount { get; init; }
    public decimal? CodAmount { get; init; }
    public int? WeightGrams { get; init; }

    /// <summary>Names of the fields where a character Delhivery does not accept had to be replaced (for the log; never silent).</summary>
    public IReadOnlyList<string> SanitizedFields { get; init; } = [];
}

public sealed class BuildResult<T>
{
    public bool Success => Errors.Count == 0;
    public T? Value { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];
    public static BuildResult<T> Ok(T value) => new() { Value = value };
    public static BuildResult<T> Fail(IEnumerable<string> errors) => new() { Errors = errors.ToList() };
}
