# 03 – Database Audit
Phase 1 – read-only audit before the Delhivery integration · Audit date: 2026-11-09

**Labels:** EXISTING · PARTIALLY IMPLEMENTED · MISSING · ISSUE · PROPOSED
Method: only `SELECT` statements against `information_schema`, `pg_catalog`, `pg_indexes`, `pg_constraint`, `pg_extension` and aggregate `count(*)` queries on the live database `ecommerce_db` (container `sidham-uat-postgres-uat-1`). No INSERT/UPDATE/DELETE/DDL, no stored procedure executed (there are none), no personal data selected (only counts, enums and non-identifying order numbers/dates/amounts). The source side comes from `backend/EcommerceApp/Entities/*.cs`, `Data/AppDbContext.cs` and `Program.cs`.
No passwords, tokens or keys appear in this document.

## 1. Database architecture (EXISTING)
| Item | Finding |
|---|---|
| Name / engine | `ecommerce_db`, PostgreSQL **18.4** (musl/Alpine build), single schema `public` |
| Tables | **39** base tables (listed in §2) |
| Views | **0** |
| Stored procedures / user functions | **0** of the application's own. The only functions in `public` are the 41 `dblink_*` functions of the **`dblink` extension (v1.2)** |
| Triggers | **0** |
| Enum types | **0** – statuses are stored as integers and mapped in C# (`Common/Enums.cs`) |
| Extensions | `plpgsql 1.0`, `dblink 1.2` – ISSUE (Medium, security hygiene): `dblink` lets SQL open connections to other databases; it is not used by the application. Its origin on the live DB is not documented in the source (not created by `Program.cs`); it should be explained and, with approval, removed in a maintenance window (I did not touch it). |
| Schema management | ISSUE – schema is created by `EnsureCreated()` plus hand-written `ALTER/CREATE … IF NOT EXISTS` blocks executed at every API start-up (`Program.cs` ≈ lines 196-340). `__EFMigrationsHistory` lists only 3 migrations (`InitialBaseline`, `AddTrustPageContent`, `AddGuestInfoToCart`) and does not describe the real schema. No versioned, reviewable migrations. |
| Source ahead of live | ISSUE – source start-up DDL would add `OrderItems.{ItemStatus,CancelReason,ShipmentId,PickupId,CouponCode,CouponDiscount,TransactionId,PaymentDate,RefundId,RefundAmount,RefundReason,RefundStatus}`, `Users`/`Addresses`/`Coupons`/`Banners`/`Products` columns and tables `States, PromoOffers, PaymentOptions, OrderItemTrackings, OrderPickups, CouponProducts, CouponCategories, LegacyImportArchive` – **none of these exist in the live DB today** (live `OrderItems` has 16 columns, no `ShipmentId`). |
| Primary keys | every table has a `uuid` primary key named `PK_<Table>` |
| Common columns | `Id uuid`, `CreatedAt timestamptz NOT NULL`, `UpdatedAt timestamptz NULL`, `IsActive boolean NOT NULL` (soft-delete flag; `BaseEntity`) |

## 2. Tables and live row counts (exact `count(*)`, 2026-11-09)
ActivityLogs 0 · Addresses 0 · Banners 5 · BlogPosts 2 · CartItems 12 · Carts 16 · Categories 4 · ConsultationRequests 1 · ContactMessages 4 · Coupons 0 · Faqs 16 · GalleryImages 1 · LoginHistories 24 · Newsletters 1 · **OrderItems 13** · **Orders 9** · **Payments 0** · ProductImages 25 · ProductVariants 0 · ProductViews 20 535 · Products 25 · PromotionHeaders 0 · Quiz* 0 · Referrals 0 · **ReturnRequests 0** · Reviews 0 · **ShippingConfigs 0** · StaticPages 6 · **TaxConfigs 0** · Testimonials 8 · TrustPageContents 0 · **Users 5** (3 customers, 2 SuperAdmins) · VisitorLogs 0 · WebsiteSettings 0 · Wishlists 0 · `__EFMigrationsHistory` 3.

