#!/usr/bin/env node
// Reconciles a MERGED target database against the legacy source. Read-only on both sides.
//
//   PSQL_LEGACY="psql -U u -h host -d legacy_db -tA" PSQL_TARGET="psql -U u -h host -d target_db -tA" node legacy-reconcile.js
//
// Each command receives the SQL on stdin, so it can also be e.g.  ssh host "docker exec -i <container> psql -U postgres -d ecommerce_db -tA".
// Every legacy record must exist in the target with identical values (the target may additionally hold its own
// UAT-origin records - those are listed, not compared).
const { spawnSync } = require("child_process");
const L = process.env.PSQL_LEGACY, T = process.env.PSQL_TARGET;
if (!L || !T) { console.error("set PSQL_LEGACY and PSQL_TARGET"); process.exit(2); }
const run = (cmd, sql) => {
  const r = spawnSync(cmd, { input: sql, shell: true, encoding: "utf8" });
  if (r.status !== 0 || /ERROR/.test(r.stdout + r.stderr)) throw new Error((r.stdout + r.stderr).trim().slice(0, 400) + "\nSQL: " + sql.slice(0, 200));
  return r.stdout.replace(/\r/g, "").trim();
};
const l = sql => run(L, sql), t = sql => run(T, sql);
let pass = 0, fail = 0;
const check = (name, a, b) => { const ok = a === b; ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (legacy=${a.length > 60 ? a.slice(0, 12) + "..." : a} target=${b.length > 60 ? b.slice(0, 12) + "..." : b})`); };
const zero = (name, v) => { const ok = v === "0"; ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (${v})`); };
const md5 = col => `md5(coalesce(string_agg(${col}, ',' order by ${col}), ''))`;

// ---- legacy values, pulled once, used to build target-side filters
const legacyIds = tbl => l(`select id from ${tbl}`).split("\n").filter(Boolean);
const idList = ids => `'{${ids.join(",")}}'::uuid[]`;
const ids = {};
for (const tbl of ["addresses", "categories", "products", "product_image", "orders", "order_items", "order_item_tracking", "order_pickups", "contacts", "coupons", "coupon_products", "states", "promo_offers"]) ids[tbl] = legacyIds(tbl);

console.log("== every legacy record is present in the target");
const present = (name, tbl, targetTbl) => {
  const n = t(`select count(*) from "${targetTbl}" where "Id" = any(${idList(ids[tbl])})`);
  check(name, String(ids[tbl].length), n);
};
present("addresses", "addresses", "Addresses");
present("categories", "categories", "Categories");
present("products", "products", "Products");
present("product images", "product_image", "ProductImages");
present("orders", "orders", "Orders");
present("order items", "order_items", "OrderItems");
present("order item tracking events", "order_item_tracking", "OrderItemTrackings");
present("courier pickups", "order_pickups", "OrderPickups");
present("contact enquiries", "contacts", "ContactMessages");
present("coupons", "coupons", "Coupons");
present("coupon-product links", "coupon_products", "CouponProducts");
present("states", "states", "States");
present("promo offers", "promo_offers", "PromoOffers");

console.log("== accounts (customers + staff), matched by e-mail");
const legacyAccounts = l(`select lower(trim(email)) from (select email from users union all select email from admin_users) x order by 1`).split("\n");
const missing = t(`select count(*) from unnest('{${legacyAccounts.join(",")}}'::text[]) e where not exists (select 1 from "Users" u where lower(u."Email") = e)`);
zero("legacy accounts missing in the target", missing);
const mergedEmails = t(`select string_agg(lower("Email"), ',') from "Users" where "Id" not in (select "Id" from "Users" where lower("Email") = any('{${legacyAccounts.join(",")}}'::text[]) and "Id" = any(${idList(l("select id from users union all select id from admin_users").split("\n"))}))
                         and lower("Email") = any('{${legacyAccounts.join(",")}}'::text[])`);
