# Stage 2.4 – Automated Order Fulfilment and Delhivery Integration

Date: 2026-11-09 · Scope: local development and the UAT code base only. **Nothing was deployed, no production API was called, no production database was touched, no staging shipment was created, Razorpay and payment code are unchanged.**

## 1. Result in one paragraph

An administrator now only **approves** (or rejects) an eligible order. After approval a background worker creates the Delhivery shipment, stores the AWB, tracks the parcel, moves the order to Shipped/Delivered and e-mails the customer – with no manual shipping step. Anything unusual (refusal, ambiguous answer, return, unknown status) goes to an exception queue instead of being guessed. There is no manual "Create shipment" button or endpoint. The default mode is **test**; the whole workflow pauses itself if test mode is ever found on a Production host.

## 2. What was and was not real

| | Status |
|---|---|
| Parsers and status handling are built on the four **real staging responses** captured on 2026-11-09 (create success, create failure, tracking, unknown waybill) | Real fixtures, used by tests |
| Every automated test talks to a **scripted fake HTTP handler**; no test contacts Delhivery | Mocked |
| The workflow has **never been run against Delhivery staging end to end** | Not done (no additional staging shipments were created, as instructed) |
| Reconciliation lookup by order reference only (`ref_ids` without a waybill) | **Request/response shape NOT verified** (see §10) |

## 3. Architecture

```
Admin approves ──► OrderFulfilments (APPROVED) ──► FulfilmentWorker (30 s tick + wake-up on approval, advisory lock)
                                                       │
   phase 1 create  ── claim row (atomic UPDATE, lease) ── save Shipment IN_FLIGHT ── POST create.json
                      success → CREATED + AWB · refused → FAILED/exception · timeout/5xx/unreadable → UNKNOWN
   phase 2 reconcile ─ UNKNOWN shipments looked up by order reference; AWB adopted if found; never re-created
   phase 3 track     ─ ≤50 AWBs per request, events stored once (hash), status moves forward only, order status follows
   phase 4 notify    ─ one e-mail per stage, recorded before sending, withdrawn if the send fails
```

New code: `Services/Fulfilment/{FulfilmentProcessor, FulfilmentService, FulfilmentWorker, FulfilmentSignal, FulfilmentOptions}.cs`, `Controllers/v1/FulfilmentController.cs`, `Entities/OrderFulfilment.cs`. The Delhivery client (`IDelhiveryClient`) is the existing typed client, extended with the confirmed response shapes and `TrackByReferenceAsync`.

## 4. Workflow

1. **Eligibility** (checked when listing and again at approval and at creation time): order Pending/Confirmed; online orders only if `PaymentStatus = Paid` (an unpaid online order is never dispatched and never appears in the queue); COD total > 0; valid name, address, 10-digit phone and 6-digit PIN (same validator that builds the Delhivery request); products exist and are active.
2. **Approve / reject** (SuperAdmin only): creates the single `OrderFulfilments` row (unique per order → duplicate or concurrent approval returns 409; tested with 5 parallel approvals → exactly 1). Records user, time, IP, user agent in `ActivityLogs`. A Pending COD order becomes Confirmed. Reject requires a reason and is final.
3. **Creation** – see §7. The pickup location is chosen **per environment**: `GANPATIHERBAL SURFACE` for test, `Ganpati Herbal Ayurveda` for live (`Delhivery:PickupLocationTest/Live`).
4. **Tracking** – statuses come from the existing mapper (`UD Manifested → CREATED`, `In Transit → IN_TRANSIT`, `Dispatched → OUT_FOR_DELIVERY`, `DL Delivered → DELIVERED`, `RT* → RTO`, unknown → exception). Order: IN_TRANSIT/OUT_FOR_DELIVERY → Shipped, DELIVERED → Delivered (+ fulfilment COMPLETED). Delivered/RTO-delivered/cancelled are final: polling stops.
5. **Exceptions** (fulfilment state `EXCEPTION`, shown in the admin queue): creation refused by Delhivery, invalid data, retries exhausted, reconciliation unable to confirm, unrecognised courier status, RTO/cancelled shipment, repeated tracking failure.

