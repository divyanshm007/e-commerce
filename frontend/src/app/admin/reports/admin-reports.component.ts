import { Component, OnInit, inject, signal, ViewEncapsulation } from '@angular/core';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { OrderService } from '../../core/services/order.service';
import { OrderList, OrderStatus } from '../../core/models/order.models';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, CurrencyPipe, DatePipe, FormsModule, TableModule, SkeletonModule],
  template: `
<div class="rp-page">

  <!-- Header -->
  <div class="rp-page-header">
    <div>
      <h1 class="rp-page-title">Reports</h1>
      <p class="rp-page-sub">Sales analytics and insights</p>
    </div>
  </div>

  <!-- Date Range Filter -->
  <div class="rp-filter-card">
    <div class="rp-filter-label"><i class="pi pi-calendar"></i> Date Range</div>
    <div class="rp-filter-row">
      <div class="rp-filter-group">
        <label class="rp-filter-lbl">From</label>
        <input type="date" [(ngModel)]="fromDate" class="rp-date-inp" />
      </div>
      <div class="rp-filter-sep">—</div>
      <div class="rp-filter-group">
        <label class="rp-filter-lbl">To</label>
        <input type="date" [(ngModel)]="toDate" class="rp-date-inp" />
      </div>
      <button class="rp-apply-btn" (click)="loadReports()"><i class="pi pi-search"></i> Apply</button>
      <button class="rp-reset-btn" (click)="resetFilter()"><i class="pi pi-refresh"></i> Reset</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="rp-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="rp-kpi-card rp-kpi-skeleton">
          <p-skeleton width="48px" height="48px" styleClass="rp-sk-icon" />
          <p-skeleton width="65%" height="30px" styleClass="rp-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="rp-kpi-card rp-card-green">
        <div class="rp-kpi-icon rp-icon-green"><i class="pi pi-indian-rupee"></i></div>
        <div class="rp-kpi-num">{{ totalRevenue() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="rp-kpi-lbl">Total Revenue</div>
      </div>
      <div class="rp-kpi-card rp-card-blue">
        <div class="rp-kpi-icon rp-icon-blue"><i class="pi pi-file-check"></i></div>
        <div class="rp-kpi-num">{{ ordersCount() }}</div>
        <div class="rp-kpi-lbl">Total Orders</div>
      </div>
      <div class="rp-kpi-card rp-card-amber">
        <div class="rp-kpi-icon rp-icon-amber"><i class="pi pi-chart-line"></i></div>
        <div class="rp-kpi-num">{{ avgOrderValue() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="rp-kpi-lbl">Avg Order Value</div>
      </div>
      <div class="rp-kpi-card rp-card-purple">
        <div class="rp-kpi-icon rp-icon-purple"><i class="pi pi-truck"></i></div>
        <div class="rp-kpi-num">{{ deliveredCount() }}</div>
        <div class="rp-kpi-lbl">Delivered Orders</div>
      </div>
    }
  </div>

  <p class="rp-range-note" *ngIf="!loading()">
    Showing {{ rangeNote() }} (India time). Revenue and average exclude cancelled and returned orders<span *ngIf="cancelledCount() > 0"> ({{ cancelledCount() }} cancelled in this period)</span>.
  </p>

  <!-- Top Orders Table -->
  @if (!loading()) {
    <div class="rp-table-card">
      <div class="rp-table-head">
        <div class="rp-table-head-icon"><i class="pi pi-list"></i></div>
        <div>
          <div class="rp-table-head-title">Top 10 Orders by Amount</div>
          <div class="rp-table-head-sub">Highest value orders in the selected period</div>
        </div>
      </div>

      <p-table [value]="topOrders()" styleClass="rp-dt" [tableStyle]="{'min-width':'620px'}">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="rp-th-center">#</th>
            <th style="width:110px">Order #</th>
            <th>Customer</th>
            <th pSortableColumn="createdAt" style="width:115px">Date <p-sortIcon field="createdAt" /></th>
            <th style="width:65px" class="rp-th-center">Items</th>
            <th style="width:110px" class="rp-th-center">Status</th>
            <th style="width:130px" class="rp-th-right">Amount</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-o let-i="rowIndex">
          <tr>
            <td class="rp-td-center">
              <span class="rp-rank" [class.rp-rank-gold]="i===0" [class.rp-rank-silver]="i===1" [class.rp-rank-bronze]="i===2">{{ i + 1 }}</span>
            </td>
            <td><span class="rp-order-num">#{{ o.orderNumber }}</span></td>
            <td><span class="rp-customer">{{ o.customerName || 'Guest' }}</span></td>
            <td><span class="rp-date">{{ o.createdAt | date:'dd MMM yyyy' }}</span></td>
            <td class="rp-td-center"><span class="rp-items">{{ o.itemCount }}</span></td>
            <td class="rp-td-center">
              <span class="rp-status-pill" [class]="'rp-status-' + o.status">
                {{ statusLabel(o.status) }}
              </span>
            </td>
            <td class="rp-td-right"><span class="rp-amount">{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span></td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="rp-empty">
              <div class="rp-empty-icon"><i class="pi pi-chart-bar"></i></div>
              <p class="rp-empty-title">No orders in selected period</p>
              <p class="rp-empty-sub">Try adjusting the date range filter above.</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    </div>
  }
</div>
  `,
  styles: [`

/* ================================================================
   REPORTS — ViewEncapsulation.None, all selectors .rp-*
================================================================ */

.rp-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.rp-page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.rp-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; }
.rp-page-sub    { font-size: 13px; color: #64748B; margin: 2px 0 0; }

/* Date filter */
.rp-filter-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.rp-filter-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
.rp-filter-label .pi { font-size: 12px; }
.rp-filter-row  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rp-filter-group { display: flex; align-items: center; gap: 7px; }
.rp-filter-lbl  { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }
.rp-range-note { font-size: 12.5px; color: #64748B; margin: -4px 4px 14px; }
.rp-filter-sep  { font-size: 13px; color: #CBD5E1; }
.rp-date-inp    { height: 34px; border: 1px solid #E2E8F0; border-radius: 7px; padding: 0 10px; font-size: 12.5px; color: #0F172A; background: #F8FAFC; outline: none; }
.rp-date-inp:focus { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.rp-apply-btn   { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.rp-apply-btn:hover { background: #115E59; }
.rp-apply-btn .pi { font-size: 10px; }
.rp-reset-btn   { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12px; font-weight: 500; cursor: pointer; }
.rp-reset-btn:hover { background: #F8FAFC; }
.rp-reset-btn .pi { font-size: 10px; }

/* KPI */
.rp-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.rp-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 18px; min-height: 140px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.rp-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.rp-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 18px; min-height: 140px; display: flex; flex-direction: column; gap: 8px; }
.rp-card-green  { border-top-color: #16A34A !important; }
.rp-card-blue   { border-top-color: #2563EB !important; }
.rp-card-amber  { border-top-color: #D97706 !important; }
.rp-card-purple { border-top-color: #7C3AED !important; }
.rp-kpi-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; margin-bottom: 12px; }
.rp-icon-green  { background: linear-gradient(135deg,#4caf50,#2e7d32); color: #fff; }
.rp-icon-blue   { background: linear-gradient(135deg,#2196f3,#1565c0); color: #fff; }
.rp-icon-amber  { background: linear-gradient(135deg,#ff9800,#e65100); color: #fff; }
.rp-icon-purple { background: linear-gradient(135deg,#9c27b0,#6a1b9a); color: #fff; }
.rp-kpi-num { font-size: 24px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.rp-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.rp-sk-icon { border-radius: 10px !important; margin-bottom: 12px; display: block; }
.rp-sk-num  { display: block; }

/* Table card */
.rp-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); }
.rp-table-head { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.rp-table-head-icon { width: 36px; height: 36px; border-radius: 9px; background: #F0FDF9; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.rp-table-head-title { font-size: 14px; font-weight: 700; color: #0F172A; }
.rp-table-head-sub   { font-size: 11.5px; color: #94A3B8; margin-top: 1px; }

/* Table header/body */
.rp-th-center { text-align: center !important; }
.rp-th-right  { text-align: right !important; }
.rp-td-center { text-align: center !important; }
.rp-td-right  { text-align: right !important; }
.rp-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.rp-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; }
.rp-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.rp-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 60px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; }
.rp-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.rp-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }

/* Cells */
.rp-rank        { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #F1F5F9; color: #94A3B8; font-size: 11px; font-weight: 700; }
.rp-rank-gold   { background: #FEF9C3; color: #CA8A04; }
.rp-rank-silver { background: #F1F5F9; color: #64748B; }
.rp-rank-bronze { background: #FEF0E6; color: #C2410C; }
.rp-order-num   { font-size: 13px; font-weight: 700; color: #0F766E; font-variant-numeric: tabular-nums; }
.rp-customer    { font-size: 13px; color: #334155; }
.rp-date        { font-size: 12px; color: #64748B; }
.rp-items       { font-size: 12.5px; font-weight: 500; color: #334155; }
.rp-amount      { font-size: 14px; font-weight: 700; color: #0F172A; font-variant-numeric: tabular-nums; }
.rp-status-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.rp-status-1 { background: #FFFBEB; color: #D97706; }
.rp-status-2 { background: #EFF6FF; color: #2563EB; }
.rp-status-3 { background: #F0FDF9; color: #0F766E; }
.rp-status-4 { background: #F0FDF4; color: #16A34A; }
.rp-status-5 { background: #FEF2F2; color: #DC2626; }
.rp-status-6 { background: #F1F5F9; color: #64748B; }
.rp-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; gap: 2px; }
.rp-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.rp-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.rp-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.rp-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }

  `]
})
export class AdminReportsComponent implements OnInit {
  private orderService = inject(OrderService);

