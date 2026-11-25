# 01 – Website (Customer Frontend) Audit
Phase 1 – read-only audit before the Delhivery integration · Audit date: 2026-11-09

**Labels:** EXISTING · PARTIALLY IMPLEMENTED · MISSING · ISSUE · PROPOSED
**Scope of this audit:** source code in `D:\GitHub\EcommerceApp` (Angular 18 frontend, .NET 8 API), the live API at `https://api.sidham.in` (unauthenticated, non-mutating probes only), and the live PostgreSQL metadata (SELECT only). Nothing was changed, deployed, installed or executed against customer data. No orders, payments, cancellations or refunds were created.

> **IMPORTANT – source and live deployment are not identical (ISSUE).** The source tree is ahead of what runs on sidham.in. The live database has **no** `OrderItems.ShipmentId/PickupId/ItemStatus…` columns and **no** `OrderItemTrackings` / `OrderPickups` tables, although `Entities/OrderItem.cs`, `Entities/LegacyEntities.cs` and the startup DDL in `Program.cs` (≈ lines 218-282) define them. The live container runs the prebuilt image `sidham-uat-backend-prebuilt:latest` (built 2026-10-14). Anything below that I read from source is marked "source"; where I could confirm it against the live API it is marked "live-confirmed". **Deploying the current source would silently ALTER the live database at start-up** (the `ExecuteSqlRaw` block adds columns/tables). That must be a conscious, approved step in the shipping phase.

---

## 1. Project overview
| Item | Finding | Evidence |
|---|---|---|
| Frontend | EXISTING – Angular 18, standalone components, lazy-loaded routes, Angular Material (storefront) + PrimeNG (admin), served by nginx | `frontend/src/app/app.routes.ts`, `deploy/Dockerfile.web`, `deploy/spa.conf` |
| Backend | EXISTING – ASP.NET Core 8 REST API `api/v1/*`, EF Core + PostgreSQL | `backend/EcommerceApp/Controllers/v1/*.cs` |
| Live URLs | EXISTING – `https://sidham.in` (storefront + `/admin`), `https://api.sidham.in` (API), `www`/`nexus` redirect | `deploy/nginx/production.conf` |
| Environments | storefront uses `environment.prod.ts` → `https://api.sidham.in` | `frontend/src/environments/`, `angular.json` fileReplacements |

## 2. Website architecture
### 2.1 Structure (EXISTING)
```
frontend/src/app/
  app.routes.ts            all routes (storefront, /auth, /admin)
  core/guards/auth.guard.ts           authGuard, adminGuard, guestGuard
  core/interceptors/auth.interceptor.ts  adds Bearer token + X-Session-Id (guest cart id, localStorage)
  core/interceptors/error.interceptor.ts 401 -> logout of that area; 403 -> home
  core/services/*.service.ts          api, auth, cart, order, payment, product, content, settings, wishlist…
  core/models/order.models.ts         OrderStatus/PaymentStatus/PaymentMethod enums + DTOs
  features/…                          storefront pages
  shared/components/…                 header, footer, layout, product-card, breadcrumb
  admin/…                             admin panel (see 02_ADMIN_BACKEND_AUDIT.md)
```
### 2.2 Routing and navigation (EXISTING)
Storefront routes in `app.routes.ts`: `/`, `/products`, `/products/category/:categorySlug`, `/products/:slug`, `/cart`, `/checkout`, `/order-confirmation/:orderNumber`, `/compare`, `/wishlist` (auth), `/contact`, `/about`, `/blogs`, `/faqs`, `/page/:slug`, trust pages, `/consultation`, `/dosha-quiz`, and `/account/{profile,orders,orders/:id,addresses,change-password,returns,referral}` (all behind `authGuard`). `/auth/{login,register,forgot-password}` behind `guestGuard`. Unknown paths redirect to `/` (`path: '**'`).
Header and footer: `shared/components/header/header.component.ts`, `footer.component.ts`, wrapped by `layout.component.ts`.

### 2.3 Product listing, product detail, cart, checkout (EXISTING)
| Area | File | Notes (evidence) |
|---|---|---|
| Listing | `features/products/product-list`, `category-page` | live API `GET /api/v1/products` returned 25 products (UAT run 2026-11-03) |
| Detail | `features/products/product-detail` | route by slug |
| Cart | `features/cart/cart.component.ts`, `core/services/cart.service.ts` | server-side cart per user or guest session (`CartController`), persists across reload (tested 2026-11-03) |
| Checkout | `features/checkout/checkout.component.ts` (481 lines) | form: name, phone, email (guests only), address lines, city, state, PIN; payment choice Razorpay / COD |
| Confirmation | `features/checkout/order-confirmation.component.ts` | loads the order by **order number** from `GET /orders/number/{n}` |