## 5. Database changes (migration `20261109110435_AddFulfilment`, **local only**)

* New table `OrderFulfilments` (state check constraint, unique index on `OrderId`, FK `ON DELETE RESTRICT`, index on `(State, NextAttemptAt)`).
* Three additive columns on `Shipments`: `ReconcileAttempts`, `NotifyFailures`, `NextNotifyAt`.
* No existing column or table is changed or dropped. The EF-generated migration needed no hand-trimming. Reviewed SQL: `evidence-stage-2-4/AddFulfilment.reviewed.sql`.
* Verified on a **disposable local database restored from the saved UAT backup** (`uat_ecommerce_db_before_migration_20261103-072150.dump`): the Stage 2.2 script and then this script applied with no error; history shows both migrations; `Orders` still has its 4 rows; database dropped afterwards (`evidence-stage-2-4/migration-check.txt`).

## 6. APIs (all SuperAdmin unless noted)

| Endpoint | Purpose |
|---|---|
| `GET fulfilment/dashboard` | counts: awaiting approval, approved awaiting shipment, creation failures, in transit, delivered, exceptions + Delhivery mode |
| `GET fulfilment/queue/{kind}?page&pageSize` | `awaiting-approval · awaiting-shipment · creation-failures · in-transit · delivered · exceptions` |
| `POST fulfilment/orders/{id}/approve` · `/reject {reason}` | the only dispatch decision |
| `POST fulfilment/orders/{id}/retry` | exception → try creation again (new reference `…-R2`); refused if a shipment already exists |
| `POST fulfilment/orders/{id}/resolve {note}` | mark a tracking exception reviewed |
| `GET fulfilment/orders/{id}/shipment` | admin view: AWB, status, history, fulfilment state, last error |
| `GET orders/{id}/shipment` (customer/admin) | owner or admin only, others get 404; customers see courier, AWB, status, timeline and an expected date **only if Delhivery supplied one**, never internal fields |

Not present on purpose: any endpoint that creates a shipment by hand.

## 7. Retry, idempotency and reconciliation strategy

