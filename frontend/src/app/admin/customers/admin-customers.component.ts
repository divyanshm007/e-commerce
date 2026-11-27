import { downloadPdf, istDateTime, inr, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../shared/pdf-export';
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

interface Customer {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  ordersCount?: number;
  totalSpent?: number;
  isActive?: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgIf, CurrencyPipe, DatePipe, FormsModule, RouterLink,
    TableModule, ButtonModule, SkeletonModule,
    InputTextModule, SelectModule, TooltipModule
  ],
  template: `
<div class="cu-page">

  <!-- Page Header -->
  <div class="cu-page-header">
    <div>
      <h1 class="cu-page-title">Customers</h1>
      <p class="cu-page-sub">{{ totalCount() }} registered customers</p>
    </div>
<div style="display:flex;gap:8px;align-items:center"><button class="cu-refresh-btn" (click)="exportPdf()" title="Download PDF"><i class="pi pi-file-pdf"></i></button><button class="cu-refresh-btn" (click)="load()" title="Refresh">
      <i class="pi pi-refresh"></i>
    </button></div>
  </div>

  <!-- KPI Cards -->
  <div class="cu-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="cu-kpi-card cu-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="cu-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="cu-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="cu-kpi-card cu-card-blue">
        <div class="cu-kpi-icon cu-icon-blue"><i class="pi pi-users"></i></div>
        <div class="cu-kpi-num">{{ totalCount() }}</div>
        <div class="cu-kpi-lbl">Total Customers</div>
      </div>
      <div class="cu-kpi-card cu-card-teal">
        <div class="cu-kpi-icon cu-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="cu-kpi-num">{{ activeCount() }}</div>
        <div class="cu-kpi-lbl">Active</div>
      </div>
      <div class="cu-kpi-card cu-card-red">
        <div class="cu-kpi-icon cu-icon-red"><i class="pi pi-minus-circle"></i></div>
        <div class="cu-kpi-num">{{ inactiveCount() }}</div>
        <div class="cu-kpi-lbl">Inactive</div>
      </div>
      <div class="cu-kpi-card cu-card-purple">
        <div class="cu-kpi-icon cu-icon-purple"><i class="pi pi-indian-rupee"></i></div>
        <div class="cu-kpi-num cu-kpi-num--sm">{{ totalRevenue() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="cu-kpi-lbl">Total Revenue</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="cu-table-card">

    @if (loading()) {
      <div class="cu-load-toolbar">
        <p-skeleton width="32px" height="32px" styleClass="cu-sk-sq" />
      </div>
      <div class="cu-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="cu-load-row" [style.opacity]="(8 - r) / 8"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="cu-filter-bar">
          <span class="cu-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="cu-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <!-- Toolbar -->
      <div class="cu-toolbar">
        <div class="cu-search-wrap">
          <i class="pi pi-search cu-search-icon"></i>
          <input class="cu-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="cu-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cu-toolbar-spacer"></div>
        <button class="cu-icon-btn" (click)="load()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table
        #dt
        [value]="customers()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} customers"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="cu-dt"
        [tableStyle]="{'width':'100%','table-layout':'fixed'}"
        [globalFilterFields]="['fullName', 'email', 'phone']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:48px"></th>
            <th pSortableColumn="fullName">
              Name <p-sortIcon field="fullName" />
              <p-columnFilter type="text" field="fullName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="phone" class="cu-hide-sm" style="width:130px">
              Phone <p-sortIcon field="phone" />
              <p-columnFilter type="text" field="phone" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="ordersCount" style="width:90px">
              Orders <p-sortIcon field="ordersCount" />
              <p-columnFilter type="text" field="ordersCount" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="totalSpent" style="width:120px">
              Spent <p-sortIcon field="totalSpent" />
              <p-columnFilter type="text" field="totalSpent" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="createdAt" class="cu-hide-sm" style="width:115px">
              Joined <p-sortIcon field="createdAt" />
              <p-columnFilter type="text" field="createdAt" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="isActive" style="width:95px">
              Status <p-sortIcon field="isActive" />
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="cu-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:60px" class="cu-th-center">Action</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <div class="cu-avatar">{{ getInitials(c) }}</div>
            </td>
            <td>
              <div class="cu-name">{{ getFullName(c) }}</div>
              <div class="cu-email">{{ c.email }}</div>
              <div class="cu-phone cu-show-sm">{{ c.phone }}</div>
            </td>
            <td class="cu-hide-sm"><span class="cu-phone">{{ c.phone || '—' }}</span></td>
            <td class="cu-td-center">
              <span class="cu-orders-badge">{{ c.ordersCount ?? 0 }}</span>
            </td>
            <td><span class="cu-spent">{{ (c.totalSpent ?? 0) | currency:'INR':'symbol':'1.0-0' }}</span></td>
            <td class="cu-hide-sm"><span class="cu-date">{{ c.createdAt | date:'dd MMM yyyy' }}</span></td>
            <td>
              <span class="cu-badge" [class]="c.isActive !== false ? 'cu-active' : 'cu-inactive'">
                <span class="cu-dot" [class]="c.isActive !== false ? 'cu-dot-active' : 'cu-dot-inactive'"></span>
                {{ c.isActive !== false ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="cu-actions">
                <a [routerLink]="['/admin/customers', c.id]" class="cu-act-btn"
                  pTooltip="View details" tooltipPosition="left">
                  <i class="pi pi-eye"></i>
                </a>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="cu-empty">
              <div class="cu-empty-icon"><i class="pi pi-users"></i></div>
              <p class="cu-empty-title">No customers found</p>
              <p class="cu-empty-sub">Try adjusting your filters</p>
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
   CUSTOMERS — ViewEncapsulation.None, all selectors .cu-*
================================================================ */

.cu-page {
  min-height: 100vh;
  background: #F6F8FA;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* Header */
.cu-page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 16px;
}
.cu-page-title { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.cu-page-sub   { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.cu-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px; margin-top: 2px;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.cu-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

/* KPI grid */
.cu-kpi-row {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px; margin-bottom: 16px;
}
.cu-kpi-card {
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px;
  display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.cu-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.cu-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.cu-card-blue   { border-top-color: #2563EB !important; }
.cu-card-teal   { border-top-color: #0F766E !important; }
.cu-card-red    { border-top-color: #DC2626 !important; }
.cu-card-purple { border-top-color: #7C3AED !important; }

.cu-kpi-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; margin-bottom: 10px; flex-shrink: 0;
}
.cu-icon-blue   { background: #EFF6FF; color: #2563EB; }
.cu-icon-teal   { background: #F0FDFA; color: #0F766E; }
.cu-icon-red    { background: #FEF2F2; color: #DC2626; }
.cu-icon-purple { background: #F5F3FF; color: #7C3AED; }

.cu-kpi-num      { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.cu-kpi-num--sm  { font-size: 18px; }
.cu-kpi-lbl      { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.cu-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.cu-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.cu-table-card {
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(226,232,240,0.9);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1;
}

/* Filter bar */
.cu-filter-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9;
}
.cu-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.cu-filter-info .pi { font-size: 11px; }
.cu-clear-all-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px;
  background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.cu-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.cu-clear-all-btn .pi { font-size: 10px; }

/* Loading skeleton */
.cu-load-toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cu-sk-sq { border-radius: 7px !important; display: block; }
.cu-load-head { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cu-load-row  { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.cu-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cu-toolbar-spacer { flex: 1; }
.cu-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px;
  transition: background 0.13s, color 0.13s;
}
.cu-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

/* Caption override */
.cu-dt.p-datatable .p-datatable-caption,
.cu-dt.p-datatable .p-datatable-header {
  padding: 0 !important; border: none !important; background: transparent !important;
}

/* Table header */
.cu-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.cu-th-center { text-align: center !important; }

/* Sort icons */
.cu-dt .p-datatable-thead th svg.p-icon {
  width: 9px !important; height: 9px !important; min-width: 9px !important;
  color: #9ECEC5 !important; vertical-align: middle;
}
.cu-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.cu-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }

/* Column filter icon */
.cu-dt .p-column-filter-menu-button {
  width: 16px !important; height: 16px !important; min-width: 16px !important;
  padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important;
  background: transparent !important; color: #B0D8D1 !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important; cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.cu-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.cu-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Table rows */
.cu-dt .p-datatable-tbody > tr > td {
  padding: 0 13px !important; height: 52px !important; vertical-align: middle !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #F1F5F9 !important; color: #334155;
}
.cu-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.cu-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; transition: background 150ms ease; }
.cu-td-center { text-align: center !important; }

/* Paginator */
.cu-table-card .p-paginator {
  padding: 6px 12px !important; min-height: 46px;
  border-top: 1px solid #E2E8F0 !important;
  border-right: none !important; border-left: none !important; border-bottom: none !important;
  border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px;
}

/* Avatar */
.cu-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #0F766E; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0; letter-spacing: 0.05em;
}

/* Cell content */
.cu-name  { font-size: 13px; font-weight: 500; color: #0F172A; line-height: 1.3; }
.cu-email { font-size: 11px; color: #94A3B8; margin-top: 1px; line-height: 1.3; }
.cu-phone { font-size: 12.5px; color: #475569; }
.cu-spent { font-size: 13px; font-weight: 600; color: #0F172A; }
.cu-date  { font-size: 12.5px; color: #475569; }

.cu-orders-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; height: 22px; padding: 0 6px;
  border-radius: 4px; background: #EFF6FF; color: #2563EB;
  font-size: 11.5px; font-weight: 700;
}

/* Status badge */
.cu-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 7px; border-radius: 4px;
  font-size: 11px; font-weight: 500; line-height: 1.5;
}
.cu-active   { background: #F0FDF4; color: #16A34A; }
.cu-inactive { background: #FEF2F2; color: #DC2626; }
.cu-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.cu-dot-active   { background: #16A34A; }
.cu-dot-inactive { background: #DC2626; }

/* Col select in filter overlay */
.cu-col-sel { width: 100% !important; font-size: 12px !important; }

/* Row actions */
.cu-actions { display: flex; align-items: center; justify-content: center; }
.cu-act-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  color: #0F766E; text-decoration: none; transition: background 0.12s, color 0.12s;
}
.cu-act-btn:hover { background: #F0FDFA; color: #0D6659; }
.cu-act-btn .pi { font-size: 13px; }
.cu-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.cu-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.cu-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.cu-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.cu-search-input::placeholder { color: #CBD5E1; }
.cu-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.cu-search-clear:hover { background: #CBD5E1; }

/* Empty state */
.cu-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 24px; text-align: center; }
.cu-empty-icon { width: 34px; height: 34px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.cu-empty-icon .pi { font-size: 15px; color: #94A3B8; }
.cu-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.cu-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }

.cu-show-sm { display: none; }
.cu-email { overflow-wrap: anywhere; }

/* tablet and phone: the same table, Phone and Joined fold away (phone shows under the name), so nothing scrolls sideways */
@media (max-width: 960px) {
  .cu-hide-sm { display: none !important; }
  .cu-show-sm { display: block; font-size: 11px; color: #64748B; margin-top: 1px; }
  .cu-dt .p-datatable-table { min-width: 0 !important; width: 100% !important; table-layout: fixed !important; }
  .cu-dt .p-datatable-thead > tr > th { padding: 0 6px !important; }
  .cu-dt .p-datatable-tbody > tr > td { padding: 8px 6px !important; }
  .cu-dt .p-datatable-thead th svg.p-icon { display: none !important; }
  .cu-dt th:nth-child(1) { width: 44px !important; }
  .cu-dt th:nth-child(4) { width: 60px !important; }
  .cu-dt th:nth-child(5) { width: 78px !important; }
  .cu-dt th:nth-child(7) { width: 70px !important; }
  .cu-dt th:nth-child(8) { width: 48px !important; }
  .cu-table-card { overflow-x: hidden !important; }
}

@media (max-width: 768px) {
  .cu-page { padding: 14px; }
  .cu-kpi-row { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
  .cu-table-card { min-width: 0; overflow-x: hidden !important; }
}

@media (max-width: 480px) {
  .cu-page { padding: 10px; }
  .cu-kpi-row { gap: 8px; }
}

  `]
})
export class AdminCustomersComponent implements OnInit {
  private api = inject(ApiService);