console.log(`INFO  merged accounts (existed in the target already, kept as-is): ${mergedEmails ? mergedEmails.replace(/^(.).*@/, "$1***@") : "none"}`);
const notMerged = legacyAccounts.filter(e => !(mergedEmails || "").split(",").includes(e));
check("password hashes of every imported (non-merged) account identical",
  l(`select ${md5("lower(trim(email))||':'||password")} from (select email,password from users union all select email,password from admin_users) x where lower(trim(email)) = any('{${notMerged.join(",")}}'::text[])`),
  t(`select ${md5(`lower("Email")||':'||"PasswordHash"`)} from "Users" where lower("Email") = any('{${notMerged.join(",")}}'::text[])`));
check("user ids of imported accounts identical",
  l(`select ${md5("id::text")} from (select id,email from users union all select id,email from admin_users) x where lower(trim(email)) = any('{${notMerged.join(",")}}'::text[])`),
  t(`select ${md5(`"Id"::text`)} from "Users" where lower("Email") = any('{${notMerged.join(",")}}'::text[])`));
zero("password hashes not in bcrypt format (target, all accounts)", t(`select count(*) from "Users" where "PasswordHash" not like '$2%'`));

console.log("== each legacy order is owned by the same person (by e-mail)");
check("order -> owner e-mail",
  l(`select ${md5("o.id::text||':'||lower(trim(u.email))")} from orders o join (select id,email from users union all select id,email from admin_users) u on u.id=o.user_id`),
  t(`select ${md5(`o."Id"::text||':'||lower(u."Email")`)} from "Orders" o join "Users" u on u."Id"=o."UserId" where o."Id" = any(${idList(ids.orders)})`));
check("address -> owner e-mail",
  l(`select ${md5("a.id::text||':'||lower(trim(u.email))")} from addresses a join users u on u.id=a.user_id`),
  t(`select ${md5(`a."Id"::text||':'||lower(u."Email")`)} from "Addresses" a join "Users" u on u."Id"=a."UserId" where a."Id" = any(${idList(ids.addresses)})`));

console.log("== product master data is identical (legacy wins), all fields");
check("name, slug, category, price, discount, stock, text fields, flags per product",
  l(`select ${md5(`id::text||'|'||name||'|'||slug||'|'||coalesce(category_id::text,'')||'|'||price::numeric(12,2)||'|'||coalesce(discount_price::numeric(12,2)::text,'')||'|'||stock_quantity||'|'||coalesce(sku,'')||'|'||coalesce(description,'')||'|'||coalesce(composition,'')||'|'||coalesce(benefits,'')||'|'||coalesce(packaging,'')||'|'||coalesce(dosage_form,'')||'|'||coalesce(side_effects,'')||'|'||coalesce(storage_instructions,'')||'|'||coalesce(manufacturer,'')||'|'||coalesce(prescription_required,false)`)} from products`),
  t(`select ${md5(`"Id"::text||'|'||"Name"||'|'||"Slug"||'|'||coalesce("CategoryId"::text,'')||'|'||"Price"::numeric(12,2)||'|'||coalesce("DiscountPrice"::numeric(12,2)::text,'')||'|'||"StockQuantity"||'|'||coalesce("Sku",'')||'|'||coalesce("Description",'')||'|'||coalesce("Composition",'')||'|'||coalesce("Benefits",'')||'|'||coalesce("Packaging",'')||'|'||coalesce("DosageForm",'')||'|'||coalesce("SideEffects",'')||'|'||coalesce("StorageInstructions",'')||'|'||coalesce("Manufacturer",'')||'|'||"PrescriptionRequired"`)} from "Products" where "Id" = any(${idList(ids.products)})`));
check("category tree (id, name, slug, parent)",
  l(`select ${md5(`id::text||'|'||name||'|'||slug||'|'||coalesce(parent_id::text,'')`)} from categories`),
  t(`select ${md5(`"Id"::text||'|'||"Name"||'|'||"Slug"||'|'||coalesce("ParentCategoryId"::text,'')`)} from "Categories" where "Id" = any(${idList(ids.categories)})`));