## 3. Relationships (all 29 foreign keys on live; order-related ones in bold)
**Orders.UserId → Users (ON DELETE SET NULL)** · **Orders.CouponId → Coupons (SET NULL)** · **OrderItems.OrderId → Orders (CASCADE)** · **OrderItems.ProductId → Products (CASCADE)** · **Payments.OrderId → Orders (CASCADE)** · **ReturnRequests.OrderId → Orders (CASCADE)** · ReturnRequests.UserId → Users (no action) · Carts.UserId → Users · CartItems.CartId → Carts (CASCADE) · CartItems.ProductId → Products (CASCADE) · Addresses.UserId → Users (CASCADE) · Products.CategoryId → Categories (SET NULL) · ProductImages/ProductVariants/ProductViews/Reviews/Wishlists → Products (CASCADE) · Reviews/Wishlists/LoginHistories/Referrals → Users … (full list: `pg_constraint`, contype `f`).
No `CHECK` constraints and no `UNIQUE` constraints other than unique **indexes** (below).

### Integrity problems (ISSUE)
1. **`OrderItems.ProductId → Products ON DELETE CASCADE`** – deleting a product physically deletes that product's lines from historical orders (order totals would then no longer match their items). Should be `RESTRICT` (products already have an `IsActive` soft flag).
2. **`Orders.UserId ON DELETE SET NULL`** – deleting a user turns their orders into anonymous orders that have **no** `GuestEmail/GuestPhone` (those are only filled for guest checkouts) → customer contact lost, tracking/e-mail impossible.
3. **`Orders → Payments ON DELETE CASCADE`** – deleting an order erases its payment records (financial audit trail).
4. No `CHECK (Quantity > 0)`, `CHECK (StockQuantity >= 0)`, no unique on `Payments.RazorpayPaymentId` / `Orders.RazorpayOrderId` (duplicate payment rows possible).
5. `Carts.ConvertedOrderId` has no foreign key; `OrderItems.VariantId` has no foreign key to `ProductVariants`.
6. `ReturnRequests` has no unique per order at DB level (the API checks `AnyAsync` – race possible).

### Indexes on order tables (EXISTING)
`Orders`: PK, **unique `IX_Orders_OrderNumber`**, `IX_Orders_CreatedAt`, `IX_Orders_Status`, `IX_Orders_PaymentStatus`, `IX_Orders_UserId`, `IX_Orders_CouponId`. `OrderItems`: PK, `OrderId`, `ProductId`. `Payments`: PK, `OrderId`. `ReturnRequests`: PK, `OrderId`, `UserId`. `Users`: PK, **unique `IX_Users_Email`**, `IsActive`, `Role`. `Carts`: PK, `UserId`.
MISSING indexes: `Orders.GuestEmail`, `Orders.GuestPhone` (needed for guest tracking lookups), `Orders.TrackingNumber`, `Orders.RazorpayOrderId`, `Carts.SessionId`, `Payments.RazorpayPaymentId`.

