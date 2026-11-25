# 04 – Delhivery API Discovery (Stage 1)
Date: 2026-11-09 · Source: the user's own logged-in Delhivery One account (Chrome session) and the official Delhivery Developer Portal reached from it: `https://one.delhivery.com/developer-portal/documents/b2c/`.
**No secrets are recorded here.** The existing API token was visible only as masked dots; I did **not** click View/Copy, did **not** generate or rotate a token (generating a new token immediately invalidates the old one), did **not** run "Test our APIs"/"Execute API", did **not** create any shipment, pickup or warehouse, and did **not** log out. All endpoint information below is copied from the documentation pages, not guessed.

## 1. Account findings
| Item | Finding |
|---|---|
| Platform | Delhivery One (B2C "Domestic" account); account verified |
| Account / client name | Ganpati Herbal Ayurveda (Delhivery One client id shown in the header as `596db0-GANPATIHERBALAYURVED-do`) |
| Wallet | prepaid balance **₹402.94**, banner "Low balance: recharge to avoid disruption" – shipment creation/COD handling is charged against it. Live shipments consume real money. |
| Orders on this account | dashboard onboarding still shows "Connect channel or create order" (no store connected, no first order) – no API integration is active yet |
| Pickup locations (Settings → Pickup Locations → Domestic) | **one**: `Ganpati Herbal Ayurveda`, status Active, Kurukshetra, Haryana (created 7 Nov 2025). API field `pickup_location` must match the registered name **exactly (case and spaces sensitive)** |
| API token | one live token exists (masked). Settings → "API and MCP Setup" says: generating a new token stops the old one at once; a new token is visible for 5 minutes only. The user must put the token into a server environment variable themselves (see §7); Claude must never see or store it |
| Other account features seen | Delhivery One MCP (for coding agents), Rate calculator & serviceability, Shipping Label Config, Users, Tax Configuration |
| Account type for APIs | B2C documentation applies (parcel shipping); B2B (LTL cargo) is a separate product and not used |

## 2. Environments (from every B2C doc page)
| Environment | Base URL |
|---|---|
| **Test / staging** | `https://staging-express.delhivery.com` |
| **Production** | `https://track.delhivery.com` |
Open question (must be confirmed with the Delhivery account POC / support before Stage 4): the docs do not say whether the **production token also works on staging** or a separate staging token must be requested. Until a staging token exists, no API call may be made from tests, and shipment creation stays disabled. UAT must not use the production token against the production URL for anything that creates data.
Rate limits are documented **per IP per 5 minutes (production)** – see §4.

## 3. Authentication (documented)
HTTP header `Authorization: Token <API token>` on every call (and `Accept`/`Content-Type: application/json`). Exception: the bulk waybill sample passes the token as a `token` query parameter on staging (documentation sample `…/waybill/api/bulk/json/?token=…&count=…`). The shipment-create endpoint uses `Content-Type: application/json` in the header but the sample body is form-style `format=json&data={…}` (see §4.2). The token is account-scoped; there is no OAuth/refresh flow in these pages.

## 4. API operations (official B2C documentation)
| # | Operation | Method + path (test base `staging-express…`, production base `track…`) | Mandatory inputs (as documented) | Documented rate limit (prod, req/5 min/IP) |
|---|---|---|---|---|
| 4.1 | **Pincode serviceability** | `GET /api/dc/fetch/serviceability/pincode?product_type=…&pincode=…` | `pincode` (int, one per call), `product_type` (documented as "pass Heavy") | 3000 |
| 4.2 | **Shipment creation (manifest)** – forward, reverse and replacement | `POST /api/cmu/create.json` | per shipment: `name`, `order` (unique order id), `phone`, `add`, `pin`, `payment_mode` (`Prepaid`/`COD`/`Pickup`/`REPL`), plus `pickup_location` object `{ "name": "<registered warehouse>" }` | 20000 |
| 4.3 | **Fetch waybill (AWB) in bulk** | `GET /waybill/api/bulk/json/?count=N` (token as query parameter per sample) | `count` (≤ 10 000) | 5; max 50 000 waybills / 5 min, exceeding throttles the IP for 1 minute |
| 4.4 | **Shipment tracking** | `GET /api/v1/packages/json/?waybill=…&ref_ids=…` | `waybill` (up to 50 comma-separated); `ref_ids` = order id (optional) | 750 |
| 4.5 | **Shipment cancellation** | `POST /api/p/edit` body `{"waybill":"…","cancellation":"true"}` | `waybill`, `cancellation` | 12200 |
| 4.6 | **Shipment update** | (listed as "Shipment Updation API"; **not yet read** – read in Stage 4 before use) | – | – |
| 4.7 | **Shipping label** | `GET /api/p/packing_slip?wbns=<waybill>&pdf=true&pdf_size=A4|4R` (default A4; `pdf=false` returns JSON for a custom label) | `waybill` | 3000 |
| 4.8 | **Pickup request** | `POST /fm/request/new/` body `{"pickup_time":"hh:mm:ss","pickup_date":"YYYY-MM-DD","pickup_location":"<name>","expected_package_count":N}` | all four fields | 4000 |
| 4.9 | **NDR action** | `POST /api/p/update` body `{"data":[{"waybill":"…","act":"RE-ATTEMPT"|"PICKUP_RESCHEDULE"}]}` (asynchronous – returns a UPL id; a separate "GET NDR Status" API exists, not read) | `waybill`, `act` | NA |
| 4.10 | Calculate shipping cost, Warehouse creation/updation, E-waybill, Download document, RVP QC 3.0 | listed in the portal; **not yet read** | – | – |
| 4.11 | Webhooks | see §6 | – | – |
Not documented on the pages read: a manifest/"manifest generation" endpoint, a separate pickup-location lookup endpoint.

