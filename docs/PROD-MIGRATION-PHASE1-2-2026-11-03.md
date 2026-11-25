# Sidham production migration - Phase 1 (backup) and Phase 2 (comparison)
Date: 2026-11-03. Server: 187.127.164.156. **Status: STOPPED before Phase 3 - decisions needed (see section 4).**

## 1. Phase 1 - Production backup: DONE and verified
Location on server: `/root/backups/prod-pre-migration-20261103-065448/` (mode 700, separate from `/root/sidham`).
Copy on your PC (data only): `D:\Backups\sidham-prod-pre-migration-20261103-065448\`.

| Item | File | Verified how |
|---|---|---|
| Database `public` (custom format) | `db/public.dump` | `pg_restore --list` OK; **restored into a throwaway container: all 27 tables, row counts identical to production** |
| Database `public` (plain SQL) | `db/public_plain.sql` | restored again into a second database, counts identical |
| All databases + roles | `db/ALL_DATABASES_full.sql`, `db/globals_roles.sql` | ends with the PostgreSQL completion marker |
| Uploaded images/assets | `files/uploads-volume.tar.gz` | 65 files in the archive = 65 files in the live volume |
| Application directory (frontend, backend, compose, nginx.conf, .env files) | `files/sidham-app-directory.tar.gz` | readable; compose, nginx.conf and all three .env files present |
| Config + SSL certificates | `config/` (compose, nginx.conf, .env copies, `letsencrypt.tar.gz`, cron, host state) | present and non-empty |
| Container definitions + images | `docker/` (`inspect-*.json`, `compose-resolved.yml`, `prod-images.tar`) | images reload; images also tagged `:pre-migration-20261103-065448` on the server |
| Integrity | `SHA256SUMS` | all server files match; the 23 files copied to the PC match too |

Row counts did not change while the dump ran (consistent snapshot). Production containers were never restarted or modified.
Not copied to the PC (server only): `docker/inspect-*.json` and `docker/prod-images.tar`.
Note: the backup contains secrets (.env files, certificate keys). Keep it private.

## 2. Production as found
- Stack: NestJS API (Sequelize) + two Next.js apps (storefront, admin) + PostgreSQL 18 + nginx container, all in `/root/sidham`, compose project `sidham`. Domains: sidham.in / www (storefront), api.sidham.in (API + `/uploads`), nexus.sidham.in (admin).
- Data (real): 14 users (bcrypt hashes), 1 sub-admin, 13 orders (26 Apr - 6 Aug 2026), 43 order items, 9 completed live Razorpay payments, 93 products, 54 categories, 56 product images, 8 addresses, 4 contact enquiries, 2 reviews, 2 coupons, 3 promo offers, 4 banners, 15 FAQs, 36 states, 21 Delhivery tracking rows (7 orders), 1 Delhivery pickup.
- Uploads volume `sidham_uploads`: 65 files, 8.8 MB.
- Scheduler: one cron job in the code, currently commented out. No host-level cron for the app.
- Firewall (ufw): **inactive**.

## 3. Phase 2 - UAT vs production
| Area | Production | UAT | Impact |
|---|---|---|---|
| Frontend | Next.js (server-rendered, SEO work done) | Angular 18 SPA, API URL hard-coded to `http://187.127.164.156:5001` | different URLs; SEO regression risk; needs a production build config |
| Backend | NestJS + Sequelize | ASP.NET Core 8 + EF Core | completely different codebase |
| Database | `public`, 27 snake_case tables | `ecommerce_db`, PascalCase tables | **no shared schema - data must be transformed, not copied** |
| Data volume | 93 products, 54 categories, 13 orders | 25 products, 4 categories, test orders | UAT data is test data |
| Shipping | Delhivery integration (shipments, tracking, pickups, webhook) | none | feature would be lost |
| Admin roles | `sub_admin` + master password | SuperAdmin only | permission model differs |
| Extras only in production | states list, promo offers, payment methods, support tickets, refund workflow | blog, quiz, consultation, referrals, returns, gallery, trust pages | feature sets differ both ways |
| Payment gateway | live Razorpay (`rzp_live_`) | test keys only; live not configured; refund + webhook are stubs | needs live keys + refund/webhook work |
| Email | pha***@gmail.com | sid***@gmail.com (different mailbox) | decide which sender |
| Passwords | bcrypt `$2b$` | BCrypt.Net (compatible) | existing customer logins could carry over |
| Images | stored as `https://api.sidham.in/uploads/...` | stored as `/uploads/...` | URLs + files must be migrated |
| HTTPS | nginx + Let's Encrypt, **certificate EXPIRED** | plain HTTP on IP:port | needs proxy + domains |

## 4. Critical findings (action needed)
1. **Production SSL certificate expired on 2026-10-21.** `https://sidham.in`, `api.` and `nexus.` all fail with a certificate-expired error (verified from outside). Cause: certbot uses the `standalone` method, which needs port 80, but the nginx container holds ports 80/443, so every automatic renewal fails. Customers are seeing browser warnings now. Not changed yet.
2. **UAT is a different application, not a newer build of production.** Replacing production with it would drop Delhivery shipping/tracking, sub-admin roles, 68 products and 50 categories unless they are rebuilt, and real customers, orders and payments would have to be migrated by a purpose-built, tested importer. No such importer exists.
3. Firewall is inactive on the production server.

## 5. Not done (by design)
Phase 3-6 not started: no maintenance mode, no replacement, no migrations, no production data changes, no smoke tests on production. Nothing on production was modified except creating the backup folder, 3 image tags and the two helper scripts `/root/prod-backup.sh`, `/root/prod-backup-verify.sh`.

## 6. Rollback readiness
Production is untouched and running (all containers "Up 2 weeks"). Everything needed to rebuild it exists in the verified backup.
