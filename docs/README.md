# EcommerceApp — Full Documentation

A production-ready mid-level ecommerce platform: customer storefront + Super Admin panel, built with **.NET 8**, **PostgreSQL**, **Angular 18**, and **Razorpay**.

---

## Project Structure

```
EcommerceApp/
├── backend/
│   └── EcommerceApp/            # Single .NET 8 Web API project
│       ├── Common/              # BaseEntity, Enums, ApiResponse<T>, PagedResult<T>
│       ├── Entities/            # EF Core entities (User, Product, Order, Cart, ...)
│       ├── DTOs/                # Request/response DTOs grouped by module
│       ├── Interfaces/          # Service interfaces
│       ├── Data/                # AppDbContext + entity configurations
│       ├── Repositories/        # Generic repository
│       ├── Services/            # Business logic (Auth, Product, Order, Payment, ...)
│       ├── Mappings/            # AutoMapper profile
│       ├── Validators/          # FluentValidation validators
│       ├── Controllers/v1/      # API controllers (route: /api/v1/*)
│       ├── Middleware/          # Exception + visitor tracking middleware
│       ├── Extensions/          # DI registration
│       ├── Program.cs
│       ├── appsettings.json
│       └── EcommerceApp.csproj
├── frontend/                    # Angular 18 standalone app
│   └── src/app/
│       ├── core/                # models, services, guards, interceptors
│       ├── shared/              # header, footer, product-card, rating, breadcrumb, dialogs
│       ├── features/            # home, products, cart, checkout, wishlist, auth, account, static pages
│       └── admin/               # admin layout, dashboard + all management pages
└── docs/
    ├── README.md                            # this file
    └── EcommerceApp.postman_collection.json # import into Postman
```

---

## User Roles

| Role | Description |
|---|---|
| **Guest** (anonymous) | Browse catalog, use cart (session cookie), place orders as guest |
| **Customer** (registered) | Everything a guest can + wishlist, saved addresses, order history, reviews |
| **SuperAdmin** | Single admin role. Full access to the admin panel and all management APIs |

Catalog hierarchy: **Category → Product** (no brands).

---

## Tech Stack

**Backend**
- .NET 8 Web API (single project)
- PostgreSQL + EF Core 8 (Npgsql)
- JWT authentication (HMAC-SHA256), role-based authorization
- BCrypt password hashing
- AutoMapper 12, FluentValidation 11
- Serilog (console + rolling file logs in `logs/`)
- Razorpay payment gateway (order create, signature verify, webhook, refunds)
- Swagger UI at `/swagger`

**Frontend**
- Angular 18 (standalone components, lazy-loaded routes)
- Angular Material 18 (indigo/orange theme)
- Angular Signals for auth & cart state
- Functional interceptors (`authInterceptor`, `errorInterceptor`) and guards (`authGuard`, `adminGuard`, `guestGuard`)
- Razorpay Checkout JS (loaded in `index.html`)

---

## Getting Started

### Prerequisites
- .NET SDK 8.x
- Node.js 20.x + npm
- PostgreSQL 14+

### 1. Database
Create a database and update the connection string in `backend/EcommerceApp/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=ecommerce_db;Username=postgres;Password=YOUR_PASSWORD"
}
```

The schema is created automatically on first run (`EnsureCreated`).

### 2. Secrets and local configuration
Secrets are **not** kept in `appsettings.json`. Copy `appsettings.Local.example.json` to `appsettings.Local.json` (git-ignored, never published to the Docker image) and fill it in. In UAT/production use environment variables instead (they override the file), e.g. `Email__Password`, `Razorpay__Live__KeySecret`, `SeedAdmin__Password`.

| Setting | Purpose |
|---|---|
| `Email:Username` / `Email:Password` / `Email:AdminEmail` | SMTP login (Gmail app password) and the store-owner inbox for admin notifications. Nothing is sent if these are empty — the API logs `Email NOT sent … SMTP is not configured` |
| `Razorpay:Test:*` / `Razorpay:Live:*` | Both key sets. The admin panel (Settings → Payment) picks which is active |
| `SeedAdmin:Email` / `SeedAdmin:Password` | First-run SuperAdmin. If empty and no admin exists, none is created |
| `RateLimit:LoginPerMinute` / `RateLimit:PasswordResetPerMinute` | Per-IP limits (defaults 20 and 10) |

