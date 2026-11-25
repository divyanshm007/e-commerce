# ShopEase / EcommerceApp - audit and fixes (2026-10-14)

Scope: checkout -> order -> payment -> email flow, forgot/reset password for admins and customers, cart persistence and login state.
Everything below was verified on a local run (.NET 8 API, Angular 18, local PostgreSQL). Nothing was deployed.

## 1. Root causes

### Issue 1 - order saved under admin@shopease.in, no email to the buyer
| # | Root cause | Where |
|---|---|---|
| 1a | **The API token was chosen admin-first.** `AuthService.getToken()` returned `adminToken ?? customerToken`. When the admin panel and the shop are used in the same browser, every storefront request (cart, order, payment) carried the *admin* JWT, so the API recorded the admin as the buyer. | `core/services/auth.service.ts` |
| 1b | The order email goes to `order.UserId`'s address, so it went to `admin@shopease.in` - the logs show `Email SENT to admin@shopease.in: Order Confirmed`. SMTP itself was working. | `OrderService` |
| 1c | The admin login form shipped with the admin email and password **pre-filled in the source**. | `admin-login.component.ts` |
| 1d | `POST /orders` trusted a `userId` in the request body for anonymous callers (order could be attributed to anyone). | `OrdersController` |
| 1e | "Order Confirmed" was emailed when the order was *created*, i.e. before an online payment succeeded. | `OrderService` |
| 1f | The validator required guest name/email whenever `UserId` was null - but `UserId` is only set *after* validation, so a signed-in customer's order was rejected as an incomplete guest order. | `OrderValidators` |
| 1g | Verification did not check that the payment belonged to *this* order's Razorpay order; the placeholder "Razorpay order" was a made-up id, so real checkout could not work. | `PaymentService` |

### Issue 3 - logged out / cart full of purchased products
| # | Root cause | Where |
|---|---|---|
| 3a | **Nothing ever cleared the cart after a purchase** (neither API nor UI). The in-memory cart signal also survived logout/login. | `OrderService`, `CartService` (UI) |
| 3b | After paying, the app navigated to `/order-confirmation/:id`, a route that did not exist, so the wildcard sent the user to the home page. | `checkout.component.ts`, `app.routes.ts` |
| 3c | A signed-in user's cart kept the browser's guest `SessionId`, and guest lookups matched on session id alone - so after logout the next visitor on that browser saw the previous user's cart. | `CartService.FindCartAsync` |
| 3d | The guest->user cart merge was never called by the UI, and when called it crashed with a 500 (EF issued an UPDATE for a new item). | `auth.service.ts`, `CartService.MergeGuestCartAsync` |
| 3e | Any 401 - including a wrong password or a 401 from the other session type - signed the user out. | `error.interceptor.ts` |
| 3f | Admin and shopper tokens were mixed (1a), so shop requests could be rejected or served as the admin. | `auth.service.ts` |

### Issue 2 - forgot password
The old flow returned the reset token **in the API response** (anyone who knew an email could take over the account), linked to a hard-coded `https://sidhampharmacy.com/reset-password`, had no throttling, did not invalidate sessions and the admin login had no reset at all.

## 2. What was implemented

**Authentication / tokens**
- Token follows the area: admin panel sends the admin token, the shop sends the customer token. They never mix.
- Portal-checked login: a customer cannot start an admin session and vice versa - rejected before anything is stored.
- Admin login form no longer ships credentials; admin seed account comes from `SeedAdmin:*` configuration.
- The 401 handler ignores credential endpoints and only ends the session of the area the request came from.
- JWT now carries `iat`; the API rejects tokens of deactivated users and tokens issued before the user's last password reset.

