# 06 – Delhivery Database Design (PROPOSAL – no migration created, no database touched)
Date: 2026-11-09 · Companion to `05_DELHIVERY_STAGE_2_IMPLEMENTATION_PLAN.md`.
Conventions followed (from `03_DATABASE_AUDIT.md` and `Entities/*.cs`): PascalCase table/column names, `uuid` primary keys, `BaseEntity` columns (`Id`, `CreatedAt`, `UpdatedAt`, `IsActive`), integers/text for statuses, PostgreSQL 18.4.

## 1. Scope – deliberately minimal
| Need | Solution | New table? |
|---|---|---|
| Shipment record | `Shipments` | **yes** |
| Tracking history | `ShipmentTrackingEvents` | **yes** |
| Mode flag `delhivery_mode`, auto-create flag | existing `WebsiteSettings` key/value rows (`delhivery_mode`=`test`, `delhivery_auto_create`=`false`, group `shipping`) – rows are created at first save by the same `SettingsService.SetSettingValueAsync` the Razorpay switch uses; default when missing = `test` / `false` | no |
| Audit of mode changes and shipment actions | existing `ActivityLogs` (0 rows today, nothing writes it) | no |
| Order ↔ AWB compatibility | existing `Orders.TrackingNumber` kept as a mirror of the active shipment's AWB; `ShippedAt/DeliveredAt` unchanged | no |
Not created (out of scope for Stage 2): `ShipmentItems`, `PickupRequests`, `ShipmentReturns`, `CourierApiLogs`, `OrderTrackingTokens`, `EmailOutbox`, `OrderStatusHistory`, product weight/dimension columns. Consequences accepted: one shipment covers the whole order; API failures are summarised on the shipment row (and in `ActivityLogs` / Serilog), not in a request log table; weight comes from configuration; e-mail has no outbox.