## 4. Order-related tables – columns (live metadata). Legend: `!` = NOT NULL, PK = primary key
### 4.1 `Orders` (EXISTING, 46 columns)
| Column | Type | Null | Notes |
|---|---|---|---|
| **Id** (PK) | uuid | ! | |
| OrderNumber | varchar | ! | unique index; format `ORD-yyyyMMdd-XXXXXX` |
| UserId | uuid | | FK Users (SET NULL); null = guest |
| GuestEmail / GuestPhone / GuestName | text | | filled for guest orders only (4 of 4 live guest orders have all three) |
| Status | int | ! | 1 Pending, 2 Confirmed, 3 Shipped, 4 Delivered, 5 Cancelled, 6 Returned |
| PaymentStatus | int | ! | 1 Pending, 2 Paid, 3 Failed, 4 Refunded, 5 PartialRefund |
| PaymentMethod | int | ! | 1 Razorpay, 2 COD |
| RazorpayOrderId / RazorpayPaymentId / RazorpaySignature | text | | |
| SubTotal, DiscountAmount, ShippingCharge, TaxAmount, TotalAmount | numeric | ! | `Total = Sub + Tax + Shipping − Discount` (checked: 0 of 9 live orders violate this) |
| CouponId / CouponCode | uuid / text | | |
| Notes | text | | customer note |
| **TrackingNumber** | text | | free text – only shipping-related data besides the two dates |
| ShippedAt, DeliveredAt, CancelledAt | timestamptz | | |
| CancellationReason | text | | |
| RefundStatus | int | ! | 0 NotRequested … 4 Rejected |
| RefundId | text | | |
| Shipping{FullName,Phone,Line1,Line2,City,State,PostalCode,Country} | text | ! except Line2 | address **snapshot** |
| Billing{…same 8…} | text | ! except Line2 | billing = copy of shipping in the current UI |
| CreatedAt / UpdatedAt / IsActive | | | |
Defaults: none at database level (EF supplies values) – ISSUE: raw SQL inserts would bypass defaults.

### 4.2 `OrderItems` (EXISTING, 16 columns)
`Id` PK · `OrderId` ! FK→Orders CASCADE · `ProductId` ! FK→Products CASCADE · `VariantId` uuid null (no FK) · `ProductName` ! · `VariantInfo` · `ProductImageUrl` · `Quantity` int ! · `UnitPrice` numeric ! (**list price**, not the charged price – ISSUE) · `DiscountAmount` ! · `TaxPercentage` ! · `TaxAmount` ! · `TotalPrice` ! (includes tax) · `CreatedAt` ! · `UpdatedAt` · `IsActive` !.
No item-level status, shipment id or refund fields exist on live (the source entity has them – see §1).

### 4.3 `Payments` (EXISTING, 18 columns, **0 rows**)
`Id` PK · `OrderId` ! FK→Orders CASCADE · `RazorpayOrderId` · `RazorpayPaymentId` · `RazorpayRefundId` · `Method` int ! · `Status` int ! · `Amount` numeric ! · `Currency` text ! · `RefundStatus` int ! · `RefundAmount` numeric · `PaidAt` · `RefundedAt` · `FailureReason` · `WebhookPayload` text · audit columns.
Evidence of the flow: 2 live orders have a `RazorpayOrderId` (payment started) but no payment was ever verified → **no online payment has ever completed in this database.**

### 4.4 Customers / guests
`Users` (20 columns, EXISTING): Id PK, Email (unique, !), PasswordHash !, FirstName/LastName !, Phone, Role int !, IsActive !, password-reset fields, `PasswordChangedAt`, audit columns. **Guest customers are not a table** – they are the `Guest*` columns on `Orders` (and `Carts.GuestName/Email/Phone`). PARTIALLY IMPLEMENTED.
`Addresses` (15 columns, 0 rows): UserId !, FullName, Phone, Line1/2, City, State, PostalCode, Country, AddressType, IsDefault. Shipping and billing addresses are **snapshots on Orders**, not references.

### 4.5 Cart
`Carts` (14 cols): UserId (FK), SessionId, Status int, AbandonedAt, ConvertedAt, ConvertedOrderId (no FK), GuestName/Email/Phone, AppliedCouponCode. `CartItems` (8 cols): CartId FK CASCADE, ProductId FK CASCADE, VariantId, Quantity. 16 carts / 12 items live.

### 4.6 Products / inventory
`Products` (38 columns): Id, Name, Slug, CategoryId, Sku, Price, DiscountPrice, **TaxPercentage**, **StockQuantity**, LowStockThreshold, SoldCount, PrescriptionRequired, … **no weight, length, breadth, height, HSN code** (query on live metadata). `ProductVariants` (10 cols, 0 rows): Name, Value, PriceAdjustment, StockQuantity, Sku. Inventory is a single integer; no stock movement ledger. ISSUE: no reservation concept – stock is decremented when the order is *created*, even for unpaid online orders.

