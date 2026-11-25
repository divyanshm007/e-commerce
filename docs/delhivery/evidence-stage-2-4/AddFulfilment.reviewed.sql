START TRANSACTION;

ALTER TABLE "Shipments" ADD "NextNotifyAt" timestamp with time zone;

ALTER TABLE "Shipments" ADD "NotifyFailures" integer NOT NULL DEFAULT 0;

ALTER TABLE "Shipments" ADD "ReconcileAttempts" integer NOT NULL DEFAULT 0;

CREATE TABLE "OrderFulfilments" (
    "Id" uuid NOT NULL,
    "OrderId" uuid NOT NULL,
    "State" character varying(20) NOT NULL,
    "ApprovedByUserId" uuid,
    "ApprovedAt" timestamp with time zone,
    "RejectedByUserId" uuid,
    "RejectedAt" timestamp with time zone,
    "RejectReason" character varying(500),
    "Attempts" integer NOT NULL DEFAULT 0,
    "NextAttemptAt" timestamp with time zone,
    "LeaseUntil" timestamp with time zone,
    "LastError" character varying(500),
    "AttentionReason" character varying(500),
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "IsActive" boolean NOT NULL,
    CONSTRAINT "PK_OrderFulfilments" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_OrderFulfilments_State" CHECK ("State" IN ('APPROVED','CREATING','SHIPPED','COMPLETED','EXCEPTION','REJECTED')),
    CONSTRAINT "FK_OrderFulfilments_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_OrderFulfilments_State_Next" ON "OrderFulfilments" ("State", "NextAttemptAt");

CREATE UNIQUE INDEX "UX_OrderFulfilments_Order" ON "OrderFulfilments" ("OrderId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261109110435_AddFulfilment', '8.0.11');

COMMIT;