### 4.2 Shipment creation – documented details
- One shipment = one waybill (single piece) – "Order ID must be unique for each new order". Multi-piece (MPS) needs a waybill per box passed explicitly.
- Optional but recommended: `city`, `state`, `country`, `weight` (grams), `shipment_length/width/height` (cm), `products_desc`, `quantity`, `total_amount`, `cod_amount` (COD), `hsn_code`, `seller_name`, `seller_add`, `seller_inv`, `return_*` fields, `shipping_mode` (`Surface`/`Express`), `transport_speed` (`D` standard / `F` next-day), `address_type`, `fragile_shipment`, `dangerous_good`, `plastic_packaging`, `ewbn` (e-waybill for ≥ ₹50k), `waybill`.
- The JSON body **must not contain `& # % ; \`** – use URL-encoded payloads. (Our address/product text must be sanitised/encoded accordingly.)
- Payment mode drives behaviour: `Prepaid`/`COD` forward; `Pickup` reverse (customer address becomes the pickup address, `return_*` the delivery address); `REPL` replacement.
- AWB: the waybill may be supplied from the pre-fetched bulk list (4.3) or left empty to be assigned. Delhivery notes bulk waybills are generated in batches of 25 and may error if used immediately after fetching – store and use later.
- **Response structure and error codes are not shown in the captured documentation text** (only request samples). They must be captured from the official response samples in Stage 4 (read the portal's response/“Responses” tabs, or the first staging call) – **no field mapping will be implemented from assumption.**

### 4.4 Tracking – documented details
Input: waybill(s) or order id; returns "all the details of the scans applied". The documented **status / status-type vocabulary** (from the webhook page) is the only authoritative status list found so far – see §5. The exact JSON shape of `packages/json` is **not** in the captured text (Stage 4/6: capture from the portal sample or staging).

### 4.5 Cancellation rules (documented)
Allowed statuses – forward (COD/Prepaid) and REPL: **Manifested, In Transit, Pending**; reverse (Pickup): **Scheduled**. Effects: cancelled before pickup → status stays *Manifested*, type `UD`; cancelled while In Transit/Pending → stays *In Transit*, type `RT` (return to origin); cancelled scheduled reverse → *Canceled*, type `CN`. (So "cancel" is not always final – the internal model must handle the RT outcome.)

### 4.8 Pickup – documented details
A pickup request is per **warehouse**, not per waybill; one request covers all waybills at that location; a second request the same day only after the first is closed; create it when the shipment is packed and ready. The API is optional (pickups can be raised in the One panel; auto-pickup can be enabled via the account POC).

### 4.9 NDR rules (documented)
`RE-ATTEMPT` allowed when current NSL code ∈ {EOD-74, EOD-15, EOD-104, EOD-43, EOD-86, EOD-11, EOD-69, EOD-6} and attempt count is 1 or 2, recommended after 9 PM; `PICKUP_RESCHEDULE` when NSL ∈ {EOD-777, EOD-21}, non-OTP-cancelled, attempt count 1 or 2.

## 5. Status vocabulary (documented, webhook page) – basis for the internal mapping
Forward: `UD/Manifested`, `UD/Not Picked`, `UD/In Transit`, `UD/Pending`, `UD/Dispatched`, `DL/Delivered`.
Return (RTO): `RT/In Transit`, `RT/Pending`, `RT/Dispatched`, `DL/RTO`.
Reverse: `PP/Open`, `PP/Scheduled`, `PP/Dispatched`, `PU/In Transit`, `PU/Pending`, `PU/Dispatched`, `DL/DTO`, `CN/Canceled`, `CN/Closed`.
Mapping must key on **(status type, status)** pairs plus the NSL/scan code from the tracking payload – not free text. Notable gaps versus the internal list requested: Delhivery documents no separate `PICKED_UP` (inferred from `UD/In Transit` after `Manifested`/`Not Picked`), `OUT_FOR_DELIVERY` = `UD/Dispatched`, `FAILED_ATTEMPT/NDR` comes from NSL `EOD-*` codes in scan data, `RTO_INITIATED` = `RT/In Transit`, `RTO_DELIVERED` = `DL/RTO`. These mappings are **to be confirmed against real scan payloads** in Stage 6.

## 6. Webhooks (documented)
- Two **separate** webhooks exist: **Scan Push** (shipment status) and **Document/POD Push** (plus Sorter-image and QC-image webhooks); they cannot share one endpoint.
- **Not self-service:** to enable one, the client fills Delhivery's *Webhook Requirement Document* (account name, endpoint URL, **authorization details**) and emails it to `lastmile-integration@delhivery.com` with the account POC in copy; Delhivery tests it and releases it to production.
- All statuses applied to an AWB are pushed in real time as standard JSON (custom payload mapping can be requested).
- **The verification mechanism is whatever the client specifies in the requirement document** (there is no Delhivery-defined signature in the pages read). Plan: ask Delhivery to send a shared secret in an `Authorization`/custom header and restrict by source IP if they publish a list; verify in constant time.
- Consequence: webhooks cannot be enabled by us alone, and not before the public endpoint exists on a reachable host. **Polling the tracking API is the primary mechanism for UAT and the first release**; webhook support is built behind `Delhivery:EnableWebhook` and activated after Delhivery enables it.

## 7. Configuration plan (no values stored here)
```
Delhivery:
  Mode            test | live      (DB-managed flag, see below; default test)
  BaseUrlTest     https://staging-express.delhivery.com
  BaseUrlLive     https://track.delhivery.com
  ApiToken        environment variable only  (Delhivery__ApiToken)  – never in files/DB/frontend
  ApiTokenTest    environment variable only  (Delhivery__ApiTokenTest) – once Delhivery issues one
  PickupLocation  Ganpati Herbal Ayurveda   (must equal the registered name)
  DefaultWeightGrams, AutoCreateShipment=false, TrackingIntervalMinutes, EnableWebhook=false
  WebhookSecret   environment variable only