### 4.7 Config / returns / email
`ShippingConfigs` (7 cols: ShippingCharge, FreeShippingAbove, FreeShippingEnabled) – **0 rows**; `TaxConfigs` (Name, Percentage, IsApplicable) – **0 rows** and not read by order creation. `WebsiteSettings` (key/value) – 0 rows. `ReturnRequests` (13 cols: OrderId FK, UserId FK, OrderNumber, CustomerName, CustomerEmail, Reason, Description, Status int, AdminNotes) – 0 rows. **Email notifications: no table** – nothing records which e-mail was sent/failed (MISSING). **Refunds / transactions: no separate tables** (refund fields on Orders/Payments only; MISSING). **Order status history: MISSING** (only the current status + 3 timestamps).

## 5. Existing order data flow (EXISTING – source: `Services/OrderService.cs` lines 89-216)
| Data | How it is stored |
|---|---|
| Order ID | new GUID (`BaseEntity`) |
| Order number | `ORD-{UTC yyyyMMdd}-{first 6 hex of a new GUID, upper}`; uniqueness only by index (collision → insert error, no retry) |
| Customer ID mapping | `UserId` = authenticated caller's id (never from request body) |
| Guest mapping | `GuestName/Email/Phone` on the order; matched to the cart through `X-Session-Id` header (not stored on the order) |
| Product details | server reads `Products` again; stores `ProductName`, image URL, quantity |
| Pricing | `unit = DiscountPrice ?? Price`; subtotal from unit; `OrderItems.UnitPrice` stores `Price` (list) |
| Tax | `unit × product.TaxPercentage / 100 × qty` (per line; `TaxConfigs` ignored) |
| Discount | coupon only (percentage with cap or fixed); `OrderItems.DiscountAmount` = list-vs-discount price difference |
| Shipping charges | `ShippingConfigs` first row: free above threshold else flat charge; 0 if no row (live: 0 rows → ₹0 on all 9 orders) |
| Payment reference | `RazorpayOrderId` (create-order) then `RazorpayPaymentId/Signature` (verify) on `Orders`, plus a `Payments` row after verification |
| Payment status | Pending → Paid by `VerifyPaymentAsync`; COD never changes |
| Order status | Pending → (Confirmed on verified payment) → admin sets Shipped/Delivered/Cancelled freely |
| Created timestamp | `CreatedAt` (UTC) |
| Modified timestamp | `UpdatedAt` – EXISTING: set automatically for modified entities in `AppDbContext.SaveChangesAsync` (`Data/AppDbContext.cs` ≈ line 82); raw SQL bypasses it |
| Stock | `Products.StockQuantity -= qty`, `SoldCount += qty` at creation; restored in `CancelAsync` only |
No transaction wraps these writes; no concurrency token; no idempotency key.

### Live data profile (counts only)
| Status | Payment | Method | Orders |
|---|---|---|---|
| Pending | Pending | Razorpay | 2 |
| Pending | Pending | COD | 4 |
| Cancelled | Pending | Razorpay | 1 |
| Cancelled | Pending | COD | 2 |
Guest orders 4, member orders 5; orders with a tracking number 0; shipped 0; totals consistent (0 mismatches); shipping postcodes all 6-digit; **2 orders with a shipping phone that is not 10 digits**; orders paid but without `Payments` row: 0. Order dates 2026-10-02 → 2026-11-09 (9 orders in 38 days).