**Checkout**
- The buyer is always the authenticated caller; anonymous callers cannot supply a user id. Guest name/email are validated for anonymous callers only.
- Real Razorpay order creation (test/live switch), amount + order-id + signature checks, idempotent verification.
- Confirmation: COD -> at order creation. Online -> only after the payment is verified (order confirmation + payment email, to the buyer's own account/guest email).
- Only the purchased quantities are removed from the buyer's own cart; an emptied cart is closed as Converted.
- Orders, payments and Razorpay orders can only be read/paid by their owner or an admin.
- New public confirmation page `/order-confirmation/:orderNumber`.
- Email: no hard-coded fallbacks; missing SMTP settings are logged as an error; recipient problems are logged.

**Forgot / reset password (customers and admins)**
- Email -> 6-digit OTP -> new password, on `/auth/forgot-password` and `/admin/forgot-password`.
- OTP: cryptographically random, HMAC-hashed, 10-minute expiry, 5 attempts then the code is burned, single use.
- Resend: 60-second cooldown (also shown in the UI), max 5 codes/hour per account, plus per-IP rate limits (429).
- Same response for unknown/inactive accounts (no enumeration); each portal only resets its own account type.
- After the OTP is verified a separate single-use 10-minute reset token is required to set the password.
- Success invalidates every existing token for that user and the UI sends the user to the login page.

**Cart**
- User carts are keyed by user id only; guest carts are never returned for a signed-in user (and vice versa).
- Login merges the guest cart into the user's cart; logout clears the in-memory cart; the header loads the cart on start so the badge survives a refresh.

## 3. Files changed
Backend (`backend/EcommerceApp`): `Program.cs`, `appsettings.json`, `appsettings.Local*.json`, `EcommerceApp.csproj`, `Entities/User.cs`, `DTOs/Auth/AuthDtos.cs`, `DTOs/Orders/OrderDtos.cs`, `DTOs/Payments/PaymentDtos.cs`, `Validators/AuthValidators.cs`, `Validators/OrderValidators.cs`, `Interfaces/{IAuthService,ICartService,IEmailService,IOrderService,IPaymentService,IRazorpayConfigService}.cs`, `Services/{AuthService,CartService,EmailService,EmailTemplates,OrderService,PaymentService,RazorpayConfigService,TokenService}.cs`, `Controllers/v1/{AuthController,OrdersController,PaymentsController}.cs`, `Extensions/ServiceExtensions.cs`; new `backend/.dockerignore`, `.gitignore`.
Frontend (`frontend/src/app`): `core/services/{auth,payment}.service.ts`, `core/interceptors/error.interceptor.ts`, `core/models/auth.models.ts`, `app.routes.ts`, `admin/admin-login/*`, `admin/settings/admin-settings.component.ts`, `features/auth/login/*`, `features/auth/forgot-password/*`, `features/checkout/checkout.component.ts`, `shared/components/header/header.component.ts`; new `shared/components/password-reset-flow/*`, `admin/admin-forgot-password/*`, `features/checkout/order-confirmation.component.ts`; removed `features/auth/reset-password/*` (route now redirects to forgot-password).
Docs: `README.md`, Postman collection, this report.

## 4. Tests run (all against the local app)
- Password reset, customer + admin (76 checks): wrong portal, unknown email, throttled resend, OTP hashing, wrong/locked/reused OTP, grant single-use, weak password, old token rejected (401), old password rejected, new password works, hourly cap.
- Checkout / cart / ownership / payment / email (38 checks): cart isolation between two customers, admin and guests; guest cart merge; order owner = buyer; spoofed user id ignored; COD removes only purchased items; confirmation email to buyer (not admin); cross-user access denied (403); real Razorpay test order; forged signature, other-order payment and replay rejected; paid order -> Paid/Confirmed + payment row + only paid items removed + emails; idempotent verify; guest online payment.
- Rate limits: 11th reset request and 21st login request within a minute return 429.
- Browser (Chrome pane): admin and customer logged in side by side -> shop as customer -> order belongs to the customer, email to the customer, cart cleared, still logged in, confirmation page; abandoned online payment keeps cart; logout hides the cart, login merges the guest cart; customer and admin forgot-password flows end-to-end including redirect and the admin's previous session being invalidated; customer on the admin portal and admin on the shop portal are refused with no session stored.
- Builds: `dotnet build` 0 errors; `ng build` (development and UAT) succeeds.
- Not automated: completing a card payment inside Razorpay's hosted popup (cross-origin iframe). The popup opened with the right key and order; verification was exercised through the API with a correctly signed payload.

## 5. Remaining configuration / follow-ups
1. **Deploy secrets as environment variables** on UAT: `Email__Username`, `Email__Password`, `Email__AdminEmail`, `Razorpay__Test__*`, `Razorpay__Live__*`, `SeedAdmin__*` (only needed on an empty database), `Jwt__Key`. `appsettings.json` no longer contains the Gmail password or Razorpay keys.
2. **The old Gmail app password and the Jwt key were committed in `appsettings.json`** (and `backend/publish/appsettings.json` still contains them). Rotate both and delete the stale `publish` folder.
3. New columns on `Users` are added at startup with `ALTER TABLE ... IF NOT EXISTS` (the app uses `EnsureCreated`, not migrations). No manual SQL needed.
4. Existing orders that were attached to the admin account by mistake cannot be re-assigned automatically.
5. Refunds are still a stub (marks the refund as processing, no Razorpay call) and the Razorpay webhook does not update payments.
6. A Gmail account is a weak transactional-mail channel; use a transactional provider (SES, Resend, Postmark) before production.
7. `GET /orders/number/{orderNumber}` is public by design (guest tracking); order numbers are not secret.
