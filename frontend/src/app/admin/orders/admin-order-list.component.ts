import { Component, OnInit, inject, signal, computed, ViewEncapsulation, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { OrderService } from '../../core/services/order.service';
import { OrderList, OrderStatus, PaymentStatus, PaymentMethod } from '../../core/models/order.models';

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterLink, NgIf, CurrencyPipe, DatePipe, FormsModule,
    TableModule, ButtonModule, SkeletonModule, SelectModule,
    InputTextModule, TooltipModule
  ],
  template: `
<div class="ol-page">

  <!-- Page Header -->
  <div class="ol-page-header">
    <div>
      <h1 class="ol-page-title">Orders</h1>
      <p class="ol-page-sub">{{ totalCount() }} total orders</p>
    </div>
    <button class="ol-refresh-btn" (click)="loadOrders()" title="Refresh">
      <i class="pi pi-refresh"></i>
    </button>
  </div>

  <!-- KPI Cards -->
  <div class="ol-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="ol-kpi-card ol-kpi-skeleton">
          <p-skeleton width="40px" height="40px" styleClass="ol-sk-icon" />
          <p-skeleton width="60%" height="28px" styleClass="ol-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="ol-kpi-card ol-card-blue">
        <div class="ol-kpi-icon ol-icon-blue"><i class="pi pi-file-check"></i></div>
        <div class="ol-kpi-num">{{ totalCount() }}</div>
        <div class="ol-kpi-lbl">Total Orders</div>
      </div>
      <div class="ol-kpi-card ol-card-amber">
        <div class="ol-kpi-icon ol-icon-amber"><i class="pi pi-clock"></i></div>
        <div class="ol-kpi-num">{{ pendingCount() }}</div>
        <div class="ol-kpi-lbl">Pending</div>
      </div>
      <div class="ol-kpi-card ol-card-teal">
        <div class="ol-kpi-icon ol-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="ol-kpi-num">{{ deliveredCount() }}</div>
        <div class="ol-kpi-lbl">Delivered</div>
      </div>
      <div class="ol-kpi-card ol-card-purple">
        <div class="ol-kpi-icon ol-icon-purple"><i class="pi pi-indian-rupee"></i></div>
        <div class="ol-kpi-num ol-kpi-num--sm">{{ totalRevenue() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="ol-kpi-lbl">Total Revenue</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="ol-table-card">

    @if (loading()) {
      <div class="ol-load-toolbar">
        <p-skeleton width="32px" height="32px" styleClass="ol-sk-sq" />
      </div>
      <div class="ol-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="ol-load-row" [style.opacity]="(8 - r) / 8"></div>
      }
    }

    @if (!loading()) {

      <!-- Active filter bar -->
      @if (hasActiveFilters()) {
        <div class="ol-filter-bar">
          <span class="ol-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="ol-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <!-- Toolbar: refresh only -->
      <div class="ol-toolbar">
        <div class="ol-search-wrap">
          <i class="pi pi-search ol-search-icon"></i>
          <input class="ol-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="ol-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="ol-toolbar-spacer"></div>
        <button class="ol-icon-btn" (click)="loadOrders()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table
        #dt
        [value]="orders()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} orders"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="ol-dt"
        [tableStyle]="{'min-width':'820px'}"
        [globalFilterFields]="['orderNumber', 'customerName']"
      >

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="orderNumber" style="width:110px">
              Order # <p-sortIcon field="orderNumber" />
              <p-columnFilter type="text" field="orderNumber" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="customerName">
              Customer <p-sortIcon field="customerName" />
              <p-columnFilter type="text" field="customerName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="createdAt" style="width:120px">
              Date <p-sortIcon field="createdAt" />
              <p-columnFilter type="text" field="createdAt" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="totalAmount" style="width:110px">
              Amount <p-sortIcon field="totalAmount" />
              <p-columnFilter type="text" field="totalAmount" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="paymentMethod" style="width:95px">
              Payment <p-sortIcon field="paymentMethod" />
              <p-columnFilter field="paymentMethod" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="paymentMethodOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="ol-row-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="paymentStatus" style="width:105px">
              Pay Status <p-sortIcon field="paymentStatus" />
              <p-columnFilter field="paymentStatus" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="paymentStatusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="ol-row-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="status" style="width:115px">
              Order Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="orderStatusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="ol-row-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:60px" class="ol-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-o>
          <tr>
            <td><span class="ol-order-no">#{{ o.orderNumber }}</span></td>
            <td>
              <div class="ol-cust-name">{{ o.customerName || 'Guest' }}</div>
              <div class="ol-cust-email">{{ o.customerEmail }}</div>
            </td>
            <td><span class="ol-date">{{ o.createdAt | date:'dd MMM yyyy' }}</span></td>
            <td>
              <div class="ol-amount">{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }}</div>
              <div class="ol-item-count">{{ o.itemCount }} item{{ o.itemCount !== 1 ? 's' : '' }}</div>
            </td>
            <td><span class="ol-method">{{ paymentMethodLabel(o.paymentMethod) }}</span></td>
            <td>
              <span class="ol-badge" [class]="payBadgeClass(o.paymentStatus)">
                {{ paymentStatusLabel(o.paymentStatus) }}
              </span>
            </td>
            <td>
              <span class="ol-badge" [class]="statusBadgeClass(o.status)">
                {{ orderStatusLabel(o.status) }}
              </span>
            </td>
            <td>
              <div class="ol-actions">
                <a [routerLink]="['/admin/orders', o.id]" class="ol-act-btn"
                  pTooltip="View order" tooltipPosition="left">
                  <i class="pi pi-eye"></i>
                </a>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="ol-empty">
              <div class="ol-empty-icon"><i class="pi pi-inbox"></i></div>
              <p class="ol-empty-title">No orders found</p>
              <p class="ol-empty-sub">Try adjusting your filters</p>
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

  `]
})
export class AdminOrderListComponent implements OnInit {
  private orderService = inject(OrderService);

