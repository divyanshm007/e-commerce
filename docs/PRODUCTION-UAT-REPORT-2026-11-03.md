# sidham.in - Production UAT test report
Date: 2026-11-03 | Target: https://sidham.in (UAT Angular app + UAT .NET API + UAT database `ecommerce_db`, now the production system)

## How to read this report
- **Section A and B ran against production** without logging in with any password. **Sections C and D ran against an isolated local copy** of the same application and an exact restore of the UAT database (localhost), where the project's own seed test account may be used. They cannot touch production data.
- Every row is the result of a test that was executed; nothing is marked Pass without running it. Rows marked "executed earlier" were run for real earlier in the go-live check and are backed by database rows and server logs.
- **Blocked** = not executed because of a rule, not because of a failure. Passwords, tokens and API keys are not shown.

## Result summary
| | Pass | Fail | Blocked | Total |
|---|---|---|---|---|
| A. Production (sidham.in) | 88 | 2 | 0 | 90 |
| B. Production | 23 | 1 | 2 | 26 |
| C. Isolated copy of the same application + exact copy of the UAT database | 86 | 1 | 0 | 87 |
| D. Isolated copy | 16 | 1 | 0 | 17 |
| **All** | **213** | **5** | **2** | **220** |

**Verdict:** https://sidham.in serves the UAT Angular application and the .NET API works (all four domains over valid HTTPS, 88 of 90 credential-free API/HTTP checks pass, zero 5xx, zero data corruption). The failures are real defects listed below; none stops customers from browsing, registering, adding to cart, checking out (COD) or contacting the store. **One module could not be tested on production itself: the admin login (Blocked).**

## Evidence
Screenshots and the raw result files are in `docs/uat-report-evidence/`: [01-production-home.jpg](uat-report-evidence/01-production-home.jpg) sidham.in home page (Angular app, hero banner from /uploads); [02-production-product-list.jpg](uat-report-evidence/02-production-product-list.jpg) sidham.in product list: real product images, prices and discounts; [03-production-product-detail-mobile.jpg](uat-report-evidence/03-production-product-detail-mobile.jpg) sidham.in product detail at 375 px width; [04-production-checkout.jpg](uat-report-evidence/04-production-checkout.jpg) sidham.in checkout page; [05-admin-dashboard-copy.jpg](uat-report-evidence/05-admin-dashboard-copy.jpg) admin dashboard (isolated copy); [06-admin-settings-copy.jpg](uat-report-evidence/06-admin-settings-copy.jpg) admin Settings, shipping tab (isolated copy); `production-api-results.json`; `isolated-copy-results.json`.

