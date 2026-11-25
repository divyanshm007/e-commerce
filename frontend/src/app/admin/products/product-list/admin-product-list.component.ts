import { Component, OnInit, OnDestroy, inject, signal, computed, ViewEncapsulation, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { ProductList, Category } from '../../../core/models/product.models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    RouterLink, NgIf, NgFor, CurrencyPipe, FormsModule,
    TableModule, ButtonModule, ToastModule, ConfirmDialogModule,
    TooltipModule, SkeletonModule, SelectModule, MediaUrlPipe
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="pl-page">

  <!-- Page Header -->
  <div class="pl-page-header">
    <div>
      <h1 class="pl-page-title">Products</h1>
      <p class="pl-page-sub">{{ totalCount() }} products in catalog</p>
    </div>
    <div class="pl-header-actions">
      <button class="pl-refresh-btn" (click)="loadProducts()" title="Refresh">
        <i class="pi pi-refresh"></i>
      </button>
      <a class="pl-add-btn" routerLink="/admin/products/new">
        <i class="pi pi-plus"></i> Add Product
      </a>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="pl-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="pl-kpi-card pl-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="pl-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="pl-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="pl-kpi-card pl-card-blue">
        <div class="pl-kpi-icon pl-icon-blue"><i class="pi pi-box"></i></div>
        <div class="pl-kpi-num">{{ totalCount() }}</div>
        <div class="pl-kpi-lbl">Total Products</div>
      </div>
      <div class="pl-kpi-card pl-card-teal">
        <div class="pl-kpi-icon pl-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="pl-kpi-num">{{ activeCount() }}</div>
        <div class="pl-kpi-lbl">Active</div>
      </div>
      <div class="pl-kpi-card pl-card-amber">
        <div class="pl-kpi-icon pl-icon-amber"><i class="pi pi-exclamation-triangle"></i></div>
        <div class="pl-kpi-num">{{ lowStockCount() }}</div>
        <div class="pl-kpi-lbl">Low Stock</div>
      </div>
      <div class="pl-kpi-card pl-card-red">
        <div class="pl-kpi-icon pl-icon-red"><i class="pi pi-shopping-cart"></i></div>
        <div class="pl-kpi-num">{{ outOfStockCount() }}</div>
        <div class="pl-kpi-lbl">Out of Stock</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="pl-table-card">

    @if (loading()) {
      <div class="pl-load-toolbar">
        <p-skeleton width="80px" height="28px" styleClass="pl-sk-sq" />
      </div>
      <div class="pl-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="pl-load-row" [style.opacity]="(8 - r) / 8"></div>
      }
    }

    @if (!loading() && hasError()) {
      <div class="pl-state">
        <div class="pl-state-icon pl-state-err"><i class="pi pi-exclamation-circle"></i></div>
        <p class="pl-state-title">Unable to load products</p>
        <p class="pl-state-sub">Something went wrong. Please try again.</p>
        <button class="pl-state-btn" (click)="loadProducts()"><i class="pi pi-refresh"></i> Retry</button>
      </div>
    }

    @if (!loading() && !hasError()) {

      @if (hasActiveFilters()) {
        <div class="pl-filter-bar">
          <span class="pl-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="pl-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <!-- Toolbar -->
      <div class="pl-toolbar">
        <div class="pl-search-wrap">
          <i class="pi pi-search pl-search-icon"></i>
          <input class="pl-search-input" type="text" placeholder="Search products…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="pl-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="pl-toolbar-spacer"></div>
        <button class="pl-icon-btn" (click)="loadProducts()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table
        #dt
        [value]="products()"
        [globalFilterFields]="['name','categoryName','sku']"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50,100]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="pl-dt"
        [tableStyle]="{'min-width':'760px'}"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:54px">Image</th>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="categoryName" style="width:130px">
              Category <p-sortIcon field="categoryName" />
              <p-columnFilter field="categoryName" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="categoryFilterOptions()" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="pl-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="price" style="width:110px">
              Price <p-sortIcon field="price" />
              <p-columnFilter type="text" field="price" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="stockQuantity" style="width:80px">
              Stock <p-sortIcon field="stockQuantity" />
              <p-columnFilter type="text" field="stockQuantity" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="isActive" style="width:100px">
              Status <p-sortIcon field="isActive" />
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="pl-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:90px" class="pl-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-p>
          <tr>
            <td>
              <div class="pl-thumb">
                <img *ngIf="p.primaryImageUrl" [src]="p.primaryImageUrl | mediaUrl" [alt]="p.name" />
                <i *ngIf="!p.primaryImageUrl" class="pi pi-image"></i>
              </div>
            </td>
            <td>
              <div class="pl-prod-name">{{ p.name }}</div>
              <div class="pl-badges">
                <span class="pl-pb pl-pb-feat" *ngIf="p.isFeatured">Featured</span>
                <span class="pl-pb pl-pb-new"  *ngIf="p.isNewArrival">New</span>
                <span class="pl-pb pl-pb-best" *ngIf="p.isBestSeller">Best Seller</span>
                <span class="pl-pb pl-pb-rx"   *ngIf="p.prescriptionRequired">Rx</span>
              </div>
            </td>
            <td>
              <span class="pl-cat-tag" *ngIf="p.categoryName">{{ p.categoryName }}</span>
              <span class="pl-no-val" *ngIf="!p.categoryName">—</span>
            </td>
            <td>
              <div class="pl-price">{{ p.price | currency:'INR':'symbol':'1.0-0' }}</div>
              <div class="pl-disc" *ngIf="p.discountPrice">{{ p.discountPrice | currency:'INR':'symbol':'1.0-0' }}</div>
            </td>
            <td>
              <span class="pl-stock"
                [class.pl-stock-out]="p.stockQuantity === 0"
                [class.pl-stock-low]="p.stockQuantity > 0 && p.stockQuantity <= 10"
                [class.pl-stock-ok]="p.stockQuantity > 10">
                {{ p.stockQuantity === 0 ? 'Out' : p.stockQuantity }}
              </span>
            </td>
            <td>
              <button class="pl-status-pill"
                [class.pl-status-active]="p.isActive"
                [class.pl-status-inactive]="!p.isActive"
                (click)="toggleStatus(p)"
                [pTooltip]="p.isActive ? 'Click to deactivate' : 'Click to activate'"
                tooltipPosition="top">
                <span class="pl-status-dot"></span>
                {{ p.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <div class="pl-actions">
                <a class="pl-act-btn pl-act-edit" [routerLink]="['/admin/products', p.id, 'edit']"
                  pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </a>
                <button class="pl-act-btn pl-act-del" (click)="deleteProduct(p)"
                  pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="pl-empty">
              <div class="pl-empty-icon"><i class="pi pi-box"></i></div>
              <p class="pl-empty-title">No products found</p>
              <p class="pl-empty-sub">Try adjusting your filters</p>
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
   PRODUCTS LIST — ViewEncapsulation.None, all selectors .pl-*
================================================================ */

app-admin-product-list { display: block; width: 100%; }

.pl-page {
  min-height: 100vh; background: #F6F8FA;
  padding: 20px; display: flex; flex-direction: column;
}

/* Header */
.pl-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.pl-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.pl-page-sub    { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.pl-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }

.pl-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.pl-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

.pl-add-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  background: #0F766E; color: #fff; font-size: 12px; font-weight: 600;
  text-decoration: none; border: none; cursor: pointer;
  transition: background 0.13s;
}
.pl-add-btn:hover { background: #115E59; }
.pl-add-btn .pi { font-size: 11px; }

/* KPI grid */
.pl-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }

.pl-kpi-card {
  background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.pl-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.pl-kpi-skeleton  { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.pl-card-blue  { border-top-color: #2563EB !important; }
.pl-card-teal  { border-top-color: #0F766E !important; }
.pl-card-amber { border-top-color: #D97706 !important; }
.pl-card-red   { border-top-color: #DC2626 !important; }

.pl-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.pl-icon-blue  { background: #EFF6FF; color: #2563EB; }
.pl-icon-teal  { background: #F0FDFA; color: #0F766E; }
.pl-icon-amber { background: #FFFBEB; color: #D97706; }
.pl-icon-red   { background: #FEF2F2; color: #DC2626; }

.pl-kpi-num    { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.pl-kpi-lbl    { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.pl-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.pl-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.pl-table-card {
  background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9);
  border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1;
}

/* Error state */
.pl-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; text-align: center; }
.pl-state-icon { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.pl-state-err  { background: #FEF2F2; color: #DC2626; }
.pl-state-icon .pi { font-size: 18px; }
.pl-state-title { font-size: 14px; font-weight: 600; color: #334155; margin: 0 0 4px; }
.pl-state-sub   { font-size: 12px; color: #94A3B8; margin: 0 0 12px; }
.pl-state-btn {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px;
  border-radius: 6px; background: #0F766E; color: #fff; border: none;
  font-size: 12px; font-weight: 500; cursor: pointer;
}

/* Filter bar */
.pl-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.pl-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.pl-filter-info .pi { font-size: 11px; }
.pl-clear-all-btn {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
  border: 1px solid #DDEFE9; border-radius: 5px; background: #fff;
  color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer;
}
.pl-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.pl-clear-all-btn .pi { font-size: 10px; }

/* Loading skeleton */
.pl-load-toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.pl-sk-sq { border-radius: 7px !important; display: block; }
.pl-load-head { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.pl-load-row  { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.pl-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.pl-toolbar-spacer { flex: 1; }
.pl-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.13s, color 0.13s;
}
.pl-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

/* Search box */
.pl-search-wrap {
  position: relative; display: flex; align-items: center;
  background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
  height: 32px; min-width: 220px; max-width: 320px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pl-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.pl-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.pl-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.pl-search-input::placeholder { color: #CBD5E1; }
.pl-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.pl-search-clear:hover { background: #CBD5E1; }

/* Caption override */
.pl-dt.p-datatable .p-datatable-caption,
.pl-dt.p-datatable .p-datatable-header { padding: 0 !important; border: none !important; background: transparent !important; }

/* Table header */
.pl-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.pl-th-center { text-align: center !important; }

/* Sort icons */
.pl-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.pl-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.pl-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }

/* Column filter icon */
.pl-dt .p-column-filter-menu-button {
  width: 16px !important; height: 16px !important; min-width: 16px !important;
  padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important;
  background: transparent !important; color: #B0D8D1 !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  transition: background 0.12s, color 0.12s;
}
.pl-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.pl-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Table rows */
.pl-dt .p-datatable-tbody > tr > td {
  padding: 0 13px !important; height: 52px !important; vertical-align: middle !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #F1F5F9 !important; color: #334155;
}
.pl-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.pl-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; transition: background 150ms ease; }

/* Paginator */
.pl-table-card .p-paginator {
  padding: 6px 12px !important; min-height: 46px;
  border-top: 1px solid #E2E8F0 !important;
  border-right: none !important; border-left: none !important; border-bottom: none !important;
  border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px;
}

/* Product thumbnail */
.pl-thumb {
  width: 40px; height: 40px; border-radius: 7px; overflow: hidden;
  border: 1px solid #F1F5F9; background: #F8FAFC;
  display: flex; align-items: center; justify-content: center;
}
.pl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pl-thumb .pi { color: #CBD5E1; font-size: 16px; }

/* Product name cell */
.pl-prod-name { font-size: 13px; font-weight: 500; color: #0F172A; line-height: 1.3; white-space: nowrap; }
.pl-badges    { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
.pl-pb { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 3px; }
.pl-pb-feat { background: #EFF6FF; color: #1D4ED8; }
.pl-pb-new  { background: #ECFDF5; color: #059669; }
.pl-pb-best { background: #FEFCE8; color: #A16207; }
.pl-pb-rx   { background: #FEF2F2; color: #DC2626; }

/* Category tag */
.pl-cat-tag { display: inline-block; padding: 2px 7px; border-radius: 4px; background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 500; }
.pl-no-val  { color: #94A3B8; }

/* Price */
.pl-price { font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.3; }
.pl-disc  { font-size: 11px; color: #0F766E; font-weight: 500; margin-top: 1px; }

/* Stock badge */
.pl-stock {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 34px; height: 22px; padding: 0 6px;
  border-radius: 4px; font-size: 11.5px; font-weight: 700;
}
.pl-stock-out { background: #FEF2F2; color: #DC2626; }
.pl-stock-low { background: #FFFBEB; color: #D97706; }
.pl-stock-ok  { background: #F0FDF4; color: #16A34A; }

/* Status toggle pill */
.pl-status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 4px; border: none;
  font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap;
}
.pl-status-active   { background: #F0FDF4; color: #16A34A; }
.pl-status-active:hover { opacity: 0.78; }
.pl-status-inactive { background: #FEF2F2; color: #DC2626; }
.pl-status-inactive:hover { opacity: 0.78; }
.pl-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

/* Col select */
.pl-col-sel { width: 100% !important; font-size: 12px !important; }

/* Row actions */
.pl-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.pl-act-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px; border: none; background: none;
  cursor: pointer; text-decoration: none; transition: background 0.12s, color 0.12s;
}
.pl-act-btn .pi { font-size: 12px; }
.pl-act-edit { color: #2563EB; }
.pl-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.pl-act-del  { color: #DC2626; }
.pl-act-del:hover  { background: #FEF2F2; color: #B91C1C; }

/* Empty state */
.pl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 24px; text-align: center; }
.pl-empty-icon { width: 34px; height: 34px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.pl-empty-icon .pi { font-size: 15px; color: #94A3B8; }
.pl-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.pl-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }

@media (max-width: 768px) {
  .pl-page { padding: 14px; overflow-x: hidden; }
  .pl-page-header { flex-wrap: wrap; gap: 10px; }
  .pl-kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
  .pl-table-card { min-width: 0; overflow-x: auto !important; }
  .pl-search-wrap { min-width: 160px; }
}

@media (max-width: 600px) {
  .pl-page-title { font-size: 18px; }
  .pl-page-sub   { font-size: 12px; }
  .pl-kpi-num    { font-size: 22px; }
  .pl-kpi-card   { min-height: 110px; padding: 14px; }
}

@media (max-width: 480px) {
  .pl-page { padding: 12px; }
  .pl-kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .pl-kpi-card { min-height: 100px; padding: 12px; }
  .pl-kpi-num  { font-size: 20px; }
}

  `]
})
export class AdminProductListComponent implements OnInit, OnDestroy {
  private svc        = inject(ProductService);
  private confirmSvc = inject(ConfirmationService);
  private toast      = inject(MessageService);

  @ViewChild('dt') dt!: Table;

  products        = signal<ProductList[]>([]);
  categories      = signal<Category[]>([]);
  loading         = signal(true);
  hasError        = signal(false);
  totalCount      = signal(0);

  activeCount     = computed(() => this.products().filter(p => p.isActive).length);
  lowStockCount   = computed(() => this.products().filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length);
  outOfStockCount = computed(() => this.products().filter(p => p.stockQuantity === 0).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  categoryFilterOptions = computed(() =>
    this.categories().map(c => ({ label: c.name, value: c.name }))
  );

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  searchValue = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() { this.loadCategories(); this.loadProducts(); }
  ngOnDestroy() { if (this.searchTimer) clearTimeout(this.searchTimer); }

  loadCategories() {
    this.svc.getCategories().subscribe(res => { if (res.data) this.categories.set(res.data); });
  }

  loadProducts() {
    this.loading.set(true);
    this.hasError.set(false);
    this.svc.getAll({ page: 1, pageSize: 500 }).subscribe({
      next: res => {
        const items = res.data?.items ?? [];
        this.products.set(items);
        this.totalCount.set(res.data?.totalCount ?? items.length);
        this.loading.set(false);
      },
      error: () => { this.hasError.set(true); this.loading.set(false); }
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

  clearAllFilters(): void { this.dt.clear(); this.activeFilterCount.set(0); }

  toggleStatus(p: ProductList) {
    this.svc.toggleStatus(p.id).subscribe({
      next: () => {
        p.isActive = !p.isActive;
        this.toast.add({ severity: 'success', summary: 'Updated',
          detail: `"${p.name}" ${p.isActive ? 'activated' : 'deactivated'}`, life: 3000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
    });
  }

  deleteProduct(p: ProductList) {
    this.confirmSvc.confirm({
      message: `Delete "${p.name}"? This cannot be undone.`,
      header: 'Delete Product',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.delete(p.id).subscribe({
          next: () => { this.toast.add({ severity: 'success', summary: 'Deleted', detail: `"${p.name}" deleted`, life: 3000 }); this.loadProducts(); },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }
}
