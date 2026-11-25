using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace EcommerceApp.Tests.Support;

/// <summary>
/// Starts the real, built API (the same DLL that is deployed) as a child process on a free local port, against a
/// throw-away test database. SMTP is left unconfigured so no e-mail can be sent, and Razorpay keys are not set.
/// </summary>
public sealed class ApiHost : IAsyncDisposable
{
    private Process? _process;
    public HttpClient Http { get; private set; } = null!;
    public string BaseUrl { get; private set; } = "";
    private readonly System.Text.StringBuilder _output = new();

    /// <summary>Everything the API process wrote to its console so far (used to prove secrets are never logged).</summary>
    public string Output { get { lock (_output) return _output.ToString(); } }

    public static async Task<ApiHost> StartAsync(string connectionString, int orderTrackPerMinute = 10, IDictionary<string, string>? extraEnvironment = null)
    {
        var host = new ApiHost();
        var port = FreePort();
        host.BaseUrl = $"http://127.0.0.1:{port}";

        var dll = Path.Combine(ApiProject.Directory, "bin", "Debug", "net8.0", "EcommerceApp.dll");
        if (!File.Exists(dll)) throw new FileNotFoundException("Build the API first (dotnet build).", dll);

        var workDir = Path.Combine(Path.GetTempPath(), "ecom-api-test-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(workDir);          // the app writes its ./logs folder here, not into the repository

        var psi = new ProcessStartInfo("dotnet", $"\"{dll}\"")
        {
            WorkingDirectory = workDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        psi.Environment["ASPNETCORE_URLS"] = host.BaseUrl;
        psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Testing";
        psi.Environment["ASPNETCORE_CONTENTROOT"] = ApiProject.Directory;
        psi.Environment["ConnectionStrings__DefaultConnection"] = connectionString;
        psi.Environment["RateLimit__LoginPerMinute"] = "1000";
        psi.Environment["RateLimit__OrderTrackPerMinute"] = orderTrackPerMinute.ToString();
        psi.Environment["Email__Username"] = "";
        psi.Environment["Email__Password"] = "";
        psi.Environment["Email__AdminEmail"] = "";
        // never inherit real Delhivery tokens from the developer machine: tests set their own fake values
        psi.Environment["Delhivery__ApiToken"] = "";
        psi.Environment["Delhivery__ApiTokenTest"] = "";
        foreach (var kv in extraEnvironment ?? new Dictionary<string, string>()) psi.Environment[kv.Key] = kv.Value;

        host._process = Process.Start(psi)!;
        host._process.OutputDataReceived += (_, e) => { if (e.Data != null) lock (host._output) host._output.AppendLine(e.Data); };
        host._process.ErrorDataReceived += (_, e) => { if (e.Data != null) lock (host._output) host._output.AppendLine(e.Data); };
        host._process.BeginOutputReadLine();
        host._process.BeginErrorReadLine();

        host.Http = new HttpClient { BaseAddress = new Uri(host.BaseUrl), Timeout = TimeSpan.FromSeconds(30) };

        var deadline = DateTime.UtcNow.AddSeconds(90);
        while (DateTime.UtcNow < deadline)
        {
            if (host._process.HasExited) throw new InvalidOperationException("The API process exited during start-up.");
            try
            {
                var r = await host.Http.GetAsync("/api/v1/categories");
                if (r.StatusCode == HttpStatusCode.OK) return host;
            }
            catch { /* not listening yet */ }
            await Task.Delay(500);
        }
        throw new TimeoutException("The API did not start in time.");
    }

    public async Task<string> LoginAsync(string email, string password)
    {
        var res = await Http.PostAsync("/api/v1/auth/login", Json(new { email, password }));
        var body = await res.Content.ReadAsStringAsync();
        if (res.StatusCode != HttpStatusCode.OK) throw new InvalidOperationException($"Login failed ({(int)res.StatusCode}).");
        return JsonDocument.Parse(body).RootElement.GetProperty("data").GetProperty("token").GetString()!;
    }

    public HttpRequestMessage Request(HttpMethod method, string url, string? token = null, object? body = null)
    {
        var req = new HttpRequestMessage(method, url);
        if (token != null) req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null) req.Content = Json(body);
        return req;
    }

    public async Task<(HttpStatusCode Status, JsonElement Body)> SendAsync(HttpMethod method, string url, string? token = null, object? body = null)
    {
        using var res = await Http.SendAsync(Request(method, url, token, body));
        var text = await res.Content.ReadAsStringAsync();
        JsonElement el = default;
        if (!string.IsNullOrWhiteSpace(text) && res.Content.Headers.ContentType?.MediaType?.Contains("json") == true)
            el = JsonDocument.Parse(text).RootElement.Clone();
        return (res.StatusCode, el);
    }

    public static StringContent Json(object body) =>
        new(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

    private static int FreePort()
    {
        var l = new TcpListener(IPAddress.Loopback, 0);
        l.Start();
        var port = ((IPEndPoint)l.LocalEndpoint).Port;
        l.Stop();
        return port;
    }

    public ValueTask DisposeAsync()
    {
        try { if (_process is { HasExited: false }) _process.Kill(entireProcessTree: true); } catch { }
        Http?.Dispose();
        return ValueTask.CompletedTask;
    }
}
