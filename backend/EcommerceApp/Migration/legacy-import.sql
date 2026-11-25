-- ============================================================================
-- Legacy Sidham (NestJS / Sequelize, database "public") -> EcommerceApp (.NET / EF) importer
--
-- TARGET = the existing UAT database (it becomes production). It already holds data, so this script MERGES:
--  * accounts that exist on both sides (same e-mail) keep the TARGET account (role, password); the legacy
--    history (orders, addresses, reviews) is attached to it,
--  * products that exist on both sides take the LEGACY business data (price, stock, text, category) - the
--    UAT copies only differ by test stock - while UAT-only curation (featured flags, SEO text) is kept,
--  * banners/FAQs already present in the target (same title/question) are not duplicated,
--  * the script ABORTS if a category slug would collide (run cleanup-uat-test-data.sql first).
-- Run against the TARGET database (start the new .NET app once first so the new tables exist):
--   psql -U <user> -d <target_db> -v ON_ERROR_STOP=1 \
--        -v legacy_host=... -v legacy_port=5432 -v legacy_db=... -v legacy_user=... -v legacy_password=... \
--        -f legacy-import.sql
--
-- Properties
--  * Original UUIDs are kept for every record, so links (orders->users, items->products ...) and anything
--    external that refers to them stay valid.
--  * Password hashes are copied unchanged (both systems use bcrypt $2b$; BCrypt.Net verifies them).
--  * Re-runnable: every insert is ON CONFLICT DO NOTHING.
--  * Nothing is thrown away: every source row is also stored verbatim (minus password hashes) in
--    "LegacyImportArchive". Rows that have no home in the new model (for example payments whose order no
--    longer exists) live only there and are listed by legacy-reconcile.sql.
--  * Runs in ONE transaction: any error rolls everything back.
-- ============================================================================
\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgres_fdw;
DROP SERVER IF EXISTS legacy_src CASCADE;
CREATE SERVER legacy_src FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host :'legacy_host', port :'legacy_port', dbname :'legacy_db');
CREATE USER MAPPING FOR CURRENT_USER SERVER legacy_src OPTIONS (user :'legacy_user', password :'legacy_password');
DROP SCHEMA IF EXISTS legacy CASCADE;
CREATE SCHEMA legacy;
-- The legacy tables use PostgreSQL enum types; the foreign-table definitions need them to exist here.
-- They are created for the duration of this import and dropped at the end (this aborts if a type already exists).
CREATE TYPE public.address_type_enum AS ENUM ('shipping', 'billing', 'other', 'home', 'office');
CREATE TYPE public.enum_addresses_address_type AS ENUM ('home', 'office', 'other');
CREATE TYPE public.enum_admin_users_role AS ENUM ('super_admin', 'admin', 'product_manager', 'manager', 'sub_admin');
CREATE TYPE public.enum_coupons_scope AS ENUM ('global', 'product', 'category', 'category_product');
CREATE TYPE public.enum_order_items_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return-requested', 'returned');
CREATE TYPE public.enum_orders_payment_method AS ENUM ('card', 'cash', 'upi', 'wallet');
CREATE TYPE public.enum_orders_payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.enum_orders_shipping_method AS ENUM ('standard', 'express', 'overnight');
CREATE TYPE public.enum_orders_status AS ENUM ('pending', 'processing', 'ready-to-ship', 'shipped', 'delivered', 'cancelled', 'return');
CREATE TYPE public.enum_users_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE public.enum_users_status AS ENUM ('ACTIVE', 'INACTIVE', 'active', 'inactive');
CREATE TYPE public.item_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded');
CREATE TYPE public.order_item_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return-requested', 'returned');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'canceled', 'refunded', 'ready-to-ship', 'return');
CREATE TYPE public.payment_method AS ENUM ('credit_card', 'paypal', 'bank_transfer', 'cod');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.shipping_method AS ENUM ('standard', 'express', 'same_day');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.user_role AS ENUM ('user', 'guest');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'banned');
IMPORT FOREIGN SCHEMA public FROM SERVER legacy_src INTO legacy;

