using EcommerceApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcommerceApp.Infrastructure.Data.Configurations;

public class CancelRequestConfiguration : IEntityTypeConfiguration<CancelRequest>
{
    public void Configure(EntityTypeBuilder<CancelRequest> builder)
    {
        builder.ToTable("CancelRequests", t => t.HasCheckConstraint("CK_CancelRequests_Status", "\"Status\" IN (1,2,3)"));

        builder.HasKey(c => c.Id);
        builder.Property(c => c.OrderNumber).IsRequired().HasMaxLength(60);
        builder.Property(c => c.CustomerName).IsRequired().HasMaxLength(200);
        builder.Property(c => c.CustomerEmail).IsRequired().HasMaxLength(256);
        builder.Property(c => c.Reason).IsRequired().HasMaxLength(1000);
        builder.Property(c => c.AdminNotes).HasMaxLength(1000);

        builder.HasOne(c => c.Order).WithMany().HasForeignKey(c => c.OrderId).OnDelete(DeleteBehavior.Restrict);

        // only one open (pending) request per order: asking twice cannot create a second one
        builder.HasIndex(c => c.OrderId).IsUnique().HasDatabaseName("UX_CancelRequests_Order_Pending").HasFilter("\"Status\" = 1");
        builder.HasIndex(c => new { c.Status, c.CreatedAt }).HasDatabaseName("IX_CancelRequests_Status_CreatedAt");
    }
}
