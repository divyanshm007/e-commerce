import { downloadPdf, istDateTime, inr, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../shared/pdf-export';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { FulfilmentService, FulfilmentDashboard, FulfilmentQueue, FulfilmentRow } from '../../core/services/fulfilment.service';
import { ADMIN_LIST_THEME } from '../shared/admin-list-theme';

interface Tab { key: FulfilmentQueue; label: string; icon: string; color: string; count: (d: FulfilmentDashboard) => number; }

/**
 * Fulfilment overview in the same look as the Orders list: KPI cards (they double as the tabs), then one table card.
 * Approving is the only manual dispatch step; everything after it is automatic.
 */
@Component({
  selector: 'app-admin-fulfilment',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, NgIf, CurrencyPipe, DatePipe, FormsModule, TableModule, SkeletonModule, TooltipModule, DialogModule],
  template: `
<div class="ol-page">

  <div class="ol-page-header">
    <div>
      <h1 class="ol-page-title">Fulfilment</h1>
      <p class="ol-page-sub">Approve an order and the shipment is created and tracked automatically</p>
    </div>
    <div class="ap-head-right">
      <span *ngIf="dash() as d" class="ap-mode" [class.ap-mode-live]="d.mode === 'live'" [class.ap-mode-bad]="d.mode === 'invalid'">
        Delhivery: {{ d.mode === 'invalid' ? 'INVALID MODE' : d.mode.toUpperCase() }}
      </span>
      <button class="ol-refresh-btn" (click)="exportPdf()" title="Download PDF"><i class="pi pi-file-pdf"></i></button>
      <button class="ol-refresh-btn" (click)="reload()" title="Refresh"><i class="pi pi-refresh"></i></button>
    </div>
  </div>

  <!-- KPI cards = tabs -->
  <div class="ol-kpi-row ap-six">
    @if (!dash()) {
      @for (i of [1,2,3,4,5,6]; track i) {
        <div class="ol-kpi-card ol-kpi-skeleton">
          <p-skeleton width="40px" height="40px" styleClass="ol-sk-icon" />
          <p-skeleton width="60%" height="28px" styleClass="ol-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (dash(); as d) {
      @for (t of tabs; track t.key) {
        <button type="button" class="ol-kpi-card ap-tab" [class]="'ol-kpi-card ap-tab ol-card-' + t.color" [class.ap-tab-active]="active() === t.key" (click)="select(t.key)">
          <div class="ol-kpi-icon" [class]="'ol-kpi-icon ol-icon-' + t.color"><i class="pi" [class]="t.icon"></i></div>
          <div class="ol-kpi-num">{{ t.count(d) }}</div>
          <div class="ol-kpi-lbl">{{ t.label }}</div>
        </button>
      }
    }
  </div>

  <!-- Table card -->
  <div class="ol-table-card">
    @if (loading()) {
      <div class="ol-load-toolbar"><p-skeleton width="32px" height="32px" styleClass="ol-sk-sq" /></div>
      <div class="ol-load-head"></div>
      @for (r of [1,2,3,4,5]; track r) { <div class="ol-load-row" [style.opacity]="(6 - r) / 6"></div> }
    }

    @if (!loading()) {
      <div class="ol-toolbar">
        <div class="ol-search-wrap">
          <i class="pi pi-search ol-search-icon"></i>
          <input class="ol-search-input" type="text" placeholder="Search…" [(ngModel)]="searchValue" (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="ol-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')"><i class="pi pi-times"></i></button>
        </div>
        <div class="ol-toolbar-spacer"></div>
        <button class="ol-icon-btn" (click)="reload()" title="Refresh"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt [value]="rows()" [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]" [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} orders" styleClass="ol-dt ap-dt"
        [tableStyle]="{'width':'100%','table-layout':'fixed'}" [globalFilterFields]="['orderNumber','customerName','awb']">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="orderNumber" style="width:185px">Order # <p-sortIcon field="orderNumber" /></th>
            <th pSortableColumn="customerName">Customer <p-sortIcon field="customerName" /></th>
            <th class="ap-hide-sm" style="width:110px">Payment</th>
            <th pSortableColumn="totalAmount" class="ap-hide-sm" style="width:100px">Amount <p-sortIcon field="totalAmount" /></th>
            <th style="width:150px">Shipment</th>
            <th class="ap-hide-sm">Notes</th>
            <th class="ol-th-center" style="width:{{ actionsWidth() }}px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <a [routerLink]="['/admin/orders', r.orderId]" class="ol-order-no">#{{ r.orderNumber }}</a>
              <div class="ol-item-count">{{ r.orderDate | date:'dd MMM yyyy' }}</div>
              <div class="ol-amount ap-show-sm">{{ r.totalAmount | currency:'INR':'symbol':'1.0-0' }}</div>
            </td>
            <td>
              <div class="ol-cust-name">{{ r.customerName || 'Guest' }}</div>
              <div class="ap-note ap-show-sm" *ngIf="noteOf(r)">{{ noteOf(r) }}</div>
            </td>
            <td class="ap-hide-sm">
              <div class="ol-method">{{ r.paymentMethod === 'CashOnDelivery' ? 'COD' : 'Online' }}</div>
              <div class="ol-item-count">{{ r.paymentStatus }}</div>
            </td>
            <td class="ap-hide-sm"><div class="ol-amount">{{ r.totalAmount | currency:'INR':'symbol':'1.0-0' }}</div></td>
            <td>
              <span class="ol-badge" [class]="badge(r)">{{ label(r.shipmentStatus || r.fulfilmentState || 'Not approved') }}</span>
              <div class="ap-awb" *ngIf="r.awb">{{ r.awb }}</div>
            </td>
            <td class="ap-hide-sm">
              <div class="ap-issue" *ngFor="let i of r.issues">{{ i }}</div>
              <div class="ap-note" *ngIf="noteOf(r)">{{ noteOf(r) }}</div>
            </td>
            <td>
              <div class="ol-actions ap-actions">
                <ng-container *ngIf="active() === 'awaiting-approval'">
                  <button type="button" class="ap-btn ap-btn-ok" [disabled]="busy() || !r.eligible" (click)="approve(r)" pTooltip="Approve for dispatch" tooltipPosition="left">Approve</button>
                  <button type="button" class="ap-btn ap-btn-ghost" [disabled]="busy()" (click)="openReject(r)">Reject</button>
                </ng-container>
                <ng-container *ngIf="active() === 'exceptions' || active() === 'creation-failures'">
                  <button type="button" class="ap-btn ap-btn-warn" [disabled]="busy()" *ngIf="!r.awb" (click)="retry(r)">Retry</button>
                  <button type="button" class="ap-btn ap-btn-warn" [disabled]="busy()" *ngIf="r.awb" (click)="resolve(r)">Reviewed</button>
                </ng-container>
                <a [routerLink]="['/admin/orders', r.orderId]" class="ol-act-btn" pTooltip="View order" tooltipPosition="left"><i class="pi pi-eye"></i></a>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="ol-empty">
              <div class="ol-empty-icon"><i class="pi pi-inbox"></i></div>
              <p class="ol-empty-title">Nothing here</p>
              <p class="ol-empty-sub">No orders in this list right now</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>

  <div *ngIf="message()" class="ap-msg" [class.ap-msg-err]="isError()">{{ message() }}</div>

  <!-- Reject reason -->
  <p-dialog header="Reject for dispatch" [(visible)]="rejectOpen" [modal]="true" [style]="{width:'min(420px, 94vw)'}" [draggable]="false">
    <p class="ap-dlg-text">Order <strong>#{{ rejecting?.orderNumber }}</strong> will not be shipped. Tell us why (required).</p>
    <textarea class="ap-dlg-input" rows="3" [(ngModel)]="rejectReason" placeholder="Reason"></textarea>
    <ng-template pTemplate="footer">
      <button type="button" class="ap-btn ap-btn-ghost" (click)="rejectOpen = false">Cancel</button>
      <button type="button" class="ap-btn ap-btn-danger" [disabled]="busy() || rejectReason.trim().length < 3" (click)="confirmReject()">Reject order</button>
    </ng-template>
  </p-dialog>
</div>
  `,
  styles: [ADMIN_LIST_THEME, `
.ap-head-right { display: flex; align-items: center; gap: 10px; }
.ap-mode { padding: 4px 11px; border-radius: 100px; font-size: 11px; font-weight: 700; background: #FEF3C7; color: #92400E; }
.ap-mode-live { background: #DCFCE7; color: #166534; }
.ap-mode-bad { background: #FEE2E2; color: #991B1B; }
.ap-six { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.ap-tab { text-align: left; cursor: pointer; font-family: inherit; width: 100%; }
.ap-tab-active { box-shadow: 0 0 0 2px #0F766E, 0 6px 16px rgba(15,118,110,0.12) !important; }
.ap-dt table { width: 100% !important; }
.ap-awb { font-family: monospace; font-size: 10.5px; color: #64748B; margin-top: 3px; overflow-wrap: anywhere; }
.ap-note { font-size: 11px; color: #B45309; line-height: 1.35; overflow-wrap: anywhere; }
.ap-issue { font-size: 11px; color: #DC2626; line-height: 1.35; overflow-wrap: anywhere; }
.ap-show-sm { display: none; }
.ap-actions { gap: 5px !important; flex-wrap: wrap; justify-content: flex-end; }
.ap-btn { border: 1px solid transparent; border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity .12s, background .12s; }
.ap-btn:disabled { opacity: .4; cursor: not-allowed; }
.ap-btn-ok { background: #0F766E; color: #fff; }
.ap-btn-ok:hover:not(:disabled) { background: #0D6659; }
.ap-btn-warn { background: #D97706; color: #fff; }
.ap-btn-ghost { background: #fff; color: #475569; border-color: #E2E8F0; }
.ap-btn-danger { background: #DC2626; color: #fff; }
.ap-msg { margin-top: 12px; font-size: 13px; color: #15803D; }
.ap-msg-err { color: #DC2626; }
.ap-dlg-text { font-size: 13px; color: #475569; margin: 0 0 10px; }
.ap-dlg-input { width: 100%; border: 1px solid #E2E8F0; border-radius: 8px; padding: 9px 11px; font-size: 13px; font-family: inherit; resize: none; box-sizing: border-box; }
.ap-dlg-input:focus { outline: none; border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
@media (max-width: 1100px) { .ap-six { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) {
  .ap-hide-sm { display: none !important; }
  .ap-show-sm { display: block; }
  .ap-dt .p-datatable-table { min-width: 0 !important; table-layout: fixed !important; width: 100% !important; }
  .ol-table-card { overflow-x: hidden !important; }
  /* the three columns that stay are sized in percentages so they always fit */
  .ap-dt th:nth-child(1) { width: 32% !important; }
  .ap-dt th:nth-child(5) { width: 27% !important; }
  .ap-dt th:nth-child(7) { width: 88px !important; }
  .ap-dt .p-datatable-thead > tr > th, .ap-dt .p-datatable-tbody > tr > td { padding-left: 8px !important; padding-right: 8px !important; }
  .ap-dt .ol-order-no { overflow-wrap: anywhere; word-break: break-all; white-space: normal; font-size: 11.5px; }
  .ap-dt .ol-cust-name { overflow-wrap: anywhere; }
  .ap-actions { flex-direction: column; align-items: stretch; }
  .ap-actions .ap-btn { width: 100%; }
}
@media (max-width: 600px) { .ap-six { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ap-btn { padding: 4px 7px; font-size: 11px; } }
`]
})
export class AdminFulfilmentComponent implements OnInit {
  private svc = inject(FulfilmentService);
  @ViewChild('dt') dt!: Table;