-- Absolute legacy media URLs become site-relative (/uploads/...), served by the new API / nginx
CREATE OR REPLACE FUNCTION pg_temp.rel_url(u text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT regexp_replace(u, '^https?://api\.sidham\.in', '') $$;

-- ---------------------------------------------------------------- safety checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM legacy.categories l JOIN "Categories" t ON t."Slug" = l.slug AND t."Id" <> l.id) THEN
    RAISE EXCEPTION 'category slug collision with an existing target category - run cleanup-uat-test-data.sql (or resolve) first';
  END IF;
  IF EXISTS (SELECT 1 FROM legacy.products l JOIN "Products" t ON t."Slug" = l.slug AND t."Id" <> l.id) THEN
    RAISE EXCEPTION 'product slug collision with a different target product';
  END IF;
END $$;

-- ---------------------------------------------------------------- user id map (legacy id -> id in the target)
CREATE TEMP TABLE user_map AS
SELECT l.id AS legacy_id, coalesce(t."Id", l.id) AS target_id, (t."Id" IS NOT NULL) AS merged
FROM (SELECT id, lower(trim(email)) AS email FROM legacy.users UNION ALL SELECT id, lower(trim(email)) FROM legacy.admin_users) l
LEFT JOIN "Users" t ON lower(t."Email") = l.email;
\echo 'accounts that already exist in the target and are merged (not duplicated):'
SELECT count(*) FILTER (WHERE merged) AS merged_accounts, count(*) AS legacy_accounts FROM user_map;

-- ---------------------------------------------------------------- users
INSERT INTO "Users" ("Id","FirstName","LastName","Email","PasswordHash","Phone","Role","EmailVerified","IsActive",
                     "LastLoginAt","RazorpayCustomerId","PasswordResetAttempts","PasswordResetSendCount","CreatedAt","UpdatedAt")
SELECT u.id, coalesce(nullif(trim(u.first_name),''),'Customer'), coalesce(trim(u.last_name),''), lower(trim(u.email)), u.password,
       u.phone_number, 1, coalesce(u.is_verified,false), (u.status::text = 'active'),
       u.last_login, u.razorpay_customer_id, 0, 0, u.created_at, u.updated_at
FROM legacy.users u
WHERE u.id NOT IN (SELECT legacy_id FROM user_map WHERE merged)
ON CONFLICT ("Id") DO NOTHING;
-- a merged account keeps its target role/password; only fill what it lacks
UPDATE "Users" t SET "RazorpayCustomerId" = coalesce(t."RazorpayCustomerId", u.razorpay_customer_id)
FROM legacy.users u JOIN user_map m ON m.legacy_id = u.id AND m.merged WHERE t."Id" = m.target_id;

-- back-office accounts: role 3 = SubAdmin (permissions are assigned in the admin panel afterwards)
INSERT INTO "Users" ("Id","FirstName","LastName","Email","PasswordHash","Phone","Role","EmailVerified","IsActive",
                     "LastLoginAt","PasswordResetAttempts","PasswordResetSendCount","CreatedAt","UpdatedAt")
SELECT a.id, coalesce(nullif(trim(a.first_name),''),'Admin'), coalesce(trim(a.last_name),''), lower(trim(a.email)), a.password,
       a.phone_number, 3, true, coalesce(a.is_active,true), a.last_login, 0, 0, a.created_at, a.updated_at
FROM legacy.admin_users a
WHERE a.id NOT IN (SELECT legacy_id FROM user_map WHERE merged)
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- addresses
INSERT INTO "Addresses" ("Id","UserId","FullName","Phone","Line1","Line2","City","State","PostalCode","Country",
                         "AddressType","IsDefault","Label","SecondaryPhone","DeliveryInstructions","CreatedAt","UpdatedAt","IsActive")
SELECT a.id, m.target_id, coalesce(a.full_name,''), coalesce(a.primary_mobile,''), coalesce(a.address_line1,''), a.address_line2,
       coalesce(a.city,''), coalesce(a.state,''), coalesce(a.postal_code,''), coalesce(a.country,'India'),
       1, coalesce(a.is_primary,false), a.address_type::text, a.secondary_mobile, a.delivery_instructions,
       a.created_at, a.updated_at, true
