import { downloadPdf, istDateTime, inr, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../shared/pdf-export';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../core/services/api.service';
import { ADMIN_LIST_THEME } from '../shared/admin-list-theme';

interface CancelRow {
  id: string; orderId: string; orderNumber: string; customerName: string; customerEmail: string; reason: string;
  status: string; wasDispatched: boolean; orderStatus: string; awb?: string | null; adminNotes?: string | null; createdAt: string;
}

/**
 * Customers ask to cancel an order that is already dispatched; an administrator approves or declines here.
 * Same look as the Orders list: KPI cards (they double as the tabs), then one table card.
 */
@Component({
  selector: 'app-admin-cancel-requests',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, NgIf, DatePipe, FormsModule, TableModule, SkeletonModule, TooltipModule, DialogModule],
  template: `
<div class="ol-page">

  <div class="ol-page-header">
    <div>
      <h1 class="ol-page-title">Cancellation requests</h1>
      <p class="ol-page-sub">An order that is already dispatched is cancelled only after you approve</p>
    </div>
<div style="display:flex;gap:8px;align-items:center"><button class="ol-refresh-btn" (click)="exportPdf()" title="Download PDF"><i class="pi pi-file-pdf"></i></button><button class="ol-refresh-btn" (click)="reload()" title="Refresh"><i class="pi pi-refresh"></i></button></div>
  </div>

  <!-- KPI cards = tabs -->
  <div class="ol-kpi-row ap-three">
    @for (t of tabs; track t.key) {
      <button type="button" class="ol-kpi-card ap-tab" [class]="'ol-kpi-card ap-tab ol-card-' + t.color" [class.ap-tab-active]="active() === t.key" (click)="select(t.key)">
        <div class="ol-kpi-icon" [class]="'ol-kpi-icon ol-icon-' + t.color"><i class="pi" [class]="t.icon"></i></div>
        <div class="ol-kpi-num">{{ counts()[t.key] }}</div>
        <div class="ol-kpi-lbl">{{ t.label }}</div>
      </button>
    }
  </div>

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
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests" styleClass="ol-dt ap-dt"
        [tableStyle]="{'width':'100%','table-layout':'fixed'}" [globalFilterFields]="['orderNumber','customerName','customerEmail','reason','awb']">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="orderNumber" style="width:185px">Order # <p-sortIcon field="orderNumber" /></th>
            <th pSortableColumn="customerName">Customer <p-sortIcon field="customerName" /></th>
            <th class="ap-hide-sm">Reason</th>
            <th class="ap-hide-sm" style="width:120px">Order status</th>
            <th pSortableColumn="createdAt" class="ap-hide-sm" style="width:110px">Requested <p-sortIcon field="createdAt" /></th>
            <th style="width:110px">Request</th>
            <th class="ol-th-center" style="width:{{ active() === 'Pending' ? 190 : 56 }}px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <a [routerLink]="['/admin/orders', r.orderId]" class="ol-order-no">#{{ r.orderNumber }}</a>
              <div class="ap-awb" *ngIf="r.awb">AWB {{ r.awb }}</div>
            </td>
            <td>
              <div class="ol-cust-name">{{ r.customerName || 'Guest' }}</div>
              <div class="ol-cust-email">{{ r.customerEmail }}</div>
              <div class="ap-reason ap-show-sm">{{ r.reason }}</div>
            </td>
            <td class="ap-hide-sm">
              <div class="ap-reason">{{ r.reason }}</div>
              <div class="ap-note" *ngIf="r.adminNotes">Your note: {{ r.adminNotes }}</div>
              <div class="ap-warn" *ngIf="r.status === 'Pending' && r.wasDispatched">Also cancel the shipment in the Delhivery portal if you approve.</div>
            </td>
            <td class="ap-hide-sm"><span class="ol-badge" [class]="orderBadge(r.orderStatus)">{{ r.orderStatus }}</span></td>
            <td class="ap-hide-sm"><span class="ol-date">{{ r.createdAt | date:'dd MMM yyyy' }}</span></td>
            <td><span class="ol-badge" [class]="requestBadge(r.status)">{{ r.status === 'Rejected' ? 'Declined' : r.status === 'Pending' ? 'Waiting' : r.status }}</span></td>
            <td>
              <div class="ol-actions ap-actions">
                <ng-container *ngIf="r.status === 'Pending'">
                  <button type="button" class="ap-btn ap-btn-ok" [disabled]="busy()" (click)="open(r, 'approve')">Approve</button>
                  <button type="button" class="ap-btn ap-btn-ghost" [disabled]="busy()" (click)="open(r, 'reject')">Decline</button>
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
              <p class="ol-empty-title">No requests here</p>
              <p class="ol-empty-sub">Cancellation requests from customers will appear in this list</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>

  <div *ngIf="message()" class="ap-msg" [class.ap-msg-err]="isError()">{{ message() }}</div>

  <!-- Decision with an optional note -->
  <p-dialog [header]="mode === 'approve' ? 'Approve cancellation' : 'Decline cancellation'" [(visible)]="dialogOpen" [modal]="true" [style]="{width:'min(440px, 94vw)'}" [draggable]="false">
    <p class="ap-dlg-text">Order <strong>#{{ current?.orderNumber }}</strong> — {{ current?.customerName }}</p>
    <p class="ap-dlg-text" *ngIf="mode === 'approve' && current?.wasDispatched">The order is already dispatched: cancel the shipment in the Delhivery portal too, and restock the goods when the parcel returns.</p>
    <textarea class="ap-dlg-input" rows="3" [(ngModel)]="note" placeholder="Note for the customer (optional)"></textarea>
    <ng-template pTemplate="footer">
      <button type="button" class="ap-btn ap-btn-ghost" (click)="dialogOpen = false">Back</button>
      <button type="button" class="ap-btn" [class.ap-btn-ok]="mode === 'approve'" [class.ap-btn-danger]="mode === 'reject'" [disabled]="busy()" (click)="confirm()">
        {{ mode === 'approve' ? 'Approve and cancel order' : 'Decline request' }}
      </button>
    </ng-template>
  </p-dialog>
</div>
  `,
  styles: [ADMIN_LIST_THEME, `
.ol-kpi-row.ap-three { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
.ap-tab { text-align: left; cursor: pointer; font-family: inherit; width: 100%; }
.ap-tab-active { box-shadow: 0 0 0 2px #0F766E, 0 6px 16px rgba(15,118,110,0.12) !important; }
.ap-dt table { width: 100% !important; }
.ap-awb { font-family: monospace; font-size: 10.5px; color: #64748B; margin-top: 3px; overflow-wrap: anywhere; }
.ap-reason { font-size: 12px; color: #334155; line-height: 1.4; overflow-wrap: anywhere; }
.ap-note { font-size: 11px; color: #64748B; margin-top: 3px; overflow-wrap: anywhere; }
.ap-warn { font-size: 11px; color: #B45309; margin-top: 3px; line-height: 1.35; }
.ap-show-sm { display: none; margin-top: 3px; }
.ap-actions { gap: 5px !important; flex-wrap: wrap; justify-content: flex-end; }
.ap-btn { border: 1px solid transparent; border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.ap-btn:disabled { opacity: .4; cursor: not-allowed; }
.ap-btn-ok { background: #0F766E; color: #fff; }
.ap-btn-ok:hover:not(:disabled) { background: #0D6659; }
.ap-btn-ghost { background: #fff; color: #475569; border-color: #E2E8F0; }
.ap-btn-danger { background: #DC2626; color: #fff; }
.ap-msg { margin-top: 12px; font-size: 13px; color: #15803D; }
.ap-msg-err { color: #DC2626; }
.ap-dlg-text { font-size: 13px; color: #475569; margin: 0 0 10px; }
.ap-dlg-input { width: 100%; border: 1px solid #E2E8F0; border-radius: 8px; padding: 9px 11px; font-size: 13px; font-family: inherit; resize: none; box-sizing: border-box; }
.ap-dlg-input:focus { outline: none; border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
@media (max-width: 900px) {
  .ap-hide-sm { display: none !important; }
  .ap-show-sm { display: block; }
  .ap-dt .p-datatable-table { min-width: 0 !important; table-layout: fixed !important; width: 100% !important; }
  .ol-table-card { overflow-x: hidden !important; }
  .ap-dt th:nth-child(1) { width: 30% !important; }
  .ap-dt th:nth-child(6) { width: 24% !important; }
  .ap-dt th:nth-child(7) { width: 88px !important; }
  .ap-dt .p-datatable-thead > tr > th, .ap-dt .p-datatable-tbody > tr > td { padding-left: 8px !important; padding-right: 8px !important; }
  .ap-dt .ol-order-no { overflow-wrap: anywhere; word-break: break-all; white-space: normal; font-size: 11.5px; }
  .ap-dt .ol-cust-name, .ap-dt .ol-cust-email { overflow-wrap: anywhere; }
  .ap-actions { flex-direction: column; align-items: stretch; }
  .ap-actions .ap-btn { width: 100%; }
  .ap-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 600px) { .ap-btn { padding: 4px 7px; font-size: 11px; } .ap-three .ol-kpi-card { padding: 10px; min-height: 96px; } .ap-three .ol-kpi-num { font-size: 22px; } .ap-three .ol-kpi-lbl { font-size: 10px; } }
`]
})
export class AdminCancelRequestsComponent implements OnInit {
  private api = inject(ApiService);
  @ViewChild('dt') dt!: Table;

