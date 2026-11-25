using System.Net;
using System.Text;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Infrastructure.Services.Delhivery;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EcommerceApp.Tests;

// ───────────────────────── test doubles (no network is ever used) ─────────────────────────

public sealed record RecordedRequest(HttpMethod Method, Uri Uri, string? Authorization, string? Accept, string? ContentType, string? Body);

/// <summary>Terminal handler: nothing is forwarded anywhere. It records what the client would have sent and answers from a script.</summary>
public sealed class FakeHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _respond;
    public List<RecordedRequest> Requests { get; } = [];

    public FakeHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond) => _respond = respond;

    public static FakeHandler Returning(HttpStatusCode code, string body = "{}", Action<HttpResponseMessage>? tweak = null) =>
        new((_, _) =>
        {
            var r = new HttpResponseMessage(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
            tweak?.Invoke(r);
            return Task.FromResult(r);
        });

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var body = request.Content == null ? null : await request.Content.ReadAsStringAsync(ct);
        Requests.Add(new RecordedRequest(request.Method, request.RequestUri!, request.Headers.Authorization?.ToString(),
            string.Join(",", request.Headers.Accept.Select(a => a.ToString())), request.Content?.Headers.ContentType?.MediaType, body));
        return await _respond(request, ct);
    }
}

public sealed class FakeDelhiveryConfig : IDelhiveryConfigService
{
    public const string TestToken = "FAKE-TEST-TOKEN-aaa111";
    public const string LiveToken = "FAKE-LIVE-TOKEN-bbb222";
    public string Mode { get; set; } = "test";
    public string? TestTokenValue { get; set; } = TestToken;
    public string? LiveTokenValue { get; set; } = LiveToken;
    public string TestUrl { get; set; } = "https://staging-express.delhivery.com";
    public string LiveUrl { get; set; } = "https://track.delhivery.com";
    public bool InvalidMode { get; set; }

    public string PickupLocation => "Ganpati Herbal Ayurveda";
    public string PickupLocationFor(string mode) => mode == "test" ? "GANPATIHERBAL SURFACE" : "Ganpati Herbal Ayurveda";
    public Task<string> GetModeAsync() =>
        InvalidMode ? throw new DelhiveryConfigurationException("The Delhivery setting 'delhivery_mode' is invalid: it must be 'test' or 'live'.") : Task.FromResult(Mode);
    public DelhiveryCredentials? GetCredentials(string mode)
    {
        var token = mode == "live" ? LiveTokenValue : TestTokenValue;
        return string.IsNullOrWhiteSpace(token) ? null : new DelhiveryCredentials(mode, mode == "live" ? LiveUrl : TestUrl, token);
    }
    public async Task<DelhiveryCredentials?> GetActiveCredentialsAsync() => GetCredentials(await GetModeAsync());
    public Task<DelhiveryModeDto> GetInfoAsync() => throw new NotSupportedException();
    public Task<ApiResponse<DelhiveryModeDto>> SetModeAsync(string mode, AuditContext audit) => throw new NotSupportedException();
}

public sealed class CapturingLogger<T> : ILogger<T>
{
    public List<string> Lines { get; } = [];
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        => Lines.Add($"{logLevel}: {formatter(state, exception)} {exception}");
    public string All => string.Join("\n", Lines);
}

/// <summary>The Delhivery client against a scripted fake handler: nothing is sent to Delhivery, staging or production.</summary>
public class DelhiveryClientTests
{
    private static (DelhiveryClient Client, FakeHandler Handler, CapturingLogger<DelhiveryClient> Log, FakeDelhiveryConfig Config) Make(
        FakeHandler handler, Action<FakeDelhiveryConfig>? config = null, Action<DelhiveryClientOptions>? options = null)
    {
        var cfg = new FakeDelhiveryConfig();
        config?.Invoke(cfg);
        var opts = new DelhiveryClientOptions();
        options?.Invoke(opts);
        var log = new CapturingLogger<DelhiveryClient>();
        return (new DelhiveryClient(new HttpClient(handler), cfg, Options.Create(opts), log), handler, log, cfg);
    }

    private static DelhiveryShipmentRequest Req() => DelhiveryRequestBuilderTests.Sample();

    // ───────── environment selection and authentication ─────────

