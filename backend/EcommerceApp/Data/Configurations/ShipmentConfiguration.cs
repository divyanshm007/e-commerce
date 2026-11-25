using EcommerceApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EcommerceApp.Infrastructure.Data.Configurations;

public class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    private static string In(params string[] values) => string.Join(",", values.Select(v => $"'{v}'"));

    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("Shipments", t =>
        {
            t.HasCheckConstraint("CK_Shipments_Mode", "\"Mode\" IN ('test','live')");
            t.HasCheckConstraint("CK_Shipments_CreationState", $"\"CreationState\" IN ({In(ShipmentConstants.CreationStates.All)})");
            t.HasCheckConstraint("CK_Shipments_Status", $"\"Status\" IN ({In(ShipmentConstants.Statuses.All)})");
            t.HasCheckConstraint("CK_Shipments_AwbWhenCreated", "\"CreationState\" <> 'CREATED' OR \"Awb\" IS NOT NULL");
        });

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Mode).IsRequired().HasMaxLength(10);
        builder.Property(s => s.CourierName).IsRequired().HasMaxLength(50).HasDefaultValue("Delhivery");
        builder.Property(s => s.ClientOrderRef).IsRequired().HasMaxLength(60);
        builder.Property(s => s.CreationState).IsRequired().HasMaxLength(20);
        builder.Property(s => s.CreateAttempts).HasDefaultValue(0);
        builder.Property(s => s.Awb).HasMaxLength(40);
        builder.Property(s => s.CreateResponseRef).HasMaxLength(200);
        builder.Property(s => s.Status).IsRequired().HasMaxLength(30).HasDefaultValue(ShipmentConstants.Statuses.Created);
        builder.Property(s => s.DelhiveryStatus).HasMaxLength(100);
        builder.Property(s => s.DelhiveryStatusType).HasMaxLength(10);
        builder.Property(s => s.TrackingUrl).HasMaxLength(500);
        builder.Property(s => s.IsFinal).HasDefaultValue(false);
        builder.Property(s => s.TrackFailureCount).HasDefaultValue(0);
        builder.Property(s => s.ReconcileAttempts).HasDefaultValue(0);
        builder.Property(s => s.NotifyFailures).HasDefaultValue(0);
        builder.Property(s => s.LastError).HasMaxLength(500);
        builder.Property(s => s.NotifiedStatuses).HasColumnType("text[]").HasDefaultValueSql("'{}'");

        // two requests can never silently overwrite each other's update of the same shipment
        builder.UseXminAsConcurrencyToken();

        // nothing is ever deleted with an order or a user: shipment history is preserved
        builder.HasOne(s => s.Order).WithMany().HasForeignKey(s => s.OrderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.CreatedByUser).WithMany().HasForeignKey(s => s.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);

        // at most one OPEN shipment per order – this is what makes shipment creation idempotent
        builder.HasIndex(s => s.OrderId).IsUnique().HasDatabaseName("UX_Shipments_Order_Open").HasFilter(ShipmentRules.HoldsOrderFilterSql);
        builder.HasIndex(s => new { s.Mode, s.ClientOrderRef }).IsUnique().HasDatabaseName("UX_Shipments_Mode_ClientOrderRef");
        builder.HasIndex(s => new { s.Mode, s.Awb }).IsUnique().HasDatabaseName("UX_Shipments_Mode_Awb").HasFilter("\"Awb\" IS NOT NULL");
        builder.HasIndex(s => s.NextCheckAt).HasDatabaseName("IX_Shipments_Poll").HasFilter("\"CreationState\" = 'CREATED' AND \"IsFinal\" = false");
        // lookups of an order's whole shipment history (a different column set, so it is a separate index from the unique one above)
        builder.HasIndex(s => new { s.OrderId, s.CreatedAt }).HasDatabaseName("IX_Shipments_Order_CreatedAt");
    }
}

public class ShipmentTrackingEventConfiguration : IEntityTypeConfiguration<ShipmentTrackingEvent>
{
    public void Configure(EntityTypeBuilder<ShipmentTrackingEvent> builder)
    {
        builder.ToTable("ShipmentTrackingEvents", t =>
        {
            t.HasCheckConstraint("CK_ShipmentTrackingEvents_Source", "\"Source\" IN ('poll','webhook')");
            t.HasCheckConstraint("CK_ShipmentTrackingEvents_MappedStatus",
                "\"MappedStatus\" IN (" + string.Join(",", ShipmentConstants.Statuses.All.Select(v => $"'{v}'")) + ")");
        });

        builder.HasKey(e => e.Id);

        builder.Property(e => e.StatusType).HasMaxLength(10);
        builder.Property(e => e.Status).IsRequired().HasMaxLength(100);
        builder.Property(e => e.ScanCode).HasMaxLength(50);
        builder.Property(e => e.Location).HasMaxLength(200);
        builder.Property(e => e.Description).HasMaxLength(1000);
        builder.Property(e => e.MappedStatus).IsRequired().HasMaxLength(30);
        builder.Property(e => e.EventHash).IsRequired().HasMaxLength(64);
        builder.Property(e => e.Source).IsRequired().HasMaxLength(10);

        // history of a shipment is never removed by deleting the shipment
        builder.HasOne(e => e.Shipment).WithMany(s => s.TrackingEvents).HasForeignKey(e => e.ShipmentId).OnDelete(DeleteBehavior.Restrict);

        // the same scan arriving twice (re-poll, later webhook) is stored once
        builder.HasIndex(e => new { e.ShipmentId, e.EventHash }).IsUnique().HasDatabaseName("UX_ShipmentTrackingEvents_Shipment_Hash");
        builder.HasIndex(e => new { e.ShipmentId, e.ScanTime }).IsDescending(false, true).HasDatabaseName("IX_ShipmentTrackingEvents_Shipment_ScanTime");
    }
}
