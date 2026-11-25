import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, TitleCasePipe, SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-banners',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, TitleCasePipe, SlicePipe, ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, DialogModule,
    InputTextModule, TextareaModule, SelectModule, ToggleSwitchModule, TooltipModule,
    MediaUrlPipe
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="bn-page">

  <!-- Page Header -->
  <div class="bn-page-header">
    <div>
      <h1 class="bn-page-title">Banners</h1>
      <p class="bn-page-sub">{{ totalBanners() }} promotional banners</p>
    </div>
    <div class="bn-header-actions">
      <button class="bn-refresh-btn" (click)="load()" title="Refresh"><i class="pi pi-refresh"></i></button>
      <button class="bn-add-btn" (click)="openForm()"><i class="pi pi-plus"></i> Add Banner</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="bn-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="bn-kpi-card bn-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="bn-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="bn-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="bn-kpi-card bn-card-blue">
        <div class="bn-kpi-icon bn-icon-blue"><i class="pi pi-image"></i></div>
        <div class="bn-kpi-num">{{ totalBanners() }}</div>
        <div class="bn-kpi-lbl">Total Banners</div>
      </div>
      <div class="bn-kpi-card bn-card-teal">
        <div class="bn-kpi-icon bn-icon-teal"><i class="pi pi-eye"></i></div>
        <div class="bn-kpi-num">{{ activeCount() }}</div>
        <div class="bn-kpi-lbl">Active</div>
      </div>
      <div class="bn-kpi-card bn-card-purple">
        <div class="bn-kpi-icon bn-icon-purple"><i class="pi pi-star"></i></div>
        <div class="bn-kpi-num">{{ heroCount() }}</div>
        <div class="bn-kpi-lbl">Hero</div>
      </div>
      <div class="bn-kpi-card bn-card-amber">
        <div class="bn-kpi-icon bn-icon-amber"><i class="pi pi-megaphone"></i></div>
        <div class="bn-kpi-num">{{ promoCount() }}</div>
        <div class="bn-kpi-lbl">Promotions</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="bn-table-card">

    @if (loading()) {
      <div class="bn-load-toolbar"></div>
      <div class="bn-load-head"></div>
      @for (r of [1,2,3,4,5]; track r) {
        <div class="bn-load-row" [style.opacity]="(6-r)/6"></div>
      }
    }

    @if (!loading()) {
      @if (hasActiveFilters()) {
        <div class="bn-filter-bar">
          <span class="bn-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="bn-clear-all-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="bn-toolbar">
        <div class="bn-search-wrap">
          <i class="pi pi-search bn-search-icon"></i>
          <input class="bn-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="bn-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="bn-toolbar-spacer"></div>
        <button class="bn-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="banners()"
        [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="bn-dt" [tableStyle]="{'min-width':'700px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} banners"
        [globalFilterFields]="['title', 'type']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:96px">Image</th>
            <th pSortableColumn="title">
              Title <p-sortIcon field="title" />
              <p-columnFilter type="text" field="title" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="type" style="width:120px">
              Type <p-sortIcon field="type" />
              <p-columnFilter field="type" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="typeOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All" [showClear]="true" styleClass="bn-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th>Link</th>
            <th pSortableColumn="sortOrder" style="width:80px" class="bn-th-center">Order <p-sortIcon field="sortOrder" /></th>
            <th style="width:105px" class="bn-th-center">
              Status
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All" [showClear]="true" styleClass="bn-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:85px" class="bn-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-b>
          <tr>
            <td>
              <div class="bn-thumb">
                <img *ngIf="b.imageUrl" [src]="b.imageUrl | mediaUrl" [alt]="b.title" />
                <i *ngIf="!b.imageUrl" class="pi pi-image"></i>
              </div>
            </td>
            <td>
              <div class="bn-title">{{ b.title }}</div>
              <div class="bn-subtitle" *ngIf="b.subtitle">{{ b.subtitle }}</div>
            </td>
            <td>
              <span class="bn-type-badge"
                [class.bn-type-hero]="b.type === 'hero'"
                [class.bn-type-promo]="b.type === 'promotion'"
                [class.bn-type-side]="b.type === 'sidebar'">
                {{ b.type | titlecase }}
              </span>
            </td>
            <td>
              <a *ngIf="b.linkUrl" [href]="b.linkUrl" target="_blank" class="bn-link">
                <i class="pi pi-external-link"></i>
                {{ b.linkUrl.length > 30 ? (b.linkUrl | slice:0:30) + '…' : b.linkUrl }}
              </a>
              <span *ngIf="!b.linkUrl" class="bn-no-link">—</span>
            </td>
            <td class="bn-td-center">
              <span class="bn-order-badge">{{ b.sortOrder ?? 0 }}</span>
            </td>
            <td class="bn-td-center">
              <button class="bn-status-pill"
                [class.bn-status-active]="b.isActive"
                [class.bn-status-inactive]="!b.isActive"
                (click)="toggleStatus(b)"
                [pTooltip]="b.isActive ? 'Click to deactivate' : 'Click to activate'">
                <span class="bn-status-dot"></span>
                {{ b.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <div class="bn-actions">
                <button class="bn-act-btn bn-act-edit" (click)="editBanner(b)" pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="bn-act-btn bn-act-del" (click)="deleteBanner(b)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="bn-empty">
              <div class="bn-empty-icon"><i class="pi pi-image"></i></div>
              <p class="bn-empty-title">No banners yet</p>
              <p class="bn-empty-sub">{{ totalBanners() === 0 ? 'Create your first promotional banner.' : 'Try adjusting your filters.' }}</p>
              <button *ngIf="totalBanners() === 0" class="bn-state-btn" (click)="openForm()"><i class="pi pi-plus"></i> Add First Banner</button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===== BANNER FORM DIALOG ===== -->
<p-dialog
  [(visible)]="dialogVisible"
  [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="bn-dlg" [class.bn-dlg-edit]="!!editingId()"
  [style]="{width:'580px', maxWidth:'96vw'}"
>
  <ng-template pTemplate="header">
    <div class="bn-dlg-head">
      <div class="bn-dlg-icon" [class.bn-dlg-icon-edit]="!!editingId()">
        <i [class]="editingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="bn-dlg-titles">
        <div class="bn-dlg-title">{{ editingId() ? 'Edit Banner' : 'New Banner' }}</div>
        <div class="bn-dlg-sub">{{ editingId() ? 'Update banner details below' : 'Fill in the details to add a banner' }}</div>
      </div>
      <button class="bn-dlg-x" (click)="cancelForm()" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="bn-form">

    <!-- Title + Type -->
    <div class="bn-form-2col">
      <div class="bn-field">
        <label class="bn-label">Title <span class="bn-req">*</span></label>
        <div class="bn-input-wrap" [class.bn-input-err]="form.get('title')?.invalid && form.get('title')?.touched">
          <i class="pi pi-tag bn-input-icon"></i>
          <input pInputText formControlName="title" placeholder="Banner title" class="bn-inp bn-inp-icon" />
        </div>
      </div>
      <div class="bn-field">
        <label class="bn-label">Type <span class="bn-req">*</span></label>
        <div class="bn-select-wrap">
          <i class="pi pi-th-large bn-select-icon"></i>
          <p-select [options]="typeOptions" formControlName="type"
            optionLabel="label" optionValue="value" styleClass="bn-dlg-sel" />
        </div>
      </div>
    </div>

    <!-- Image URL -->
    <div class="bn-field">
      <label class="bn-label">Image URL <span class="bn-req">*</span></label>
      <div class="bn-input-wrap" [class.bn-input-err]="form.get('imageUrl')?.invalid && form.get('imageUrl')?.touched">
        <i class="pi pi-link bn-input-icon"></i>
        <input pInputText formControlName="imageUrl" placeholder="https://..." class="bn-inp bn-inp-icon" />
      </div>
    </div>

    <!-- Image Preview -->
    @if (form.get('imageUrl')?.value) {
      <div class="bn-preview">
        <img [src]="form.get('imageUrl')?.value | mediaUrl" alt="preview" />
        <span class="bn-preview-badge">Preview</span>
      </div>
    }

    <!-- Subtitle + Button Text -->
    <div class="bn-form-2col">
      <div class="bn-field">
        <label class="bn-label">Subtitle</label>
        <div class="bn-input-wrap">
          <i class="pi pi-align-left bn-input-icon"></i>
          <input pInputText formControlName="subtitle" placeholder="Optional subtitle" class="bn-inp bn-inp-icon" />
        </div>
      </div>
      <div class="bn-field">
        <label class="bn-label">Button Text</label>
        <div class="bn-input-wrap">
          <i class="pi pi-cursor bn-input-icon"></i>
          <input pInputText formControlName="buttonText" placeholder="Shop Now" class="bn-inp bn-inp-icon" />
        </div>
      </div>
    </div>

    <!-- Link URL + Sort Order -->
    <div class="bn-form-2col">
      <div class="bn-field">
        <label class="bn-label">Link URL</label>
        <div class="bn-input-wrap">
          <i class="pi pi-external-link bn-input-icon"></i>
          <input pInputText formControlName="linkUrl" placeholder="https://..." class="bn-inp bn-inp-icon" />
        </div>
      </div>
      <div class="bn-field">
        <label class="bn-label">Sort Order</label>
        <div class="bn-input-wrap">
          <i class="pi pi-sort-numeric-up bn-input-icon"></i>
          <input pInputText type="number" formControlName="sortOrder" placeholder="0" class="bn-inp bn-inp-icon" />
        </div>
      </div>
    </div>

    <!-- Toggles -->
    <div class="bn-toggle-row">
      <label class="bn-toggle-card" [class.bn-toggle-on]="form.get('isActive')?.value">
        <div class="bn-toggle-left">
          <div class="bn-toggle-icon" [class.bn-toggle-icon-on]="form.get('isActive')?.value">
            <i [class]="form.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="bn-toggle-title">Active</div>
            <div class="bn-toggle-sub">Visible on the site</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
      <label class="bn-toggle-card" [class.bn-toggle-on]="form.get('openInNewTab')?.value">
        <div class="bn-toggle-left">
          <div class="bn-toggle-icon" [class.bn-toggle-icon-on]="form.get('openInNewTab')?.value">
            <i class="pi pi-external-link"></i>
          </div>
          <div>
            <div class="bn-toggle-title">New Tab</div>
            <div class="bn-toggle-sub">Link opens in new tab</div>
          </div>
        </div>
        <p-toggleswitch formControlName="openInNewTab" />
      </label>
    </div>
  </form>

  <ng-template pTemplate="footer">
    <div class="bn-dlg-footer">
      <button class="bn-dlg-cancel" [disabled]="saving()" (click)="cancelForm()"><i class="pi pi-times"></i> Cancel</button>
      <button class="bn-dlg-save" [disabled]="form.invalid || saving()" (click)="onSubmit()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (editingId() ? 'Update Banner' : 'Create Banner') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`

/* ================================================================
   BANNERS — ViewEncapsulation.None, all selectors .bn-*
================================================================ */

.bn-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.bn-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.bn-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.bn-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.bn-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.bn-refresh-btn   { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.bn-refresh-btn:hover { background: #F8FAFC; color: #0F172A; }
.bn-add-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.13s; }
.bn-add-btn:hover { background: #115E59; }
.bn-add-btn .pi { font-size: 11px; }

/* KPI */
.bn-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.bn-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.bn-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.bn-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.bn-card-blue   { border-top-color: #2563EB !important; }
.bn-card-teal   { border-top-color: #0F766E !important; }
.bn-card-purple { border-top-color: #7C3AED !important; }
.bn-card-amber  { border-top-color: #D97706 !important; }
.bn-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.bn-icon-blue   { background: #EFF6FF; color: #2563EB; }
.bn-icon-teal   { background: #F0FDFA; color: #0F766E; }
.bn-icon-purple { background: #F5F3FF; color: #7C3AED; }
.bn-icon-amber  { background: #FFFBEB; color: #D97706; }
.bn-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.bn-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.bn-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.bn-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.bn-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.bn-state-btn  { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }
.bn-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.bn-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.bn-filter-info .pi { font-size: 11px; }
.bn-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.bn-clear-all-btn .pi { font-size: 10px; }
.bn-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.bn-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.bn-load-row     { height: 64px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.bn-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.bn-toolbar-spacer { flex: 1; }
.bn-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.bn-icon-btn:hover { background: #F8FAFC; }

/* Table header */
.bn-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.bn-th-center { text-align: center !important; }
.bn-td-center { text-align: center !important; }
.bn-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.bn-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.bn-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.bn-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.bn-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.bn-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.bn-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 64px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.bn-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.bn-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.bn-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.bn-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.bn-thumb { width: 72px; height: 44px; border-radius: 7px; overflow: hidden; border: 1px solid #F1F5F9; background: #F8FAFC; display: flex; align-items: center; justify-content: center; }
.bn-thumb img { width: 100%; height: 100%; object-fit: cover; }
.bn-thumb .pi { font-size: 16px; color: #CBD5E1; }
.bn-title    { font-size: 13px; font-weight: 500; color: #0F172A; }
.bn-subtitle { font-size: 11px; color: #94A3B8; margin-top: 2px; }
.bn-type-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.bn-type-hero  { background: #F5F3FF; color: #7C3AED; }
.bn-type-promo { background: #FFFBEB; color: #D97706; }
.bn-type-side  { background: #F0FDFA; color: #0F766E; }
.bn-link    { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #0F766E; text-decoration: none; }
.bn-link:hover { text-decoration: underline; }
.bn-link .pi { font-size: 10px; }
.bn-no-link { font-size: 12px; color: #CBD5E1; }
.bn-order-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 20px; padding: 0 5px; border-radius: 4px; background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; }
.bn-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; border: none; font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap; }
.bn-status-active   { background: #F0FDF4; color: #16A34A; }
.bn-status-inactive { background: #FEF2F2; color: #DC2626; }
.bn-status-pill:hover { opacity: 0.75; }
.bn-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.bn-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.bn-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; color: #64748B; transition: background 0.12s,color 0.12s; }
.bn-act-btn .pi { font-size: 12px; }
.bn-act-edit { color: #2563EB; }
.bn-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.bn-act-del { color: #DC2626; }
.bn-act-del:hover  { background: #FEF2F2; color: #B91C1C; }
.bn-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.bn-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.bn-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.bn-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.bn-search-input::placeholder { color: #CBD5E1; }
.bn-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.bn-search-clear:hover { background: #CBD5E1; }
.bn-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; }
.bn-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.bn-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.bn-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.bn-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0 0 10px; }

/* ===== DIALOG ===== */
.bn-dlg { border-radius: 14px !important; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.18),0 4px 16px rgba(15,23,42,0.10) !important; }
.bn-dlg .p-dialog-header { padding: 0 !important; border-bottom: none !important; background: #fff !important; }
.bn-dlg .p-dialog-content { padding: 20px 22px !important; background: #fff !important; max-height: 70vh; overflow-y: auto; }
.bn-dlg .p-dialog-footer  { padding: 14px 22px !important; border-top: 1px solid #F1F5F9 !important; background: #FAFBFC !important; border-radius: 0 0 14px 14px; }
.bn-dlg .p-dialog-header::before { content:''; display: block; height: 4px; background: linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.bn-dlg-edit .p-dialog-header::before { background: linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.bn-dlg-head   { display: flex; align-items: center; gap: 12px; padding: 16px 22px 14px; }
.bn-dlg-icon   { width: 38px; height: 38px; border-radius: 10px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid #CCFBF1; }
.bn-dlg-icon-edit { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.bn-dlg-titles { flex: 1; min-width: 0; }
.bn-dlg-title  { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.bn-dlg-sub    { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }
.bn-dlg-x { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #94A3B8; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; flex-shrink: 0; transition: background 0.13s,color 0.13s; }
.bn-dlg-x:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.bn-dlg-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* Form */
.bn-form { display: flex; flex-direction: column; gap: 14px; }
.bn-field { display: flex; flex-direction: column; gap: 5px; }
.bn-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bn-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.bn-req   { color: #DC2626; }
.bn-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; }
.bn-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.bn-input-wrap.bn-input-err { border-color: #FCA5A5; }
.bn-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; z-index: 1; }
.bn-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.bn-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.bn-inp-icon { padding-left: 30px !important; }
.bn-select-wrap { position: relative; }
.bn-select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #94A3B8; z-index: 2; pointer-events: none; }
.bn-dlg-sel { width: 100% !important; }
.bn-dlg-sel .p-select { width: 100% !important; height: 36px !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; font-size: 13px !important; box-shadow: none !important; padding-left: 30px !important; }
.bn-dlg-sel .p-select:focus-within, .bn-dlg-sel .p-select.p-focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.bn-dlg-sel .p-select .p-select-label { font-size: 13px !important; color: #0F172A !important; line-height: 36px !important; padding: 0 8px !important; }
.bn-dlg-sel .p-select .p-select-label.p-placeholder { color: #94A3B8 !important; }

/* Image preview */
.bn-preview { position: relative; border-radius: 10px; overflow: hidden; height: 110px; border: 1px solid #E2E8F0; background: #F8FAFC; }
.bn-preview img { width: 100%; height: 100%; object-fit: cover; }
.bn-preview-badge { position: absolute; top: 8px; left: 8px; background: rgba(15,23,42,0.55); color: #fff; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }

/* Toggle cards */
.bn-toggle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bn-toggle-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC; cursor: pointer; user-select: none; transition: border-color 0.15s,background 0.15s; }
.bn-toggle-on   { border-color: #BBFFD9; background: #F0FDF9; }
.bn-toggle-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.bn-toggle-icon { width: 30px; height: 30px; border-radius: 7px; background: #F1F5F9; color: #94A3B8; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: background 0.15s,color 0.15s; }
.bn-toggle-icon-on { background: #ECFDF5; color: #059669; }
.bn-toggle-title { font-size: 12.5px; font-weight: 600; color: #0F172A; }
.bn-toggle-sub   { font-size: 10.5px; color: #94A3B8; }

.bn-dlg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.bn-dlg-cancel { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: background 0.13s; }
.bn-dlg-cancel:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; }
.bn-dlg-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.bn-dlg-cancel .pi { font-size: 10px; }
.bn-dlg-save { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 16px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); transition: background 0.13s,box-shadow 0.13s; }
.bn-dlg-save:hover:not(:disabled) { background: #115E59; }
.bn-dlg-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.bn-dlg-save .pi { font-size: 11px; }

@media (max-width: 768px) {
  .bn-table-card { min-width: 0; overflow-x: auto !important; }
}

  `]
})
export class AdminBannersComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  searchValue = '';
  private contentService = inject(ContentService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  banners    = signal<any[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  dialogVisible = false;
  editingId  = signal<string | null>(null);

  totalBanners = computed(() => this.banners().length);
  activeCount  = computed(() => this.banners().filter(b => b.isActive).length);
  heroCount    = computed(() => this.banners().filter(b => b.type === 'hero').length);
  promoCount   = computed(() => this.banners().filter(b => b.type === 'promotion').length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  typeOptions = [
    { label: 'Hero',       value: 'hero' },
    { label: 'Promotion',  value: 'promotion' },
    { label: 'Sidebar',    value: 'sidebar' }
  ];

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  form = this.fb.group({
    title:       ['', Validators.required],
    subtitle:    [''],
    type:        ['hero', Validators.required],
    imageUrl:    ['', Validators.required],
    linkUrl:     [''],
    buttonText:  [''],
    sortOrder:   [0],
    isActive:    [true],
    openInNewTab:[false]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.contentService.getBanners().subscribe({
      next: res => { this.banners.set(res.data ?? []); this.loading.set(false); },
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

  openForm() {
    this.editingId.set(null);
    this.form.reset({ type: 'hero', sortOrder: 0, isActive: true, openInNewTab: false });
    this.dialogVisible = true;
  }

  cancelForm() { this.dialogVisible = false; this.editingId.set(null); }

  editBanner(b: any) {
    this.editingId.set(b.id);
    this.form.patchValue({ title: b.title, subtitle: b.subtitle ?? '', type: b.type ?? 'hero', imageUrl: b.imageUrl ?? '', linkUrl: b.linkUrl ?? '', buttonText: b.buttonText ?? '', sortOrder: b.sortOrder ?? 0, isActive: b.isActive ?? true, openInNewTab: b.openInNewTab ?? false });
    this.dialogVisible = true;
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.editingId()
      ? this.contentService.updateBanner(this.editingId()!, this.form.value)
      : this.contentService.createBanner(this.form.value);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Banner ${this.editingId() ? 'updated' : 'created'}`, life: 3000 });
        this.cancelForm(); this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save banner', life: 3000 }); }
    });
  }

  toggleStatus(b: any) {
    this.contentService.updateBanner(b.id, { ...b, isActive: !b.isActive }).subscribe({
      next: () => {
        this.banners.update(list => list.map(x => x.id === b.id ? { ...x, isActive: !x.isActive } : x));
        this.toast.add({ severity: 'info', summary: 'Updated', detail: 'Status updated', life: 2000 });
      }
    });
  }

  deleteBanner(b: any) {
    this.confirm.confirm({
      header: 'Delete Banner', message: `Delete banner "${b.title}"?`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contentService.deleteBanner(b.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Banner deleted', life: 3000 });
            this.banners.update(list => list.filter(x => x.id !== b.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }
}
