# 09 – Delhivery Stage 2.1: Security Hardening and Test Foundation – Report
Date: 2026-11-09 · Scope: phase 2.1 only (security fixes A1-A8 from `05_…`, tests). **No migration, Delhivery integration, shipment code, tracking worker or tracking UI was started.** Everything ran locally.

## 1. Result in one paragraph
All eight fixes are implemented and tested. Build: backend 0 warnings / 0 errors; frontend production build OK; **142 xUnit tests, 142 passed** (disposable local PostgreSQL + the real API process). Existing Razorpay, payment, cart, auth and e-mail source files are byte-identical to the baseline. Nothing in production was touched.

## 2. Security issues fixed
| # | Issue | Fix | Where |
|---|---|---|---|
| A1 | Anonymous `GET /orders/number/{n}` returned name, e-mail, phone, address, payments | Endpoint now requires sign-in and returns the order only to its owner or SuperAdmin (anonymous → 401, others → 404). New **guest lookup** `POST /orders/track` {orderNumber, contact}: matches the e-mail (trimmed, lower-case) or mobile number (any common format, normalised) used at checkout, compares in constant time, returns a **minimal DTO** (order number, status, dates, tracking number, item names/quantities – no address, phone, e-mail, payment or totals), identical generic 404 for wrong contact / unknown number / member order / empty input, **rate-limited per IP** (policy `order-track`, default 10/min, config `RateLimit:OrderTrackPerMinute`). The checkout confirmation page no longer calls any lookup (it receives the order from the create-order response). | `Controllers/v1/OrdersController.cs`, `Services/OrderService.cs`, `DTOs/Orders/OrderTrackingDtos.cs`, `Program.cs`, `checkout/order-confirmation.component.ts` |
| A2 | Any signed-in user could read guest orders | `GET /orders/{id}` and `/number/{n}`: owner or SuperAdmin only; **guest orders: SuperAdmin only**; refusals use the same 404 as a missing order (no existence leak). | `OrderAccess`, `OrderService.GetByIdForCallerAsync` |
| A3 | Anyone could cancel any order; repeat cancel restored stock again; paid orders cancelled with no flag | Cancel is owner-or-SuperAdmin; allowed only from Pending/Confirmed; the status change is one conditional UPDATE inside a transaction so only one of any number of (even simultaneous) cancels wins, and **only the winner restores stock** (atomic increment); repeat cancel answers 200 "already cancelled" without touching stock; a **paid order can only be cancelled by SuperAdmin** and gets `RefundStatus = Requested` ("refund review") – **no refund is made, Razorpay is not called**; an order with an open courier shipment cannot be cancelled (guard seam, see §6). | `OrderService.CancelCoreAsync` |
| A4 | `/returns` list and status update open to every signed-in customer; return creation allowed on any guest order | `GET /returns` and `PATCH /returns/{id}/status` → SuperAdmin only. `POST /returns` → only the buyer of that order and only when it is **Delivered**. Customer name is now filled on the request (the user is loaded). | `Controllers/v1/ReturnController.cs` |
| A5 | Any status change allowed; Cancelled via status did not restore stock | Approved transition table enforced (Pending→Confirmed/Cancelled, Confirmed→Shipped/Cancelled, Shipped→Delivered/Returned, Delivered→Returned; Cancelled and Returned terminal) → otherwise **409**. Optimistic update (only applies if the order is still in the validated status). Cancelled through the status endpoint uses the same single cancel routine (stock once). While an open shipment owns the order, manual Shipped/Delivered and tracking-number edits are refused (guard seam). Shipped/Delivered e-mails unchanged. | `OrderStatusRules`, `OrderService.UpdateStatusAsync` |
| A6 | Invoice readable by any signed-in user | Owner or SuperAdmin; guest-order invoice SuperAdmin only. | `OrderService.GenerateInvoiceAsync`, `OrdersController` |
| A7 | Order creation not transactional | Stock check, stock decrement, coupon use and the order insert are **one transaction**; products are row-locked (`SELECT … FOR UPDATE`, fixed order) so two simultaneous orders cannot both take the last unit; any exception rolls everything back. Cart cleanup and e-mails still happen after the commit. Also fixed on the way: a **zero/negative quantity** is rejected (a negative quantity used to *add* stock). | `OrderService.CreateAsync` |
| A8 | No phone/PIN validation (2 live orders have bad phones) | API: FluentValidation rules + the same checks inside `CreateAsync`. Mobile = 10-digit Indian number starting 6-9, `+91`/`91`/`0` prefixes and spaces/dashes accepted and **stored as 10 digits**; PIN = 6 digits, not starting with 0. Frontend: matching validators with messages ("Enter a valid 10-digit mobile number", "Enter a valid 6-digit PIN code") and the server's refusal reason is shown instead of failing silently. | `Common/OrderRules.cs`, `Validators/OrderValidators.cs`, `checkout.component.ts` |