  @ViewChild('dt') dt!: Table;

  /** PDF of the customers as filtered on screen. */
  exportPdf(): void {
    const list = (this.dt?.filteredValue as Customer[] | null) ?? this.customers();
    downloadPdf({
      title: 'Customers report', filename: 'customers',
      subtitle: [this.dt?.filteredValue ? 'Filtered list as shown on screen' : 'All customers loaded on screen'],
      summary: [['Customers', String(list.length)], ['Total spent', inr(list.reduce((s, c) => s + (c.totalSpent ?? 0), 0))]],
      columns: ['Name', 'Email', 'Phone', 'Orders', 'Spent', 'Status', 'Joined (IST)'],
      rows: list.map(c => [c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(), c.email, c.phone ?? '', c.ordersCount ?? 0,
        inr(c.totalSpent), c.isActive === false ? 'Inactive' : 'Active', istDateTime(c.createdAt)])
    });
  }

  searchValue = '';
  customers  = signal<Customer[]>([]);
  loading    = signal(true);
  totalCount = signal(0);

  activeCount   = computed(() => this.customers().filter(c => c.isActive !== false).length);
  inactiveCount = computed(() => this.customers().filter(c => c.isActive === false).length);
  totalRevenue  = computed(() => this.customers().reduce((s, c) => s + (c.totalSpent ?? 0), 0));

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadPage(1, []);
  }

  /** The server returns at most 100 customers per page: keep asking until all of them are here. */
  private loadPage(page: number, soFar: Customer[]): void {
    this.api.get<any>('customers', { page, pageSize: 100 }).subscribe({
      next: res => {
        const data = res.data;
        const raw: any[] = (data && 'items' in data) ? data.items ?? [] : Array.isArray(data) ? data : [];
        const batch: Customer[] = raw.map(c => ({ ...c, ordersCount: c.ordersCount ?? c.orderCount ?? 0 }));
        const all = [...soFar, ...batch];
        const total = data?.totalCount ?? all.length;
        if (batch.length > 0 && all.length < total) { this.loadPage(page + 1, all); return; }
        this.customers.set(all);
        this.totalCount.set(total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onTableFilter(event: any): void {
    let count = 0;
    for (const key of Object.keys(event.filters ?? {})) {
      const rules = event.filters[key];
      if (Array.isArray(rules)) {
        count += rules.filter((r: any) => r.value !== null && r.value !== undefined && r.value !== '').length;
      }
    }
    this.activeFilterCount.set(count);
  }

  clearAllFilters(): void {
    this.dt.clear();
    this.activeFilterCount.set(0);
  }

  getFullName(c: Customer): string {
    return c.fullName ?? (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Unknown');
  }

  getInitials(c: Customer): string {
    const name = this.getFullName(c);
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
}
