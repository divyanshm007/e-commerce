namespace EcommerceApp.Application.Interfaces;

/// <summary>
/// Tells the order code whether a courier shipment currently owns an order. While a shipment is open the order
/// cannot be cancelled through the ordinary flow and its shipped/delivered status and tracking number are not
/// edited by hand. Until shipments exist (a later phase) the registered implementation always answers "no".
/// </summary>
public interface IOrderShipmentGuard
{
    Task<bool> HasOpenShipmentAsync(Guid orderId, CancellationToken ct = default);
}
