using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcommerceApp.Migrations
{
    /// <inheritdoc />
    public partial class AddShipmentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                            name: "Shipments",
                            columns: table => new
                            {
                                Id = table.Column<Guid>(type: "uuid", nullable: false),
                                OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                                Mode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                                CourierName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Delhivery"),
                                ClientOrderRef = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                                CreationState = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                                CreateAttempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                                Awb = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                                CreateResponseRef = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                                Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "CREATED"),
                                DelhiveryStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                                DelhiveryStatusType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                                ExpectedDeliveryDate = table.Column<DateOnly>(type: "date", nullable: true),
                                TrackingUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                                IsFinal = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                                LastEventAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                LastCheckedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                NextCheckAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                TrackFailureCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                                LastError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                                LastErrorAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                NotifiedStatuses = table.Column<List<string>>(type: "text[]", nullable: false, defaultValueSql: "'{}'"),
                                CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                IsActive = table.Column<bool>(type: "boolean", nullable: false)
                            },
                            constraints: table =>
                            {
                                table.PrimaryKey("PK_Shipments", x => x.Id);
                                table.CheckConstraint("CK_Shipments_AwbWhenCreated", "\"CreationState\" <> 'CREATED' OR \"Awb\" IS NOT NULL");
                                table.CheckConstraint("CK_Shipments_CreationState", "\"CreationState\" IN ('IN_FLIGHT','CREATED','FAILED','UNKNOWN')");
                                table.CheckConstraint("CK_Shipments_Mode", "\"Mode\" IN ('test','live')");
                                table.CheckConstraint("CK_Shipments_Status", "\"Status\" IN ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','RTO_IN_TRANSIT','RTO_DELIVERED','CANCELLED','NEEDS_REVIEW')");
                                table.ForeignKey(
                                    name: "FK_Shipments_Orders_OrderId",
                                    column: x => x.OrderId,
                                    principalTable: "Orders",
                                    principalColumn: "Id",
                                    onDelete: ReferentialAction.Restrict);
                                table.ForeignKey(
                                    name: "FK_Shipments_Users_CreatedByUserId",
                                    column: x => x.CreatedByUserId,
                                    principalTable: "Users",
                                    principalColumn: "Id",
                                    onDelete: ReferentialAction.SetNull);
                            });

            migrationBuilder.CreateTable(
                            name: "ShipmentTrackingEvents",
                            columns: table => new
                            {
                                Id = table.Column<Guid>(type: "uuid", nullable: false),
                                ShipmentId = table.Column<Guid>(type: "uuid", nullable: false),
                                StatusType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                                Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                                ScanCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                                Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                                ScanTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                                Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                                MappedStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                                EventHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                                Source = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                            },
                            constraints: table =>
                            {
                                table.PrimaryKey("PK_ShipmentTrackingEvents", x => x.Id);
                                table.CheckConstraint("CK_ShipmentTrackingEvents_MappedStatus", "\"MappedStatus\" IN ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','RTO_IN_TRANSIT','RTO_DELIVERED','CANCELLED','NEEDS_REVIEW')");
                                table.CheckConstraint("CK_ShipmentTrackingEvents_Source", "\"Source\" IN ('poll','webhook')");
                                table.ForeignKey(
                                    name: "FK_ShipmentTrackingEvents_Shipments_ShipmentId",
                                    column: x => x.ShipmentId,
                                    principalTable: "Shipments",
                                    principalColumn: "Id",
                                    onDelete: ReferentialAction.Restrict);
                            });

            migrationBuilder.CreateIndex(
                            name: "IX_Shipments_CreatedByUserId",
                            table: "Shipments",
                            column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                            name: "IX_Shipments_Order_CreatedAt",
                            table: "Shipments",
                            columns: new[] { "OrderId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                            name: "IX_Shipments_Poll",
                            table: "Shipments",
                            column: "NextCheckAt",
                            filter: "\"CreationState\" = 'CREATED' AND \"IsFinal\" = false");

            migrationBuilder.CreateIndex(
                            name: "UX_Shipments_Mode_Awb",
                            table: "Shipments",
                            columns: new[] { "Mode", "Awb" },
                            unique: true,
                            filter: "\"Awb\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                            name: "UX_Shipments_Mode_ClientOrderRef",
                            table: "Shipments",
                            columns: new[] { "Mode", "ClientOrderRef" },
                            unique: true);

            migrationBuilder.CreateIndex(
                            name: "UX_Shipments_Order_Open",
                            table: "Shipments",
                            column: "OrderId",
                            unique: true,
                            filter: "\"CreationState\" IN ('IN_FLIGHT','CREATED','UNKNOWN') AND \"Status\" NOT IN ('CANCELLED','RTO_DELIVERED')");

            migrationBuilder.CreateIndex(
                            name: "IX_ShipmentTrackingEvents_Shipment_ScanTime",
                            table: "ShipmentTrackingEvents",
                            columns: new[] { "ShipmentId", "ScanTime" },
                            descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                            name: "UX_ShipmentTrackingEvents_Shipment_Hash",
                            table: "ShipmentTrackingEvents",
                            columns: new[] { "ShipmentId", "EventHash" },
                            unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShipmentTrackingEvents");

            migrationBuilder.DropTable(
                name: "Shipments");
        }
    }
}
