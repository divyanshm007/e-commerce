# 05 – Delhivery Stage 2: Implementation Plan (PROPOSAL – nothing implemented)
Date: 2026-11-09 · Status: **inspection and planning only. No code, database, configuration or production system has been changed or called.** Awaiting your approval of §9.
Inputs read in full: `04_DELHIVERY_API_DISCOVERY.md`, `01_WEBSITE_FRONTEND_AUDIT.md`, `02_ADMIN_BACKEND_AUDIT.md`, `03_DATABASE_AUDIT.md`, plus the source files listed in §1.
Labels: EXISTING · PARTIALLY IMPLEMENTED · MISSING · ISSUE · PROPOSED.

## 1. What was inspected (and what it means for the design)
| Area | Evidence (file) | Finding |
|---|---|---|
| Order creation / statuses | `Services/OrderService.cs` (CreateAsync 89-216, UpdateStatusAsync 227-263, CancelAsync 265-300), `Common/Enums.cs` | Status enum Pending 1 · Confirmed 2 · Shipped 3 · Delivered 4 · Cancelled 5 · Returned 6. Any admin transition is accepted. Setting Cancelled through `UpdateStatusAsync` does **not** restore stock; `CancelAsync` restores stock **every time it is called**. |
| Razorpay verification | `Services/PaymentService.cs` VerifyPaymentAsync 94-159 | EXISTING and sound: HMAC-SHA256, Razorpay order lookup + amount check, idempotent. On success: `PaymentStatus=Paid`, `Status=Confirmed`, `Payments` row inserted. **Prepaid eligibility signal = `PaymentMethod=Razorpay ∧ PaymentStatus=Paid ∧ Status=Confirmed`.** |
| COD dispatch workflow | `OrderService` / admin order detail | COD orders stay `Pending/Pending`; the **only** approval step is an admin moving the order to `Confirmed` (`PATCH /orders/{id}/status`). **COD eligibility = `PaymentMethod=COD ∧ Status=Confirmed`**; COD amount = `Orders.TotalAmount` (payable; `PaymentStatus` stays Pending until collection, which is a separate, currently missing feature). |
| Admin authorization | `Controllers/v1/*`, `Common/Enums.cs UserRole`, `Program.cs` | Only two roles: `Customer`, `SuperAdmin`. All admin endpoints use `[Authorize(Roles="SuperAdmin")]`; JWT validates `IsActive` and `PasswordChangedAt` on every request. |
| Settings pattern to mirror | `Services/RazorpayConfigService.cs`, `PaymentsController` (`razorpay/mode`), `SettingsService.GetSettingValueAsync/SetSettingValueAsync`, `Entities/WebsiteSetting.cs`, admin `admin-settings.component.ts` (tab `payment`, `changeRzpMode`) | Mode is a `WebsiteSettings` row (`razorpay_mode`, group `payment`), default `test`, credentials from configuration (`Razorpay:Test/Live:*`), switch refuses a mode whose keys are missing, SuperAdmin-only, toggle UI with confirm. **This is exactly the pattern for `delhivery_mode`.** The Razorpay code stays untouched. |
| Audit logging | `Entities/ActivityLog.cs` (`UserId, Action, EntityType, EntityId, Description, IpAddress, UserAgent`), `AppDbContext.ActivityLogs` | Table EXISTS (0 rows) but **nothing writes to it** and the Razorpay switch is not logged. PROPOSED: reuse it for Delhivery audit (no new table). |
| Email | `Services/EmailService.cs`, `EmailTemplates.cs`, `IEmailService` | Gmail SMTP; fire-and-forget; `SendAsync` swallows exceptions (cannot tell the caller whether it was sent). Existing `SendShippingUpdateAsync` / `SendDeliveryConfirmationAsync` fire when an order moves to Shipped/Delivered → **duplicate-email risk** if courier events also move the order. No outbox (outbox is out of scope for Stage 2). |
| DI / hosting | `Extensions/ServiceExtensions.cs`, `Program.cs` | `AddHttpClient()` already registered; no `BackgroundService` exists; no test project; Serilog logging. |
| Schema management | `Program.cs` 196-340 start-up DDL; `Migrations/*` (4 migrations); live `__EFMigrationsHistory` (3 rows) | See §4 and `06_…`. Baseline problem confirmed. |
| Frontend | `admin/orders/admin-order-detail.component.ts`, `features/account/order-detail`, `features/checkout/order-confirmation.component.ts`, `core/services/order.service.ts`, `app.routes.ts` | Tracking number is a raw text input / one text row; no timeline; confirmation page calls the anonymous order-number lookup. |
| Tests | repo search | **No backend test project and no Angular spec files exist.** `xunit`, `Microsoft.NET.Test.Sdk` and `Microsoft.AspNetCore.Mvc.Testing` are already in the local NuGet cache. Local PostgreSQL 18 listens on :5433. SDK 10.0.403 with `dotnet-ef` 10.0.7; runtime 8.0.33 for the net8.0 project. |

