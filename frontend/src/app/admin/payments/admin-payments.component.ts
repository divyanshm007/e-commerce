import { Component, OnInit, inject, signal, computed, ViewEncapsulation, ViewChild } from '@angular/core';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../core/services/api.service';
import { PaymentStatus, PaymentMethod } from '../../core/models/order.models';

interface Payment {
  id: string; orderId: string; orderNumber: string;
  customerName?: string; customerEmail?: string;
  amount: number; method: PaymentMethod; status: PaymentStatus;
  razorpayPaymentId?: string; paidAt?: string; createdAt: string;
}

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgIf, CurrencyPipe, DatePipe, FormsModule, RouterLink,
    TableModule, ButtonModule, SkeletonModule,
    InputTextModule, SelectModule, TooltipModule
  ],
  template: `
<div class="pay-page">

  <!-- Page Header -->
  <div class="pay-page-header">
    <div>
      <h1 class="pay-page-title">Payments</h1>
      <p class="pay-page-sub">Payment transaction history</p>
    </div>
    <button class="pay-refresh-btn" (click)="load()" title="Refresh">
      <i class="pi pi-refresh"></i>
    </button>
  </div>

  <!-- KPI Cards -->
  <div class="pay-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="pay-kpi-card pay-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="pay-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="pay-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="pay-kpi-card pay-card-teal">
        <div class="pay-kpi-icon pay-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="pay-kpi-num">{{ paidCount() }}</div>
        <div class="pay-kpi-lbl">Paid</div>
      </div>
      <div class="pay-kpi-card pay-card-amber">
        <div class="pay-kpi-icon pay-icon-amber"><i class="pi pi-clock"></i></div>
        <div class="pay-kpi-num">{{ pendingCount() }}</div>
        <div class="pay-kpi-lbl">Pending</div>
      </div>
      <div class="pay-kpi-card pay-card-red">
        <div class="pay-kpi-icon pay-icon-red"><i class="pi pi-times-circle"></i></div>
        <div class="pay-kpi-num">{{ failedCount() }}</div>
        <div class="pay-kpi-lbl">Failed</div>
      </div>
      <div class="pay-kpi-card pay-card-purple">
        <div class="pay-kpi-icon pay-icon-purple"><i class="pi pi-indian-rupee"></i></div>
        <div class="pay-kpi-num pay-kpi-num--sm">{{ totalRevenue() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="pay-kpi-lbl">Total Revenue</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="pay-table-card">

    @if (loading()) {
      <div class="pay-load-toolbar">
        <p-skeleton width="32px" height="32px" styleClass="pay-sk-sq" />
      </div>
      <div class="pay-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="pay-load-row" [style.opacity]="(8 - r) / 8"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="pay-filter-bar">
          <span class="pay-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="pay-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <div class="pay-toolbar">
        <div class="pay-search-wrap">
          <i class="pi pi-search pay-search-icon"></i>
          <input class="pay-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="pay-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="pay-toolbar-spacer"></div>
        <button class="pay-icon-btn" (click)="load()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table
        #dt
        [value]="payments()"
        [globalFilterFields]="['orderNumber', 'customerName']"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} payments"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="pay-dt"
        [tableStyle]="{'min-width':'820px'}"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="orderNumber" style="width:100px">
              Order # <p-sortIcon field="orderNumber" />
              <p-columnFilter type="text" field="orderNumber" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="customerName">
              Customer <p-sortIcon field="customerName" />
              <p-columnFilter type="text" field="customerName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="amount" style="width:110px">
              Amount <p-sortIcon field="amount" />
              <p-columnFilter type="text" field="amount" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="method" style="width:105px">
              Method <p-sortIcon field="method" />
              <p-columnFilter field="method" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="methodOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="pay-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="status" style="width:105px">
              Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="pay-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="razorpayPaymentId">
              Transaction ID <p-sortIcon field="razorpayPaymentId" />
              <p-columnFilter type="text" field="razorpayPaymentId" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="paidAt" style="width:140px">
              Paid At <p-sortIcon field="paidAt" />
              <p-columnFilter type="text" field="paidAt" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th style="width:60px" class="pay-th-center">Order</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-p>
          <tr>
            <td>
              <a [routerLink]="['/admin/orders', p.orderId]" class="pay-order-no">#{{ p.orderNumber }}</a>
            </td>
            <td>
              <div class="pay-cust-name">{{ p.customerName || 'Guest' }}</div>
              <div class="pay-cust-email" *ngIf="p.customerEmail">{{ p.customerEmail }}</div>
            </td>
            <td><span class="pay-amount">{{ p.amount | currency:'INR':'symbol':'1.0-0' }}</span></td>
            <td>
              <span class="pay-method">
                <i [class]="p.method === 1 ? 'pi pi-credit-card' : 'pi pi-truck'"></i>
                {{ methodLabel(p.method) }}
              </span>
            </td>
            <td>
              <span class="pay-badge" [class]="statusBadgeClass(p.status)">
                {{ statusLabel(p.status) }}
              </span>
            </td>
            <td>
              <span class="pay-txn" *ngIf="p.razorpayPaymentId">{{ p.razorpayPaymentId }}</span>
              <span class="pay-nil" *ngIf="!p.razorpayPaymentId">—</span>
            </td>
            <td>
              <span class="pay-date" *ngIf="p.paidAt">{{ p.paidAt | date:'dd MMM yy, HH:mm' }}</span>
              <span class="pay-nil" *ngIf="!p.paidAt">—</span>
            </td>
            <td>
              <div class="pay-actions">
                <a [routerLink]="['/admin/orders', p.orderId]" class="pay-act-btn"
                  pTooltip="View order" tooltipPosition="left">
                  <i class="pi pi-external-link"></i>
                </a>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="pay-empty">
              <div class="pay-empty-icon"><i class="pi pi-credit-card"></i></div>
              <p class="pay-empty-title">No payments found</p>
              <p class="pay-empty-sub">Try adjusting your filters</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>
  `,
  styles: [`

/* ================================================================
   PAYMENTS — ViewEncapsulation.None, all selectors .pay-*
================================================================ */

.pay-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.pay-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.pay-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.pay-page-sub    { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.pay-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px; margin-top: 2px;
  transition: background 0.14s, color 0.14s;
}
.pay-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

/* KPI */
.pay-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.pay-kpi-card {
  background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.pay-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.pay-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.pay-card-teal   { border-top-color: #0F766E !important; }
.pay-card-amber  { border-top-color: #D97706 !important; }
.pay-card-red    { border-top-color: #DC2626 !important; }
.pay-card-purple { border-top-color: #7C3AED !important; }

.pay-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.pay-icon-teal   { background: #F0FDFA; color: #0F766E; }
.pay-icon-amber  { background: #FFFBEB; color: #D97706; }
.pay-icon-red    { background: #FEF2F2; color: #DC2626; }
.pay-icon-purple { background: #F5F3FF; color: #7C3AED; }

.pay-kpi-num     { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.pay-kpi-num--sm { font-size: 18px; }
.pay-kpi-lbl     { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.pay-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.pay-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.pay-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }

/* Filter bar */
.pay-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.pay-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.pay-filter-info .pi { font-size: 11px; }
.pay-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.pay-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.pay-clear-all-btn .pi { font-size: 10px; }

/* Loading */
.pay-load-toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.pay-sk-sq { border-radius: 7px !important; display: block; }
.pay-load-head { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.pay-load-row  { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.pay-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.pay-toolbar-spacer { flex: 1; }
.pay-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.pay-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.pay-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.pay-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.pay-search-input::placeholder { color: #CBD5E1; }
.pay-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.pay-search-clear:hover { background: #CBD5E1; }
.pay-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.13s; }
.pay-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

.pay-dt.p-datatable .p-datatable-caption,
.pay-dt.p-datatable .p-datatable-header { padding: 0 !important; border: none !important; background: transparent !important; }

/* Table header */
.pay-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.pay-th-center { text-align: center !important; }

/* Sort & filter icons */
.pay-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.pay-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.pay-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.pay-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transition: background 0.12s, color 0.12s; }
.pay-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.pay-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Rows */
.pay-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 52px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.pay-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.pay-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; transition: background 150ms ease; }

/* Paginator */
.pay-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }

/* Cell content */
.pay-order-no   { font-size: 12.5px; font-weight: 600; color: #0F766E; text-decoration: none; }
.pay-order-no:hover { text-decoration: underline; }
.pay-cust-name  { font-size: 13px; font-weight: 500; color: #0F172A; line-height: 1.3; }
.pay-cust-email { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.pay-amount     { font-size: 13px; font-weight: 600; color: #0F172A; }
.pay-method     { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 4px; background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 500; }
.pay-method .pi { font-size: 10px; }
.pay-txn        { font-family: 'Courier New', monospace; font-size: 11px; color: #475569; }
.pay-date       { font-size: 12px; color: #475569; }
.pay-nil        { color: #CBD5E1; }

/* Status badges */
.pay-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; line-height: 1.5; white-space: nowrap; }
.pay-s-paid     { background: #F0FDF4; color: #16A34A; }
.pay-s-pending  { background: #FFFBEB; color: #CA8A04; }
.pay-s-failed   { background: #FEF2F2; color: #DC2626; }
.pay-s-refunded { background: #EFF6FF; color: #2563EB; }

/* Col select */
.pay-col-sel { width: 100% !important; font-size: 12px !important; }

/* Actions */
.pay-actions { display: flex; align-items: center; justify-content: center; }
.pay-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: #0F766E; text-decoration: none; transition: background 0.12s, color 0.12s; }
.pay-act-btn:hover { background: #F0FDFA; color: #0D6659; }
.pay-act-btn .pi { font-size: 13px; }

/* Empty */
.pay-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 24px; text-align: center; }
.pay-empty-icon { width: 34px; height: 34px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.pay-empty-icon .pi { font-size: 15px; color: #94A3B8; }
.pay-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.pay-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }
@media (max-width: 768px) { .pay-table-card { min-width: 0; overflow-x: auto !important; } }

  `]
})
export class AdminPaymentsComponent implements OnInit {
  private api = inject(ApiService);

