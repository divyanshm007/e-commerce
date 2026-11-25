-- ============================================================================
-- Removes UAT TEST data from the database that becomes production. Run BEFORE legacy-import.sql.
--
--   DRY RUN (default, changes nothing - prints what would be removed, then rolls back):
--     psql -U <user> -d <db> -f cleanup-uat-test-data.sql
--   APPLY (only after the owner has approved the list printed by the dry run, and after a database backup):
--     psql -U <user> -d <db> -v apply=1 -f cleanup-uat-test-data.sql
--
-- REMOVED: every order/payment/shipment-tracking row that did not come from the old production system
--          (at this point the database holds no imported data, so all orders are UAT test orders), all shopping
--          carts, UAT-only CUSTOMER accounts (staff accounts are never touched) with their login history,
--          categories that no product or sub-category uses, the test FAQ and the test contact message.
-- KEPT:    staff accounts, banners, blog, gallery, testimonials, static/trust pages, quizzes, site settings,
--          products and their images, FAQs other than the test one, visitor/product-view analytics.
-- ============================================================================
\set ON_ERROR_STOP on
\if :{?apply}
\else
  \set apply 0
\endif
BEGIN;

\echo '--- what will be removed'
SELECT 'orders' AS item, count(*) AS rows FROM "Orders"
UNION ALL SELECT 'order items', count(*) FROM "OrderItems"
UNION ALL SELECT 'payments', count(*) FROM "Payments"
UNION ALL SELECT 'carts', count(*) FROM "Carts"
UNION ALL SELECT 'cart items', count(*) FROM "CartItems"
UNION ALL SELECT 'customer accounts (role 1)', count(*) FROM "Users" WHERE "Role" = 1
UNION ALL SELECT 'unused categories', count(*) FROM "Categories" c WHERE NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."CategoryId" = c."Id") AND NOT EXISTS (SELECT 1 FROM "Categories" k WHERE k."ParentCategoryId" = c."Id")
UNION ALL SELECT 'test FAQ', count(*) FROM "Faqs" WHERE lower("Question") LIKE '%tested via api%'
UNION ALL SELECT 'test contact message', count(*) FROM "ContactMessages" WHERE "Name" = 'Kashish' AND "CreatedAt" < '2026-10-03';
\echo '--- the orders (number | total | placed | guest?)'
SELECT "OrderNumber", "TotalAmount", to_char("CreatedAt",'YYYY-MM-DD'), ("UserId" IS NULL) AS guest FROM "Orders" ORDER BY "CreatedAt";
\echo '--- the customer accounts (masked)'
SELECT regexp_replace("Email",'(.).*@','\1***@') AS email, to_char("CreatedAt",'YYYY-MM-DD') AS registered FROM "Users" WHERE "Role" = 1;
\echo '--- the categories'
SELECT "Name" FROM "Categories" c WHERE NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."CategoryId" = c."Id") AND NOT EXISTS (SELECT 1 FROM "Categories" k WHERE k."ParentCategoryId" = c."Id");

-- ----- orders and everything hanging off them
DELETE FROM "OrderItemTrackings" WHERE "OrderItemId" IN (SELECT "Id" FROM "OrderItems");
DELETE FROM "Payments"   WHERE true;
DELETE FROM "OrderItems" WHERE true;
DELETE FROM "ReturnRequests" WHERE "OrderId" IN (SELECT "Id" FROM "Orders");
DELETE FROM "Reviews" WHERE "OrderId" IN (SELECT "Id" FROM "Orders");
DELETE FROM "Orders"     WHERE true;
-- ----- carts
DELETE FROM "CartItems" WHERE true;
DELETE FROM "Carts" WHERE true;
-- ----- UAT-only customers and what references them
DELETE FROM "ProductViews"   WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "ActivityLogs"   WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "Wishlists"      WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "Addresses"      WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "Reviews"        WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "ReturnRequests" WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "LoginHistories" WHERE "UserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "Referrals"      WHERE "ReferrerId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1) OR "ReferredUserId" IN (SELECT "Id" FROM "Users" WHERE "Role" = 1);
DELETE FROM "Users" WHERE "Role" = 1;
-- ----- empty placeholder categories, test FAQ, test contact message
DELETE FROM "Categories" c WHERE NOT EXISTS (SELECT 1 FROM "Products" p WHERE p."CategoryId" = c."Id") AND NOT EXISTS (SELECT 1 FROM "Categories" k WHERE k."ParentCategoryId" = c."Id");
DELETE FROM "Faqs" WHERE lower("Question") LIKE '%tested via api%';
DELETE FROM "ContactMessages" WHERE "Name" = 'Kashish' AND "CreatedAt" < '2026-10-03';

\echo '--- left afterwards'
SELECT (SELECT count(*) FROM "Users") AS users, (SELECT count(*) FROM "Users" WHERE "Role" = 2) AS super_admins, (SELECT count(*) FROM "Orders") AS orders,
       (SELECT count(*) FROM "Products") AS products, (SELECT count(*) FROM "Categories") AS categories;

\if :apply
  COMMIT;
  \echo 'APPLIED'
\else
  ROLLBACK;
  \echo 'DRY RUN - nothing was changed. Re-run with -v apply=1 to apply.'
\endif