## 2. Security review result – what blocks safe shipping (Stage 2A)
Shipment creation stays **disabled** (code path present but returns "not enabled") until every row below is fixed and tested locally.
| # | Issue (from audits) | Why it blocks shipping | Minimal fix (PROPOSED) |
|---|---|---|---|
| A1 | Anonymous `GET /orders/number/{n}` returns full PII | Tracking would be exposed the same way | New minimal tracking DTO; guest lookup requires **order number + the e-mail or phone given at checkout** (generic error, rate-limited). Confirmation page reads the order from the create-order response (router state) instead of the anonymous lookup. Old endpoint restricted to owner/SuperAdmin. |
| A2 | `GET /orders/{id}` allows any signed-in user to read **guest** orders | Cross-customer leak | Guest orders readable only by SuperAdmin (guests use the verified lookup). |
| A3 | `PATCH /orders/{id}/cancel`: no ownership check; repeat cancel restores stock again; cancels paid orders with no refund | A shipped/shipping order could be cancelled by anyone; stock corruption | Owner-or-SuperAdmin only; allowed only from Pending/Confirmed; **refused when an active shipment exists** (admin must cancel the shipment first); stock restore inside a transaction guarded by status, so it can only happen once; paid orders are cancelled only by SuperAdmin and flagged "refund needed" (no automatic refund – out of scope). |
| A4 | `/returns` list + status update open to every signed-in customer; return creation allowed on any guest order | Data leak / tampering | `GET /returns`, `PATCH /returns/{id}/status` → SuperAdmin; `POST /returns` → owner of the order and status Delivered. |
| A5 | Admin status update accepts any transition and does not restore stock on Cancelled | Inconsistent order/shipment state | Transition table (Pending→Confirmed\|Cancelled, Confirmed→Shipped\|Cancelled, Shipped→Delivered\|Returned, Delivered→Returned; Cancelled/Returned terminal); Cancelled goes through the same single cancel routine; when an active shipment exists the admin cannot hand-edit tracking number or set Shipped/Delivered (the courier flow owns them). |
| A6 | Invoice endpoint readable by any signed-in user | PII | Owner-or-SuperAdmin. |
| A7 | `CreateAsync` not transactional | Partial orders → partial shipments | Wrap in one DB transaction (no idempotency-key feature; duplicate *orders* are not a shipment risk because duplicate *shipments* are blocked by DB constraints). |
| A8 | Checkout accepts any phone / PIN (2 live orders have bad phones) | Delhivery needs a valid 10-digit mobile and 6-digit PIN | Validate at checkout (API validator + form) and again before shipment creation. |
Out of Stage 2 (documented, not fixed): webhook stub for Razorpay, Razorpay refunds, coupon accounting, contact-form validation, default admin account, COD "mark as collected", GST invoice. None is needed for safe tracking; they stay in the open-issues list.
The Razorpay verification path is **not modified**.