  readonly tabs = [
    { key: 'Pending', label: 'Waiting', icon: 'pi-clock', color: 'amber' },
    { key: 'Approved', label: 'Approved', icon: 'pi-check-circle', color: 'teal' },
    { key: 'Rejected', label: 'Declined', icon: 'pi-times-circle', color: 'purple' },
  ];

  rows = signal<CancelRow[]>([]);
  counts = signal<Record<string, number>>({ Pending: 0, Approved: 0, Rejected: 0 });
  active = signal('Pending');
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  isError = signal(false);
  searchValue = '';

  dialogOpen = false;
  mode: 'approve' | 'reject' = 'approve';
  current: CancelRow | null = null;
  note = '';

  ngOnInit(): void { this.reload(); }

  /** PDF of the list that is open (Pending, Approved or Rejected). */
  exportPdf(): void {
    const list = this.rows();
    downloadPdf({
      title: 'Cancel requests report', filename: 'cancel-requests',
      subtitle: [`List: ${this.active()}`],
      summary: [['Requests', String(list.length)]],
      columns: ['Order', 'Requested (IST)', 'Customer', 'Email', 'Reason', 'Status', 'Order status', 'AWB', 'Team note'],
      rows: list.map(r => [r.orderNumber, istDateTime(r.createdAt), r.customerName, r.customerEmail, r.reason, r.status, r.orderStatus, r.awb ?? '', r.adminNotes ?? ''])
    });
  }