check("units sold per product (from real sales only)",
  l(`select ${md5("p.id::text||':'||coalesce(s.q,0)")} from products p left join (select product_id, sum(quantity)::int q from order_items where item_status::text not in ('cancelled','returned') group by 1) s on s.product_id=p.id`),
  t(`select ${md5(`p."Id"::text||':'||p."SoldCount"`)} from "Products" p where p."Id" = any(${idList(ids.products)})`));

console.log("== money and quantities (legacy-sourced rows only)");
const sums = [
  ["order totals", "select coalesce(sum(total_amount),0) from orders", `select coalesce(sum("TotalAmount"),0) from "Orders" where "Id" = any(${idList(ids.orders)})`],
  ["order shipping", "select coalesce(sum(shipping_cost),0) from orders", `select coalesce(sum("ShippingCharge"),0) from "Orders" where "Id" = any(${idList(ids.orders)})`],
  ["order tax", "select coalesce(sum(tax_amount),0) from orders", `select coalesce(sum("TaxAmount"),0) from "Orders" where "Id" = any(${idList(ids.orders)})`],
  ["item totals", "select coalesce(sum(total_price),0) from order_items", `select coalesce(sum("TotalPrice"),0) from "OrderItems" where "Id" = any(${idList(ids.order_items)})`],
  ["item quantities", "select coalesce(sum(quantity),0) from order_items", `select coalesce(sum("Quantity"),0) from "OrderItems" where "Id" = any(${idList(ids.order_items)})`],
  ["item statuses", "select string_agg(s||':'||c, ',' order by s) from (select item_status::text s, count(*) c from order_items group by 1) q", `select string_agg(s||':'||c, ',' order by s) from (select "ItemStatus" s, count(*) c from "OrderItems" where "Id" = any(${idList(ids.order_items)}) group by 1) q`],
  ["ALL payments (linked + archived-only)", "select coalesce(sum(amount),0) from payments", `select coalesce(sum((a."Data"->>'amount')::numeric),0) from "LegacyImportArchive" a where a."SourceTable"='payments'`],
  ["total stock units", "select coalesce(sum(stock_quantity),0) from products", `select coalesce(sum("StockQuantity"),0) from "Products" where "Id" = any(${idList(ids.products)})`],
];
for (const [n, a, b] of sums) check(n, l(a), t(b));
check("payments: linked rows + archive-only rows = legacy count", l("select count(*) from payments"),
  t(`select (select count(*) from "Payments" where "Id" = any('{${l("select id from payments").split("\n").join(",")}}'::uuid[])) + (select count(*) from "LegacyImportArchive" a where a."SourceTable"='payments' and not exists (select 1 from "Payments" p where p."Id"::text=a."SourceId"))`));

console.log("== merged (non-duplicated) content");
const titles = l("select string_agg(lower(trim(title)), '~') from banners").split("~");
zero("legacy banners missing by title", t(`select count(*) from unnest(string_to_array($$${titles.join("~")}$$, '~')) x where not exists (select 1 from "Banners" b where lower(trim(b."Title")) = x)`));
const qs = l("select string_agg(lower(trim(question)), '~') from faqs").split("~");
zero("legacy FAQs missing by question", t(`select count(*) from unnest(string_to_array($$${qs.join("~")}$$, '~')) x where not exists (select 1 from "Faqs" f where lower(trim(f."Question")) = x)`));
zero("duplicate banner titles in target", t(`select count(*) from (select lower(trim("Title")) from "Banners" group by 1 having count(*)>1) q`));
zero("duplicate FAQ questions in target", t(`select count(*) from (select lower(trim("Question")) from "Faqs" group by 1 having count(*)>1) q`));