### 2.4 Responsive design (EXISTING / PARTIALLY)
EXISTING – mobile test at 375 px on 6 pages showed no horizontal overflow (home, products, product detail, cart, contact, admin login; 2026-11-03). Only 5 `@media` rules in checkout, 8 in cart, 3 in header (`grep -c "@media"`), so responsiveness relies mostly on flex/grid; PARTIALLY verified for checkout/account pages at phone width.

### 2.5 Error handling (PARTIALLY IMPLEMENTED)
- EXISTING: global `error.interceptor.ts` (401 session end, 403 redirect); checkout shows toast on failure; confirmation page has a "We couldn't load that order" state.
- ISSUE: `ExceptionMiddleware.cs` returns the raw exception message to the client in `errors[]` for every 500 (`ApiResponse.Fail(..., [exception.Message])`) – information disclosure.
- ISSUE: if the browser closes after Razorpay succeeds but before `/payments/razorpay/verify` runs, there is **no webhook fallback** (see §5), so a paid order stays Pending.

## 3. Customer authentication
| Feature | Status | Evidence |
|---|---|---|
| Registration | EXISTING | `features/auth/register`, `POST /auth/register`, `RegisterValidator` (≥ 8 chars, 1 uppercase, 1 digit) in `Validators/AuthValidators.cs`; welcome e-mail sent |
| Login / logout | EXISTING | `POST /auth/login` (rate limit 20/min per IP, `[EnableRateLimiting("login")]`), BCrypt verify (`AuthService.cs`), JWT stored in `localStorage` key `ec_token` (admin: `ec_admin_token`) |
| Forgot / reset password | EXISTING | e-mailed 6-digit OTP → single-use reset token → new password (`/auth/forgot-password`, `/verify-reset-otp`, `/reset-password`; 10/min per IP); reset signs out all sessions (`PasswordChangedAt` vs JWT `iat`, `Program.cs` `OnTokenValidated`) |
| Session management | EXISTING | JWT bearer, issuer/audience/lifetime validated, `ClockSkew = 0`; every request re-checks `IsActive` in the DB |
| Guest identification | EXISTING | random UUID `guest_session_id` in `localStorage`, sent as `X-Session-Id` on every request (`auth.interceptor.ts`); also read from cookie `session_id` in `CartController` |
| Account lock-out after repeated failures | MISSING | only IP rate-limit; no per-account lock |
| E-mail verification at registration | MISSING | account is usable immediately |
| Token storage | ISSUE (risk) | JWT in `localStorage` is readable by any XSS; no refresh-token / revocation list other than password change |

**Can guests order without an account? YES – EXISTING.** Evidence: `checkout.component.ts` guest notice ("Ordering as guest"), e-mail made mandatory for guests (`addValidators(Validators.required)`), and `OrdersController.Create` (lines 44-58) accepts anonymous callers if `GuestName` and a valid `GuestEmail` are present. Live DB: 4 of 9 orders are guest orders (`UserId IS NULL`), each with name, e-mail and phone.
**Logged-in checkout – EXISTING:** `dto.UserId` is forced to the token's user (`OrdersController.cs:48`), saved addresses are offered (`orderService.getAddresses()`), guest cart is merged on login (`POST /cart/merge`).

