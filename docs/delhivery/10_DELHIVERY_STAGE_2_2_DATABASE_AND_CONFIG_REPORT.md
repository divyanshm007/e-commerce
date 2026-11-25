# 10 – Delhivery Stage 2.2: Database Foundation and Test/Live Configuration – Report
Date: 2026-11-09 · Scope: phase 2.2 only. **Not implemented (by instruction):** shipment creation, AWB, Delhivery HTTP client, tracking calls, background worker, notifications, customer/guest tracking UI, cancellation/label/pickup/NDR. Stage 2.3 has not been started.
Everything ran locally. **No migration was applied anywhere except disposable local databases.**

## 1. Result in one paragraph
Two tables (`Shipments`, `ShipmentTrackingEvents`) and a versioned EF Core migration were added and proven safe on a restore of the saved UAT backup (existing data byte-identical, only the two tables added, Down restores the original). A Delhivery Test/Live setting (database flag, tokens only from environment variables) with a SuperAdmin-only API and an admin settings tab was added, mirroring Razorpay without touching it. The Stage 2.1 `NullOrderShipmentGuard` was replaced by a database-backed guard using the approved "open shipment" definition. Backend 0 warnings/0 errors, frontend build OK, **238 tests (142 from Stage 2.1 + 96 new), all passing**.

## 2. Inspection before changing anything
| Check | Result |
|---|---|
| Git branch / working tree | The repository is **not under Git** (`fatal: not a git repository`). I used file-tree snapshots instead: one taken before Stage 2.1 and one before Stage 2.2, diffed at the end. |
| Stage 2.1 present | Yes: `OrderRules.cs`, `OrderTrackingDtos.cs`, `IOrderShipmentGuard`, the 5 test classes (142 tests) and the controller/service changes; `NullOrderShipmentGuard` was registered in `ServiceExtensions.cs`. Nothing of it was discarded. |
| Migration-history mismatch re-confirmed | Source has 4 migrations; the model snapshot contains **none** of the 7 legacy entities (`States`, `PromoOffers`, `PaymentOptions`, `OrderItemTrackings`, `OrderPickups`, `CouponProducts`, `CouponCategories`); live history (and the UAT backup) has only 3 rows – the 4th (`20261007101057_AddCouponCodeToCart`, adds `Carts.AppliedCouponCode`) is missing although that column exists (added by start-up DDL). So a plain `migrations add` was expected to emit unrelated DDL and a plain script would fail on production. |
| Existing pieces reused | `WebsiteSettings` (key/value via `SettingsService`), `ActivityLogs` (0 rows, `UserId` is an FK to `Users`), `RazorpayConfigService` (pattern), admin `admin-settings.component.ts` (Razorpay card). |
| Guard | `IOrderShipmentGuard.HasOpenShipmentAsync(orderId)` → registered `NullOrderShipmentGuard` (always false). |

## 3. Database changes
**New (2 tables, nothing else):** `Shipments` (26 columns + 4 check constraints + 2 FKs + 6 indexes) and `ShipmentTrackingEvents` (12 columns + 2 checks + 1 FK + 2 indexes). Design = `06_DELHIVERY_DATABASE_DESIGN.md`, implemented as written, with these precisions:
- Uses the existing `BaseEntity` columns for `Shipments` (`Id`, `CreatedAt`, `UpdatedAt`, `IsActive`); events have `Id` + `CreatedAt`.
- `Shipments` has an automatic extra index on `CreatedByUserId` (FK support).
- Concurrency token: PostgreSQL's built-in `xmin` system column (no DDL; PostgreSQL creates it for every table). Proven by a test (two simultaneous updates → `DbUpdateConcurrencyException`).
- **No existing table or column was altered**: `Orders` gained no column and no navigation property (test asserts it).
- Settings flags are rows in the existing `WebsiteSettings` (`delhivery_mode`, `delhivery_auto_create`, group `shipping`), created on first save; audit rows go to the existing `ActivityLogs`.

