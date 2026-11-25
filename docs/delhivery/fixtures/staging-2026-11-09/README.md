# Delhivery STAGING response fixtures – captured 2026-11-09

**Source:** Delhivery's own "Execute API" tool in the Developer Portal (`one.delhivery.com/developer-portal/v1/execute`), run from the account owner's logged-in session on explicit instruction. The tool states it runs against the **staging environment** (`staging-express.delhivery.com`). All data is fake (`Test Consignee`, order refs `TEST-STG-000n`); nothing was created in production; the API token was never seen or copied (the tool authenticates through the session).

| File | Request | What it shows |
|---|---|---|
| `create-success.json` | create, prepaid, valid PIN | `success: true`; the AWB is `packages[0].waybill`; `packages[0].status` = `"Success"`; our reference echoed in `packages[0].refnum`; `upload_wbn` batch id |
| `create-failure-invalid-pin.json` | create with PIN `000000` | `success: false`; **a `packages` entry is still returned** with `status: "Fail"`, `waybill: ""`, the reason in `packages[0].remarks[]`; top-level `rmk` |
| `tracking-success-single-scan.json` | track the waybill above | `ShipmentData[0].Shipment`: `AWB`, `ReferenceNo`, `Status{Status,StatusType,StatusCode,StatusDateTime,StatusLocation,Instructions}`, `Scans[].ScanDetail{Scan,ScanType,StatusCode,ScanDateTime,ScannedLocation,Instructions,StatusDateTime}`, `ExpectedDeliveryDate` (null here) |
| `tracking-unknown-waybill.json` | track `99999999999999` | `Success: false`, `Error: "Data does not exists for provided Waybill(s)"`, `rmk` |

**Not captured (still unconfirmed):** HTTP status codes of these answers (the tool does not display them); a tracking response with several scans; the value of `ExpectedDeliveryDate` / a tracking URL when present; authentication-failure (401/403), rate-limit (429) and 5xx bodies (cannot be provoked safely without invalid credentials / load); whether the live (production) service answers identically (only staging was exercised).
**Note:** staging has its own pickup locations (e.g. `GANPATIHERBAL SURFACE`, `Test Wherehouse`), different from the production name `Ganpati Herbal Ayurveda`.
