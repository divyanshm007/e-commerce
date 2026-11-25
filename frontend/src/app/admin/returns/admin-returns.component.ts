import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-returns',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgIf, DatePipe, FormsModule, TableModule, SkeletonModule, ToastModule, SelectModule, TooltipModule],
  template: `
<p-toast />

<div class="rt-page">

  <!-- Header -->
  <div class="rt-page-header">
    <div>
      <h1 class="rt-page-title">Return Requests</h1>
      <p class="rt-page-sub">{{ totalCount() }} customer return & refund requests</p>
    </div>
    <button class="rt-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
  </div>

  <!-- KPI Cards -->
  <div class="rt-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="rt-kpi-card rt-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="rt-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="rt-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="rt-kpi-card rt-card-blue">
        <div class="rt-kpi-icon rt-icon-blue"><i class="pi pi-reply"></i></div>
        <div class="rt-kpi-num">{{ totalCount() }}</div>
        <div class="rt-kpi-lbl">Total Requests</div>
      </div>
      <div class="rt-kpi-card rt-card-amber">
        <div class="rt-kpi-icon rt-icon-amber"><i class="pi pi-clock"></i></div>
        <div class="rt-kpi-num">{{ pendingCount() }}</div>
        <div class="rt-kpi-lbl">Pending</div>
      </div>
      <div class="rt-kpi-card rt-card-teal">
        <div class="rt-kpi-icon rt-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="rt-kpi-num">{{ approvedCount() }}</div>
        <div class="rt-kpi-lbl">Approved</div>
      </div>
      <div class="rt-kpi-card rt-card-red">
        <div class="rt-kpi-icon rt-icon-red"><i class="pi pi-times-circle"></i></div>
        <div class="rt-kpi-num">{{ rejectedCount() }}</div>
        <div class="rt-kpi-lbl">Rejected</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="rt-table-card">

    @if (loading()) {
      <div class="rt-load-toolbar"></div>
      <div class="rt-load-head"></div>
      @for (r of [1,2,3,4,5,6]; track r) {
        <div class="rt-load-row" [style.opacity]="(7-r)/7"></div>
      }
    }

    @if (!loading()) {
      @if (hasActiveFilters()) {
        <div class="rt-filter-bar">
          <span class="rt-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="rt-clear-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="rt-toolbar">
        <div class="rt-search-wrap">
          <i class="pi pi-search rt-search-icon"></i>
          <input class="rt-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="rt-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="rt-toolbar-spacer"></div>
        <button class="rt-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="returns()"
        [globalFilterFields]="['orderNumber', 'customerName']"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="rt-dt" [tableStyle]="{'min-width':'760px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="rt-th-center">#</th>
            <th pSortableColumn="orderNumber" style="width:120px">
              Order # <p-sortIcon field="orderNumber" />
              <p-columnFilter type="text" field="orderNumber" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="customerName">
              Customer <p-sortIcon field="customerName" />
              <p-columnFilter type="text" field="customerName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th>Reason</th>
            <th pSortableColumn="createdAt" style="width:115px">
              Date <p-sortIcon field="createdAt" />
            </th>
            <th pSortableColumn="status" style="width:120px" class="rt-th-center">
              Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value" (onChange)="filter($event.value)"
                    placeholder="All" [showClear]="true" styleClass="rt-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:155px" class="rt-th-center">Update Status</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-r let-i="rowIndex">
          <tr>
            <td class="rt-td-center rt-row-idx">{{ i + 1 }}</td>
            <td><span class="rt-order-num">#{{ r.orderNumber }}</span></td>
            <td>
              <div class="rt-customer-name">{{ r.customerName }}</div>
              <div class="rt-customer-email">{{ r.customerEmail }}</div>
            </td>
            <td><div class="rt-reason">{{ r.reason }}</div></td>
            <td><span class="rt-date">{{ r.createdAt | date:'dd MMM yyyy' }}</span></td>
            <td class="rt-td-center">
              <span class="rt-status-pill" [class]="'rt-status-' + r.status?.toLowerCase()">
                <span class="rt-status-dot"></span>{{ r.status }}
              </span>
            </td>
            <td class="rt-td-center">
              <p-select [options]="statusOptions" [ngModel]="r.status" optionLabel="label" optionValue="value"
                (onChange)="updateStatus(r.id, $event.value)" styleClass="rt-row-sel" />
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="rt-empty">
              <div class="rt-empty-icon"><i class="pi pi-reply"></i></div>
              <p class="rt-empty-title">No return requests</p>
              <p class="rt-empty-sub">Return requests submitted by customers will appear here.</p>
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
   RETURNS — ViewEncapsulation.None, all selectors .rt-*
================================================================ */

.rt-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }
.rt-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.rt-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; }
.rt-page-sub    { font-size: 13px; color: #64748B; margin: 2px 0 0; }
.rt-refresh-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.rt-refresh-btn:hover { background: #F8FAFC; }

/* KPI */
.rt-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.rt-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.rt-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.rt-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.rt-card-blue  { border-top-color: #2563EB !important; }
.rt-card-amber { border-top-color: #D97706 !important; }
.rt-card-teal  { border-top-color: #0F766E !important; }
.rt-card-red   { border-top-color: #DC2626 !important; }
.rt-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; }
.rt-icon-blue  { background: #EFF6FF; color: #2563EB; }
.rt-icon-amber { background: #FFFBEB; color: #D97706; }
.rt-icon-teal  { background: #F0FDFA; color: #0F766E; }
.rt-icon-red   { background: #FEF2F2; color: #DC2626; }
.rt-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; margin-bottom: 5px; font-variant-numeric: tabular-nums; }
.rt-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.rt-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.rt-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.rt-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.rt-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rt-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.rt-clear-btn   { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.rt-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.rt-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rt-load-row     { height: 68px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.rt-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.rt-toolbar-spacer { flex: 1; }
.rt-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.rt-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.rt-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.rt-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.rt-search-input::placeholder { color: #CBD5E1; }
.rt-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.rt-search-clear:hover { background: #CBD5E1; }
.rt-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.rt-col-sel { width: 100% !important; font-size: 12px !important; }
.rt-row-sel { font-size: 12px !important; min-width: 130px; }

/* Table header/body */
.rt-th-center { text-align: center !important; }
.rt-td-center { text-align: center !important; }
.rt-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.rt-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; }
.rt-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.rt-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.rt-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.rt-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.rt-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 68px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.rt-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.rt-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.rt-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.rt-dt .p-column-filter-overlay button.p-button { display: none !important; }

/* Cells */
.rt-row-idx      { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.rt-order-num    { font-size: 13px; font-weight: 700; color: #0F766E; font-variant-numeric: tabular-nums; }
.rt-customer-name  { font-size: 13px; font-weight: 600; color: #0F172A; }
.rt-customer-email { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.rt-reason { font-size: 12.5px; color: #334155; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 260px; }
.rt-date   { font-size: 12px; color: #64748B; }
.rt-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.rt-status-dot  { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.rt-status-pending   { background: #FFFBEB; color: #D97706; }
.rt-status-approved  { background: #F0FDF4; color: #16A34A; }
.rt-status-rejected  { background: #FEF2F2; color: #DC2626; }
.rt-status-completed { background: #EFF6FF; color: #2563EB; }
.rt-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; gap: 2px; }
.rt-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.rt-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.rt-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.rt-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }
@media (max-width: 768px) { .rt-table-card { min-width: 0; overflow-x: auto !important; } }

  `]
})
export class AdminReturnsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private api   = inject(ApiService);
  private toast = inject(MessageService);

  loading  = signal(true);
  returns  = signal<any[]>([]);

  totalCount    = computed(() => this.returns().length);
  pendingCount  = computed(() => this.returns().filter(r => r.status === 'Pending').length);
  approvedCount = computed(() => this.returns().filter(r => r.status === 'Approved').length);
  rejectedCount = computed(() => this.returns().filter(r => r.status === 'Rejected').length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Pending',   value: 'Pending' },
    { label: 'Approved',  value: 'Approved' },
    { label: 'Rejected',  value: 'Rejected' },
    { label: 'Completed', value: 'Completed' }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<any>('returns', { page: 1, pageSize: 100 }).subscribe({
      next: res => { this.returns.set(res.data?.items ?? []); this.loading.set(false); },
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

  updateStatus(id: string, status: string) {
    this.api.patch(`returns/${id}/status`, { status }).subscribe({
      next: () => {
        this.returns.update(list => list.map(r => r.id === id ? { ...r, status } : r));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated', life: 2000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Update failed', life: 3000 })
    });
  }
}
