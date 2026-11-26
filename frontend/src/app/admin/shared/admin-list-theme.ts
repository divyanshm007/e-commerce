/**
 * The look of the Orders list (page, KPI cards, table card, toolbar, badges, buttons), shared so other admin lists can match it.
 * Copied from admin-order-list.component.ts; all selectors are .ol-* and need ViewEncapsulation.None.
 */
export const ADMIN_LIST_THEME = `

/* ================================================================
   ORDERS LIST — ViewEncapsulation.None, all selectors .ol-*
================================================================ */

.ol-page {
  min-height: 100vh;
  background: #F6F8FA;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* Header */
.ol-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.ol-page-title {
  font-size: 22px; font-weight: 700; color: #0F172A;
  letter-spacing: -0.3px; margin: 0; line-height: 1.25;
}
.ol-page-sub { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.ol-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px; margin-top: 2px;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.ol-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

/* KPI grid */
.ol-kpi-row {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px; margin-bottom: 16px;
}
.ol-kpi-card {
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px;
  display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.ol-kpi-card:hover {
  box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09);
  transform: translateY(-2px);
}
.ol-kpi-skeleton {
  background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85);
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
}
.ol-card-blue   { border-top-color: #2563EB !important; }
.ol-card-amber  { border-top-color: #D97706 !important; }
.ol-card-teal   { border-top-color: #0F766E !important; }
.ol-card-purple { border-top-color: #7C3AED !important; }

.ol-kpi-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; margin-bottom: 10px; flex-shrink: 0;
}
.ol-icon-blue   { background: #EFF6FF; color: #2563EB; }
.ol-icon-amber  { background: #FFFBEB; color: #D97706; }
.ol-icon-teal   { background: #F0FDFA; color: #0F766E; }
.ol-icon-purple { background: #F5F3FF; color: #7C3AED; }

.ol-kpi-num {
  font-size: 26px; font-weight: 700; color: #0F172A;
  line-height: 1; letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums; margin-bottom: 5px;
}
.ol-kpi-num--sm { font-size: 18px; }
.ol-kpi-lbl {
  font-size: 10.5px; font-weight: 600; color: #94A3B8;
  text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto;
}
.ol-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.ol-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.ol-table-card {
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(226,232,240,0.9);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 4px 16px rgba(15,23,42,0.035);
  flex: 1;
}

/* Active filter bar */
.ol-filter-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9;
}
.ol-filter-info {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 500; color: #0F5C4D;
}
.ol-filter-info .pi { font-size: 11px; }
.ol-clear-all-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px;
  background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background 0.12s, border-color 0.12s;
}
.ol-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.ol-clear-all-btn .pi { font-size: 10px; }

/* Loading skeleton */
.ol-load-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC;
}
.ol-sk-sq { border-radius: 7px !important; display: block; }
.ol-load-head { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.ol-load-row  { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar — refresh button only */
.ol-toolbar {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC;
}
.ol-toolbar-spacer { flex: 1; }
.ol-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px;
  transition: background 0.13s, color 0.13s, border-color 0.13s;
}
.ol-icon-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

/* Caption wrapper — zero PrimeNG default padding */
.ol-dt.p-datatable .p-datatable-caption,
.ol-dt.p-datatable .p-datatable-header {
  padding: 0 !important; border: none !important; background: transparent !important;
}

/* Table header */
.ol-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important;
  color: #0F5C4D !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  padding: 0 13px !important;
  height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important;
  white-space: nowrap;
}
.ol-th-center { text-align: center !important; }

/* ── Sort icons — small & uniform ─────────────────────────── */
.ol-dt .p-datatable-thead th svg.p-icon {
  width: 9px !important;
  height: 9px !important;
  min-width: 9px !important;
  color: #9ECEC5 !important;
  vertical-align: middle;
}
.ol-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.ol-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }

/* ── Filter icon button (small, matches header) ────────────── */
.ol-dt .p-column-filter-menu-button {
  width: 16px !important; height: 16px !important; min-width: 16px !important;
  padding: 0 !important; margin-left: 2px;
  border-radius: 3px !important; border: none !important;
  background: transparent !important; color: #B0D8D1 !important;
  display: inline-flex !important; align-items: center !important;
  justify-content: center !important; cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.ol-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.ol-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* ── Filter overlay — compact, input only ─────────────────── */
.p-column-filter-overlay {
  min-width: 150px !important;
  max-width: 190px !important;
  width: 170px !important;
  border-radius: 7px !important;
  border: 1px solid #E2E8F0 !important;
  box-shadow: 0 6px 20px rgba(15,23,42,0.10) !important;
  padding: 6px !important;
  background: #fff !important;
  overflow: hidden !important;
}
/* Hide button bar — try all possible class variations */
.p-column-filter-overlay .p-column-filter-buttonbar,
.p-column-filter-overlay .p-column-filter-button-bar,
.p-column-filter-overlay [class*="buttonbar"],
.p-column-filter-overlay [class*="button-bar"] {
  display: none !important;
  height: 0 !important;
  overflow: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
}
/* Also hide individual buttons inside overlay as fallback */
.p-column-filter-overlay button.p-button,
.p-column-filter-overlay .p-button {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  overflow: hidden !important;
}
/* Hide header, operator, add-rule rows */
.p-column-filter-overlay .p-column-filter-overlay-header,
.p-column-filter-overlay .p-column-filter-operator,
.p-column-filter-overlay .p-column-filter-add-rule { display: none !important; }
/* Constraint container — no extra padding */
.p-column-filter-overlay .p-column-filter-constraint,
.p-column-filter-overlay .p-column-filter-constraints { padding: 0 !important; border: none !important; margin: 0 !important; }
/* Text input */
.p-column-filter-overlay .p-inputtext,
.p-column-filter-overlay input[type="text"],
.p-column-filter-overlay input {
  height: 26px !important;
  font-size: 11.5px !important;
  padding: 0 7px !important;
  border-radius: 5px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border: 1px solid #CBD5E1 !important;
  background: #fff !important;
  color: #0F172A !important;
  font-family: inherit !important;
}
.p-column-filter-overlay .p-inputtext:focus,
.p-column-filter-overlay input:focus {
  border-color: #0F766E !important;
  box-shadow: 0 0 0 2px rgba(15,118,110,0.10) !important;
  outline: none !important;
}
/* Select dropdown in overlay */
.ol-row-sel {
  width: 100% !important; height: 26px !important;
  font-size: 11.5px !important; border-radius: 5px !important;
  border: 1px solid #CBD5E1 !important;
}
.ol-row-sel .p-select-label { font-size: 11.5px !important; padding: 0 7px !important; line-height: 26px !important; }
.ol-row-sel .p-select-dropdown { width: 22px !important; }
.ol-row-sel .p-select-dropdown svg.p-icon { width: 9px !important; height: 9px !important; }

/* Table body rows */
.ol-dt .p-datatable-tbody > tr > td {
  padding: 0 13px !important;
  height: 52px !important;
  vertical-align: middle !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #F1F5F9 !important;
  color: #334155;
}
.ol-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.ol-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; transition: background 150ms ease; }

/* Paginator */
.ol-table-card .p-paginator {
  padding: 6px 12px !important; min-height: 46px;
  border-top: 1px solid #E2E8F0 !important;
  border-right: none !important; border-left: none !important; border-bottom: none !important;
  border-radius: 0 0 14px 14px;
  background: #FAFBFC !important; font-size: 12px;
}

/* Cell content */
.ol-order-no   { font-size: 12.5px; font-weight: 600; color: #0F766E; }
.ol-cust-name  { font-size: 13px; font-weight: 500; color: #0F172A; line-height: 1.3; }
.ol-cust-email { font-size: 11px; color: #94A3B8; margin-top: 1px; line-height: 1.3; }
.ol-date       { font-size: 12.5px; color: #475569; }
.ol-amount     { font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.3; }
.ol-item-count { font-size: 10.5px; color: #94A3B8; margin-top: 1px; }

.ol-method {
  display: inline-flex; align-items: center;
  padding: 2px 7px; border-radius: 4px;
  font-size: 11px; font-weight: 500;
  background: #F1F5F9; color: #475569;
}

/* Status badges */
.ol-badge {
  display: inline-flex; align-items: center;
  padding: 2px 7px; border-radius: 4px;
  font-size: 11px; font-weight: 500; line-height: 1.5; white-space: nowrap;
}
.ol-ps-paid     { background: #F0FDF4; color: #16A34A; }
.ol-ps-pending  { background: #FFFBEB; color: #CA8A04; }
.ol-ps-failed   { background: #FEF2F2; color: #DC2626; }
.ol-ps-refunded { background: #EFF6FF; color: #2563EB; }
.ol-os-pending   { background: #FFFBEB; color: #CA8A04; }
.ol-os-confirmed { background: #EFF6FF; color: #2563EB; }
.ol-os-shipped   { background: #F5F3FF; color: #7C3AED; }
.ol-os-delivered { background: #F0FDF4; color: #16A34A; }
.ol-os-cancelled { background: #FEF2F2; color: #DC2626; }
.ol-os-returned  { background: #FDF4FF; color: #9333EA; }

/* Row actions */
.ol-actions { display: flex; align-items: center; justify-content: center; }
.ol-act-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  color: #0F766E; text-decoration: none; transition: background 0.12s, color 0.12s;
}
.ol-act-btn:hover { background: #F0FDFA; color: #0D6659; }
.ol-act-btn .pi { font-size: 13px; }
.ol-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.ol-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.ol-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.ol-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.ol-search-input::placeholder { color: #CBD5E1; }
.ol-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.ol-search-clear:hover { background: #CBD5E1; }

/* Empty state */
.ol-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 18px 24px; text-align: center;
}
.ol-empty-icon {
  width: 34px; height: 34px; border-radius: 7px; background: #F1F5F9;
  display: flex; align-items: center; justify-content: center; margin-bottom: 6px;
}
.ol-empty-icon .pi { font-size: 15px; color: #94A3B8; }
.ol-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.ol-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }

@media (max-width: 768px) {
  .ol-page { padding: 14px; }
  .ol-kpi-row { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
  .ol-kpi-card { padding: 12px; min-height: 110px; }
  .ol-table-card { min-width: 0; overflow-x: auto !important; }
}

@media (max-width: 480px) {
  .ol-page { padding: 10px; }
  .ol-kpi-row { grid-template-columns: 1fr 1fr; gap: 8px; }
}

  `;