## 6. Stored procedures and triggers (D)
**None exist** (0 procedures, 0 user functions besides `dblink`, 0 triggers, 0 views). All order creation, status updates, payment processing, inventory updates, cancellation and returns logic lives in the .NET services:
| Responsibility | Where |
|---|---|
| Create order / reduce inventory | `OrderService.CreateAsync` |
| Update order status | `OrderService.UpdateStatusAsync` |
| Cancel / restore inventory | `OrderService.CancelAsync` |
| Payment processing | `PaymentService.VerifyPaymentAsync` (+ stub `ProcessWebhookAsync`, `InitiateRefundAsync`) |
| Returns | `ReturnController` (direct `DbContext`, no service) |
| Reports | `DashboardService`, `OrderService.GetStatsAsync` (loads **all orders into memory**: `_db.Orders.ToListAsync()` – scalability ISSUE) |
Consequence: nothing in the database enforces a consistent order state; any writer (including future shipment code) must go through one service.

## 7. Can the existing structure support shipping? (E) – analysis
| # | Requirement | Existing support | Verdict |
|---|---|---|---|
| 1 | Courier partner | none | MISSING |
| 2 | AWB number | `Orders.TrackingNumber` (free text, one per order) | PARTIALLY – unusable for multi-shipment/splits |
| 3 | Shipment ID | none on live (`OrderItems.ShipmentId` exists only in source) | MISSING |
| 4 | Order ↔ shipment mapping | none (1 order = 1 text field) | MISSING |
| 5 | Shipment status | `Orders.Status` Shipped/Delivered/Returned only | PARTIALLY |
| 6 | Tracking events | none on live (`OrderItemTrackings` only in source) | MISSING |
| 7 | Pickup date | none | MISSING |
| 8 | Dispatch date | `Orders.ShippedAt` | PARTIALLY |
| 9 | Expected delivery date | none | MISSING |
| 10 | Actual delivery date | `Orders.DeliveredAt` | EXISTING |
| 11 | Courier response history | none | MISSING |
| 12 | Failed API attempts | none | MISSING |
| 13 | Return shipment | `ReturnRequests` (customer request only) | PARTIALLY |
| 14 | Cancellation | `Orders.CancelledAt/CancellationReason` (order level) | PARTIALLY |
| 15 | Shipment status timestamps | none (only the 2 order dates) | MISSING |
| – | Weight / dimensions per product | none | MISSING |
| – | Pickup warehouse | none | MISSING |
| – | Guest tracking token | none | MISSING |
**Conclusion:** the current schema cannot support a Delhivery integration without new structures. The order tables themselves do not need to change.

## 8. Recommended future design – PROPOSED (nothing created; all new objects, additive only)
Separate from the existing structures above. Naming follows the existing PascalCase/uuid/`IsActive` convention. All created by an **explicit, versioned migration** applied first to UAT.

### 8.1 New tables
**`Shipments`** – one row per parcel
`Id uuid PK` · `OrderId uuid NOT NULL FK→Orders (RESTRICT)` · `CourierCode text NOT NULL DEFAULT 'DELHIVERY'` · `Awb text NULL` · `CourierShipmentId text NULL` (Delhivery `refnum`/upload id) · `Status text NOT NULL` (CREATING, CREATED, PICKUP_SCHEDULED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED_ATTEMPT, RTO_INITIATED, RTO_DELIVERED, CANCELLED, ERROR) · `PaymentMode text NOT NULL` (PREPAID/COD) · `CodAmount numeric NULL` · `WeightGrams int` · `LengthCm/BreadthCm/HeightCm numeric` · `PickupLocationName text` · `PickupScheduledAt timestamptz` · `PickedUpAt timestamptz` · `DispatchedAt timestamptz` · `ExpectedDeliveryDate date` · `DeliveredAt timestamptz` · `LastStatusAt timestamptz` · `LastCourierStatus text` · `LabelUrl text` · `TrackingUrl text` · `CancelledAt timestamptz` · `CancelReason text` · `RowVersion`/`xmin` concurrency · `CreatedAt/UpdatedAt/IsActive`.
Constraints: **partial unique index `UX_Shipments_Order_Active` on `(OrderId) WHERE Status NOT IN ('CANCELLED','ERROR','RTO_DELIVERED')`** (prevents duplicate shipments); **unique `UX_Shipments_Awb` on `(CourierCode, Awb) WHERE Awb IS NOT NULL`**; index on `Status`, `LastStatusAt`.

