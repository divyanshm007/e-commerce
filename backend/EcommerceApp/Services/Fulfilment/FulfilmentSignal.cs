using EcommerceApp.Application.Interfaces;

namespace EcommerceApp.Infrastructure.Services.Fulfilment;

public sealed class FulfilmentSignal : IFulfilmentSignal
{
    private readonly SemaphoreSlim _gate = new(0, 1);
    public void Poke() { try { _gate.Release(); } catch (SemaphoreFullException) { } }
    public Task WaitAsync(TimeSpan timeout, CancellationToken ct) => _gate.WaitAsync(timeout, ct);
}