FROM legacy.addresses a JOIN user_map m ON m.legacy_id = a.user_id
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- categories (parents after children exist)
INSERT INTO "Categories" ("Id","Name","Slug","Description","SortOrder","IsFeatured","CreatedAt","UpdatedAt","IsActive")
SELECT c.id, c.name, c.slug, c.description, 0, false, c.created_at, c.updated_at, true
FROM legacy.categories c
ON CONFLICT ("Id") DO NOTHING;
UPDATE "Categories" t SET "ParentCategoryId" = c.parent_id
FROM legacy.categories c
WHERE t."Id" = c.id AND c.parent_id IS NOT NULL AND t."ParentCategoryId" IS NULL;

-- ---------------------------------------------------------------- products + images
INSERT INTO "Products" ("Id","Name","Slug","CategoryId","Manufacturer","Brand","Unit","Sku","Price","DiscountPrice","TaxPercentage","Currency",
                        "StockQuantity","LowStockThreshold","Description","Composition","DosageForm","Packaging","Benefits",
                        "StorageInstructions","SideEffects","PrescriptionRequired","IsFeatured","IsNewArrival","IsBestSeller","IsSpecialOffer",
                        "ViewCount","SoldCount","AverageRating","ReviewCount","CreatedAt","UpdatedAt","IsActive")
SELECT p.id, p.name, p.slug, p.category_id, p.manufacturer, p.brand, p.unit, p.sku, p.price, p.discount_price, coalesce(p.tax,0),
       coalesce(p.currency,'INR'), coalesce(p.stock_quantity,0), 10, p.description, p.composition, p.dosage_form, p.packaging,
       p.benefits, p.storage_instructions, p.side_effects, coalesce(p.prescription_required,false), false, false, false, false,
       0, 0, coalesce(p.average_rating,0), coalesce(p.reviews_count,0), p.created_at, p.updated_at, true
FROM legacy.products p
ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name", "Slug" = EXCLUDED."Slug", "CategoryId" = EXCLUDED."CategoryId", "Manufacturer" = EXCLUDED."Manufacturer",
  "Brand" = EXCLUDED."Brand", "Unit" = EXCLUDED."Unit", "Sku" = EXCLUDED."Sku", "Price" = EXCLUDED."Price", "DiscountPrice" = EXCLUDED."DiscountPrice",
  "TaxPercentage" = EXCLUDED."TaxPercentage", "Currency" = EXCLUDED."Currency",
  "StockQuantity" = EXCLUDED."StockQuantity",            -- real production stock wins (UAT stock was reduced by test orders)
  "Description" = EXCLUDED."Description", "Composition" = EXCLUDED."Composition", "DosageForm" = EXCLUDED."DosageForm",
  "Packaging" = EXCLUDED."Packaging", "Benefits" = EXCLUDED."Benefits", "StorageInstructions" = EXCLUDED."StorageInstructions",
  "SideEffects" = EXCLUDED."SideEffects", "PrescriptionRequired" = EXCLUDED."PrescriptionRequired",
  "AverageRating" = EXCLUDED."AverageRating", "ReviewCount" = EXCLUDED."ReviewCount", "UpdatedAt" = now();
  -- NOT overwritten: IsFeatured/IsNewArrival/IsBestSeller/IsSpecialOffer, Meta*, Ingredients, HowToUse, ViewCount (UAT curation/analytics)

INSERT INTO "ProductImages" ("Id","ProductId","ImageUrl","IsPrimary","SortOrder","CreatedAt","UpdatedAt","IsActive")
SELECT i.id, i.product_id, pg_temp.rel_url(i.image_url), coalesce(i.is_primary,false), coalesce(i.position,0), i.created_at, i.updated_at, true
FROM legacy.product_image i
WHERE EXISTS (SELECT 1 FROM "Products" p WHERE p."Id" = i.product_id)
  AND NOT EXISTS (SELECT 1 FROM "ProductImages" x WHERE x."ProductId" = i.product_id AND x."Id" <> i.id AND x."IsPrimary")
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- courier pickups (referenced by order items)
INSERT INTO "OrderPickups" ("Id","PickupId","PickupLocationName","ClientName","IncomingCenterName","PickupDate","PickupTime",
                            "ExpectedPackageCount","RequestPayload","ResponsePayload","CreatedAt","UpdatedAt","IsActive")