    [Fact]
    public async Task Test_mode_sends_the_create_request_to_the_staging_host_with_the_documented_path_and_method()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));

        await client.CreateShipmentAsync(Req());

        var r = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, r.Method);
        Assert.Equal("https://staging-express.delhivery.com/api/cmu/create.json", r.Uri.ToString());
    }

    [Fact]
    public async Task Live_mode_selects_the_production_host_without_any_real_call()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => c.Mode = "live");

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(["https://track.delhivery.com/api/cmu/create.json", "https://track.delhivery.com/api/v1/packages/json/?waybill=1122345678722"],
            handler.Requests.Select(r => r.Uri.ToString()));
        Assert.Equal("live", create.Mode);
        Assert.Equal("live", track.Mode);
    }

    [Fact]
    public async Task The_authorization_header_is_exactly_Token_plus_the_active_modes_token()
    {
        var (test, th, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));
        var (live, lh, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => c.Mode = "live");

        await test.CreateShipmentAsync(Req());
        await live.CreateShipmentAsync(Req());

        Assert.Equal("Token " + FakeDelhiveryConfig.TestToken, th.Requests[0].Authorization);
        Assert.Equal("Token " + FakeDelhiveryConfig.LiveToken, lh.Requests[0].Authorization);
        Assert.Equal("application/json", th.Requests[0].Accept);
    }

    [Fact]
    public async Task The_create_body_matches_the_documented_wrapper_and_default_content_type()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));

        await client.CreateShipmentAsync(Req());

        var r = handler.Requests[0];
        Assert.Equal("application/json", r.ContentType);                         // as in Delhivery's sample header
        Assert.Equal(DelhiveryRequestBuilder.SerializeCreateBody(Req(), "application/json"), r.Body);
        Assert.StartsWith("format=json&data=", r.Body);
    }

    [Fact]
    public async Task The_form_encoded_content_type_can_be_selected_by_configuration()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), options: o => o.CreateContentType = "application/x-www-form-urlencoded");

        await client.CreateShipmentAsync(Req());

        Assert.Equal("application/x-www-form-urlencoded", handler.Requests[0].ContentType);
        Assert.StartsWith("format=json&data=%7B", handler.Requests[0].Body);
    }

    [Fact]
    public async Task An_unsupported_content_type_setting_stops_before_anything_is_sent()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), options: o => o.CreateContentType = "text/plain");

        var r = await client.CreateShipmentAsync(Req());

        Assert.Equal(DelhiveryOutcome.NotSent, r.Outcome);
        Assert.Equal(CreateProcessingState.NotCreated, r.Processing);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task Tracking_sends_a_get_with_the_documented_query_and_no_body()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));

        await client.TrackAsync(["1122345678722", "1122345678733"], ["ORD-20261109-ABC123"]);

        var r = handler.Requests[0];
        Assert.Equal(HttpMethod.Get, r.Method);
        Assert.Equal("https://staging-express.delhivery.com/api/v1/packages/json/?waybill=1122345678722,1122345678733&ref_ids=ORD-20261109-ABC123", r.Uri.ToString());
        Assert.Null(r.Body);
        Assert.Equal("Token " + FakeDelhiveryConfig.TestToken, r.Authorization);
    }

    // ───────── tokens, bodies and customer data never leave the client ─────────

    [Fact]
    public async Task The_token_and_the_authorization_header_never_appear_in_logs_or_results_in_any_scenario()
    {
        var secretBody = "{\"consignee\":\"SECRET-CUSTOMER-NAME\",\"phone\":\"9876543210\"}";
        var scenarios = new Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>[]
        {
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(secretBody) }),
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized) { Content = new StringContent(secretBody) }),
            (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError) { Content = new StringContent(secretBody) }),
            (_, _) => throw new HttpRequestException("connection failed to Authorization: Token " + FakeDelhiveryConfig.TestToken),
        };

        foreach (var script in scenarios)
        {
            var (client, _, log, _) = Make(new FakeHandler(script));
            var create = await client.CreateShipmentAsync(Req());
            var track = await client.TrackAsync(["1122345678722"]);

            var everything = log.All + create.Message + track.Message + create.Awb;
            Assert.DoesNotContain(FakeDelhiveryConfig.TestToken, everything);
            Assert.DoesNotContain("FAKE-", everything);
            Assert.DoesNotContain("Authorization", everything);
            Assert.DoesNotContain("SECRET-CUSTOMER-NAME", everything);                 // a response body is never echoed or logged
            Assert.DoesNotContain("9876543210", everything);
        }
    }

    [Fact]
    public async Task Logs_contain_one_summary_line_per_call_without_urls_waybills_or_bodies()
    {
        var (client, _, log, _) = Make(FakeHandler.Returning(HttpStatusCode.OK, "{\"x\":1}"));

        await client.TrackAsync(["1122345678722"], ["ORD-20261109-ABC123"]);

        var line = Assert.Single(log.Lines);
        Assert.Contains("track", line);
        Assert.Contains("test", line);
        Assert.DoesNotContain("1122345678722", line);
        Assert.DoesNotContain("ORD-20261109-ABC123", line);
        Assert.DoesNotContain("https://", line);
    }

    // ───────── what can be derived from the HTTP status (no response schema is assumed) ─────────

    [Theory]
    [InlineData(400, DelhiveryOutcome.DefinitelyRejected, CreateProcessingState.NotCreated)]
    [InlineData(404, DelhiveryOutcome.DefinitelyRejected, CreateProcessingState.NotCreated)]
    [InlineData(422, DelhiveryOutcome.DefinitelyRejected, CreateProcessingState.NotCreated)]
    [InlineData(401, DelhiveryOutcome.AuthenticationFailed, CreateProcessingState.NotCreated)]
    [InlineData(403, DelhiveryOutcome.AuthenticationFailed, CreateProcessingState.NotCreated)]
    [InlineData(429, DelhiveryOutcome.RateLimited, CreateProcessingState.NotCreated)]
    [InlineData(408, DelhiveryOutcome.UnexpectedStatus, CreateProcessingState.Unknown)]
    [InlineData(500, DelhiveryOutcome.ServerError, CreateProcessingState.Unknown)]
    [InlineData(502, DelhiveryOutcome.ServerError, CreateProcessingState.Unknown)]
    [InlineData(503, DelhiveryOutcome.ServerError, CreateProcessingState.Unknown)]
    [InlineData(302, DelhiveryOutcome.UnexpectedStatus, CreateProcessingState.Unknown)]
    public async Task Create_outcome_by_http_status_separates_certainly_not_created_from_unknown(int status, DelhiveryOutcome outcome, CreateProcessingState processing)
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning((HttpStatusCode)status, "ignored"));

        var r = await client.CreateShipmentAsync(Req());

        Assert.Equal(outcome, r.Outcome);
        Assert.Equal(processing, r.Processing);
        Assert.Equal(status, r.HttpStatus);
        Assert.Single(handler.Requests);                                         // exactly one request: the client never retries
        Assert.Null(r.Awb);
    }

    [Fact]
    public async Task A_rate_limit_answer_carries_the_retry_after_delay_when_given()
    {
        var (client, _, _, _) = Make(FakeHandler.Returning((HttpStatusCode)429, "{}", r => r.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(7))));

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(TimeSpan.FromSeconds(7), create.RetryAfter);
        Assert.Equal(TimeSpan.FromSeconds(7), track.RetryAfter);
        Assert.True(track.IsTransient);
    }

    [Theory]
    [InlineData(500)]
    [InlineData(502)]
    [InlineData(503)]
    [InlineData(429)]
    public async Task Tracking_treats_server_errors_and_rate_limits_as_transient(int status)
    {
        var (client, _, _, _) = Make(FakeHandler.Returning((HttpStatusCode)status));
        var r = await client.TrackAsync(["1122345678722"]);
        Assert.True(r.IsTransient);
    }

    [Theory]
    [InlineData(400)]
    [InlineData(401)]
    [InlineData(403)]
    [InlineData(404)]
    public async Task Tracking_treats_client_errors_as_permanent(int status)
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning((HttpStatusCode)status));
        var r = await client.TrackAsync(["1122345678722"]);
        Assert.False(r.IsTransient);
        Assert.Single(handler.Requests);
    }

    // ───────── 2xx answers: only "is it JSON" is known ─────────

    [Theory]
    [InlineData("{}")]
    [InlineData("[]")]
    [InlineData("{\"unknown_field\":{\"nested\":[1,2,3]},\"another\":null}")]
    [InlineData("{\"only_one_field\":true}")]
    [InlineData("[{\"a\":1},{\"b\":2}]")]
    [InlineData("\"just a string\"")]
    public async Task Any_valid_json_with_unknown_or_missing_fields_is_accepted_without_crashing_but_reads_nothing(string body)
    {
        var (client, _, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK, body));

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.ResponseUnconfirmed, create.Outcome);
        Assert.Equal(CreateProcessingState.Unknown, create.Processing);          // a 2xx answer we cannot read is NOT treated as success or failure
        Assert.Null(create.Awb);                                                 // the AWB field is unconfirmed: never guessed
        Assert.False(create.ResponseSchemaConfirmed);
        Assert.Equal(DelhiveryOutcome.ResponseUnconfirmed, track.Outcome);
        Assert.Empty(track.Scans);
        Assert.False(track.ResponseSchemaConfirmed);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not json at all")]
    [InlineData("{\"truncated\": ")]
    [InlineData("<html><body>Bad gateway</body></html>")]
    public async Task A_2xx_answer_that_is_not_valid_json_is_malformed_and_unknown_for_create(string body)
    {
        var (client, _, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK, body));

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.ResponseMalformed, create.Outcome);
        Assert.Equal(CreateProcessingState.Unknown, create.Processing);
        Assert.Equal(DelhiveryOutcome.ResponseMalformed, track.Outcome);
    }

    [Fact]
    public async Task An_oversized_body_is_refused_not_loaded()
    {
        var huge = "{\"x\":\"" + new string('a', DelhiveryResponseParser.MaxBodyBytes + 10) + "\"}";
        var (client, _, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK, huge));

        var r = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.ResponseMalformed, r.Outcome);
    }

    [Fact]
    public async Task Deeply_nested_json_does_not_crash_the_parser()
    {
        var deep = string.Concat(Enumerable.Repeat("[", 500)) + string.Concat(Enumerable.Repeat("]", 500));
        var (client, _, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK, deep));

        var r = await client.CreateShipmentAsync(Req());

        Assert.Equal(DelhiveryOutcome.ResponseMalformed, r.Outcome);
    }

    // ───────── timeouts, network failures, cancellation ─────────

    [Fact]
    public async Task A_create_call_that_times_out_is_ambiguous_and_never_retried()
    {
        var (client, handler, _, _) = Make(new FakeHandler(async (_, ct) => { await Task.Delay(Timeout.Infinite, ct); return new HttpResponseMessage(); }),
            options: o => o.CreateTimeoutSeconds = 1);

        var r = await client.CreateShipmentAsync(Req());

        Assert.Equal(DelhiveryOutcome.Timeout, r.Outcome);
        Assert.Equal(CreateProcessingState.Unknown, r.Processing);
        Assert.Null(r.HttpStatus);
        Assert.True(r.IsTransient);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task A_tracking_call_that_times_out_is_transient()
    {
        var (client, _, _, _) = Make(new FakeHandler(async (_, ct) => { await Task.Delay(Timeout.Infinite, ct); return new HttpResponseMessage(); }),
            options: o => o.TrackTimeoutSeconds = 1);

        var r = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.Timeout, r.Outcome);
        Assert.True(r.IsTransient);
    }

    [Fact]
    public async Task A_connection_failure_is_ambiguous_for_create_and_transient_for_tracking()
    {
        var (client, _, _, _) = Make(new FakeHandler((_, _) => throw new HttpRequestException("boom")));

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.NetworkFailure, create.Outcome);
        Assert.Equal(CreateProcessingState.Unknown, create.Processing);
        Assert.Equal(DelhiveryOutcome.NetworkFailure, track.Outcome);
        Assert.True(track.IsTransient);
    }

    [Fact]
    public async Task A_caller_cancellation_is_not_reported_as_a_delhivery_outcome()
    {
        var (client, _, _, _) = Make(new FakeHandler(async (_, ct) => { await Task.Delay(Timeout.Infinite, ct); return new HttpResponseMessage(); }));
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.CreateShipmentAsync(Req(), cts.Token));
    }

    // ───────── nothing is sent when the request or the configuration cannot be trusted ─────────

    [Fact]
    public async Task An_invalid_create_request_is_not_sent_and_is_certainly_not_created()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));
        var bad = new DelhiveryShipmentRequest { Name = "", Add = "x", Pin = "1", Phone = "2", OrderRef = "a b", PaymentMode = "Cash", PickupLocation = "" };

        var r = await client.CreateShipmentAsync(bad);

        Assert.Equal(DelhiveryOutcome.NotSent, r.Outcome);
        Assert.Equal(CreateProcessingState.NotCreated, r.Processing);
        Assert.Empty(handler.Requests);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    [InlineData(500)]
    public async Task Tracking_with_no_or_too_many_waybills_is_not_sent(int count)
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));

        var r = await client.TrackAsync(Enumerable.Range(1, count).Select(i => "10000000" + i).ToList());

        Assert.Equal(DelhiveryOutcome.NotSent, r.Outcome);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task Fifty_waybills_go_out_in_a_single_request()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK));

        await client.TrackAsync(Enumerable.Range(1, 50).Select(i => "10000000" + i).ToList());

        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task A_missing_token_stops_the_call_before_a_request_exists()
    {
        var (testClient, th, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => c.TestTokenValue = null);
        var (liveClient, lh, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => { c.Mode = "live"; c.LiveTokenValue = "   "; });

        var a = await testClient.CreateShipmentAsync(Req());
        var b = await liveClient.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.NotSent, a.Outcome);
        Assert.Equal(DelhiveryOutcome.NotSent, b.Outcome);
        Assert.Contains("not configured", a.Message);
        Assert.Empty(th.Requests);
        Assert.Empty(lh.Requests);
    }

    [Fact]
    public async Task An_invalid_stored_mode_fails_closed_nothing_is_sent_and_no_environment_is_guessed()
    {
        var (client, handler, log, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => c.InvalidMode = true);

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.NotSent, create.Outcome);
        Assert.Equal(CreateProcessingState.NotCreated, create.Processing);
        Assert.Equal(DelhiveryOutcome.NotSent, track.Outcome);
        Assert.Contains("invalid", create.Message);
        Assert.Empty(handler.Requests);
        Assert.DoesNotContain("FAKE-", log.All + create.Message);
    }

    [Fact]
    public async Task Test_mode_can_never_reach_production_even_if_the_base_url_is_misconfigured()
    {
        var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => c.TestUrl = "https://track.delhivery.com");

        var create = await client.CreateShipmentAsync(Req());
        var track = await client.TrackAsync(["1122345678722"]);

        Assert.Equal(DelhiveryOutcome.NotSent, create.Outcome);
        Assert.Equal(DelhiveryOutcome.NotSent, track.Outcome);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task Live_mode_can_never_reach_staging_and_nothing_goes_over_plain_http_or_to_another_host()
    {
        foreach (var url in new[] { "https://staging-express.delhivery.com", "http://track.delhivery.com", "https://evil.example.com", "not a url" })
        {
            var (client, handler, _, _) = Make(FakeHandler.Returning(HttpStatusCode.OK), c => { c.Mode = "live"; c.LiveUrl = url; });
            var r = await client.TrackAsync(["1122345678722"]);
            Assert.Equal(DelhiveryOutcome.NotSent, r.Outcome);
            Assert.Empty(handler.Requests);
        }
    }

    [Fact]
    public async Task Across_the_whole_suite_of_scenarios_no_request_in_test_mode_targets_the_production_host()
    {
        var handler = FakeHandler.Returning(HttpStatusCode.OK);
        var (client, _, _, _) = Make(handler);

        await client.CreateShipmentAsync(Req());
        await client.TrackAsync(["1122345678722"]);
        await client.TrackAsync(["1122345678722", "1122345678733"], ["ORD-1"]);

        Assert.All(handler.Requests, r => Assert.Equal("staging-express.delhivery.com", r.Uri.Host));
        Assert.DoesNotContain(handler.Requests, r => r.Uri.Host.Contains("track.delhivery.com"));
    }

    // ───────── wiring ─────────

    [Fact]
    public void The_client_is_registered_for_dependency_injection_and_resolves_without_any_network_activity()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=never_connected;Username=x;Password=x",
            ["Jwt:Key"] = "unit-test-key-unit-test-key-unit-test-key", ["Jwt:Issuer"] = "t", ["Jwt:Audience"] = "t",
            ["Delhivery:Client:TrackTimeoutSeconds"] = "9"
        }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(config);
        services.AddSingleton(EcommerceApp.Tests.Support.Seed.Mapper());      // Program.cs registers AutoMapper; AddInfrastructure does not
        EcommerceApp.Infrastructure.Extensions.ServiceExtensions.AddInfrastructure(services, config);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var client = scope.ServiceProvider.GetRequiredService<IDelhiveryClient>();

        Assert.IsType<DelhiveryClient>(client);
        Assert.Equal(9, scope.ServiceProvider.GetRequiredService<IOptions<DelhiveryClientOptions>>().Value.TrackTimeoutSeconds);
    }
}
