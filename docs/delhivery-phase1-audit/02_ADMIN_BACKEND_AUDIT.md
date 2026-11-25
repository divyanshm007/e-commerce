# 02 – Admin Panel & Backend Audit
Phase 1 – read-only audit before the Delhivery integration · Audit date: 2026-11-09

**Labels:** EXISTING · PARTIALLY IMPLEMENTED · MISSING · ISSUE · PROPOSED
Evidence sources: source in `D:\GitHub\EcommerceApp\backend\EcommerceApp` and `…\frontend\src\app\admin`; live API probes (unauthenticated, nonexistent ids, no data written); live DB metadata (SELECT only). See the source-vs-live drift warning at the top of `01_WEBSITE_FRONTEND_AUDIT.md`.
Secrets (passwords, tokens, API keys, SMTP password, Razorpay secrets) are not reproduced anywhere in this document.

## 1. Project overview
.NET 8 Web API, layered as `Controllers/v1` → `Services` (+ `Interfaces`, `DTOs`, `Validators`) → `Data/AppDbContext` (EF Core, PostgreSQL 18.4). Auth: JWT bearer. Logging: Serilog (+ request logging). Errors: `Middleware/ExceptionMiddleware.cs`. Response envelope `ApiResponse<T> {success,message,data,errors,statusCode}` (`ApiResult()` in `Controllers/v1/BaseController.cs`). Roles: **only two** – `Customer = 1`, `SuperAdmin = 2` (`Common/Enums.cs`, live DB: 3 customers, 2 SuperAdmins).

## 2. Admin panel (frontend)
Routes `app.routes.ts` under `admin` (`adminGuard`), menu in `admin/admin-layout/admin-layout.component.ts` (≈ lines 596-646).
| Module | Route / file | Status |
|---|---|---|
| Dashboard | `/admin/dashboard` – `admin/dashboard/dashboard.component.ts`, `DashboardController` (stats, sales chart, recent orders, best sellers, low stock, visitors) | EXISTING |
| Orders list | `/admin/orders` – `admin-order-list.component.ts` (675 lines) | EXISTING – client-side table, latest 200 only (line 630) – ISSUE |
| Order detail | `/admin/orders/:id` – `admin-order-detail.component.ts` (364 lines) | EXISTING |
| Customers | `/admin/customers` – `admin-customers.component.ts` | ISSUE – shows "No customers found" although the API returns data (page reads `res.data`; `CustomersController.GetAll` returns the list unwrapped) |
| Products / Categories | `/admin/products`, `/admin/categories` | EXISTING |
| Inventory | product form field `StockQuantity`, `LowStockThreshold`, dashboard low-stock list | PARTIALLY – no stock ledger/history, no per-variant UI |
| Payments | `/admin/payments` – list from `GET /payments` | PARTIALLY – list only; **0 rows** live because no online payment ever completed |
| Returns | `/admin/returns` | PARTIALLY – status + note only |
| Carts / abandoned carts | `/admin/carts` | EXISTING |
| Coupons, Reviews, Banners, FAQs, Blogs, Quizzes, Gallery, Testimonials, Newsletter, Pages, Trust pages, Consultations, Referrals, Contact messages | respective routes | EXISTING |
| Reports | `/admin/reports` | PARTIALLY – recent orders summary only |
| Settings | `/admin/settings` – General, Shipping (charge, free-shipping threshold), Tax, Payment (Razorpay **Test/Live switch**) | EXISTING (Shipping/Tax rows currently empty on live) |
| Users, roles, permissions | – | **MISSING** – no user management screen, no sub-admin/role model |