  reload(): void { this.loadCounts(); this.loadRows(); }

  select(k: string): void { this.active.set(k); this.message.set(''); this.searchValue = ''; this.loadRows(); }

  private loadCounts(): void {
    for (const t of this.tabs)
      this.api.get<any>('cancel-requests', { status: t.key, page: 1, pageSize: 1 }).subscribe({
        next: r => this.counts.update(c => ({ ...c, [t.key]: r.data?.totalCount ?? 0 })),
        error: () => {}
      });
  }

  private loadRows(): void {
    this.loading.set(true);
    this.api.get<any>('cancel-requests', { status: this.active(), page: 1, pageSize: 100 }).subscribe({
      next: r => { this.rows.set([...(r.data?.items ?? [])]); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  /** Same colours as the order status badges. */
  orderBadge(s: string): string {
    return ({ Pending: 'ol-os-pending', Confirmed: 'ol-os-confirmed', Shipped: 'ol-os-shipped', Delivered: 'ol-os-delivered', Cancelled: 'ol-os-cancelled', Returned: 'ol-os-returned' } as Record<string, string>)[s] ?? '';
  }
  requestBadge(s: string): string {
    return s === 'Pending' ? 'ol-os-pending' : s === 'Approved' ? 'ol-os-delivered' : 'ol-os-returned';
  }

  open(r: CancelRow, mode: 'approve' | 'reject'): void { this.current = r; this.mode = mode; this.note = ''; this.dialogOpen = true; }

  confirm(): void {
    if (!this.current) return;
    const r = this.current;
    this.dialogOpen = false;
    this.busy.set(true); this.message.set('');
    this.api.post<string>(`cancel-requests/${r.id}/${this.mode}`, { notes: this.note.trim() || null }).subscribe({
      next: res => { this.busy.set(false); this.isError.set(false); this.message.set(String(res.data ?? res.message)); this.reload(); },
      error: e => { this.busy.set(false); this.isError.set(true); this.message.set(e?.error?.message || 'The action failed.'); }
    });
  }
}
