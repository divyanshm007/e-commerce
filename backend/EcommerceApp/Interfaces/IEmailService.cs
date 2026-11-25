using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Domain.Entities;

namespace EcommerceApp.Application.Interfaces;

public interface IEmailService
{
    // ── Account ──────────────────────────────────────────────────
    Task SendWelcomeAsync(string toEmail, string firstName);
    Task SendPasswordResetOtpAsync(string toEmail, string firstName, string otp, int validMinutes);
    Task SendPasswordResetConfirmationAsync(string toEmail, string firstName);

    // ── Forms ────────────────────────────────────────────────────
    Task SendContactFormToAdminAsync(string name, string email, string phone, string message);
    Task SendContactConfirmationAsync(string toEmail, string name, string subject, string message);
    Task SendConsultationConfirmationAsync(string toEmail, string name, string? preferredDate, string? preferredTime, string concern);
    Task SendConsultationNotifyAdminAsync(string name, string email, string phone, string concern, string? preferredDate, string? preferredTime, string? doshaType);
    Task SendNewsletterWelcomeAsync(string toEmail);

    // ── Shop ─────────────────────────────────────────────────────
    Task SendOrderConfirmationAsync(string toEmail, string customerName, OrderDetailDto order);
    Task SendPaymentConfirmationAsync(string toEmail, string customerName, OrderDetailDto order);
    Task SendShippingUpdateAsync(string toEmail, string customerName, OrderDetailDto order);
    Task SendDeliveryConfirmationAsync(string toEmail, string customerName, OrderDetailDto order);
    Task SendOrderCancelledAsync(string toEmail, string customerName, OrderDetailDto order);

    /// <summary>
    /// Sends one shipment-progress e-mail (created / in transit / out for delivery / delivered). Unlike the other methods it REPORTS whether the
    /// message was handed to the mail server, so the caller records "sent" only when it really was and a failed send can be retried.
    /// </summary>
    // ── return and cancellation requests (nothing happens until an administrator approves) ──
    Task SendReturnRequestedAsync(string toEmail, string customerName, string orderNumber, string reason);
    Task SendReturnRequestedAdminAsync(string orderNumber, string customerName, string customerEmail, string reason, string? description);
    Task SendReturnDecisionAsync(string toEmail, string customerName, string orderNumber, string status, string? adminNotes);
    Task SendCancelRequestedAsync(string toEmail, string customerName, string orderNumber, string reason);
    Task SendCancelRequestedAdminAsync(string orderNumber, string customerName, string customerEmail, string reason, bool wasDispatched);
    Task SendCancelDecisionAsync(string toEmail, string customerName, string orderNumber, bool approved, string? adminNotes);

    Task<bool> TrySendShipmentEmailAsync(string toEmail, string customerName, EcommerceApp.Application.DTOs.Shipments.ShipmentEmailInfo info);

    // ── Reviews ──────────────────────────────────────────────────
    Task SendReviewSubmittedAsync(string toEmail, string customerName, string productName);
    Task SendReviewPendingAdminAsync(string customerName, string customerEmail, string productName, string comment);
    Task SendReviewApprovedAsync(string toEmail, string customerName, string productName);
    Task SendReviewRejectedAsync(string toEmail, string customerName, string productName);
}
