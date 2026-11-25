using EcommerceApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductView> ProductViews => Set<ProductView>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<PromotionHeader> PromotionHeaders => Set<PromotionHeader>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<GalleryImage> GalleryImages => Set<GalleryImage>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<Newsletter> Newsletters => Set<Newsletter>();
    public DbSet<WebsiteSetting> WebsiteSettings => Set<WebsiteSetting>();
    public DbSet<StaticPage> StaticPages => Set<StaticPage>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<Quiz>           Quizzes         => Set<Quiz>();
    public DbSet<QuizQuestion>   QuizQuestions   => Set<QuizQuestion>();
    public DbSet<QuizOption>     QuizOptions     => Set<QuizOption>();
    public DbSet<QuizResultType> QuizResultTypes => Set<QuizResultType>();
    public DbSet<ShippingConfig> ShippingConfigs => Set<ShippingConfig>();
    public DbSet<TaxConfig> TaxConfigs => Set<TaxConfig>();
    public DbSet<LoginHistory> LoginHistories => Set<LoginHistory>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<OrderFulfilment> OrderFulfilments => Set<OrderFulfilment>();
    public DbSet<CancelRequest> CancelRequests => Set<CancelRequest>();
    public DbSet<ShipmentTrackingEvent> ShipmentTrackingEvents => Set<ShipmentTrackingEvent>();
    public DbSet<VisitorLog> VisitorLogs => Set<VisitorLog>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<ConsultationRequest> ConsultationRequests => Set<ConsultationRequest>();
    public DbSet<ReturnRequest> ReturnRequests => Set<ReturnRequest>();
    public DbSet<Referral> Referrals => Set<Referral>();
    public DbSet<TrustPageContent> TrustPageContents => Set<TrustPageContent>();
    public DbSet<State> States => Set<State>();
    public DbSet<PromoOffer> PromoOffers => Set<PromoOffer>();
    public DbSet<PaymentOption> PaymentOptions => Set<PaymentOption>();
    public DbSet<OrderItemTracking> OrderItemTrackings => Set<OrderItemTracking>();
    public DbSet<OrderPickup> OrderPickups => Set<OrderPickup>();
    public DbSet<CouponProduct> CouponProducts => Set<CouponProduct>();
    public DbSet<CouponCategory> CouponCategories => Set<CouponCategory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override int SaveChanges()
    {
        SetAuditFields();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetAuditFields()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is Domain.Common.BaseEntity entity)
                entity.UpdatedAt = DateTime.UtcNow;
        }
    }
}
