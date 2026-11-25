# 11 – Delhivery Stage 2.3: API Client, Response Parsing and Status Mapping – Report
Date: 2026-11-09 · Scope: phase 2.3 only. **Not implemented (by instruction):** shipment creation workflow, AWB persistence, automatic creation, admin Create/Retry, tracking persistence, polling, customer tracking UI, notifications, webhooks, pickup/NDR/label/cancel, production integration. Stage 2.4 has not been started.
**No Delhivery API call of any kind was made** (not shipping, not staging, not production). All HTTP in tests goes to a fake handler that forwards nothing.

## 1. Result in one paragraph
The two design points are resolved and tested. The Delhivery client, request builder, response inspector and status mapper are implemented and tested (480 tests, all passing: the 238 existing + 242 new). **One thing could not be done as asked and is reported rather than worked around: Delhivery's official portal publishes no response examples for any operation**, so no response schema is confirmed. Consequently the client derives outcomes only from the transport and HTTP status, treats a 2xx answer it cannot read as "outcome unknown" (which the design already handles by reconciling, never retrying blindly), and reads **no** field (AWB, scans, dates, tracking URL) from any response body. The seam for adding confirmed schemas is in place; what unblocks it is in §11.

## 2. Design point 1 – what "open shipment" means
**Finding.** One word covered two questions. The database index and the guard were correct for the first one, but nothing yet defined the second:
| Question | Definition (single place: `Common/ShipmentRules.cs`) |
|---|---|
| **Holds the order** (blocks creating another shipment; blocks hand-editing courier-owned fields) | `HoldsOrder`: creation IN_FLIGHT / CREATED / UNKNOWN **and** status not CANCELLED / RTO_DELIVERED. Used by the unique index `UX_Shipments_Order_Open` and by `ShipmentOrderGuard`. |
| **Final** | `IsFinalStatus`: DELIVERED, RTO_DELIVERED, CANCELLED |
| **Needs tracking** (the only shipments a worker may poll) | `NeedsTracking`: creation CREATED **and** not final (checks both the stored `IsFinal` flag, which the poll index filters on, and the status itself) |
**Decision: a DELIVERED shipment still holds its order but is never polled.** If delivered shipments stopped holding the order, the unique index would allow a second shipment to be created for an order that has already been delivered (a duplicate dispatch). Only CANCELLED and RTO_DELIVERED release an order. Not-final-but-UNKNOWN/IN_FLIGHT rows hold the order but are not polled (they are reconciled; they have no AWB). A FAILED creation neither holds nor needs tracking.
**What changed:** `IsOpen` → `HoldsOrder`, `OpenFilterSql` → `HoldsOrderFilterSql` (the SQL text is **byte-for-byte the same**), new `IsFinalStatus`, `NeedsTracking`, and `ApplyStatus` (the one way code should change a status, which keeps `IsFinal` in step). The guard and the index configuration use the renamed members.
**Migration implications – none, and the migration was not modified.** The index SQL did not change, so the migration, its Designer and the model snapshot are byte-identical to Stage 2.2, and the SQL regenerated with `dotnet ef migrations script` is **byte-identical to the script reviewed in Stage 2.2**. Two consequences are documented rather than changed: (a) the index keeps its historical name `UX_Shipments_Order_Open` (renaming would alter the migration; the name now reads "holds the order"); (b) the database has no CHECK tying `IsFinal` to `Status` – `ShipmentRules.ApplyStatus` plus the status check inside `NeedsTracking` cover it in code, and a CHECK can be added in the Stage 2.4 migration if wanted.
**Tests (84):** `ShipmentRulesTests` (45: final set, `ApplyStatus`, all 36 state×status combinations satisfy "needs tracking ⊆ holds the order", delivered holds-but-not-polled, cancelled/RTO release, in-flight/unknown not polled, failed neither, drifted flags never polled) and `ShipmentRulesDatabaseTests` (39: PostgreSQL evaluates both rules exactly like the C# rules for all 36 combinations on tables created by the real migration; the polling query returns only the live shipment among six rows including a drifted flag; a delivered order cannot get a second shipment but a cancelled one can; the guard still holds a delivered shipment's order). The Stage 2.2 test that compares the guard, the C# rule and the unique index for all 36 combinations still passes.

## 3. Design point 2 – an invalid `delhivery_mode` fails closed
`DelhiveryConfigService.GetModeAsync` now behaves as follows:
| Stored value | Result |
|---|---|
| no row | `test` – the documented default for a fresh environment (not an error) |
| `test`, `live` (any case, surrounding spaces) | accepted |
| anything else, including empty / blank / `production` / `banana` | **throws `DelhiveryConfigurationException`** ("The Delhivery setting 'delhivery_mode' is invalid: it must be 'test' or 'live'."), never read as test |
Effects: `GetActiveCredentialsAsync` throws; the client returns `NotSent` and sends nothing (proven with a recording handler); the admin info endpoint stays usable and reports `mode: "invalid"` with a `configurationError`, no base URL, automatic creation forced off; `SetModeAsync` can **repair** it (the previous value is recorded as "invalid" in the audit log), and live is still refused without the live token. The admin Settings tab shows "INVALID – DISABLED" and the error text instead of pretending to be TEST. Message text never contains a token.
**Tests (17 + client tests):** `DelhiveryFailClosedTests` (16: default; 7 invalid values throw; recognised values; admin info; repair + audit; live still refused while repairing; the real client sends nothing) and `DelhiveryFailClosedApiTests` (1, over HTTP: an invalid row is reported, the admin repairs it); the client-level proof (invalid mode → nothing sent) is in `DelhiveryClientTests` (§10).

## 4. Response discovery (read-only, in your logged-in Delhivery One session)
**Method.** Opened the official Developer Portal pages (`one.delhivery.com/developer-portal/document/b2c/detail/…`): Shipment Creation (including the MPS section), Shipment Tracking, Package Lifecycle, Steps of Integration, Common Used Terminology, plus the Stage 1 pages (cancellation, label, pickup, NDR, waybill, pincode, webhook). Read each page's text and screenshots, then searched the portal's own static documentation bundles (`order-creation.*.js`, `order-tracking.*.js`, `api.en.*.js`, `b2c-enhanced-base.*.js`, `common.en.*.js`, `detail-documents.*.js`) for any response text (`response`, `success`, `packages`, `upload_wbn`, `refnum`, `remarks`, HTTP codes 401/403/429/5xx). **Not done:** the API token was never viewed or copied (it stays masked; I did not open the API Setup page this time), no credential was generated or rotated, the portal's "Execute API"/"Try our APIs" playground was **not** used (it would call the API), no account setting was changed, no shipping-API call was made. The portal's own page/bundle files were fetched only to read the documentation text.
**Result – the requested samples:**
| Requested sample | In the portal? |
|---|---|
| Shipment creation success | **No – unconfirmed** |
| Shipment creation failure | **No – unconfirmed** |
| Tracking success | **No – unconfirmed** |
| Tracking with multiple scans | **No – unconfirmed** |
| Unknown AWB / reference | **No – unconfirmed** |
| Authentication failure | **No – unconfirmed** |
| Rate-limit response | **No – unconfirmed** (only the numeric limit is documented, §5) |
| Server error | **No – unconfirmed** |
Each documentation page shows a request code sample (many languages), the parameter table, latency/rate-limit table and the test/production URLs, **and nothing else**. No response panel exists and none of the bundles contains response text. Nothing was invented to fill the gap.

## 5. What the documentation DOES confirm (and is used)
| Topic | Documented fact | Where |
|---|---|---|
| Environments | test `https://staging-express.delhivery.com`, production `https://track.delhivery.com` | every page |
| Auth | header `Authorization: Token <API token>`; "for B2C this is a static token" | request samples, Terminology |
| Create | `POST /api/cmu/create.json`; body sample `format=json&data={…}` with header `Content-Type: application/json`; field list (mandatory: `name`, `order`, `phone`, `add`, `pin`, `payment_mode`, `pickup_location`; optional: `city`, `state`, `country`, `weight`, `cod_amount`, `total_amount`, `products_desc`, `quantity`, dimensions, `waybill`, …); order id must be unique; restricted characters `& # % ; \`; pickup name is case/space sensitive; rate limit 20 000/5 min/IP | Shipment Creation |
| Empty waybill | the sample sends `"waybill": ""`; "SPS: Waybill can be passed in the payload or can be skipped"; Steps of Integration: bulk waybills are "required only where order creation is required with **pre-assigned** waybills" → **creation without a pre-fetched waybill is the normal path** (implicitly documented; no explicit sentence says "Delhivery assigns it", and where the AWB appears in the response is unconfirmed) | Shipment Creation, Steps of Integration |
| Track | `GET /api/v1/packages/json/?waybill=…&ref_ids=…`; waybill mandatory, `ref_ids` = order id optional; "Track up to 50 waybills (comma-separated) with a single request"; 750 req/5 min/IP | Shipment Tracking |
| Status vocabulary | the (type, status) table: UD Manifested / Not Picked / In Transit / Pending / Dispatched, DL Delivered; RT In Transit / Pending / Dispatched, DL RTO; PP, PU, DL DTO, CN Canceled / Closed (reverse) | Package Lifecycle (authoritative), webhook page |
| Cancellation behaviour | allowed in Manifested / In Transit / Pending; cancel before pickup keeps UD Manifested; cancel in transit becomes RT | Cancellation page (Stage 1) |

## 6. Confirmed versus unconfirmed
| Item | Status | Handling in code |
|---|---|---|
| Request endpoints, methods, header, create fields, 50-waybill limit, restricted characters, pickup-location exactness | **Confirmed** | implemented and tested |
| Status/type vocabulary | **Confirmed** | `DelhiveryStatusMapper` |
| **Request content type for create** | **Unconfirmed**: the sample pairs the header `application/json` with a form-style body `format=json&data=…` | default = exactly the sample; setting `Delhivery:Client:CreateContentType` may select `application/x-www-form-urlencoded` (JSON is then URL-encoded). To be settled by the first approved staging call. |
| `pin`/`phone` JSON type | table says `pin` integer, sample uses strings | follows the sample (strings); unconfirmed |
| **How the AWB is returned**, success flag, error texts, remarks | **Unconfirmed** | not read; `Awb` is always null |
| **Tracking response shape** (scans, status, status type, scan code, scan time, location, expected delivery date, tracking URL, "not found" shape) | **Unconfirmed** | not read; `Scans` is empty; all `DelhiveryScan` fields are optional by design |
| Error / rate-limit / auth-failure bodies, `Retry-After` header | **Unconfirmed** (HTTP semantics only; `Retry-After` is read only if present) | outcome from the HTTP status only |
| Whether HTTP 4xx really means "nothing was created" for create | assumed from HTTP semantics, **to be confirmed** with real responses | see §8 |
| Default `shipping_mode`, return-address behaviour, weight/dimension defaults | **Unconfirmed / no data** | not sent |
| Staging token existence / compatibility | **Unknown** | no call made |

## 7. Implementation
### 7.1 Files
**New (backend):** `Interfaces/IDelhiveryClient.cs`, `DTOs/Shipments/DelhiveryApiModels.cs`, `Common/DelhiveryConfigurationException.cs`, `Services/Delhivery/{DelhiveryClient, DelhiveryClientOptions, DelhiveryRequestBuilder, DelhiveryResponseParser, DelhiveryStatusMapper}.cs`.
**Modified (backend, 6):** `Common/ShipmentRules.cs` (split rules), `Data/Configurations/ShipmentConfiguration.cs` (+1/−1: renamed constant; line endings restored), `Services/ShipmentOrderGuard.cs` (renamed rule, doc), `Services/DelhiveryConfigService.cs` (fail-closed), `DTOs/Shipments/DelhiveryDtos.cs` (+`ConfigurationError`), `Extensions/ServiceExtensions.cs` (+4 lines: options + typed `HttpClient` registration).
**Frontend (1):** `admin/settings/admin-settings.component.ts` – shows the invalid-mode state/error (template + type only).
**Tests (new):** `DelhiveryClientTests.cs`, `DelhiveryRequestBuilderTests.cs`, `DelhiveryStatusMapperTests.cs`, `DelhiveryDesignDecisionTests.cs`; changed `ShipmentDatabaseTests.cs` (renamed members only).
**Unchanged (byte-identical to the end of Stage 2.2):** the migration + Designer + snapshot, `PaymentService`, `PaymentsController`, `RazorpayConfigService`, `OrderService`, `OrdersController`, `SettingsService`, `AuthService`, `EmailService`, `Program.cs`, `appsettings.json`, `ShipmentsController`, `Shipment` entities. No database change of any kind; no new package.
### 7.2 Client architecture
`IDelhiveryClient` has exactly two operations: `CreateShipmentAsync(DelhiveryShipmentRequest, ct)` and `TrackAsync(waybills, orderRefs, ct)`.
- **Typed HttpClient** registered with `AddHttpClient<IDelhiveryClient, DelhiveryClient>()`; primary handler `SocketsHttpHandler { AllowAutoRedirect = false }` (a request is never forwarded to another host); `HttpClient.Timeout` 60 s as an outer limit.
- **Environment/credentials per call** from `IDelhiveryConfigService`: mode → credentials; missing token, invalid mode, non-https URL → `NotSent`. **Host guard:** test mode may only use `staging-express.delhivery.com`, live mode only `track.delhivery.com`, whatever the configuration says (so test traffic can never reach production through a typo).
- **Authentication:** `message.Headers.Authorization = new("Token", token)` → `Authorization: Token <token>`, plus `Accept: application/json`. The token lives only in memory inside `DelhiveryCredentials`, whose `ToString()` prints no token. It is never logged, stored, returned or put in a result.
- **Timeouts:** per call via a linked `CancellationTokenSource` (create 20 s, tracking 15 s; settings `Delhivery:Client:*`, vs. documented p99 of 1.6 s / 0.5 s). A caller's cancellation is rethrown; only an internal timeout becomes `Timeout`.
- **One request per call, never retries** (retry/reconcile belongs to Stage 2.4).
- **Response handling:** read up to 1 MB; the body is inspected only for "valid JSON of a sane size" and is **never stored, logged or echoed**; results carry a fixed sanitised sentence, the HTTP status, `RetryAfter` (if the standard header is present), duration and byte count.
- **Logging:** one summary line per call – operation, mode, outcome, status, milliseconds. No URL, query, waybill, order reference, header or body (tests assert this).
### 7.3 Request construction (`DelhiveryRequestBuilder`)
- `FromOrder(order, clientOrderRef, pickupLocation, weightGrams?)`: maps stored order data to the documented fields only (`name`, `add` = line 1 + line 2, `pin`, `city`/`state`/`country` when present, `phone` normalised to 10 digits, `order`, `payment_mode` Prepaid|COD, `cod_amount` for COD = order total, `total_amount`, `products_desc`, `quantity`, `weight` only when supplied, `waybill: ""`, `pickup_location.name` exact). The consignee e-mail is not a documented field and is never sent.
- **Nothing fabricated, nothing silently replaced:** every missing/invalid mandatory value (name, phone ≠ 10 digits, PIN ≠ 6 digits, address, order reference, pickup location, COD amount ≤ 0, online order not paid) is returned as an error and nothing is built; optional values without data are omitted, not filled with placeholders.
- **Restricted characters:** `& # % ; \` and `"` and control characters are *replaced* (`&`→" and ", `#`→" No ", `%`→" percent", `;`→",", `\`→"/", `"`→"'"), spaces tidied, and the names of changed fields are returned in `SanitizedFields` (never silent). A test proves the serialised JSON contains none of the restricted characters (the single `&` of the documented wrapper `format=json&data=` aside).
- Body: `format=json&data=` + JSON (documented sample form); JSON written with relaxed escaping so non-ASCII (e.g. Hindi names) stays readable and no backslash escapes appear.
- Tracking query: `waybill=a,b,…` (≤ 50, trimmed, de-duplicated, characters limited to `[A-Za-z0-9._-]` so nothing can inject a parameter) and optional `ref_ids=`.

## 8. Error classification (HTTP and transport only)
| Situation | `Outcome` | For create: `Processing` | Tracking |
|---|---|---|---|
| invalid request / no token / invalid mode / wrong host / unsupported content type | `NotSent` (nothing left the server) | `NotCreated` | – |
| 4xx other than 401/403/408/429 | `DefinitelyRejected` | `NotCreated` | permanent |
| 401, 403 | `AuthenticationFailed` | `NotCreated` | permanent |
| 429 | `RateLimited` (+ `RetryAfter` when sent) | `NotCreated` | transient |
| 5xx | `ServerError` | **`Unknown`** | transient |
| timeout | `Timeout` | **`Unknown`** | transient |
| connection failure | `NetworkFailure` | **`Unknown`** | transient |
| 408, 1xx, 3xx | `UnexpectedStatus` | **`Unknown`** | – |
| 2xx, body not valid JSON / over 1 MB / empty | `ResponseMalformed` | **`Unknown`** | – |
| 2xx, valid JSON (schema unconfirmed, nothing read) | `ResponseUnconfirmed` | **`Unknown`** | – |
`Created` exists in the enum for the future but is **never produced** in Stage 2.3: success needs a confirmed response schema. A create call that ends `Unknown` must be reconciled (look the order reference up via the documented `ref_ids`) before any retry – exactly the rule from document 05. The `NotCreated` rows rest on HTTP semantics, not on documented Delhivery behaviour (§6).

## 9. Status mapping (`DelhiveryStatusMapper`, pure)
Matches only on the **(status type, status)** pair (case- and space-insensitive); the scan code is carried through but never changes the category; raw type/status/scan code are always preserved.
| Delhivery (type / status) | Category | Final |
|---|---|---|
| UD Manifested · UD Not Picked | CREATED | no |
| UD In Transit · UD Pending | IN_TRANSIT | no |
| UD Dispatched | OUT_FOR_DELIVERY | no |
| DL Delivered | DELIVERED | yes |
| RT In Transit · RT Pending · RT Dispatched | RTO_IN_TRANSIT | no |
| DL RTO | RTO_DELIVERED | yes |
| CN Canceled · CN Closed | CANCELLED | yes |
| PP Open/Scheduled/Dispatched · PU In Transit/Pending/Dispatched · DL DTO (reverse, documented, out of scope) | NEEDS_REVIEW (known) | no |
| anything else (unknown pair, missing type or status, `Cancelled` spelled with two l's, `UD Delivered`, …) | **NEEDS_REVIEW** (unknown, raw values kept) | no |
**Picked up is never produced** (this refines document 07). Delhivery's vocabulary has no separate pick-up status; "UD In Transit" is defined as in transit *after* physical pick-up, and telling a first pick-up scan from later hops needs scan context the documentation does not describe. `PICKED_UP` therefore stays an unused category until real scan data justifies it; the planned "picked up / in transit" e-mail will trigger on IN_TRANSIT.
`Resolve(currentCategory, currentEventTime, scans)` applies a batch: oldest first (scans without a time are oldest); a scan older than the last known event never changes the shipment; a forward status never moves backwards; RTO and CANCELLED are branches; final states never change; a returning parcel never goes forward again; an unrecognised scan is counted but changes nothing; applying the same batch twice changes nothing.

## 10. Tests and results
`dotnet test`: **480 passed, 0 failed** (238 existing – all still passing – plus 242 new). Frontend `ng build` OK; backend build succeeded.
| New test class | Tests | What it covers |
|---|---|---|
| `DelhiveryClientTests` | 57 | staging host / documented path+method for create and track; live mode selects the production host (recorded, not sent); exact `Authorization: Token <fake>` per mode; documented body wrapper and content type; form-encoded alternative; unsupported content type; tracking GET with exact query and no body; **token/Authorization/response body/phone never in logs or results across success, 401, 500 and network-failure scenarios**; one summary log line without URL/waybill; create outcomes for 400, 404, 422, 401, 403, 429, 408, 500, 502, 503, 302; `Retry-After`; tracking transient vs permanent statuses; valid JSON with unknown / missing fields (6 shapes) read nothing and do not crash; malformed/empty/HTML bodies; oversized body; 500-deep nesting; create timeout (ambiguous, no retry), tracking timeout, connection failure, caller cancellation; invalid request not sent; 0 / 51 / 500 waybills not sent, 50 in one request; missing or blank token; invalid stored mode; test mode misconfigured to the production URL, live mode pointed at staging / http / another host / garbage all refused; no test-mode request ever targets the production host; DI resolution with options binding |
| `DelhiveryRequestBuilderTests` | 39 | exact JSON for a sample request; only documented fields; COD amount / Prepaid / optional weight; pickup location exact; `waybill: ""`; wrapper and form-encoded round trip; each restricted character replaced (8 cases), clean and non-ASCII text untouched; serialised body free of restricted characters; order → request mapping with normalised phone; undocumented customer data (e-mail, guest name) never in the body; 6 missing/invalid mandatory values; several errors reported together; unpaid online order never Prepaid; COD amount rules; unsafe order references refused; pickup location never altered; optional fields omitted; weight 0 refused; hand-built request re-validated; tracking query (comma list, `ref_ids`, 50 vs 51, trimming, de-duplication, injection attempt) |
| `DelhiveryStatusMapperTests` | 45 | all 12 documented forward/return/cancel pairs (UD Manifested, Not Picked, In Transit, Pending, Dispatched; DL Delivered; RT In Transit, Pending, Dispatched; DL RTO; CN Canceled, Closed); case/space tolerance with raw text preserved; 7 documented reverse statuses → review; 6 unknown combinations; missing fields; scan code carried but inert; **PICKED_UP never produced**; ordering of unordered batches; **older scans never overwrite newer**; no backward movement; RTO branch and final state; returning parcel; final shipments immutable (3); cancel scan; unrecognised scan; untimed scans; idempotency; empty batch |
| `ShipmentRulesTests` / `ShipmentRulesDatabaseTests` | 45 / 39 | design point 1 (§2) |
| `DelhiveryFailClosedTests` / `DelhiveryFailClosedApiTests` | 16 / 1 | design point 2 (§3) |
**Mocked versus documented fixtures – stated plainly.** There are **no response fixtures from documentation or from Delhivery**, because none exist (§4); I created none. The response bodies used in tests (`{}`, arbitrary JSON with unknown fields, malformed text, HTML) are deliberately generic **opaque bodies that make no claim about Delhivery's schema**; they prove that nothing is read from a body and nothing crashes. The request-side tests use the documented request fields; the status tests use the documented vocabulary. A `Fixtures/` folder was intentionally not created.
Test-run hygiene: all databases used were disposable local ones (verified none left, no stray processes); all tokens are fake (`FAKE-…`); a scan of the source for token-like values found none. First-run failures were test mistakes (a wrong expectation about a forward status not moving backwards; AutoMapper missing from my DI test) – corrected without weakening any assertion.

## 11. Remaining unknowns and how to unblock them
| # | Unknown | Ways to resolve (your choice) |
|---|---|---|
| 1 | The create response schema (AWB field, success/failure shape, error texts) and the tracking response schema (scans, dates, tracking URL, not-found shape), plus auth/rate-limit/error bodies | **(a)** approve one tightly controlled **staging** call (needs a staging token placed by you in `Delhivery__ApiTokenTest`; I would send a single `TEST-` order, capture and redact the response, store it as a fixture, then finish the parsers) **(b)** ask Delhivery support/your account manager for the response samples (the portal links an integration contact: lastmile-integration@delhivery.com) **(c)** you paste sample responses from your own Delhivery documentation |
| 2 | Create request content type (header `application/json` vs form-urlencoded) | settled by the same staging call (a setting already exists) |
| 3 | Whether HTTP 4xx on create always means nothing was created; 200-with-failure behaviour | same |
| 4 | Whether leaving `waybill` empty is accepted exactly as the sample shows (strongly implied, not stated) | same |
| 5 | Existence/compatibility of a Delhivery staging token for this account | ask Delhivery / your contact |
| 6 | Default weight, dimensions, `shipping_mode`, return address | business decision (no data exists today) |
| 7 | Whether scans carry context that distinguishes the first pick-up from later transit | real tracking data |

## 12. Notes and corrections
- **Build warning (my Stage 2.2 code):** a clean build reports `CS0618` – `UseXminAsConcurrencyToken` is marked obsolete in Npgsql 8.0.10 (the recommended replacement is `IsRowVersion()`). My Stage 2.2 report said "0 warnings", which was true for an incremental build only; it is 1 warning on a clean build. It is harmless, but changing it touches the model, so I did **not** change it; it can be handled with the next migration.
- Behaviour changes in this stage: an invalid stored Delhivery mode now disables Delhivery and is reported instead of silently meaning test; `IsOpen`/`OpenFilterSql` were renamed (no SQL change); the admin Settings tab shows the invalid-mode error. Nothing else visible changed.
- Line endings: my edits kept each file's original style (the one file that had drifted – `ShipmentConfiguration.cs` – was restored; its real diff is +1/−1).

## 13. Confirmations
- **No Delhivery API call was made** – none to the shipping API, staging or production; the portal's "Execute API"/"Try our APIs" tools were not used; no shipment was created.
- **The API token was never viewed, copied, exported, generated or rotated**; no token exists in any source file, fixture, document or screenshot (only `FAKE-…` strings inside tests).
- **Production was untouched:** no connection to the live server or its database, no migration, no deployment, no configuration/environment change, no change to Razorpay.
- The only database activity was on disposable local databases (all dropped).
- Stopping here. **Stage 2.4 has not been started and awaits your approval** – together with your decision on §11 item 1, because creating and tracking shipments cannot be completed without a confirmed response format.