console.log("== integrity (whole target database)");
zero("orders pointing to a missing customer", t(`select count(*) from "Orders" o where o."UserId" is not null and not exists (select 1 from "Users" u where u."Id"=o."UserId")`));
zero("order items pointing to a missing order/product", t(`select count(*) from "OrderItems" i where not exists (select 1 from "Orders" o where o."Id"=i."OrderId") or not exists (select 1 from "Products" p where p."Id"=i."ProductId")`));
zero("payments pointing to a missing order", t(`select count(*) from "Payments" p where not exists (select 1 from "Orders" o where o."Id"=p."OrderId")`));
zero("tracking events pointing to a missing item", t(`select count(*) from "OrderItemTrackings" x where not exists (select 1 from "OrderItems" i where i."Id"=x."OrderItemId")`));
zero("addresses pointing to a missing customer", t(`select count(*) from "Addresses" a where not exists (select 1 from "Users" u where u."Id"=a."UserId")`));
zero("products without a category", t(`select count(*) from "Products" where "CategoryId" is null`));
zero("categories with a missing parent", t(`select count(*) from "Categories" c where c."ParentCategoryId" is not null and not exists (select 1 from "Categories" p where p."Id"=c."ParentCategoryId")`));
zero("product images or banners using an absolute legacy URL", t(`select (select count(*) from "ProductImages" where "ImageUrl" like 'http%') + (select count(*) from "Banners" where "ImageUrl" like 'http%')`));
zero("products with more than one primary image", t(`select count(*) from (select "ProductId" from "ProductImages" where "IsPrimary" group by 1 having count(*)>1) q`));
check("archive holds every legacy row (rows per source table)",
  l(`select string_agg(t||':'||c, ',' order by t) from (${["users", "admin_users", "addresses", "categories", "products", "product_image", "orders", "order_items", "order_item_tracking", "order_pickups", "payments", "refunds", "contacts", "coupons", "coupon_products", "coupon_categories", "banners", "faqs", "reviews", "states", "promo_offers", "payment_methods", "cart", "wishlist", "tickets", "ticket_messages"].map(x => `select '${x}' t, count(*) c from ${x}`).join(" union all ")}) q where c>0`),
  t(`select string_agg("SourceTable"||':'||c, ',' order by "SourceTable") from (select "SourceTable", count(*) c from "LegacyImportArchive" group by 1) q`));

console.log("== UAT-origin records that remain in the target (not compared)");
console.log("   staff accounts:", t(`select string_agg(regexp_replace("Email",'(.).*@','\\1***@')||' (role '||"Role"||')', ', ') from "Users" where "Role" in (2,3)`));
console.log("   banners not from legacy:", t(`select count(*) from "Banners" b where not exists (select 1 from "LegacyImportArchive" a where a."SourceTable"='banners' and lower(trim(a."Data"->>'title')) = lower(trim(b."Title")))`));
console.log("   FAQs not from legacy:", t(`select count(*) from "Faqs" f where not exists (select 1 from "LegacyImportArchive" a where a."SourceTable"='faqs' and lower(trim(a."Data"->>'question')) = lower(trim(f."Question")))`));
console.log("   products not from legacy:", t(`select count(*) from "Products" where "Id" <> all(${idList(ids.products)})`));
console.log("   orders not from legacy:", t(`select count(*) from "Orders" where "Id" <> all(${idList(ids.orders)})`));

console.log("== for the owner: legacy rows kept only in the archive");
console.log("   payments with no order (amount | status | razorpay payment id):");
for (const row of t(`select concat_ws(' | ', "Data"->>'amount', "Data"->>'status', left(coalesce("Data"->>'provider_payment_id',''),16)) from "LegacyImportArchive" a where a."SourceTable"='payments' and not exists (select 1 from "Payments" p where p."Id"::text=a."SourceId") order by 1`).split("\n")) console.log("     " + row);
console.log("   reviews not imported (older duplicate user+product):", t(`select count(*) from "LegacyImportArchive" a where a."SourceTable"='reviews' and not exists (select 1 from "Reviews" r where r."Id"::text=a."SourceId")`));
console.log("   legacy cart rows:", t(`select count(*) from "LegacyImportArchive" where "SourceTable"='cart'`));

console.log(`\nRECONCILIATION RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
