using AutoMapper;
using EcommerceApp.Application.Mappings;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace EcommerceApp.Tests.Support;

public static class Seed
{
    public const string Password = "Test#Pass1234";

    public static async Task<User> UserAsync(AppDbContext db, string name, UserRole role = UserRole.Customer)
    {
        var user = new User
        {
            FirstName = name, LastName = "Tester",
            Email = $"{name.ToLowerInvariant()}.{Guid.NewGuid():N}@example.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password, 4),
            Role = role
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<Product> ProductAsync(AppDbContext db, int stock = 10, decimal price = 100m)
    {
        var p = new Product
        {
            Name = "Test product " + Guid.NewGuid().ToString("N")[..6],
            Slug = "test-" + Guid.NewGuid().ToString("N")[..10],
            Price = price, StockQuantity = stock, IsActive = true
        };
        db.Products.Add(p);
        await db.SaveChangesAsync();
        return p;
    }

    /// <summary>Inserts an order directly (any status/payment state) with one line for the given product.</summary>
    public static async Task<Order> OrderAsync(AppDbContext db, Product product, Guid? userId, OrderStatus status = OrderStatus.Pending,
        PaymentStatus payment = PaymentStatus.Pending, PaymentMethod method = PaymentMethod.CashOnDelivery, int qty = 2,
        string? guestEmail = null, string? guestPhone = null, string? orderNumber = null)
    {
        var order = new Order
        {
            OrderNumber = orderNumber ?? $"ORD-20260101-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            UserId = userId,
            GuestEmail = guestEmail, GuestPhone = guestPhone, GuestName = userId == null ? "Guest Buyer" : null,
            Status = status, PaymentStatus = payment, PaymentMethod = method,
            SubTotal = product.Price * qty, TotalAmount = product.Price * qty,
            ShippingFullName = "Ship Name", ShippingPhone = "9876543210", ShippingLine1 = "1 Secret Street",
            ShippingCity = "Delhi", ShippingState = "Delhi", ShippingPostalCode = "110001",
            BillingFullName = "Ship Name", BillingPhone = "9876543210", BillingLine1 = "1 Secret Street",
            BillingCity = "Delhi", BillingState = "Delhi", BillingPostalCode = "110001",
            Items =
            {
                new OrderItem { ProductId = product.Id, ProductName = product.Name, Quantity = qty, UnitPrice = product.Price, TotalPrice = product.Price * qty }
            }
        };
        // the stock the order already took, as CreateAsync would have done
        var tracked = await db.Products.FindAsync(product.Id);
        tracked!.StockQuantity -= qty;
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order;
    }

    public static IMapper Mapper() => new MapperConfiguration(c => c.AddProfile<MappingProfile>()).CreateMapper();

    /// <summary>E-mail is left unconfigured on purpose: the service logs "SMTP is not configured" and sends nothing.</summary>
    public static EmailService Email() => new(new ConfigurationBuilder().Build(), NullLogger<EmailService>.Instance);

    public static OrderService OrderService(AppDbContext db) =>
        new(db, Mapper(), Email(), new CartService(db, Mapper()), new ShipmentOrderGuard(db));

    public static async Task<int> StockAsync(TestDatabase testDb, Guid productId)
    {
        await using var db = testDb.NewContext();
        return (await db.Products.FindAsync(productId))!.StockQuantity;
    }
}
