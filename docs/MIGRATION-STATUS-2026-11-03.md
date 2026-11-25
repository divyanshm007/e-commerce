# UAT -> Production migration: status as of 2026-11-03

Goal: the .NET + Angular application becomes the only production system (sidham.in), replacing the NestJS/Next.js site, with all real data preserved.
Verified production backup (untouched): `/root/backups/prod-pre-migration-20261103-065448/` on the server, data copy in `D:\Backups\sidham-prod-pre-migration-20261103-065448\`. Report of phases 1-2: `PROD-MIGRATION-PHASE1-2-2026-11-03.md`.

| Phase | Item | Status |
|---|---|---|
| 1 SSL | Renew certificate, fix renewal conflict, verify HTTPS | **BLOCKED** - the tool permission needed to stop nginx and edit the certbot config on the production server was denied. Certificate is still expired. Nothing was changed on the server. |
| 2 Prepare | Production URLs, DB, SMTP, live Razorpay, CORS, nginx/HTTPS, logging | **Not started** (design below) |
| 3 Data | Importer for all legacy data | **DONE locally, 42/42 reconciliation checks pass** (see below) |
| 3 Features | Delhivery, sub-admin RBAC, states/promo offers/payment options UI+API, webhooks, refunds | **Not built.** Database tables for them now exist (this commit); no API or screens yet |
| 4 Testing | Full functional test plan | Not started (only importer/reconciliation + earlier UAT cart/checkout tests exist) |
| 5 Cutover | Final backup, maintenance mode, deploy, smoke test | Not started |
| 6 Cleanup | Remove old production and UAT | Not started. Requires explicit approval |

## What exists now
- New tables/columns in the .NET model and in the startup schema step (`Program.cs`): `States`, `PromoOffers`, `PaymentOptions`, `OrderItemTrackings`, `OrderPickups`, `CouponProducts`, `CouponCategories`, `LegacyImportArchive`, role `SubAdmin`, per-item shipping/refund/coupon columns on `OrderItems`, `Users.RazorpayCustomerId/Permissions`, address label/secondary phone/instructions, `Coupons.Scope`, banner dates, product brand/unit.
- `backend/EcommerceApp/Migration/legacy-import.sql`: one-transaction, re-runnable importer (postgres_fdw). Keeps all original IDs and bcrypt hashes, rewrites absolute image URLs to `/uploads/...`, archives every source row.
- `backend/EcommerceApp/Migration/legacy-reconcile.sh`: compares counts, ID sets, money totals, hashes and integrity between source and target.

## Reconciliation result (backup of 2026-11-03 -> fresh candidate database)
14 customers, 1 back-office account, 8 addresses, 54 categories, 93 products, 56 images, 13 orders, 43 items, 21 tracking events, 1 pickup, 4 contact enquiries, 2 coupons (+1 product link), 4 banners, 15 FAQs, 36 states, 3 promo offers: all counts equal. ID sets identical (md5). Order totals 2,284.05; item totals 16,481.00; payments 5,809.98; stock 50,945 - all equal. Password hashes and emails identical. No orphan foreign keys. A wrong-password login for a migrated customer returns 401 (hash parsed), the products API returns all 93.

## Findings the owner must decide on
1. **6 captured Razorpay payments have no order in the old system**: 118.61, 118.61, 195.08, 995.88, 1,458.11, 2,050.69 INR (total 4,936.98), all `completed`. Customers may have paid without receiving an order. They are preserved in `LegacyImportArchive` (SourceTable = payments). Needs manual follow-up (refund or fulfil).
2. **3 online orders were `pending` in the old system although a completed payment exists** - imported as Paid. The 10 cash-on-delivery orders stay Pending (no collection record exists, even for delivered ones).
3. Order status is derived from item statuses (rule documented in the importer); the exact per-item status is kept on each item. Order discount: legacy `orders.discount` looks like an item total, so only `coupon_discount` is mapped to the discount; the raw value is in the archive.
4. One duplicate review (same user+product) is kept in the archive only; the new model allows one review per user per product.
5. The old system's only back-office account is a `sub_admin`. Until sub-admin permissions are built, it cannot use the new admin panel, so **a SuperAdmin must be created for cutover** (do not rely on the local seed).
6. Legacy `cart` (1 row) is archived only.

## Not yet decided / needed
- Delhivery: API credentials work in production only; shipment creation cannot be safely tested without creating real shipments. Plan: port read-only calls (tracking, serviceability) first and test shipment creation with a Delhivery test account or one approved real order.
- Sub-admin permissions: the old enum also had `product_manager`, `manager`, `admin`; confirm which roles/permissions to support.
- SEO: the old Next.js site is server-rendered; the Angular site is client-rendered. Plan: add Angular SSR (or prerendering), sitemap, meta tags and 301 redirects from old URLs.
- Domain layout: sidham.in (Angular), api.sidham.in (.NET), nexus.sidham.in (redirect to /admin).
