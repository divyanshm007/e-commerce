using System.Net;
using System.Net.Mail;
using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EcommerceApp.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly string? _adminEmail;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
        _adminEmail = _config["Email:AdminEmail"];
        if (string.IsNullOrWhiteSpace(_adminEmail))
            _logger.LogWarning("Email:AdminEmail is not configured - admin notification emails will be skipped.");
    }

    private async Task<bool> SendAsync(string toEmail, string subject, string htmlBody, bool copyAdmin = true)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            _logger.LogWarning("Email skipped (no recipient): {Subject}", subject);
            return false;
        }

        var host     = _config["Email:SmtpHost"]     ?? "smtp.gmail.com";
        var port     = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var username = _config["Email:Username"]     ?? "";
        // Gmail app passwords are entered with spaces in appsettings — strip them for NetworkCredential
        var password = (_config["Email:Password"] ?? "").Replace(" ", "");
        var fromName = _config["Email:FromName"]     ?? "Sidham Pharmacy";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError("Email NOT sent to {Email}: SMTP is not configured (set Email:Username and Email:Password)", toEmail);
            return false;
        }

        _logger.LogInformation("Sending email to {Email}: {Subject}", toEmail, subject);

        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(username, password),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            using var message = new MailMessage
            {
                From = new MailAddress(username, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);
            // the store owner gets a hidden copy of every customer e-mail (not of password-reset codes)
            if (copyAdmin && !string.IsNullOrWhiteSpace(_adminEmail) && !string.Equals(_adminEmail.Trim(), toEmail.Trim(), StringComparison.OrdinalIgnoreCase))
                message.Bcc.Add(_adminEmail.Trim());

            await client.SendMailAsync(message);
            _logger.LogInformation("Email SENT to {Email}: {Subject}", toEmail, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email FAILED to {Email}: {Subject}", toEmail, subject);
            // Fire-and-forget: don't throw — email failure must never break the caller
            return false;
        }
    }

    // ── Account ──────────────────────────────────────────────────────────────

    public Task SendWelcomeAsync(string toEmail, string firstName) =>
        SendAsync(toEmail, "Welcome to Sidham Pharmacy", EmailTemplates.Welcome(firstName));

    public Task SendPasswordResetOtpAsync(string toEmail, string firstName, string otp, int validMinutes) =>
        SendAsync(toEmail, "Your Sidham Pharmacy password reset code", EmailTemplates.PasswordResetOtp(firstName, otp, validMinutes), copyAdmin: false);

    public Task SendPasswordResetConfirmationAsync(string toEmail, string firstName) =>
        SendAsync(toEmail, "Password Changed Successfully ✅", EmailTemplates.PasswordResetConfirmation(firstName), copyAdmin: false);

    // ── Forms ────────────────────────────────────────────────────────────────

    public Task SendContactFormToAdminAsync(string name, string email, string phone, string message) =>
        SendAsync(_adminEmail ?? "", $"New Contact Message from {name}", EmailTemplates.ContactFormAdmin(name, email, phone, message));

    public Task SendContactConfirmationAsync(string toEmail, string name, string subject, string message) =>
        SendAsync(toEmail, "We've Received Your Message — Sidham Pharmacy", EmailTemplates.ContactFormConfirmation(name, subject, message));

    public Task SendConsultationConfirmationAsync(string toEmail, string name, string? preferredDate, string? preferredTime, string concern) =>
        SendAsync(toEmail, "Consultation Booked — Ganpati Herbal Ayurveda ✅", EmailTemplates.ConsultationConfirmation(name, preferredDate, preferredTime, concern));

    public Task SendConsultationNotifyAdminAsync(string name, string email, string phone, string concern, string? preferredDate, string? preferredTime, string? doshaType) =>
        SendAsync(_adminEmail ?? "", $"New Consultation Request — {name}", EmailTemplates.ConsultationAdmin(name, email, phone, concern, preferredDate, preferredTime, doshaType));

    public Task SendNewsletterWelcomeAsync(string toEmail) =>
        SendAsync(toEmail, "Welcome to Sidham Pharmacy Newsletter", EmailTemplates.NewsletterWelcome());

    // ── Shop ─────────────────────────────────────────────────────────────────

    public Task SendOrderConfirmationAsync(string toEmail, string customerName, OrderDetailDto order) =>
        SendAsync(toEmail, $"Order Confirmed — #{order.OrderNumber} ✅", EmailTemplates.OrderConfirmation(customerName, order));

    public Task SendPaymentConfirmationAsync(string toEmail, string customerName, OrderDetailDto order) =>
        SendAsync(toEmail, $"Payment Received — #{order.OrderNumber} 💚", EmailTemplates.PaymentConfirmation(customerName, order));

    public Task SendShippingUpdateAsync(string toEmail, string customerName, OrderDetailDto order) =>
        SendAsync(toEmail, $"Your Order is on the Way! 🚚 — #{order.OrderNumber}", EmailTemplates.ShippingUpdate(customerName, order));

    public Task SendDeliveryConfirmationAsync(string toEmail, string customerName, OrderDetailDto order) =>
        SendAsync(toEmail, $"Order Delivered! 🎉 — #{order.OrderNumber}", EmailTemplates.DeliveryConfirmation(customerName, order));

    // The customer copy of these mails is not also BCC'd to the admin: the admin gets its own, actionable, mail.
    public virtual Task SendReturnRequestedAsync(string toEmail, string customerName, string orderNumber, string reason) =>
        SendAsync(toEmail, $"Return Request Received — #{orderNumber}", EmailTemplates.ReturnRequested(customerName, orderNumber, reason), copyAdmin: false);

    public virtual Task SendReturnRequestedAdminAsync(string orderNumber, string customerName, string customerEmail, string reason, string? description) =>
        SendAsync(_adminEmail ?? "", $"Return Request — #{orderNumber}", EmailTemplates.ReturnRequestedAdmin(orderNumber, customerName, customerEmail, reason, description), copyAdmin: false);

    public virtual Task SendReturnDecisionAsync(string toEmail, string customerName, string orderNumber, string status, string? adminNotes) =>
        SendAsync(toEmail, $"Return Request {status} — #{orderNumber}", EmailTemplates.ReturnDecision(customerName, orderNumber, status, adminNotes));

    public virtual Task SendCancelRequestedAsync(string toEmail, string customerName, string orderNumber, string reason) =>
        SendAsync(toEmail, $"Cancellation Request Received — #{orderNumber}", EmailTemplates.CancelRequested(customerName, orderNumber, reason), copyAdmin: false);

    public virtual Task SendCancelRequestedAdminAsync(string orderNumber, string customerName, string customerEmail, string reason, bool wasDispatched) =>
        SendAsync(_adminEmail ?? "", $"Cancellation Request — #{orderNumber}", EmailTemplates.CancelRequestedAdmin(orderNumber, customerName, customerEmail, reason, wasDispatched), copyAdmin: false);

    public virtual Task SendCancelDecisionAsync(string toEmail, string customerName, string orderNumber, bool approved, string? adminNotes) =>
        SendAsync(toEmail, approved ? $"Order Cancelled — #{orderNumber}" : $"Cancellation Request Declined — #{orderNumber}",
            EmailTemplates.CancelDecision(customerName, orderNumber, approved, adminNotes));

    public virtual Task<bool> TrySendShipmentEmailAsync(string toEmail, string customerName, EcommerceApp.Application.DTOs.Shipments.ShipmentEmailInfo info)
    {
        var subject = info.Category switch
        {
            "CREATED" => $"Your Order is Being Shipped 📦 — #{info.OrderNumber}",
            "IN_TRANSIT" => $"Your Order is in Transit 🚚 — #{info.OrderNumber}",
            "OUT_FOR_DELIVERY" => $"Out for Delivery Today 🛵 — #{info.OrderNumber}",
            "DELIVERED" => $"Order Delivered! 🎉 — #{info.OrderNumber}",
            _ => null
        };
        return subject == null ? Task.FromResult(false) : SendAsync(toEmail, subject, EmailTemplates.ShipmentProgress(customerName, info));
    }

    public Task SendOrderCancelledAsync(string toEmail, string customerName, OrderDetailDto order) =>
        SendAsync(toEmail, $"Order Cancelled — #{order.OrderNumber}", EmailTemplates.OrderCancelled(customerName, order));

    // ── Reviews ──────────────────────────────────────────────────────────────

    public Task SendReviewSubmittedAsync(string toEmail, string customerName, string productName) =>
        SendAsync(toEmail, "Your Review Has Been Received ✅", EmailTemplates.ReviewSubmitted(customerName, productName));

    public Task SendReviewPendingAdminAsync(string customerName, string customerEmail, string productName, string comment) =>
        SendAsync(_adminEmail ?? "", $"New Review Pending: {productName}", EmailTemplates.ReviewPendingAdmin(customerName, customerEmail, productName, comment));

    public Task SendReviewApprovedAsync(string toEmail, string customerName, string productName) =>
        SendAsync(toEmail, $"Your Review for {productName} is Live", EmailTemplates.ReviewApproved(customerName, productName));

    public Task SendReviewRejectedAsync(string toEmail, string customerName, string productName) =>
        SendAsync(toEmail, "Update on Your Review — Sidham Pharmacy", EmailTemplates.ReviewRejected(customerName, productName));
}
