import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation, ElementRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductService } from '../../core/services/product.service';
import { Category } from '../../core/models/product.models';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgFor, NgIf, ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, ToggleSwitchModule, TooltipModule,
    MediaUrlPipe
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="cat-page">

  <!-- Page Header -->
  <div class="cat-page-header">
    <div>
      <h1 class="cat-page-title">Categories</h1>
      <p class="cat-page-sub">{{ totalCategories() }} categories in catalog</p>
    </div>
    <div class="cat-header-actions">
      <button class="cat-refresh-btn" (click)="load()" title="Refresh">
        <i class="pi pi-refresh"></i>
      </button>
      <button class="cat-add-btn" (click)="openAdd()">
        <i class="pi pi-plus"></i> Add Category
      </button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="cat-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="cat-kpi-card cat-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="cat-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="cat-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="cat-kpi-card cat-card-blue">
        <div class="cat-kpi-icon cat-icon-blue"><i class="pi pi-th-large"></i></div>
        <div class="cat-kpi-num">{{ totalCategories() }}</div>
        <div class="cat-kpi-lbl">Total Categories</div>
      </div>
      <div class="cat-kpi-card cat-card-teal">
        <div class="cat-kpi-icon cat-icon-teal"><i class="pi pi-box"></i></div>
        <div class="cat-kpi-num">{{ totalProducts() }}</div>
        <div class="cat-kpi-lbl">Total Products</div>
      </div>
      <div class="cat-kpi-card cat-card-amber">
        <div class="cat-kpi-icon cat-icon-amber"><i class="pi pi-star"></i></div>
        <div class="cat-kpi-num">{{ featuredCount() }}</div>
        <div class="cat-kpi-lbl">Featured</div>
      </div>
      <div class="cat-kpi-card cat-card-purple">
        <div class="cat-kpi-icon cat-icon-purple"><i class="pi pi-eye"></i></div>
        <div class="cat-kpi-num">{{ activeCount() }}</div>
        <div class="cat-kpi-lbl">Active</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="cat-table-card">

    @if (loading()) {
      <div class="cat-load-toolbar">
        <p-skeleton width="80px" height="28px" styleClass="cat-sk-sq" />
      </div>
      <div class="cat-load-head"></div>
      @for (r of [1,2,3,4,5,6,7]; track r) {
        <div class="cat-load-row" [style.opacity]="(8 - r) / 8"></div>
      }
    }

    @if (!loading() && hasError()) {
      <div class="cat-state">
        <div class="cat-state-icon cat-state-err"><i class="pi pi-exclamation-triangle"></i></div>
        <p class="cat-state-title">Unable to load categories</p>
        <p class="cat-state-sub">Something went wrong. Please try again.</p>
        <button class="cat-state-btn" (click)="load()"><i class="pi pi-refresh"></i> Retry</button>
      </div>
    }

    @if (!loading() && !hasError()) {

      @if (hasActiveFilters()) {
        <div class="cat-filter-bar">
          <span class="cat-filter-info">
            <i class="pi pi-filter-fill"></i>
            {{ activeFilterCount() }} column filter{{ activeFilterCount() > 1 ? 's' : '' }} applied
          </span>
          <button class="cat-clear-all-btn" (click)="clearAllFilters()">
            <i class="pi pi-times"></i> Clear All
          </button>
        </div>
      }

      <div class="cat-toolbar">
        <div class="cat-search-wrap">
          <i class="pi pi-search cat-search-icon"></i>
          <input
            class="cat-search-input"
            type="text"
            placeholder="Search categories…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')"
          />
          <button *ngIf="searchValue" class="cat-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cat-toolbar-spacer"></div>
        <button class="cat-icon-btn" (click)="load()" title="Refresh">
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <p-table #dt
        [value]="allCategories()"
        [paginator]="true"
        [rows]="25"
        [rowsPerPageOptions]="[10,25,50]"
        [sortField]="'name'"
        [sortOrder]="1"
        dataKey="id"
        filterDisplay="menu"
        [globalFilterFields]="['name','slug','parentCategoryName']"
        (onFilter)="onTableFilter($event)"
        styleClass="cat-dt"
        [tableStyle]="{'min-width':'720px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} categories"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="cat-th-center">#</th>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="parentCategoryName" style="width:150px">
              Parent <p-sortIcon field="parentCategoryName" />
              <p-columnFilter type="text" field="parentCategoryName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="productCount" style="width:90px" class="cat-th-center">
              Products <p-sortIcon field="productCount" />
            </th>
            <th style="width:115px" class="cat-th-center">Featured</th>
            <th pSortableColumn="isActive" style="width:105px" class="cat-th-center">
              Status <p-sortIcon field="isActive" />
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="cat-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:85px" class="cat-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-cat let-i="rowIndex">
          <tr>
            <td class="cat-td-center cat-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="cat-name-cell">
                <div class="cat-thumb">
                  <img *ngIf="cat.imageUrl" [src]="cat.imageUrl | mediaUrl" [alt]="cat.name" />
                  <i *ngIf="!cat.imageUrl" class="pi pi-th-large"></i>
                </div>
                <div>
                  <div class="cat-name">{{ cat.name }}</div>
                  <div class="cat-slug" *ngIf="cat.slug">{{ cat.slug }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="cat-parent" *ngIf="cat.parentCategoryName">
                <i class="pi pi-arrow-right-arrow-left"></i>{{ cat.parentCategoryName }}
              </span>
              <span class="cat-root" *ngIf="!cat.parentCategoryName">Root</span>
            </td>
            <td class="cat-td-center">
              <span class="cat-count-badge">{{ cat.productCount }}</span>
            </td>
            <td class="cat-td-center">
              <button class="cat-feat-pill"
                [class.cat-feat-yes]="cat.isFeatured"
                [class.cat-feat-no]="!cat.isFeatured"
                (click)="toggleFeatured(cat)"
                [pTooltip]="cat.isFeatured ? 'Remove from featured' : 'Mark as featured'">
                <i [class]="cat.isFeatured ? 'pi pi-star-fill' : 'pi pi-star'"></i>
                {{ cat.isFeatured ? 'Featured' : 'No' }}
              </button>
            </td>
            <td class="cat-td-center">
              <button class="cat-status-pill"
                [class.cat-status-active]="cat.isActive"
                [class.cat-status-inactive]="!cat.isActive"
                (click)="toggleStatus(cat)"
                [pTooltip]="cat.isActive ? 'Click to deactivate' : 'Click to activate'">
                <span class="cat-status-dot"></span>
                {{ cat.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <div class="cat-actions">
                <button class="cat-act-btn cat-act-edit" (click)="openEdit(cat)" pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="cat-act-btn cat-act-del" (click)="deleteCategory(cat)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="cat-empty">
              <div class="cat-empty-icon"><i class="pi pi-th-large"></i></div>
              <p class="cat-empty-title">No categories found</p>
              <p class="cat-empty-sub">{{ totalCategories() === 0 ? 'Add your first category to get started.' : 'Try adjusting your filters.' }}</p>
              <button *ngIf="totalCategories() === 0" class="cat-state-btn" (click)="openAdd()">
                <i class="pi pi-plus"></i> Add First Category
              </button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===== CATEGORY FORM DIALOG ===== -->
<p-dialog
  [(visible)]="dialogVisible"
  [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="cat-dlg"
  [class.cat-dlg-edit]="isEdit"
  [style]="{width:'560px', maxWidth:'96vw'}"
>
  <ng-template pTemplate="header">
    <div class="cat-dlg-head">
      <div class="cat-dlg-icon" [class.cat-dlg-icon-edit]="isEdit">
        <i [class]="isEdit ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="cat-dlg-titles">
        <div class="cat-dlg-title">{{ isEdit ? 'Edit Category' : 'Add New Category' }}</div>
        <div class="cat-dlg-sub">{{ isEdit ? 'Update category details below' : 'Fill in the details to create a new category' }}</div>
      </div>
      <button class="cat-dlg-x" (click)="closeDialog()" [disabled]="saving()">
        <i class="pi pi-times"></i>
      </button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="cat-form">

    <!-- Row 1: Name + Slug side by side -->
    <div class="cat-form-2col">
      <div class="cat-field">
        <label class="cat-label">Category Name <span class="cat-req">*</span></label>
        <div class="cat-input-wrap" [class.cat-input-err]="f['name'].invalid && f['name'].touched">
          <i class="pi pi-tag cat-input-icon"></i>
          <input pInputText formControlName="name" placeholder="e.g. Pain Relief, Vitamins"
            (input)="onNameInput()" class="cat-inp cat-inp-icon" />
        </div>
        <small class="cat-err-msg" *ngIf="f['name'].hasError('required') && f['name'].touched">
          <i class="pi pi-exclamation-circle"></i> Name is required
        </small>
        <small class="cat-err-msg" *ngIf="f['name'].hasError('maxlength') && f['name'].touched">
          <i class="pi pi-exclamation-circle"></i> Max 100 characters
        </small>
      </div>

      <div class="cat-field">
        <label class="cat-label">URL Slug</label>
        <div class="cat-input-wrap">
          <i class="pi pi-link cat-input-icon"></i>
          <input pInputText formControlName="slug" placeholder="auto-generated" class="cat-inp cat-inp-icon cat-inp-slug" />
        </div>
        <small class="cat-hint-msg">Auto-generated from name · editable</small>
      </div>
    </div>

    <!-- Row 2: Parent Category -->
    <div class="cat-field">
      <label class="cat-label">Parent Category</label>
      <div class="cat-select-wrap">
        <i class="pi pi-sitemap cat-select-icon"></i>
        <p-select [options]="parentOptions" formControlName="parentCategoryId"
          optionLabel="name" optionValue="id"
          placeholder="Root Category (no parent)"
          [showClear]="true" styleClass="cat-dlg-sel" panelStyleClass="cat-dlg-panel" />
      </div>
      <small class="cat-hint-msg">Leave empty to make this a top-level category</small>
    </div>

    <!-- Row 3: Description -->
    <div class="cat-field">
      <label class="cat-label">Description</label>
      <textarea pTextarea formControlName="description" rows="3"
        placeholder="Briefly describe what products belong in this category…"
        class="cat-textarea"></textarea>
    </div>

    <!-- Row 3b: Image -->
    <div class="cat-field">
      <label class="cat-label">Category Image</label>
      <div class="cat-img-upload-area" (click)="imageFileInput.click()" (dragover)="$event.preventDefault()" (drop)="onImgDrop($event)">
        <input #imageFileInput type="file" accept="image/*" class="cat-hidden-input" (change)="onImgFile($event)" />
        <ng-container *ngIf="!imagePreview()">
          <div class="cat-img-upload-icon"><i class="pi pi-image"></i></div>
          <p class="cat-img-upload-text">Click or drag image here</p>
          <p class="cat-img-upload-hint">JPG, PNG, WebP · Recommended 400×400px</p>
        </ng-container>
        <ng-container *ngIf="imagePreview()">
          <img [src]="imagePreview()! | mediaUrl" class="cat-img-preview" alt="preview" />
          <button type="button" class="cat-img-remove" (click)="removeImage($event)">
            <i class="pi pi-times"></i>
          </button>
        </ng-container>
        <div class="cat-img-uploading" *ngIf="imageUploading()">
          <i class="pi pi-spin pi-spinner"></i> Uploading…
        </div>
      </div>
    </div>

    <!-- Row 4: Toggles -->
    <div class="cat-field">
      <label class="cat-label">Settings</label>
      <div class="cat-toggle-row">
        <label class="cat-toggle-card" [class.cat-toggle-feat-on]="f['isFeatured'].value">
          <div class="cat-toggle-left">
            <div class="cat-toggle-icon cat-toggle-star">
              <i [class]="f['isFeatured'].value ? 'pi pi-star-fill' : 'pi pi-star'"></i>
            </div>
            <div class="cat-toggle-text">
              <div class="cat-toggle-title">Featured</div>
              <div class="cat-toggle-sub">Highlight on homepage &amp; category pages</div>
            </div>
          </div>
          <p-toggleswitch formControlName="isFeatured" />
        </label>
        <label class="cat-toggle-card" [class.cat-toggle-active-on]="f['isActive'].value">
          <div class="cat-toggle-left">
            <div class="cat-toggle-icon" [class]="f['isActive'].value ? 'cat-toggle-eye-on' : 'cat-toggle-eye-off'">
              <i [class]="f['isActive'].value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
            </div>
            <div class="cat-toggle-text">
              <div class="cat-toggle-title">Active</div>
              <div class="cat-toggle-sub">Visible to customers in the store</div>
            </div>
          </div>
          <p-toggleswitch formControlName="isActive" />
        </label>
      </div>
    </div>

  </form>

  <ng-template pTemplate="footer">
    <div class="cat-dlg-footer">
      <button class="cat-dlg-cancel" [disabled]="saving()" (click)="closeDialog()">
        <i class="pi pi-times"></i> Cancel
      </button>
      <button class="cat-dlg-save" [disabled]="form.invalid || saving()" (click)="save()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (isEdit ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Category' : 'Create Category') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`

/* ================================================================
   CATEGORIES — ViewEncapsulation.None, all selectors .cat-*
================================================================ */

.cat-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

/* Header */
.cat-page-header  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.cat-page-title   { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.cat-page-sub     { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.cat-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }

.cat-refresh-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
  background: #fff; color: #64748B; cursor: pointer; font-size: 12px;
  transition: background 0.14s, color 0.14s;
}
.cat-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }

.cat-add-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  background: #0F766E; color: #fff; font-size: 12px; font-weight: 600;
  border: none; cursor: pointer; transition: background 0.13s;
}
.cat-add-btn:hover { background: #115E59; }
.cat-add-btn .pi { font-size: 11px; }

/* KPI */
.cat-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.cat-kpi-card {
  background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px;
  border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
  transition: box-shadow 0.18s, transform 0.18s;
}
.cat-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07), 0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.cat-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }

.cat-card-blue   { border-top-color: #2563EB !important; }
.cat-card-teal   { border-top-color: #0F766E !important; }
.cat-card-amber  { border-top-color: #D97706 !important; }
.cat-card-purple { border-top-color: #7C3AED !important; }

.cat-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.cat-icon-blue   { background: #EFF6FF; color: #2563EB; }
.cat-icon-teal   { background: #F0FDFA; color: #0F766E; }
.cat-icon-amber  { background: #FFFBEB; color: #D97706; }
.cat-icon-purple { background: #F5F3FF; color: #7C3AED; }

.cat-kpi-num  { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.cat-kpi-lbl  { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.cat-sk-icon  { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.cat-sk-num   { margin-bottom: 6px; display: block; }

/* Table card */
.cat-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }

/* Error / state */
.cat-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; text-align: center; }
.cat-state-icon { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.cat-state-err  { background: #FEF2F2; color: #DC2626; }
.cat-state-icon .pi { font-size: 18px; }
.cat-state-title { font-size: 14px; font-weight: 600; color: #334155; margin: 0 0 4px; }
.cat-state-sub   { font-size: 12px; color: #94A3B8; margin: 0 0 12px; }
.cat-state-btn   { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }

/* Filter bar */
.cat-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cat-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.cat-filter-info .pi { font-size: 11px; }
.cat-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.cat-clear-all-btn:hover { background: #DCFCE7; border-color: #99F6E4; }
.cat-clear-all-btn .pi { font-size: 10px; }

/* Loading skeleton */
.cat-load-toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cat-sk-sq  { border-radius: 7px !important; display: block; }
.cat-load-head { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cat-load-row  { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }

/* Toolbar */
.cat-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cat-toolbar-spacer { flex: 1; }
.cat-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.13s; }
.cat-icon-btn:hover { background: #F8FAFC; color: #0F172A; }

.cat-dt.p-datatable .p-datatable-caption,
.cat-dt.p-datatable .p-datatable-header { padding: 0 !important; border: none !important; background: transparent !important; }

/* Table header */
.cat-dt .p-datatable-thead > tr > th {
  background: #F0FDF9 !important; color: #0F5C4D !important;
  font-size: 10.5px !important; font-weight: 600 !important;
  text-transform: uppercase !important; letter-spacing: 0.04em !important;
  padding: 0 13px !important; height: 44px !important;
  border-top: none !important; border-right: none !important; border-left: none !important;
  border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap;
}
.cat-th-center { text-align: center !important; }

/* Sort & filter icons */
.cat-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.cat-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.cat-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.cat-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transition: background 0.12s, color 0.12s; }
.cat-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.cat-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }

/* Rows */
.cat-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 52px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.cat-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.cat-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; transition: background 150ms ease; }
.cat-td-center { text-align: center !important; }

/* Paginator */
.cat-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }

/* Cell content */
.cat-row-idx  { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.cat-name-cell { display: flex; align-items: center; gap: 10px; }
.cat-thumb    { width: 34px; height: 34px; border-radius: 7px; overflow: hidden; border: 1px solid #F1F5F9; background: #F8FAFC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cat-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cat-thumb .pi { font-size: 13px; color: #CBD5E1; }
.cat-name     { font-size: 13px; font-weight: 500; color: #0F172A; line-height: 1.3; white-space: nowrap; }
.cat-slug     { font-size: 10.5px; color: #94A3B8; font-family: 'Courier New', monospace; margin-top: 1px; white-space: nowrap; }
.cat-parent   { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #475569; }
.cat-parent .pi { font-size: 9px; color: #94A3B8; }
.cat-root     { font-size: 11px; color: #CBD5E1; font-style: italic; }

.cat-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 22px; padding: 0 6px; border-radius: 4px; background: #EFF6FF; color: #2563EB; font-size: 11.5px; font-weight: 700; }

/* Featured pill */
.cat-feat-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; border: 1px solid; font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap; }
.cat-feat-yes  { background: #FFFBEB; color: #D97706; border-color: #FDE68A; }
.cat-feat-yes .pi { color: #F59E0B; }
.cat-feat-no   { background: #F8FAFC; color: #94A3B8; border-color: #E2E8F0; }
.cat-feat-pill:hover { opacity: 0.75; }

/* Status pill */
.cat-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; border: none; font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap; }
.cat-status-active   { background: #F0FDF4; color: #16A34A; }
.cat-status-inactive { background: #FEF2F2; color: #DC2626; }
.cat-status-pill:hover { opacity: 0.75; }
.cat-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

/* Col select */
.cat-col-sel { width: 100% !important; font-size: 12px !important; }

/* Actions */
.cat-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.cat-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; transition: background 0.12s, color 0.12s; }
.cat-act-btn .pi { font-size: 12px; }
.cat-act-edit { color: #2563EB; }
.cat-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.cat-act-del  { color: #DC2626; }
.cat-act-del:hover  { background: #FEF2F2; color: #B91C1C; }

/* Empty state */
.cat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 24px; text-align: center; gap: 2px; }
.cat-empty-icon { width: 34px; height: 34px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.cat-empty-icon .pi { font-size: 15px; color: #94A3B8; }
.cat-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.cat-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0 0 10px; }

/* ===== DIALOG SHELL ===== */
.cat-dlg { border-radius: 14px !important; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.10) !important; }
.cat-dlg .p-dialog-header { padding: 0 !important; border-bottom: none !important; background: #fff !important; }
.cat-dlg .p-dialog-content { padding: 20px 22px !important; background: #fff !important; max-height: 72vh; overflow-y: auto; }
.cat-dlg .p-dialog-footer  { padding: 14px 22px !important; border-top: 1px solid #F1F5F9 !important; background: #FAFBFC !important; border-radius: 0 0 14px 14px; }

/* Colored top accent bar */
.cat-dlg .p-dialog-header::before {
  content: ''; display: block; height: 4px;
  background: linear-gradient(90deg, #0F766E 0%, #14B8A6 100%);
}
.cat-dlg-edit .p-dialog-header::before {
  background: linear-gradient(90deg, #2563EB 0%, #7C3AED 100%);
}

/* Header inner */
.cat-dlg-head   { display: flex; align-items: center; gap: 12px; padding: 16px 22px 14px; }
.cat-dlg-icon   { width: 38px; height: 38px; border-radius: 10px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid #CCFBF1; }
.cat-dlg-icon-edit { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.cat-dlg-titles { flex: 1; min-width: 0; }
.cat-dlg-title  { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.cat-dlg-sub    { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }
.cat-dlg-x {
  width: 30px; height: 30px; border-radius: 7px; border: 1px solid #E2E8F0;
  background: #fff; color: #94A3B8; display: flex; align-items: center;
  justify-content: center; cursor: pointer; font-size: 11px; flex-shrink: 0;
  transition: background 0.13s, color 0.13s, border-color 0.13s;
}
.cat-dlg-x:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.cat-dlg-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== FORM ===== */
.cat-form { display: flex; flex-direction: column; gap: 16px; }
.cat-field { display: flex; flex-direction: column; gap: 5px; }
.cat-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cat-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.cat-req   { color: #DC2626; }

/* Input with icon */
.cat-input-wrap {
  position: relative; display: flex; align-items: center;
  border: 1px solid #E2E8F0; border-radius: 8px; background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cat-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.cat-input-wrap.cat-input-err { border-color: #FCA5A5; }
.cat-input-wrap.cat-input-err:focus-within { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
.cat-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; z-index: 1; }

.cat-inp {
  width: 100%; height: 36px; border: none !important; outline: none !important;
  box-shadow: none !important; background: transparent !important;
  font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important;
  border-radius: 8px !important;
}
.cat-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.cat-inp-icon { padding-left: 30px !important; }
.cat-inp-slug { font-family: 'Courier New', monospace !important; font-size: 12px !important; color: #0F766E !important; }

.cat-err-msg  { font-size: 11px; color: #DC2626; display: flex; align-items: center; gap: 4px; }
.cat-err-msg .pi { font-size: 10px; }
.cat-hint-msg { font-size: 11px; color: #94A3B8; }

/* Select */
.cat-select-wrap { position: relative; }
.cat-select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #94A3B8; z-index: 2; pointer-events: none; }
.cat-dlg-sel { width: 100% !important; }
.cat-dlg-sel.p-select { width: 100% !important; height: 36px !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; font-size: 13px !important; box-shadow: none !important; display: flex !important; align-items: center !important; }
.cat-dlg-sel.p-select:focus-within,
.cat-dlg-sel.p-select.p-focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
/* left padding clears the sitemap icon that sits over the box; the text is the same small size as the other fields */
.cat-dlg-sel .p-select-label { font-size: 13px !important; color: #0F172A !important; line-height: 34px !important; padding: 0 8px 0 34px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cat-dlg-sel .p-select-label.p-placeholder { color: #94A3B8 !important; }
.cat-dlg-sel .p-select-dropdown { width: 32px !important; }
.cat-dlg-sel .p-select-dropdown svg, .cat-dlg-sel .p-select-clear-icon { width: 12px !important; height: 12px !important; }
/* the list that opens under the box (it is attached to the page, so it has its own class) */
.cat-dlg-panel .p-select-option { font-size: 13px !important; padding: 8px 12px !important; line-height: 1.3 !important; }
.cat-dlg-panel .p-select-list { padding: 4px !important; }

/* Textarea */
.cat-textarea {
  width: 100% !important; box-sizing: border-box; resize: none;
  height: auto; padding: 9px 11px !important; font-size: 13px !important;
  color: #0F172A !important; border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important; background: #fff !important;
  transition: border-color 0.15s, box-shadow 0.15s; line-height: 1.5;
  box-shadow: none !important; outline: none !important;
  font-family: inherit !important;
}
.cat-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; outline: none !important; }
.cat-textarea::placeholder { color: #CBD5E1 !important; }

/* ===== TOGGLE CARDS ===== */
.cat-toggle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cat-toggle-card {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  cursor: pointer; user-select: none;
}
.cat-toggle-feat-on  { border-color: #FDE68A; background: #FFFBEB; }
.cat-toggle-active-on { border-color: #BBFFD9; background: #F0FDF9; }
.cat-toggle-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.cat-toggle-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: background 0.15s, color 0.15s; }
.cat-toggle-star     { background: #FFFBEB; color: #D97706; }
.cat-toggle-feat-on .cat-toggle-star { background: #FEF3C7; color: #B45309; }
.cat-toggle-eye-on   { background: #ECFDF5; color: #059669; }
.cat-toggle-eye-off  { background: #F1F5F9; color: #94A3B8; }
.cat-toggle-text { min-width: 0; }
.cat-toggle-title { font-size: 12.5px; font-weight: 600; color: #0F172A; }
.cat-toggle-sub   { font-size: 10.5px; color: #94A3B8; line-height: 1.3; }
.cat-toggle-feat-on .cat-toggle-title  { color: #92400E; }
.cat-toggle-active-on .cat-toggle-title { color: #065F46; }

/* ===== IMAGE UPLOAD ===== */
.cat-img-upload-area {
  position: relative; border: 2px dashed #CBD5E1; border-radius: 10px;
  background: #F8FAFC; min-height: 120px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; cursor: pointer; transition: border-color .15s, background .15s; overflow: hidden;
}
.cat-img-upload-area:hover { border-color: #0F766E; background: #F0FDFA; }
.cat-hidden-input { display: none; }
.cat-img-upload-icon { width: 40px; height: 40px; border-radius: 9px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.cat-img-upload-text { font-size: 13px; font-weight: 600; color: #334155; margin: 0; }
.cat-img-upload-hint { font-size: 11px; color: #94A3B8; margin: 0; }
.cat-img-preview { width: 100%; height: 120px; object-fit: cover; display: block; border-radius: 8px; }
.cat-img-remove {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px; border-radius: 50%; border: none;
  background: rgba(0,0,0,.55); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 11px;
  transition: background .13s;
}
.cat-img-remove:hover { background: #DC2626; }
.cat-img-uploading {
  position: absolute; inset: 0; background: rgba(255,255,255,.8);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 13px; font-weight: 600; color: #0F766E;
}

/* ===== FOOTER ===== */
.cat-dlg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.cat-dlg-cancel {
  display: inline-flex; align-items: center; gap: 5px;
  height: 34px; padding: 0 14px; border-radius: 7px;
  border: 1px solid #E2E8F0; background: #fff; color: #64748B;
  font-size: 12.5px; font-weight: 500; cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}
.cat-dlg-cancel:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; color: #334155; }
.cat-dlg-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.cat-dlg-cancel .pi { font-size: 10px; }
.cat-dlg-save {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 16px; border-radius: 7px;
  border: none; background: #0F766E; color: #fff;
  font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: background 0.13s, box-shadow 0.13s;
  box-shadow: 0 1px 4px rgba(15,118,110,0.25);
}
.cat-dlg-save:hover:not(:disabled) { background: #115E59; box-shadow: 0 2px 8px rgba(15,118,110,0.35); }
.cat-dlg-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.cat-dlg-save .pi { font-size: 11px; }

/* ===== SEARCH BOX ===== */
.cat-search-wrap {
  position: relative; display: flex; align-items: center;
  background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
  height: 32px; min-width: 220px; max-width: 320px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cat-search-wrap:focus-within {
  border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10);
}
.cat-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.cat-search-input {
  width: 100%; height: 100%; border: none; outline: none; background: transparent;
  padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A;
}
.cat-search-input::placeholder { color: #CBD5E1; }
.cat-search-clear {
  position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%;
  border: none; background: #E2E8F0; color: #64748B; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 9px;
  transition: background 0.12s;
}
.cat-search-clear:hover { background: #CBD5E1; }

/* ===== RESPONSIVE ===== */
app-admin-categories { display: block; width: 100%; }

@media (max-width: 768px) {
  .cat-page-header { flex-wrap: wrap; gap: 10px; }
  .cat-header-actions { margin-top: 0; }
  .cat-table-card { min-width: 0; overflow-x: auto !important; }
  .cat-table-card .p-datatable-wrapper { overflow-x: auto !important; }
}

@media (max-width: 600px) {
  .cat-page-title { font-size: 18px; }
  .cat-page-sub { font-size: 12px; }
  .cat-kpi-num { font-size: 22px; }
  .cat-kpi-card { min-height: 110px; padding: 14px; }
  .cat-add-btn { font-size: 11.5px; }
}

@media (max-width: 480px) {
  .cat-kpi-card { min-height: 100px; padding: 12px; }
  .cat-kpi-num { font-size: 20px; }
  .cat-dlg-footer { flex-wrap: wrap; gap: 6px; }
  .cat-dlg-cancel, .cat-dlg-save { flex: 1; justify-content: center; }
}

  `]
})
export class AdminCategoriesComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private svc     = inject(ProductService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  loading       = signal(true);
  hasError      = signal(false);
  allCategories = signal<Category[]>([]);
  searchValue   = '';
  imagePreview    = signal<string | null>(null);
  imageUploading  = signal(false);

  totalCategories = computed(() => this.allCategories().length);
  totalProducts   = computed(() => this.allCategories().reduce((s, c) => s + c.productCount, 0));
  featuredCount   = computed(() => this.allCategories().filter(c => c.isFeatured).length);
  activeCount     = computed(() => this.allCategories().filter(c => c.isActive).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  dialogVisible = false;
  isEdit        = false;
  saving        = signal(false);
  private editingCat: Category | null = null;
  parentOptions: Category[] = [];

  form = this.fb.group({
    name:             ['', [Validators.required, Validators.maxLength(100)]],
    slug:             [''],
    parentCategoryId: [null as any],
    description:      [''],
    imageUrl:         [null as string | null],
    isFeatured:       [false],
    isActive:         [true]
  });
  get f() { return this.form.controls; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.hasError.set(false);
    this.svc.getCategories().subscribe({
      next: res => { this.allCategories.set(res.data ?? []); this.loading.set(false); },
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

  openAdd() {
    this.isEdit = false;
    this.editingCat = null;
    this.parentOptions = this.allCategories();
    this.imagePreview.set(null);
    this.form.reset({ name: '', slug: '', parentCategoryId: null, description: '', imageUrl: null, isFeatured: false, isActive: true });
    this.dialogVisible = true;
  }

  openEdit(cat: Category) {
    this.isEdit = true;
    this.editingCat = cat;
    this.parentOptions = this.allCategories().filter(c => c.id !== cat.id);
    this.imagePreview.set(cat.imageUrl ?? null);
    this.form.patchValue({ name: cat.name, slug: cat.slug ?? '', parentCategoryId: cat.parentCategoryId ?? null, description: cat.description ?? '', imageUrl: cat.imageUrl ?? null, isFeatured: cat.isFeatured, isActive: cat.isActive });
    this.dialogVisible = true;
  }

  closeDialog() { this.dialogVisible = false; this.form.reset(); this.imagePreview.set(null); }

  onImgFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadImage(file);
  }

  onImgDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadImage(file);
  }

  private uploadImage(file: File): void {
    this.imageUploading.set(true);
    this.svc.uploadCategoryImage(file).subscribe({
      next: res => {
        const url: string = res.data?.url ?? res.data;
        this.imagePreview.set(url);
        this.form.patchValue({ imageUrl: url });
        this.imageUploading.set(false);
      },
      error: () => {
        this.imageUploading.set(false);
        this.toast.add({ severity: 'error', summary: 'Upload failed', detail: 'Could not upload image', life: 3000 });
      }
    });
  }

  removeImage(e: Event): void {
    e.stopPropagation();
    this.imagePreview.set(null);
    this.form.patchValue({ imageUrl: null });
  }

  onNameInput() {
    if (this.isEdit) return;
    const name = this.f['name'].value ?? '';
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.f['slug'].setValue(slug, { emitEvent: false });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.isEdit
      ? this.svc.updateCategory(this.editingCat!.id, this.form.value)
      : this.svc.createCategory(this.form.value);
    req$.subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Success', detail: `Category ${this.isEdit ? 'updated' : 'created'} successfully`, life: 3000 });
        this.closeDialog(); this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save category', life: 3000 }); }
    });
  }

  deleteCategory(cat: Category) {
    this.confirm.confirm({
      header: 'Delete Category',
      message: cat.productCount > 0 ? `"${cat.name}" has ${cat.productCount} product(s). Delete anyway?` : `Delete "${cat.name}"? This cannot be undone.`,
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.deleteCategory(cat.id).subscribe({
          next: () => { this.toast.add({ severity: 'success', summary: 'Deleted', detail: `"${cat.name}" deleted`, life: 3000 }); this.allCategories.update(l => l.filter(c => c.id !== cat.id)); },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }

  toggleStatus(cat: Category) {
    this.svc.toggleCategoryStatus(cat.id).subscribe({
      next: () => {
        this.allCategories.update(l => l.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
        this.toast.add({ severity: 'info', summary: 'Updated', detail: `"${cat.name}" ${cat.isActive ? 'deactivated' : 'activated'}`, life: 3000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
    });
  }

  toggleFeatured(cat: Category) {
    const dto = {
      name: cat.name,
      description: cat.description ?? '',
      parentCategoryId: cat.parentCategoryId ?? null,
      sortOrder: cat.sortOrder,
      imageUrl: cat.imageUrl ?? null,
      isActive: cat.isActive,
      isFeatured: !cat.isFeatured,
    };
    this.svc.updateCategory(cat.id, dto).subscribe({
      next: () => {
        this.allCategories.update(l => l.map(c => c.id === cat.id ? { ...c, isFeatured: !c.isFeatured } : c));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `"${cat.name}" ${cat.isFeatured ? 'removed from' : 'added to'} featured`, life: 3000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update', life: 3000 })
    });
  }
}
