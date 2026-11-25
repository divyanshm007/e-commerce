using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EcommerceApp.Infrastructure.Services.Delhivery;

/// <summary>
/// Typed HttpClient for the two Delhivery calls of Stage 2.3. Environment and token come from <see cref="IDelhiveryConfigService"/>; the
/// token goes only into the documented header "Authorization: Token &lt;token&gt;" and is never logged or returned. The outcome of a call
/// is derived from the transport and the HTTP status only (the response schemas are not documented, see <see cref="DelhiveryResponseParser"/>);
/// response bodies are inspected for validity but never stored, logged or echoed.
/// </summary>
public class DelhiveryClient : IDelhiveryClient
{
    private const string StagingHost = "staging-express.delhivery.com";
    private const string ProductionHost = "track.delhivery.com";

    private readonly HttpClient _http;
    private readonly IDelhiveryConfigService _config;
    private readonly DelhiveryClientOptions _options;
    private readonly ILogger<DelhiveryClient> _logger;

    public DelhiveryClient(HttpClient http, IDelhiveryConfigService config, IOptions<DelhiveryClientOptions> options, ILogger<DelhiveryClient> logger)
    {
        _http = http;
        _config = config;
        _options = options.Value;
        _logger = logger;
    }

    // ───────────────────────── create ─────────────────────────

    public async Task<DelhiveryCreateResult> CreateShipmentAsync(DelhiveryShipmentRequest request, CancellationToken ct = default)
    {
        const string op = "create";
        var sw = Stopwatch.StartNew();

        var problems = DelhiveryRequestBuilder.Validate(request);
        if (problems.Count > 0)
            return Create(NotSent(op, "The shipment request is incomplete or invalid: " + string.Join(" ", problems), null, sw), request.OrderRef);

        var contentType = _options.CreateContentType;
        if (contentType is not ("application/json" or "application/x-www-form-urlencoded"))
            return Create(NotSent(op, "The configured Delhivery request content type is not supported.", null, sw), request.OrderRef);

        var target = await ResolveTargetAsync(op, sw);
        if (target.Failure != null) return Create(target.Failure, request.OrderRef);

        var body = DelhiveryRequestBuilder.SerializeCreateBody(request, contentType);
        using var message = new HttpRequestMessage(HttpMethod.Post, new Uri(target.Base!, DelhiveryRequestBuilder.CreatePath));
        message.Content = new StringContent(body, Encoding.UTF8, contentType);
        ApplyHeaders(message, target.Credentials!);

        var call = await SendAsync(op, message, target.Credentials!.Mode, TimeSpan.FromSeconds(_options.CreateTimeoutSeconds), sw, ct);
        return Create(call, request.OrderRef);
    }

    private DelhiveryCreateResult Create(CallOutcome c, string expectedRef)
    {
        // For a create call only these outcomes prove that nothing was created; every other outcome leaves the result unknown.
        var processing = c.Outcome is DelhiveryOutcome.NotSent or DelhiveryOutcome.DefinitelyRejected
                                   or DelhiveryOutcome.AuthenticationFailed or DelhiveryOutcome.RateLimited
            ? CreateProcessingState.NotCreated
            : CreateProcessingState.Unknown;

        var parsed = c.Outcome == DelhiveryOutcome.ResponseUnconfirmed ? DelhiveryResponseParser.ParseCreate(c.Body, expectedRef) : null;
        if (parsed != null)
        {
            var o = parsed.Verdict switch { CreateVerdict.Created => DelhiveryOutcome.Succeeded, CreateVerdict.Refused => DelhiveryOutcome.Refused, _ => DelhiveryOutcome.ResponseUnconfirmed };
            c = c with { Outcome = o, Message = o == DelhiveryOutcome.ResponseUnconfirmed ? c.Message : MessageFor(o, c.HttpStatus ?? 0) };
            Log(c);
            // only the two confirmed shapes change what we know: Created proves it exists, Refused proves it does not
            processing = o == DelhiveryOutcome.Succeeded ? CreateProcessingState.Created
                       : o == DelhiveryOutcome.Refused ? CreateProcessingState.NotCreated : processing;
        }
        return new DelhiveryCreateResult
        {
            Operation = c.Operation, Outcome = c.Outcome, HttpStatus = c.HttpStatus, Message = c.Message, Mode = c.Mode,
            RetryAfter = c.RetryAfter, Duration = c.Duration, ResponseBytes = c.ResponseBytes,
            Processing = processing, Awb = parsed?.Awb, UploadRef = parsed?.UploadRef, Remarks = parsed?.Remarks ?? [],
ResponseSchemaConfirmed = parsed?.SchemaConfirmed ?? false
        };
    }

