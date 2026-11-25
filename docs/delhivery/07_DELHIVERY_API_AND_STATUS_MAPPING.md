# 07 – Delhivery API Usage, Our API Endpoints and Status Mapping (PROPOSAL)
Date: 2026-11-09 · Based on `04_DELHIVERY_API_DISCOVERY.md` (official B2C docs read from the logged-in account). Nothing implemented; **no Delhivery call has been made**.
Where Stage 1 did not establish a fact it is marked **CONFIRM** and will not be coded from assumption.

## 1. Delhivery operations used in Stage 2
| Purpose | Documented call | Used in Stage 2 | Open points (CONFIRM) |
|---|---|---|---|
| Create shipment | `POST {base}/api/cmu/create.json`, header `Authorization: Token …`, body sample `format=json&data={"shipments":[{…}],"pickup_location":{"name":"…"}}` | yes (admin action) | exact success/failure response JSON, how the AWB is returned, error texts; whether `Content-Type` is form-encoded or JSON for this body |
| Track | `GET {base}/api/v1/packages/json/?waybill=…&ref_ids=…` (≤ 50 waybills per call) | yes (admin refresh + worker) | response JSON shape, scan fields, expected-delivery field, behaviour for unknown waybill/ref |
| Cancel shipment | `POST {base}/api/p/edit` `{"waybill":"…","cancellation":"true"}` | **designed, not exposed** in Stage 2 UI (only two admin actions requested); a cancelled order's shipment is cancelled manually in Delhivery One for now | — |
| Label | `GET {base}/api/p/packing_slip?wbns=…&pdf=true&pdf_size=A4\|4R` | not in Stage 2 scope | — |
| Bulk waybills / pickup / NDR / warehouse / rate / serviceability | documented | **not used** (out of scope; AWB is assigned by Delhivery at create – **CONFIRM** that leaving `waybill` empty assigns it) | — |
Base URL by mode: `test` → `https://staging-express.delhivery.com`, `live` → `https://track.delhivery.com`. Pickup location string: `Ganpati Herbal Ayurveda` (exact).