  readonly tabs: Tab[] = [
    { key: 'awaiting-approval', label: 'Awaiting approval', icon: 'pi-clock', color: 'amber', count: d => d.awaitingApproval },
    { key: 'awaiting-shipment', label: 'Awaiting shipment', icon: 'pi-box', color: 'blue', count: d => d.approvedAwaitingShipment },
    { key: 'creation-failures', label: 'Creation failures', icon: 'pi-exclamation-triangle', color: 'purple', count: d => d.creationFailures },
    { key: 'in-transit', label: 'In transit', icon: 'pi-truck', color: 'blue', count: d => d.inTransit },
    { key: 'delivered', label: 'Delivered', icon: 'pi-check-circle', color: 'teal', count: d => d.delivered },
    { key: 'exceptions', label: 'Exceptions', icon: 'pi-flag', color: 'amber', count: d => d.exceptions },
  ];

  dash = signal<FulfilmentDashboard | null>(null);
  rows = signal<FulfilmentRow[]>([]);
  active = signal<FulfilmentQueue>('awaiting-approval');
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  isError = signal(false);
  searchValue = '';

  rejectOpen = false;
  rejecting: FulfilmentRow | null = null;
  rejectReason = '';

  ngOnInit(): void { this.reload(); }

  /** PDF of the list that is open (the selected card/tab). */
  exportPdf(): void {
    const list = this.rows();
    downloadPdf({
      title: 'Fulfilment report', filename: 'fulfilment',
      subtitle: [`List: ${String(this.active()).replace(/-/g, ' ')}`],
      summary: [['Orders', String(list.length)], ['Value', inr(list.reduce((s, r) => s + (r.totalAmount ?? 0), 0))]],
      columns: ['Order', 'Date (IST)', 'Customer', 'Amount', 'Payment', 'Order status', 'Dispatch', 'AWB', 'Shipment', 'Note'],
      rows: list.map(r => [r.orderNumber, istDateTime(r.orderDate), r.customerName, inr(r.totalAmount), `${r.paymentMethod} / ${r.paymentStatus}`,
        r.orderStatus, r.fulfilmentState ?? 'Not approved', r.awb ?? '', r.shipmentStatus ?? '', r.attentionReason ?? r.lastError ?? (r.issues ?? []).join('; ')])
    });
  }

