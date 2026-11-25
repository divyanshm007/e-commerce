using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Shipments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services.Delhivery;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using C = EcommerceApp.Domain.Entities.ShipmentConstants.CreationStates;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;

namespace EcommerceApp.Infrastructure.Services.Fulfilment;

public class FulfilmentService : IFulfilmentService
{
    public static readonly string[] Kinds = ["awaiting-approval", "awaiting-shipment", "creation-failures", "in-transit", "delivered", "exceptions"];

    private readonly AppDbContext _db;
    private readonly IDelhiveryConfigService _config;
    private readonly IFulfilmentSignal _signal;

    public FulfilmentService(AppDbContext db, IDelhiveryConfigService config, IFulfilmentSignal signal)
    {
        _db = db; _config = config; _signal = signal;
    }

    // ───────────────────────── eligibility ─────────────────────────

    /// <summary>Why this order cannot be dispatched. Empty means it can. Payment, COD amount, address, PIN and the products are all checked here.</summary>
    public static List<string> Issues(Order order, IReadOnlyCollection<Guid> inactiveProductIds)
    {
        var issues = new List<string>();
        if (order.Status is not (OrderStatus.Pending or OrderStatus.Confirmed))
            issues.Add($"The order is {order.Status}; only Pending or Confirmed orders can be dispatched.");

        if (order.PaymentMethod == PaymentMethod.Razorpay && order.PaymentStatus != PaymentStatus.Paid)
            issues.Add("The online payment has not been verified as paid; unpaid online orders are never dispatched.");

        // address, PIN, phone, COD amount: the same checks the courier request uses
        var built = DelhiveryRequestBuilder.FromOrder(order, "ELIGIBILITY-CHECK", "Pickup");
        if (!built.Success)
            issues.AddRange(built.Errors.Where(e => !e.Contains("verified", StringComparison.OrdinalIgnoreCase) || order.PaymentMethod != PaymentMethod.Razorpay));

        if (order.Items == null || order.Items.Count == 0) issues.Add("The order has no items.");
        else if (order.Items.Any(i => inactiveProductIds.Contains(i.ProductId))) issues.Add("An ordered product no longer exists or is inactive.");
        return issues.Distinct().ToList();
    }

    private async Task<List<Guid>> InactiveProductsAsync(IEnumerable<Order> orders)
    {
        var ids = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
        var active = await _db.Products.Where(p => ids.Contains(p.Id) && p.IsActive && p.StockQuantity >= 0).Select(p => p.Id).ToListAsync();
        return ids.Except(active).ToList();
    }

    // ───────────────────────── approve / reject ─────────────────────────

    public async Task<ApiResponse<string>> ApproveAsync(Guid orderId, AuditContext audit)
    {
        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return ApiResponse<string>.NotFound("Order not found.");

        if (await _db.OrderFulfilments.AnyAsync(f => f.OrderId == orderId))
            return ApiResponse<string>.Fail("This order has already been approved or rejected.", 409);

        var issues = Issues(order, await InactiveProductsAsync([order]));
        if (issues.Count > 0) return ApiResponse<string>.Fail("This order is not eligible for dispatch.", 409, issues);

        var now = DateTime.UtcNow;
        _db.OrderFulfilments.Add(new OrderFulfilment
        {
            OrderId = orderId, State = FulfilmentStates.Approved, ApprovedByUserId = audit.UserId, ApprovedAt = now, NextAttemptAt = now
        });
        Audit("Fulfilment.Approved", orderId, $"Order {order.OrderNumber} approved for dispatch.", audit);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ApiResponse<string>.Fail("This order has already been approved or rejected.", 409);       // two admins clicked at once
        }

        // an approved COD order is a confirmed order (Pending -> Confirmed is an allowed transition)
        if (order.Status == OrderStatus.Pending)
            await _db.Orders.Where(o => o.Id == orderId && o.Status == OrderStatus.Pending)
                .ExecuteUpdateAsync(u => u.SetProperty(o => o.Status, OrderStatus.Confirmed).SetProperty(o => o.UpdatedAt, now));