SELECT k.id, coalesce(k.pickup_id,''), k.pickup_location_name, k.client_name, k.incoming_center_name, k.pickup_date, k.pickup_time,
       coalesce(k.expected_package_count,0), k.request_payload::text, k.response_payload::text, k.created_at, k.updated_at, true
FROM legacy.order_pickups k
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- orders
-- The legacy system tracks status per ITEM; the order status is derived from its non-cancelled items:
--   all items cancelled -> Cancelled(5); all delivered -> Delivered(4); all returned -> Returned(6);
--   any confirmed -> Confirmed(2); any pending -> Pending(1); otherwise Delivered(4).
-- The exact per-item status is kept in OrderItems."ItemStatus". The shipping address is the (identical) address
-- snapshot stored on the order's items. Payment is Paid(2) only when a completed legacy payment is linked to the order.
WITH item_agg AS (
  SELECT i.order_id,
         count(*)                                                  AS n,
         count(*) FILTER (WHERE i.item_status::text = 'cancelled') AS cancelled,
         count(*) FILTER (WHERE i.item_status::text = 'delivered') AS delivered,
         count(*) FILTER (WHERE i.item_status::text = 'returned')  AS returned,
         count(*) FILTER (WHERE i.item_status::text = 'confirmed') AS confirmed,
         count(*) FILTER (WHERE i.item_status::text = 'pending')   AS pending,
         sum(i.total_price)                                        AS items_total,
         sum(coalesce(i.coupon_discount,0))                        AS coupon_disc
  FROM legacy.order_items i GROUP BY i.order_id
), addr AS (
  SELECT DISTINCT ON (i.order_id) i.order_id, i.full_name, i.primary_mobile, i.address_line1, i.address_line2, i.city, i.state, i.postal_code, i.country
  FROM legacy.order_items i ORDER BY i.order_id, i.created_at
), paid AS (
  SELECT DISTINCT o.id AS order_id
  FROM legacy.orders o JOIN legacy.payments p
    ON (p.order_id = o.id OR (p.provider_order_id IS NOT NULL AND p.provider_order_id = o.razorpay_order_id))
  WHERE p.status = 'completed'
)
INSERT INTO "Orders" ("Id","OrderNumber","UserId","Status","PaymentStatus","PaymentMethod","RazorpayOrderId","RazorpayPaymentId","RazorpaySignature",
                      "SubTotal","DiscountAmount","ShippingCharge","TaxAmount","TotalAmount","CouponCode","RefundStatus",
                      "ShippingFullName","ShippingPhone","ShippingLine1","ShippingLine2","ShippingCity","ShippingState","ShippingPostalCode","ShippingCountry",
                      "BillingFullName","BillingPhone","BillingLine1","BillingLine2","BillingCity","BillingState","BillingPostalCode","BillingCountry",
                      "CreatedAt","UpdatedAt","IsActive")
SELECT o.id, coalesce(o.display_order_id, o.order_id, o.id::text), m.target_id,
       CASE WHEN a.n = a.cancelled THEN 5
            WHEN a.n - a.cancelled = a.delivered THEN 4
            WHEN a.n - a.cancelled = a.returned THEN 6
            WHEN a.confirmed > 0 THEN 2
            WHEN a.pending > 0 THEN 1
            ELSE 4 END,
       CASE WHEN o.id IN (SELECT order_id FROM paid) THEN 2 ELSE 1 END,
       CASE WHEN lower(coalesce(o.payment_method,'')) IN ('cash','cod') THEN 2 ELSE 1 END,
       o.razorpay_order_id, o.razorpay_payment_id, o.razorpay_signature,
       coalesce(a.items_total,0), coalesce(o.coupon_discount,0), coalesce(o.shipping_cost,0), coalesce(o.tax_amount,0), o.total_amount, o.coupon_code, 0,
       coalesce(d.full_name,''), coalesce(d.primary_mobile,''), coalesce(d.address_line1,''), d.address_line2, coalesce(d.city,''), coalesce(d.state,''), coalesce(d.postal_code,''), coalesce(d.country,'India'),
       coalesce(d.full_name,''), coalesce(d.primary_mobile,''), coalesce(d.address_line1,''), d.address_line2, coalesce(d.city,''), coalesce(d.state,''), coalesce(d.postal_code,''), coalesce(d.country,'India'),
       coalesce(o.order_date, o.created_at), o.updated_at, true