## 3. Order management (admin)
| Question | Answer | Evidence |
|---|---|---|
| View orders | EXISTING | `GET /orders` (SuperAdmin, paged) – UI loads page 1 size 200 |
| Search | PARTIALLY | API `paging.Search` matches order number / user e-mail / first name / guest e-mail (`OrderService.cs:40-45`); the UI does its own client-side `filterGlobal` on the 200 loaded rows |
| Filter | PARTIALLY | column filters for payment status / order status in the PrimeNG table (client-side); no date-range, no payment-method filter, no export |
| Update status | EXISTING | `PATCH /orders/{id}/status` body `{status, trackingNumber?, notes?}` (`OrdersController.cs:60-63`); sets `ShippedAt/DeliveredAt/CancelledAt`; e-mails customer when moving into Shipped or Delivered |
| Cancel | EXISTING with ISSUES | `PATCH /orders/{id}/cancel` (any authenticated user – see §5) restores stock, e-mails customer; UI offers it for Pending/Confirmed only (`admin-order-detail.component.ts:268`) |
| Refunds | **PARTIALLY – effectively MISSING** | `PaymentService.InitiateRefundAsync` only flips `RefundStatus = Processing` in the DB ("In production, call Razorpay refund API", line 186). No money is refunded. The cancel dialog text "may trigger a refund if already paid" is not true – cancelling never refunds |
| Shipping info already available? | PARTIALLY | `Orders.TrackingNumber` (free text), `ShippedAt`, `DeliveredAt`; **no** courier, AWB-vs-tracking distinction, pickup, ETA, events |
| Tracking numbers stored? | PARTIALLY | one free-text column, typed by hand in the admin form ("Enter tracking number"); 0 of 9 live orders have one |
| Shipment details viewable? | MISSING | no shipment screen |
| Status transition rules | **ISSUE** | `UpdateStatusAsync` accepts any status from any status (e.g. Delivered→Pending, Cancelled→Shipped). Setting Cancelled through this endpoint **does not restore stock** and sends no e-mail (only `CancelAsync` does) |
| COD payment collection | **ISSUE** | nothing sets `PaymentStatus = Paid` for COD; dashboard revenue counts only Paid orders |

## 4. Backend API inventory (order-related)
Base: `https://api.sidham.in/api/v1`. "Auth" column: **A** = anonymous, **U** = any signed-in user, **C** = Customer role, **S** = SuperAdmin. Envelope `ApiResponse<T>` unless noted. "Live-confirmed" = answered as stated by the live API in this audit.

### 4.1 Customer authentication – `AuthController` → `AuthService` (tables: `Users`, `LoginHistories`; e-mail via `EmailService`)
| Method | Endpoint | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/register` | A | `{firstName,lastName,email,password,phone?}` (FluentValidation) | `{token,user}` | Role forced to Customer |
| POST | `/auth/login` | A | `{email,password}` | `{token,user{role}}` | rate limit `login` 20/min/IP; BCrypt; inactive users refused |
| POST | `/auth/forgot-password` | A | `{email}` | generic message | rate limit 10/min; OTP e-mailed |
| POST | `/auth/verify-reset-otp` | A | `{email,otp(6 digits)}` | `{resetToken}` | |
| POST | `/auth/reset-password` | A | `{email,resetToken,newPassword}` | message | signs out all sessions |
| POST | `/auth/change-password` | U | `{currentPassword,newPassword}` | message | |
| GET/PUT | `/auth/profile` | U | profile DTO | profile DTO | |

### 4.2 Cart and guest checkout – `CartController` → `CartService` (tables `Carts`, `CartItems`, `Products`, `Coupons`)
| Method | Endpoint | Auth | Request | Notes |
|---|---|---|---|---|
| GET | `/cart` | A | header `X-Session-Id` or token | cart for user or guest session |
| POST | `/cart/items` | A | `{productId,variantId?,quantity}` | stock check (`CartService.cs:54`) |
| PUT | `/cart/items/{id}` | A | `{quantity}` | |
| DELETE | `/cart/items/{id}` · `/cart` | A | – | remove / clear |
| POST/DELETE | `/cart/coupon` | A | `{code}` | |
| PATCH | `/cart/guest-info` | A | `{sessionId,name,email,phone}` | stores guest contact on the cart (abandoned-cart use) |
| POST | `/cart/merge` | U | – | guest cart → user cart |
| GET | `/cart/abandoned`, `/cart/all` | S | – | live-confirmed 401 for anonymous |

### 4.3 Checkout / order creation – `OrdersController` → `OrderService` (tables `Orders`, `OrderItems`, `Products`, `Coupons`, `ShippingConfigs`, `Carts/CartItems`)
| Method | Endpoint | Auth | Request body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/orders` | **A** | `CreateOrderDto {guestName,guestEmail,guestPhone,paymentMethod(1=Razorpay,2=COD),couponCode,notes,shippingAddress{fullName,phone,line1,line2,city,state,postalCode,country},billingAddress,items[{productId,variantId,quantity}]}` | `OrderDetailDto` | UserId forced from token; guest needs name + valid e-mail; prices/tax recomputed server-side; stock decremented immediately; COD → cart cleared + confirmation e-mail |
| GET | `/orders/my-orders` | C | – | `OrderListDto[]` | |
| GET | `/orders/{id}` | U | – | `OrderDetailDto` | owner or SuperAdmin – **but guest orders (UserId null) are readable by any signed-in user** (`OrdersController.cs:29-31` skips the check when `UserId` is null) – ISSUE |
| GET | `/orders/number/{orderNumber}` | **A** | – | full `OrderDetailDto` incl. e-mail, phone, addresses, payments | **live-confirmed anonymous** – ISSUE High |
| GET | `/orders` | S | `page,pageSize,search,sortBy` | `PagedResult<OrderListDto>` | live-confirmed 401 anonymous |
| PATCH | `/orders/{id}/status` | S | `{status,trackingNumber?,notes?}` | message | no transition rules; `notes` is accepted but **never saved** (not used in `UpdateStatusAsync`) |
| PATCH | `/orders/{id}/cancel` | **U** | `{reason}` | message | **no ownership check** – any signed-in user can cancel any order whose id they know; no "already cancelled" guard → calling twice **restores stock twice** (`OrderService.cs:265-300`); a **paid** order is cancelled without any refund – ISSUE High |
| GET | `/orders/{id}/invoice` | U | – | `application/pdf` filename but plain text body | any signed-in user, any order – ISSUE |
| GET | `/orders/stats` | S | – | counts + revenue | |