## 3. Files
**Modified (10 source files)**
`backend/EcommerceApp/Controllers/v1/OrdersController.cs`, `Controllers/v1/ReturnController.cs`, `Services/OrderService.cs`, `Interfaces/IOrderService.cs`, `Validators/OrderValidators.cs`, `Extensions/ServiceExtensions.cs` (one DI line), `Program.cs` (rate-limit policy + `public partial class Program`),
`frontend/src/app/features/checkout/checkout.component.ts`, `features/checkout/order-confirmation.component.ts`, `features/account/order-detail/order-detail.component.ts`, `admin/orders/admin-order-detail.component.ts` (error messages only).
**Added (backend, 4):** `Common/OrderRules.cs`, `DTOs/Orders/OrderTrackingDtos.cs`, `Interfaces/IOrderShipmentGuard.cs`, `Services/NullOrderShipmentGuard.cs`.
**Added (tests, 8):** `backend/EcommerceApp.Tests/EcommerceApp.Tests.csproj`, `OrderRulesTests.cs`, `OrderServiceTests.cs`, `OrderApiSecurityTests.cs`, `RazorpayVerificationTests.cs`, `Support/{TestDatabase,ApiHost,Seed}.cs`.
Verified by a file-level diff against a copy of the tree taken before the first edit: no other source file differs. `PaymentService.cs`, `PaymentsController.cs`, `RazorpayConfigService.cs`, `CartService.cs`, `AuthService.cs`, `EmailService.cs` are **identical** to the baseline (compared byte by byte).
**Not created:** no migration, no entity, no table, no Delhivery code, no tracking UI, no `track-order` page.
Housekeeping: build output (`bin/`, `obj/`) was regenerated; my first `ng build` wrote to the existing `frontend/dist/frontend` folder (a pre-existing build artifact, not source and not used by the live deployment, which builds its own image) – later builds went to a scratch folder.

