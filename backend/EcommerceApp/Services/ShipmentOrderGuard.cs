using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

/// <summary>
/// Database-backed guard: an order is owned by a courier shipment while a shipment HOLDS it
/// (<see cref="ShipmentRules.HoldsOrder"/>: creation in flight, created or unknown, and not cancelled / returned to origin).
/// A delivered shipment still holds its order (so it cannot be shipped twice); a failed creation, a cancelled shipment and an
/// RTO-delivered shipment do not. Whether a shipment still needs tracking is a separate rule (<see cref="ShipmentRules.NeedsTracking"/>).
/// </summary>
public class ShipmentOrderGuard : IOrderShipmentGuard
{
    private readonly AppDbContext _db;
    public ShipmentOrderGuard(AppDbContext db) => _db = db;

    public Task<bool> HasOpenShipmentAsync(Guid orderId, CancellationToken ct = default) =>
        _db.Shipments.AsNoTracking().Where(ShipmentRules.HoldsOrder).AnyAsync(s => s.OrderId == orderId, ct);
}