FROM legacy.orders o
LEFT JOIN item_agg a ON a.order_id = o.id
LEFT JOIN addr d ON d.order_id = o.id
LEFT JOIN user_map m ON m.legacy_id = o.user_id
WHERE o.user_id IS NULL OR m.target_id IS NOT NULL
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- order items (carry the per-item shipping/refund data)
INSERT INTO "OrderItems" ("Id","OrderId","ProductId","ProductName","ProductImageUrl","Quantity","UnitPrice","DiscountAmount","TaxPercentage","TaxAmount","TotalPrice",
                          "ItemStatus","CancelReason","ShipmentId","PickupId","CouponCode","CouponDiscount","TransactionId","PaymentDate",
                          "RefundId","RefundAmount","RefundReason","RefundStatus","CreatedAt","UpdatedAt","IsActive")
SELECT i.id, i.order_id, i.product_id, p."Name",
       (SELECT pg_temp.rel_url(pi.image_url) FROM legacy.product_image pi WHERE pi.product_id = i.product_id ORDER BY pi.is_primary DESC, pi.position LIMIT 1),
       i.quantity, i.price, coalesce(i.discount,0), 0, coalesce(i.tax_amount,0), i.total_price,
       i.item_status::text, i.cancel_reason, i.shipment_id, i.pickup_id, i.coupon_code, coalesce(i.coupon_discount,0), i.transaction_id, i.payment_date,
       i.refund_id, i.refund_amount, i.refund_reason, i.refund_status, i.created_at, i.updated_at, true
FROM legacy.order_items i
JOIN "Orders" o ON o."Id" = i.order_id
JOIN "Products" p ON p."Id" = i.product_id
ON CONFLICT ("Id") DO NOTHING;

-- units sold = quantities on non-cancelled legacy items (UAT test sales must not count)
UPDATE "Products" SET "SoldCount" = 0 WHERE "Id" IN (SELECT id FROM legacy.products);
UPDATE "Products" p SET "SoldCount" = s.q
FROM (SELECT product_id, sum(quantity)::int q FROM legacy.order_items WHERE item_status::text NOT IN ('cancelled','returned') GROUP BY 1) s
WHERE p."Id" = s.product_id;

INSERT INTO "OrderItemTrackings" ("Id","OrderItemId","StatusKey","Title","Description","EventTime","Location","CourierName","AwbNumber","Source","Meta","CreatedAt","UpdatedAt","IsActive")
SELECT t.id, t.order_item_id, t.status_key, coalesce(t.title,t.status_key), t.description, coalesce(t.event_time,t.created_at), t.location, t.courier_name,
       t.awb_number, t.source, t.meta::text, t.created_at, t.updated_at, true
FROM legacy.order_item_tracking t
WHERE EXISTS (SELECT 1 FROM "OrderItems" i WHERE i."Id" = t.order_item_id)
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- payments (only those linked to an existing order; the rest stay in the archive)
INSERT INTO "Payments" ("Id","OrderId","RazorpayOrderId","RazorpayPaymentId","Method","Status","Amount","Currency","RefundStatus","PaidAt","FailureReason","WebhookPayload","CreatedAt","UpdatedAt","IsActive")
SELECT p.id, o."Id", p.provider_order_id, p.provider_payment_id, 1,
       CASE p.status WHEN 'completed' THEN 2 WHEN 'failed' THEN 3 ELSE 1 END,
       p.amount, coalesce(p.currency,'INR'), 0, p.payment_datetime, p.error_description, p.meta_data::text, p.created_at, p.updated_at, true
