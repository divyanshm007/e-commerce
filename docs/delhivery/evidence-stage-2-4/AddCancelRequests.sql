START TRANSACTION;

CREATE TABLE "CancelRequests" (
    "Id" uuid NOT NULL,
    "OrderId" uuid NOT NULL,
    "UserId" uuid,
    "OrderNumber" character varying(60) NOT NULL,
    "CustomerName" character varying(200) NOT NULL,
    "CustomerEmail" character varying(256) NOT NULL,
    "Reason" character varying(1000) NOT NULL,
    "Status" integer NOT NULL,
    "WasDispatched" boolean NOT NULL,
    "AdminNotes" character varying(1000),
    "ReviewedByUserId" uuid,
    "ReviewedAt" timestamp with time zone,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    "IsActive" boolean NOT NULL,
    CONSTRAINT "PK_CancelRequests" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_CancelRequests_Status" CHECK ("Status" IN (1,2,3)),
    CONSTRAINT "FK_CancelRequests_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_CancelRequests_Status_CreatedAt" ON "CancelRequests" ("Status", "CreatedAt");

CREATE UNIQUE INDEX "UX_CancelRequests_Order_Pending" ON "CancelRequests" ("OrderId") WHERE "Status" = 1;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261125121513_AddCancelRequests', '8.0.11');

COMMIT;

