import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 1 | 2;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  startDate?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, DatePipe, CurrencyPipe, DecimalPipe, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, SkeletonModule,
    InputTextModule, TextareaModule, SelectModule, ToggleSwitchModule,
    DialogModule, ToastModule, ConfirmDialogModule, TooltipModule
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="cp-page">

  <!-- Page Header -->
  <div class="cp-page-header">
    <div>
      <h1 class="cp-page-title">Coupons</h1>
      <p class="cp-page-sub">{{ totalCoupons() }} discount coupons &amp; promo codes</p>
    </div>
    <div class="cp-header-actions">
      <button class="cp-refresh-btn" (click)="loadCoupons()" title="Refresh">
        <i class="pi pi-refresh"></i>
      </button>
      <button class="cp-add-btn" (click)="openDialog(null)">
        <i class="pi pi-plus"></i> Add Coupon
      </button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="cp-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="cp-kpi-card cp-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="cp-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="cp-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="cp-kpi-card cp-card-blue">
        <div class="cp-kpi-icon cp-icon-blue"><i class="pi pi-tag"></i></div>
        <div class="cp-kpi-num">{{ totalCoupons() }}</div>
        <div class="cp-kpi-lbl">Total Coupons</div>
      </div>
      <div class="cp-kpi-card cp-card-teal">
        <div class="cp-kpi-icon cp-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="cp-kpi-num">{{ activeCount() }}</div>
        <div class="cp-kpi-lbl">Active</div>
      </div>
      <div class="cp-kpi-card cp-card-red">
        <div class="cp-kpi-icon cp-icon-red"><i class="pi pi-calendar-times"></i></div>
        <div class="cp-kpi-num">{{ expiredCount() }}</div>
        <div class="cp-kpi-lbl">Expired</div>
      </div>
      <div class="cp-kpi-card cp-card-amber">
        <div class="cp-kpi-icon cp-icon-amber"><i class="pi pi-chart-bar"></i></div>
        <div class="cp-kpi-num">{{ totalUsed() }}</div>
        <div class="cp-kpi-lbl">Total Used</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="cp-table-card">

    @if (loading()) {
      <div class="cp-load-toolbar"></div>
      <div class="cp-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="cp-load-row" [style.opacity]="(8-r)/8"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="cp-filter-bar">
          <span class="cp-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="cp-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <div class="cp-toolbar">
        <div class="cp-search-wrap">
          <i class="pi pi-search cp-search-icon"></i>
          <input class="cp-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="cp-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cp-toolbar-spacer"></div>
        <button class="cp-icon-btn" (click)="loadCoupons()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table #dt
        [value]="coupons()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        dataKey="id"
        filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="cp-dt"
        [tableStyle]="{'min-width':'820px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} coupons"
        [globalFilterFields]="['code', 'description']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="code" style="width:170px">
              Code <p-sortIcon field="code" />
              <p-columnFilter type="text" field="code" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th style="width:120px">
              Type
              <p-columnFilter field="discountType" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="discountTypeOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="cp-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="discountValue" style="width:100px">
              Value <p-sortIcon field="discountValue" />
            </th>
            <th pSortableColumn="usedCount" style="width:130px">
              Usage <p-sortIcon field="usedCount" />
            </th>
            <th pSortableColumn="minOrderAmount" style="width:115px">
              Min Order <p-sortIcon field="minOrderAmount" />
            </th>
            <th pSortableColumn="expiryDate" style="width:130px">
              Expiry <p-sortIcon field="expiryDate" />
            </th>
            <th style="width:90px" class="cp-th-center">
              Active
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="cp-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:80px" class="cp-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <div class="cp-code-cell">
                <span class="cp-code">{{ c.code }}</span>
                <div class="cp-desc" *ngIf="c.description">{{ c.description }}</div>
              </div>
            </td>
            <td>
              <span class="cp-type-badge"
                [class.cp-type-pct]="c.discountType === 1"
                [class.cp-type-fix]="c.discountType === 2">
                {{ c.discountType === 1 ? '% Off' : '₹ Fixed' }}
              </span>
            </td>
            <td>
              <span class="cp-value">
                {{ c.discountType === 1 ? c.discountValue + '%' : ('₹' + c.discountValue) }}
              </span>
            </td>
            <td>
              <div class="cp-usage-cell">
                <span class="cp-usage-text">{{ c.usedCount }} / {{ c.usageLimit ?? '∞' }}</span>
                <div class="cp-usage-bar">
                  <div class="cp-usage-fill"
                    [style.width.%]="c.usageLimit ? (c.usedCount / c.usageLimit * 100) : 0"></div>
                </div>
              </div>
            </td>
            <td>
              <span class="cp-min-order" *ngIf="c.minOrderAmount">₹{{ c.minOrderAmount | number:'1.0-0' }}</span>
              <span class="cp-no-min" *ngIf="!c.minOrderAmount">—</span>
            </td>
            <td>
              <ng-container *ngIf="c.expiryDate; else noExpiry">
                <span class="cp-expiry" [class.cp-expired]="isExpired(c.expiryDate)">
                  {{ formatDate(c.expiryDate) }}
                </span>
                <span class="cp-expired-tag" *ngIf="isExpired(c.expiryDate)">Expired</span>
              </ng-container>
              <ng-template #noExpiry>
                <span class="cp-no-expiry">No expiry</span>
              </ng-template>
            </td>
            <td class="cp-td-center">
              <p-toggleswitch [(ngModel)]="c.isActive" (ngModelChange)="toggleStatus(c)" />
            </td>
            <td>
              <div class="cp-actions">
                <button class="cp-act-btn cp-act-edit" (click)="openDialog(c)" pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="cp-act-btn cp-act-del" (click)="confirmDelete(c)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="cp-empty">
              <div class="cp-empty-icon"><i class="pi pi-tag"></i></div>
              <p class="cp-empty-title">No coupons yet</p>
              <p class="cp-empty-sub">Create your first discount coupon to get started.</p>
              <button class="cp-state-btn" (click)="openDialog(null)">
                <i class="pi pi-plus"></i> Add First Coupon
              </button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===== COUPON FORM DIALOG ===== -->
<p-dialog
  [(visible)]="showDialog"
  [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="cp-dlg"
  [class.cp-dlg-edit]="!!editingCoupon"
  [style]="{width:'560px', maxWidth:'96vw'}"
  (onHide)="closeDialog()"
>
  <ng-template pTemplate="header">
    <div class="cp-dlg-head">
      <div class="cp-dlg-icon" [class.cp-dlg-icon-edit]="!!editingCoupon">
        <i [class]="editingCoupon ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="cp-dlg-titles">
        <div class="cp-dlg-title">{{ editingCoupon ? 'Edit Coupon' : 'New Coupon' }}</div>
        <div class="cp-dlg-sub">{{ editingCoupon ? 'Update coupon details below' : 'Fill in the details to create a discount code' }}</div>
      </div>
      <button class="cp-dlg-x" (click)="closeDialog()" [disabled]="saving()">
        <i class="pi pi-times"></i>
      </button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="cp-form">

    <!-- Coupon Code -->
    <div class="cp-field">
      <label class="cp-label">Coupon Code <span class="cp-req">*</span></label>
      <div class="cp-input-wrap" [class.cp-input-err]="f['code'].invalid && f['code'].touched">
        <i class="pi pi-tag cp-input-icon"></i>
        <input pInputText formControlName="code" placeholder="e.g. SAVE20"
          class="cp-inp cp-inp-icon cp-inp-code" style="text-transform:uppercase" />
      </div>
      <small class="cp-err-msg" *ngIf="f['code'].invalid && f['code'].touched">
        <i class="pi pi-exclamation-circle"></i> Code is required
      </small>
    </div>

    <!-- Description -->
    <div class="cp-field">
      <label class="cp-label">Description</label>
      <textarea pTextarea formControlName="description" rows="2"
        placeholder="Brief description of this coupon…" class="cp-textarea"></textarea>
    </div>

    <!-- Discount Type + Value -->
    <div class="cp-form-2col">
      <div class="cp-field">
        <label class="cp-label">Discount Type <span class="cp-req">*</span></label>
        <div class="cp-select-wrap">
          <i class="pi pi-percentage cp-select-icon"></i>
          <p-select formControlName="discountType" [options]="discountTypeOptions"
            optionLabel="label" optionValue="value" styleClass="cp-dlg-sel" />
        </div>
      </div>
      <div class="cp-field">
        <label class="cp-label">
          Value {{ form.get('discountType')?.value === 1 ? '(%)' : '(₹)' }} <span class="cp-req">*</span>
        </label>
        <div class="cp-input-wrap">
          <i class="pi pi-indian-rupee cp-input-icon" *ngIf="form.get('discountType')?.value === 2"></i>
          <i class="pi pi-percentage cp-input-icon" *ngIf="form.get('discountType')?.value !== 2"></i>
          <input pInputText formControlName="discountValue" type="number" min="0"
            placeholder="0" class="cp-inp cp-inp-icon" />
        </div>
      </div>
    </div>

    <!-- Min Order + Max Discount -->
    <div class="cp-form-2col">
      <div class="cp-field">
        <label class="cp-label">Min Order (₹)</label>
        <div class="cp-input-wrap">
          <i class="pi pi-shopping-cart cp-input-icon"></i>
          <input pInputText formControlName="minOrderAmount" type="number" min="0"
            placeholder="No minimum" class="cp-inp cp-inp-icon" />
        </div>
        <small class="cp-hint-msg">Min cart value to apply</small>
      </div>
      <div class="cp-field">
        <label class="cp-label">Max Discount (₹)</label>
        <div class="cp-input-wrap">
          <i class="pi pi-arrow-down cp-input-icon"></i>
          <input pInputText formControlName="maxDiscountAmount" type="number" min="0"
            placeholder="No cap" class="cp-inp cp-inp-icon" />
        </div>
        <small class="cp-hint-msg">Cap for % type coupons</small>
      </div>
    </div>

    <!-- Usage Limit + Per User -->
    <div class="cp-form-2col">
      <div class="cp-field">
        <label class="cp-label">Total Usage Limit</label>
        <div class="cp-input-wrap">
          <i class="pi pi-users cp-input-icon"></i>
          <input pInputText formControlName="usageLimit" type="number" min="1"
            placeholder="Unlimited" class="cp-inp cp-inp-icon" />
        </div>
      </div>
      <div class="cp-field">
        <label class="cp-label">Per User Limit</label>
        <div class="cp-input-wrap">
          <i class="pi pi-user cp-input-icon"></i>
          <input pInputText formControlName="perUserLimit" type="number" min="1"
            placeholder="Unlimited" class="cp-inp cp-inp-icon" />
        </div>
      </div>
    </div>

    <!-- Start Date + Expiry Date -->
    <div class="cp-form-2col">
      <div class="cp-field">
        <label class="cp-label">Start Date</label>
        <div class="cp-input-wrap">
          <i class="pi pi-calendar cp-input-icon"></i>
          <input type="date" formControlName="startDate" class="cp-inp cp-inp-icon cp-date-inp" />
        </div>
      </div>
      <div class="cp-field">
        <label class="cp-label">Expiry Date</label>
        <div class="cp-input-wrap" [class.cp-input-expired]="f['expiryDate'].value && isExpired(f['expiryDate'].value)">
          <i class="pi pi-calendar-times cp-input-icon"></i>
          <input type="date" formControlName="expiryDate" class="cp-inp cp-inp-icon cp-date-inp" />
        </div>
        <small class="cp-expired-hint" *ngIf="f['expiryDate'].value && isExpired(f['expiryDate'].value)">
          <i class="pi pi-exclamation-triangle"></i> This date is in the past
        </small>
      </div>
    </div>

  </form>

  <ng-template pTemplate="footer">
    <div class="cp-dlg-footer">
      <button class="cp-dlg-cancel" [disabled]="saving()" (click)="closeDialog()">
        <i class="pi pi-times"></i> Cancel
      </button>
      <button class="cp-dlg-save" [disabled]="form.invalid || saving()" (click)="save()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingCoupon ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? (editingCoupon ? 'Updating…' : 'Creating…') : (editingCoupon ? 'Update Coupon' : 'Create Coupon') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`

/* ================================================================
   COUPONS — ViewEncapsulation.None, all selectors .cp-*
================================================================ */

.cp-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

/* Header */
.cp-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.cp-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.cp-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.cp-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.cp-refresh-btn   { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.cp-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }
.cp-add-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.13s; }
.cp-add-btn:hover { background: #115E59; }
.cp-add-btn .pi { font-size: 11px; }

/* KPI */
.cp-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.cp-kpi-card {
  background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.cp-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.cp-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.cp-card-blue  { border-top-color: #2563EB !important; }
.cp-card-teal  { border-top-color: #0F766E !important; }
.cp-card-red   { border-top-color: #DC2626 !important; }
.cp-card-amber { border-top-color: #D97706 !important; }

.cp-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.cp-icon-blue  { background: #EFF6FF; color: #2563EB; }
.cp-icon-teal  { background: #F0FDFA; color: #0F766E; }
.cp-icon-red   { background: #FEF2F2; color: #DC2626; }
.cp-icon-amber { background: #FFFBEB; color: #D97706; }

.cp-kpi-num  { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.cp-kpi-lbl  { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.cp-sk-icon  { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.cp-sk-num   { margin-bottom: 6px; display: block; }

/* Table card */
.cp-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }

/* State */
.cp-state-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }

/* Filter bar */
.cp-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cp-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.cp-filter-info .pi { font-size: 11px; }
.cp-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.cp-clear-all-btn:hover { background: #DCFCE7; }
.cp-clear-all-btn .pi { font-size: 10px; }

/* Skeleton */
.cp-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.cp-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cp-load-row     { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.cp-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cp-toolbar-spacer { flex: 1; }
.cp-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.cp-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

/* Table header */
.cp-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.cp-th-center { text-align: center !important; }
.cp-td-center { text-align: center !important; }

/* Sort & filter icons */
.cp-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.cp-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.cp-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.cp-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.cp-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.cp-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Rows */
.cp-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 52px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.cp-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.cp-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }

/* Paginator */
.cp-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }

/* Col select */
.cp-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.cp-code-cell { display: flex; flex-direction: column; gap: 1px; }
.cp-code  { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #0F766E; letter-spacing: 0.08em; text-transform: uppercase; }
.cp-desc  { font-size: 10.5px; color: #94A3B8; }

.cp-type-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.cp-type-pct { background: #EFF6FF; color: #2563EB; }
.cp-type-fix { background: #FFF7ED; color: #C2410C; }

.cp-value { font-size: 13.5px; font-weight: 700; color: #0F172A; }

.cp-usage-cell { display: flex; flex-direction: column; gap: 4px; }
.cp-usage-text { font-size: 12px; color: #475569; font-weight: 500; }
.cp-usage-bar  { height: 4px; border-radius: 2px; background: #F1F5F9; width: 72px; overflow: hidden; }
.cp-usage-fill { height: 100%; border-radius: 2px; background: #0F766E; transition: width 0.3s; }

.cp-min-order { font-size: 12.5px; color: #334155; font-weight: 500; }
.cp-no-min    { font-size: 12px; color: #CBD5E1; }

.cp-expiry     { font-size: 12px; color: #475569; display: block; }
.cp-expired    { color: #DC2626; font-weight: 600; }
.cp-expired-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #DC2626; background: #FEF2F2; padding: 1px 5px; border-radius: 3px; margin-top: 2px; }
.cp-no-expiry  { font-size: 11px; color: #CBD5E1; font-style: italic; }

/* Actions */
.cp-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.cp-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; color: #64748B; transition: background 0.12s, color 0.12s; }
.cp-act-btn .pi { font-size: 12px; }
.cp-act-edit { color: #2563EB; }
.cp-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.cp-act-del { color: #DC2626; }
.cp-act-del:hover  { background: #FEF2F2; color: #B91C1C; }
.cp-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.cp-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.cp-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.cp-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.cp-search-input::placeholder { color: #CBD5E1; }
.cp-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.cp-search-clear:hover { background: #CBD5E1; }

/* Empty */
.cp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; gap: 2px; }
.cp-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.cp-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.cp-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.cp-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0 0 10px; }

/* ===== DIALOG ===== */
.cp-dlg { border-radius: 14px !important; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.10) !important; }
.cp-dlg .p-dialog-header { padding: 0 !important; border-bottom: none !important; background: #fff !important; }
.cp-dlg .p-dialog-content { padding: 20px 22px !important; background: #fff !important; max-height: 72vh; overflow-y: auto; }
.cp-dlg .p-dialog-footer  { padding: 14px 22px !important; border-top: 1px solid #F1F5F9 !important; background: #FAFBFC !important; border-radius: 0 0 14px 14px; }

.cp-dlg .p-dialog-header::before { content: ''; display: block; height: 4px; background: linear-gradient(90deg, #0F766E 0%, #14B8A6 100%); }
.cp-dlg-edit .p-dialog-header::before { background: linear-gradient(90deg, #2563EB 0%, #7C3AED 100%); }

.cp-dlg-head   { display: flex; align-items: center; gap: 12px; padding: 16px 22px 14px; }
.cp-dlg-icon   { width: 38px; height: 38px; border-radius: 10px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid #CCFBF1; }
.cp-dlg-icon-edit { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.cp-dlg-titles { flex: 1; min-width: 0; }
.cp-dlg-title  { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.cp-dlg-sub    { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }
.cp-dlg-x { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #94A3B8; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; flex-shrink: 0; transition: background 0.13s, color 0.13s; }
.cp-dlg-x:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.cp-dlg-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* Form */
.cp-form { display: flex; flex-direction: column; gap: 14px; }
.cp-field { display: flex; flex-direction: column; gap: 5px; }
.cp-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cp-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.cp-req   { color: #DC2626; }

.cp-input-wrap {
  position: relative; display: flex; align-items: center;
  border: 1px solid #E2E8F0; border-radius: 8px; background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cp-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.cp-input-wrap.cp-input-err { border-color: #FCA5A5; }
.cp-input-wrap.cp-input-expired { border-color: #FCA5A5 !important; }
.cp-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; z-index: 1; }

.cp-inp {
  width: 100%; height: 36px; border: none !important; outline: none !important;
  box-shadow: none !important; background: transparent !important;
  font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important;
  border-radius: 8px !important;
}
.cp-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.cp-inp-icon { padding-left: 30px !important; }
.cp-inp-code { font-family: 'Courier New', monospace !important; font-weight: 700 !important; letter-spacing: 0.08em !important; color: #0F766E !important; font-size: 13px !important; text-transform: uppercase !important; }
.cp-date-inp { color: #334155 !important; }

.cp-select-wrap { position: relative; }
.cp-select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #94A3B8; z-index: 2; pointer-events: none; }
.cp-dlg-sel { width: 100% !important; }
.cp-dlg-sel .p-select { width: 100% !important; height: 36px !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; font-size: 13px !important; box-shadow: none !important; padding-left: 30px !important; }
.cp-dlg-sel .p-select:focus-within, .cp-dlg-sel .p-select.p-focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.cp-dlg-sel .p-select .p-select-label { font-size: 13px !important; color: #0F172A !important; line-height: 36px !important; padding: 0 8px !important; }
.cp-dlg-sel .p-select .p-select-label.p-placeholder { color: #94A3B8 !important; }

.cp-textarea {
  width: 100% !important; box-sizing: border-box; resize: none;
  padding: 9px 11px !important; font-size: 13px !important; color: #0F172A !important;
  border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important;
  transition: border-color 0.15s, box-shadow 0.15s; line-height: 1.5;
  box-shadow: none !important; outline: none !important; font-family: inherit !important;
}
.cp-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.cp-textarea::placeholder { color: #CBD5E1 !important; }

.cp-err-msg { font-size: 11px; color: #DC2626; display: flex; align-items: center; gap: 4px; }
.cp-err-msg .pi { font-size: 10px; }
.cp-hint-msg { font-size: 11px; color: #94A3B8; }
.cp-expired-hint { font-size: 11px; color: #DC2626; display: flex; align-items: center; gap: 4px; }
.cp-expired-hint .pi { font-size: 10px; }

/* Footer */
.cp-dlg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.cp-dlg-cancel { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background 0.13s, border-color 0.13s; }
.cp-dlg-cancel:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; color: #334155; }
.cp-dlg-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.cp-dlg-cancel .pi { font-size: 10px; }
.cp-dlg-save { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 16px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background 0.13s, box-shadow 0.13s; box-shadow: 0 1px 4px rgba(15,118,110,0.25); }
.cp-dlg-save:hover:not(:disabled) { background: #115E59; box-shadow: 0 2px 8px rgba(15,118,110,0.35); }
.cp-dlg-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.cp-dlg-save .pi { font-size: 11px; }

@media (max-width: 768px) {
  .cp-table-card { min-width: 0; overflow-x: auto !important; }
}

  `]
})
export class AdminCouponsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  searchValue = '';
  private api     = inject(ApiService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  loading  = signal(true);
  saving   = signal(false);
  coupons  = signal<Coupon[]>([]);

  totalCoupons  = computed(() => this.coupons().length);
  activeCount   = computed(() => this.coupons().filter(c => c.isActive).length);
  expiredCount  = computed(() => this.coupons().filter(c => c.expiryDate ? this.isExpired(c.expiryDate) : false).length);
  totalUsed     = computed(() => this.coupons().reduce((s, c) => s + c.usedCount, 0));

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  showDialog    = false;
  editingCoupon: Coupon | null = null;

  discountTypeOptions = [
    { label: 'Percentage (%)', value: 1 },
    { label: 'Fixed Amount (₹)', value: 2 }
  ];

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  form = this.fb.group({
    code:               ['', Validators.required],
    description:        [''],
    discountType:       [1 as 1 | 2, Validators.required],
    discountValue:      [0, [Validators.required, Validators.min(0)]],
    minOrderAmount:     [null as number | null],
    maxDiscountAmount:  [null as number | null],
    usageLimit:         [null as number | null],
    perUserLimit:       [null as number | null],
    startDate:          ['' as string],
    expiryDate:         ['' as string],
  });

  get f() { return this.form.controls; }

  ngOnInit(): void { this.loadCoupons(); }

  loadCoupons(): void {
    this.loading.set(true);
    this.api.get<any>('coupons', { page: 1, pageSize: 200 }).subscribe({
      next: res => { this.coupons.set(res.data?.items ?? res.data ?? []); this.loading.set(false); },
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

  openDialog(coupon: Coupon | null): void {
    this.editingCoupon = coupon;
    this.form.reset({ discountType: 1, discountValue: 0 });
    if (coupon) {
      this.form.patchValue({
        code: coupon.code,
        description: coupon.description ?? '',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount ?? null,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        usageLimit: coupon.usageLimit ?? null,
        perUserLimit: coupon.perUserLimit ?? null,
        startDate:  coupon.startDate  ? coupon.startDate.slice(0,10)  : '',
        expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0,10) : '',
      });
    }
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.editingCoupon = null;
    this.form.reset({ discountType: 1, discountValue: 0 });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const dto: any = { ...this.form.value };
    if (dto.startDate)  dto.startDate  = new Date(dto.startDate).toISOString();
    if (dto.expiryDate) dto.expiryDate = new Date(dto.expiryDate).toISOString();

    const req$ = this.editingCoupon
      ? this.api.put(`coupons/${this.editingCoupon.id}`, dto)
      : this.api.post('coupons', dto);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Coupon ${this.editingCoupon ? 'updated' : 'created'}`, life: 2500 });
        this.closeDialog();
        this.loadCoupons();
      },
      error: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save coupon', life: 3000 });
      }
    });
  }

  toggleStatus(coupon: Coupon): void {
    this.api.patch(`coupons/${coupon.id}/toggle-status`).subscribe({
      next: () => this.toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated', life: 2000 }),
      error: () => {
        coupon.isActive = !coupon.isActive;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 });
      }
    });
  }

  confirmDelete(coupon: Coupon): void {
    this.confirm.confirm({
      header: 'Delete Coupon',
      message: `Delete coupon "${coupon.code}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.api.delete(`coupons/${coupon.id}`).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: `Coupon "${coupon.code}" deleted`, life: 2500 });
            this.loadCoupons();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete coupon', life: 3000 })
        });
      }
    });
  }

  isExpired(date: string): boolean {
    return new Date(date) < new Date();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