## 4. Existing order journey – traced step by step
| # | Step | Actual implementation | Status |
|---|---|---|---|
| 1 | Select product | `product-detail.component.ts` | EXISTING |
| 2 | Add to cart | `POST /cart/items` → `CartService.AddItemAsync`, stock checked (`CartService.cs:54`) | EXISTING |
| 3 | Checkout | `/checkout` → `placeOrder()` (`checkout.component.ts:404`) | EXISTING |
| 4 | Delivery info | one address form; **billing = shipping copy** (dto sends both); no pincode serviceability check; no phone-format validation (only `required`) | PARTIALLY – ISSUE: live DB has 2 orders whose phone is not 10 digits |
| 5 | Payment | COD: order created, done. Razorpay: `orders` → `payments/razorpay/create-order/{id}` → Razorpay popup → `payments/razorpay/verify` (HMAC-SHA256, server re-checks amount with Razorpay) | EXISTING |
| 6 | Order created | `OrderService.CreateAsync` (`OrderService.cs:89-216`): recomputes price/tax from DB (client prices ignored – good), decrements stock, applies coupon, shipping from `ShippingConfigs`, inserts `Orders` + `OrderItems` | EXISTING |
| 7 | Confirmation displayed | `/order-confirmation/:orderNumber` | EXISTING – ISSUE: for **guests** the "confirmation email is on its way to …" line is blank (`email` only set from the logged-in user, `order-confirmation.component.ts` last lines) |
| 8 | Confirmation e-mail | COD: sent at creation; online: sent only after payment verification (`OrderService.cs:207-214`, `PaymentService.cs:148-156`). Live log: "Email SENT … Order Confirmed" for orders of 2026-11-06 | EXISTING |
| 9 | In customer account | `/account/orders`, `/account/orders/:id` via `GET /orders/my-orders` | EXISTING (logged-in only) |
| 10 | Admin manages | `/admin/orders`, `/admin/orders/:id` | EXISTING (see 02) |

Live evidence of the flow (read-only SQL): 9 orders; 6 Pending (4 COD, 2 Razorpay), 3 Cancelled; **0 orders Confirmed/Shipped/Delivered; 0 rows in `Payments`; 0 orders ever Paid**. The online-payment success path has therefore **never been executed end-to-end on this database** (PARTIALLY verified: only the code path was reviewed).

## 5. Existing order-related functionality
| Item | Status | Detail / evidence |
|---|---|---|
| Order ID | EXISTING | `Orders.Id` GUID (PK) |
| Order number | EXISTING | `ORD-yyyyMMdd-XXXXXX` (6 random hex of a GUID) – `OrderService.GenerateOrderNumber()` (line 332); unique index `IX_Orders_OrderNumber`. ISSUE: only ~16.7 M values per day – and the number is the *only* key the confirmation page uses (see §7) |
| Confirmation page | EXISTING | above |
| Order details page | EXISTING | `features/account/order-detail` shows items, totals, addresses, status, `trackingNumber` (one line), Cancel button when status Pending/Confirmed |
| Order history | EXISTING (accounts only) | `features/account/orders` |
| Order status | EXISTING | enum Pending 1, Confirmed 2, Shipped 3, Delivered 4, Cancelled 5, Returned 6 (`Common/Enums.cs`) |
| Payment status | EXISTING | Pending 1, Paid 2, Failed 3, Refunded 4, PartialRefund 5; ISSUE: COD orders stay `Pending` forever – nothing marks COD as Paid after delivery (live: all 6 COD orders PaymentStatus 1) |
| Shipping / billing address | EXISTING | snapshot columns on `Orders` (`Shipping*`, `Billing*`) |
| Guest identification | PARTIALLY | `GuestName/GuestEmail/GuestPhone` columns; no token, no lookup by e-mail |
| E-mail notifications | EXISTING | welcome, order confirmed, payment received, shipped, delivered, cancelled, password reset, contact, consultation, newsletter, review (`Services/EmailTemplates.cs`) |
| Invoice | ISSUE | `GET /orders/{id}/invoice` returns a **plain-text stub** labelled "invoice" (`OrderService.GenerateInvoiceAsync`, comment "integrate a PDF library"); frontend `downloadInvoice` exists but no GST invoice |
| Order cancellation by customer | EXISTING with ISSUES | see doc 02 §B (no ownership check) |
| Returns | PARTIALLY | `/account/returns`, `POST /returns` – request only; no pickup/RTO |

## 6. Where tracking can be added (PROPOSED – nothing implemented)
| Requirement | Best existing location | Existing component that helps |
|---|---|---|
| **Track My Order** page | new route `track-order` (and `track-order/:orderNumber`) inside the storefront `LayoutComponent` children in `app.routes.ts` (public – no `authGuard`) | `OrderService.getByOrderNumber`, `order-confirmation.component.ts` layout/CSS, header/footer links |
| Tracking ID display | `features/account/order-detail/order-detail.component.ts` line ≈ 58 already prints `trackingNumber`; also the confirmation page and the e-mail (`EmailTemplates.ShippingUpdate`, line 280) | `Orders.TrackingNumber` column (EXISTING, free-text) |
| Courier partner information | same blocks (header of the new Tracking card) | none – MISSING (no courier name column on `Orders`) |
| Shipment status / Estimated delivery date / Timeline / History | new `ShipmentTimelineComponent` (shared) used by Track page, account order detail and admin order detail | status chips `statusChip()` / `statusLabel()` in `order-detail.component.ts`; `LegacyEntities.OrderItemTracking` (source only, not in live DB) is a ready model of an event |
| Guest tracking | Track page form: order number + e-mail or phone **or** a signed link from the e-mail | `Orders.GuestEmail/GuestPhone`; see §7 |
| Logged-in tracking | `/account/orders/:id` (extend) and an inline "Track" button in `/account/orders` list | `OrderService.getById` |
| Order-confirmation page | add "Track your order" link (needs the secure token, §7) | `order-confirmation.component.ts` |