```
**Test/Live flag managed in the database (new requirement from the user, 2026-11-09):** mirrors the existing Razorpay switch. A `WebsiteSettings` row with key `delhivery_mode` (`test` default | `live`) is read at runtime by `DelhiveryService` to choose base URL and token; changed only by SuperAdmin from Admin → Settings → a new "Shipping (Delhivery)" tab; every change is written to an audit row. The existing `razorpay_mode` row/switch stays as the payment flag (already DB-managed, already in production code, default test). A safety rule: switching Delhivery to `live` is refused unless a live token is configured, and `AutoCreateShipment` is forced off when mode changes.

## 8. Error handling / retry – what the docs give
Not enumerated in the captured text: no error-code table found yet. Documented behaviours usable now: IP throttling for 1 minute on waybill over-fetch; NDR async via UPL id; cancel allowed only on listed statuses. HTTP error/response bodies must be recorded from real staging responses and stored in `CourierApiLogs` before building the retry classifier ("stop retrying permanently invalid requests" needs the documented error semantics).

## 9. Testing instructions (to be executed only after approval)
1. Confirm with Delhivery whether a staging token exists (ask the account POC; or check "Test our APIs" without executing). The user provides it via an environment variable on the UAT/dev machine only.
2. Run read-only calls first: pincode serviceability, tracking of a non-existent waybill.
3. Create a staging shipment for a **fake** order number prefixed `TEST-`; fetch label; cancel it. Never use a real customer's order or the production URL.
4. Webhook: send sample payloads to the local endpoint from a script (no Delhivery involvement) until Delhivery enables the real one.

## 10. Open items before Stage 4
| # | Item | Needed from |
|---|---|---|
| 1 | Staging token / whether staging works with the live token | Delhivery POC / user |
| 2 | Read the "Shipment Updation", "Calculate Shipping Cost", "Client Warehouse Creation/Updation", "E-waybill", "Download Document" and "RVP QC 3.0" pages (no response samples captured yet) | Claude, Stage 4 |
| 3 | Real response JSON samples + error codes for create / tracking / cancel / label | Claude from portal samples + staging |
| 4 | Pincode API: documentation says `product_type=Heavy`; confirm the correct parameter for this B2C Express account before use (do not assume) | Delhivery / staging test |
| 5 | Wallet recharge policy (balance ₹402.94, low) before any live shipments | User |
| 6 | Webhook requirement document to email to Delhivery (needs a public HTTPS URL, header/secret) | User + Claude |