## 3. Files and classes expected to change (all additive unless stated)
**Backend (`backend/EcommerceApp`)**
| File | Change |
|---|---|
| `Entities/Shipment.cs`, `Entities/ShipmentTrackingEvent.cs` | NEW entities (schema in `06_…`) |
| `Data/AppDbContext.cs` | add 2 `DbSet`s + `Data/Configurations/ShipmentConfiguration.cs` (NEW) |
| `Migrations/<ts>_AddShipmentTracking.cs` (+ Designer, snapshot update) | NEW versioned migration, hand-trimmed so it contains only the two new tables |
| `Interfaces/IDelhiveryConfigService.cs`, `Services/DelhiveryConfigService.cs` | NEW – mode, base URL, token (environment), pickup location; mirrors `RazorpayConfigService` |
| `Interfaces/IDelhiveryClient.cs`, `Services/DelhiveryClient.cs` | NEW typed `HttpClient`: create, track, cancel (later), label (later); sanitised logging; timeouts; no secrets in logs |
| `Services/DelhiveryStatusMapper.cs` | NEW, pure, unit-tested; mapping table in `07_…` |
| `Interfaces/IShipmentService.cs`, `Services/ShipmentService.cs` | NEW – eligibility, idempotent create/retry/reconcile, tracking persistence, order-status hand-off, notifications |
| `Services/DelhiveryTrackingWorker.cs` | NEW `BackgroundService` (interval, batch, no overlap, only non-final shipments) |
| `Controllers/v1/ShipmentsController.cs` | NEW endpoints (see `07_…`) |
| `DTOs/Shipments/*.cs`, `Validators/ShipmentValidators.cs` | NEW |
| `Services/OrderService.cs` | **MODIFY (security A2/A3/A5/A7)** – centralise status/cancel logic; tracking DTO method |
| `Controllers/v1/OrdersController.cs`, `ReturnController.cs` | **MODIFY (A1/A2/A3/A4/A6)** – authorization only |
| `Validators/OrderValidators.cs` | **MODIFY (A8)** – phone/PIN rules |
| `Services/EmailService.cs`, `EmailTemplates.cs`, `Interfaces/IEmailService.cs` | add 4 shipment templates + one `TrySend…` path that reports success (existing methods unchanged) |
| `Extensions/ServiceExtensions.cs`, `Program.cs` | register services, typed client, hosted worker, one rate-limit policy `order-track`; **no start-up DDL added** |
| `appsettings.json` | non-secret defaults only (`Delhivery:BaseUrlTest/BaseUrlLive/PickupLocation/DefaultWeightGrams/TrackingIntervalMinutes/BatchSize/EnableWebhook=false`) |
**Frontend (`frontend/src/app`)**
| File | Change |
|---|---|
| `core/services/shipment.service.ts`, `core/models/shipment.models.ts` | NEW |
| `shared/components/shipment-timeline/*` | NEW small component (summary + event list) reused by 3 pages |
| `admin/orders/admin-order-detail.component.ts` | add "Shipment Tracking" card + two buttons |
| `admin/settings/admin-settings.component.ts` | add tab "Shipping (Delhivery)" with the Test/Live toggle (copies the Razorpay card) |
| `features/account/order-detail/order-detail.component.ts` | add tracking section |
| `features/track-order/track-order.component.ts` + route in `app.routes.ts` | NEW guest tracking page (order number + email/phone) |
| `features/checkout/order-confirmation.component.ts`, `checkout.component.ts` | read the order from navigation state; phone/PIN validation |
**Tests (NEW project):** `backend/EcommerceApp.Tests` (xUnit; references the API project; HTTP mocked with a hand-written `HttpMessageHandler`; DB tests on a disposable local PostgreSQL database, never production). Angular: a few `ng test` specs for the timeline/guest page if Chrome headless is available.
**Not touched:** Razorpay services/controllers/settings, authentication, cart, product, nginx/deploy files.

## 4. Database and migration approach (details in `06_…`)
- Two new tables only (`Shipments`, `ShipmentTrackingEvents`); audit goes to the existing `ActivityLogs`; mode/auto-create flags go to the existing `WebsiteSettings`.
- Versioned EF Core migration, **never** start-up DDL, never `Database.Migrate()` on production.
- **Baseline hazard (confirmed):** the model snapshot lacks 8 legacy entities and 12 `OrderItems` columns that exist in the current source model, and live `__EFMigrationsHistory` lacks the 4th migration. A naïve `migrations add` would emit unrelated DDL and a naïve idempotent script would fail on production. Strategy: hand-trim the migration to the two shipment tables, review the generated SQL, script only `--from 20261007101057_AddCouponCodeToCart --to <new>`, test against a disposable restored copy, and diff the schema before/after to prove nothing else changed.
- Production application of the script is **not** part of Stage 2 and needs your explicit approval.

## 5. Phases (each ends with a report and a stop for your review)
| Phase | Content | Needs |
|---|---|---|
| 2.0 | Approve this plan, schema, API/status docs | **you** |
| 2.1 | Security fixes A1-A8 + tests (local) | local PostgreSQL copy |
| 2.2 | Migration + entities + config service + Delhivery mode toggle (admin UI) + audit | – |
| 2.3 | Delhivery client + status mapper + parsers **against mocked responses** | response samples (see §7) |
| 2.4 | Shipment service: eligibility, idempotent create/retry/reconcile, tracking persistence | – |
| 2.5 | Background worker, notifications | – |
| 2.6 | Admin order-detail card, account/guest tracking UI | – |
| 2.7 | Regression + test report `08_…`; real staging calls only if a staging token is provided | staging token |