**`ShipmentItems`** – `Id PK` · `ShipmentId FK CASCADE` · `OrderItemId FK→OrderItems RESTRICT` · `Quantity int CHECK > 0` · unique `(ShipmentId, OrderItemId)` (supports partial shipments).

**`ShipmentTrackingEvents`** – `Id PK` · `ShipmentId FK CASCADE` · `StatusCode text` · `StatusText text` · `Location text` · `EventTime timestamptz NOT NULL` · `Source text` (WEBHOOK/POLL) · `RawPayload jsonb` · `ReceivedAt timestamptz` · **unique `(ShipmentId, StatusCode, EventTime)`** to make webhook/poll replay idempotent.

**`CourierApiLogs`** – `Id PK` · `ShipmentId NULL FK` · `OrderId NULL FK` · `Operation text` (CREATE, CANCEL, TRACK, PICKUP, LABEL, SERVICEABILITY) · `RequestSummary jsonb` (secrets redacted) · `HttpStatus int` · `ResponseBody text` · `Success bool` · `ErrorMessage text` · `AttemptNo int` · `NextRetryAt timestamptz` · `CorrelationId uuid` · `CreatedAt`. Index `(Success, NextRetryAt)` for the retry worker.

**`PickupRequests`** – `Id PK` · `PickupLocationName` · `PickupDate date` · `PickupTime` · `ExpectedPackageCount int` · `CourierPickupId text` · `Status` · `CreatedAt…`; `Shipments.PickupRequestId` nullable FK.

**`ShipmentReturns`** (reverse/RTO) – `Id PK` · `ShipmentId FK` (original) · `ReturnRequestId FK→ReturnRequests NULL` · `ReverseAwb text` · `Status` · `Reason` · `PickedUpAt` · `ReceivedAt` · `RefundTriggeredAt`.

**`OrderTrackingTokens`** (guest tracking) – `Id PK` · `OrderId FK CASCADE` · `TokenHash text NOT NULL` (SHA-256 of a 32-byte random token, token itself never stored) · `ExpiresAt timestamptz` · `LastUsedAt` · `RevokedAt`; unique `TokenHash`.

**`EmailOutbox`** (shipment e-mails and retry) – `Id PK` · `ToEmail` · `Template` · `PayloadJson` · `Status` · `Attempts` · `NextAttemptAt` · `SentAt` · `Error` · `RelatedOrderId`.

**`OrderStatusHistory`** – `Id PK` · `OrderId FK CASCADE` · `FromStatus int` · `ToStatus int` · `ChangedByUserId uuid NULL` · `Source text` (ADMIN, SYSTEM, COURIER, CUSTOMER) · `Note text` · `CreatedAt`. (Fixes the missing audit trail and gives one place to detect inconsistent states.)

### 8.2 Changes to existing tables (all nullable / additive)
- `Products`: `WeightGrams int`, `LengthCm`, `BreadthCm`, `HeightCm numeric`, `HsnCode text` (required for courier manifest and GST invoice).
- `Orders`: none required; keep `TrackingNumber` as a read-only mirror of the active shipment AWB for backward compatibility; add indexes `IX_Orders_GuestEmail`, `IX_Orders_GuestPhone`.
- Integrity hardening (separate, approved change): `OrderItems.ProductId` → `RESTRICT`; `Payments.OrderId` → `RESTRICT`; `CHECK (Quantity > 0)`; unique `Payments.RazorpayPaymentId`.
- Settings (rows, not tables): pickup location name/address/phone, default weight, serviceable-PIN cache toggle, auto-create-shipment toggle.

### 8.3 Relationships
`Orders 1 ──* Shipments 1 ──* ShipmentItems *── 1 OrderItems`; `Shipments 1 ──* ShipmentTrackingEvents`; `Shipments 1 ──* CourierApiLogs`; `Shipments *── 0..1 PickupRequests`; `Shipments 1 ──* ShipmentReturns *── 0..1 ReturnRequests`; `Orders 1 ──* OrderTrackingTokens`; `Orders 1 ──* OrderStatusHistory`.