### 1.1 Create payload – mapping from our data (only documented field names)
| Delhivery field | Required (doc) | Our source |
|---|---|---|
| `name` | yes | `Orders.ShippingFullName` |
| `order` | yes | `Shipments.ClientOrderRef` (= `OrderNumber`) |
| `phone` | yes | `Orders.ShippingPhone` (normalised to 10 digits; refuse if invalid) |
| `add` | yes | `ShippingLine1` + `ShippingLine2` |
| `pin` | yes | `ShippingPostalCode` (6 digits) |
| `payment_mode` | yes | `Prepaid` (Razorpay, paid) or `COD` |
| `cod_amount` | COD | `Orders.TotalAmount` for COD; empty for prepaid |
| `city`, `state`, `country` | optional (recommended) | `ShippingCity`, `ShippingState`, `ShippingCountry` |
| `products_desc`, `quantity` | optional | item names joined (sanitised), total quantity |
| `total_amount` | optional | `Orders.TotalAmount` |
| `weight` (g) | optional | `Delhivery:DefaultWeightGrams` (config; products have no weight yet) |
| `shipping_mode` | optional | `Surface` (**CONFIRM** desired default) |
| `pickup_location.name` | yes | configuration `Ganpati Herbal Ayurveda` |
Not sent in Stage 2: dimensions (no data), `hsn_code`, `seller_*`, `return_*` (CONFIRM whether Delhivery uses the pickup location as the return address when omitted), `ewbn`, e-mail (the documented create parameter list has no consignee e-mail field – our e-mail stays in our own system). Text is sanitised: `& # % ; \` replaced (documented restriction).

## 2. Our API endpoints (follow existing conventions: `api/v1/[controller]`, `ApiResponse<T>` envelope, JWT, `[Authorize(Roles="SuperAdmin")]`)
| # | Method | Route | Auth | Purpose | Notes |
|---|---|---|---|---|---|
| 1 | GET | `/api/v1/shipments/order/{orderId}` | SuperAdmin | shipment summary + events for the admin order page | returns courier, AWB, mode, creation state, status, last event/check, expected date, tracking URL, last error (sanitised), events |
| 2 | POST | `/api/v1/shipments/order/{orderId}/create` | SuperAdmin | **Create / retry shipment** | eligibility + idempotency per `05_…` §6; returns the shipment or a precise refusal reason; refuses when Delhivery is not enabled/token missing/security gate closed; for an `UNKNOWN` row performs the reconciliation lookup first |
| 3 | POST | `/api/v1/shipments/order/{orderId}/refresh` | SuperAdmin | **Refresh tracking** | one tracking call, saves new events, updates status; never changes order data on failure |
| 4 | POST | `/api/v1/shipments/order/{orderId}/confirm-not-created` | SuperAdmin | resolve an `UNKNOWN` creation after the admin checked Delhivery One | audited; moves row to `FAILED` so retry is possible (needed only if reconciliation cannot decide) |
| 5 | GET | `/api/v1/shipments/delhivery/mode` | SuperAdmin | read mode (`test`/`live`), `testConfigured`, `liveConfigured` (booleans only – never the token), pickup location, `autoCreate`=false | mirrors `GET payments/razorpay/mode` |
| 6 | PUT | `/api/v1/shipments/delhivery/mode` | SuperAdmin | change mode | refuses `live` when `Delhivery__ApiToken` is absent; forces `delhivery_auto_create=false`; writes an `ActivityLogs` row (who, from → to, IP); Razorpay untouched |
| 7 | GET | `/api/v1/orders/{id}/tracking` | owner or SuperAdmin | customer tracking for the logged-in customer's own order | minimal DTO (below) |
| 8 | POST | `/api/v1/orders/track` | anonymous, rate limit `order-track` | **guest tracking**: body `{orderNumber, emailOrPhone}` | verified against `Orders.GuestEmail`/`GuestPhone` (case-insensitive e-mail; last 10 digits of phone); same generic answer for wrong number or wrong contact; orders placed by a logged-in member are **not** available to this anonymous lookup (members sign in and use endpoint 7) |
| 9 | POST | `/api/v1/shipments/webhook/delhivery` | disabled | designed only; returns 404 while `Delhivery:EnableWebhook=false` | not built in Stage 2; verification header/secret to be defined with Delhivery (`Delhivery__WebhookSecret`) |
Changed existing endpoints (security A1-A8, see `05_…`): `GET /orders/number/{n}` (restricted), `GET /orders/{id}`, `PATCH /orders/{id}/cancel`, `PATCH /orders/{id}/status`, `GET /orders/{id}/invoice`, `GET /returns`, `PATCH /returns/{id}/status`, `POST /returns`, `POST /orders` (validation + transaction; response unchanged).

### 2.1 Customer/guest tracking DTO (no personal data)
```
{ orderNumber, orderStatus, courierName, awb, shipmentStatus (customer label), shipmentStatusCode,
  lastUpdate, expectedDeliveryDate?, trackingUrl?,
  events: [ { time?, status, location?, description? } ]   // actual Delhivery scans, newest first
}
```
No name, phone, e-mail, address, payment data or internal ids. For orders without a shipment: `shipmentStatus = null` and the page shows only the order status ("Order Confirmed", etc.).

### 2.2 Admin shipment DTO
Adds: `id`, `mode`, `creationState`, `createAttempts`, `delhiveryStatus`, `delhiveryStatusType`, `lastCheckedAt`, `lastError`, `defaultWeightUsed`, `canCreate`, `cannotCreateReason`, `canRefresh`.

## 3. Eligibility rules (create)
| Check | Rule |
|---|---|
| Security gate | the Stage 2A fixes are deployed in this build (compile-time constant/feature flag) |
| Delhivery enabled for current mode | token for the current mode present |
| Order exists, not Cancelled / Returned | required |
| Prepaid | `PaymentMethod=Razorpay ∧ PaymentStatus=Paid ∧ Status=Confirmed` and a `Payments` row exists |
| COD | `PaymentMethod=COD ∧ Status=Confirmed` (admin approval) ; `cod_amount = TotalAmount` |
| Not unpaid/failed | Razorpay orders with `PaymentStatus` Pending/Failed refused |
| Address data | name, 10-digit phone, line1, city, state, 6-digit PIN present |
| No open shipment | enforced by `UX_Shipments_Order_Open` |
| Test mode | a test-mode shipment is refused when the API runs with `ASPNETCORE_ENVIRONMENT=Production` (setting `Delhivery:AllowTestModeInProduction`, default `false`), so a real customer order on sidham.in can never be used for a test shipment |

## 4. Status mapping (single class `DelhiveryStatusMapper`)
Input: `(StatusType, Status, ScanCode?)` taken from the scan. Never free-text matching of descriptions. Vocabulary source: Stage 1 webhook documentation (statuses pushed for forward, return and reverse shipments).
### 4.1 Forward and return flow
| Delhivery type / status | Customer category (display) | Final? | Confidence |
|---|---|---|---|
| UD / Manifested | **Shipment Created** | no | documented |
| UD / Not Picked | Shipment Created (pickup pending) | no | documented |
| UD / In Transit | **Picked Up** if no earlier in-transit scan exists and the shipment is still Created; otherwise **In Transit** | no | **CONFIRM** – needs real scan sequence/scan codes to tell first pickup from later hops |
| UD / Pending | In Transit (reached destination city, not yet dispatched) | no | documented |
| UD / Dispatched | **Out for Delivery** | no | documented |
| DL / Delivered | **Delivered** | **yes** | documented |
| RT / In Transit | **RTO / Returned – in transit** | no | documented |
| RT / Pending | RTO in transit (at origin-side DC) | no | documented |
| RT / Dispatched | RTO in transit | no | documented |
| DL / RTO | **RTO delivered (returned to origin)** | **yes** | documented |
| CN / Canceled, CN / Closed | **Cancelled** | **yes** | documented (cancel statuses; note a cancel in transit may show `In Transit`+`RT`, i.e. RTO) |
| Scans with NSL `EOD-*` (delivery attempt not completed) | shown as the raw status; category stays Out for Delivery/In Transit; a "Delivery attempt failed" label only after the NSL meaning is **CONFIRM**ed | no | **CONFIRM** (Stage 1 only lists EOD codes in the NDR rules) |
| Any other / unknown pair | **Needs review** (event stored with raw values; shipment category not changed; admin sees the raw status) | no | by design |
### 4.2 Reverse-shipment types (PP, PU, DL/DTO, CN reverse)
Out of scope for Stage 2 (no return logistics). Stored if received, mapped to **Needs review**, never shown as customer progress.
### 4.3 Order timeline shown to customers
`Order Confirmed` (from our order data) → then actual shipment categories above. Display categories are labels; the underlying Delhivery status, type, scan code, time and location are shown/stored exactly as received. No intermediate step is invented.
### 4.4 Ordering rules
1. The shipment summary is recomputed from the event with the newest `ScanTime`; an older event never overwrites a newer category.
2. Category rank for forward flow: Created < Picked Up < In Transit < Out for Delivery < Delivered; RTO_* and Cancelled are branches that win over forward statuses only when their scan is newer.
3. Delivered and RTO delivered/Cancelled set `IsFinal=true`; the poller never touches them again.
### 4.5 Hand-off to the order status (validated, single routine)
| Shipment category reached | Order status effect |
|---|---|
| Picked Up / In Transit / Out for Delivery | Confirmed → **Shipped** (sets `ShippedAt`; legacy "shipped" e-mail suppressed, shipment e-mail sent instead) |
| Delivered | Shipped → **Delivered** (sets `DeliveredAt`; legacy delivered e-mail suppressed; COD `PaymentStatus` **unchanged** – collection is recorded separately and is not part of Stage 2) |
| RTO in transit / RTO delivered | **no automatic change** (proposal awaiting your approval: possible refund/return decision belongs to an admin) – admin sees a banner |
| Cancelled (courier) | **no automatic change** to the order |
| Delivery attempt failed | no change; never cancels the order |
| Needs review | no change |

## 5. Customer notifications (Stage 2G)
Sent through the existing Gmail SMTP service, once per category, recorded in `Shipments.NotifiedStatuses` only after the send is reported successful: **Shipment created**, **Picked up / in transit** (one mail for the first of Picked Up/In Transit), **Out for delivery**, **Delivered**. Not sent: every poll, RTO, failures, internal API errors. Each mail shows order number, AWB, courier name (Delhivery) and the tracking link **only if** a real link exists; otherwise it points to our `/track-order` page. Guest orders use `Orders.GuestEmail`; members use the account e-mail (existing retrieval logic). Existing order/payment mails are unchanged.

## 6. Background tracking (Stage 2F)
`DelhiveryTrackingWorker : BackgroundService`, registered once; interval = `Delhivery:TrackingIntervalMinutes` (default 30; minimum enforced 5); each cycle: take `pg_try_advisory_lock` (no overlap, also across instances) → select up to `BatchSize` (default 50, the documented per-call maximum) rows `CreationState='CREATED' AND IsFinal=false AND NextCheckAt <= now` ordered by oldest check → **one** tracking call for the batch → persist events/statuses per shipment in its own transaction (one failure never blocks the others) → on timeout/5xx/429: exponential back-off on the affected shipments (`TrackFailureCount`, `NextCheckAt`), never a tight loop; permanent client errors (400/401/403) stop retrying for that cycle and surface in `LastError`. Documented rate limit 750 req/5 min/IP is far above usage. The worker does nothing when the current mode's token is missing, and never runs in test mode against a production database. It uses its own DB scope and cannot block API requests.
Webhook: designed only (`EnableWebhook=false`); Delhivery must enable it after you email their integration team (Stage 1 §6); no admin screen.

## 7. Items still requiring confirmation (summary)
1. Create/track/cancel **response JSON** and error shapes (read portal samples first; fixtures from real samples only).
2. Staging token existence/compatibility (no calls until confirmed).
3. `UD/In Transit` pickup-vs-transit distinction; meaning of `EOD-*` scan codes for failed attempts.
4. Whether leaving `waybill` empty assigns the AWB; default `shipping_mode`; return-address behaviour.
5. Expected delivery date field and public tracking URL availability.
6. Tracking "not found" semantics for reconciliation.
7. Timestamp time zone of scans.