### 2b. Razorpay keys (legacy example)
In `appsettings.json`:

```json
"Razorpay": {
  "KeyId": "rzp_test_xxxxxxxx",
  "KeySecret": "xxxxxxxxxxxx",
  "WebhookSecret": "xxxxxxxxxxxx"
}
```

Also set the public key in `frontend/src/environments/environment.ts` (`razorpayKeyId`).

### 3. Run backend

```bash
cd backend/EcommerceApp
dotnet run
```

API: `http://localhost:5000/api/v1` · Swagger: `http://localhost:5000/swagger`

### 4. Run frontend

```bash
cd frontend
npm install
npx ng serve
```

App: `http://localhost:4200`

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

Every response uses a standard envelope:

```json
{
  "success": true,
  "message": "OK",
  "data": { },
  "errors": null
}
```

Paged endpoints return `data` as:

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

Auth: send `Authorization: Bearer <token>` header. Get a token from `POST /auth/login`.

### Auth — `/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register customer, returns JWT |
| POST | `/auth/login` | Public | Login, returns JWT + profile |
| POST | `/auth/forgot-password` | Public | Email a 6-digit one-time code (`{email, portal}`). Same answer whether or not the account exists |
| POST | `/auth/verify-reset-otp` | Public | Exchange the code for a single-use reset token (`{email, otp, portal}`) |
| POST | `/auth/reset-password` | Public | Set the new password (`{email, resetToken, newPassword, portal}`). Signs the user out everywhere |
| POST | `/auth/change-password` | Auth | Change current password |
| GET | `/auth/profile` | Auth | Get current user profile |
| PUT | `/auth/profile` | Auth | Update name/phone |

### Categories — `/categories`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/categories` | Public | All categories (with subcategories + product counts) |
| GET | `/categories/root` | Public | Root categories only |
| GET | `/categories/{id}` | Public | Category by id |
| POST | `/categories` | SuperAdmin | Create category |
| PUT | `/categories/{id}` | SuperAdmin | Update category |
| DELETE | `/categories/{id}` | SuperAdmin | Delete category |
| PATCH | `/categories/{id}/toggle-status` | SuperAdmin | Activate/deactivate |

### Products — `/products`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/products` | Public | Paged list. Query: `page, pageSize, search, categoryId, minPrice, maxPrice, isFeatured, isNewArrival, isBestSeller, isSpecialOffer, inStock, sortBy, sortDirection` |
| GET | `/products/{id}` | Public | Product detail (images, variants, approved reviews) |
| GET | `/products/slug/{slug}` | Public | Product detail by SEO slug |
| GET | `/products/featured` | Public | Featured products |
| GET | `/products/new-arrivals` | Public | New arrivals |
| GET | `/products/best-sellers` | Public | Best sellers |
| GET | `/products/special-offers` | Public | Special offers |
| GET | `/products/{id}/related` | Public | Related (same category) |
| GET | `/products/low-stock` | SuperAdmin | Products below low-stock threshold |
| POST | `/products` | SuperAdmin | Create product (slug auto-generated) |
| PUT | `/products/{id}` | SuperAdmin | Update product |
| DELETE | `/products/{id}` | SuperAdmin | Delete product |
| PATCH | `/products/{id}/toggle-status` | SuperAdmin | Activate/deactivate |
| PATCH | `/products/{id}/stock` | SuperAdmin | Update stock quantity |
| POST | `/products/{id}/images` | SuperAdmin | Upload up to 10 images (multipart `files`) |

### Cart — `/cart`

