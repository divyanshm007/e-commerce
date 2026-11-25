using EcommerceApp.Application.DTOs.Shipments;

namespace EcommerceApp.Application.Interfaces;

/// <summary>
/// The only place that talks HTTP to Delhivery. It sends exactly one request per call, never retries, never throws for a failed
/// call (the result says what happened) and never returns or logs the token or a raw response body.
/// Shipment creation workflow, persistence and polling are NOT part of this interface (later stages).
/// </summary>
public interface IDelhiveryClient
{
    /// <summary>POST /api/cmu/create.json. The result says whether the shipment certainly does not exist (NotCreated) or whether that is unknown.</summary>
    Task<DelhiveryCreateResult> CreateShipmentAsync(DelhiveryShipmentRequest request, CancellationToken ct = default);

    /// <summary>GET /api/v1/packages/json/ for up to 50 waybills (and optionally order references).</summary>
    Task<DelhiveryTrackingResult> TrackAsync(IReadOnlyCollection<string> waybills, IReadOnlyCollection<string>? orderRefs = null, CancellationToken ct = default);

    /// <summary>
    /// Looks a shipment up by our order reference only (the documented optional ref_ids parameter), used to reconcile an ambiguous create.
    /// The exact request shape for a reference-only lookup is NOT confirmed; if Delhivery does not answer in a recognised way the result
    /// is inconclusive and callers must not treat it as "nothing was created".
    /// </summary>
    Task<DelhiveryTrackingResult> TrackByReferenceAsync(string orderRef, CancellationToken ct = default);
}