## 2. Proposed schema
### 2.1 `Shipments`
| Column | Type | Null | Default / rule | Purpose |
|---|---|---|---|---|
| Id | uuid | NO | PK | |
| OrderId | uuid | NO | FK → `Orders(Id)` **ON DELETE RESTRICT** | an order with shipments cannot be deleted |
| Mode | text | NO | CHECK in (`test`,`live`) | which Delhivery environment created it; test shipments never mix with live |
| CourierName | text | NO | `'Delhivery'` | shown to customers |
| ClientOrderRef | text | NO | | the value sent as Delhivery's `order` field (unique per order). First shipment = `OrderNumber`; a re-created shipment after a cancelled/failed-final one = `OrderNumber-2`, `-3`… |
| CreationState | text | NO | CHECK in (`IN_FLIGHT`,`CREATED`,`FAILED`,`UNKNOWN`) | request lifecycle; see §4 |
| CreateAttempts | int | NO | 0 | number of create requests actually sent |
| Awb | text | YES | required when `CreationState='CREATED'` (CHECK) | Delhivery waybill |
| CreateResponseRef | text | YES | identifiers only (e.g. Delhivery's reference id – **exact field to be confirmed from a real response**) | "creation response reference, where safe" – never the full body |
| Status | text | NO | `'CREATED'` | customer-facing category (`07_…`): CREATED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RTO_IN_TRANSIT, RTO_DELIVERED, CANCELLED, NEEDS_REVIEW |
| DelhiveryStatus | text | YES | | latest raw Delhivery `Status` |
| DelhiveryStatusType | text | YES | | latest raw type (`UD`/`RT`/`DL`/`PP`/`PU`/`CN`) |
| ExpectedDeliveryDate | date | YES | only if Delhivery supplies it | never invented |
| TrackingUrl | text | YES | only if supplied/documented | never invented |
| IsFinal | boolean | NO | false | true when Status ∈ {DELIVERED, RTO_DELIVERED, CANCELLED}; the poller skips final rows |
| LastEventAt | timestamptz | YES | | scan time of the newest Delhivery event ("last tracking update") |
| LastCheckedAt | timestamptz | YES | | last successful poll |
| NextCheckAt | timestamptz | YES | | back-off scheduling |
| TrackFailureCount | int | NO | 0 | consecutive polling failures (for back-off) |
| LastError | text | YES | ≤ 500 chars, sanitised, **no secrets / no personal data** | admin-readable API error |
| LastErrorAt | timestamptz | YES | | |
| NotifiedStatuses | text[] | NO | `'{}'` | categories already e-mailed to the customer (duplicate-notification guard) |
| CreatedByUserId | uuid | YES | FK → `Users(Id)` ON DELETE SET NULL | admin who pressed Create |
| CreatedAt / UpdatedAt / IsActive | | | `BaseEntity` | |
| Version | xmin (uint) | – | concurrency token (`UseXminAsConcurrencyToken`) | prevents two requests updating the same shipment silently |

**Constraints and indexes**
1. `PK_Shipments (Id)`.
2. **`UX_Shipments_Order_Open` – UNIQUE (OrderId) WHERE `CreationState IN ('IN_FLIGHT','CREATED','UNKNOWN') AND Status NOT IN ('CANCELLED','RTO_DELIVERED')`** → at most one *open* shipment per order. This is what makes creation idempotent at the database level: a double click or two admins cannot both insert; the second gets a unique-violation and is told the shipment already exists. A `FAILED` row does not block retry; a cancelled/RTO-delivered shipment does not block creating a replacement.
3. `UX_Shipments_Mode_ClientOrderRef` – UNIQUE (Mode, ClientOrderRef) → the same reference can never be sent twice to the same environment (also Delhivery's "order id must be unique" rule).
4. `UX_Shipments_Mode_Awb` – UNIQUE (Mode, Awb) WHERE Awb IS NOT NULL → duplicate AWB prevention.
5. `IX_Shipments_Poll` – (NextCheckAt) WHERE `CreationState='CREATED' AND IsFinal=false` → the worker's work list.
6. `IX_Shipments_OrderId` – (OrderId).
7. CHECKs: `Mode in ('test','live')`; `CreationState in (...)`; `CreationState <> 'CREATED' OR Awb IS NOT NULL`.

### 2.2 `ShipmentTrackingEvents` (actual Delhivery scans only – nothing synthesised)
| Column | Type | Null | Rule |
|---|---|---|---|
| Id | uuid | NO | PK |
| ShipmentId | uuid | NO | FK → `Shipments(Id)` **ON DELETE RESTRICT** (history preserved) |
| StatusType | text | YES | raw Delhivery type (`UD`,`RT`,`DL`,`PP`,`PU`,`CN`) |
| Status | text | NO | raw Delhivery status text (e.g. `In Transit`, `Dispatched`) |
| ScanCode | text | YES | NSL / scan code if supplied (e.g. `EOD-…`) |
| Location | text | YES | scan location if supplied |
| ScanTime | timestamptz | YES | Delhivery's scan timestamp if supplied |
| Description | text | YES | Delhivery's instruction/remarks text if supplied |
| MappedStatus | text | NO | category computed at insert time (`07_…`) – kept so the mapping used is auditable |
| EventHash | text | NO | SHA-256 hex of `StatusType|Status|ScanCode|ScanTime|Location` |
| Source | text | NO | `poll` (later `webhook`) |
| CreatedAt | timestamptz | NO | when we stored it |
**Constraints:** `PK`; **`UX_ShipmentTrackingEvents_Shipment_Hash` UNIQUE (ShipmentId, EventHash)** → duplicate events (re-polls, later webhooks) are silently ignored (`INSERT … ON CONFLICT DO NOTHING` semantics via EF unique-violation handling); `IX_ShipmentTrackingEvents_Shipment_ScanTime` (ShipmentId, ScanTime DESC).
Raw API bodies are **not stored** (they may contain consignee personal data); only the fields above are kept.

## 3. Relationships
```
Orders 1 ──< Shipments 1 ──< ShipmentTrackingEvents
Users  1 ──< Shipments (CreatedByUserId, nullable)
WebsiteSettings: delhivery_mode, delhivery_auto_create      (key/value, unchanged table)
ActivityLogs:    audit rows for mode changes and shipment actions (unchanged table)
Orders.TrackingNumber  = mirror of Shipments.Awb of the open shipment (written by the shipment service only)
```
Deletion behaviour: nothing cascades; shipments and events can only disappear by explicit, deliberate deletion (none is planned).

## 4. State handling
`CreationState`: `IN_FLIGHT` (row reserved, request being sent) → `CREATED` (AWB stored) | `FAILED` (Delhivery definitely rejected – nothing exists at Delhivery, retry allowed, `CreateAttempts` kept) | `UNKNOWN` (timeout / connection lost / unparseable answer – **never auto-retried**; reconciliation required). A row stuck in `IN_FLIGHT` for more than a few minutes (process crash) is treated as `UNKNOWN` by the next admin action. The unique index above guarantees only one of them can be open.
`Status` only moves forward by rank (CREATED < PICKED_UP < IN_TRANSIT < OUT_FOR_DELIVERY < DELIVERED), except the branches RTO_* and CANCELLED; an older scan can never overwrite a newer status (events are always stored, the shipment summary is recomputed from the newest `ScanTime`).

## 5. Migration and baseline strategy (no migration has been created)
**Facts found (read-only):**
- `Migrations/` has 4 migrations; live `__EFMigrationsHistory` has 3 (missing `20261007101057_AddCouponCodeToCart`, whose column `Carts.AppliedCouponCode` exists on live only because start-up DDL added it).
- The model snapshot contains `ReturnRequest`, `Referral`, `ConsultationRequest`, … but **not** `State`, `PromoOffer`, `PaymentOption`, `OrderItemTracking`, `OrderPickup`, `CouponProduct`, `CouponCategory`, `LegacyImportArchive`, nor the 12 extra `OrderItems` columns that the current source model and the start-up DDL contain. None of those exist in the live DB.
- Therefore `dotnet ef migrations add` on the current model would emit unrelated CREATE/ALTER statements, and an idempotent script from the start would try to re-add `AppliedCouponCode` on production and fail.
**Plan:**
1. Generate the migration `AddShipmentTracking`, then **hand-trim** `Up`/`Down` to the two shipment tables, indexes and constraints (the snapshot is allowed to carry the legacy entities – they are not our change and are out of migration control until a separate, approved decision).
2. Produce the SQL with `dotnet ef migrations script 20261007101057_AddCouponCodeToCart AddShipmentTracking` (never `--idempotent` from zero, never `database update`/`Migrate()`), and review it line by line.
3. Test on a **disposable local PostgreSQL database restored from an existing backup** (local server on :5433): record `information_schema` before/after → the only differences must be the two new tables and their indexes/constraints; run row-count comparison of all 39 existing tables.
4. A unit test asserts the generated script mentions no table other than `Shipments`/`ShipmentTrackingEvents`/`__EFMigrationsHistory`.
5. Start-up DDL in `Program.cs` is **not** extended; EF migrations are **not** auto-applied by the application.
6. Production application = run the reviewed script by hand after a verified backup, plus insert the history rows – **separate, explicit approval; not part of Stage 2.**

## 6. Risks / confirmations
| Item | Status |
|---|---|
| Delhivery's reference field name returned by create (for `CreateResponseRef`) | to confirm from a real response sample |
| Whether the tracking response carries expected delivery date / tracking URL | to confirm; columns stay NULL otherwise |
| `ScanTime` time zone of Delhivery timestamps (stored as UTC after confirmation) | to confirm |
| Partial unique index semantics with EF Core 8 / Npgsql 8.0.10 | supported (`HasIndex(...).HasFilter(...)`); verified in the migration test |
| One shipment per order only (no partial/multi-box) | accepted for Stage 2 |