FROM legacy.payments p
JOIN "Orders" o ON o."Id" = p.order_id
ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- content & marketing
INSERT INTO "ContactMessages" ("Id","Name","Email","Phone","Subject","Message","IsRead","CreatedAt","UpdatedAt","IsActive")
SELECT c.id, coalesce(c.name,''), coalesce(c.email,''), c.phone, coalesce(c.subject,''), coalesce(c.message,''), false, c.created_at, c.updated_at, true
FROM legacy.contacts c ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Coupons" ("Id","Code","Description","Scope","DiscountType","DiscountValue","UsedCount","StartDate","ExpiryDate","CreatedAt","UpdatedAt","IsActive")
SELECT c.id, upper(c.code), c.description, c.scope::text, 1, c.discount_percentage, 0, c.start_date, c.end_date, c.created_at, c.updated_at, coalesce(c.is_active,true)
FROM legacy.coupons c ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "CouponProducts" ("Id","CouponId","ProductId","CreatedAt","IsActive")
SELECT x.id, x.coupon_id, x.product_id, now(), true FROM legacy.coupon_products x
WHERE EXISTS (SELECT 1 FROM "Coupons" c WHERE c."Id"=x.coupon_id) AND EXISTS (SELECT 1 FROM "Products" p WHERE p."Id"=x.product_id)
ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "CouponCategories" ("Id","CouponId","CategoryId","CreatedAt","IsActive")
SELECT x.id, x.coupon_id, x.category_id, now(), true FROM legacy.coupon_categories x
WHERE EXISTS (SELECT 1 FROM "Coupons" c WHERE c."Id"=x.coupon_id) AND EXISTS (SELECT 1 FROM "Categories" g WHERE g."Id"=x.category_id)
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Banners" ("Id","Title","ImageUrl","LinkUrl","BannerType","SortOrder","StartDate","EndDate","CreatedAt","UpdatedAt","IsActive")
SELECT b.id, coalesce(b.title,''), pg_temp.rel_url(coalesce(b.image_url,'')), b.redirect_url, 1,
       (100 + row_number() OVER (ORDER BY b.created_at))::int, b.start_date, b.end_date, b.created_at, b.updated_at, coalesce(b.is_active,true)
FROM legacy.banners b
WHERE NOT EXISTS (SELECT 1 FROM "Banners" x WHERE lower(trim(x."Title")) = lower(trim(b.title)))
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Faqs" ("Id","Question","Answer","SortOrder","CreatedAt","UpdatedAt","IsActive")
SELECT f.id, f.question, f.answer, (1000 + row_number() OVER (ORDER BY f.created_at))::int, f.created_at, f.updated_at, true
FROM legacy.faqs f
WHERE NOT EXISTS (SELECT 1 FROM "Faqs" x WHERE lower(trim(x."Question")) = lower(trim(f.question)))
ON CONFLICT ("Id") DO NOTHING;

-- the new model allows one review per user per product: the latest one is imported, any older duplicate stays in the archive
INSERT INTO "Reviews" ("Id","ProductId","UserId","Rating","Comment","Status","CreatedAt","UpdatedAt","IsActive")
SELECT DISTINCT ON (r.product_id, m.target_id) r.id, r.product_id, m.target_id, r.rating, r.comment,
       CASE lower(coalesce(r.status,'pending')) WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 ELSE 1 END, r.created_at, r.updated_at, true
FROM legacy.reviews r JOIN user_map m ON m.legacy_id = r.user_id
WHERE EXISTS (SELECT 1 FROM "Products" p WHERE p."Id" = r.product_id)
ORDER BY r.product_id, m.target_id, r.created_at DESC
ON CONFLICT DO NOTHING;

INSERT INTO "States" ("Id","Name","Code","CountryCode","CreatedAt","UpdatedAt","IsActive")
SELECT s.id, s.state_name, coalesce(s.state_code,''), coalesce(s.country_code,'IN'), s.created_at, s.updated_at, true
FROM legacy.states s ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "PromoOffers" ("Id","Title","Description","CreatedAt","UpdatedAt","IsActive")
SELECT o.id, o.title, o.description, o.created_at, o.updated_at, coalesce(o.is_active,true) FROM legacy.promo_offers o ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "PaymentOptions" ("Id","Name","Description","IconUrl","SortOrder","IsEnabled","CreatedAt","UpdatedAt","IsActive")
SELECT m.id, m.name, m.description, m.icon_url, coalesce(m.sort_order,0), coalesce(m.is_enabled,true), m.created_at, m.updated_at, true
FROM legacy.payment_methods m ON CONFLICT ("Id") DO NOTHING;

