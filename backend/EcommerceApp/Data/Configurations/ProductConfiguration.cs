using EcommerceApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcommerceApp.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(500);
        builder.Property(p => p.Slug).IsRequired().HasMaxLength(600);
        builder.HasIndex(p => p.Slug).IsUnique();
        builder.Property(p => p.Price).HasPrecision(18, 2);
        builder.Property(p => p.DiscountPrice).HasPrecision(18, 2);
        builder.Property(p => p.TaxPercentage).HasPrecision(5, 2);
        builder.Property(p => p.Currency).HasMaxLength(10).HasDefaultValue("INR");
        builder.Property(p => p.AverageRating).HasPrecision(3, 2);

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => p.IsFeatured);
        builder.HasIndex(p => p.CreatedAt);
    }
}