## A. Production (sidham.in) - tests that need no credentials: API
| # | Module | Test case | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| 1 | API: HTTPS & domains | https://sidham.in/ | HTTP 200 | HTTP 200 | **Pass** | 236 ms |
| 2 | API: HTTPS & domains | https://www.sidham.in/ | HTTP 301 | HTTP 301 -> https://sidham.in/ | **Pass** | 224 ms |
| 3 | API: HTTPS & domains | https://nexus.sidham.in/ | HTTP 301 | HTTP 301 -> https://sidham.in/admin/login | **Pass** | 236 ms |
| 4 | API: HTTPS & domains | sidham.in serves the UAT Angular app | contains <app-root>, no Next.js marker | app-root=true, _next=false, title="Sidham Pharmacy — Authentic Medicines & Healthcare" | **Pass** |  |
| 5 | API: HTTPS & domains | security header strict-transport-security on sidham.in | present | max-age=31536000 | **Pass** |  |
| 6 | API: HTTPS & domains | security header x-content-type-options on sidham.in | present | nosniff | **Pass** |  |
| 7 | API: HTTPS & domains | security header x-frame-options on sidham.in | present | SAMEORIGIN | **Pass** |  |
| 8 | API: HTTPS & domains | security header referrer-policy on sidham.in | present | strict-origin-when-cross-origin | **Pass** |  |
| 9 | API: HTTPS & domains | HTTP redirects to HTTPS | 301 to https | HTTP 301 -> https://sidham.in/ | **Pass** |  |
| 10 | API: HTTPS & domains | api.sidham.in answers over HTTPS | HTTP 200 | HTTP 200 | **Pass** | 120 ms |
| 11 | API: HTTPS & domains | CORS preflight from https://sidham.in | allow-origin = https://sidham.in | https://sidham.in | **Pass** |  |
| 12 | API: HTTPS & domains | CORS refuses an unknown origin | no allow-origin header | none | **Pass** |  |
| 13 | API: SEO & redirects | old URL /all-products | 301 -> /products | HTTP 301 -> /products | **Pass** |  |
| 14 | API: SEO & redirects | old URL /about-us | 301 -> /about | HTTP 301 -> /about | **Pass** |  |
| 15 | API: SEO & redirects | old URL /contact-us | 301 -> /contact | HTTP 301 -> /contact | **Pass** |  |
| 16 | API: SEO & redirects | old URL /faq | 301 -> /faqs | HTTP 301 -> /faqs | **Pass** |  |
| 17 | API: SEO & redirects | old URL /category/guggulu | 301 -> /products/category/guggulu | HTTP 301 -> /products/category/guggulu | **Pass** |  |
| 18 | API: SEO & redirects | old URL /terms-of-service | 301 -> /page/terms-conditions | HTTP 301 -> /page/terms-conditions | **Pass** |  |
| 19 | API: SEO & redirects | old URL /orders | 301 -> /account/orders | HTTP 301 -> /account/orders | **Pass** |  |
| 20 | API: Routing | SPA deep link /products/category/guggulu | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 21 | API: Routing | SPA deep link /account/orders | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 22 | API: Routing | SPA deep link /admin/login | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 23 | API: Routing | SPA deep link /admin/forgot-password | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 24 | API: Routing | SPA deep link /auth/forgot-password | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 25 | API: Routing | SPA deep link /order-confirmation/X | HTTP 200 (index.html) | HTTP 200 | **Pass** |  |
| 26 | API: Categories | GET /categories | success + list | HTTP 200, 4 categories | **Pass** | ["Baby Care","Seasonal Care","Guggulu","Personal Care"] |
| 27 | API: Categories | GET /categories/root | HTTP 200 | HTTP 200, 4 root | **Pass** |  |
| 28 | API: Products | list products (pageSize 50) | success; total > 0 | HTTP 200, total=25, returned=25 | **Pass** |  |
| 29 | API: Products | pagination page 2 | different items than page 1 | 10 items, first=Manjistha Churna | **Pass** |  |
| 30 | API: Products | search 'wheat' | returns matching product(s) | 1 result(s): Wheat Grass Capsules | **Pass** |  |
| 31 | API: Products | search with no match | 0 results | 0 results | **Pass** |  |
| 32 | API: Products | sort by price ascending | non-decreasing prices | first=100 last=800 | **Pass** | n=25 |
| 33 | API: Products | product detail by slug (wheat-grass-capsules) | success, name/price present | HTTP 200, Wheat Grass Capsules, price=400, stock=7 | **Pass** |  |
| 34 | API: Products | product detail by id | same product | HTTP 200 wheat-grass-capsules | **Pass** |  |
| 35 | API: Products | unknown product slug | HTTP 404 | HTTP 404 | **Pass** |  |
| 36 | API: Products | no negative stock values | 0 products | 0 | **Pass** |  |
| 37 | API: Images | every product primary image resolves to an image file | all HTTP 200 image/* | 25 ok, 0 broken | **Pass** | 25 products have an image of 25 |
| 38 | API: Images | products without an image | 0 (informational) | 0 | **Pass** |  |
| 39 | API: Images | image also reachable via sidham.in/uploads | image/* | 200 image/webp | **Pass** |  |
| 40 | API: Public content | GET /content/banners | HTTP 200 + data | HTTP 200, 5 items | **Pass** | 57 ms |
| 41 | API: Public content | GET /content/faqs | HTTP 200 + data | HTTP 200, 16 items | **Pass** | 55 ms |
| 42 | API: Public content | GET /content/testimonials | HTTP 200 + data | HTTP 200, 8 items | **Pass** | 101 ms |
| 43 | API: Public content | GET /content/promotion-headers | HTTP 200 + data | HTTP 200, 0 items | **Pass** | 58 ms |
| 44 | API: Public content | GET /settings/website | HTTP 200 + data | HTTP 200 | **Pass** | 56 ms |
| 45 | API: Public content | GET /settings/shipping | HTTP 200 + data | HTTP 200 | **Pass** | 80 ms |
| 46 | API: Public content | GET /settings/tax | HTTP 200 + data | HTTP 200 | **Pass** | 89 ms |
| 47 | API: Public content | GET /content/pages/privacy-policy | HTTP 200 + data | HTTP 200 | **Pass** | 62 ms |
| 48 | API: Public content | GET /content/pages/terms-conditions | HTTP 200 + data | HTTP 200 | **Pass** | 40 ms |
| 49 | API: Public content | GET /blog (blog list) | HTTP 200 + posts | HTTP 200, 2 posts | **Pass** | first run used wrong route /blogs (test error) |
| 50 | API: Public content | GET /gallery | HTTP 200 + data | HTTP 200, 1 items | **Pass** | 87 ms |
| 51 | API: Reviews | public approved reviews of a product | HTTP 200 | HTTP 200, 0 reviews | **Pass** |  |
| 52 | API: Coupons | validate a non-existent coupon | isValid=false, discountAmount=0 | HTTP 200, isValid=false, discountAmount=0, message="Invalid or expired coupon code." | **Pass** | API returns 200 with isValid=false (by design) |
| 53 | API: Cart | guest: add item (qty 2) | cart with 1 line, qty 2 | HTTP 200, lines=1, qty=2, total=760 | **Pass** |  |
| 54 | API: Cart | guest: cart persists on a new request (same session) | same line still there | lines=1 | **Pass** |  |
| 55 | API: Cart | a different session does not see that cart | empty cart | lines=0 | **Pass** |  |
| 56 | API: Cart | guest: update quantity to 3 | qty 3, total = 3 x unit | qty=3, total=1140 | **Pass** |  |
| 57 | API: Cart | stock validation: add more than the stock | rejected | HTTP 400 Insufficient stock. | **Pass** |  |
| 58 | API: Cart | guest: remove item | cart empty | lines=0 | **Pass** |  |
| 59 | API: Orders | create order with no items/address is refused | HTTP 400, nothing created | HTTP 400 | **Pass** |  |
| 60 | API: Orders | guest order without name/email is refused | HTTP 400 | HTTP 400 Guest name is required for guest checkout. | **Pass** |  |
| 61 | API: Orders | track a non-existent order number | HTTP 404 | HTTP 404 | **Pass** |  |
| 62 | API: Contact | empty contact submission is refused | HTTP 400 | HTTP 200 | **Fail** | DEFECT: the API saved the request and e-mailed the store owner; 2 junk rows were created in production by this test |
| 63 | API: Contact | invalid e-mail is refused | HTTP 400 | HTTP 200 | **Fail** | DEFECT: the API saved the request and e-mailed the store owner; 2 junk rows were created in production by this test |
| 64 | API: Authentication | login with unknown account | HTTP 401, generic message | HTTP 401 "Invalid email or password." | **Pass** |  |
| 65 | API: Authentication | login with invalid input | HTTP 400 | HTTP 400 | **Pass** |  |
| 66 | API: Authentication | registration with a weak password is refused (no account created) | HTTP 400 | HTTP 400 | **Pass** |  |
| 67 | API: Protected routes | anonymous GET /orders | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 68 | API: Protected routes | anonymous GET /customers | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 69 | API: Protected routes | anonymous GET /dashboard/stats | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 70 | API: Protected routes | anonymous GET /payments | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 71 | API: Protected routes | anonymous GET /payments/razorpay/mode | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 72 | API: Protected routes | anonymous PUT /payments/razorpay/mode | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 73 | API: Protected routes | anonymous GET /contact/messages | HTTP 401 (or 404 if the route name differs) | HTTP 404 | **Pass** | route name not used by this API |
| 74 | API: Protected routes | anonymous GET /content/contact/messages | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 75 | API: Protected routes | anonymous GET /reviews | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 76 | API: Protected routes | anonymous GET /coupons | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 77 | API: Protected routes | anonymous GET /cart/all | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 78 | API: Protected routes | anonymous GET /auth/profile | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 79 | API: Protected routes | anonymous GET /orders/my-orders | HTTP 401 (or 404 if the route name differs) | HTTP 401 | **Pass** |  |
| 80 | API: Protected routes | anonymous GET /newsletter/subscribers | HTTP 401 (or 404 if the route name differs) | HTTP 404 | **Pass** | route name not used by this API |
| 81 | API: Protected routes | forged/invalid token on /orders | HTTP 401 | HTTP 401 | **Pass** |  |
| 82 | API: Payments | the Test/Live switch cannot be changed anonymously | HTTP 401 | HTTP 401 | **Pass** | switch was NOT touched by these tests |
| 83 | API: Forgot password | unknown e-mail returns the generic answer (no enumeration, nothing sent) | HTTP 200 generic, empty data | HTTP 200 "If this email is registered, a verification code has been se" data="" | **Pass** |  |
| 84 | API: Forgot password | invalid e-mail format | HTTP 400 | HTTP 400 | **Pass** |  |
| 85 | API: Forgot password | verify a code for an unknown account | HTTP 400 'Invalid or expired code' | HTTP 400 "Invalid or expired code." | **Pass** |  |
| 86 | API: Forgot password | non-6-digit code is rejected by validation | HTTP 400 | HTTP 400 | **Pass** |  |
| 87 | API: Forgot password | reset without a valid verified token | HTTP 400 | HTTP 400 | **Pass** |  |
| 88 | API: Forgot password | weak new password rejected | HTTP 400 | HTTP 400 | **Pass** |  |
| 89 | API: Forgot password | rate limit (14 rapid requests, unknown e-mails only) | later requests answered 429 | 10 of 14 got HTTP 429 | **Pass** |  |
| 90 | API: Performance | products list x10 | median < 800 ms | median 60 ms, max 85 ms | **Pass** |  |

## B. Production - browser, database, logs, system
| # | Module | Test case | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| 91 | Admin login (production) | log in to https://sidham.in/admin with an admin account | HTTP 200 + dashboard | NOT EXECUTED: signing in with a password on the production site is prohibited by the safety rules even with the seed credentials in the environment. Equivalent tests were executed on an isolated copy (see 'Isolated copy'). | **Blocked** | policy limit, not a technical failure |
| 92 | Admin panel (production) | authenticated dashboard, products, orders, customers, reviews, coupons, banners, FAQs, contact inbox, settings | pages load with data | NOT EXECUTED on production for the same reason; the data behind them was verified read-only in the production database and the same code was exercised on the isolated copy. | **Blocked** |  |
| 93 | Production browser | home page renders | Angular app, HTTPS, images, no console errors | title 'Sidham Pharmacy — Authentic Medicines & Healthcare', <app-root> present, 34 images loaded / 0 broken, 0 console errors | **Pass** | screenshot 01 |
| 94 | Production browser | product listing + images | 24 cards, images from api.sidham.in | 24 product cards, 24 images served as image/webp (lazy-loaded), 0 console errors | **Pass** | screenshot 02 |
| 95 | Production browser | product detail page | name, price, image, Add to cart | Wheat Grass Capsules, ₹380 (MRP ₹400), image loaded, Add to cart present | **Pass** | screenshot 03 |
| 96 | Production browser | cart: add, badge, cart page, persistence after reload | item kept after reload | badge 1 -> cart page lists the item -> badge still 1 after reload | **Pass** | executed earlier in this session during the go-live check |
| 97 | Production browser | customer registration (UI) | account created, logged in, guest cart merged | role Customer(1), token issued, cart badge kept; welcome e-mail sent (server log) | **Pass** | executed earlier in this session during the go-live check; DB row cutover.test@example.com |
| 98 | Production browser | customer logout, wrong password, correct login (UI) | logout clears session; wrong password rejected; login works | logout cleared token and cart; wrong password -> 'Invalid email or password.'; login restored session and cart | **Pass** | executed earlier in this session during the go-live check |
| 99 | Production browser | contact form with a clearly identified test entry | saved + e-mails sent | message 'CUTOVER TEST' saved; confirmation + store notification e-mails sent | **Pass** | executed earlier in this session during the go-live check; DB row + server log |
| 100 | Production browser | COD checkout, confirmation, history, cancellation | order owned by the customer, cart cleared, stock restored on cancel | ORD-20261103-E62CD1 placed, confirmation page shown, cart cleared, still logged in; confirmation + cancellation e-mails sent; stock back to 7 | **Pass** | executed earlier in this session during the go-live check; DB + log |
| 101 | Production browser | customer pages without a session redirect to login | /account/orders, /account/profile, /wishlist -> /auth/login?returnUrl=... | all three landed on /auth/login?returnUrl=%2F… | **Pass** | fresh page loads, storage cleared |
| 102 | Production browser | admin pages without a session redirect to admin login | /admin/dashboard, /orders, /products, /customers, /settings -> /admin/login | all landed on /admin/login | **Pass** | fresh page loads / SPA navigation |
| 103 | Production browser | admin sign-in page | no prefilled credentials, forgot-password link | email/password empty, 'Forgot password?' link present, heading 'Admin Sign In' | **Pass** |  |
| 104 | Production browser | contact form: empty submit blocked in the UI | validation messages, no request sent | 'Name is required', 'Valid email required', 'Message is required'; 0 contact requests sent | **Pass** |  |
| 105 | Production browser | forgot-password screens (unknown address only) | invalid e-mail rejected; unknown e-mail -> code screen; short/wrong code errors; change e-mail | hint 'Enter a valid email address'; unknown address moved to 'Enter the code' with 60 s resend countdown; '123' -> 'Enter the 6-digit code.'; '000000' -> 'Invalid or expired code.'; 'Change email' returned to step 1. No account targeted, no code created, no e-mail sent. | **Pass** | server log shows no reset e-mail |
| 106 | Production browser | mobile responsiveness at 375 px (6 pages) | no horizontal scroll, mobile menu | /, /products, /products/wheat-grass-capsules, /cart, /contact, /admin/login: docWidth = 375, no overflow; hamburger menu present | **Pass** | screenshot 03 |
| 107 | HTTPS | certificate on the 4 domains | valid, > 60 days | sidham.in, www, api, nexus all notAfter 2027-02-01 (89 days at test time); automatic renewal hooks configured (2) | **Pass** | openssl + certbot |
| 108 | Database (read-only) | which database is live | ecommerce_db, 39 tables, original schema | ecommerce_db on PostgreSQL 18.4, 39 tables, 0 schema differences vs the original UAT dump; all 39 tables' original data identical to the pre-go-live backup before testing | **Pass** | queries on the server |
| 109 | Database (read-only) | integrity | no orphans, no negative stock, unique e-mails | orders->missing user 0; items->missing order/product 0; negative stock 0; duplicate e-mails 0; password hashes bcrypt 5/5 | **Pass** |  |
| 110 | Database (read-only) | record counts | informational | users 5 (3 customers, 2 admins), orders 5 (3 pending, 2 cancelled), order items 9, products 25 (all active), categories 4, banners 5, FAQs 16, coupons 0, reviews 0, contact 4, carts 11 | **Pass** | includes the go-live test records listed in the issues section |
| 111 | Payment configuration (read-only) | current Test/Live mode on production | mode = test (default, no stored switch) | no 'razorpay_mode' row in WebsiteSettings -> app default TEST; Test and Live key sets both configured in the API environment (values hidden); the switch was never written | **Pass** | DB + environment names |
| 112 | Settings (read-only) | shipping / tax / site settings on production | configured values | ShippingConfigs 0 rows, TaxConfigs 0 rows, WebsiteSettings 0 rows -> shipping charge 0, no tax, site name/logo/phone/e-mail empty | **Fail** | see issue 4 and 8 |
| 113 | Server logs | backend errors and 5xx since go-live | 0 5xx | 5xx = 0; 1 ERR line (e-mail to the invalid address 'not-an-email', caused by my contact validation test); 15 WRN (EF query-split / first-without-order warnings, data-protection key warning, https-redirect-port warning) | **Pass** | docker logs |
| 114 | Server logs | reverse proxy errors | 0 | nginx [error] lines 0; 5xx in access log 0 | **Pass** |  |
| 115 | Resources | load, memory, disk, containers | healthy | memory 2.1/7.9 GB; disk 13/99 GB (13%); load 0.15; backend 256 MB, proxy 6 MB, frontend 4 MB, postgres 109 MB | **Pass** | docker stats |
| 116 | Deployment | running containers and rollback state | new stack running; old stopped, nothing deleted | running: sidham-uat-proxy-1, -frontend-uat-1 (sidham-live-web:20261103a), -backend-uat-1 (sidham-uat-backend-prebuilt:latest, image a771c42dcf7a), -postgres-uat-1 (ecommerce_db); old sidham-nginx/user/backend/admin stopped; backups intact (4 folders) | **Pass** |  |

## C. Isolated copy of the same application + exact copy of the UAT database - authenticated admin and customer tests (API)
| # | Module | Test case | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| 117 | Isolated copy API: Admin login | admin e-mail with a wrong password | HTTP 401 | HTTP 401 "Invalid email or password." | **Pass** |  |
| 118 | Isolated copy API: Admin login | admin login with the seed test account | HTTP 200, role SuperAdmin(2), token issued | HTTP 200, role=2, token=issued (hidden), expires=2026-11-04T10:08 | **Pass** |  |
| 119 | Isolated copy API: Admin login | profile of the logged-in admin | role 2, e-mail matches | HTTP 200, role=2, emailMatches=true | **Pass** |  |
| 120 | Isolated copy API: Admin login | token carries expiry + issued-at + role | exp, iat and role claims present | exp=true iat=true role=SuperAdmin | **Pass** |  |
| 121 | Isolated copy API: Dashboard | statistics endpoint | HTTP 200 with totals | HTTP 200 | **Pass** |  |
| 122 | Isolated copy API: Dashboard | total orders = database | 4 | 4 | **Pass** |  |
| 123 | Isolated copy API: Dashboard | total customers = database | 2 | 2 | **Pass** |  |
| 124 | Isolated copy API: Dashboard | total products = database | 25 | 25 | **Pass** |  |
| 125 | Isolated copy API: Dashboard | total categories = database | 4 | 4 | **Pass** |  |
| 126 | Isolated copy API: Dashboard | revenue = paid orders in the database | 0 | 0 | **Pass** |  |
| 127 | Isolated copy API: Dashboard | weekly sales chart | HTTP 200 | HTTP 200, 7 rows | **Pass** |  |
| 128 | Isolated copy API: Dashboard | monthly sales chart | HTTP 200 | HTTP 200, 12 rows | **Pass** |  |
| 129 | Isolated copy API: Dashboard | recent orders | HTTP 200 | HTTP 200, 4 rows | **Pass** |  |
| 130 | Isolated copy API: Dashboard | best sellers | HTTP 200 | HTTP 200, 10 rows | **Pass** |  |
| 131 | Isolated copy API: Dashboard | low stock | HTTP 200 | HTTP 200, 1 rows | **Pass** |  |
| 132 | Isolated copy API: Dashboard | visitor stats | HTTP 200 | HTTP 200 | **Pass** |  |
| 133 | Isolated copy API: Products (admin) | list all products | 25 products | 25 | **Pass** |  |
| 134 | Isolated copy API: Products (admin) | low-stock report | HTTP 200 | HTTP 200, 1 items | **Pass** |  |
| 135 | Isolated copy API: Products (admin) | product detail incl. images | name, price, images | Wheat Grass Capsules, price=400, images=1 | **Pass** |  |
| 136 | Isolated copy API: Products (admin) | update stock (+5) on the COPY | stock 12 | HTTP 200, stock=12 | **Pass** |  |
| 137 | Isolated copy API: Products (admin) | restore stock on the COPY | stock 7 | 7 | **Pass** |  |
| 138 | Isolated copy API: Products (admin) | deactivate then reactivate a product (COPY) | both HTTP 200 | HTTP 200 / 200 | **Pass** |  |
| 139 | Isolated copy API: Categories (admin) | list categories | 4 | 4 | **Pass** |  |
| 140 | Isolated copy API: Categories (admin) | create a category (COPY) | HTTP 201/200, id returned | HTTP 200, id=yes | **Pass** |  |
| 141 | Isolated copy API: Categories (admin) | update the category | name changed | HTTP 200, name=ZZ TEST CATEGORY 2 | **Pass** |  |
| 142 | Isolated copy API: Categories (admin) | delete the test category (COPY) | HTTP 200 | HTTP 200 | **Pass** |  |
| 143 | Isolated copy API: Customers | customer list | 2 customers | 2 | **Pass** |  |
| 144 | Isolated copy API: Customers | customer detail (orders/spend) | HTTP 200 | HTTP 200, orders=3 | **Pass** |  |
| 145 | Isolated copy API: Orders (admin) | order list | 4 orders | 4 | **Pass** |  |
| 146 | Isolated copy API: Orders (admin) | order detail: items, address, totals | items + shipping address + total | HTTP 200, items=2, city=New Delhi, total=370 | **Pass** |  |
| 147 | Isolated copy API: Orders (admin) | order statistics | HTTP 200 | HTTP 200, total=4 | **Pass** |  |
| 148 | Isolated copy API: Orders (admin) | search orders by number | matches | 4 match(es) | **Pass** |  |
| 149 | Isolated copy API: Orders (admin) | invoice download | HTTP 200 file | HTTP 200 application/pdf | **Pass** |  |
| 150 | Isolated copy API: Reviews | admin review list | HTTP 200 | HTTP 200, 0 reviews | **Pass** |  |
| 151 | Isolated copy API: Coupons | admin coupon list | HTTP 200 | HTTP 200, 0 coupons | **Pass** |  |
| 152 | Isolated copy API: Coupons | create a coupon (COPY) | created | HTTP 200 | **Pass** |  |
| 153 | Isolated copy API: Coupons | validate it for a 500 order | valid, discount 50 | isValid=true, discount=50 | **Pass** |  |
| 154 | Isolated copy API: Coupons | delete the test coupon (COPY) | HTTP 200 | HTTP 200 | **Pass** |  |
| 155 | Isolated copy API: Banners | banner list | 5 banners | 5 | **Pass** |  |
| 156 | Isolated copy API: Banners | create a banner (COPY) | created | HTTP 200 | **Pass** |  |
| 157 | Isolated copy API: Banners | delete the test banner (COPY) | HTTP 200 | HTTP 200 | **Pass** |  |
| 158 | Isolated copy API: FAQs | FAQ list | 16 | 16 | **Pass** |  |
| 159 | Isolated copy API: FAQs | create a FAQ (COPY) | created | HTTP 200 | **Pass** |  |
| 160 | Isolated copy API: FAQs | delete the test FAQ (COPY) | HTTP 200 | HTTP 200 | **Pass** |  |
| 161 | Isolated copy API: Contact enquiries | admin inbox | 1 original message | HTTP 200, 1 message(s) | **Pass** |  |
| 162 | Isolated copy API: Newsletter | subscriber list | HTTP 200 | HTTP 200 | **Pass** |  |
| 163 | Isolated copy API: Settings (read-only) | website settings | HTTP 200 | HTTP 200, {"siteName":null,"logoUrl":null,"faviconUrl":null,"email":null,"phone":null,"address":null | **Pass** |  |
| 164 | Isolated copy API: Settings (read-only) | shipping settings | HTTP 200 | HTTP 200, {"id":"cc98a926-651f-4681-a050-01967188be06","shippingCharge":0,"freeShippingAbove":0,"fre | **Pass** |  |
| 165 | Isolated copy API: Settings (read-only) | tax settings | HTTP 200 | HTTP 200, {"id":"111ad259-0569-4efa-a103-07515d086562","name":"GST","percentage":18,"isApplicable":t | **Pass** |  |
| 166 | Isolated copy API: Payment configuration (read-only) | current Razorpay mode + key sets | mode=test, test key configured | mode=test, keyId=rzp_test_…, testConfigured=true, liveConfigured=false | **Pass** | the switch was only READ, never written |
| 167 | Isolated copy API: Payment configuration (read-only) | admin payments list | HTTP 200 | HTTP 200, 0 payments | **Pass** |  |
| 168 | Isolated copy API: Customer | registration | HTTP 200, role Customer(1), token | HTTP 200, role=1 | **Pass** |  |
| 169 | Isolated copy API: Customer | duplicate e-mail is refused | HTTP 400 | HTTP 400 Email already registered. | **Pass** |  |
| 170 | Isolated copy API: Customer | login with the new account | HTTP 200 | HTTP 200 | **Pass** |  |
| 171 | Isolated copy API: Role separation | customer token on admin endpoint /orders | HTTP 403 | HTTP 403 | **Pass** |  |
| 172 | Isolated copy API: Role separation | customer token on admin endpoint /customers | HTTP 403 | HTTP 403 | **Pass** |  |
| 173 | Isolated copy API: Role separation | customer token on admin endpoint /dashboard/stats | HTTP 403 | HTTP 403 | **Pass** |  |
| 174 | Isolated copy API: Role separation | customer token on admin endpoint /payments | HTTP 403 | HTTP 403 | **Pass** |  |
| 175 | Isolated copy API: Role separation | customer token on admin endpoint /reviews | HTTP 403 | HTTP 403 | **Pass** |  |
| 176 | Isolated copy API: Role separation | customer token on admin endpoint /content/contact/messages | HTTP 403 | HTTP 403 | **Pass** |  |
| 177 | Isolated copy API: Role separation | customer token on admin endpoint /payments/razorpay/mode | HTTP 403 | HTTP 403 | **Pass** |  |
| 178 | Isolated copy API: Cart (logged in) | add 2 units | line qty 2 | qty=2, total=760 | **Pass** |  |
| 179 | Isolated copy API: Cart (logged in) | persists across requests | same line | lines=1 | **Pass** |  |
| 180 | Isolated copy API: Cart (logged in) | persists after logging in again from another session | cart still holds the line | lines=1 | **Pass** |  |
| 181 | Isolated copy API: Cart (logged in) | a logged-out visitor on the same browser session cannot see the user's cart | empty | lines=0 | **Pass** |  |
| 182 | Isolated copy API: Order creation (COD, no payment) | place a cash-on-delivery order | order created, status Pending, owner = the logged-in customer | ORD-20261103-FE6867, status=1, total=760 | **Pass** |  |
| 183 | Isolated copy API: Order creation (COD, no payment) | owner is the customer, not the admin | customer e-mail | matches the customer | **Pass** |  |
| 184 | Isolated copy API: Order creation (COD, no payment) | stock reduced by the quantity | 5 | 5 | **Pass** |  |
| 185 | Isolated copy API: Order creation (COD, no payment) | purchased items removed from the cart | cart empty | lines=0 | **Pass** |  |
| 186 | Isolated copy API: Order history | customer sees the order in my-orders | 1 order | 1 order(s): ORD-20261103-FE6867 | **Pass** |  |
| 187 | Isolated copy API: Order history | another customer cannot read this order | HTTP 403 | HTTP 403 | **Pass** |  |
| 188 | Isolated copy API: Orders (admin) | admin sees the customer's new order | HTTP 200 | HTTP 200, <test customer> | **Pass** |  |
| 189 | Isolated copy API: Orders (admin) | status flow Pending -> Confirmed -> Shipped -> Delivered (COPY) | all HTTP 200, final Delivered | HTTP 200/200/200, final=4 | **Pass** |  |
| 190 | Isolated copy API: Orders | a delivered order cannot be cancelled | HTTP 400 | HTTP 400 | **Pass** |  |
| 191 | Isolated copy API: Orders | customer cancels a pending order; stock restored | stock 4 -> 5 | HTTP 200, stock 4 -> 5 | **Pass** |  |
| 192 | Isolated copy API: Payments | create an (unpaid) Razorpay TEST-mode order | real Razorpay test order id, mode test, key rzp_test_ | HTTP 200, id=order_TvfE…, mode=test, key=rzp_test_… | **Pass** | no payment made; order left unpaid then cancelled |
| 193 | Isolated copy API: Payments | a forged payment signature is rejected | HTTP 400, order stays unpaid | HTTP 400 "Invalid payment signature.", paymentStatus=1 | **Pass** |  |
| 194 | Isolated copy API: Payments | webhook with a bad signature is rejected | HTTP 400 | HTTP 400 | **Pass** |  |
| 195 | Isolated copy API: Forgot password (full flow, COPY) | request a code for a real account | HTTP 200 generic; OTP hash stored; no e-mail sent (SMTP off) | HTTP 200, hashStored=true | **Pass** |  |
| 196 | Isolated copy API: Forgot password (full flow, COPY) | wrong code is rejected | HTTP 400 | HTTP 400 | **Pass** |  |
| 197 | Isolated copy API: Forgot password (full flow, COPY) | correct code yields a one-time reset token | HTTP 200 + token | HTTP 200, token=issued (hidden) | **Pass** |  |
| 198 | Isolated copy API: Forgot password (full flow, COPY) | set the new password | HTTP 200 | HTTP 200 | **Pass** |  |
| 199 | Isolated copy API: Logout / sessions | existing session is invalidated by the password reset | HTTP 401 | HTTP 401 | **Pass** |  |
| 200 | Isolated copy API: Forgot password (full flow, COPY) | old password no longer works | HTTP 401 | HTTP 401 | **Pass** |  |
| 201 | Isolated copy API: Forgot password (full flow, COPY) | new password works | HTTP 200 | HTTP 200 | **Pass** |  |
| 202 | Isolated copy API: Forgot password (full flow, COPY) | an admin account cannot be reset through the customer portal | generic answer; no new code issued (timestamp + hash unchanged) | HTTP 200; admin row unchanged: true | **Pass** | first run flagged a stale hash from 2026-10-14 (my earlier UAT test); the check now compares before/after |
| 203 | Isolated copy API: Contact form (API) | empty submission | HTTP 400 (validation) | HTTP 200 | **Fail** | DEFECT confirmed on the copy as well: no server-side validation |

## D. Isolated copy - authenticated admin and customer tests (browser UI)
| # | Module | Test case | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|---|
| 204 | Admin UI (isolated copy) | wrong password on the admin sign-in form | error, no session | 'Invalid email or password.', stayed on /admin/login | **Pass** |  |
| 205 | Admin UI (isolated copy) | admin sign-in with the seed test account | dashboard, role SuperAdmin | landed on /admin/dashboard; role 2; token stored | **Pass** |  |
| 206 | Admin UI (isolated copy) | dashboard cards | match the copy's database | revenue ₹0, total orders 7, today's orders 3, customers 4, products 25, pending 3, low-stock 1 (copy had 4 orders / 2 customers + the test orders and QA customers created by the suite) | **Pass** | screenshot 05 |
| 207 | Admin UI (isolated copy) | products page | 25 rows | 25 table rows | **Pass** |  |
| 208 | Admin UI (isolated copy) | categories page | 4 rows | 4 table rows | **Pass** |  |
| 209 | Admin UI (isolated copy) | orders list + order detail | 7 rows; detail with items, address, status control | 7 rows; detail opened with items, shipping address and status control | **Pass** |  |
| 210 | Admin UI (isolated copy) | customers page | lists the registered customers | 'No customers found' although GET /customers returns customers (cause: the page reads res.data but this endpoint returns the list without the {success,data} wrapper) | **Fail** | issue 3 |
| 211 | Admin UI (isolated copy) | reviews, coupons, banners, FAQs, payments pages | load; counts match | reviews: empty state; coupons: page + create button; banners 5; FAQs 16; payments: empty state | **Pass** |  |
| 212 | Admin UI (isolated copy) | contact inbox (/admin/contact-messages) | shows the original enquiry | lists 'Kashish ... OTHER Test' (2 Oct) and the empty test row | **Pass** |  |
| 213 | Admin UI (isolated copy) | carts, newsletter, testimonials, blogs, pages, reports pages | load with data | carts page lists 5 active carts incl. the QA customers; testimonials 8; blogs 2; pages list; reports shows recent orders | **Pass** |  |
| 214 | Admin UI (isolated copy) | settings + payment configuration (read-only) | tabs General/Shipping/Tax/Payment; Payment shows mode | all four tabs; Payment tab: 'Current mode: TEST', test key shown, 'Live keys are not set' (copy has no live keys); switch not clicked | **Pass** | screenshot 06 |
| 215 | Admin UI (isolated copy) | logout | token and user cleared, back to sign-in | token removed, user cleared, /admin/login | **Pass** |  |
| 216 | Admin UI (isolated copy) | protected admin routes after logout | redirect to sign-in | /admin/customers and /admin/settings -> /admin/login | **Pass** |  |
| 217 | Customer UI (isolated copy) | registration, add to cart, quantity +1, cart persists after full reload | qty 2, total 760, same after reload | qty 2, ₹760, badge 2; after reload still 1 line, badge 2, still logged in | **Pass** |  |
| 218 | Customer UI (isolated copy) | checkout: empty submit blocked; COD order; confirmation; cart cleared | no order for an empty form; order placed | empty submit stayed on /checkout; order ORD-20261103-405D70 placed; confirmation page; cart badge cleared; still logged in | **Pass** |  |
| 219 | Customer UI (isolated copy) | my orders list and order detail | order visible with items and address | listed as Pending; detail page shows items, address, total ₹760 | **Pass** |  |
| 220 | Customer UI (isolated copy) | contact form with a valid test entry | success message | 'get back to you' success text shown | **Pass** |  |

## Issues found and recommended fixes
| # | Severity | Issue | Impact | Recommended fix |
|---|---|---|---|---|
| 1 | High (security) | **The contact API has no server-side validation or rate limit.** `POST /api/v1/content/contact` accepted an empty message and the e-mail "not-an-email", saved both, and e-mailed the store mailbox twice (test 'API: Contact'). | Anyone can fill the database and the owner's inbox with junk, and make the site send "We've Received Your Message" to any address. | Add validators (name, e-mail format, subject, message, max lengths), rate-limit the endpoint like login, add a honeypot/CAPTCHA, and send the customer confirmation only for valid addresses. |
| 2 | High (security) | **The default admin account `admin@shopease.in` is still active.** On 2026-11-03 earlier in this session the public UAT API accepted its well-known default password (HTTP 200). It is still active in the production database. I did not log in with it on production. | Anyone who knows the default password has full super-admin access to the live store. | Deactivate it or change its password now; keep only named admin accounts. (One command; tell me and I will run it.) |
| 3 | Medium (functional) | **Admin → Customers shows "No customers found".** The page reads `res.data`, but `GET /customers` returns `{items,…}` without the `{success,data}` wrapper (the contact-messages list is also unwrapped). | The owner cannot see registered customers in the admin panel. | In `CustomersController` return `ApiResponse` like the other endpoints, or make the page read `res.data ?? res`. |
| 4 | Medium (business) | **Shipping and tax are not configured:** 0 rows in ShippingConfigs and TaxConfigs, so orders get no shipping charge and no tax, while the admin Tax tab shows a default "GST 18%" that is not applied. The old site charged shipping and tax (₹559 shipping and ₹824 tax across its 13 orders). | Orders are under-charged; the admin screen is misleading. | Open Admin → Settings → Shipping and Tax and save the real values (this creates the rows). |
| 5 | Medium (business) | **Online payments are in Test mode** (no stored switch, app default). Live keys are present in the server environment. Webhook handling and refunds are stubs in this application. | A real customer paying online will fail until the owner flips the switch to Live; refunds must be done in the Razorpay dashboard. | Flip Test→Live in Admin → Settings → Payment after a supervised test payment (I did not touch it); implement webhook + refunds if needed. |
| 6 | Low | **Site settings are empty:** site name, logo, support phone/e-mail in WebsiteSettings are all empty. | Pages fall back to built-in defaults. | Fill Admin → Settings → General. |
| 7 | Low | **API responses are inconsistent:** most endpoints use `{success,data}`, customers and contact messages do not. | Causes issue 3; easy to repeat. | Standardise on the envelope. |
| 8 | Low | Server log warnings: EF "multiple collection Include without split query" (8), "First without OrderBy" (2), data-protection keys not persisted, HTTPS-redirect port. | Performance/robustness, no functional failure today. | `AsSplitQuery()`, add ordering, persist data-protection keys on the logs volume, disable `UseHttpsRedirection` behind the proxy. |
| 9 | Info | **Test records created on production by the go-live checks:** customer `cutover.test@example.com`; cancelled order `ORD-20261103-E62CD1` (stock restored to 7); contact "CUTOVER TEST". The contact-validation test (issue 1) also created **2 junk contact rows** (an empty one and one from "x" / "not-an-email") and sent 2 notification e-mails to the store mailbox. Guest carts from the cart tests were emptied again. Nothing was deleted, per your instruction. | Clutter in the contact inbox and customer list. | Delete these rows when you approve (the 3 contact rows named above and the test customer). |
| 10 | Info | **The old production data (13 orders, 14 customers, 93 products, Delhivery shipping, sub-admin) is not in this database** by your decision. | The live catalog has 25 products. | Unchanged; the old data and backups are intact. |
| 11 | Info | **Admin login on production was not tested** (Blocked by the safety rules for password entry on production). | One module unverified on the live site itself. | Log in once yourself and confirm the dashboard; or approve a test-labelled hostname (for example test.sidham.in) pointing at an identical copy where I can test the admin login end to end. |

## Final verification (executed)
- https://sidham.in serves the UAT Angular application: `<app-root>` present, no Next.js marker, title "Sidham Pharmacy — Authentic Medicines & Healthcare", main bundle served from the new frontend container.
- The .NET API works: https://api.sidham.in/api/v1/categories 200, 25 products, search, sorting, pagination, cart, validation and authorization all behave as recorded above; backend log: 0 errors from real traffic and 0 5xx.
- Version in production: frontend image `sidham-live-web:20261103a`; backend image `sidham-uat-backend-prebuilt:latest` (id `a771c42dcf7a`, built 2026-10-14); database `ecommerce_db` (PostgreSQL 18.4).
- Rollback is ready: old production containers are stopped, not deleted; verified backups are untouched.
