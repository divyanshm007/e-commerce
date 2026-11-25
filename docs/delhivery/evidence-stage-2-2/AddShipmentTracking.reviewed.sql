START TRANSACTION;

CREATE TABLE "Shipments" (
    "Id" uuid NOT NULL,
    "OrderId" uuid NOT NULL,
    "Mode" character varying(10) NOT NULL,
    "CourierName" character varying(50) NOT NULL DEFAULT 'Delhivery',
    "ClientOrderRef" character varying(60) NOT NULL,
    "CreationState" character varying(20) NOT NULL,
    "CreateAttempts" integer NOT NULL DEFAULT 0,
    "Awb" character varying(40),
    "CreateResponseRef" character varying(200),
    "Status" character varying(30) NOT NULL DEFAULT 'CREATED',
    "DelhiveryStatus" character varying(100),
    "DelhiveryStatusType" character varying(10),
    "ExpectedDeliveryDate" date,
    "TrackingUrl" character varying(500),
    "IsFinal" boolean NOT NULL DEFAULT FALSE,
    "LastEventAt" timestamp with time zone,
    "LastCheckedAt" timestamp with time zone,
    "NextCheckAt" timestamp with time zone,
    "TrackFailureCount" integer NOT NULL DEFAULT 0,
    "LastError" character varying(500),
    "LastErrorAt" timestamp with time zone,
    "NotifiedStatuses" text[] NOT NULL DEFAULT ('{}'),
    "CreatedByUserId" uuid,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "IsActive" boolean NOT NULL,
    CONSTRAINT "PK_Shipments" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_Shipments_AwbWhenCreated" CHECK ("CreationState" <> 'CREATED' OR "Awb" IS NOT NULL),
    CONSTRAINT "CK_Shipments_CreationState" CHECK ("CreationState" IN ('IN_FLIGHT','CREATED','FAILED','UNKNOWN')),
    CONSTRAINT "CK_Shipments_Mode" CHECK ("Mode" IN ('test','live')),
    CONSTRAINT "CK_Shipments_Status" CHECK ("Status" IN ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','RTO_IN_TRANSIT','RTO_DELIVERED','CANCELLED','NEEDS_REVIEW')),
    CONSTRAINT "FK_Shipments_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Shipments_Users_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

CREATE TABLE "ShipmentTrackingEvents" (
    "Id" uuid NOT NULL,
    "ShipmentId" uuid NOT NULL,
    "StatusType" character varying(10),
    "Status" character varying(100) NOT NULL,
    "ScanCode" character varying(50),
    "Location" character varying(200),
    "ScanTime" timestamp with time zone,
    "Description" character varying(1000),
    "MappedStatus" character varying(30) NOT NULL,
    "EventHash" character varying(64) NOT NULL,
    "Source" character varying(10) NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ShipmentTrackingEvents" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_ShipmentTrackingEvents_MappedStatus" CHECK ("MappedStatus" IN ('CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','RTO_IN_TRANSIT','RTO_DELIVERED','CANCELLED','NEEDS_REVIEW')),
    CONSTRAINT "CK_ShipmentTrackingEvents_Source" CHECK ("Source" IN ('poll','webhook')),
    CONSTRAINT "FK_ShipmentTrackingEvents_Shipments_ShipmentId" FOREIGN KEY ("ShipmentId") REFERENCES "Shipments" ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_Shipments_CreatedByUserId" ON "Shipments" ("CreatedByUserId");

CREATE INDEX "IX_Shipments_Order_CreatedAt" ON "Shipments" ("OrderId", "CreatedAt");

CREATE INDEX "IX_Shipments_Poll" ON "Shipments" ("NextCheckAt") WHERE "CreationState" = 'CREATED' AND "IsFinal" = false;

CREATE UNIQUE INDEX "UX_Shipments_Mode_Awb" ON "Shipments" ("Mode", "Awb") WHERE "Awb" IS NOT NULL;

CREATE UNIQUE INDEX "UX_Shipments_Mode_ClientOrderRef" ON "Shipments" ("Mode", "ClientOrderRef");

CREATE UNIQUE INDEX "UX_Shipments_Order_Open" ON "Shipments" ("OrderId") WHERE "CreationState" IN ('IN_FLIGHT','CREATED','UNKNOWN') AND "Status" NOT IN ('CANCELLED','RTO_DELIVERED');

CREATE INDEX "IX_ShipmentTrackingEvents_Shipment_ScanTime" ON "ShipmentTrackingEvents" ("ShipmentId", "ScanTime" DESC);

CREATE UNIQUE INDEX "UX_ShipmentTrackingEvents_Shipment_Hash" ON "ShipmentTrackingEvents" ("ShipmentId", "EventHash");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261109091756_AddShipmentTracking', '8.0.11');

COMMIT;

