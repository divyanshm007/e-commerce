using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Dashboard;
using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IEmailService _emailService;
    private readonly ICartService _cartService;
    private readonly IOrderShipmentGuard _shipmentGuard;

    public OrderService(AppDbContext db, IMapper mapper, IEmailService emailService, ICartService cartService,
        IOrderShipmentGuard shipmentGuard)
    {
        _db = db;
        _mapper = mapper;
        _emailService = emailService;
        _cartService = cartService;
        _shipmentGuard = shipmentGuard;
    }

    private IQueryable<Order> BaseQuery() =>
        _db.Orders
            .Include(o => o.User)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Coupon)
            .Include(o => o.Payments)
            .AsNoTracking();

    public async Task<ApiResponse<OrderReportDto>> GetReportAsync(DateOnly? from, DateOnly? to)
    {
        if (from != null && to != null && from > to) (from, to) = (to, from);                 // a reversed range is read the way it was meant

        var ist = TimeSpan.FromMinutes(330);
        IQueryable<Order> Filter(IQueryable<Order> q)
        {
            if (from != null) { var start = DateTime.SpecifyKind(from.Value.ToDateTime(TimeOnly.MinValue) - ist, DateTimeKind.Utc); q = q.Where(o => o.CreatedAt >= start); }
            if (to != null) { var end = DateTime.SpecifyKind(to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue) - ist, DateTimeKind.Utc); q = q.Where(o => o.CreatedAt < end); }
            return q;
        }

        var inRange = Filter(_db.Orders.AsNoTracking());
        var counted = inRange.Where(o => o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Returned);

        var ordersCount = await inRange.CountAsync();
        var countedOrders = await counted.CountAsync();
        var revenue = await counted.SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;
        var delivered = await inRange.CountAsync(o => o.Status == OrderStatus.Delivered);
        var cancelled = await inRange.CountAsync(o => o.Status == OrderStatus.Cancelled);

        var topIds = await counted.OrderByDescending(o => o.TotalAmount).Take(10).Select(o => o.Id).ToListAsync();
        var top = await BaseQuery().Where(o => topIds.Contains(o.Id)).ToListAsync();

        return ApiResponse<OrderReportDto>.Ok(new OrderReportDto
        {
            From = from, To = to, OrdersCount = ordersCount, CountedOrders = countedOrders, Revenue = revenue,
            AverageOrderValue = countedOrders > 0 ? Math.Round(revenue / countedOrders, 2) : 0m,
            DeliveredCount = delivered, CancelledCount = cancelled,
            TopOrders = _mapper.Map<List<OrderListDto>>(top.OrderByDescending(o => o.TotalAmount).ToList())
        });
    }

    public async Task<ApiResponse<PagedResult<OrderListDto>>> GetAllAsync(PaginationParams paging)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(paging.Search))
            query = query.Where(o =>
                o.OrderNumber.Contains(paging.Search) ||
                (o.User != null && (o.User.Email.Contains(paging.Search) ||
                    o.User.FirstName.Contains(paging.Search))) ||
                (o.GuestEmail != null && o.GuestEmail.Contains(paging.Search)));

        query = paging.SortBy?.ToLower() switch
        {
            "total" => query.OrderByDescending(o => o.TotalAmount),
            "status" => query.OrderBy(o => o.Status),
            _ => query.OrderByDescending(o => o.CreatedAt)
        };

        var total = await query.CountAsync();
        var items = await query.Skip((paging.Page - 1) * paging.PageSize).Take(paging.PageSize).ToListAsync();

        return ApiResponse<PagedResult<OrderListDto>>.Ok(new PagedResult<OrderListDto>
        {
            Items = _mapper.Map<List<OrderListDto>>(items),
            TotalCount = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        });
    }

    public async Task<ApiResponse<OrderDetailDto>> GetByIdAsync(Guid id)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return ApiResponse<OrderDetailDto>.NotFound("Order not found.");
        return ApiResponse<OrderDetailDto>.Ok(_mapper.Map<OrderDetailDto>(order));
    }

    public async Task<ApiResponse<OrderDetailDto>> GetByOrderNumberAsync(string orderNumber)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);
        if (order == null) return ApiResponse<OrderDetailDto>.NotFound("Order not found.");
        return ApiResponse<OrderDetailDto>.Ok(_mapper.Map<OrderDetailDto>(order));
    }

    public async Task<ApiResponse<OrderDetailDto>> GetByIdForCallerAsync(Guid id, Guid? callerId, bool callerIsAdmin)
    {
        var result = await GetByIdAsync(id);
        return result.Success && !OrderAccess.CanAccess(result.Data!.UserId, callerId, callerIsAdmin)
            ? ApiResponse<OrderDetailDto>.NotFound("Order not found.")
            : result;
    }

    public async Task<ApiResponse<OrderDetailDto>> GetByOrderNumberForCallerAsync(string orderNumber, Guid? callerId, bool callerIsAdmin)
    {
        var result = await GetByOrderNumberAsync(orderNumber);
        return result.Success && !OrderAccess.CanAccess(result.Data!.UserId, callerId, callerIsAdmin)
            ? ApiResponse<OrderDetailDto>.NotFound("Order not found.")
            : result;
    }

    public async Task<ApiResponse<OrderTrackingDto>> TrackGuestOrderAsync(string orderNumber, string contact)
    {
        // one answer for every failure (no such order, member order, wrong contact) so nothing can be probed
        var generic = ApiResponse<OrderTrackingDto>.NotFound("We couldn't find an order matching these details.");
        if (string.IsNullOrWhiteSpace(orderNumber) || string.IsNullOrWhiteSpace(contact)) return generic;

        var number = orderNumber.Trim().ToUpperInvariant();
        var order = await _db.Orders.AsNoTracking().Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.OrderNumber == number && o.UserId == null);
        if (order == null) return generic;

        var given = contact.Trim();
        var matches = given.Contains('@')
            ? SameValue(ContactNormalizer.NormalizeEmail(given), ContactNormalizer.NormalizeEmail(order.GuestEmail))
            : SameValue(ContactNormalizer.TryNormalizePhone(given), ContactNormalizer.TryNormalizePhone(order.GuestPhone));
        if (!matches) return generic;

        var shipment = await _db.Shipments.AsNoTracking().Where(s => s.OrderId == order.Id && s.CreationState == ShipmentConstants.CreationStates.Created)
            .OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync();
        EcommerceApp.Application.DTOs.Shipments.OrderShipmentDto? shipmentDto = null;
        if (shipment != null)
            shipmentDto = new EcommerceApp.Application.DTOs.Shipments.OrderShipmentDto
            {
                HasShipment = true, Courier = shipment.CourierName, Awb = shipment.Awb, Status = shipment.Status, ExpectedDeliveryDate = shipment.ExpectedDeliveryDate,
                Timeline = await _db.ShipmentTrackingEvents.AsNoTracking().Where(e => e.ShipmentId == shipment.Id).OrderByDescending(e => e.ScanTime ?? e.CreatedAt)
                    .Select(e => new EcommerceApp.Application.DTOs.Shipments.ShipmentEventDto { Status = e.Status, Category = e.MappedStatus, Location = e.Location, Time = e.ScanTime ?? e.CreatedAt })
                    .ToListAsync()
            };

        return ApiResponse<OrderTrackingDto>.Ok(new OrderTrackingDto
        {
            Shipment = shipmentDto,
            OrderNumber = order.OrderNumber,
            Status = order.Status,
            PlacedAt = order.CreatedAt,
            ShippedAt = order.ShippedAt,
            DeliveredAt = order.DeliveredAt,
            TrackingNumber = order.TrackingNumber,
            Items = order.Items.Select(i => new OrderTrackingItemDto { ProductName = i.ProductName, Quantity = i.Quantity }).ToList()
        });
    }

    private static bool SameValue(string? a, string? b) =>
        !string.IsNullOrEmpty(a) && !string.IsNullOrEmpty(b) &&
        System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(a), System.Text.Encoding.UTF8.GetBytes(b));

    public async Task<ApiResponse<List<OrderListDto>>> GetByUserAsync(Guid userId)
    {
        var orders = await BaseQuery()
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return ApiResponse<List<OrderListDto>>.Ok(_mapper.Map<List<OrderListDto>>(orders));
    }

    public async Task<ApiResponse<OrderDetailDto>> CreateAsync(CreateOrderDto dto)
    {
        // Courier-ready contact data: a 10-digit mobile number and a 6-digit PIN, stored in normalised form.
        if (dto.Items == null || dto.Items.Count == 0 || dto.ShippingAddress == null || dto.BillingAddress == null)
            return ApiResponse<OrderDetailDto>.Fail("Order must have at least one item and a delivery address.");
        if (dto.Items.Any(i => i.Quantity < 1))
            return ApiResponse<OrderDetailDto>.Fail("Item quantity must be at least 1.");

        await CancelEarlierUnpaidOnlineOrdersAsync(dto);

        var shipPhone = ContactNormalizer.TryNormalizePhone(dto.ShippingAddress.Phone);
        var billPhone = ContactNormalizer.TryNormalizePhone(dto.BillingAddress.Phone);
        if (shipPhone == null || billPhone == null)
            return ApiResponse<OrderDetailDto>.Fail("Enter a valid 10-digit mobile number.");
        if (!ContactNormalizer.IsValidPin(dto.ShippingAddress.PostalCode) || !ContactNormalizer.IsValidPin(dto.BillingAddress.PostalCode))
            return ApiResponse<OrderDetailDto>.Fail("Enter a valid 6-digit PIN code.");
        if (!string.IsNullOrWhiteSpace(dto.GuestPhone) && ContactNormalizer.TryNormalizePhone(dto.GuestPhone) == null)
            return ApiResponse<OrderDetailDto>.Fail("Enter a valid 10-digit mobile number.");
        dto.ShippingAddress.Phone = shipPhone;
        dto.BillingAddress.Phone = billPhone;
        dto.ShippingAddress.PostalCode = dto.ShippingAddress.PostalCode.Trim();
        dto.BillingAddress.PostalCode = dto.BillingAddress.PostalCode.Trim();
        if (!string.IsNullOrWhiteSpace(dto.GuestPhone)) dto.GuestPhone = ContactNormalizer.TryNormalizePhone(dto.GuestPhone);
        if (!string.IsNullOrWhiteSpace(dto.GuestEmail)) dto.GuestEmail = dto.GuestEmail.Trim();

        // Stock check, stock decrement, coupon use and the order itself commit together or not at all.
        await using var tx = await _db.Database.BeginTransactionAsync();

        // lock the products in a fixed order so two simultaneous orders cannot both take the last unit
        foreach (var productId in dto.Items.Select(i => i.ProductId).Distinct().OrderBy(x => x))
            await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Products\" WHERE \"Id\" = {productId} FOR UPDATE");

        var shippingConfig = await _db.ShippingConfigs.FirstOrDefaultAsync();

        // Calculate order totals from product data
        decimal subTotal = 0, taxTotal = 0;
        var orderItems = new List<OrderItem>();

        foreach (var itemDto in dto.Items)
        {
            var product = await _db.Products
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == itemDto.ProductId && p.IsActive);

            if (product == null)
                return ApiResponse<OrderDetailDto>.Fail($"Product {itemDto.ProductId} not found or inactive.");

            if (product.StockQuantity < itemDto.Quantity)
                return ApiResponse<OrderDetailDto>.Fail($"Insufficient stock for {product.Name}.");

            var unitPrice = product.DiscountPrice ?? product.Price;
            var discount = product.DiscountPrice.HasValue ? (product.Price - product.DiscountPrice.Value) * itemDto.Quantity : 0;
            var taxAmount = unitPrice * product.TaxPercentage / 100 * itemDto.Quantity;
            var totalPrice = (unitPrice * itemDto.Quantity) + taxAmount;

            subTotal += unitPrice * itemDto.Quantity;
            taxTotal += taxAmount;

            var primaryImage = product.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl
                ?? product.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.ImageUrl;

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                VariantId = itemDto.VariantId,
                ProductName = product.Name,
                ProductImageUrl = primaryImage,
                Quantity = itemDto.Quantity,
                UnitPrice = product.Price,
                DiscountAmount = discount,
                TaxPercentage = product.TaxPercentage,
                TaxAmount = taxAmount,
                TotalPrice = totalPrice
            });

            product.StockQuantity -= itemDto.Quantity;
            product.SoldCount += itemDto.Quantity;
        }

        // Apply coupon
        decimal discountAmount = 0;
        Guid? couponId = null;
        Coupon? coupon = null;

        if (!string.IsNullOrEmpty(dto.CouponCode))
        {
            coupon = await _db.Coupons.FirstOrDefaultAsync(c =>
                c.Code == dto.CouponCode.ToUpper() && c.IsActive &&
                (c.ExpiryDate == null || c.ExpiryDate > DateTime.UtcNow));

            if (coupon != null && (coupon.MinOrderAmount == null || subTotal >= coupon.MinOrderAmount))
            {
                discountAmount = coupon.DiscountType == DiscountType.Percentage
                    ? Math.Min(subTotal * coupon.DiscountValue / 100, coupon.MaxDiscountAmount ?? decimal.MaxValue)
                    : coupon.DiscountValue;

                coupon.UsedCount++;
                couponId = coupon.Id;
            }
        }

        var shipping = shippingConfig != null &&
                       shippingConfig.FreeShippingEnabled &&
                       subTotal >= shippingConfig.FreeShippingAbove
            ? 0m : (shippingConfig?.ShippingCharge ?? 0m);

        var total = subTotal + taxTotal + shipping - discountAmount;

        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(),
            UserId = dto.UserId,
            GuestEmail = dto.GuestEmail,
            GuestPhone = dto.GuestPhone,
            GuestName = dto.GuestName,
            PaymentMethod = dto.PaymentMethod,
            CouponId = couponId,
            CouponCode = coupon?.Code,
            Notes = dto.Notes,
            SubTotal = Math.Round(subTotal, 2),
            DiscountAmount = Math.Round(discountAmount, 2),
            ShippingCharge = Math.Round(shipping, 2),
            TaxAmount = Math.Round(taxTotal, 2),
            TotalAmount = Math.Round(total, 2),
            ShippingFullName = dto.ShippingAddress.FullName,
            ShippingPhone = dto.ShippingAddress.Phone,
            ShippingLine1 = dto.ShippingAddress.Line1,
            ShippingLine2 = dto.ShippingAddress.Line2,
            ShippingCity = dto.ShippingAddress.City,
            ShippingState = dto.ShippingAddress.State,
            ShippingPostalCode = dto.ShippingAddress.PostalCode,
            ShippingCountry = dto.ShippingAddress.Country,
            BillingFullName = dto.BillingAddress.FullName,
            BillingPhone = dto.BillingAddress.Phone,
            BillingLine1 = dto.BillingAddress.Line1,
            BillingLine2 = dto.BillingAddress.Line2,
            BillingCity = dto.BillingAddress.City,
            BillingState = dto.BillingAddress.State,
            BillingPostalCode = dto.BillingAddress.PostalCode,
            BillingCountry = dto.BillingAddress.Country,
            Items = orderItems
        };

        await _db.Orders.AddAsync(order);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var result = await GetByIdAsync(order.Id);

        // Cash on delivery is "placed" right now. Online orders are only confirmed (email + cart cleanup)
        // once the payment is verified, so an abandoned payment keeps the cart and sends no confirmation.
        if (dto.PaymentMethod == PaymentMethod.CashOnDelivery)
        {
            await _cartService.RemovePurchasedItemsAsync(dto.UserId, dto.SessionId,
                orderItems.Select(i => new PurchasedItem(i.ProductId, i.VariantId, i.Quantity)), order.Id);
            if (result.Data != null) await SendOrderConfirmationAsync(order, result.Data);
        }
        return result;
    }

    /// <summary>Order confirmation goes to the buyer's own account email (or the guest email) — never a fixed address.</summary>
    public async Task SendOrderConfirmationAsync(Order order, OrderDetailDto detail)
    {
        var user = order.UserId.HasValue ? await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId.Value) : null;
        var toEmail = user?.Email ?? order.GuestEmail;
        var name = user?.FirstName ?? order.GuestName ?? "Customer";
        _ = _emailService.SendOrderConfirmationAsync(toEmail ?? "", name, detail);
    }

    public async Task<ApiResponse<string>> UpdateStatusAsync(Guid id, UpdateOrderStatusDto dto)
    {
        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return ApiResponse<string>.NotFound("Order not found.");

        // cancelling has one routine (status + stock together, exactly once) whoever asks
        if (dto.Status == OrderStatus.Cancelled)
            return await CancelCoreAsync(id, dto.Notes, callerId: null, callerIsAdmin: true);

        var previousStatus = order.Status;
        var statusChanges = dto.Status != previousStatus;

        if (statusChanges && !OrderStatusRules.CanTransition(previousStatus, dto.Status))
            return ApiResponse<string>.Fail($"An order that is {previousStatus} cannot be changed to {dto.Status}.", 409);

        // while a courier shipment owns the order its shipped/delivered state and tracking number are not edited by hand
        if (await _shipmentGuard.HasOpenShipmentAsync(id) &&
            ((statusChanges && dto.Status is OrderStatus.Shipped or OrderStatus.Delivered) || dto.TrackingNumber != null))
            return ApiResponse<string>.Fail("This order has a courier shipment; its shipping status and tracking number are updated by the courier tracking.", 409);

        var now = DateTime.UtcNow;
        var setTracking = dto.TrackingNumber != null;
        var newTracking = dto.TrackingNumber;
        var setShipped = statusChanges && dto.Status == OrderStatus.Shipped;
        var setDelivered = statusChanges && dto.Status == OrderStatus.Delivered;
        var newStatus = dto.Status;

        // the update only applies if the order is still in the status we validated against
        var rows = await _db.Orders.Where(o => o.Id == id && o.Status == previousStatus)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, o => statusChanges ? newStatus : o.Status)
                .SetProperty(o => o.TrackingNumber, o => setTracking ? newTracking : o.TrackingNumber)
                .SetProperty(o => o.ShippedAt, o => setShipped ? now : o.ShippedAt)
                .SetProperty(o => o.DeliveredAt, o => setDelivered ? now : o.DeliveredAt)
                .SetProperty(o => o.UpdatedAt, now));
        if (rows == 0)
            return ApiResponse<string>.Fail("The order was changed by someone else. Reload it and try again.", 409);

        // Only send email when transitioning INTO Shipped/Delivered — not on duplicate status sets
        if (statusChanges && dto.Status is OrderStatus.Shipped or OrderStatus.Delivered)
        {
            var detailResult = await GetByIdAsync(id);
            if (detailResult.Data != null)
            {
                var user = order.UserId.HasValue ? await _db.Users.FindAsync(order.UserId.Value) : null;
                var toEmail = user?.Email ?? order.GuestEmail;
                var name = user?.FirstName ?? order.GuestName ?? "Customer";
                if (!string.IsNullOrEmpty(toEmail))
                {
                    if (dto.Status == OrderStatus.Shipped)
                        _ = _emailService.SendShippingUpdateAsync(toEmail, name, detailResult.Data);
                    else
                        _ = _emailService.SendDeliveryConfirmationAsync(toEmail, name, detailResult.Data);
                }
            }
        }

        return ApiResponse<string>.Ok("Order status updated.");
    }

    public async Task<ApiResponse<string>> CancelUnpaidOnlineOrderAsync(Guid orderId, Guid? callerId, bool anyOwner = false, string? reason = null)
    {
        var order = await _db.Orders.AsNoTracking().Include(o => o.Payments).FirstOrDefaultAsync(o => o.Id == orderId);
        if (order == null) return ApiResponse<string>.NotFound("Order not found.");
        if (!anyOwner && order.UserId != null && order.UserId != callerId) return ApiResponse<string>.NotFound("Order not found.");
        if (order.PaymentMethod != PaymentMethod.Razorpay) return ApiResponse<string>.Fail("Only an online-payment order can be closed this way.", 400);
        if (order.Status == OrderStatus.Cancelled) return ApiResponse<string>.Ok("Order is already cancelled.");
        if (order.PaymentStatus == PaymentStatus.Paid || order.Payments.Any(p => p.Status == PaymentStatus.Paid))
            return ApiResponse<string>.Fail("This order has already been paid.", 409);

        var result = await CancelCoreAsync(orderId, reason ?? "Online payment was not completed", order.UserId, callerIsAdmin: true, notify: false);
        if (!result.Success) return result;

        var now = DateTime.UtcNow;
        await _db.Orders.Where(o => o.Id == orderId && o.PaymentStatus == PaymentStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.PaymentStatus, PaymentStatus.Failed).SetProperty(o => o.UpdatedAt, now));
        await _db.Payments.Where(p => p.OrderId == orderId && p.Status == PaymentStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatus.Failed).SetProperty(p => p.UpdatedAt, now));
        return ApiResponse<string>.Ok("Payment cancelled. The order was not placed.");
    }

    public async Task<int> CancelAbandonedOnlineOrdersAsync(TimeSpan olderThan)
    {
        var cutoff = DateTime.UtcNow - olderThan;
        var ids = await _db.Orders
            .Where(o => o.PaymentMethod == PaymentMethod.Razorpay && o.PaymentStatus == PaymentStatus.Pending && o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
            .OrderBy(o => o.CreatedAt).Select(o => o.Id).Take(100).ToListAsync();
        var cancelled = 0;
        foreach (var id in ids)
            if ((await CancelUnpaidOnlineOrderAsync(id, null, anyOwner: true, reason: "Online payment was not completed in time")).Success) cancelled++;
        return cancelled;
    }

    /// <summary>A customer who starts a new checkout has no use for their own unpaid online orders from earlier: close them first.</summary>
    private async Task CancelEarlierUnpaidOnlineOrdersAsync(CreateOrderDto dto)
    {
        var now = DateTime.UtcNow;
        var recentEnoughToMatter = now.AddHours(-24);
        var settled = now.AddMinutes(-2);                 // a payment window opened a moment ago may still be in use in another tab
        var q = _db.Orders.Where(o => o.PaymentMethod == PaymentMethod.Razorpay && o.PaymentStatus == PaymentStatus.Pending && o.Status == OrderStatus.Pending
                                      && o.CreatedAt < settled && o.CreatedAt > recentEnoughToMatter);
        if (dto.UserId != null) q = q.Where(o => o.UserId == dto.UserId);
        else if (!string.IsNullOrWhiteSpace(dto.GuestEmail)) q = q.Where(o => o.UserId == null && o.GuestEmail == dto.GuestEmail);
        else return;

        foreach (var id in await q.Select(o => o.Id).Take(20).ToListAsync())
            await CancelUnpaidOnlineOrderAsync(id, null, anyOwner: true, reason: "Replaced by a newer checkout");
    }

    public Task<ApiResponse<string>> CancelAsync(Guid id, string? reason, Guid? callerId, bool callerIsAdmin) =>
        CancelCoreAsync(id, reason, callerId, callerIsAdmin);

    private async Task<ApiResponse<string>> CancelCoreAsync(Guid id, string? reason, Guid? callerId, bool callerIsAdmin, bool notify = true)
    {
        var order = await _db.Orders.AsNoTracking().Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null || !OrderAccess.CanAccess(order.UserId, callerId, callerIsAdmin))
            return ApiResponse<string>.NotFound("Order not found.");

        // asking twice is harmless and never touches stock again
        if (order.Status == OrderStatus.Cancelled) return ApiResponse<string>.Ok("Order is already cancelled.");

        if (!OrderStatusRules.CanTransition(order.Status, OrderStatus.Cancelled))
            return ApiResponse<string>.Fail($"An order that is {order.Status} cannot be cancelled.", 409);

        if (order.PaymentStatus == PaymentStatus.Paid && !callerIsAdmin)
            return ApiResponse<string>.Fail("This order has been paid. Please contact the store to cancel it.", 403);

        if (await _shipmentGuard.HasOpenShipmentAsync(id))
            return ApiResponse<string>.Fail("This order has a courier shipment. Cancel the shipment first.", 409);

        var now = DateTime.UtcNow;
        // a paid order is only flagged for refund review – no refund is made automatically
        var flagRefund = order.PaymentStatus == PaymentStatus.Paid && order.RefundStatus == RefundStatus.NotRequested;
        var requested = RefundStatus.Requested;

        await using var tx = await _db.Database.BeginTransactionAsync();

        // the status change only applies to an order that is still Pending/Confirmed, so of two simultaneous
        // cancellations exactly one wins and only the winner restores stock
        var rows = await _db.Orders
            .Where(o => o.Id == id && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.Confirmed))
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OrderStatus.Cancelled)
                .SetProperty(o => o.CancelledAt, now)
                .SetProperty(o => o.CancellationReason, reason)
                .SetProperty(o => o.RefundStatus, o => flagRefund ? requested : o.RefundStatus)
                .SetProperty(o => o.UpdatedAt, now));

        if (rows == 0)
        {
            await tx.RollbackAsync();
            var current = await _db.Orders.AsNoTracking().Where(o => o.Id == id).Select(o => o.Status).FirstAsync();
            return current == OrderStatus.Cancelled
                ? ApiResponse<string>.Ok("Order is already cancelled.")
                : ApiResponse<string>.Fail($"An order that is {current} cannot be cancelled.", 409);
        }

        foreach (var line in order.Items.GroupBy(i => i.ProductId).Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) }))
        {
            var qty = line.Qty;
            await _db.Products.Where(p => p.Id == line.ProductId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.StockQuantity, p => p.StockQuantity + qty)
                    .SetProperty(p => p.SoldCount, p => p.SoldCount > qty ? p.SoldCount - qty : 0)
                    .SetProperty(p => p.UpdatedAt, now));
        }

        // the order is cancelled, so its dispatch workflow (approved / failed / needs attention) is closed: nothing will be shipped
        await _db.OrderFulfilments.Where(f => f.OrderId == id && f.State != FulfilmentStates.Completed && f.State != FulfilmentStates.Rejected)
            .ExecuteUpdateAsync(f => f.SetProperty(x => x.State, FulfilmentStates.Completed).SetProperty(x => x.LeaseUntil, (DateTime?)null)
                .SetProperty(x => x.AttentionReason, (string?)null).SetProperty(x => x.LastError, "Order was cancelled before dispatch.").SetProperty(x => x.UpdatedAt, now));

        await tx.CommitAsync();

        var cancelDetail = notify ? await GetByIdAsync(id) : ApiResponse<OrderDetailDto>.Fail("not needed");
        if (cancelDetail.Data != null)
        {
            var user = order.UserId.HasValue ? await _db.Users.FindAsync(order.UserId.Value) : null;
            var toEmail = user?.Email ?? order.GuestEmail;
            var name = user?.FirstName ?? order.GuestName ?? "Customer";
            if (!string.IsNullOrEmpty(toEmail))
                _ = _emailService.SendOrderCancelledAsync(toEmail, name, cancelDetail.Data);
        }

        return ApiResponse<string>.Ok("Order cancelled.");
    }

    public async Task<ApiResponse<byte[]>> GenerateInvoiceAsync(Guid id, Guid? callerId, bool callerIsAdmin)
    {
        // Basic invoice as plain bytes; in production integrate a PDF library (e.g. QuestPDF)
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null || !OrderAccess.CanAccess(order.UserId, callerId, callerIsAdmin))
            return ApiResponse<byte[]>.NotFound("Order not found.");

        var content = $"INVOICE\nOrder: {order.OrderNumber}\nTotal: {order.TotalAmount:C}\nDate: {order.CreatedAt:dd-MM-yyyy}";
        return ApiResponse<byte[]>.Ok(System.Text.Encoding.UTF8.GetBytes(content));
    }

    public async Task<ApiResponse<DashboardOrderStatsDto>> GetStatsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var orders = await _db.Orders.ToListAsync();

        return ApiResponse<DashboardOrderStatsDto>.Ok(new DashboardOrderStatsDto
        {
            Total = orders.Count,
            Pending = orders.Count(o => o.Status == OrderStatus.Pending),
            Confirmed = orders.Count(o => o.Status == OrderStatus.Confirmed),
            Shipped = orders.Count(o => o.Status == OrderStatus.Shipped),
            Delivered = orders.Count(o => o.Status == OrderStatus.Delivered),
            Cancelled = orders.Count(o => o.Status == OrderStatus.Cancelled),
            Returned = orders.Count(o => o.Status == OrderStatus.Returned),
            TotalRevenue = orders.Where(o => o.PaymentStatus == PaymentStatus.Paid).Sum(o => o.TotalAmount),
            TodayRevenue = orders.Where(o => o.CreatedAt.Date == today && o.PaymentStatus == PaymentStatus.Paid).Sum(o => o.TotalAmount),
            TodayOrders = orders.Count(o => o.CreatedAt.Date == today)
        });
    }

    protected virtual string GenerateOrderNumber() =>
        $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
}