    // ───────────────────────── tracking ─────────────────────────

    public async Task<DelhiveryTrackingResult> TrackAsync(IReadOnlyCollection<string> waybills, IReadOnlyCollection<string>? orderRefs = null, CancellationToken ct = default)
    {
        const string op = "track";
        var sw = Stopwatch.StartNew();

        var query = DelhiveryRequestBuilder.BuildTrackingQuery(waybills, orderRefs);
        if (!query.Success)
            return Track(NotSent(op, string.Join(" ", query.Errors), null, sw));

        var target = await ResolveTargetAsync(op, sw);
        if (target.Failure != null) return Track(target.Failure);

        using var message = new HttpRequestMessage(HttpMethod.Get, new Uri(target.Base!, DelhiveryRequestBuilder.TrackPath + "?" + query.Value));
        ApplyHeaders(message, target.Credentials!);

        return Track(await SendAsync(op, message, target.Credentials!.Mode, TimeSpan.FromSeconds(_options.TrackTimeoutSeconds), sw, ct));
    }

    public async Task<DelhiveryTrackingResult> TrackByReferenceAsync(string orderRef, CancellationToken ct = default)
    {
        const string op = "track-by-reference";
        var sw = Stopwatch.StartNew();

        var query = DelhiveryRequestBuilder.BuildReferenceQuery(orderRef);
        if (!query.Success)
            return Track(NotSent(op, string.Join(" ", query.Errors), null, sw));

        var target = await ResolveTargetAsync(op, sw);
        if (target.Failure != null) return Track(target.Failure);

        using var message = new HttpRequestMessage(HttpMethod.Get, new Uri(target.Base!, DelhiveryRequestBuilder.TrackPath + "?" + query.Value));
        ApplyHeaders(message, target.Credentials!);

        return Track(await SendAsync(op, message, target.Credentials!.Mode, TimeSpan.FromSeconds(_options.TrackTimeoutSeconds), sw, ct));
    }

    private DelhiveryTrackingResult Track(CallOutcome c)
    {
        var parsed = c.Outcome == DelhiveryOutcome.ResponseUnconfirmed ? DelhiveryResponseParser.ParseTracking(c.Body, _options.ScanTimeOffsetMinutes) : null;
        if (parsed != null)
        {
            var o = parsed.Verdict switch { TrackingVerdict.Found => DelhiveryOutcome.Succeeded, TrackingVerdict.NotFound => DelhiveryOutcome.NotFound, _ => DelhiveryOutcome.ResponseUnconfirmed };
            c = c with { Outcome = o, Message = o == DelhiveryOutcome.ResponseUnconfirmed ? c.Message : MessageFor(o, c.HttpStatus ?? 0) };
            Log(c);
        }
        return new DelhiveryTrackingResult
        {
            Operation = c.Operation, Outcome = c.Outcome, HttpStatus = c.HttpStatus, Message = c.Message, Mode = c.Mode,
            RetryAfter = c.RetryAfter, Duration = c.Duration, ResponseBytes = c.ResponseBytes,
            Shipments = parsed?.Shipments ?? [], ResponseSchemaConfirmed = parsed?.SchemaConfirmed ?? false
        };
    }

