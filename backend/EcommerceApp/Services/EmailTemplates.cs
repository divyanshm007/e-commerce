using System.Text.Encodings.Web;
using EcommerceApp.Application.DTOs.Orders;

namespace EcommerceApp.Infrastructure.Services;

public static class EmailTemplates
{
    private const string Green = "#166534";
    private const string DarkGreen = "#052e16";
    private const string Gold = "#d97706";
    private const string LightGreen = "#f0fdf4";
    private const string TextMain = "#1e293b";
    private const string TextMuted = "#64748b";
    private const string Border = "#e2e8f0";

    // ── Master layout ──────────────────────────────────────────────
    private static string Wrap(string title, string body) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>{title}</title>
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,{DarkGreen} 0%,{Green} 100%);padding:32px 40px;text-align:center;">
                    <div style="margin-bottom:16px;">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
                        <circle cx="24" cy="24" r="24" fill="rgba(255,255,255,0.15)"/>
                        <path d="M24 10C24 10 14 16 14 24C14 29.5 18.5 34 24 34C29.5 34 34 29.5 34 24C34 16 24 10 24 10Z" fill="rgba(255,255,255,0.9)"/>
                        <path d="M24 14C24 14 17 19 17 25C17 28.9 20.1 32 24 32C27.9 32 31 28.9 31 25C31 19 24 14 24 14Z" fill="#166534"/>
                        <path d="M24 18C24 18 20 22 20 26C20 28.2 21.8 30 24 30C26.2 30 28 28.2 28 26C28 22 24 18 24 18Z" fill="rgba(255,255,255,0.85)"/>
                        <line x1="24" y1="26" x2="24" y2="38" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <div style="display:inline-block;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px;padding:6px 18px;margin-bottom:14px;">
                      <span style="color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">&#9670; SIDHAM PHARMACY &#9670;</span>
                    </div>
                    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.3px;">{title}</h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr><td style="padding:40px;">{body}</td></tr>

                <!-- Footer -->
                <tr>
                  <td style="background:{LightGreen};padding:24px 40px;border-top:1px solid {Border};text-align:center;">
                    <p style="margin:0 0 8px;font-size:13px;color:{Green};font-weight:700;">Sidham Pharmacy — Where Nature Heals Naturally</p>
                    <p style="margin:0 0 4px;font-size:12px;color:{TextMuted};">Phalsanda Jattan, Kurukshetra, Haryana, India</p>
                    <p style="margin:0;font-size:12px;color:{TextMuted};">
                      <a href="mailto:sidhampharmacy@gmail.com" style="color:{Green};text-decoration:none;">sidhampharmacy@gmail.com</a>
                      &nbsp;|&nbsp;+91 8570031091
                    </p>
                    <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">You're receiving this because you interacted with Sidham Pharmacy.</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string Btn(string url, string label) =>
        $"""<a href="{url}" style="display:inline-block;background:linear-gradient(135deg,{Green},{DarkGreen});color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;margin:20px 0;">{label}</a>""";

    private static string InfoRow(string label, string value) =>
        $"""<tr><td style="padding:10px 0;border-bottom:1px solid {Border};font-size:14px;color:{TextMuted};width:40%;">{label}</td><td style="padding:10px 0;border-bottom:1px solid {Border};font-size:14px;color:{TextMain};font-weight:600;">{value}</td></tr>""";

    private static string Badge(string text, string bg, string color) =>
        $"""<span style="display:inline-block;background:{bg};color:{color};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">{text}</span>""";

    private static string Para(string text) =>
        $"""<p style="margin:0 0 16px;font-size:15px;color:{TextMuted};line-height:1.7;">{text}</p>""";

    private static string H2(string text) =>
        $"""<h2 style="margin:0 0 20px;font-size:20px;font-weight:800;color:{TextMain};">{text}</h2>""";

    private static string Alert(string icon, string text, string bg = "#f0fdf4", string border = "#bbf7d0") =>
        $"""<div style="background:{bg};border:1px solid {border};border-radius:10px;padding:16px 20px;margin:20px 0;font-size:14px;color:{TextMain};">{icon}&nbsp;{text}</div>""";

    // ── Order items table ──────────────────────────────────────────
    private static string OrderItemsTable(OrderDetailDto order)
    {
        var rows = string.Join("", order.Items.Select(i =>
            $"""
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid {Border};">
                <span style="font-size:14px;font-weight:600;color:{TextMain};">{i.ProductName}</span>
                {(i.VariantInfo != null ? $"<br/><span style='font-size:12px;color:{TextMuted};'>{i.VariantInfo}</span>" : "")}
              </td>
              <td style="padding:12px 0;border-bottom:1px solid {Border};text-align:center;font-size:14px;color:{TextMuted};">×{i.Quantity}</td>
              <td style="padding:12px 0;border-bottom:1px solid {Border};text-align:right;font-size:14px;font-weight:600;color:{TextMain};">₹{i.TotalPrice:F0}</td>
            </tr>
            """));

        var discountRow = order.DiscountAmount > 0
            ? $"""<tr><td style="padding:8px 0;font-size:13px;color:{TextMuted};">Discount{(order.CouponCode != null ? $" ({order.CouponCode})" : "")}</td><td></td><td style="padding:8px 0;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">−₹{order.DiscountAmount:F0}</td></tr>"""
            : "";

        var shippingRow = order.ShippingCharge > 0
            ? $"""<tr><td style="padding:8px 0;font-size:13px;color:{TextMuted};">Shipping</td><td></td><td style="padding:8px 0;text-align:right;font-size:13px;color:{TextMain};">₹{order.ShippingCharge:F0}</td></tr>"""
            : $"""<tr><td style="padding:8px 0;font-size:13px;color:{TextMuted};">Shipping</td><td></td><td style="padding:8px 0;text-align:right;font-size:13px;color:#16a34a;font-weight:600;">FREE</td></tr>""";

        return $"""
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {Border};border-radius:12px;overflow:hidden;margin:20px 0;">
              <thead>
                <tr style="background:{LightGreen};">
                  <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:{Green};text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                  <th style="padding:12px 16px;text-align:center;font-size:12px;font-weight:700;color:{Green};text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                  <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:700;color:{Green};text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                </tr>
              </thead>
              <tbody style="padding:0 16px;">
                {rows}
                {discountRow}
                {shippingRow}
                <tr>
                  <td colspan="2" style="padding:14px 0 0;font-size:16px;font-weight:800;color:{DarkGreen};">Grand Total</td>
                  <td style="padding:14px 0 0;text-align:right;font-size:20px;font-weight:900;color:{Green};">₹{order.TotalAmount:F0}</td>
                </tr>
              </tbody>
            </table>
            """;
    }

    private static string ShippingAddressBlock(OrderDetailDto order) =>
        $"""
        <div style="background:{LightGreen};border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:{Green};text-transform:uppercase;letter-spacing:1px;">📦 Delivery Address</p>
          <p style="margin:0;font-size:14px;color:{TextMain};line-height:1.7;">
            <strong>{order.ShippingAddress?.FullName}</strong><br/>
            {order.ShippingAddress?.Line1}{(order.ShippingAddress?.Line2 != null ? ", " + order.ShippingAddress.Line2 : "")}<br/>
            {order.ShippingAddress?.City}, {order.ShippingAddress?.State} – {order.ShippingAddress?.PostalCode}<br/>
            📞 {order.ShippingAddress?.Phone}
          </p>
        </div>
        """;

    // ════════════════════════════════════════════════════════════════
    // ACCOUNT TEMPLATES
    // ════════════════════════════════════════════════════════════════

    public static string Welcome(string firstName) => Wrap("Welcome to Sidham Pharmacy", $"""
        {H2($"Namaste, {firstName}! 🙏")}
        {Para("Thank you for joining the Sidham Pharmacy family. You're now part of a community dedicated to authentic Ayurvedic wellness, rooted in the ancient traditions of Kurukshetra, Haryana.")}
        {Para("With your new account you can:")}
        <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;color:{TextMuted};line-height:2;">
          <li>Shop 200+ authentic Ayurvedic products</li>
          <li>Track your orders in real time</li>
          <li>Save your delivery addresses</li>
          <li>Access exclusive offers and coupons</li>
        </ul>
        {Alert("&#9670;", "All our products are manufactured under GMP and Ministry of AYUSH guidelines.")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Shop Ayurvedic Products")}</div>
        {Para("If you have any questions, our team is always here to help.")}
        """);

    public static string PasswordResetOtp(string firstName, string otp, int validMinutes) => Wrap("Password Reset Code", $"""
        {H2($"Hi {firstName},")}
        {Para("Use the code below to reset your Sidham Pharmacy password.")}
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 28px;font-size:32px;font-weight:800;letter-spacing:10px;color:{Green};">{otp}</span>
        </div>
        {Alert("⏱️", $"This code expires in <strong>{validMinutes} minutes</strong> and can only be used once.", "#fffbeb", "#fde68a")}
        {Para("If you didn't request this, you can safely ignore this email — your password will not change. Never share this code with anyone.")}
        """);

    public static string PasswordResetConfirmation(string firstName) => Wrap("Password Changed Successfully ✅", $"""
        {H2($"Hi {firstName},")}
        {Alert("✅", "Your Sidham Pharmacy account password has been changed successfully.", "#f0fdf4", "#bbf7d0")}
        {Para("If you made this change, no further action is needed.")}
        {Para("If you did <strong>not</strong> make this change, please contact us immediately at <a href='mailto:sidhampharmacy@gmail.com' style='color:{Green};'>sidhampharmacy@gmail.com</a> or call +91 8570031091.")}
        """);

    // ════════════════════════════════════════════════════════════════
    // FORMS TEMPLATES
    // ════════════════════════════════════════════════════════════════

    public static string ContactFormAdmin(string name, string email, string phone, string message) => Wrap("New Contact Form Submission", $"""
        {Alert("📬", $"A new contact form has been submitted on <strong>{DateTime.Now:dd MMM yyyy, hh:mm tt}</strong>.")}
        <table width="100%" cellpadding="0" cellspacing="0">
          {InfoRow("Name", name)}
          {InfoRow("Email", $"<a href='mailto:{email}' style='color:{Green};'>{email}</a>")}
          {InfoRow("Phone", phone)}
        </table>
        <div style="background:#f8fafc;border:1px solid {Border};border-radius:10px;padding:18px 20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:{TextMuted};text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="margin:0;font-size:14px;color:{TextMain};line-height:1.7;">{message}</p>
        </div>
        <div style="text-align:center;">{Btn($"mailto:{email}", "Reply to Customer")}</div>
        """);

    public static string ContactFormConfirmation(string name, string subject, string message) => Wrap("We Received Your Message ✅", $"""
        {H2($"Dear {name},")}
        {Para("Thank you for reaching out to <strong>Sidham Pharmacy</strong>. We've received your message and our team will get back to you within <strong>24–48 hours</strong>.")}
        <div style="background:#f8fafc;border:1px solid {Border};border-left:4px solid {Green};border-radius:10px;padding:20px 24px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:{TextMuted};text-transform:uppercase;letter-spacing:1px;">Your Message</p>
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:{TextMain};">{HtmlEncoder.Default.Encode(subject)}</p>
          <p style="margin:0;font-size:14px;color:{TextMain};line-height:1.7;">{HtmlEncoder.Default.Encode(message)}</p>
        </div>
        {Para($"In the meantime, you can reach us directly at <a href='mailto:sidhampharmacy@gmail.com' style='color:{Green};font-weight:600;'>sidhampharmacy@gmail.com</a> or call us at <strong>+91 8570031091</strong>.")}
        """);

    public static string ConsultationConfirmation(string name, string? preferredDate, string? preferredTime, string concern) => Wrap("Consultation Booked! ✅", $"""
        {H2($"Dear {name},")}
        {Para("Thank you for booking a consultation with <strong>Ganpati Herbal Ayurveda</strong>. We've received your request and our team will confirm your appointment shortly.")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          {InfoRow("Patient Name", name)}
          {(preferredDate != null ? InfoRow("Preferred Date", preferredDate) : "")}
          {(preferredTime != null ? InfoRow("Preferred Time", preferredTime) : "")}
          {InfoRow("Health Concern", concern)}
        </table>
        {Alert("📍", "Clinic: 4072, Block E, Sushant City, Kurukshetra, Haryana | +91 8570031091")}
        {Para("Our doctors, <strong>Dr. Gourav</strong> and <strong>Dr. Aarti Saini (B.A.M.S., M.S.)</strong>, will review your case and reach out to confirm the appointment.")}
        {Para("In case of urgent queries, please call us at <strong>+91 8570031091</strong> or <strong>+91 9588383903</strong>.")}
        """);

    public static string ConsultationAdmin(string name, string email, string phone, string concern, string? preferredDate, string? preferredTime, string? doshaType) => Wrap("New Consultation Request 🏥", $"""
        {Alert("🏥", $"New consultation request received on <strong>{DateTime.Now:dd MMM yyyy, hh:mm tt}</strong>.")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Patient Name", name)}
          {InfoRow("Email", $"<a href='mailto:{email}' style='color:{Green};'>{email}</a>")}
          {InfoRow("Phone", phone)}
          {InfoRow("Health Concern", concern)}
          {(preferredDate != null ? InfoRow("Preferred Date", preferredDate) : "")}
          {(preferredTime != null ? InfoRow("Preferred Time", preferredTime) : "")}
          {(doshaType != null ? InfoRow("Dosha Type", doshaType) : "")}
        </table>
        <div style="text-align:center;">{Btn($"mailto:{email}", "Contact Patient")}</div>
        """);

    public static string NewsletterWelcome() => Wrap("You're Subscribed!", $"""
        {H2("Welcome to the Sidham Family!")}
        {Para("Thank you for subscribing to Sidham Pharmacy's newsletter. You'll be the first to hear about:")}
        <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;color:{TextMuted};line-height:2;">
          <li>New Ayurvedic product launches</li>
          <li>Exclusive discounts and coupon codes</li>
          <li>Ayurvedic health tips and seasonal wellness guides</li>
          <li>Special offers from Ganpati Herbal Ayurveda Clinic</li>
        </ul>
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Explore Products")}</div>
        """);

    // ════════════════════════════════════════════════════════════════
    // SHOP TEMPLATES
    // ════════════════════════════════════════════════════════════════

    public static string OrderConfirmation(string customerName, OrderDetailDto order) => Wrap($"Order Confirmed — #{order.OrderNumber} ✅", $"""
        {H2($"Namaste, {customerName}! 🙏")}
        {Para($"Your order <strong>#{order.OrderNumber}</strong> has been placed successfully. Thank you for choosing Sidham Pharmacy for your Ayurvedic wellness needs.")}
        {Badge("✅ Order Confirmed", "#dcfce7", "#166534")}
        {OrderItemsTable(order)}
        {ShippingAddressBlock(order)}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{order.OrderNumber}")}
          {InfoRow("Payment Method", order.PaymentMethod.ToString())}
          {InfoRow("Order Date", order.CreatedAt.ToString("dd MMM yyyy, hh:mm tt"))}
        </table>
        {Alert("📦", "We'll send you a shipping confirmation with tracking details once your order is dispatched. Estimated delivery: 3–7 business days.")}
        <div style="text-align:center;">{Btn(TrackUrl(order), "Track My Order")}</div>
        """);

    public static string PaymentConfirmation(string customerName, OrderDetailDto order) => Wrap($"Payment Received — #{order.OrderNumber} 💚", $"""
        {H2($"Hi {customerName},")}
        {Alert("💚", $"We've received your payment of <strong>₹{order.TotalAmount:F0}</strong> for order <strong>#{order.OrderNumber}</strong>.", "#f0fdf4", "#bbf7d0")}
        {OrderItemsTable(order)}
        {Alert("📦", "Your order is now being prepared by our team. You will receive a shipping notification with tracking details shortly.")}
        <div style="text-align:center;">{Btn(TrackUrl(order), "Track My Order")}</div>
        """);

    public static string ShippingUpdate(string customerName, OrderDetailDto order) => Wrap($"Your Order is Shipped! 🚚 — #{order.OrderNumber}", $"""
        {H2($"Great news, {customerName}!")}
        {Para($"Your order <strong>#{order.OrderNumber}</strong> is on its way to you. Sit tight!")}
        {Badge("🚚 Shipped", "#dbeafe", "#1d4ed8")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          {InfoRow("Order Number", $"#{order.OrderNumber}")}
          {InfoRow("Shipped On", order.ShippedAt?.ToString("dd MMM yyyy") ?? DateTime.Now.ToString("dd MMM yyyy"))}
          {(order.TrackingNumber != null ? InfoRow("Tracking Number", $"<strong>{order.TrackingNumber}</strong>") : "")}
        </table>
        {ShippingAddressBlock(order)}
        {Alert("⏱️", "Estimated delivery: 3–7 business days from the shipping date.")}
        <div style="text-align:center;">{Btn(TrackUrl(order), "Track My Order")}</div>
        """);

    public static string DeliveryConfirmation(string customerName, OrderDetailDto order) => Wrap($"Delivered! 🎉 — #{order.OrderNumber}", $"""
        {H2($"Namaste, {customerName}! 🙏")}
        {Alert("🎉", $"Your order <strong>#{order.OrderNumber}</strong> has been delivered successfully. We hope you love your Ayurvedic products!", "#f0fdf4", "#bbf7d0")}
        {OrderItemsTable(order)}
        {Para("Your journey to natural wellness has just begun! Experience the healing power of Ayurveda with Sidham Pharmacy.")}
        {Alert("⭐", "Love your products? Please take a moment to share your experience — your review helps thousands of people choose natural healing.")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Shop Again")}</div>
        """);

    public const string SiteUrl = "https://sidham.in";

    /// <summary>Guests have no account, so their link opens the public order-tracking page; account holders go to their order.</summary>
    public static string TrackUrl(OrderDetailDto o) =>
        o.UserId == null ? $"{SiteUrl}/track-order?order={Uri.EscapeDataString(o.OrderNumber)}" : $"{SiteUrl}/account/orders/{o.Id}";

    public static string TrackUrl(EcommerceApp.Application.DTOs.Shipments.ShipmentEmailInfo i) =>
        i.IsGuest || i.OrderId == null ? $"{SiteUrl}/track-order?order={Uri.EscapeDataString(i.OrderNumber)}" : $"{SiteUrl}/account/orders/{i.OrderId}";

    public static string ShipmentProgress(string customerName, EcommerceApp.Application.DTOs.Shipments.ShipmentEmailInfo i)
    {
        string E(string? v) => System.Net.WebUtility.HtmlEncode(v ?? "");
        var (title, text, badge) = i.Category switch
        {
            "CREATED" => ("Your order has been handed over for shipping", "Your order is packed and a courier shipment has been created. We will keep you updated.", Badge("📦 Shipment created", "#dbeafe", "#1d4ed8")),
            "IN_TRANSIT" => ("Your order is on its way", "The courier has picked up your order and it is moving towards you.", Badge("🚚 In transit", "#dbeafe", "#1d4ed8")),
            "OUT_FOR_DELIVERY" => ("Your order is out for delivery", "Your order will reach you today. Please keep your phone handy.", Badge("🛵 Out for delivery", "#fef3c7", "#92400e")),
            _ => ("Your order has been delivered", "Your order was delivered. We hope you love your Ayurvedic products!", Badge("🎉 Delivered", "#dcfce7", "#166534")),
        };
        var expected = i.Category != "DELIVERED" && i.ExpectedDelivery is { } d ? InfoRow("Expected delivery", d.ToString("dd MMM yyyy")) : "";
        return Wrap($"{title} — #{E(i.OrderNumber)}", $"""
        {H2($"Hi {E(customerName)},")}
        {Para(text)}
        {badge}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          {InfoRow("Order Number", $"#{E(i.OrderNumber)}")}
          {InfoRow("Courier", E(i.Courier))}
          {(string.IsNullOrWhiteSpace(i.Awb) ? "" : InfoRow("Tracking number (AWB)", $"<strong>{E(i.Awb)}</strong>"))}
          {expected}
        </table>
        <div style="text-align:center;">{Btn(TrackUrl(i), "Track My Order")}</div>
        """);
    }

    public static string OrderCancelled(string customerName, OrderDetailDto order) => Wrap($"Order Cancelled — #{order.OrderNumber}", $"""
        {H2($"Hi {customerName},")}
        {Alert("❌", $"Your order <strong>#{order.OrderNumber}</strong> has been cancelled.", "#fef2f2", "#fecaca")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{order.OrderNumber}")}
          {InfoRow("Total Amount", $"₹{order.TotalAmount:F0}")}
          {(order.CancellationReason != null ? InfoRow("Reason", order.CancellationReason) : "")}
        </table>
        {Para("If you paid online, a refund will be processed within 5–7 business days to your original payment method.")}
        {Para("If you have any questions, please contact us at <a href='mailto:sidhampharmacy@gmail.com' style='color:" + Green + ";'>sidhampharmacy@gmail.com</a> or call +91 8570031091.")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Continue Shopping")}</div>
        """);

    // ════════════════════════════════════════════════════════════════
    // REVIEW TEMPLATES
    // ════════════════════════════════════════════════════════════════

    public static string ReviewPendingAdmin(string customerName, string customerEmail, string productName, string comment) => Wrap("New Review Pending Approval 🌟", $"""
        {Alert("⭐", $"A new review has been submitted on <strong>{DateTime.Now:dd MMM yyyy, hh:mm tt}</strong> and is awaiting approval.")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Customer", customerName)}
          {InfoRow("Email", $"<a href='mailto:{customerEmail}' style='color:{Green};'>{customerEmail}</a>")}
          {InfoRow("Product", HtmlEncoder.Default.Encode(productName))}
        </table>
        <div style="background:#f8fafc;border:1px solid {Border};border-radius:10px;padding:18px 20px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:{TextMuted};text-transform:uppercase;letter-spacing:1px;">Review Comment</p>
          <p style="margin:0;font-size:14px;color:{TextMain};line-height:1.7;">{HtmlEncoder.Default.Encode(comment)}</p>
        </div>
        """);

    // ════════════════════════════════════════════════════════════════
    // RETURN / CANCELLATION REQUEST TEMPLATES
    // ════════════════════════════════════════════════════════════════
    private static string E(string? v) => HtmlEncoder.Default.Encode(v ?? "");

    public static string ReturnRequested(string customerName, string orderNumber, string reason) => Wrap($"Return Request Received — #{E(orderNumber)}", $"""
        {H2($"Hi {E(customerName)},")}
        {Alert("↩️", $"We have received your return request for order <strong>#{E(orderNumber)}</strong>. Our team will review it and update you by e-mail.", "#fffbeb", "#fde68a")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{E(orderNumber)}")}
          {InfoRow("Reason", E(reason))}
          {InfoRow("Status", "Waiting for approval")}
        </table>
        {Para("Nothing needs to be done from your side right now. The return starts only after our team approves it.")}
        <div style="text-align:center;">{Btn($"{SiteUrl}/account/returns", "View My Returns")}</div>
        """);

    public static string ReturnRequestedAdmin(string orderNumber, string customerName, string customerEmail, string reason, string? description) => Wrap($"Return Request — #{E(orderNumber)}", $"""
        {H2("New return request")}
        {Alert("↩️", $"<strong>{E(customerName)}</strong> asked to return order <strong>#{E(orderNumber)}</strong>. It needs your approval.", "#fffbeb", "#fde68a")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{E(orderNumber)}")}
          {InfoRow("Customer", $"{E(customerName)} ({E(customerEmail)})")}
          {InfoRow("Reason", E(reason))}
          {(string.IsNullOrWhiteSpace(description) ? "" : InfoRow("Details", E(description)))}
        </table>
        <div style="text-align:center;">{Btn($"{SiteUrl}/admin/returns", "Review in Admin")}</div>
        """);

    public static string ReturnDecision(string customerName, string orderNumber, string status, string? adminNotes) => Wrap($"Return Request {E(status)} — #{E(orderNumber)}", $"""
        {H2($"Hi {E(customerName)},")}
        {Alert(status == "Rejected" ? "❌" : "✅", $"Your return request for order <strong>#{E(orderNumber)}</strong> is now <strong>{E(status)}</strong>.",
            status == "Rejected" ? "#fef2f2" : "#f0fdf4", status == "Rejected" ? "#fecaca" : "#bbf7d0")}
        {(string.IsNullOrWhiteSpace(adminNotes) ? "" : Para("Note from our team: " + E(adminNotes)))}
        {Para("If you have any questions, reply to this e-mail or call +91 8570031091.")}
        <div style="text-align:center;">{Btn($"{SiteUrl}/account/returns", "View My Returns")}</div>
        """);

    public static string CancelRequested(string customerName, string orderNumber, string reason) => Wrap($"Cancellation Request Received — #{E(orderNumber)}", $"""
        {H2($"Hi {E(customerName)},")}
        {Alert("🛑", $"Your order <strong>#{E(orderNumber)}</strong> has already been dispatched, so it cannot be cancelled straight away. We have sent your cancellation request to our team for approval.", "#fffbeb", "#fde68a")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{E(orderNumber)}")}
          {InfoRow("Reason", E(reason))}
          {InfoRow("Status", "Waiting for approval")}
        </table>
        {Para("You will get another e-mail as soon as the request is approved or declined. Until then your order stays active.")}
        """);

    public static string CancelRequestedAdmin(string orderNumber, string customerName, string customerEmail, string reason, bool wasDispatched) => Wrap($"Cancellation Request — #{E(orderNumber)}", $"""
        {H2("Cancellation request")}
        {Alert("🛑", $"<strong>{E(customerName)}</strong> asked to cancel order <strong>#{E(orderNumber)}</strong>{(wasDispatched ? ", which is already dispatched" : "")}. It needs your approval.", "#fef2f2", "#fecaca")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          {InfoRow("Order Number", $"#{E(orderNumber)}")}
          {InfoRow("Customer", $"{E(customerName)} ({E(customerEmail)})")}
          {InfoRow("Reason", E(reason))}
        </table>
        {Para(wasDispatched ? "If you approve, also cancel the shipment in the Delhivery portal so the parcel is not delivered." : "Approving cancels the order.")}
        <div style="text-align:center;">{Btn($"{SiteUrl}/admin/cancel-requests", "Review in Admin")}</div>
        """);

    public static string CancelDecision(string customerName, string orderNumber, bool approved, string? adminNotes) => Wrap(approved ? $"Order Cancelled — #{E(orderNumber)}" : $"Cancellation Declined — #{E(orderNumber)}", $"""
        {H2($"Hi {E(customerName)},")}
        {(approved
            ? Alert("✅", $"Your cancellation request for order <strong>#{E(orderNumber)}</strong> was approved and the order is cancelled.", "#f0fdf4", "#bbf7d0")
            : Alert("❌", $"Your cancellation request for order <strong>#{E(orderNumber)}</strong> could not be approved. Your order continues as planned.", "#fef2f2", "#fecaca"))}
        {(string.IsNullOrWhiteSpace(adminNotes) ? "" : Para("Note from our team: " + E(adminNotes)))}
        {(approved ? Para("If you paid online, the refund is processed within 5–7 business days to your original payment method.") : "")}
        {Para("If you have any questions, call +91 8570031091.")}
        """);

    public static string ReviewSubmitted(string customerName, string productName) => Wrap("Review Received ✅", $"""
        {H2($"Thank you, {customerName}!")}
        {Alert("✅", $"Your review for <strong>{HtmlEncoder.Default.Encode(productName)}</strong> has been submitted and is pending approval.", "#f0fdf4", "#bbf7d0")}
        {Para("Our team will review it shortly. Once approved, your review will be visible to other customers and help them make informed decisions.")}
        {Para("We appreciate you taking the time to share your experience with Sidham Pharmacy!")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Continue Shopping")}</div>
        """);

    public static string ReviewApproved(string customerName, string productName) => Wrap("Review Published! 🌟", $"""
        {H2($"Great news, {customerName}!")}
        {Alert("🌟", $"Your review for <strong>{HtmlEncoder.Default.Encode(productName)}</strong> has been approved and is now live on our website.", "#fefce8", "#fde68a")}
        {Para("Your honest feedback helps thousands of customers discover the right Ayurvedic solutions for their wellness journey.")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "View Products")}</div>
        """);

    public static string ReviewRejected(string customerName, string productName) => Wrap("Review Update", $"""
        {H2($"Hi {customerName},")}
        {Alert("ℹ️", $"Unfortunately, your review for <strong>{HtmlEncoder.Default.Encode(productName)}</strong> could not be published as it did not meet our community guidelines.", "#fef2f2", "#fecaca")}
        {Para("We encourage honest and respectful feedback. You are welcome to submit a new review that follows our guidelines.")}
        {Para("If you have questions, please contact us at <a href='mailto:sidhampharmacy@gmail.com' style='color:" + Green + ";'>sidhampharmacy@gmail.com</a>.")}
        <div style="text-align:center;">{Btn("https://sidham.in/products", "Shop Again")}</div>
        """);
}
