using System.Linq.Expressions;

namespace EcommerceApp.Domain.Entities;

public static class ShipmentConstants
{
    public const string Test = "test";
    public const string Live = "live";

    public static class CreationStates
    {
        public const string InFlight = "IN_FLIGHT";   // row reserved, the request is being sent
        public const string Created = "CREATED";      // Delhivery accepted it and the AWB is stored
        public const string Failed = "FAILED";        // Delhivery definitely refused it – nothing exists there, retry allowed
        public const string Unknown = "UNKNOWN";      // timeout / ambiguous answer – never retried blindly
        public static readonly string[] All = [InFlight, Created, Failed, Unknown];
    }

    public static class Statuses
    {
        public const string Created = "CREATED";
        public const string PickedUp = "PICKED_UP";
        public const string InTransit = "IN_TRANSIT";
        public const string OutForDelivery = "OUT_FOR_DELIVERY";
        public const string Delivered = "DELIVERED";
        public const string RtoInTransit = "RTO_IN_TRANSIT";
        public const string RtoDelivered = "RTO_DELIVERED";
        public const string Cancelled = "CANCELLED";
        public const string NeedsReview = "NEEDS_REVIEW";
        public static readonly string[] All =
            [Created, PickedUp, InTransit, OutForDelivery, Delivered, RtoInTransit, RtoDelivered, Cancelled, NeedsReview];
    }

    public static class EventSources
    {
        public const string Poll = "poll";
        public const string Webhook = "webhook";
    }
}

/// <summary>
/// Three separate questions about a shipment, each with exactly one definition:
/// <list type="number">
/// <item><b>Holds the order</b> (<see cref="HoldsOrder"/>): the shipment still stands for its order, so no second shipment may be created and
///   the courier-owned fields (shipped/delivered status, tracking number) are not edited by hand. True while creation is in flight, created or
///   unknown, and the shipment is not CANCELLED or RTO_DELIVERED. A <b>delivered</b> shipment still holds its order: otherwise the database
///   would allow a second shipment for an order that has already been delivered. Only a cancelled or returned-to-origin shipment releases it.</item>
/// <item><b>Final</b> (<see cref="IsFinalStatus"/>): DELIVERED, RTO_DELIVERED or CANCELLED – nothing more can happen to the parcel.</item>
/// <item><b>Needs tracking</b> (<see cref="NeedsTracking"/>): created at Delhivery and not final – the only shipments the tracking worker may poll.
///   Delivered is therefore "holds the order" but "does not need tracking".</item>
/// </list>
/// The database's unique index UX_Shipments_Order_Open (the name predates this split and means "holds the order") uses the SQL form of
/// <see cref="HoldsOrder"/>; a test proves the index, the guard and the C# rule agree for every combination.
/// </summary>
public static class ShipmentRules
{
    /// <summary>SQL form of <see cref="HoldsOrder"/>, the filter of the unique index UX_Shipments_Order_Open. Must not change without a migration.</summary>
    public const string HoldsOrderFilterSql =
        "\"CreationState\" IN ('IN_FLIGHT','CREATED','UNKNOWN') AND \"Status\" NOT IN ('CANCELLED','RTO_DELIVERED')";

    public static readonly Expression<Func<Shipment, bool>> HoldsOrder = s =>
        (s.CreationState == ShipmentConstants.CreationStates.InFlight ||
         s.CreationState == ShipmentConstants.CreationStates.Created ||
         s.CreationState == ShipmentConstants.CreationStates.Unknown) &&
        s.Status != ShipmentConstants.Statuses.Cancelled &&
        s.Status != ShipmentConstants.Statuses.RtoDelivered;

    public static bool IsFinalStatus(string? status) =>
        status is ShipmentConstants.Statuses.Delivered or ShipmentConstants.Statuses.RtoDelivered or ShipmentConstants.Statuses.Cancelled;

    /// <summary>
    /// Shipments the tracking worker may poll: created at Delhivery and not final. Checks both the stored IsFinal flag (what the poll index
    /// filters on) and the status itself, so a row whose flag was not kept in step with its status is still never polled.
    /// </summary>
    public static readonly Expression<Func<Shipment, bool>> NeedsTracking = s =>
        s.CreationState == ShipmentConstants.CreationStates.Created &&
        !s.IsFinal &&
        s.Status != ShipmentConstants.Statuses.Delivered &&
        s.Status != ShipmentConstants.Statuses.RtoDelivered &&
        s.Status != ShipmentConstants.Statuses.Cancelled;

    /// <summary>The only way code should change a shipment's status: keeps IsFinal in step with Status.</summary>
    public static void ApplyStatus(Shipment shipment, string status)
    {
        shipment.Status = status;
        shipment.IsFinal = IsFinalStatus(status);
    }
}