### 3.1 Entities and relationships
```
Orders 1 ──< Shipments 1 ──< ShipmentTrackingEvents
Users  1 ──< Shipments           (CreatedByUserId, nullable)
```
| FK | Delete behaviour | Why |
|---|---|---|
| `Shipments.OrderId → Orders` | **RESTRICT** (PostgreSQL error 23001) | an order with shipments cannot be deleted |
| `ShipmentTrackingEvents.ShipmentId → Shipments` | **RESTRICT** | tracking history is never removed with a shipment |
| `Shipments.CreatedByUserId → Users` | SET NULL | removing an admin account keeps the shipment |
No cascade exists on either table (asserted against the model and against PostgreSQL's catalogue).

### 3.2 Constraints and indexes
| Name | Definition | Purpose |
|---|---|---|
| `UX_Shipments_Order_Open` | UNIQUE (`OrderId`) WHERE `CreationState IN ('IN_FLIGHT','CREATED','UNKNOWN') AND Status NOT IN ('CANCELLED','RTO_DELIVERED')` | one open shipment per order → idempotent creation |
| `UX_Shipments_Mode_ClientOrderRef` | UNIQUE (`Mode`,`ClientOrderRef`) | same reference never sent twice to one environment |
| `UX_Shipments_Mode_Awb` | UNIQUE (`Mode`,`Awb`) WHERE `Awb IS NOT NULL` | no duplicate AWB |
| `IX_Shipments_Poll` | (`NextCheckAt`) WHERE `CreationState='CREATED' AND IsFinal=false` | the worker's future work list |
| `IX_Shipments_Order_CreatedAt`, `IX_Shipments_CreatedByUserId` | non-unique | history lookups, FK |
| `UX_ShipmentTrackingEvents_Shipment_Hash` | UNIQUE (`ShipmentId`,`EventHash`) | duplicate scans stored once |
| `IX_ShipmentTrackingEvents_Shipment_ScanTime` | (`ShipmentId`,`ScanTime` DESC) | timeline reads |
| `CK_Shipments_Mode` | `Mode IN ('test','live')` | invalid mode rejected |
| `CK_Shipments_CreationState` | `IN ('IN_FLIGHT','CREATED','FAILED','UNKNOWN')` | invalid state rejected |
| `CK_Shipments_Status` | the 9 customer-facing categories | |
| `CK_Shipments_AwbWhenCreated` | `CreationState <> 'CREATED' OR Awb IS NOT NULL` | a created shipment always has an AWB |
| `CK_ShipmentTrackingEvents_Source` / `_MappedStatus` | `('poll','webhook')` / the 9 categories | |
One EF pitfall found and fixed: declaring two indexes on the same single column made EF merge them and **drop the approved name `UX_Shipments_Order_Open`**; the second index now has a different column set, and a test pins the unique index's name and filter.

## 4. Migration SQL review
### 4.1 How it was produced
`dotnet ef migrations add AddShipmentTracking` (design-time only, scratch connection string – no database contacted) generated a 593-line migration that also contained the baseline drift: **27 `AddColumn` operations and 7 legacy `CreateTable`s**, plus an `xmin` column (a system column that PostgreSQL would reject). It was **hand-trimmed to 156 lines**: only the two `CreateTable`s and their 8 `CreateIndex`es remain; `Down` only drops the two tables. File: `Migrations/20261109091756_AddShipmentTracking.cs` (+ generated Designer and updated snapshot).
The updated model snapshot necessarily records the legacy entities too (+589 generated lines, 0 removed) – that is only EF's description of the model; **no SQL for them is in the migration**. Consequence documented in §11: the legacy tables remain outside migration control.
### 4.2 Deployment SQL (reviewed line by line)
Generated with `dotnet ef migrations script 20261007101057_AddCouponCodeToCart AddShipmentTracking` – i.e. starting after the 4th migration so the already-present `AppliedCouponCode` column is not re-added. Saved as `docs/delhivery/evidence-stage-2-2/AddShipmentTracking.reviewed.sql` (78 lines). Review result:
- `START TRANSACTION … COMMIT` – all or nothing.
- Exactly two `CREATE TABLE` (`Shipments`, `ShipmentTrackingEvents`); 8 `CREATE [UNIQUE] INDEX`, all on those two tables.
- **No** `ALTER`, `DROP`, `UPDATE`, `DELETE`, `TRUNCATE`, no `xmin`.
- Foreign keys reference only `Orders`, `Users`, `Shipments` (existing tables are only *referenced*).
- One data statement: `INSERT INTO "__EFMigrationsHistory"` for this migration.
- Types are PostgreSQL-native: `uuid`, `character varying(n)`, `timestamp with time zone`, `date`, `boolean`, `integer`, `text[]` (`DEFAULT ('{}')`).
- Also asserted by an automated test that generates the script in-process and checks the same rules.

## 5. Schema comparison on a restored backup (evidence: `evidence-stage-2-2/migration-check-output.txt`)
Disposable local database restored from `D:\Backups\uat-db\uat_ecommerce_db_before_migration_20261103-072150.dump` (832,458 bytes), then:
| Check | Result |
|---|---|
| Tables before → after | 39 → **41**: only `Shipments` and `ShipmentTrackingEvents` added |
| Data of every existing table (row count + MD5 of all rows, 38 tables, 19,961 rows) | **identical** before and after |
| `__EFMigrationsHistory` | 3 rows → 4 (only the new migration added) |
| Schema (`pg_dump -s`) | **0 lines removed, 66 added**; every added statement is a `CREATE TABLE/INDEX` or `ADD CONSTRAINT` on the two new tables |
| Script execution | exit 0 with `ON_ERROR_STOP` |
| **Down** (drop both tables + history row) | schema, data and history **identical to the original** |
| Cleanup | disposable database dropped |
Additionally every xUnit database test that touches the shipment tables runs on tables created by this same migration SQL (not by the model).
Not done by design: `Database.Migrate()` is not called anywhere; no start-up DDL was added; nothing was applied to production.

## 6. Delhivery configuration service
`IDelhiveryConfigService` / `DelhiveryConfigService` (`Interfaces/…`, `Services/…`), registered in `ServiceExtensions.cs`; Razorpay classes untouched.
| Item | Implementation |
|---|---|
| Mode | `WebsiteSettings` key `delhivery_mode`; **default `test`**; any value other than `live` reads as `test` |
| Test environment | base URL `https://staging-express.delhivery.com`, token from env `Delhivery__ApiTokenTest` (config key `Delhivery:ApiTokenTest`) |
| Live environment | base URL `https://track.delhivery.com`, token from env `Delhivery__ApiToken` |
| Pickup location | `Ganpati Herbal Ayurveda` (config `Delhivery:PickupLocation`, default the same exact string) |
| Defaults | `AutoCreateShipment` = false (`delhivery_auto_create`), `EnableWebhook` = false (`Delhivery:EnableWebhook`) |
| Non-secret config added | `appsettings.json` → `"Delhivery": { BaseUrlTest, BaseUrlLive, PickupLocation, EnableWebhook:false }` – **no token keys** |
| Credentials object | `DelhiveryCredentials` (server memory only); its `ToString()` prints no token |
| Secrets | blank/whitespace token = "not configured"; tokens are never stored in PostgreSQL, source, frontend, Git, logs, audit rows or API responses |
| **SetMode** | validates `test`/`live`; **rejects `live` when the live token is missing** (and logs `DelhiveryModeChangeRejected`); otherwise, in one transaction: saves the mode, **forces `delhivery_auto_create = false`**, writes an `ActivityLogs` row (`DelhiveryModeChanged`, `UserId`, `IpAddress`, `UserAgent`, description "`test -> live; automatic shipment creation forced off`"); switching back to test is always allowed |
| Razorpay | `razorpay_mode` row and Razorpay services are not read or written by any of this |
No Delhivery HTTP call exists in the code base.

## 7. Authorization and API
`Controllers/v1/ShipmentsController.cs` (new; only two actions, both `[Authorize(Roles = "SuperAdmin")]`):
| Method | Route | Returns |
|---|---|---|
| GET | `/api/v1/shipments/delhivery/mode` | `{ mode, testConfigured, liveConfigured, pickupLocation, activeBaseUrl, autoCreateShipment, webhookEnabled }` – booleans/non-secret values only |
| PUT | `/api/v1/shipments/delhivery/mode` `{ "mode": "test"\|"live" }` | same DTO + message; 400 for an invalid mode or live without token |
Verified over real HTTP against the built API: anonymous → 401; ordinary customer → 403 (read **and** change); SuperAdmin → 200; refused calls leave the database unchanged; neither response bodies nor the API process's console output contain either (fake) token.

## 8. Admin settings UI
`admin/settings/admin-settings.component.ts`: new tab **"Shipping (Delhivery)"** next to the existing "Shipping" tab, built like the Razorpay card (same classes/components): Test/Live toggle with a confirmation before Live; shows *Test credentials: configured/not configured*, *Live credentials: …*, *Pickup location*, *Automatic shipment creation: Disabled*, and a notice when the live token is missing. **No token, token fragment or control to enable automatic creation exists.** The admin area is SuperAdmin-only (existing `adminGuard`) and the endpoints enforce the role. Razorpay code in the same file is unchanged. Browser check on a local copy (fake test token only): the tab shows TEST, test configured, live not configured, pickup location, automatic creation Disabled and the live-token notice (screenshot: `evidence-stage-2-2/admin-settings-shipping-delhivery-tab.jpg`). The Live toggle's confirmation dialog was not clicked in the browser (a native dialog can block the automation); the live-rejection path is covered by the API test.

## 9. Database-backed shipment guard
`Services/ShipmentOrderGuard.cs` replaces `NullOrderShipmentGuard` (file deleted; DI now `IOrderShipmentGuard → ShipmentOrderGuard`). It answers "does an open shipment own this order?" with `ShipmentRules.IsOpen` – **the same definition as the unique index's filter**; a test runs all 36 combinations of creation state × status and checks that the C# rule, the guard's SQL and the unique index agree.
| Shipment state | Owns the order? |
|---|---|
| none | no |
| IN_FLIGHT (creation in progress) | **yes** |
| CREATED (any non-final status, incl. DELIVERED) | **yes** |
| UNKNOWN | **yes** (until reconciled) |
| FAILED | no |
| CREATED + CANCELLED | no |
| CREATED + RTO_DELIVERED | no |
Effect (Stage 2.1 rules now live): with an open shipment, ordinary cancellation (customer **and** admin), manual Shipped/Delivered and manual tracking-number edits return **409**; after the shipment is cancelled the order can be cancelled again with stock restored once (test).

## 10. Tests and results
`dotnet test` → **238 passed, 0 failed** (142 Stage 2.1 + 96 new). Frontend `ng build` OK; backend build 0 warnings, 0 errors.
| Class | Tests | Covers |
|---|---|---|
| Stage 2.1 classes (`OrderRulesTests` 58, `OrderServiceTests` 63, `OrderApiSecurityTests` 16, `GuestTrackingRateLimitTests` 1, `RazorpayVerificationTests` 4) | 142 | unchanged behaviour (they now run with the real guard); **all still pass** |
| `ShipmentModelTests` | 4 | entity configuration: tables, uuid keys, no cascade FKs, index names/uniqueness/filters, check constraints, xmin token, `Orders` untouched |
| `ShipmentMigrationTests` | 2 | script creates only the two tables, no ALTER/DROP/data change, FKs only to Orders/Users/Shipments, only history INSERT; tables/indexes/checks/FK delete rules exist in PostgreSQL's catalogue |
| `ShipmentConstraintTests` | 24 | second open shipment rejected; allowed after FAILED / CANCELLED / RTO_DELIVERED; duplicate AWB per mode (allowed in the other mode, NULLs allowed); duplicate client reference; invalid mode (3 values), invalid creation state (3), invalid status, CREATED without AWB; duplicate tracking event (and allowed on another shipment); invalid event source/mapped status; shipment↔order↔events relationships and defaults; order with shipment and shipment with events **cannot be deleted**; deleting the creating admin keeps the shipment; concurrent updates detected |
| `ShipmentGuardTests` | 47 | the 8 named guard cases (none / in progress / created / unknown / failed / cancelled / RTO delivered …); all 36 state×status combinations agree with the unique index; another order's shipment does not leak; guard inside `OrderService` blocks cancel + manual changes and releases after cancellation |
| `DelhiveryConfigServiceTests` | 15 | defaults (test, auto-create off, webhook off, staging URL, pickup location); test/live URL+token; missing/blank tokens; invalid modes rejected with no change/log; live refused without token (+ rejection log); change forces auto-create off; audit log fields (user, IP, user agent, previous→new); Razorpay row not touched (not even re-saved); no token in DTO / credentials text / audit log / settings |
| `DelhiveryModeApiTests` | 3 | HTTP: 401/403/200 rules, refused calls change nothing, switch + audit rows naming the admin, **no token in any response or in the API's console output**, Razorpay mode response identical before/after |
| `DelhiveryLiveWithoutTokenApiTests` | 1 | HTTP: live refused (400), mode stays test, rejection logged |
Eleven of my first-run assertions failed because of test mistakes (check constraints must be read from the design-time model; `confdeltype` needed a cast; my "no DELETE" assertion matched `ON DELETE RESTRICT`; the audit tests used a non-existent user id which the FK correctly rejected; an invalid `Source` value was longer than the column; PostgreSQL reports a restrict-type FK as error 23001, not 23503). All were corrected in the tests – **no application change was needed**, and no test was weakened.
Not tested (out of scope): any Delhivery behaviour. All tokens in tests are fake (`FAKE-…`).

## 11. Files
**Added (backend, 9):** `Entities/Shipment.cs` (both entities), `Common/ShipmentRules.cs`, `Data/Configurations/ShipmentConfiguration.cs`, `Interfaces/IDelhiveryConfigService.cs`, `Services/DelhiveryConfigService.cs`, `Services/ShipmentOrderGuard.cs`, `Controllers/v1/ShipmentsController.cs`, `DTOs/Shipments/DelhiveryDtos.cs`, `Migrations/20261109091756_AddShipmentTracking.cs` + `.Designer.cs`.
**Modified (backend, 4):** `Data/AppDbContext.cs` (+2 DbSets), `Extensions/ServiceExtensions.cs` (guard registration + config service), `Migrations/AppDbContextModelSnapshot.cs` (generated), `appsettings.json` (+6 lines, non-secret `Delhivery` section).
**Removed (1):** `Services/NullOrderShipmentGuard.cs` (my own Stage 2.1 placeholder).
**Frontend (1):** `admin/settings/admin-settings.component.ts` (+89/−2: tab, state, load/change methods, card).
**Tests (new/changed):** added `ShipmentDatabaseTests.cs`, `DelhiveryConfigTests.cs`; small changes to `Support/{TestDatabase,ApiHost,Seed}.cs`, `OrderApiSecurityTests.cs` (fixture hook), `OrderServiceTests.cs`, `RazorpayVerificationTests.cs` (guard constructor).
**Docs:** this report + `evidence-stage-2-2/` (reviewed SQL, migration-check output, UI screenshot).
Diff verification: all changes confirmed by file-tree diff against the pre-Stage-2.1 and pre-Stage-2.2 snapshots. **Unchanged (byte-identical):** `PaymentService.cs`, `PaymentsController.cs`, `RazorpayConfigService.cs`, `IRazorpayConfigService.cs`, `SettingsService.cs`, `AuthService.cs`, `EmailService.cs`, `OrderService.cs` and `OrdersController.cs` (relative to the end of Stage 2.1). Housekeeping: my Python-based edits had converted LF line endings to CRLF in 12 files (visible as whole-file diffs); I restored the original line endings, so diffs show only real changes, and re-ran build and all tests afterwards.

## 12. Unresolved migration risks
| # | Risk | Status |
|---|---|---|
| 1 | **Baseline drift remains.** The model snapshot/designer describe 7 legacy tables and 12+ extra columns that the live database does not have; the migration deliberately ignores them. A *future* `migrations add` will therefore not re-emit them, and EF's idea of the schema differs from live. | Documented; needs a separate decision (either formally baseline them or remove them from the model) before more migrations. |
| 2 | **Start-up DDL in `Program.cs` still exists** and would create those legacy objects when a newer image starts against the live database (not part of this migration; not extended). | Open; must be handled when the new image is deployed. |
| 3 | Live `__EFMigrationsHistory` lacks the 4th migration. The reviewed script starts *after* it; applying EF's default "update to latest" or a script from the beginning on production would fail. | Mitigated by using only the reviewed script; production application needs its own approval and a backup. |
| 4 | The test used a UAT backup from 3 Nov; the live database has since gained 4 orders and other rows. Schema risk is low (the script only creates new tables referencing `Orders`/`Users`) but a final rehearsal on a fresh copy of the live schema should precede production. | Open (requires your approval to take a fresh read-only dump). |
| 5 | `Shipments`/events tables are empty and unused until Stage 2.3+. Rolling back = run the Down statements (verified). | Fine. |

## 13. Confirmations
- **Production was untouched:** no connection to the live server, no read or write on the live database, no migration run there, no deployment, no change to environment variables, configuration, containers or Razorpay settings.
- **Delhivery was untouched:** no Delhivery API call of any kind, no shipment created, the existing live token was never viewed, copied, generated or rotated, no token exists in any file (only fake `FAKE-…` strings inside tests).
- **Razorpay was not modified** (files byte-identical; `razorpay_mode` row verified unchanged by service and HTTP tests).
- All databases used were on `localhost:5433` (disposable test/restore databases, all dropped; the local `uat_exact` copy was used for the browser check). The browser's temporary admin session was cleared and the local servers stopped.
- Stopping here. **Stage 2.3 has not been started and awaits your explicit approval.**