  @ViewChild('dt') dt!: Table;

  searchValue = '';
  loading    = signal(true);
  orders     = signal<OrderList[]>([]);
  totalCount = signal(0);

  pendingCount   = computed(() => this.orders().filter(o => o.status === 1).length);
  deliveredCount = computed(() => this.orders().filter(o => o.status === 4).length);
  totalRevenue   = computed(() => this.orders().reduce((s, o) => s + (o.totalAmount ?? 0), 0));

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  orderStatusOptions = [
    { label: 'Pending',   value: 1 },
    { label: 'Confirmed', value: 2 },
    { label: 'Shipped',   value: 3 },
    { label: 'Delivered', value: 4 },
    { label: 'Cancelled', value: 5 },
    { label: 'Returned',  value: 6 },
  ];

  paymentStatusOptions = [
    { label: 'Pending',  value: 1 },
    { label: 'Paid',     value: 2 },
    { label: 'Failed',   value: 3 },
    { label: 'Refunded', value: 4 },
  ];

  paymentMethodOptions = [
    { label: 'Razorpay', value: 1 },
    { label: 'COD',      value: 2 },
  ];

  ngOnInit(): void { this.loadOrders(); }

  loadOrders(): void {
    this.loading.set(true);
    this.orderService.getAll({ page: 1, pageSize: 200 }).subscribe({
      next: res => {
        this.orders.set(res.data?.items ?? []);
        this.totalCount.set(res.data?.totalCount ?? 0);
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

  payBadgeClass(s: PaymentStatus): string {
    return ({ 1: 'ol-ps-pending', 2: 'ol-ps-paid', 3: 'ol-ps-failed', 4: 'ol-ps-refunded', 5: 'ol-ps-pending' } as any)[s] ?? '';
  }

  statusBadgeClass(s: OrderStatus): string {
    return ({ 1: 'ol-os-pending', 2: 'ol-os-confirmed', 3: 'ol-os-shipped', 4: 'ol-os-delivered', 5: 'ol-os-cancelled', 6: 'ol-os-returned' } as any)[s] ?? '';
  }

  orderStatusLabel(s: OrderStatus): string {
    return ({ 1: 'Pending', 2: 'Confirmed', 3: 'Shipped', 4: 'Delivered', 5: 'Cancelled', 6: 'Returned' } as any)[s] ?? 'Unknown';
  }

  paymentStatusLabel(s: PaymentStatus): string {
    return ({ 1: 'Pending', 2: 'Paid', 3: 'Failed', 4: 'Refunded', 5: 'Partial Refund' } as any)[s] ?? 'Unknown';
  }

  paymentMethodLabel(m: PaymentMethod): string {
    return m === PaymentMethod.Razorpay ? 'Razorpay' : 'COD';
  }
}