    // ───────────────────────── shared ─────────────────────────

    /// <summary>Internal: the classified call plus the body that must not leave this class except to be inspected.</summary>
    private sealed record CallOutcome(string Operation, DelhiveryOutcome Outcome, int? HttpStatus, string Message, string? Mode,
        TimeSpan? RetryAfter, TimeSpan Duration, int ResponseBytes, string? Body);

    private sealed record Target(Uri? Base, DelhiveryCredentials? Credentials, CallOutcome? Failure);

    private CallOutcome NotSent(string op, string message, string? mode, Stopwatch sw)
    {
        _logger.LogWarning("Delhivery {Operation} not sent ({Mode}): {Reason}", op, mode ?? "unknown mode", message);
        return new CallOutcome(op, DelhiveryOutcome.NotSent, null, message, mode, null, sw.Elapsed, 0, null);
    }

    /// <summary>Chooses the environment from the configuration service. Anything doubtful stops here, before a request exists.</summary>
    private async Task<Target> ResolveTargetAsync(string op, Stopwatch sw)
    {
        string? mode = null;
        try
        {
            mode = await _config.GetModeAsync();
            var creds = _config.GetCredentials(mode);
            if (creds == null)
                return new Target(null, null, NotSent(op, $"The Delhivery {mode} API token is not configured on the server.", mode, sw));

            if (!Uri.TryCreate(creds.BaseUrl, UriKind.Absolute, out var baseUri) || baseUri.Scheme != Uri.UriSchemeHttps)
                return new Target(null, null, NotSent(op, "The Delhivery base URL is not a valid https address.", mode, sw));

            // test traffic must never reach production and live traffic must never reach staging, whatever the configuration says
            if (mode == ShipmentConstants.Test && !string.Equals(baseUri.Host, StagingHost, StringComparison.OrdinalIgnoreCase))
                return new Target(null, null, NotSent(op, "Test mode is only allowed to use the Delhivery staging host.", mode, sw));
            if (mode == ShipmentConstants.Live && !string.Equals(baseUri.Host, ProductionHost, StringComparison.OrdinalIgnoreCase))
                return new Target(null, null, NotSent(op, "Live mode is only allowed to use the Delhivery production host.", mode, sw));

            return new Target(baseUri, creds, null);
        }
        catch (DelhiveryConfigurationException ex)
        {
            return new Target(null, null, NotSent(op, ex.Message, mode, sw));
        }
    }

    private static void ApplyHeaders(HttpRequestMessage message, DelhiveryCredentials creds)
    {
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        message.Headers.Authorization = new AuthenticationHeaderValue("Token", creds.Token);     // documented: Authorization: Token <API token>
    }

    private async Task<CallOutcome> SendAsync(string op, HttpRequestMessage message, string mode, TimeSpan timeout, Stopwatch sw, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(timeout);

        try
        {
            using var response = await _http.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
            var status = (int)response.StatusCode;
            var retryAfter = ReadRetryAfter(response);

            string? body = null;
            var bytes = 0;
            if (response.IsSuccessStatusCode)
            {
                (body, bytes) = await ReadBoundedAsync(response, timeoutCts.Token);
            }

            var outcome = Classify(response.StatusCode, body, bytes);
            var result = new CallOutcome(op, outcome, status, MessageFor(outcome, status), mode, retryAfter, sw.Elapsed, bytes, body);
            if (outcome != DelhiveryOutcome.ResponseUnconfirmed) Log(result);      // an unconfirmed-so-far answer is logged once it is interpreted
            return result;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;                                                                  // the caller cancelled: not a Delhivery outcome
        }
        catch (OperationCanceledException)
        {
            return Failed(op, DelhiveryOutcome.Timeout, mode, sw, "Delhivery did not answer in time.");
        }
        catch (HttpRequestException)
        {
            return Failed(op, DelhiveryOutcome.NetworkFailure, mode, sw, "The connection to Delhivery failed.");
        }
        catch (IOException)
        {
            return Failed(op, DelhiveryOutcome.NetworkFailure, mode, sw, "The connection to Delhivery failed.");
        }
    }