        _signal.Poke();
        return ApiResponse<string>.Ok("Order approved. The shipment will be created automatically.");
    }

    public async Task<ApiResponse<string>> RejectAsync(Guid orderId, string? reason, AuditContext audit)
    {
        reason = reason?.Trim();
        if (string.IsNullOrEmpty(reason) || reason.Length < 3) return ApiResponse<string>.Fail("Please give a reason for rejecting the order.");
        if (reason.Length > 500) reason = reason[..500];

        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return ApiResponse<string>.NotFound("Order not found.");
        if (await _db.OrderFulfilments.AnyAsync(f => f.OrderId == orderId))
            return ApiResponse<string>.Fail("This order has already been approved or rejected.", 409);

        var now = DateTime.UtcNow;
        _db.OrderFulfilments.Add(new OrderFulfilment
        {
            OrderId = orderId, State = FulfilmentStates.Rejected, RejectedByUserId = audit.UserId, RejectedAt = now, RejectReason = reason
        });
        Audit("Fulfilment.Rejected", orderId, $"Order {order.OrderNumber} rejected for dispatch: {reason}", audit);
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ApiResponse<string>.Fail("This order has already been approved or rejected.", 409);
        }
        return ApiResponse<string>.Ok("Order rejected for dispatch.");
    }

    public async Task<ApiResponse<string>> RetryAsync(Guid orderId, AuditContext audit)
    {
        var f = await _db.OrderFulfilments.FirstOrDefaultAsync(x => x.OrderId == orderId);
        if (f == null) return ApiResponse<string>.NotFound("Nothing to retry for this order.");
        if (f.State != FulfilmentStates.Exception) return ApiResponse<string>.Fail("Only orders in the exception queue can be retried.", 409);

        var shipments = await _db.Shipments.Where(s => s.OrderId == orderId).ToListAsync();
        if (shipments.Any(s => s.CreationState == C.Created))
            return ApiResponse<string>.Fail("A shipment already exists at Delhivery for this order; use Resolve instead of Retry.", 409);

        var now = DateTime.UtcNow;
        // the administrator confirms that nothing exists at Delhivery: ambiguous attempts are closed so a new one may start
        foreach (var s in shipments.Where(s => s.CreationState is C.Unknown or C.InFlight))
        { s.CreationState = C.Failed; s.LastError = "Closed by an administrator before a retry."; s.LastErrorAt = now; }
        f.State = FulfilmentStates.Approved; f.Attempts = 0; f.NextAttemptAt = now; f.LeaseUntil = null; f.AttentionReason = null; f.LastError = null; f.UpdatedAt = now;
        Audit("Fulfilment.Retry", orderId, "Order returned to automatic processing by an administrator.", audit);
        await _db.SaveChangesAsync();
        _signal.Poke();
        return ApiResponse<string>.Ok("The order will be processed again automatically.");
    }

    public async Task<ApiResponse<string>> ResolveAsync(Guid orderId, string? note, AuditContext audit)
    {
        var f = await _db.OrderFulfilments.FirstOrDefaultAsync(x => x.OrderId == orderId);
        if (f == null) return ApiResponse<string>.NotFound("Nothing to resolve for this order.");
        if (f.State != FulfilmentStates.Exception) return ApiResponse<string>.Fail("This order is not in the exception queue.", 409);

        var shipment = await _db.Shipments.Where(s => s.OrderId == orderId && s.CreationState == C.Created).OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync();
        if (shipment == null) return ApiResponse<string>.Fail("There is no shipment to resume; use Retry.", 409);

        var now = DateTime.UtcNow;
        f.State = shipment.IsFinal ? FulfilmentStates.Completed : FulfilmentStates.Shipped;
        f.AttentionReason = null; f.UpdatedAt = now;
        shipment.TrackFailureCount = 0;
        if (!shipment.IsFinal) shipment.NextCheckAt = now;
        Audit("Fulfilment.Resolved", orderId, "Exception reviewed" + (string.IsNullOrWhiteSpace(note) ? "." : ": " + note.Trim()[..Math.Min(note.Trim().Length, 300)]), audit);
        await _db.SaveChangesAsync();
        _signal.Poke();
        return ApiResponse<string>.Ok("Exception marked as reviewed.");
    }

    private void Audit(string action, Guid orderId, string description, AuditContext a) =>
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = a.UserId, Action = action, EntityType = nameof(Order), EntityId = orderId.ToString(), Description = description,
            IpAddress = a.IpAddress, UserAgent = a.UserAgent is { Length: > 500 } ua ? ua[..500] : a.UserAgent
        });

    // ───────────────────────── dashboard and queues ─────────────────────────

    public async Task<ApiResponse<FulfilmentDashboardDto>> GetDashboardAsync()
    {
        string mode;
        try { mode = await _config.GetModeAsync(); } catch (DelhiveryConfigurationException) { mode = "invalid"; }

        var states = await _db.OrderFulfilments.GroupBy(f => f.State).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        int St(string k) => states.TryGetValue(k, out var n) ? n : 0;

        return ApiResponse<FulfilmentDashboardDto>.Ok(new FulfilmentDashboardDto
        {
            Mode = mode,
            AwaitingApproval = await AwaitingApprovalQuery().CountAsync(),
            ApprovedAwaitingShipment = St(FulfilmentStates.Approved) + St(FulfilmentStates.Creating),
            CreationFailures = await FailureOrderIds().CountAsync(),
            InTransit = await _db.Shipments.CountAsync(s => s.CreationState == C.Created && !s.IsFinal),
            Delivered = await _db.Shipments.CountAsync(s => s.Status == S.Delivered),
            Exceptions = St(FulfilmentStates.Exception)
        });
    }

    // orders that need a decision: not decided yet, still open, and either paid online or cash on delivery
    private IQueryable<Order> AwaitingApprovalQuery() =>
        _db.Orders.Where(o => (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed)
                              && (o.PaymentMethod == PaymentMethod.CashOnDelivery || o.PaymentStatus == PaymentStatus.Paid)
                              && !_db.OrderFulfilments.Any(f => f.OrderId == o.Id));

    // an order whose latest creation attempt did not produce a shipment, or that is in the exception queue without one
    private IQueryable<Guid> FailureOrderIds() =>
        _db.OrderFulfilments.Where(f => f.State == FulfilmentStates.Exception && !_db.Shipments.Any(s => s.OrderId == f.OrderId && s.CreationState == C.Created))
            .Select(f => f.OrderId);

    public async Task<ApiResponse<PagedResult<FulfilmentRowDto>>> ListAsync(string kind, int page, int pageSize)
    {
        if (!Kinds.Contains(kind)) return ApiResponse<PagedResult<FulfilmentRowDto>>.Fail("Unknown list.", 400);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<Guid> orderIds = kind switch
        {
            "awaiting-approval" => AwaitingApprovalQuery().OrderBy(o => o.CreatedAt).Select(o => o.Id),
            "awaiting-shipment" => _db.OrderFulfilments.Where(f => f.State == FulfilmentStates.Approved || f.State == FulfilmentStates.Creating).OrderBy(f => f.ApprovedAt).Select(f => f.OrderId),
            "creation-failures" => FailureOrderIds(),
            "in-transit" => _db.Shipments.Where(s => s.CreationState == C.Created && !s.IsFinal).OrderByDescending(s => s.LastEventAt ?? s.CreatedAt).Select(s => s.OrderId),
            "delivered" => _db.Shipments.Where(s => s.Status == S.Delivered).OrderByDescending(s => s.LastEventAt ?? s.CreatedAt).Select(s => s.OrderId),
            _ => _db.OrderFulfilments.Where(f => f.State == FulfilmentStates.Exception).OrderBy(f => f.UpdatedAt).Select(f => f.OrderId)
        };

        var total = await orderIds.CountAsync();
        var pageIds = await orderIds.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var orders = await _db.Orders.AsNoTracking().Include(o => o.Items).Include(o => o.User).Where(o => pageIds.Contains(o.Id)).ToListAsync();
        var fulfilments = await _db.OrderFulfilments.AsNoTracking().Where(f => pageIds.Contains(f.OrderId)).ToDictionaryAsync(f => f.OrderId);
        var shipments = (await _db.Shipments.AsNoTracking().Where(s => pageIds.Contains(s.OrderId)).ToListAsync())
            .GroupBy(s => s.OrderId).ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.CreatedAt).First());
        var inactive = kind == "awaiting-approval" ? await InactiveProductsAsync(orders) : [];

        var rows = pageIds.Select(id => orders.FirstOrDefault(o => o.Id == id)).Where(o => o != null).Select(o =>
        {
            fulfilments.TryGetValue(o!.Id, out var f);
            shipments.TryGetValue(o.Id, out var s);
            var issues = kind == "awaiting-approval" ? Issues(o, inactive) : [];
            return new FulfilmentRowDto
            {
                OrderId = o.Id, OrderNumber = o.OrderNumber,
                CustomerName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : o.GuestName ?? o.ShippingFullName,
                TotalAmount = o.TotalAmount, PaymentMethod = o.PaymentMethod.ToString(), PaymentStatus = o.PaymentStatus.ToString(),
                OrderStatus = o.Status.ToString(), OrderDate = o.CreatedAt,
                FulfilmentState = f?.State, Awb = s?.Awb, ShipmentStatus = s?.Status, CreationState = s?.CreationState,
                AttentionReason = f?.AttentionReason, LastError = f?.LastError ?? s?.LastError, Attempts = f?.Attempts ?? 0,
                Eligible = issues.Count == 0, Issues = issues
            };
        }).ToList();

        return ApiResponse<PagedResult<FulfilmentRowDto>>.Ok(new PagedResult<FulfilmentRowDto> { Items = rows, TotalCount = total, Page = page, PageSize = pageSize });
    }

    // ───────────────────────── shipment view of an order ─────────────────────────

    public async Task<ApiResponse<OrderShipmentDto>> GetOrderShipmentAsync(Guid orderId, Guid? callerId, bool callerIsAdmin)
    {
        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null || !OrderAccess.CanAccess(order.UserId, callerId, callerIsAdmin))
            return ApiResponse<OrderShipmentDto>.NotFound("Order not found.");         // someone else's order looks exactly like a missing one

        var q = _db.Shipments.AsNoTracking().Where(s => s.OrderId == orderId);
        if (!callerIsAdmin) q = q.Where(s => s.CreationState == C.Created);          // customers only ever see a real, created shipment
        var shipment = await q.OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync();
        var fulfilment = callerIsAdmin ? await _db.OrderFulfilments.AsNoTracking().FirstOrDefaultAsync(f => f.OrderId == orderId) : null;

        var dto = new OrderShipmentDto { HasShipment = shipment != null };
        if (shipment != null)
        {
            dto.Courier = shipment.CourierName; dto.Awb = shipment.Awb; dto.Status = shipment.Status; dto.ExpectedDeliveryDate = shipment.ExpectedDeliveryDate;
            dto.Timeline = await _db.ShipmentTrackingEvents.AsNoTracking().Where(e => e.ShipmentId == shipment.Id)
                .OrderByDescending(e => e.ScanTime ?? e.CreatedAt)
                .Select(e => new ShipmentEventDto { Status = e.Status, Category = e.MappedStatus, Location = e.Location, Time = e.ScanTime ?? e.CreatedAt }).ToListAsync();
        }
        if (callerIsAdmin)
        {
            var adminShipment = shipment ?? await _db.Shipments.AsNoTracking().Where(s => s.OrderId == orderId).OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync();
            dto.HasShipment = adminShipment != null;
            dto.Courier ??= adminShipment?.CourierName; dto.Awb ??= adminShipment?.Awb; dto.Status ??= adminShipment?.Status;
            dto.CreationState = adminShipment?.CreationState; dto.Mode = adminShipment?.Mode;
            dto.FulfilmentState = fulfilment?.State; dto.AttentionReason = fulfilment?.AttentionReason;
            dto.LastError = fulfilment?.LastError ?? adminShipment?.LastError; dto.Attempts = fulfilment?.Attempts; dto.ApprovedAt = fulfilment?.ApprovedAt;
            if (fulfilment?.ApprovedByUserId is { } uid)
            {
                var u = await _db.Users.AsNoTracking().Where(x => x.Id == uid).Select(x => x.FirstName + " " + x.LastName).FirstOrDefaultAsync();
                dto.ApprovedBy = u?.Trim();
            }
        }
        return ApiResponse<OrderShipmentDto>.Ok(dto);
    }
}
