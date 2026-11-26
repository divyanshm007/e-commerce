using EcommerceApp.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EcommerceApp.Infrastructure.Services;

/// <summary>
/// Cleans up online orders whose payment window was closed without paying (browser closed, phone died): after 30 minutes they are cancelled,
/// the stock goes back and the payment is marked Failed. Safe to run on several instances: the cancel is atomic per order.
/// </summary>
public sealed class AbandonedPaymentWorker : BackgroundService
{
    private static readonly TimeSpan Every = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan GracePeriod = TimeSpan.FromMinutes(30);

    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<AbandonedPaymentWorker> _log;

    public AbandonedPaymentWorker(IServiceScopeFactory scopes, ILogger<AbandonedPaymentWorker> log) { _scopes = scopes; _log = log; }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken); } catch (OperationCanceledException) { return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopes.CreateScope();
                var n = await scope.ServiceProvider.GetRequiredService<IOrderService>().CancelAbandonedOnlineOrdersAsync(GracePeriod);
                if (n > 0) _log.LogInformation("Cancelled {Count} online order(s) whose payment was never completed", n);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { _log.LogError(ex, "Abandoned-payment cleanup failed"); }

            try { await Task.Delay(Every, stoppingToken); } catch (OperationCanceledException) { break; }
        }
    }
}
