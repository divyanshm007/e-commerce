using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Payments;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace EcommerceApp.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IConfiguration _config;
    private readonly IEmailService _emailService;
    private readonly IOrderService _orderService;
    private readonly IRazorpayConfigService _rzpConfig;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ICartService _cartService;

    private const string RazorpayApi = "https://api.razorpay.com/v1";

    public PaymentService(AppDbContext db, IMapper mapper, IConfiguration config, IEmailService emailService, IOrderService orderService,
        IRazorpayConfigService rzpConfig, IHttpClientFactory httpFactory, ICartService cartService)
    {
        _cartService = cartService;
        _rzpConfig = rzpConfig;
        _httpFactory = httpFactory;
        _db = db;
        _mapper = mapper;
        _config = config;
        _emailService = emailService;
        _orderService = orderService;
    }

    private IQueryable<Payment> BaseQuery() =>
        _db.Payments
            .Include(p => p.Order).ThenInclude(o => o.User)
            .AsNoTracking();

    public async Task<ApiResponse<RazorpayOrderDto>> CreateRazorpayOrderAsync(Guid orderId, Guid? callerId, bool callerIsAdmin)
    {
        var order = await _db.Orders.FindAsync(orderId);
        if (order == null) return ApiResponse<RazorpayOrderDto>.NotFound("Order not found.");

        // a user's order can only be paid by that user (guest orders are identified by their unguessable id)
        if (order.UserId.HasValue && order.UserId != callerId && !callerIsAdmin)
            return ApiResponse<RazorpayOrderDto>.Fail("You do not have access to this order.", 403);
        if (order.PaymentStatus == PaymentStatus.Paid)
            return ApiResponse<RazorpayOrderDto>.Fail("This order has already been paid.");

        // keys follow the test/live switch in the admin panel
        RazorpayCredentials? creds;
        try { creds = await _rzpConfig.GetActiveCredentialsAsync(); }
        catch (RazorpayConfigurationException)
        {
            // a corrupt mode setting: no payment is started until an admin repairs it (nothing is guessed)
            return ApiResponse<RazorpayOrderDto>.Fail("Online payment is temporarily unavailable.", 503);
        }
        if (creds == null)
            return ApiResponse<RazorpayOrderDto>.Fail("Online payment is not configured for the active mode.", 503);

        var amountPaise = (long)Math.Round(order.TotalAmount * 100m, MidpointRounding.AwayFromZero);
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{RazorpayApi}/orders")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { amount = amountPaise, currency = "INR", receipt = order.OrderNumber }),
                Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = BasicAuth(creds);

        using var res = await _httpFactory.CreateClient().SendAsync(req);
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            return ApiResponse<RazorpayOrderDto>.Fail($"Could not start the payment: {RazorpayError(body)}", 502);

        var razorpayOrderId = JsonDocument.Parse(body).RootElement.GetProperty("id").GetString()!;

        order.RazorpayOrderId = razorpayOrderId;
        await _db.SaveChangesAsync();

        return ApiResponse<RazorpayOrderDto>.Ok(new RazorpayOrderDto
        {
            RazorpayOrderId = razorpayOrderId,
            Amount = order.TotalAmount,
            Currency = "INR",
            Key = creds.KeyId,
            Mode = creds.Mode,
            OrderId = orderId
        });
    }

    public async Task<ApiResponse<string>> VerifyPaymentAsync(VerifyPaymentDto dto, string? sessionId)
    {
        var order = await _db.Orders.FindAsync(dto.OrderId);
        if (order == null) return ApiResponse<string>.NotFound("Order not found.");

        // the payment must belong to the Razorpay order that was created for THIS order
        if (order.RazorpayOrderId != dto.RazorpayOrderId)
            return ApiResponse<string>.Fail("Payment does not match this order.");

        // Idempotency guard — if already paid, succeed silently without sending a duplicate email
        if (order.PaymentStatus == PaymentStatus.Paid)
            return ApiResponse<string>.Ok("Payment already verified.");

        // The order exists only in the account (test or live) that created it, so ask Razorpay which one.
        // This keeps verification correct even if the admin flips the switch while a payment is in flight,
        // and stops a test-mode signature from being accepted in live mode.
        var creds = await ResolveOrderCredentialsAsync(dto.RazorpayOrderId, order.TotalAmount);
        if (creds == null)
            return ApiResponse<string>.Fail("Payment order could not be confirmed with Razorpay.");

        // HMAC-SHA256 signature verification
        var payload = $"{dto.RazorpayOrderId}|{dto.RazorpayPaymentId}";
        var expectedSig = ComputeHmac(payload, creds.KeySecret);

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSig), Encoding.UTF8.GetBytes(dto.RazorpaySignature ?? "")))
            return ApiResponse<string>.Fail("Invalid payment signature.");

        order.RazorpayPaymentId = dto.RazorpayPaymentId;
        order.RazorpaySignature = dto.RazorpaySignature;
        order.PaymentStatus = PaymentStatus.Paid;
        order.Status = OrderStatus.Confirmed;

        var payment = new Payment
        {
            OrderId = order.Id,
            RazorpayOrderId = dto.RazorpayOrderId,
            RazorpayPaymentId = dto.RazorpayPaymentId,
            Method = PaymentMethod.Razorpay,
            Status = PaymentStatus.Paid,
            Amount = order.TotalAmount,
            PaidAt = DateTime.UtcNow
        };

        await _db.Payments.AddAsync(payment);
        await _db.SaveChangesAsync();

        // Payment succeeded: clear only what was bought from the buyer's own cart, then send the emails.
        var purchased = await _db.OrderItems.AsNoTracking()
            .Where(i => i.OrderId == order.Id)
            .Select(i => new PurchasedItem(i.ProductId, i.VariantId, i.Quantity))
            .ToListAsync();
        await _cartService.RemovePurchasedItemsAsync(order.UserId, sessionId, purchased, order.Id);

        var orderDetail = await _orderService.GetByIdAsync(order.Id);
        if (orderDetail.Data != null)
        {
            var user = order.UserId.HasValue ? await _db.Users.FindAsync(order.UserId.Value) : null;
            var toEmail = user?.Email ?? order.GuestEmail;
            var name = user?.FirstName ?? order.GuestName ?? "Customer";
            await _orderService.SendOrderConfirmationAsync(order, orderDetail.Data);
            _ = _emailService.SendPaymentConfirmationAsync(toEmail ?? "", name, orderDetail.Data);
        }

        return ApiResponse<string>.Ok("Payment verified successfully.");
    }

    public async Task<ApiResponse<string>> ProcessWebhookAsync(string payload, string signature)
    {
        var secret = _config["Razorpay:WebhookSecret"] ?? "";
        var expected = ComputeHmac(payload, secret);

        if (expected != signature)
            return ApiResponse<string>.Fail("Invalid webhook signature.", 400);

        // Parse webhook event and update payment status accordingly
        return ApiResponse<string>.Ok("Webhook processed.");
    }

    public async Task<ApiResponse<string>> InitiateRefundAsync(Guid orderId, decimal? amount)
    {
        var order = await _db.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null) return ApiResponse<string>.NotFound("Order not found.");
        if (order.PaymentStatus != PaymentStatus.Paid)
            return ApiResponse<string>.Fail("Order has not been paid.");

        var payment = order.Payments.FirstOrDefault(p => p.Status == PaymentStatus.Paid);
        if (payment == null) return ApiResponse<string>.Fail("No successful payment found for this order.");

        // In production, call Razorpay refund API
        var refundAmount = amount ?? order.TotalAmount;
        payment.RefundStatus = RefundStatus.Processing;
        payment.RefundAmount = refundAmount;
        order.RefundStatus = RefundStatus.Processing;

        await _db.SaveChangesAsync();
        return ApiResponse<string>.Ok("Refund initiated successfully.");
    }

    public async Task<ApiResponse<PagedResult<PaymentListDto>>> GetAllAsync(PaginationParams paging)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(paging.Search))
            query = query.Where(p =>
                (p.RazorpayPaymentId != null && p.RazorpayPaymentId.Contains(paging.Search)) ||
                p.Order.OrderNumber.Contains(paging.Search));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((paging.Page - 1) * paging.PageSize)
            .Take(paging.PageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<PaymentListDto>>.Ok(new PagedResult<PaymentListDto>
        {
            Items = _mapper.Map<List<PaymentListDto>>(items),
            TotalCount = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        });
    }

    public async Task<ApiResponse<PaymentDetailDto>> GetByOrderIdAsync(Guid orderId, Guid? callerId, bool callerIsAdmin)
    {
        var payment = await BaseQuery().FirstOrDefaultAsync(p => p.OrderId == orderId);
        if (payment == null) return ApiResponse<PaymentDetailDto>.NotFound("Payment not found.");
        if (payment.Order.UserId.HasValue && payment.Order.UserId != callerId && !callerIsAdmin)
            return ApiResponse<PaymentDetailDto>.Fail("You do not have access to this payment.", 403);
        return ApiResponse<PaymentDetailDto>.Ok(_mapper.Map<PaymentDetailDto>(payment));
    }

    private static AuthenticationHeaderValue BasicAuth(RazorpayCredentials c) =>
        new("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{c.KeyId}:{c.KeySecret}")));

    private static string RazorpayError(string body)
    {
        try { return JsonDocument.Parse(body).RootElement.GetProperty("error").GetProperty("description").GetString() ?? "unknown error"; }
        catch { return "unknown error"; }
    }

    /// <summary>Finds the key set whose Razorpay account owns this order, and checks the amount matches.</summary>
    private async Task<RazorpayCredentials?> ResolveOrderCredentialsAsync(string razorpayOrderId, decimal expectedTotal)
    {
        if (string.IsNullOrWhiteSpace(razorpayOrderId)) return null;
        // verification of a payment that already happened must still work when the mode setting is corrupt: both key sets are
        // then tried, and a key set is only accepted if its own Razorpay account owns this order id (unchanged check below)
        string active;
        try { active = await _rzpConfig.GetModeAsync(); }
        catch (RazorpayConfigurationException) { active = RazorpayConfigService.Test; }
        var other = active == RazorpayConfigService.Live ? RazorpayConfigService.Test : RazorpayConfigService.Live;

        foreach (var mode in new[] { active, other })
        {
            var creds = _rzpConfig.GetCredentials(mode);
            if (creds == null) continue;

            using var req = new HttpRequestMessage(HttpMethod.Get, $"{RazorpayApi}/orders/{Uri.EscapeDataString(razorpayOrderId)}");
            req.Headers.Authorization = BasicAuth(creds);
            using var res = await _httpFactory.CreateClient().SendAsync(req);
            if (!res.IsSuccessStatusCode) continue;

            var amount = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement.GetProperty("amount").GetInt64();
            var expected = (long)Math.Round(expectedTotal * 100m, MidpointRounding.AwayFromZero);
            return amount == expected ? creds : null;
        }
        return null;
    }

    private static string ComputeHmac(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