  loading       = signal(true);
  totalRevenue  = signal(0);
  ordersCount   = signal(0);
  avgOrderValue = signal(0);
  deliveredCount = signal(0);
  topOrders     = signal<OrderList[]>([]);

  fromDate = this.thirtyDaysAgo();
  toDate   = this.today();
  cancelledCount = signal(0);
  rangeNote = signal('');

  ngOnInit(): void { this.loadReports(); }

  /** A calendar day in the admin's own time zone (toISOString would give the UTC day, which can be yesterday in India). */
  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  today(): string { return this.ymd(new Date()); }

  thirtyDaysAgo(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return this.ymd(d);
  }

  resetFilter(): void {
    this.fromDate = this.thirtyDaysAgo();
    this.toDate   = this.today();
    this.loadReports();
  }

  loadReports(): void {
    // a reversed range is swapped, so "from" is never after "to"
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) [this.fromDate, this.toDate] = [this.toDate, this.fromDate];
    this.loading.set(true);

    // the totals are worked out by the server over ALL orders in the range (the old page only saw the first 100)
    this.orderService.getReport(this.fromDate, this.toDate).subscribe({
      next: res => {
        const r = res.data;
        this.ordersCount.set(r?.ordersCount ?? 0);
        this.totalRevenue.set(r?.revenue ?? 0);
        this.avgOrderValue.set(r?.averageOrderValue ?? 0);
        this.deliveredCount.set(r?.deliveredCount ?? 0);
        this.cancelledCount.set(r?.cancelledCount ?? 0);
        this.topOrders.set(r?.topOrders ?? []);
        this.rangeNote.set(`${this.fromDate || 'the beginning'} to ${this.toDate || 'today'}`);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  statusLabel(s: OrderStatus): string {
    const m: Record<number, string> = { 1:'Pending', 2:'Confirmed', 3:'Shipped', 4:'Delivered', 5:'Cancelled', 6:'Returned' };
    return m[s] ?? 'Unknown';
  }
}