## 6. Rules that will be enforced in code
- Create is manual (SuperAdmin) only; `AutoCreateShipment` is a stored flag that stays `false` and is forced back to `false` on any mode change; Stage 2 contains no code that creates shipments automatically.
- Create runs: eligibility check → insert a `Shipments` row with `CreationState=IN_FLIGHT` **inside a transaction (unique index blocks a second active shipment)** → call Delhivery → record `CREATED` + AWB, or `FAILED` (definite rejection, safe to retry), or `UNKNOWN` (timeout/network/ambiguous response). **`UNKNOWN` is never re-submitted automatically**; the admin "Create / retry" action on an UNKNOWN row first performs a reconciliation lookup (documented tracking API accepts `ref_ids` = our order reference); only a confirmed "not found" lets a retry proceed, and until the "not found" behaviour is confirmed from a real response the admin must verify in Delhivery One and press an explicit "Mark as not created" confirmation (audited).
- Pickup location is the exact registered string `Ganpati Herbal Ayurveda` from configuration; it is never typed by users.
- Test mode uses `https://staging-express.delhivery.com` and `Delhivery__ApiTokenTest`; live mode uses `https://track.delhivery.com` and `Delhivery__ApiToken`; live is refused when the live token variable is absent; no call is made at all when the corresponding token is missing. Shipment rows record their `Mode`; test-mode shipments never count as live.
- The token is read only from environment variables; it never appears in logs, DB, audit rows, API responses or the frontend; the existing live token is never displayed, copied or rotated.
- Customer data sent to Delhivery comes only from the order's stored snapshot; if a required field (name, 10-digit phone, address line, city, state, 6-digit PIN) is missing/invalid the create is refused with an admin-readable reason – nothing is fabricated. Product weight/dimensions do not exist in the database: the create uses `Delhivery:DefaultWeightGrams` (configuration) and omits dimensions; this is flagged in the admin card as "default weight used".
- The JSON body must avoid `& # % ; \` (Stage 1): address/description text is sanitised before sending (characters replaced, never silently dropped without logging that a replacement happened).

## 7. Prerequisites and unknowns (not guessed)
1. **Response schemas** for create / tracking were not captured in Stage 1 (only requests). I will first read the portal's response samples (read-only, in your logged-in Chrome) and store them as fixtures; the parsers are written against those, and any field that is not in a real sample stays "to confirm".
2. **Staging token and compatibility** – unknown. No Delhivery call of any kind is made until you confirm and place `Delhivery__ApiTokenTest` in the local environment. Until then: mocked tests only.
3. Meaning of tracking "not found", rate-limit and error responses (needed for UNKNOWN reconciliation and retry classification).
4. `UD/In Transit` → "Picked Up" vs "In Transit" distinction needs scan context (`07_…`).
5. Whether Delhivery returns an expected delivery date and a tracking URL – stored only if present; no URL is invented (a public Delhivery tracking link will be shown only if the documentation/response provides one).
6. Pincode serviceability (`product_type`) – not used in Stage 2 (out of scope); checkout only validates the 6-digit format.

## 8. Risks
| Risk | Mitigation |
|---|---|
| Security fixes change existing behaviour (checkout confirmation page, cancel) | regression tests; confirmation page switched to router state with fallback; changes limited to authorization/validation |
| Migration baseline drift | trimmed migration + SQL review + schema diff on disposable copy; not applied to production in Stage 2 |
| Duplicate/ambiguous shipments | DB partial unique index + IN_FLIGHT row first + UNKNOWN state + reconcile; unique `ClientOrderRef` per mode |
| Duplicate e-mails (legacy Shipped/Delivered mail + new shipment mail) | one status-change routine; courier-driven changes suppress the legacy mail; `NotifiedStatuses` guard |
| E-mail send result unknown (SMTP wrapper swallows errors) | new `TrySend` returns success; `NotifiedStatuses` updated only on success; no outbox in Stage 2 (accepted, documented) |
| Staging may not exist for this account | mocked tests clearly labelled; real calls only after confirmation |
| Test project requires NuGet restore | packages already in local cache; restore verified at start of 2.1; ask before any online download |
| Real money: live wallet ₹402.94 | live mode untouched; auto-create off |

## 9. Decisions needed from you
1. Approve the two-table schema in `06_…` (and reuse of `ActivityLogs` / `WebsiteSettings`).
2. Approve guest tracking = **order number + checkout e-mail or phone** (no new token table in Stage 2).
3. Approve the security fixes A1-A8 as the Stage 2A scope (they modify existing order/return code).
4. RTO handling: my proposal is that courier RTO events **do not** change the order status automatically (shown in admin only, since an RTO may need a refund decision). Confirm.
5. Approve adding the new test project `EcommerceApp.Tests` (new files only; packages from the local cache).
6. Allow me to read the Delhivery portal's response samples (read-only, no API calls, no token view) and later, when you provide it, use the test token.
7. Confirm the tab name "Shipping (Delhivery)" as a **new tab** in Admin → Settings (the existing "Shipping" tab holds the flat shipping charge).

## 10. Production statement
No production file, database, setting, container, token or Delhivery endpoint has been touched in this pass. Nothing was built or run in the repository. Only these planning documents were written.