## 9. Security and integrity (database view)
| Topic | Finding |
|---|---|
| SQL injection | EXISTING protection: EF Core parameterised queries; raw SQL only static DDL at start-up |
| Sensitive data | `Users.PasswordHash` is BCrypt (verified at API level); `Orders` holds PII (names, phones, addresses) in clear text – normal, but backups must be protected; `Payments.WebhookPayload` can store raw payloads – redact before storing |
| Duplicate orders | MISSING protection (no idempotency key / unique constraint besides order number) |
| Duplicate shipments | MISSING today (no shipments); PROPOSED partial unique index above |
| Status consistency | ISSUE – no constraint, no history, free transitions; stock can be restored twice |
| Guest order access | ISSUE – anonymous lookup by order number (API); PROPOSED token or number + e-mail/phone, §10 |
| Orphans | live check: 0 orders without payment rows while Paid; 0 total mismatches |
| Backups | verified full dumps exist (see earlier cut-over reports) |

## 10. Guest tracking – how to stop access by a guessable order number (PROPOSED)
1. Never return PII from an order-number-only call. The public tracking response contains: order number, status, courier, AWB, ETA, timeline, items (names), destination **city + PIN only**.
2. Require **order number + the e-mail or phone used at checkout** (case-insensitive e-mail, last-10-digits phone), compared server-side; identical generic error ("We couldn't find a matching order") for wrong number or wrong contact; rate-limit by IP and by order number (e.g. 10/min, 5 failures → 15 min block).
3. Better: at order creation generate a random 32-byte **tracking token**, store only its SHA-256 (`OrderTrackingTokens`), put the raw token in the confirmation e-mail link (`/track-order?t=…`) and in the confirmation page state; the link works without typing anything and cannot be guessed.
4. Make order numbers harder to guess (add a longer random part) – defence in depth, not the control.
5. Logged-in customers: authorize by `Orders.UserId == token user`; admins: role check.
6. Log tracking-lookup failures for abuse detection.

## 11. Problems, missing functionality, risks (summary)
| Type | Item |
|---|---|
| ISSUE | cascades that delete order history (§3), no CHECK/UNIQUE guards, no transaction/concurrency, schema built by start-up DDL, live ≠ source, `dblink` extension present, `GetStatsAsync` loads all orders |
| MISSING | shipment tables, tracking events, courier logs, order status history, e-mail log/outbox, refunds table, product weight/dimensions, guest token, indexes on guest e-mail/phone |
| RISK | adding shipping on top of today's non-transactional order flow can create duplicate or inconsistent shipments; start-up DDL deploying the newer source changes the live DB unexpectedly |

## 12. Recommendations
1. PROPOSED: replace start-up DDL by versioned migrations; baseline the live schema first; deploy only after a verified backup.
2. PROPOSED: apply §8 additively in UAT; run the integrity-hardening changes as a separate approved change.
3. PROPOSED: remove the unused `dblink` extension after confirming how it got there.
4. PROPOSED: add `OrderStatusHistory` before any automation so every change (admin, system, courier) is traceable.
5. PROPOSED: load statistics with SQL aggregates, not by loading all rows.

## 13. Future Delhivery integration requirements (database)
Shipments + items + events + API-log + pickup + returns tables (§8.1) · product weight/dimensions/HSN · unique AWB and one-active-shipment-per-order constraints · idempotent event storage keyed by `(ShipmentId, StatusCode, EventTime)` · retry queue fields (`AttemptNo`, `NextRetryAt`) · tracking token table · status history · all via migrations tested on a copy of the live data first.

---

# FINAL AUDIT SUMMARY (whole Phase 1)