-- ---------------------------------------------------------------- verbatim archive of EVERY legacy row (password hashes removed)
INSERT INTO "LegacyImportArchive" ("SourceTable","SourceId","Data")
SELECT 'users',               id::text, to_jsonb(t) - 'password' FROM legacy.users t UNION ALL
SELECT 'admin_users',         id::text, to_jsonb(t) - 'password' FROM legacy.admin_users t UNION ALL
SELECT 'addresses',           id::text, to_jsonb(t) FROM legacy.addresses t UNION ALL
SELECT 'categories',          id::text, to_jsonb(t) FROM legacy.categories t UNION ALL
SELECT 'products',            id::text, to_jsonb(t) FROM legacy.products t UNION ALL
SELECT 'product_image',       id::text, to_jsonb(t) FROM legacy.product_image t UNION ALL
SELECT 'orders',              id::text, to_jsonb(t) FROM legacy.orders t UNION ALL
SELECT 'order_items',         id::text, to_jsonb(t) FROM legacy.order_items t UNION ALL
SELECT 'order_item_tracking', id::text, to_jsonb(t) FROM legacy.order_item_tracking t UNION ALL
SELECT 'order_pickups',       id::text, to_jsonb(t) FROM legacy.order_pickups t UNION ALL
SELECT 'payments',            id::text, to_jsonb(t) FROM legacy.payments t UNION ALL
SELECT 'refunds',             id::text, to_jsonb(t) FROM legacy.refunds t UNION ALL
SELECT 'contacts',            id::text, to_jsonb(t) FROM legacy.contacts t UNION ALL
SELECT 'coupons',             id::text, to_jsonb(t) FROM legacy.coupons t UNION ALL
SELECT 'coupon_products',     id::text, to_jsonb(t) FROM legacy.coupon_products t UNION ALL
SELECT 'coupon_categories',   id::text, to_jsonb(t) FROM legacy.coupon_categories t UNION ALL
SELECT 'banners',             id::text, to_jsonb(t) FROM legacy.banners t UNION ALL
SELECT 'faqs',                id::text, to_jsonb(t) FROM legacy.faqs t UNION ALL
SELECT 'reviews',             id::text, to_jsonb(t) FROM legacy.reviews t UNION ALL
SELECT 'states',              id::text, to_jsonb(t) FROM legacy.states t UNION ALL
SELECT 'promo_offers',        id::text, to_jsonb(t) FROM legacy.promo_offers t UNION ALL
SELECT 'payment_methods',     id::text, to_jsonb(t) FROM legacy.payment_methods t UNION ALL
SELECT 'cart',                id::text, to_jsonb(t) FROM legacy.cart t UNION ALL
SELECT 'wishlist',            id::text, to_jsonb(t) FROM legacy.wishlist t UNION ALL
SELECT 'tickets',             id::text, to_jsonb(t) FROM legacy.tickets t UNION ALL
SELECT 'ticket_messages',     id::text, to_jsonb(t) FROM legacy.ticket_messages t
ON CONFLICT ("SourceTable","SourceId") DO NOTHING;

DROP SCHEMA legacy CASCADE;
DROP SERVER legacy_src CASCADE;
DROP TYPE public.address_type_enum;
DROP TYPE public.enum_addresses_address_type;
DROP TYPE public.enum_admin_users_role;
DROP TYPE public.enum_coupons_scope;
DROP TYPE public.enum_order_items_status;
DROP TYPE public.enum_orders_payment_method;
DROP TYPE public.enum_orders_payment_status;
DROP TYPE public.enum_orders_shipping_method;
DROP TYPE public.enum_orders_status;
DROP TYPE public.enum_users_role;
DROP TYPE public.enum_users_status;
DROP TYPE public.item_status;
DROP TYPE public.order_item_status;
DROP TYPE public.order_status;
DROP TYPE public.payment_method;
DROP TYPE public.payment_status;
DROP TYPE public.shipping_method;
DROP TYPE public.ticket_status;
DROP TYPE public.user_role;
DROP TYPE public.user_status;
COMMIT;
\echo 'legacy import finished'