## 7. Problems identified (website side)
1. **ISSUE (High, security/privacy) – anonymous order lookup by order number.** `GET /api/v1/orders/number/{orderNumber}` has no `[Authorize]` (`OrdersController.cs:35-37`) and returns the full `OrderDetailDto`: customer name, **e-mail, shipping/billing address, phone**, items, payment ids. Live-confirmed: an unknown number returns `404 {"message":"Order not found."}` without any authentication (not 401). The endpoint exists only because the confirmation page needs it. Order numbers are date + 6 hex characters, so they can be enumerated and are also printed in e-mails.
2. ISSUE – the same response includes the order's `Id` (GUID), which is the only secret protecting `POST /payments/razorpay/create-order/{id}` for guest orders and `PATCH /orders/{id}/cancel` (see doc 02) – so the "unguessable id" assumption (comment in `PaymentService.cs:53`) is void.
3. ISSUE – guest confirmation page shows no e-mail address (blank).
4. ISSUE – checkout has no PIN-code or phone validation (needed for courier).
5. ISSUE – COD never becomes Paid; revenue statistics only count Paid, so COD sales are invisible in the dashboard (`OrderService.GetStatsAsync`, line 326).
6. ISSUE – no "Track order" page; account order detail shows only a raw tracking number text.
7. ISSUE – `ShippingConfigs` and `TaxConfigs` have 0 rows on the live DB: every order so far has shipping ₹0 and tax ₹0 (all 9 orders `ShippingCharge = 0`, `TaxAmount = 0`).
8. ISSUE – the admin Orders list loads only the latest 200 orders and filters in the browser (`admin-order-list.component.ts:630`, `pageSize: 200`) – older orders become invisible as volume grows.

## 8. Missing functionality (storefront)
MISSING: Track My Order page · tracking timeline · courier name · estimated delivery date · guest tracking · delivery-pincode serviceability check · COD verification (OTP/call) · return-shipment tracking · shipped/out-for-delivery/delivered notifications beyond the two e-mails · order invoice PDF · SMS/WhatsApp notifications.

## 9. Risks
| Risk | Level |
|---|---|
| Anyone can read any customer's order (name, phone, address) by guessing/receiving an order number | High |
| Pending online orders keep decremented stock forever if the customer abandons payment (stock reserved on order creation, restored only on cancel) | Medium |
| Paid-but-not-verified orders if browser closes (no webhook) | Medium |
| Source/live drift: a normal redeploy changes the live schema | Medium |
| JWT in `localStorage` | Low-Medium |

## 10. Recommendations
1. PROPOSED: replace the confirmation page's anonymous lookup with a **one-time order-view token** returned by `POST /orders` (stored hashed, short expiry), or accept the order id from `history.state`; make `GET /orders/number/{n}` require `number + (email or phone)` and return a minimal, non-PII tracking DTO.
2. PROPOSED: build `/track-order` and a shared timeline component (see §6) – storefront only, read-only calls.
3. PROPOSED: client + server validation of phone (10 digits) and PIN (6 digits) at checkout.
4. PROPOSED: fill the guest e-mail on the confirmation page from the order.
5. PROPOSED: replace the 200-order client-side admin list with server-side paging/filtering.
6. PROPOSED: mark COD orders Paid on delivery (or on admin "collect COD").

## 11. Future Delhivery integration requirements (storefront part)
- Public tracking endpoint and page returning only: order number, masked address (city/PIN), items, courier name, AWB, status, ETA, timeline events – no phone/e-mail/full address.
- Account order detail and orders list to show shipment status and a "Track" action.
- Shipment e-mail links open the Track page with a signed token (no login needed).
- Checkout must collect valid 6-digit PIN + 10-digit mobile (Delhivery rejects invalid pins/phones) and ideally call a serviceability check.
- All Delhivery calls happen in the backend only; the storefront never receives Delhivery credentials.