## Website
**What works (EXISTING):** product browsing, cart (user + guest, persistent), registration/login/logout, OTP password reset, guest checkout and logged-in checkout, COD orders, Razorpay order/verification code with server-side amount check, order confirmation page, account order list/detail with customer cancel, order e-mails (confirmed / payment / shipped / delivered / cancelled) – live mail log shows real order confirmations being sent, responsive on 375 px.
**What does not work / is broken (ISSUE):** anonymous order lookup exposes customer PII; no Track-Order page; guest confirmation e-mail line blank; COD never becomes Paid; no PIN/phone validation (2 live orders have bad phones); shipping and tax settings are empty so every order has ₹0 shipping/tax; online payment never exercised end-to-end on live (0 payments).
**Needs improvement:** server-side admin order list, invoice (plain-text stub), tracking display, e-mail reliability.

## Admin
**Existing order management:** list (200 newest, client-side search/filters), detail, status update with tracking-number text and shipped/delivered e-mails, cancel (stock restore), payments list, returns list, dashboard counts, Razorpay Test/Live switch.
**Missing shipment management:** courier selection, shipment creation, AWB/label, pickup, tracking timeline, NDR/RTO handling, failed-shipment queue, shipment e-mails with tracking link, refunds through Razorpay, sub-admin roles, order audit trail, admin new-order e-mail.
**Required enhancements:** state machine for order status, shipment card on order detail, Shipments list/failures view, server-side paging/filters, COD collection flag.

## Database
**Existing order-related tables:** Orders, OrderItems, Payments, ReturnRequests, Users, Addresses, Carts, CartItems, Products, ProductVariants, Coupons, ShippingConfigs, TaxConfigs, WebsiteSettings.
**Existing relationships:** Orders→Users/Coupons (SET NULL), OrderItems→Orders/Products (CASCADE), Payments→Orders (CASCADE), ReturnRequests→Orders/Users.
**Missing shipment structures:** shipments, shipment items, tracking events, courier API log, pickups, shipment returns, tracking tokens, status history, e-mail outbox, product weight/dimensions.

## Integration readiness
**Assessment: NOT READY for Delhivery integration yet.** The order foundation is usable, but (1) nothing exists for shipments in the database or code, (2) three High-severity security defects (public order lookup, cross-account cancel, open returns admin endpoints) must be fixed first because shipping automation would act on the same unprotected order endpoints, (3) order creation/cancellation are not transactional or idempotent, which would cause duplicate or inconsistent shipments, (4) the Razorpay webhook and refunds are stubs, (5) source and live deployment have drifted. These are all fixable in a bounded hardening phase; no redesign of the order tables is needed.

## Recommended implementation phases
- **Phase 1 – Existing system audit:** done (these three files). Decision needed from you before anything else.
- **Phase 2 – Database design for shipping and tracking:** approve §8; create versioned migration; apply to a UAT copy; include hardening items.
- **Phase 3 – Backend Delhivery API integration:** typed client, config keys, serviceability, create/cancel/label/track, log + retry, webhook endpoint (UAT/staging token only). Precede with the security/state-machine fixes from doc 02 §11.
- **Phase 4 – Automatic shipment and AWB generation:** trigger on `Status = Confirmed` with eligibility rules; admin one-click first, auto toggle later; duplicate prevention by the partial unique index.
- **Phase 5 – Customer tracking page:** `/track-order`, account integration, shared timeline.
- **Phase 6 – Guest order tracking:** token link + order number with e-mail/phone, rate limits.
- **Phase 7 – Customer e-mail notifications:** shipment created (AWB + link), out for delivery, delivered, RTO; via outbox with retry.
- **Phase 8 – Admin shipment management:** shipment card, list, failure queue, cancel/retry/return actions.
- **Phase 9 – Testing in UAT:** Delhivery staging, full matrix (prepaid, COD, cancellation, failure, duplicate, webhook replay, guest/logged-in tracking).
- **Phase 10 – Production deployment after explicit approval:** backup, migration, canary shipment, monitoring, rollback plan.

*No development work has been started. Waiting for explicit approval of the next phase.*
