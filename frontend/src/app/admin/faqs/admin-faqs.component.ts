import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-admin-faqs',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, ReactiveFormsModule, FormsModule,
    TableModule, InputTextModule, TextareaModule, ToggleSwitchModule,
    ToastModule, ConfirmDialogModule, DialogModule, SkeletonModule, SelectModule, TooltipModule
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="fq-page">

  <!-- Page Header -->
  <div class="fq-page-header">
    <div>
      <h1 class="fq-page-title">FAQs</h1>
      <p class="fq-page-sub">{{ totalFaqs() }} frequently asked questions</p>
    </div>
    <div class="fq-header-actions">
      <button class="fq-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      <button class="fq-add-btn" (click)="openForm()"><i class="pi pi-plus"></i> Add FAQ</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="fq-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3]; track i) {
        <div class="fq-kpi-card fq-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="fq-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="fq-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="fq-kpi-card fq-card-blue">
        <div class="fq-kpi-icon fq-icon-blue"><i class="pi pi-question-circle"></i></div>
        <div class="fq-kpi-num">{{ totalFaqs() }}</div>
        <div class="fq-kpi-lbl">Total FAQs</div>
      </div>
      <div class="fq-kpi-card fq-card-teal">
        <div class="fq-kpi-icon fq-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="fq-kpi-num">{{ activeCount() }}</div>
        <div class="fq-kpi-lbl">Active</div>
      </div>
      <div class="fq-kpi-card fq-card-red">
        <div class="fq-kpi-icon fq-icon-red"><i class="pi pi-times-circle"></i></div>
        <div class="fq-kpi-num">{{ inactiveCount() }}</div>
        <div class="fq-kpi-lbl">Inactive</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="fq-table-card">

    @if (loading()) {
      <div class="fq-load-toolbar"></div>
      <div class="fq-load-head"></div>
      @for (r of [1,2,3,4,5,6]; track r) {
        <div class="fq-load-row" [style.opacity]="(7-r)/7"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="fq-filter-bar">
          <span class="fq-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="fq-clear-all-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="fq-toolbar">
        <div class="fq-search-wrap">
          <i class="pi pi-search fq-search-icon"></i>
          <input class="fq-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="fq-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="fq-toolbar-spacer"></div>
        <button class="fq-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="faqs()"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="fq-dt" [tableStyle]="{'min-width':'640px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} FAQs"
        [globalFilterFields]="['question', 'category']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="fq-th-center">#</th>
            <th pSortableColumn="question">
              Question <p-sortIcon field="question" />
              <p-columnFilter type="text" field="question" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="category" style="width:140px">
              Category <p-sortIcon field="category" />
              <p-columnFilter type="text" field="category" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="sortOrder" style="width:85px" class="fq-th-center">
              Order <p-sortIcon field="sortOrder" />
            </th>
            <th pSortableColumn="isActive" style="width:115px" class="fq-th-center">
              Status <p-sortIcon field="isActive" />
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="fq-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:85px" class="fq-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-faq let-i="rowIndex">
          <tr>
            <td class="fq-td-center fq-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="fq-question-cell">
                <div class="fq-question">{{ faq.question }}</div>
                <div class="fq-answer-preview" *ngIf="faq.answer">
                  {{ faq.answer.length > 100 ? faq.answer.slice(0, 100) + '…' : faq.answer }}
                </div>
              </div>
            </td>
            <td>
              <span class="fq-cat-badge" *ngIf="faq.category">{{ faq.category }}</span>
              <span class="fq-no-cat" *ngIf="!faq.category">—</span>
            </td>
            <td class="fq-td-center">
              <span class="fq-order-badge">{{ faq.sortOrder ?? 0 }}</span>
            </td>
            <td class="fq-td-center">
              <button class="fq-status-pill"
                [class.fq-status-active]="faq.isActive"
                [class.fq-status-inactive]="!faq.isActive"
                (click)="toggleStatus(faq)"
                [pTooltip]="faq.isActive ? 'Click to deactivate' : 'Click to activate'">
                <span class="fq-status-dot"></span>
                {{ faq.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <div class="fq-actions">
                <button class="fq-act-btn fq-act-edit" (click)="editFaq(faq)" pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="fq-act-btn fq-act-del" (click)="deleteFaq(faq)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="fq-empty">
              <div class="fq-empty-icon"><i class="pi pi-question-circle"></i></div>
              <p class="fq-empty-title">No FAQs found</p>
              <p class="fq-empty-sub">{{ totalFaqs() === 0 ? 'Add your first FAQ to help customers.' : 'Try adjusting your filters.' }}</p>
              <button *ngIf="totalFaqs() === 0" class="fq-state-btn" (click)="openForm()"><i class="pi pi-plus"></i> Add First FAQ</button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===== FAQ FORM DIALOG ===== -->
<p-dialog
  [(visible)]="dialogVisible"
  [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="fq-dlg" [class.fq-dlg-edit]="!!editingId()"
  [style]="{width:'560px', maxWidth:'96vw'}"
>
  <ng-template pTemplate="header">
    <div class="fq-dlg-head">
      <div class="fq-dlg-icon" [class.fq-dlg-icon-edit]="!!editingId()">
        <i [class]="editingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="fq-dlg-titles">
        <div class="fq-dlg-title">{{ editingId() ? 'Edit FAQ' : 'New FAQ' }}</div>
        <div class="fq-dlg-sub">{{ editingId() ? 'Update the question and answer' : 'Fill in the question and answer' }}</div>
      </div>
      <button class="fq-dlg-x" (click)="cancelForm()" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="fq-form">

    <div class="fq-field">
      <label class="fq-label">Question <span class="fq-req">*</span></label>
      <div class="fq-input-wrap" [class.fq-input-err]="form.get('question')?.invalid && form.get('question')?.touched">
        <i class="pi pi-question-circle fq-input-icon"></i>
        <input pInputText formControlName="question" placeholder="e.g. How do I track my order?" class="fq-inp fq-inp-icon" />
      </div>
      <small class="fq-err-msg" *ngIf="form.get('question')?.invalid && form.get('question')?.touched">
        <i class="pi pi-exclamation-circle"></i> Question is required
      </small>
    </div>

    <div class="fq-field">
      <label class="fq-label">Answer <span class="fq-req">*</span></label>
      <textarea pTextarea formControlName="answer" rows="5"
        placeholder="Provide a clear and helpful answer…" class="fq-textarea"></textarea>
      <small class="fq-err-msg" *ngIf="form.get('answer')?.invalid && form.get('answer')?.touched">
        <i class="pi pi-exclamation-circle"></i> Answer is required
      </small>
    </div>

    <div class="fq-form-2col">
      <div class="fq-field">
        <label class="fq-label">Category</label>
        <div class="fq-input-wrap">
          <i class="pi pi-folder fq-input-icon"></i>
          <input pInputText formControlName="category" placeholder="General, Shipping…" class="fq-inp fq-inp-icon" />
        </div>
        <small class="fq-hint-msg">Groups related FAQs together</small>
      </div>
      <div class="fq-field">
        <label class="fq-label">Sort Order</label>
        <div class="fq-input-wrap">
          <i class="pi pi-sort-numeric-up fq-input-icon"></i>
          <input pInputText type="number" formControlName="sortOrder" placeholder="0" class="fq-inp fq-inp-icon" />
        </div>
        <small class="fq-hint-msg">Lower numbers appear first</small>
      </div>
    </div>

    <div class="fq-field">
      <label class="fq-label">Visibility</label>
      <label class="fq-toggle-card" [class.fq-toggle-on]="form.get('isActive')?.value">
        <div class="fq-toggle-left">
          <div class="fq-toggle-icon" [class.fq-toggle-icon-on]="form.get('isActive')?.value">
            <i [class]="form.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="fq-toggle-title">{{ form.get('isActive')?.value ? 'Active' : 'Inactive' }}</div>
            <div class="fq-toggle-sub">{{ form.get('isActive')?.value ? 'Visible to customers on the FAQ page' : 'Hidden from customers' }}</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
    </div>

  </form>

  <ng-template pTemplate="footer">
    <div class="fq-dlg-footer">
      <button class="fq-dlg-cancel" [disabled]="saving()" (click)="cancelForm()"><i class="pi pi-times"></i> Cancel</button>
      <button class="fq-dlg-save" [disabled]="form.invalid || saving()" (click)="onSubmit()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (editingId() ? 'Update FAQ' : 'Create FAQ') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`

/* ================================================================
   FAQS — ViewEncapsulation.None, all selectors .fq-*
================================================================ */

.fq-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.fq-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.fq-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.fq-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.fq-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.fq-refresh-btn   { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.fq-refresh-btn:hover { background: #F8FAFC; color: #0F172A; }
.fq-add-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.13s; }
.fq-add-btn:hover { background: #115E59; }
.fq-add-btn .pi { font-size: 11px; }

/* KPI — 3 cols */
.fq-kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.fq-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.fq-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.fq-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.fq-card-blue { border-top-color: #2563EB !important; }
.fq-card-teal { border-top-color: #0F766E !important; }
.fq-card-red  { border-top-color: #DC2626 !important; }
.fq-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.fq-icon-blue { background: #EFF6FF; color: #2563EB; }
.fq-icon-teal { background: #F0FDFA; color: #0F766E; }
.fq-icon-red  { background: #FEF2F2; color: #DC2626; }
.fq-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.fq-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.fq-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.fq-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.fq-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.fq-state-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }
.fq-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.fq-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.fq-filter-info .pi { font-size: 11px; }
.fq-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.fq-clear-all-btn .pi { font-size: 10px; }
.fq-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.fq-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.fq-load-row     { height: 68px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.fq-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.fq-toolbar-spacer { flex: 1; }
.fq-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.fq-icon-btn:hover { background: #F8FAFC; }

/* Table header */
.fq-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.fq-th-center { text-align: center !important; }
.fq-td-center { text-align: center !important; }
.fq-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.fq-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.fq-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.fq-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.fq-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.fq-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.fq-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 68px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.fq-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.fq-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.fq-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.fq-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.fq-row-idx { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.fq-question-cell { display: flex; flex-direction: column; gap: 3px; }
.fq-question      { font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.35; }
.fq-answer-preview { font-size: 11.5px; color: #94A3B8; line-height: 1.4; }
.fq-cat-badge  { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; }
.fq-no-cat     { font-size: 12px; color: #CBD5E1; }
.fq-order-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 20px; padding: 0 5px; border-radius: 4px; background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; }
.fq-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; border: none; font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap; }
.fq-status-active   { background: #F0FDF4; color: #16A34A; }
.fq-status-inactive { background: #FEF2F2; color: #DC2626; }
.fq-status-pill:hover { opacity: 0.75; }
.fq-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.fq-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.fq-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; color: #64748B; transition: background 0.12s,color 0.12s; }
.fq-act-btn .pi { font-size: 12px; }
.fq-act-edit { color: #2563EB; }
.fq-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.fq-act-del { color: #DC2626; }
.fq-act-del:hover  { background: #FEF2F2; color: #B91C1C; }
.fq-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.fq-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.fq-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.fq-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.fq-search-input::placeholder { color: #CBD5E1; }
.fq-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.fq-search-clear:hover { background: #CBD5E1; }
.fq-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; gap: 2px; }
.fq-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.fq-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.fq-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.fq-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0 0 10px; }

/* ===== DIALOG ===== */
.fq-dlg { border-radius: 14px !important; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.18),0 4px 16px rgba(15,23,42,0.10) !important; }
.fq-dlg .p-dialog-header { padding: 0 !important; border-bottom: none !important; background: #fff !important; }
.fq-dlg .p-dialog-content { padding: 20px 22px !important; background: #fff !important; max-height: 72vh; overflow-y: auto; }
.fq-dlg .p-dialog-footer  { padding: 14px 22px !important; border-top: 1px solid #F1F5F9 !important; background: #FAFBFC !important; border-radius: 0 0 14px 14px; }
.fq-dlg .p-dialog-header::before { content:''; display: block; height: 4px; background: linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.fq-dlg-edit .p-dialog-header::before { background: linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.fq-dlg-head   { display: flex; align-items: center; gap: 12px; padding: 16px 22px 14px; }
.fq-dlg-icon   { width: 38px; height: 38px; border-radius: 10px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid #CCFBF1; }
.fq-dlg-icon-edit { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.fq-dlg-titles { flex: 1; min-width: 0; }
.fq-dlg-title  { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.fq-dlg-sub    { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }
.fq-dlg-x { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #94A3B8; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; flex-shrink: 0; }
.fq-dlg-x:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.fq-dlg-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* Form */
.fq-form { display: flex; flex-direction: column; gap: 14px; }
.fq-field { display: flex; flex-direction: column; gap: 5px; }
.fq-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fq-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.fq-req   { color: #DC2626; }
.fq-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; }
.fq-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.fq-input-wrap.fq-input-err { border-color: #FCA5A5; }
.fq-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; z-index: 1; }
.fq-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.fq-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.fq-inp-icon { padding-left: 30px !important; }
.fq-textarea { width: 100% !important; box-sizing: border-box; resize: vertical; padding: 9px 11px !important; font-size: 13px !important; color: #0F172A !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; line-height: 1.6; box-shadow: none !important; outline: none !important; font-family: inherit !important; min-height: 100px; }
.fq-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.fq-textarea::placeholder { color: #CBD5E1 !important; }
.fq-err-msg  { font-size: 11px; color: #DC2626; display: flex; align-items: center; gap: 4px; }
.fq-err-msg .pi { font-size: 10px; }
.fq-hint-msg { font-size: 11px; color: #94A3B8; }

/* Toggle card */
.fq-toggle-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC; cursor: pointer; user-select: none; transition: border-color 0.15s,background 0.15s; }
.fq-toggle-on   { border-color: #BBFFD9; background: #F0FDF9; }
.fq-toggle-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.fq-toggle-icon { width: 32px; height: 32px; border-radius: 8px; background: #F1F5F9; color: #94A3B8; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: background 0.15s,color 0.15s; }
.fq-toggle-icon-on { background: #ECFDF5; color: #059669; }
.fq-toggle-title { font-size: 13px; font-weight: 600; color: #0F172A; }
.fq-toggle-sub   { font-size: 11px; color: #94A3B8; margin-top: 1px; }

.fq-dlg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.fq-dlg-cancel { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12.5px; font-weight: 500; cursor: pointer; }
.fq-dlg-cancel:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; }
.fq-dlg-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.fq-dlg-cancel .pi { font-size: 10px; }
.fq-dlg-save { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 16px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); }
.fq-dlg-save:hover:not(:disabled) { background: #115E59; }
.fq-dlg-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.fq-dlg-save .pi { font-size: 11px; }

@media (max-width: 768px) {
  .fq-table-card { min-width: 0; overflow-x: auto !important; }
}

  `]
})
export class AdminFaqsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  searchValue = '';
  private contentService = inject(ContentService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  loading      = signal(true);
  saving       = signal(false);
  dialogVisible = false;
  editingId    = signal<string | null>(null);
  faqs         = signal<any[]>([]);

  totalFaqs    = computed(() => this.faqs().length);
  activeCount  = computed(() => this.faqs().filter(f => f.isActive).length);
  inactiveCount = computed(() => this.faqs().filter(f => !f.isActive).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Active',   value: true },
    { label: 'Inactive', value: false }
  ];

  form = this.fb.group({
    question:  ['', Validators.required],
    answer:    ['', Validators.required],
    category:  [''],
    sortOrder: [0],
    isActive:  [true]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.contentService.getFaqs().subscribe({
      next: res => { this.faqs.set(res.data ?? []); this.loading.set(false); },
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
    this.form.reset({ sortOrder: 0, isActive: true });
    this.dialogVisible = true;
  }

  cancelForm() { this.dialogVisible = false; this.editingId.set(null); }

  editFaq(faq: any) {
    this.editingId.set(faq.id);
    this.form.patchValue({ question: faq.question, answer: faq.answer, category: faq.category ?? '', sortOrder: faq.sortOrder ?? 0, isActive: faq.isActive ?? true });
    this.dialogVisible = true;
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.editingId()
      ? this.contentService.updateFaq(this.editingId()!, this.form.value)
      : this.contentService.createFaq(this.form.value);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `FAQ ${this.editingId() ? 'updated' : 'created'}`, life: 3000 });
        this.cancelForm(); this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save FAQ', life: 3000 }); }
    });
  }

  toggleStatus(faq: any) {
    this.contentService.updateFaq(faq.id, { ...faq, isActive: !faq.isActive }).subscribe({
      next: () => {
        this.faqs.update(list => list.map(f => f.id === faq.id ? { ...f, isActive: !f.isActive } : f));
        this.toast.add({ severity: 'info', summary: 'Updated', detail: 'Status updated', life: 2000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
    });
  }

  deleteFaq(faq: any) {
    this.confirm.confirm({
      header: 'Delete FAQ', message: 'Delete this FAQ? This cannot be undone.',
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contentService.deleteFaq(faq.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'FAQ deleted', life: 3000 });
            this.faqs.update(list => list.filter(f => f.id !== faq.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }
}