Guest carts use a `session_id` cookie automatically; logged-in carts use the user id. On login call `/cart/merge` to merge the guest cart.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/cart` | Public | Get current cart (totals, tax, shipping, coupon) |
| POST | `/cart/items` | Public | Add item `{productId, variantId?, quantity}` |
| PUT | `/cart/items/{cartItemId}` | Public | Update quantity |
| DELETE | `/cart/items/{cartItemId}` | Public | Remove item |
| DELETE | `/cart` | Public | Clear cart |
| POST | `/cart/coupon` | Public | Apply coupon `{code}` |
| DELETE | `/cart/coupon` | Public | Remove coupon |
| POST | `/cart/merge` | Auth | Merge guest cart into user cart |
| GET | `/cart/abandoned` | SuperAdmin | Carts inactive > 24h |

### Orders — `/orders`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/orders` | SuperAdmin | Paged list of all orders |
| GET | `/orders/{id}` | Auth | Order detail (owner or admin) |
| GET | `/orders/number/{orderNumber}` | Public | Track order by number |
| GET | `/orders/my-orders` | Customer | Current user's orders |
| POST | `/orders` | Public | Create order (guest fields or logged-in). Decrements stock |
| PATCH | `/orders/{id}/status` | SuperAdmin | Update status `{status, trackingNumber?, notes?}` |
| PATCH | `/orders/{id}/cancel` | Auth | Cancel order (restores stock) |
| GET | `/orders/{id}/invoice` | Auth | Download invoice |
| GET | `/orders/stats` | SuperAdmin | Order statistics |

**OrderStatus enum**: `1=Pending, 2=Confirmed, 3=Shipped, 4=Delivered, 5=Cancelled, 6=Returned`
**PaymentMethod enum**: `1=Razorpay, 2=CashOnDelivery`
**PaymentStatus enum**: `1=Pending, 2=Paid, 3=Failed, 4=Refunded, 5=PartialRefund`

### Payments — `/payments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payments/razorpay/create-order/{orderId}` | Auth | Create Razorpay order, returns `razorpayOrderId` + amount |
| POST | `/payments/razorpay/verify` | Public | Verify signature `{orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature}` |
| POST | `/payments/razorpay/webhook` | Public (HMAC verified) | Razorpay server webhook |
| POST | `/payments/{orderId}/refund` | SuperAdmin | Initiate refund `{amount?}` (null = full) |
| GET | `/payments` | SuperAdmin | Paged payment list |
| GET | `/payments/order/{orderId}` | Auth | Payments for an order |

**Payment flow**: Create order → `create-order/{orderId}` → open Razorpay Checkout on frontend → on success call `verify` (HMAC-SHA256 of `razorpay_order_id|razorpay_payment_id`).

### Reviews — `/reviews`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/reviews` | SuperAdmin | Paged, filter by `status` |
| GET | `/reviews/product/{productId}` | Public | Approved reviews for a product |
| POST | `/reviews` | Customer | Submit review (goes to Pending) |
| PATCH | `/reviews/{id}/approve` | SuperAdmin | Approve (recalculates product rating) |
| PATCH | `/reviews/{id}/reject` | SuperAdmin | Reject |
| DELETE | `/reviews/{id}` | SuperAdmin | Delete |

**ReviewStatus enum**: `1=Pending, 2=Approved, 3=Rejected`

### Coupons — `/coupons`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/coupons` | SuperAdmin | Paged list |
| GET | `/coupons/{id}` | SuperAdmin | By id |
| POST | `/coupons/validate` | Public | Validate `{code, orderAmount}` → discount preview |
| POST | `/coupons` | SuperAdmin | Create |
| PUT | `/coupons/{id}` | SuperAdmin | Update |
| DELETE | `/coupons/{id}` | SuperAdmin | Delete |

**DiscountType enum**: `1=Percentage, 2=FixedAmount`

### Customers — `/customers`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/customers` | SuperAdmin | Paged customer list |
| GET | `/customers/{id}` | SuperAdmin | Customer detail (orders, spend) |
| PATCH | `/customers/{id}/toggle-active` | SuperAdmin | Block/unblock |
| GET | `/customers/addresses` | Customer | My saved addresses |
| POST | `/customers/addresses` | Customer | Add address |
| DELETE | `/customers/addresses/{addressId}` | Customer | Delete address |

