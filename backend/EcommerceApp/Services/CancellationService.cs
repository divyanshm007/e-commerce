using EcommerceApp.Application.Common;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using S = EcommerceApp.Domain.Entities.ShipmentConstants.Statuses;

namespace EcommerceApp.Infrastructure.Services;

public class CancellationService : ICancellationService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly IOrderShipmentGuard _guard;

    public CancellationService(AppDbContext db, IEmailService email, IOrderShipmentGuard guard)
    {
        _db = db; _email = email; _guard = guard;
    }

    private const string Sent = "Your cancellation request has been sent to our team. Because the order is already dispatched it is cancelled only after approval. We have e-mailed you and will write again once it is decided.";

    // ───────────────────────── customer ─────────────────────────

    public async Task<ApiResponse<string>?> RequestIfDispatchedAsync(Guid orderId, string? reason, Guid callerId)
    {
        var order = await _db.Orders.AsNoTracking().Include(o => o.User).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == callerId);
        if (order == null) return null;                                                   // not theirs / not found: the ordinary flow answers
        if (order.Status is not (OrderStatus.Pending or OrderStatus.Confirmed or OrderStatus.Shipped)) return null;

        var dispatched = order.Status == OrderStatus.Shipped || await _guard.HasOpenShipmentAsync(orderId);
        if (!dispatched) return null;                                                     // not dispatched yet: direct cancel as before

        reason = string.IsNullOrWhiteSpace(reason) ? "Cancelled by customer" : reason.Trim();
        if (reason.Length > 1000) reason = reason[..1000];

        if (await _db.CancelRequests.AnyAsync(r => r.OrderId == orderId && r.Status == CancelRequestStatus.Pending))
            return ApiResponse<string>.Ok("A cancellation request for this order is already waiting for approval.");

        var name = order.User != null ? $"{order.User.FirstName} {order.User.LastName}".Trim() : order.GuestName ?? "Customer";
        var email = order.User?.Email ?? order.GuestEmail ?? "";
        _db.CancelRequests.Add(new CancelRequest
        {
            OrderId = orderId, UserId = callerId, OrderNumber = order.OrderNumber, CustomerName = name, CustomerEmail = email,
            Reason = reason, WasDispatched = true
        });
        Audit("Cancel.Requested", orderId, $"Cancellation requested for dispatched order {order.OrderNumber}: {reason}", new AuditContext(callerId, null, null));
        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ApiResponse<string>.Ok("A cancellation request for this order is already waiting for approval.");
        }

        if (!string.IsNullOrWhiteSpace(email)) _ = _email.SendCancelRequestedAsync(email, name, order.OrderNumber, reason);
        _ = _email.SendCancelRequestedAdminAsync(order.OrderNumber, name, email, reason, true);
        return ApiResponse<string>.Ok(Sent);
    }

    public async Task<ApiResponse<CancelRequestStatusDto?>> GetMineAsync(Guid orderId, Guid callerId)
    {
        var r = await _db.CancelRequests.AsNoTracking().Where(x => x.OrderId == orderId && x.UserId == callerId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new CancelRequestStatusDto { Status = x.Status.ToString(), Reason = x.Reason, AdminNotes = x.AdminNotes, CreatedAt = x.CreatedAt })
            .FirstOrDefaultAsync();
        return ApiResponse<CancelRequestStatusDto?>.Ok(r);
    }

    // ───────────────────────── admin ─────────────────────────

    public async Task<ApiResponse<PagedResult<CancelRequestRowDto>>> ListAsync(string? status, int page, int pageSize)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.CancelRequests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CancelRequestStatus>(status, true, out var st)) q = q.Where(r => r.Status == st);

        var total = await q.CountAsync();
        var rows = await q.OrderBy(r => r.Status).ThenByDescending(r => r.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new CancelRequestRowDto
            {
                Id = r.Id, OrderId = r.OrderId, OrderNumber = r.OrderNumber, CustomerName = r.CustomerName, CustomerEmail = r.CustomerEmail,
                Reason = r.Reason, Status = r.Status.ToString(), WasDispatched = r.WasDispatched, AdminNotes = r.AdminNotes, CreatedAt = r.CreatedAt,
                OrderStatus = r.Order.Status.ToString(),
                Awb = _db.Shipments.Where(s => s.OrderId == r.OrderId && s.Awb != null).OrderByDescending(s => s.CreatedAt).Select(s => s.Awb).FirstOrDefault()
            }).ToListAsync();
        return ApiResponse<PagedResult<CancelRequestRowDto>>.Ok(new PagedResult<CancelRequestRowDto> { Items = rows, TotalCount = total, Page = page, PageSize = pageSize });
    }

    public async Task<ApiResponse<string>> ApproveAsync(Guid requestId, string? notes, AuditContext audit)
    {
        var req = await _db.CancelRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (req == null) return ApiResponse<string>.NotFound("Cancellation request not found.");
        if (req.Status != CancelRequestStatus.Pending) return ApiResponse<string>.Fail("This request has already been decided.", 409);

        var order = await _db.Orders.AsNoTracking().Include(o => o.Items).FirstAsync(o => o.Id == req.OrderId);
        if (order.Status == OrderStatus.Cancelled)
        {
            // already cancelled some other way: just close the request
            req.Status = CancelRequestStatus.Approved; req.ReviewedByUserId = audit.UserId; req.ReviewedAt = DateTime.UtcNow; req.AdminNotes = Cap(notes);
            await _db.SaveChangesAsync();
            return ApiResponse<string>.Ok("The order was already cancelled; the request is closed.");
        }
        if (order.Status is not (OrderStatus.Pending or OrderStatus.Confirmed or OrderStatus.Shipped))
            return ApiResponse<string>.Fail($"An order that is {order.Status} can no longer be cancelled. Reject the request instead.", 409);

        var now = DateTime.UtcNow;
        var dispatched = order.Status == OrderStatus.Shipped || await _guard.HasOpenShipmentAsync(order.Id);
        var flagRefund = order.PaymentStatus == PaymentStatus.Paid && order.RefundStatus == RefundStatus.NotRequested;
        var requested = RefundStatus.Requested;
        var reason = req.Reason;

        await using var tx = await _db.Database.BeginTransactionAsync();

        var rows = await _db.Orders
            .Where(o => o.Id == order.Id && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Shipped))
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OrderStatus.Cancelled)
                .SetProperty(o => o.CancelledAt, now)
                .SetProperty(o => o.CancellationReason, reason)
                .SetProperty(o => o.RefundStatus, o => flagRefund ? requested : o.RefundStatus)
                .SetProperty(o => o.UpdatedAt, now));
        if (rows == 0)
        {
            await tx.RollbackAsync();
            return ApiResponse<string>.Fail("The order changed while you were approving. Reload and try again.", 409);
        }

        // goods that are still with us go back on the shelf; a parcel already with the courier comes back as a return instead
        if (!dispatched)
            foreach (var line in order.Items.GroupBy(i => i.ProductId).Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) }))
            {
                var qty = line.Qty;
                await _db.Products.Where(p => p.Id == line.ProductId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(p => p.StockQuantity, p => p.StockQuantity + qty)
                        .SetProperty(p => p.SoldCount, p => p.SoldCount > qty ? p.SoldCount - qty : 0)
                        .SetProperty(p => p.UpdatedAt, now));
            }

        // our own shipment record stops being tracked (the parcel itself is cancelled in the Delhivery portal)
        await _db.Shipments.Where(s => s.OrderId == order.Id).Where(ShipmentRules.HoldsOrder)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, S.Cancelled).SetProperty(x => x.IsFinal, true).SetProperty(x => x.NextCheckAt, (DateTime?)null).SetProperty(x => x.UpdatedAt, now));
        await _db.OrderFulfilments.Where(f => f.OrderId == order.Id && f.State != FulfilmentStates.Completed && f.State != FulfilmentStates.Rejected)
            .ExecuteUpdateAsync(f => f.SetProperty(x => x.State, FulfilmentStates.Completed).SetProperty(x => x.AttentionReason, (string?)null)
                .SetProperty(x => x.LeaseUntil, (DateTime?)null).SetProperty(x => x.UpdatedAt, now));

        req.Status = CancelRequestStatus.Approved; req.ReviewedByUserId = audit.UserId; req.ReviewedAt = now; req.AdminNotes = Cap(notes);
        Audit("Cancel.Approved", order.Id, $"Cancellation of order {order.OrderNumber} approved.", audit);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        if (!string.IsNullOrWhiteSpace(req.CustomerEmail)) _ = _email.SendCancelDecisionAsync(req.CustomerEmail, req.CustomerName, req.OrderNumber, true, req.AdminNotes);
        return ApiResponse<string>.Ok(dispatched
            ? "Order cancelled. Remember to cancel the shipment in the Delhivery portal and restock the goods when the parcel returns."
            : "Order cancelled and stock restored.");
    }

    public async Task<ApiResponse<string>> RejectAsync(Guid requestId, string? notes, AuditContext audit)
    {
        var req = await _db.CancelRequests.FirstOrDefaultAsync(r => r.Id == requestId);
        if (req == null) return ApiResponse<string>.NotFound("Cancellation request not found.");
        if (req.Status != CancelRequestStatus.Pending) return ApiResponse<string>.Fail("This request has already been decided.", 409);

        req.Status = CancelRequestStatus.Rejected; req.ReviewedByUserId = audit.UserId; req.ReviewedAt = DateTime.UtcNow; req.AdminNotes = Cap(notes);
        Audit("Cancel.Rejected", req.OrderId, $"Cancellation of order {req.OrderNumber} declined.", audit);
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(req.CustomerEmail)) _ = _email.SendCancelDecisionAsync(req.CustomerEmail, req.CustomerName, req.OrderNumber, false, req.AdminNotes);
        return ApiResponse<string>.Ok("Request declined. The customer has been told.");
    }

    private static string? Cap(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim().Length > 1000 ? v.Trim()[..1000] : v.Trim();

    private void Audit(string action, Guid orderId, string description, AuditContext a) =>
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = a.UserId, Action = action, EntityType = nameof(Order), EntityId = orderId.ToString(), Description = description,
            IpAddress = a.IpAddress, UserAgent = a.UserAgent is { Length: > 500 } ua ? ua[..500] : a.UserAgent
        });
}