* **Claim**: `UPDATE … SET State='CREATING', LeaseUntil=… WHERE State='APPROVED'` – two workers cannot both claim a row. A PostgreSQL advisory lock additionally lets only one app instance run the phases.
* **Reserve before send**: the `Shipments` row (`IN_FLIGHT`) is saved *before* Delhivery is called; the unique index `UX_Shipments_Order_Open` makes a second open shipment impossible even under a bug or race. Reference per attempt: order number, then `-R2`, `-R3` (unique per mode).
* **Outcome rules** (from the client's classification): confirmed success → CREATED; confirmed refusal (`success:false` + `status:"Fail"`), 4xx, 401/403 → FAILED and straight to the exception queue; 429/not sent → FAILED, automatic retry with back-off, max 3 attempts, then exception; **timeout, network failure, 5xx, unreadable or unrecognised 2xx → UNKNOWN**.
* **UNKNOWN is never resent.** Reconciliation looks the order reference up; a result whose `ReferenceNo` matches ours with an AWB is adopted. "Not found" or an unreadable answer is *not* treated as proof of absence; after 6 checks (growing delay) the order moves to the exception queue with the reference to look up in the Delhivery portal. Only an administrator's **Retry** closes the ambiguous attempt.
* **Restart**: all state is in PostgreSQL. A `CREATING` row whose lease expired with no request prepared returns to APPROVED; one with an `IN_FLIGHT` shipment becomes UNKNOWN (reconcile, never resend). Both tested.
* **Tracking**: failures back off (up to 6 h) and are counted; after 10 failures the order goes to the exception queue.
* **Notifications**: category recorded before sending (a crash loses at most one e-mail rather than sending twice); a failed send withdraws it and retries with back-off (max 5).

## 8. Security

* Tokens: unchanged – server environment variables only, never in DB, logs, responses or frontend; the client keeps its host guard (test → staging only, live → production only), no redirects, one log line per call without body/URL query/token.
* Test mode is the default; fail-closed mode handling retained. **If the mode is `test` and `ASPNETCORE_ENVIRONMENT=Production`, the worker does nothing** unless `Delhivery:Fulfilment:AllowTestModeInProduction` is set.
* Approve, reject, retry, resolve and all queues: `[Authorize(Roles="SuperAdmin")]` (tested: anonymous 401, customer 403). Customer shipment view enforces ownership with the same rule as orders.
* Audit trail in `ActivityLogs`: `Fulfilment.Approved`, `.Rejected`, `.Retry`, `.Resolved`, `.Exception`.
* Response text from Delhivery is capped, stripped of control characters and stored only as short reasons; customer data and raw responses are not logged.

## 9. Tests

`dotnet test`: **538 passed, 0 failed** (480 before this stage). New: 18 fixture parser tests, 25 workflow tests, 7 API tests, 8 e-mail/config tests – covering approval (permissions, duplicate, concurrent), automatic creation success/refusal using the real fixtures, AWB persistence, staging pickup location, retry limits, duplicate prevention (6 parallel runs → 1 request), timeout → UNKNOWN → no resend, reconciliation adopt / cannot-confirm, restart recovery (both lease cases), tracking updates, event de-duplication, no backward movement, automatic order status, final-state stop, unknown status and RTO → exception, e-mail idempotency and retry, customer ownership, admin-only access, absence of a manual create endpoint, migration applied from the real script. `dotnet build` (0 errors), `ng build` succeeded (one pre-existing CSS warning). A diff against the pre-stage snapshot shows only the files listed in this stage; `logs/` and `wwwroot/uploads` appear because test runs start the API locally.

## 10. Known gaps – please read before activation

1. **Reference-only tracking lookup is unverified.** I could not capture it (Delhivery portal session expired and I do not enter credentials). Until a read-only staging lookup of the existing `TEST-STG-0001` is captured, reconciliation can fail to find a shipment that exists; the design is fail-safe (it ends in the exception queue, never a duplicate), but ambiguous creations would need manual review.
2. **Create request content type** (`application/json` with a `format=json&data=` body) is the form the portal's own tool used; only the first approved staging call will prove it.
3. Scan times carry no time zone; they are read as India time (+05:30, `Delhivery:Client:ScanTimeOffsetMinutes`). Unconfirmed.
4. Unconfirmed: real HTTP status codes of the captured answers, multi-scan answers, the format of `ExpectedDeliveryDate` when present, and 401/403/429/5xx bodies.
5. No automatic customer e-mail for RTO/NDR/delivery exceptions (those need a human first); they appear in the exception queue. A COD order's `PaymentStatus` is not changed on delivery (existing behaviour, unchanged).
6. Guest "track order" does not yet show shipment details; logged-in customers do.
7. The admin page was built and compiled but **not clicked through in a browser** in this session.

## 11. Production activation checklist (do not start without approval)

1. Approve this report; capture/verify gap 1 on staging with one explicitly approved test shipment.
2. Apply `AddShipmentTracking` then `AddFulfilment` SQL to UAT first, with a backup; verify.
3. Set server env vars only: `Delhivery__ApiTokenTest` (UAT), later `Delhivery__ApiToken` (production) – by the owner, never in chat or files.
4. Confirm `Delhivery:PickupLocationLive` equals the production pickup name exactly (case and spaces).
5. Keep mode **test** while validating on UAT; only a SuperAdmin switches to live, deliberately.
6. Production: deploy code, run the migration scripts with a backup, leave `delhivery_mode=test` (worker stays paused on a Production host), then switch to live and approve one low-risk order; watch the exception queue.
7. Rollback: set mode to test (pauses creation) or `Delhivery:Fulfilment:Enabled=false`; the migration is additive and can be left in place.
