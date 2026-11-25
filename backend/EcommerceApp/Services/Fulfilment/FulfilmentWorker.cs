using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EcommerceApp.Infrastructure.Services.Fulfilment;

/// <summary>
/// Runs <see cref="FulfilmentProcessor"/> on a timer (and right after an approval). All state is in the database, so a restart resumes
/// where it stopped. A PostgreSQL advisory lock makes sure only one application instance works at a time.
/// </summary>
public sealed class FulfilmentWorker : BackgroundService
{
    private const long LockKey = 7420011;

    private readonly IServiceScopeFactory _scopes;
    private readonly FulfilmentSignal _signal;
    private readonly FulfilmentOptions _o;
    private readonly ILogger<FulfilmentWorker> _log;

    public FulfilmentWorker(IServiceScopeFactory scopes, FulfilmentSignal signal, IOptions<FulfilmentOptions> options, ILogger<FulfilmentWorker> log)
    {
        _scopes = scopes; _signal = signal; _o = options.Value; _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_o.Enabled) { _log.LogInformation("Fulfilment worker is disabled."); return; }
        try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); } catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await TickAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _log.LogError(ex, "Fulfilment tick failed"); }

            try { await _signal.WaitAsync(TimeSpan.FromSeconds(Math.Max(5, _o.TickSeconds)), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    public async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.OpenConnectionAsync(ct);                       // the advisory lock belongs to this one connection
        try
        {
            var got = await db.Database.SqlQuery<bool>($"select pg_try_advisory_lock({LockKey}) as \"Value\"").SingleAsync(ct);
            if (!got) return;                                           // another instance is working
            try { await scope.ServiceProvider.GetRequiredService<FulfilmentProcessor>().RunAllAsync(null, ct); }
            finally { await db.Database.ExecuteSqlRawAsync($"select pg_advisory_unlock({LockKey})", CancellationToken.None); }
        }
        finally { await db.Database.CloseConnectionAsync(); }
    }
}