## 4. Tests added and results
Run: `dotnet test` in `backend/EcommerceApp.Tests` → **142 passed, 0 failed, 0 skipped**. Pure rules need no database; the rest use a **throw-away database created on the local PostgreSQL (localhost:5433), refused unless the host is localhost, dropped afterwards** (verified: none left). HTTP tests start the real built API as a child process (real JWT login, real routing and rate limiter) against its own test database with SMTP unconfigured (no e-mail can be sent) and no Razorpay keys. Frontend has no test suite in the repository (Angular `ng test` has no spec files), so frontend behaviour was checked in a browser instead (§5).
| Test class | Tests | Covers |
|---|---|---|
| `OrderRulesTests` | 58 | all 36 status pairs against the approved table; phone/PIN/e-mail normalisation (valid and invalid); owner/admin/guest access rule |
| `OrderServiceTests` | 63 | repeated cancel restores stock once; two simultaneous cancels; other customer cannot cancel; guest order admin-only; paid-order cancel (customer 403 / admin ok + refund flag, no payment rows, no refund); Shipped/Delivered/Returned not cancellable; every status pair via the service; stock once when cancelling via status; dates + tracking number on valid transition; courier-owned order refuses manual changes/cancel; customer cannot read another's or a guest order; invoice ownership; guest lookup by e-mail/phone in many formats; generic identical answer for 6 failure cases; DTO contains no address/contact/payment fields; valid order + normalised phone; 6 invalid phone/PIN cases rejected with nothing saved; zero/negative quantity; failure on a later item leaves stock/orders untouched; **database error while saving rolls back stock, coupon and order**; two simultaneous orders for the last unit → exactly one order, stock never negative |
| `OrderApiSecurityTests` | 16 | over real HTTP: other customer 404 (no address in body), anonymous 401, admin 200; order-number lookup 401 / owner-only; guest orders hidden from signed-in users; guest tracking leaks nothing and wrong/unknown give byte-identical answers; customer cancels own once / not others' / anonymous 401; paid order cancel (403 vs admin); status endpoint: customer 403, invalid transitions 409, valid chain incl. terminal; returns list + status admin-only; return creation ownership/Delivered/guest/anonymous; invoice owner/admin only; checkout rejects 4 bad phone/PIN combos and accepts a valid order with normalised phone |
| `GuestTrackingRateLimitTests` | 1 | 6 rapid guest lookups → 3 generic 404 then 3 × 429 |
| `RazorpayVerificationTests` | 4 | characterisation of the **unchanged** payment verification (stubbed Razorpay, fake keys): valid signature → Paid + Confirmed + one `Payments` row, repeat is idempotent; wrong signature, wrong Razorpay order id, amount mismatch all rejected and change nothing |
Requested-test mapping: all 12 required tests are covered (customer reads other's order ✔, guest needs matching contact ✔, wrong lookup reveals nothing ✔, other customer cancel ✔, repeat cancel ✔, paid cancel ✔, return endpoints ✔, invoice ✔, invalid transitions ✔, creation rollback ✔, phone/PIN ✔, Razorpay unchanged ✔).
Two of my first-run assertions failed because the existing `ApiResponse<string>.Ok("text")` stores the text in `Data` (not `Message`); the tests were corrected, no application change was needed.

## 5. Browser regression (local copy only)
API (:5000, local `uat_exact` copy, no e-mail) + Angular dev server (:4200): added a product to the cart; at checkout an invalid mobile number and PIN showed the new messages and disabled "Place Order"; after correcting them a **guest COD order** was placed, the confirmation page showed the order and the guest's e-mail address (previously blank) and made **no lookup request**; opening the confirmation link in a fresh tab showed only the order number and a generic message with no request to the API. Not browser-tested (covered by the API tests instead): logged-in order list/detail/cancel UI, admin order screens, Razorpay popup (needs real keys). I stopped both servers afterwards.

## 6. Behaviour changes (deliberate)
1. `GET /orders/number/{n}` needs a sign-in and ownership (was public); guests use `POST /orders/track`.
2. Not-yours/guest orders answer **404** (was 403 for member orders; guest orders were readable).
3. Cancel: only Pending/Confirmed (before, any non-Delivered order including Shipped could be cancelled); non-owner 404; repeat cancel returns 200 "already cancelled"; a customer cannot cancel a **paid** order (the account page now hides the button and says to contact the store); admin cancelling a paid order sets "refund requested" (no refund executed).
4. Admin status changes: invalid transitions return 409 with the reason (shown in the admin toast); re-sending the same status remains harmless; `Notes` is still not stored (existing behaviour) except as the cancellation reason when cancelling through the status endpoint.
5. Returns: admin-only management; customers can request a return only for their own **Delivered** orders.
6. Checkout: mobile numbers are stored as 10 digits; invalid phone/PIN → 400 with the reason; a customer whose **saved address** has an invalid phone must correct it before ordering.
7. New endpoint `POST /orders/track` (no UI yet, by design).
8. Orders now fail cleanly instead of partially (transaction + row locks).
9. The shipment-owned rules in A3/A5 use `IOrderShipmentGuard`; until shipments exist the registered `NullOrderShipmentGuard` always answers "no shipment", so nothing is blocked yet – covered by a test using a guard that says "yes". Real implementation comes with the shipment tables (Stage 2.2+).

## 7. Remaining security issues (not part of 2.1, still open)
| Issue | Note |
|---|---|
| Razorpay webhook is a stub; refunds are a DB flag only | out of scope by instruction; paid-order cancellations are flagged "refund requested" for manual handling |
| Contact form has no server validation or rate limit | found in the UAT report |
| Default admin account `admin@shopease.in` still active on the live site | needs your approval to deactivate |
| Duplicate-order protection (idempotency key) not added | only transactional safety was requested; duplicate shipments will be blocked in the database later |
| Guest tracking rate limit is per IP only (no per-order limit) | acceptable now; revisit with the tracking page |
| Guests cannot request returns (returns need a login) | unchanged limitation |
| JWT stored in `localStorage`; no account lock-out; Gmail SMTP only | unchanged |
| `OrderItems.ProductId → Products ON DELETE CASCADE`, `Orders.UserId SET NULL`, `Payments → Orders CASCADE` | DB-level integrity items for the later database phase |
| Coupon `UsedCount` incremented at order creation and not reversed on cancel; `TaxConfigs` ignored | unchanged |
| COD orders never become "Paid" | unchanged |
| Live server runs an older image than this source (schema drift) | these fixes are **not deployed**; deployment needs a separate approval |
| `dblink` extension present in the live database | origin unknown, not touched |

## 8. Confirmations
- **Razorpay was not modified**: `PaymentService.cs`, `PaymentsController.cs`, `RazorpayConfigService.cs`, the Razorpay settings row and all Razorpay frontend code are unchanged (byte-compared); verification behaviour is pinned by 4 characterisation tests.
- **Production was untouched**: no SSH/connection to the live server, no read or write on the live database, no deployment, no migration, no change to environment variables or configuration, no Delhivery call of any kind, no token viewed/generated/rotated, no e-mail sent. All databases used were local (`localhost:5433`): disposable test databases (dropped) and the pre-existing local copy `uat_exact` (one local test order was created in it during the browser check).
- No other developer database on that local server was touched.
- Stopping here as instructed. **Stage 2.2 (migration, entities, Delhivery mode setting) has not been started.**
