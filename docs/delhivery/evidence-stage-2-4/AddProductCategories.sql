START TRANSACTION;

CREATE TABLE "ProductCategories" (
    "ProductId" uuid NOT NULL,
    "CategoryId" uuid NOT NULL,
    CONSTRAINT "PK_ProductCategories" PRIMARY KEY ("ProductId", "CategoryId"),
    CONSTRAINT "FK_ProductCategories_Categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ProductCategories_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_ProductCategories_CategoryId" ON "ProductCategories" ("CategoryId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261127114008_AddProductCategories', '8.0.11');

COMMIT;