  @ViewChild('dt') dt!: Table;
  searchValue = '';

  payments = signal<Payment[]>([]);
  loading  = signal(true);

  paidCount    = computed(() => this.payments().filter(p => p.status === PaymentStatus.Paid).length);
  pendingCount = computed(() => this.payments().filter(p => p.status === PaymentStatus.Pending).length);
  failedCount  = computed(() => this.payments().filter(p => p.status === PaymentStatus.Failed).length);
  totalRevenue = computed(() => this.payments().filter(p => p.status === PaymentStatus.Paid).reduce((s, p) => s + (p.amount ?? 0), 0));

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Pending',  value: 1 },
    { label: 'Paid',     value: 2 },
    { label: 'Failed',   value: 3 },
    { label: 'Refunded', value: 4 }
  ];
  methodOptions = [
    { label: 'Razorpay', value: 1 },
    { label: 'COD',      value: 2 }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<any>('payments', { page: 1, pageSize: 500 }).subscribe({
      next: res => {
        const data = res.data;
        const items: Payment[] = (data && 'items' in data) ? data.items ?? [] : Array.isArray(data) ? data : [];
        this.payments.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onTableFilter(event: any): void {
    let count = 0;
    for (const key of Object.keys(event.filters ?? {})) {
      const rules = event.filters[key];
      if (Array.isArray(rules)) count += rules.filter((r: any) => r.value !== null && r.value !== undefined && r.value !== '').length;
    }
    this.activeFilterCount.set(count);
  }

  clearAllFilters(): void { this.dt.clear(); this.activeFilterCount.set(0); }

  methodLabel(m: PaymentMethod): string { return m === PaymentMethod.Razorpay ? 'Razorpay' : 'COD'; }

  statusLabel(s: PaymentStatus): string {
    return ({ 1: 'Pending', 2: 'Paid', 3: 'Failed', 4: 'Refunded', 5: 'Partial Refund' } as any)[s] ?? 'Unknown';
  }

  statusBadgeClass(s: PaymentStatus): string {
    return ({ 1: 'pay-s-pending', 2: 'pay-s-paid', 3: 'pay-s-failed', 4: 'pay-s-refunded' } as any)[s] ?? '';
  }
}