### Dashboard — `/dashboard` (all SuperAdmin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | Totals: revenue, orders, customers, products, today/month figures |
| GET | `/dashboard/sales-chart?period=weekly\|monthly` | Sales chart data |
| GET | `/dashboard/recent-orders?count=10` | Latest orders |
| GET | `/dashboard/best-sellers?count=10` | Top products by orders |
| GET | `/dashboard/low-stock` | Low stock products |
| GET | `/dashboard/visitor-stats` | Visitor/session stats |

### Content — `/content`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/content/banners?type=` | Public | Banners (hero/promotion/sidebar) |
| POST/PUT/DELETE | `/content/banners[/{id}]` | SuperAdmin | Manage banners |
| GET | `/content/promotion-headers` | Public | Announcement bar messages |
| POST/PUT/DELETE | `/content/promotion-headers[/{id}]` | SuperAdmin | Manage promo headers |
| GET | `/content/testimonials` | Public | Testimonials |
| POST/DELETE | `/content/testimonials[/{id}]` | SuperAdmin | Manage testimonials |
| GET | `/content/faqs` | Public | FAQs |
| POST/PUT/DELETE | `/content/faqs[/{id}]` | SuperAdmin | Manage FAQs |
| GET | `/content/pages/{slug}` | Public | Static page (privacy-policy, terms-conditions, ...) |
| PUT | `/content/pages/{slug}` | SuperAdmin | Create/update static page |
| POST | `/content/newsletter/subscribe` | Public | Subscribe `{email}` |
| GET | `/content/newsletter/subscribers` | SuperAdmin | Subscriber list |
| POST | `/content/contact` | Public | Send contact message |
| GET | `/content/contact/messages` | SuperAdmin | Contact inbox |
| POST | `/content/upload?folder=` | SuperAdmin | Upload a file (multipart `file`) |

### Settings — `/settings`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/settings/website` | Public | Site name, support contacts, currency, logo |
| PUT | `/settings/website` | SuperAdmin | Update website settings |
| GET | `/settings/shipping` | Public | Free-shipping threshold, rates |
| PUT | `/settings/shipping` | SuperAdmin | Update shipping settings |
| GET | `/settings/tax` | Public | Tax name/percentage |
| PUT | `/settings/tax` | SuperAdmin | Update tax settings |

---

## Postman

Import `docs/EcommerceApp.postman_collection.json` into Postman.

1. Set `baseUrl` (defaults to `http://localhost:5000/api/v1`).
2. Run **Auth → Login** — the JWT is auto-saved into `{{token}}` and applied collection-wide as a Bearer token.
3. Fill id variables (`productId`, `orderId`, ...) from responses as you go.

---

## Key Behaviors

- **Guest cart** — tracked by a `session_id` cookie; merged into the user cart on login via `/cart/merge`.
- **Order address snapshots** — shipping/billing addresses are copied onto the order at creation, so later address-book edits never change historical orders.
- **Stock management** — stock decrements on order creation and is restored on cancellation.
- **Slugs** — product slugs auto-generate from the name; collisions get a numeric suffix.
- **Ratings** — `AverageRating`/`ReviewCount` recalculate whenever a review is approved, rejected, or deleted.
- **Abandoned carts** — carts inactive for more than 24 hours are flagged for the admin.
- **Visitor tracking** — a middleware logs visits by session cookie for the dashboard.
- **Errors** — every unhandled exception returns a standard `ApiResponse` with HTTP 500; validation errors return 400 with field errors.

---

## Frontend Routes

**Storefront** (`/`): home, `/products` (filter/sort/paginate), `/products/:slug`, `/cart`, `/checkout` (address → payment, Razorpay or COD), `/wishlist`, `/about`, `/contact`, `/faqs`, `/page/:slug`, `/account/*` (profile, orders, addresses, change-password).

**Auth** (`/auth/*`): login, register, forgot-password (email → code → new password) — guarded so logged-in users are redirected away. Admins use `/admin/login` and `/admin/forgot-password`.
**Order confirmation** (`/order-confirmation/:orderNumber`): shown after a successful COD order or verified online payment.

**Admin** (`/admin/*`, SuperAdmin only): dashboard, products (list/new/edit), categories, orders (list/detail), customers, reviews, coupons, payments, banners, faqs, newsletter, reports, settings.
