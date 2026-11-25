import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductService } from '../../core/services/product.service';
import { Review, ReviewStatus } from '../../core/models/product.models';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, NgFor, FormsModule,
    TableModule, ButtonModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, SelectModule, TooltipModule
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="rv-page">

  <!-- Page Header -->
  <div class="rv-page-header">
    <div>
      <h1 class="rv-page-title">Reviews</h1>
      <p class="rv-page-sub">{{ totalReviews() }} customer reviews to moderate</p>
    </div>
    <div class="rv-header-actions">
      <button class="rv-refresh-btn" (click)="load()" title="Refresh">
        <i class="pi pi-refresh"></i>
      </button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="rv-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="rv-kpi-card rv-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="rv-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="rv-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="rv-kpi-card rv-card-blue">
        <div class="rv-kpi-icon rv-icon-blue"><i class="pi pi-star"></i></div>
        <div class="rv-kpi-num">{{ totalReviews() }}</div>
        <div class="rv-kpi-lbl">Total Reviews</div>
      </div>
      <div class="rv-kpi-card rv-card-amber">
        <div class="rv-kpi-icon rv-icon-amber"><i class="pi pi-clock"></i></div>
        <div class="rv-kpi-num">{{ pendingCount() }}</div>
        <div class="rv-kpi-lbl">Pending</div>
      </div>
      <div class="rv-kpi-card rv-card-teal">
        <div class="rv-kpi-icon rv-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="rv-kpi-num">{{ approvedCount() }}</div>
        <div class="rv-kpi-lbl">Approved</div>
      </div>
      <div class="rv-kpi-card rv-card-red">
        <div class="rv-kpi-icon rv-icon-red"><i class="pi pi-times-circle"></i></div>
        <div class="rv-kpi-num">{{ rejectedCount() }}</div>
        <div class="rv-kpi-lbl">Rejected</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="rv-table-card">

    @if (loading()) {
      <div class="rv-load-toolbar"></div>
      <div class="rv-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="rv-load-row" [style.opacity]="(8-r)/8"></div>
      }
    }

    @if (!loading() && hasError()) {
      <div class="rv-state">
        <div class="rv-state-icon rv-state-err"><i class="pi pi-exclamation-triangle"></i></div>
        <p class="rv-state-title">Unable to load reviews</p>
        <p class="rv-state-sub">Something went wrong. Please try again.</p>
        <button class="rv-state-btn" (click)="load()"><i class="pi pi-refresh"></i> Retry</button>
      </div>
    }

    @if (!loading() && !hasError()) {

      @if (hasActiveFilters()) {
        <div class="rv-filter-bar">
          <span class="rv-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="rv-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <div class="rv-toolbar">
        <div class="rv-search-wrap">
          <i class="pi pi-search rv-search-icon"></i>
          <input class="rv-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="rv-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="rv-toolbar-spacer"></div>
        <button class="rv-icon-btn" (click)="load()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table #dt
        [value]="reviews()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        dataKey="id"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="rv-dt"
        [tableStyle]="{'min-width':'780px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} reviews"
        [globalFilterFields]="['productName', 'customerName']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="productName">
              Product <p-sortIcon field="productName" />
              <p-columnFilter type="text" field="productName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="customerName" style="width:145px">
              Customer <p-sortIcon field="customerName" />
              <p-columnFilter type="text" field="customerName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="rating" style="width:120px">
              Rating <p-sortIcon field="rating" />
              <p-columnFilter field="rating" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="ratingOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="Any"
                    [showClear]="true" styleClass="rv-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th>Review</th>
            <th pSortableColumn="status" style="width:120px">
              Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="rv-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="createdAt" style="width:105px">
              Date <p-sortIcon field="createdAt" />
            </th>
            <th style="width:100px" class="rv-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <div class="rv-product-name">{{ r.productName }}</div>
            </td>
            <td>
              <div class="rv-customer-cell">
                <div class="rv-avatar">{{ initials(r.customerName) }}</div>
                <span class="rv-customer-name">{{ r.customerName }}</span>
              </div>
            </td>
            <td>
              <div class="rv-stars-row">
                <ng-container *ngFor="let s of getStars(r.rating)">
                  <i class="pi rv-star" [class.rv-star-filled]="s === 'filled'" [class.rv-star-empty]="s === 'empty'"
                    [class]="'pi ' + (s === 'filled' ? 'pi-star-fill rv-star rv-star-filled' : 'pi-star rv-star rv-star-empty')"></i>
                </ng-container>
                <span class="rv-rating-num">{{ r.rating }}</span>
              </div>
            </td>
            <td>
              <div class="rv-review-title" *ngIf="r.title">{{ r.title }}</div>
              <div class="rv-review-text" *ngIf="r.comment">{{ r.comment.length > 90 ? r.comment.slice(0,90) + '…' : r.comment }}</div>
            </td>
            <td>
              <span class="rv-status-badge"
                [class.rv-status-pending]="r.status === 1"
                [class.rv-status-approved]="r.status === 2"
                [class.rv-status-rejected]="r.status === 3">
                <span class="rv-status-dot"></span>
                {{ statusLabel(r.status) }}
              </span>
            </td>
            <td>
              <span class="rv-date">{{ formatDate(r.createdAt) }}</span>
            </td>
            <td>
              <div class="rv-actions">
                <button *ngIf="r.status !== 2" class="rv-act-btn rv-act-approve"
                  (click)="approveReview(r)" pTooltip="Approve" tooltipPosition="top">
                  <i class="pi pi-check"></i>
                </button>
                <button *ngIf="r.status !== 3" class="rv-act-btn rv-act-reject"
                  (click)="rejectReview(r)" pTooltip="Reject" tooltipPosition="top">
                  <i class="pi pi-times"></i>
                </button>
                <button class="rv-act-btn rv-act-del"
                  (click)="deleteReview(r)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="rv-empty">
              <div class="rv-empty-icon"><i class="pi pi-star"></i></div>
              <p class="rv-empty-title">No reviews found</p>
              <p class="rv-empty-sub">{{ totalReviews() === 0 ? 'No reviews submitted yet.' : 'Try adjusting your filters.' }}</p>
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
   REVIEWS — ViewEncapsulation.None, all selectors .rv-*
================================================================ */

.rv-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

/* Header */
.rv-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.rv-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.rv-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.rv-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.rv-refresh-btn   { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.rv-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

/* KPI */
.rv-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.rv-kpi-card {
  background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.rv-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.rv-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.rv-card-blue  { border-top-color: #2563EB !important; }
.rv-card-amber { border-top-color: #D97706 !important; }
.rv-card-teal  { border-top-color: #0F766E !important; }
.rv-card-red   { border-top-color: #DC2626 !important; }

.rv-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.rv-icon-blue  { background: #EFF6FF; color: #2563EB; }
.rv-icon-amber { background: #FFFBEB; color: #D97706; }
.rv-icon-teal  { background: #F0FDFA; color: #0F766E; }
.rv-icon-red   { background: #FEF2F2; color: #DC2626; }

.rv-kpi-num  { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.rv-kpi-lbl  { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.rv-sk-icon  { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.rv-sk-num   { margin-bottom: 6px; display: block; }

/* Table card */
.rv-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }

/* State */
.rv-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; text-align: center; }
.rv-state-icon { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.rv-state-err  { background: #FEF2F2; color: #DC2626; }
.rv-state-icon .pi { font-size: 18px; }
.rv-state-title { font-size: 14px; font-weight: 600; color: #334155; margin: 0 0 4px; }
.rv-state-sub   { font-size: 12px; color: #94A3B8; margin: 0 0 12px; }
.rv-state-btn   { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }

/* Filter bar */
.rv-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rv-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.rv-filter-info .pi { font-size: 11px; }
.rv-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.rv-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.rv-clear-all-btn .pi { font-size: 10px; }

/* Skeleton */
.rv-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.rv-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rv-load-row     { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.rv-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.rv-toolbar-spacer { flex: 1; }
.rv-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.rv-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

/* Table header */
.rv-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.rv-th-center { text-align: center !important; }

/* Sort & filter icons */
.rv-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.rv-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.rv-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.rv-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.rv-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.rv-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Rows */
.rv-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 52px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.rv-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.rv-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }

/* Paginator */
.rv-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }

/* Col select */
.rv-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.rv-product-name { font-size: 13px; font-weight: 500; color: #0F172A; }

.rv-customer-cell { display: flex; align-items: center; gap: 7px; }
.rv-avatar { width: 26px; height: 26px; border-radius: 50%; background: #CCFBF1; color: #0F766E; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; }
.rv-customer-name { font-size: 12.5px; color: #334155; }

.rv-stars-row { display: flex; align-items: center; gap: 2px; }
.rv-star { font-size: 12px !important; }
.rv-star-filled { color: #F59E0B !important; }
.rv-star-empty  { color: #E2E8F0 !important; }
.rv-rating-num  { font-size: 11px; font-weight: 700; color: #475569; margin-left: 4px; }

.rv-review-title { font-size: 12.5px; font-weight: 600; color: #0F172A; line-height: 1.3; }
.rv-review-text  { font-size: 11.5px; color: #64748B; margin-top: 1px; line-height: 1.4; max-width: 280px; }

.rv-status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.rv-status-dot   { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.rv-status-pending  { background: #FFFBEB; color: #CA8A04; }
.rv-status-approved { background: #F0FDF4; color: #16A34A; }
.rv-status-rejected { background: #FEF2F2; color: #DC2626; }

.rv-date { font-size: 12px; color: #64748B; }

/* Actions */
.rv-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.rv-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; transition: background 0.12s, color 0.12s; }
.rv-act-btn .pi { font-size: 12px; }
.rv-act-approve { color: #16A34A; }
.rv-act-approve:hover { background: #F0FDF4; }
.rv-act-reject  { color: #D97706; }
.rv-act-reject:hover  { background: #FFFBEB; }
.rv-act-del     { color: #DC2626; }
.rv-act-del:hover     { background: #FEF2F2; color: #B91C1C; }
.rv-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.rv-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.rv-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.rv-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.rv-search-input::placeholder { color: #CBD5E1; }
.rv-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.rv-search-clear:hover { background: #CBD5E1; }

/* Empty */
.rv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; gap: 2px; }
.rv-empty-icon { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.rv-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.rv-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.rv-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }

@media (max-width: 768px) {
  .rv-table-card { min-width: 0; overflow-x: auto !important; }
}

  `]
})
export class AdminReviewsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  searchValue = '';
  private productService = inject(ProductService);
  private toast          = inject(MessageService);
  private confirm        = inject(ConfirmationService);

  reviews  = signal<Review[]>([]);
  loading  = signal(true);
  hasError = signal(false);

  totalReviews  = computed(() => this.reviews().length);
  pendingCount  = computed(() => this.reviews().filter(r => r.status === 1).length);
  approvedCount = computed(() => this.reviews().filter(r => r.status === 2).length);
  rejectedCount = computed(() => this.reviews().filter(r => r.status === 3).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  ratingOptions = [1,2,3,4,5].map(v => ({ label: '★'.repeat(v) + ' ' + v, value: v }));
  statusOptions = [
    { label: 'Pending',  value: 1 },
    { label: 'Approved', value: 2 },
    { label: 'Rejected', value: 3 }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.hasError.set(false);
    this.productService.getAllReviews({ page: 1, pageSize: 500 }).subscribe({
      next: res => { this.reviews.set(res.data?.items ?? []); this.loading.set(false); },
      error: () => { this.hasError.set(true); this.loading.set(false); }
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

  approveReview(r: Review) {
    this.productService.approveReview(r.id).subscribe({
      next: () => {
        this.reviews.update(list => list.map(x => x.id === r.id ? { ...x, status: 2 as ReviewStatus } : x));
        this.toast.add({ severity: 'success', summary: 'Approved', detail: 'Review approved', life: 3000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to approve', life: 3000 })
    });
  }

  rejectReview(r: Review) {
    this.productService.rejectReview(r.id).subscribe({
      next: () => {
        this.reviews.update(list => list.map(x => x.id === r.id ? { ...x, status: 3 as ReviewStatus } : x));
        this.toast.add({ severity: 'warn', summary: 'Rejected', detail: 'Review rejected', life: 3000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to reject', life: 3000 })
    });
  }

  deleteReview(r: Review) {
    this.confirm.confirm({
      header: 'Delete Review',
      message: `Delete this review by ${r.customerName}? This cannot be undone.`,
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.productService.deleteReview(r.id).subscribe({
          next: () => {
            this.reviews.update(list => list.filter(x => x.id !== r.id));
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Review deleted', life: 3000 });
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }

  getStars(rating: number): string[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 'filled' : 'empty');
  }

  initials(name: string): string {
    return name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() ?? '?';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(s: ReviewStatus): string {
    return ({ 1: 'Pending', 2: 'Approved', 3: 'Rejected' } as any)[s] ?? 'Unknown';
  }
}