### 4.4 Payments – `PaymentsController` → `PaymentService` (tables `Payments`, `Orders`; HTTPS to `api.razorpay.com`)
| Method | Endpoint | Auth | Request | Notes |
|---|---|---|---|---|
| POST | `/payments/razorpay/create-order/{orderId}` | A | – | amount from `Orders.TotalAmount`; keys follow Test/Live switch; user-owned orders restricted to owner, **guest orders open to anyone with the id**; live-confirmed 404 for unknown id |
| POST | `/payments/razorpay/verify` | A | `{orderId,razorpayOrderId,razorpayPaymentId,razorpaySignature}` | HMAC-SHA256 + server-side Razorpay lookup + amount check + idempotent (EXISTING, good). Sets `PaymentStatus=Paid`, `Status=Confirmed`, inserts `Payments`, clears cart, sends 2 e-mails |
| POST | `/payments/razorpay/webhook` | A | raw JSON + `X-Razorpay-Signature` | **ISSUE:** after the signature check it does nothing (`// Parse webhook event…` then returns OK, lines 161-171); plain `!=` string compare; if `Razorpay:WebhookSecret` is unset the HMAC key is empty and anyone can compute a valid signature. Live-confirmed: bad signature → 400 |
| POST | `/payments/{orderId}/refund` | S | `{amount?}` | DB flag only – no Razorpay call |
| GET | `/payments`, `/payments/order/{orderId}` | S / U | – | live-confirmed 401 anonymous |
| GET/PUT | `/payments/razorpay/mode` | S | `{mode}` | Test/Live switch (not touched by this audit) |

