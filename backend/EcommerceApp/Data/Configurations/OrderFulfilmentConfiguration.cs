using EcommerceApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcommerceApp.Infrastructure.Data.Configurations;

public class OrderFulfilmentConfiguration : IEntityTypeConfiguration<OrderFulfilment>
{
    public void Configure(EntityTypeBuilder<OrderFulfilment> builder)
    {
        builder.ToTable("OrderFulfilments", t =>
            t.HasCheckConstraint("CK_OrderFulfilments_State", $"\"State\" IN ({string.Join(",", FulfilmentStates.All.Select(v => $"'{v}'"))})"));

        builder.HasKey(f => f.Id);
        builder.Property(f => f.State).IsRequired().HasMaxLength(20);
        builder.Property(f => f.Attempts).HasDefaultValue(0);
        builder.Property(f => f.RejectReason).HasMaxLength(500);
        builder.Property(f => f.LastError).HasMaxLength(500);
        builder.Property(f => f.AttentionReason).HasMaxLength(500);

        builder.HasOne(f => f.Order).WithMany().HasForeignKey(f => f.OrderId).OnDelete(DeleteBehavior.Restrict);

        // one decision per order: this is what prevents duplicate approval and duplicate processing
        builder.HasIndex(f => f.OrderId).IsUnique().HasDatabaseName("UX_OrderFulfilments_Order");
        builder.HasIndex(f => new { f.State, f.NextAttemptAt }).HasDatabaseName("IX_OrderFulfilments_State_Next");
    }
}