  reload(): void {
    this.svc.dashboard().subscribe({ next: r => this.dash.set(r.data ?? null), error: () => this.dash.set(null) });
    this.loadRows();
  }

  select(k: FulfilmentQueue): void { this.active.set(k); this.message.set(''); this.searchValue = ''; this.loadRows(); }

  private loadRows(): void {
    this.loading.set(true);
    this.svc.queue(this.active(), 1, 100).subscribe({
      next: r => { this.rows.set([...(r.data?.items ?? [])]); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  actionsWidth(): number { return this.active() === 'awaiting-approval' ? 190 : this.active() === 'exceptions' || this.active() === 'creation-failures' ? 130 : 56; }

  noteOf(r: FulfilmentRow): string { return r.attentionReason || r.lastError || ''; }
  label(v?: string | null): string { return (v ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }

  /** Same colours as the order status badges. */
  badge(r: FulfilmentRow): string {
    const v = (r.shipmentStatus || r.fulfilmentState || '').toUpperCase();
    if (!v) return 'ol-os-pending';
    if (['EXCEPTION', 'FAILED', 'CANCELLED', 'RTO_IN_TRANSIT', 'NEEDS_REVIEW'].includes(v)) return 'ol-os-cancelled';
    if (['DELIVERED', 'COMPLETED', 'RTO_DELIVERED'].includes(v)) return 'ol-os-delivered';
    if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'SHIPPED', 'PICKED_UP'].includes(v)) return 'ol-os-shipped';
    if (v === 'REJECTED') return 'ol-os-returned';
    return 'ol-os-confirmed';
  }

  approve(r: FulfilmentRow): void { this.act(this.svc.approve(r.orderId)); }
  retry(r: FulfilmentRow): void { this.act(this.svc.retry(r.orderId)); }
  resolve(r: FulfilmentRow): void { this.act(this.svc.resolve(r.orderId)); }

  openReject(r: FulfilmentRow): void { this.rejecting = r; this.rejectReason = ''; this.rejectOpen = true; }
  confirmReject(): void {
    if (!this.rejecting) return;
    this.rejectOpen = false;
    this.act(this.svc.reject(this.rejecting.orderId, this.rejectReason.trim()));
  }

  private act(call: ReturnType<FulfilmentService['approve']>): void {
    this.busy.set(true); this.message.set('');
    call.subscribe({
      next: res => { this.busy.set(false); this.isError.set(false); this.message.set(String(res.data ?? res.message)); this.reload(); },
      error: e => {
        this.busy.set(false); this.isError.set(true);
        this.message.set([e?.error?.message || 'The action failed.', ...(e?.error?.errors ?? [])].join(' '));
      }
    });
  }
}