    private CallOutcome Failed(string op, DelhiveryOutcome outcome, string mode, Stopwatch sw, string message)
    {
        var r = new CallOutcome(op, outcome, null, message, mode, null, sw.Elapsed, 0, null);
        Log(r);
        return r;
    }

    private static async Task<(string? Body, int Bytes)> ReadBoundedAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            await response.Content.LoadIntoBufferAsync(DelhiveryResponseParser.MaxBodyBytes);
            var raw = await response.Content.ReadAsByteArrayAsync(ct);
            return (Encoding.UTF8.GetString(raw), raw.Length);
        }
        catch (HttpRequestException)
        {
            return (null, -1);                                                      // larger than the limit
        }
    }

    /// <summary>Outcome from the HTTP status and, for 2xx, from whether the body is valid JSON. Nothing is read from the body.</summary>
    public static DelhiveryOutcome Classify(HttpStatusCode code, string? body, int bytes)
    {
        var status = (int)code;
        if (status is >= 200 and <= 299)
        {
            if (bytes < 0) return DelhiveryOutcome.ResponseMalformed;
            var inspection = DelhiveryResponseParser.Inspect(body);
            return inspection.IsValidJson ? DelhiveryOutcome.ResponseUnconfirmed : DelhiveryOutcome.ResponseMalformed;
        }
        return status switch
        {
            401 or 403 => DelhiveryOutcome.AuthenticationFailed,
            429 => DelhiveryOutcome.RateLimited,
            408 => DelhiveryOutcome.UnexpectedStatus,
            >= 400 and <= 499 => DelhiveryOutcome.DefinitelyRejected,
            >= 500 and <= 599 => DelhiveryOutcome.ServerError,
            _ => DelhiveryOutcome.UnexpectedStatus
        };
    }

    private static string MessageFor(DelhiveryOutcome outcome, int status) => outcome switch
    {
        DelhiveryOutcome.AuthenticationFailed => $"Delhivery refused the credentials (HTTP {status}).",
        DelhiveryOutcome.RateLimited => "Delhivery asked us to slow down (HTTP 429).",
        DelhiveryOutcome.DefinitelyRejected => $"Delhivery rejected the request (HTTP {status}).",
        DelhiveryOutcome.ServerError => $"Delhivery had a server error (HTTP {status}).",
        DelhiveryOutcome.UnexpectedStatus => $"Delhivery answered with an unexpected status (HTTP {status}).",
        DelhiveryOutcome.ResponseMalformed => "Delhivery's answer could not be read.",
        DelhiveryOutcome.ResponseUnconfirmed => "Delhivery answered, but the response format is not one we recognise, so nothing was read from it.",
        DelhiveryOutcome.Succeeded => "Delhivery accepted the request.",
        DelhiveryOutcome.Refused => "Delhivery refused the shipment.",
        DelhiveryOutcome.NotFound => "Delhivery has no data for that waybill or reference.",
        _ => "Delhivery call finished."
    };

    private static TimeSpan? ReadRetryAfter(HttpResponseMessage response)
    {
        var h = response.Headers.RetryAfter;
        if (h?.Delta is { } delta) return delta;
        if (h?.Date is { } date) { var d = date - DateTimeOffset.UtcNow; return d > TimeSpan.Zero ? d : TimeSpan.Zero; }
        return null;
    }

    /// <summary>One line per call: operation, mode, outcome, status, time. No URL query, headers, waybills, body or token.</summary>
    private void Log(CallOutcome r) =>
        _logger.LogInformation("Delhivery {Operation} ({Mode}) -> {Outcome}, HTTP {Status}, {Ms} ms",
            r.Operation, r.Mode, r.Outcome, r.HttpStatus?.ToString() ?? "-", (int)r.Duration.TotalMilliseconds);
}