### 4.5 Customer order history, returns, addresses
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/orders/my-orders` | C | see above |
| GET/POST/DELETE | `/customers/addresses` | C | table `Addresses` (live: 0 rows) |
| POST | `/returns` | U | `ReturnController.cs` – **ISSUE:** order lookup is `o.UserId == userId || o.GuestEmail != null` (line ≈ 22) → any signed-in user can file a return for **any guest order**; no check that the order is Delivered |
| GET | `/returns/my` | U | own requests |
| GET | `/returns` | **U** | **ISSUE High:** no role restriction – any signed-in **customer can list all customers' return requests (names, e-mails, order numbers)** (`ReturnController.cs` ≈ line 55; live-confirmed 401 only for anonymous) |
| PATCH | `/returns/{id}/status` | **U** | **ISSUE High:** any signed-in customer can approve/reject any return and write admin notes (≈ line 70) |

### 4.6 Settings used by orders
`GET /settings/shipping`, `/settings/tax` – **anonymous** (live-confirmed 200; contains only config), `PUT` = SuperAdmin. `OrderService.CreateAsync` uses `ShippingConfigs` but **ignores `TaxConfigs`** (tax comes from each product's `TaxPercentage`) – ISSUE (the admin "Tax" tab does not control tax).

### 4.7 Dependencies
`FluentValidation` (+ AutoValidation), `AutoMapper`, `BCrypt.Net`, `Serilog`, `Npgsql/EF Core`, `System.Net.Mail.SmtpClient` (Gmail SMTP), `HttpClient` → Razorpay REST. No background-job library (Hangfire/Quartz), no message queue, no Redis – relevant for retries (§7).

## 5. Security and data-integrity findings (backend)
| # | Severity | Finding | Evidence |
|---|---|---|---|
| S1 | High | Anonymous order lookup exposes PII by order number | `OrdersController.cs:35-37`, live 404-not-401 |
| S2 | High | Any signed-in user can cancel anyone's order; double cancel restores stock twice; cancel of paid order leaves money with no refund | `OrderService.cs:265-300`, `OrdersController.cs:65-68` |
| S3 | High | `/returns` list and status update open to every signed-in customer; return creation allowed for any guest order | `ReturnController.cs` |
| S4 | Medium | Invoice and guest orders readable by any signed-in user | `OrdersController.cs:29-31, 70-77` |
| S5 | Medium | Webhook never processes events; empty-secret signature forgery possible | `PaymentService.cs:161-171` |
| S6 | Medium | Order creation is not transactional or concurrency-safe: stock is checked and decremented per product with no `BeginTransaction`/row version (grep found none) → two simultaneous orders can oversell; a failure half-way leaves partial state | `OrderService.cs:97-136` |
| S7 | Medium | No duplicate-order / idempotency protection (no idempotency key; double click or retry creates two orders and decrements stock twice) | `CreateAsync` |
| S8 | Medium | Coupon `UsedCount++` happens at order creation (even if never paid/cancelled, never decremented); no per-coupon usage limit check in `CreateAsync` | `OrderService.cs:143-158` |
| S9 | Medium | Rate limiting only on auth endpoints; no limit on `POST /orders`, `/contact`, `/cart` | `Program.cs:95-103` |
| S10 | Medium | Contact endpoint has no validation (empty message accepted) – see UAT report | `ContentController.SendContact` |
| S11 | Low | 500 responses include `exception.Message` | `ExceptionMiddleware.cs` |
| S12 | Low | CORS `AllowCredentials` with a configured origin list (OK); Swagger only in Development (live-confirmed 404) | `Program.cs` |
| S13 | Low | `OrderItem.UnitPrice` stores the list price while `SubTotal` uses the discounted price – line items do not add up to the subtotal when a discount price exists | `OrderService.cs:109-132` |
| S14 | Info | SQL injection: EXISTING protection – all data access is EF Core LINQ (parameterised). The only raw SQL is static DDL in `Program.cs` start-up (no user input). | grep `FromSql|ExecuteSql` |
| S15 | Info | Password handling EXISTING: BCrypt, password policy, OTP flow, token invalidation on reset. No account lock-out; no MFA for admins | `AuthService.cs` |
| S16 | Info | Payment data: card data never touches the server (Razorpay popup); only Razorpay ids/signature stored; `Payments.WebhookPayload` column exists (unused) | `Entities/Payment.cs` |
| S17 | Info | `Users.Role` has only SuperAdmin – all admins have full power; the default seeded admin account is still active on live (see UAT report) | `Enums.cs` |

## 6. Email services
| Item | Finding | Evidence |
|---|---|---|
| Provider | EXISTING – Gmail SMTP through `System.Net.Mail.SmtpClient` (host `Email:SmtpHost` default `smtp.gmail.com`, port 587, SSL), credentials from environment (`Email__Username/Password`, values not recorded here) | `Services/EmailService.cs:25-74` |
| Implementation | EXISTING – `IEmailService` with 17 methods; HTML templates in `Services/EmailTemplates.cs` (one `Wrap()` layout, `OrderItemsTable`, `ShippingAddressBlock`) | |
| Order confirmation | EXISTING – to the user's account e-mail or `GuestEmail`; COD at creation, online after payment | `OrderService.SendOrderConfirmationAsync` |
| Payment confirmation | EXISTING – `SendPaymentConfirmationAsync` | `PaymentService.cs:155` |
| Shipped / Delivered / Cancelled | EXISTING – `ShippingUpdate` (shows `TrackingNumber`), `DeliveryConfirmation`, `OrderCancelled` | `EmailTemplates.cs:280-303` |
| Customer e-mail retrieval | EXISTING – `user?.Email ?? order.GuestEmail` repeated in 4 places (duplicate logic) | `OrderService`, `PaymentService` |
| **Admin notification on a new order** | **MISSING** – `Email:AdminEmail` is used only for contact, consultation and review notifications; no method for "new order received" | `EmailService.cs` (methods list) |
| Reliability | ISSUE – fire-and-forget `_ = SendAsync(...)`; failure is only logged (`Email FAILED`), **no retry, no outbox table, no delivery status**. Live log: 1 `[ERR] Email FAILED` (invalid test address) and `[INF] Email SENT` lines for real orders on 2026-11-06 | live backend log |
| Sender | `From` = SMTP username (a personal Gmail account); Gmail daily-send limits and SPF/DKIM alignment apply – deliverability to spam risk | |
| Shipment confirmation (future) | PROPOSED – reuse `SendShippingUpdateAsync` and `EmailTemplates.ShippingUpdate`; extend `OrderDetailDto` with courier + AWB + tracking URL; send from the shipment service when AWB is saved |

## 7. Delhivery integration readiness (requirements – NOT implemented, no Delhivery code connected)
Search result: the strings "Delhivery/CourierName/AwbNumber" appear only in **unused legacy scaffolding** (`Entities/LegacyEntities.cs` lines 32-60, `Entities/OrderItem.cs` `ShipmentId`/`PickupId`, `Program.cs` DDL). No HTTP client, no configuration keys, no controller, no service for any courier exists. The live DB has none of those columns/tables.
| Requirement | Status | Where it should fit |
|---|---|---|
| API authentication (API token, pickup-location name; staging vs production base URL) | MISSING | new `Delhivery:*` configuration section (environment variables like `Razorpay__*`), a typed `HttpClient` registered in `Program.cs` |
| Shipment creation (manifest: consignee name, address, PIN, phone, order number, payment mode Prepaid/COD, COD amount, weight, dimensions, product description) | MISSING | new `IShippingService`/`DelhiveryService` in `Services/`, called from a new `ShipmentsController` (admin) and from `OrderService` status flow |
| AWB / waybill generation | MISSING | stored on a new `Shipments` table (not on `Orders.TrackingNumber`) |
| Pickup request | MISSING | `PickupRequests` table + admin action |
| Tracking / status updates | MISSING | poller (`BackgroundService`, no job library exists today) **and** webhook endpoint |
| Delivery confirmation | PARTIALLY | `OrderStatus.Delivered` + e-mail already exist – hook the courier "Delivered" event into `UpdateStatusAsync` logic (extract it into a service method) |
| Cancellation of shipment | MISSING | admin action + automatic when an order is cancelled before pickup |
| Return / RTO shipment | MISSING | `ReturnRequests` exists as a customer request record only |
| API failure handling + retry | MISSING | `CourierApiLogs` table with attempt count, status, next retry; exponential back-off in a hosted service |
| Webhook support | MISSING | `POST /api/v1/shipments/webhook/delhivery` with shared-secret/IP check, idempotent event store |
| Product weight and dimensions | **MISSING** – `Products` has no weight/length/width/height/HSN columns (live DB checked) – required by courier rate/manifest |
| Pickup warehouse address/contact | MISSING – no setting |
| Address quality | ISSUE – no PIN/phone validation; 2 live orders have non-10-digit phones |

### Recommended shipment-creation trigger (PROPOSED)
Do **not** create shipments at order creation or "immediately after payment" for everything. The existing workflow is:
- **Online (Razorpay):** `Pending/Pending` → payment verified → `Confirmed/Paid` automatically (`PaymentService.cs:122-125`).
- **COD:** stays `Pending/Pending`; an admin must move it to `Confirmed` (nothing automatic).
- Admin can set `Shipped`/`Delivered` manually.
Therefore the trigger should be **order `Status == Confirmed`** (online: automatic after verified payment; COD: after admin confirmation or customer phone/OTP verification), plus eligibility checks: not cancelled/returned, stock available, valid 6-digit serviceable PIN, valid phone, **no prescription-required item awaiting review** (`Products.PrescriptionRequired` exists), and **no existing active shipment** for the order. Initially a one-click "Create shipment" admin button; later an optional auto-create toggle in settings. Moving to `Shipped` must then be performed by the shipment service (AWB present / pickup done), not by hand.

## 8. Problems identified (admin/backend) – summary
Blocking before Delhivery: S2 (cancel/double-restock/no refund), S6/S7 (non-transactional order creation, duplicates), no status-transition rules, webhook stub, refund stub, missing weight/dimension data, COD never marked paid, source/live drift, no retry infrastructure, no admin new-order e-mail.

## 9. Missing functionality
Shipment screens · courier selection · AWB label printing · pickup scheduling · NDR (non-delivery report) handling · RTO handling · refunds through Razorpay · role-based sub-admins · audit log of admin actions on orders (`ActivityLogs` table exists but has 0 rows) · order notes saved (`UpdateOrderStatusDto.Notes` ignored) · date-range filters/exports · GST invoice PDF.

## 10. Risks
| Risk | Level |
|---|---|
| Cross-account order cancel / return takeover (S2, S3) | High |
| PII leak by order number (S1) | High |
| Overselling and duplicate orders (S6, S7) | Medium |
| A courier retry loop without idempotency could create duplicate shipments | Medium (future) |
| Gmail SMTP as the only mail channel – order mail may be throttled | Medium |
| Redeploying current source changes the live schema | Medium |

## 11. Recommendations (PROPOSED)
1. Fix S1-S5 first (small, isolated changes) and ship to UAT before any courier work.
2. Introduce `IOrderStateMachine` (allowed transitions, stock/coupon side effects in one place, one transaction, one e-mail point) and make `UpdateStatusAsync`/`CancelAsync` use it.
3. Wrap `CreateAsync` in a transaction with `SELECT … FOR UPDATE`/row-version on products; add an idempotency key header.
4. Implement the Razorpay webhook (`payment.captured`, `payment.failed`, `refund.processed`) and real refunds.
5. Add `Products.WeightGrams/Length/Breadth/Height/HsnCode` and a pickup-location setting.
6. Add an e-mail outbox table with retry; add admin "new order" notification.
7. Add the `Shipments` model (see 03) and a `ShipmentsController` + `DelhiveryClient`; keep all Delhivery secrets in environment variables.
8. Pin deployments: build the image from the audited source, review the start-up DDL, and take a database backup first.

## 12. Future Delhivery integration requirements – backend checklist
Configuration keys · typed `HttpClient` with timeout/retry (Polly or hand-rolled) · `ShipmentService` (create, cancel, fetch label, track) · `ShipmentsController` (admin: create/cancel/retry/label; public: tracking; webhook) · `DelhiveryTrackingSyncService : BackgroundService` · tables from 03 · e-mail templates (shipment created, out for delivery, delivered, RTO) · admin UI: shipment card on the order detail page, "Shipments" list with failures filter · UAT with Delhivery staging, then production only after explicit approval.
