# Sidham - cutover plan: UAT application + UAT database become production

Target end state (nothing else stays running): **Angular frontend + .NET API + the existing UAT PostgreSQL database (`ecommerce_db`, same data volume) + nginx on sidham.in / api.sidham.in / nexus.sidham.in with valid TLS.**
The old NestJS/Next.js production stack and the UAT app containers are retired only after you approve, once the new site is verified. The verified old-production backup stays untouched.

Written 2026-11-03. Server 187.127.164.156. Every step names who must approve it.

---
## 0. Facts confirmed (read-only)
| | |
|---|---|
| Target database | `ecommerce_db`, PostgreSQL 18.4, container `sidham-uat-postgres-uat-1`, volume `sidham-uat_pgdata-uat`, schema `public`, 39 tables, 13 MB, host `postgres-uat:5432`, user `postgres` |
| UAT data today | 4 users (2 super admins, 2 test customers), 4 test orders, 9 carts, 25 products (identical to production except stock on 4), 4 empty categories, 5 banners, 16 FAQs, 2 blog posts, 8 testimonials, 6 static pages, ~19.8k product views |
| UAT-only things to keep | banners (4 are the same as production + 1 extra), FAQs (15 same + 1 test), blog, gallery, testimonials, static/trust pages, quizzes, site settings |
| Old production | DB `public` (27 tables): 14 users, 1 sub-admin, 13 orders, 9 payments, 93 products, 54 categories, 4 contacts, 65 uploaded files |
| Backups that exist | old production: `/root/backups/prod-pre-migration-20261103-065448/` (+ copy in `D:\Backups\...`). UAT database before migration: `/root/sidham-uat/backups/uat_ecommerce_db_before_migration_20261103-072150.dump` (+ copy in `D:\Backups\uat-db\`) |

## 1. Rehearsal result (done, on a disposable copy of the real UAT database)
Pipeline: restore UAT dump -> start new app (adds new tables/columns) -> `cleanup-uat-test-data.sql` -> `legacy-import.sql` -> `legacy-reconcile.js`.
**45 of 45 reconciliation checks pass**, also on a second run (idempotent). The merged app serves 93 products (67 with images), 54 categories, 13 orders (2,284.05 total) in the admin panel, the merged super-admin account works and no errors were logged.
What the merge does: legacy accounts keep their IDs and bcrypt hashes; the one account present on both sides (Divyansh) keeps the UAT super-admin role/password and receives his old order and address; shared products take production's real price/stock/text; UAT test orders, carts, 2 test customers, 4 empty categories, 1 test FAQ and 1 test message are removed (dry-run list is printed first); 6 captured payments without an order and 1 duplicate review stay in `LegacyImportArchive`.

## 2. GATES - cutover cannot start until every gate is green
| # | Gate | Status (2026-11-03) |
|---|---|---|
| G1 | Valid SSL on all three domains | **Open** - blocked on permission to stop nginx / edit certbot on the server (see step 1 below) |
| G2 | Delhivery shipping + tracking in the new API/admin (7 of 13 old orders have courier tracking) | **Not built** |
| G3 | Sub-admin role with permissions in API + admin panel (the old system's only back-office user is a sub-admin) | **Not built** (role + table column exist) |
| G4 | Razorpay webhook handling and refunds (currently stubs) | **Not built** |
| G5 | Admin screens + API for states, promo offers, payment options (tables are imported) | **Not built** |
| G6 | Production config: live Razorpay, SMTP, JWT, CORS, uploads volume, logging | Files prepared (`deploy/`); values to be filled on the server |
| G7 | Full functional test (the Phase 4 list) executed on a production-like stack with the migrated data, results recorded | Not started |
| G8 | Owner decisions: 6 payments without orders (4,936.98 INR), 10 COD orders' payment status, who the cutover super admin is | **Open** |
| G9 | SEO: sitemap.xml, robots.txt, per-page meta, redirects (redirects prepared in nginx); server-side rendering is a recommendation, not yet done | Partly |
| G10 | Rotate secrets that were exposed in the repo/UAT: DB password `uat_pg_pass_2024`, JWT key, old Gmail app password | Planned in step 5 |

## 3. Production-readiness changes already made in the code (this session)
- `environment.prod.ts` points at `https://api.sidham.in`; the Angular `production` build now actually uses it (it previously had **no** file replacement and would have shipped `localhost`). Verified: the production bundle contains no UAT address, no localhost, no test key.
- 27 hard-coded `http://187.127.164.156:5001/uploads/...` image URLs replaced (would have been blocked as mixed content on HTTPS and broken once UAT is gone); admin "preview" links no longer point at `localhost:4200`; SEO data used a wrong domain (`sidhampharmacy.com`) -> `sidham.in`.
- API trusts `X-Forwarded-For/Proto` so per-IP rate limits and HTTPS detection work behind nginx.
- New tables/columns for the old system's data are created automatically on first start.
- Importer, cleanup and reconciliation scripts in `backend/EcommerceApp/Migration/`.
- `deploy/`: production compose, nginx (HTTPS, security headers, ACME webroot, 301 redirects from the old Next.js URLs incl. a generated 93-entry product map), maintenance page, env template.

## 4. Cutover procedure (after the gates are green)
Maintenance window: low-traffic hour, about 30-45 minutes of "back shortly" page. **Needs your explicit go-ahead for the start time.**

1. **SSL first (can be done today, independent of everything else) - approval: you.**
   `sed -i '/^\[renewalparams\]/a pre_hook = docker stop sidham-nginx-1\npost_hook = docker start sidham-nginx-1' /etc/letsencrypt/renewal/sidham.in.conf && certbot renew --cert-name sidham.in && docker start sidham-nginx-1` (about 30 seconds of downtime of the OLD site). Verify the three domains externally. Later (step 9) switch the renewal to `webroot`, which never needs a stop.
2. **Final backups (read-only on the data):** old production (`/root/backups/prod-pre-cutover-<ts>/` using the same verified script `/root/prod-backup.sh` + `prod-backup-verify.sh`), and the UAT database dump again. Copy both to `D:\Backups`. Gate: both verified.
3. **Maintenance mode + stop writes:** start the proxy with `nginx/maintenance.conf`, stop `sidham-backend-1`, `sidham-user-1`, `sidham-admin-1` (old app) so no new old-system orders can arrive. Old DB container keeps running (read-only use).
4. **Take the old data at its final state:** `pg_dump` the old `public` database again -> restore into a scratch database inside the UAT Postgres container (`legacy_src`) - *not* a permanent database; it is dropped after the import.
5. **Prepare the database:** rotate the DB password (`ALTER USER postgres PASSWORD '<new>'`), start the NEW api once against `ecommerce_db` so the new tables exist, run `cleanup-uat-test-data.sql` (dry run -> **you approve the printed list** -> `-v apply=1`), run `legacy-import.sql`, run `legacy-reconcile.js` against the scratch source. **Stop if any check fails.** Drop `legacy_src`.
6. **Uploads:** copy old `sidham_uploads` (65 files) and the UAT upload folder (101 files, currently inside the UAT container, not a volume) into the new `uploads` volume; compare file lists; confirm every `ProductImages`/`Banners` URL resolves to an existing file.
7. **Configure:** create `/root/sidham-production/.env.production` from `env.production.example` using the live Razorpay/SMTP/Delhivery values read from the old containers (never printed). Build images: api (`backend/Dockerfile`), web (`--build-arg BUILD_CONFIG=production`). Regenerate `old-product-redirects.conf` from the final products table.
8. **Start the new stack** (`docker compose --env-file .env.production -f docker-compose.production.yml up -d`) with the old proxy stopped (ports 80/443 move to the new proxy; the old app containers stay stopped, not deleted = rollback). Same Postgres volume - the database is never recreated.
9. **Certificates without downtime in future:** `certbot certonly --webroot -w /root/sidham-production/certbot-www --cert-name sidham.in --force-renewal` once, then `certbot renew --dry-run` must pass with nginx running.
10. **Smoke test (no real money):** the Phase 4/5 checklists on https://sidham.in: pages, search, login (a migrated customer, via the reset-code flow), cart, checkout in **COD only**, the contact form + e-mail, admin login, product/stock edit, order list (13 migrated orders), image loading, HTTPS redirect, redirects from old URLs. Payment gateway: only a non-financial check - the API creating an *unpaid* live Razorpay order (confirms the live keys); **no card payment without your approval**. Delete/void any test order created, using the admin cancel flow.
11. **Open the site** (remove maintenance) only when 10 is green. Watch logs 24 h (`/app/logs`, `docker logs`, 5xx rate, order and contact submissions, e-mail delivery).

## 5. Rollback (kept ready until you accept the new production)
- Before DNS/ports are switched nothing is lost: restart the old containers (`docker start sidham-backend-1 sidham-user-1 sidham-admin-1 sidham-nginx-1`) - the old database was never modified.
- After the new stack took orders: do **not** restore an old database over the live one. Instead: stop the new proxy, start the old stack (old customers/orders as of the freeze), and export orders created in the new system from `ecommerce_db` (it is a separate database) so none are lost; fix and retry.
- The UAT database pre-migration dump allows undoing the merge itself (restore into a scratch DB, then compare) if only the merge is at fault.

## 6. Retirement (Phase 6) - ONLY after you accept the new production in writing
Remove: old stack containers/images/volumes (`sidham-*-1`, `sidham_pgdata` after one more verified copy exists), UAT app containers (`sidham-uat-backend-uat-1`, `sidham-uat-frontend-uat-1`, the `*-OLD-*` containers), UAT images and ports 3100/5001, `/root/sidham-uat` build folders and the test `.env.uat`. **Keep:** the `ecommerce_db` volume (now production), every backup, the rollback images. Nothing shared or unrelated on the server is touched. Each deletion is listed and needs your approval first.

## 7. Approvals I will wait for
(a) SSL renewal now, (b) approval of the UAT cleanup list, (c) the owner decisions in G8, (d) cutover start time, (e) any real-payment test, (f) final acceptance, (g) the list of things to delete in step 6.
