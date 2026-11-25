import { Component, OnInit, inject, signal, computed, ViewEncapsulation, ViewChild } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-testimonials',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, NgFor, ReactiveFormsModule, FormsModule,
    TableModule, ToastModule, ConfirmDialogModule, DialogModule,
    InputTextModule, TextareaModule, ToggleSwitchModule,
    SkeletonModule, TooltipModule, MediaUrlPipe
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="tst-page">

  <!-- Header -->
  <div class="tst-page-header">
    <div>
      <h1 class="tst-page-title">Testimonials</h1>
      <p class="tst-page-sub">{{ testimonials().length }} testimonials total</p>
    </div>
    <div class="tst-header-actions">
      <button class="tst-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      <button class="tst-add-btn" (click)="openDialog()"><i class="pi pi-plus"></i> Add Testimonial</button>
    </div>
  </div>

  <!-- KPI -->
  <div class="tst-kpi-row">
    @if (listLoading()) {
      @for (i of [1,2,3]; track i) {
        <div class="tst-kpi-card">
          <p-skeleton width="36px" height="36px" styleClass="tst-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="tst-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!listLoading()) {
      <div class="tst-kpi-card tst-card-blue">
        <div class="tst-kpi-icon tst-icon-blue"><i class="pi pi-comment"></i></div>
        <div class="tst-kpi-num">{{ testimonials().length }}</div>
        <div class="tst-kpi-lbl">Total</div>
      </div>
      <div class="tst-kpi-card tst-card-teal">
        <div class="tst-kpi-icon tst-icon-teal"><i class="pi pi-eye"></i></div>
        <div class="tst-kpi-num">{{ activeCount() }}</div>
        <div class="tst-kpi-lbl">Visible</div>
      </div>
      <div class="tst-kpi-card tst-card-amber">
        <div class="tst-kpi-icon tst-icon-amber"><i class="pi pi-star"></i></div>
        <div class="tst-kpi-num">{{ avgRating() }}</div>
        <div class="tst-kpi-lbl">Avg Rating</div>
      </div>
    }
  </div>

  <!-- Table -->
  <div class="tst-table-card">
    @if (listLoading()) {
      <div class="tst-load-head"></div>
      @for (r of [1,2,3,4,5]; track r) { <div class="tst-load-row" [style.opacity]="(6-r)/6"></div> }
    }
    @if (!listLoading()) {
      <div class="tst-toolbar">
        <div class="tst-search-wrap">
          <i class="pi pi-search tst-search-icon"></i>
          <input class="tst-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="tst-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="tst-toolbar-spacer"></div>
      </div>
      <p-table #dt [value]="testimonials()" styleClass="tst-dt" [tableStyle]="{'min-width':'600px'}"
        [globalFilterFields]="['customerName', 'message']"
        [paginator]="true" [rows]="20" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="tst-th-center">#</th>
            <th>Customer</th>
            <th>Review</th>
            <th style="width:110px" class="tst-th-center">Rating</th>
            <th style="width:100px" class="tst-th-center">Status</th>
            <th style="width:100px" class="tst-th-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-t let-i="rowIndex">
          <tr>
            <td class="tst-td-center tst-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="tst-customer-cell">
                <div class="tst-avatar-wrap">
                  <img *ngIf="t.avatarUrl" [src]="t.avatarUrl | mediaUrl" [alt]="t.customerName" class="tst-avatar-img" />
                  <div *ngIf="!t.avatarUrl" class="tst-avatar-initials">{{ initials(t.customerName) }}</div>
                </div>
                <div>
                  <div class="tst-customer-name">{{ t.customerName }}</div>
                  <div class="tst-customer-role" *ngIf="t.customerTitle">{{ t.customerTitle }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="tst-review-preview">{{ t.message.length > 90 ? t.message.substring(0,90) + '…' : t.message }}</div>
            </td>
            <td class="tst-td-center">
              <div class="tst-stars">
                <span *ngFor="let s of starArray(t.rating)" class="tst-star-filled">★</span>
                <span *ngFor="let s of emptyStarArray(t.rating)" class="tst-star-empty">★</span>
              </div>
            </td>
            <td class="tst-td-center">
              <span class="tst-status-pill" [class.tst-s-active]="t.isActive" [class.tst-s-inactive]="!t.isActive">
                <span class="tst-status-dot"></span>{{ t.isActive ? 'Visible' : 'Hidden' }}
              </span>
            </td>
            <td>
              <div class="tst-actions">
                <button class="tst-act-btn tst-act-edit" (click)="openDialog(t)" pTooltip="Edit" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
                <button class="tst-act-btn tst-act-del" (click)="deleteTestimonial(t)" pTooltip="Delete" tooltipPosition="top"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="tst-empty">
              <div class="tst-empty-icon"><i class="pi pi-comment"></i></div>
              <p class="tst-empty-title">No testimonials yet</p>
              <button class="tst-state-btn" (click)="openDialog()"><i class="pi pi-plus"></i> Add First</button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===================== DIALOG ===================== -->
<p-dialog [(visible)]="dialogVisible" [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="tst-dlg" [class.tst-dlg-edit]="!!editingId()" [style]="{width:'540px',maxWidth:'96vw'}">
  <ng-template pTemplate="header">
    <div class="tst-dlg-head">
      <div class="tst-dlg-icon" [class.tst-dlg-icon-edit]="!!editingId()">
        <i [class]="editingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="tst-dlg-titles">
        <div class="tst-dlg-title">{{ editingId() ? 'Edit Testimonial' : 'Add Testimonial' }}</div>
        <div class="tst-dlg-sub">Customer review details</div>
      </div>
      <button class="tst-dlg-x" (click)="dialogVisible = false" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="tst-form">

    <!-- Avatar upload -->
    <div class="tst-avatar-section">
      <div class="tst-avatar-preview" (click)="avatarInput.click()">
        <img *ngIf="avatarPreview()" [src]="avatarPreview()!" class="tst-av-img" />
        <div *ngIf="!avatarPreview()" class="tst-av-placeholder">
          <i class="pi pi-user tst-av-icon"></i>
        </div>
        <div class="tst-av-overlay">
          <i class="pi" [class]="uploadingAvatar() ? 'pi-spin pi-spinner' : 'pi-camera'"></i>
        </div>
      </div>
      <div class="tst-avatar-info">
        <p class="tst-av-label">Customer Photo <span class="tst-hint-inline">(optional)</span></p>
        <button type="button" class="tst-av-btn" (click)="avatarInput.click()" [disabled]="uploadingAvatar()">
          <i class="pi pi-upload"></i> {{ uploadingAvatar() ? 'Uploading…' : 'Upload Photo' }}
        </button>
        <button type="button" class="tst-av-remove" (click)="removeAvatar()" *ngIf="avatarPreview()">Remove</button>
      </div>
    </div>
    <input #avatarInput type="file" accept="image/*" class="tst-file-inp" (change)="onAvatarChange($event)" />

    <div class="tst-form-2col">
      <div class="tst-field">
        <label class="tst-label">Customer Name <span class="tst-req">*</span></label>
        <div class="tst-input-wrap" [class.tst-input-err]="form.get('customerName')?.invalid && form.get('customerName')?.touched">
          <i class="pi pi-user tst-input-icon"></i>
          <input pInputText formControlName="customerName" placeholder="e.g. Anita Sharma" class="tst-inp tst-inp-icon" />
        </div>
      </div>
      <div class="tst-field">
        <label class="tst-label">Role / Title <span class="tst-hint-inline">(optional)</span></label>
        <div class="tst-input-wrap">
          <i class="pi pi-briefcase tst-input-icon"></i>
          <input pInputText formControlName="customerTitle" placeholder="e.g. Loyal Customer" class="tst-inp tst-inp-icon" />
        </div>
      </div>
    </div>

    <div class="tst-field">
      <label class="tst-label">Review <span class="tst-req">*</span></label>
      <textarea pTextarea formControlName="message" rows="4"
        placeholder="What did the customer say about your products or service…"
        class="tst-textarea" [class.tst-ta-err]="form.get('message')?.invalid && form.get('message')?.touched"></textarea>
    </div>

    <div class="tst-field">
      <label class="tst-label">Rating</label>
      <div class="tst-rating-row">
        <button type="button" class="tst-star-btn"
          *ngFor="let n of [1,2,3,4,5]"
          [class.tst-star-active]="n <= (form.get('rating')?.value ?? 5)"
          (click)="setRating(n)">★</button>
        <span class="tst-rating-val">{{ form.get('rating')?.value }}/5</span>
      </div>
    </div>

    <div class="tst-field">
      <label class="tst-label">Visibility</label>
      <label class="tst-toggle-card" [class.tst-toggle-on]="form.get('isActive')?.value">
        <div class="tst-toggle-left">
          <div class="tst-toggle-icon" [class.tst-toggle-icon-on]="form.get('isActive')?.value">
            <i [class]="form.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="tst-toggle-title">{{ form.get('isActive')?.value ? 'Visible' : 'Hidden' }}</div>
            <div class="tst-toggle-sub">{{ form.get('isActive')?.value ? 'Shown on the testimonials page' : 'Not shown publicly' }}</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
    </div>
  </form>

  <ng-template pTemplate="footer">
    <div class="tst-dlg-footer">
      <button class="tst-dlg-cancel" [disabled]="saving()" (click)="dialogVisible = false"><i class="pi pi-times"></i> Cancel</button>
      <button class="tst-dlg-save" [disabled]="form.invalid || saving() || uploadingAvatar()" (click)="save()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Add Testimonial') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`
.tst-page { min-height:100vh; background:#F6F8FA; padding:20px; }
.tst-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
.tst-page-title { font-size:22px; font-weight:700; color:#0F172A; letter-spacing:-0.3px; margin:0; }
.tst-page-sub   { font-size:13px; color:#64748B; margin:2px 0 0; }
.tst-header-actions { display:flex; gap:8px; }
.tst-refresh-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid #E2E8F0; border-radius:7px; background:#fff; color:#64748B; cursor:pointer; font-size:12px; }
.tst-refresh-btn:hover { background:#F8FAFC; color:#0F172A; }
.tst-add-btn { display:inline-flex; align-items:center; gap:5px; height:32px; padding:0 12px; border-radius:7px; background:#0F766E; color:#fff; font-size:12px; font-weight:600; border:none; cursor:pointer; }
.tst-add-btn:hover { background:#115E59; }
.tst-add-btn .pi { font-size:11px; }

/* KPI */
.tst-kpi-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.tst-kpi-card { background:rgba(255,255,255,.82); backdrop-filter:blur(10px); border:1px solid rgba(226,232,240,.85); border-top-width:3px; border-radius:14px; padding:16px; min-height:130px; display:flex; flex-direction:column; box-shadow:0 2px 8px rgba(15,23,42,.05),0 8px 24px rgba(15,23,42,.07); transition:box-shadow .18s,transform .18s; }
.tst-kpi-card:hover { transform:translateY(-2px); }
.tst-card-blue { border-top-color:#2563EB!important; } .tst-card-teal { border-top-color:#0F766E!important; } .tst-card-amber { border-top-color:#D97706!important; }
.tst-kpi-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; margin-bottom:10px; }
.tst-icon-blue { background:#EFF6FF; color:#2563EB; } .tst-icon-teal { background:#F0FDFA; color:#0F766E; } .tst-icon-amber { background:#FFFBEB; color:#D97706; }
.tst-kpi-num { font-size:26px; font-weight:700; color:#0F172A; line-height:1; letter-spacing:-.5px; margin-bottom:5px; }
.tst-kpi-lbl { font-size:10.5px; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:.06em; margin-top:auto; }
.tst-sk-icon { border-radius:8px!important; margin-bottom:10px; display:block; } .tst-sk-num { margin-bottom:6px; display:block; }

/* Table */
.tst-table-card { background:rgba(255,255,255,.88); border:1px solid rgba(226,232,240,.9); border-radius:14px; overflow:hidden; box-shadow:0 4px 16px rgba(15,23,42,.035); flex:1; }
.tst-dt .p-datatable-thead > tr > th { background:#F0FDF9!important; color:#0F5C4D!important; font-size:10.5px!important; font-weight:600!important; text-transform:uppercase!important; letter-spacing:.04em!important; padding:0 13px!important; height:44px!important; border:none!important; border-bottom:1px solid #DDEFE9!important; white-space:nowrap; }
.tst-th-center { text-align:center!important; } .tst-td-center { text-align:center!important; }
.tst-dt .p-datatable-tbody > tr > td { padding:0 13px!important; height:70px!important; vertical-align:middle!important; border:none!important; border-bottom:1px solid #F1F5F9!important; color:#334155; }
.tst-dt .p-datatable-tbody > tr:last-child > td { border-bottom:none!important; }
.tst-dt .p-datatable-tbody > tr:hover > td { background:#FAFDFC!important; }
.tst-table-card .p-paginator { padding:6px 12px!important; min-height:46px; border-top:1px solid #E2E8F0!important; border-radius:0 0 14px 14px; background:#FAFBFC!important; font-size:12px; }
.tst-load-head { height:44px; background:#F0FDF9; border-bottom:1px solid #DDEFE9; }
.tst-load-row { height:70px; background:#fff; border-bottom:1px solid #F1F5F9; }
.tst-row-idx { font-size:11.5px; color:#CBD5E1; font-weight:500; }

.tst-customer-cell { display:flex; align-items:center; gap:10px; }
.tst-avatar-wrap { width:38px; height:38px; border-radius:50%; overflow:hidden; flex-shrink:0; }
.tst-avatar-img { width:100%; height:100%; object-fit:cover; display:block; }
.tst-avatar-initials { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#0F766E,#0D9488); color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.tst-customer-name { font-size:13px; font-weight:600; color:#0F172A; }
.tst-customer-role { font-size:11px; color:#94A3B8; }
.tst-review-preview { font-size:12px; color:#475569; line-height:1.5; }
.tst-stars { display:flex; gap:1px; justify-content:center; }
.tst-star-filled { color:#F59E0B; font-size:14px; } .tst-star-empty { color:#E2E8F0; font-size:14px; }
.tst-status-pill { display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500; }
.tst-s-active { background:#F0FDF4; color:#16A34A; } .tst-s-inactive { background:#FEF2F2; color:#DC2626; }
.tst-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
.tst-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.tst-toolbar-spacer { flex: 1; }
.tst-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.tst-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.tst-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.tst-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.tst-search-input::placeholder { color: #CBD5E1; }
.tst-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.tst-search-clear:hover { background: #CBD5E1; }
.tst-actions { display:flex; align-items:center; justify-content:center; gap:2px; }
.tst-act-btn { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; border:none; background:none; cursor:pointer; color:#64748B; }
.tst-act-btn .pi { font-size:12px; }
.tst-act-edit { color: #2563EB; } .tst-act-edit:hover { background:#EFF6FF; color:#1D4ED8; }
.tst-act-del { color: #DC2626; } .tst-act-del:hover { background:#FEF2F2; color:#B91C1C; }
.tst-empty { display:flex; flex-direction:column; align-items:center; padding:28px; text-align:center; gap:8px; }
.tst-empty-icon { width:36px; height:36px; border-radius:8px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; }
.tst-empty-icon .pi { font-size:16px; color:#94A3B8; }
.tst-empty-title { font-size:13px; font-weight:600; color:#334155; margin:0; }
.tst-state-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:6px; background:#0F766E; color:#fff; border:none; font-size:12px; cursor:pointer; }

/* Dialog */
.tst-dlg { border-radius:14px!important; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,.18)!important; }
.tst-dlg .p-dialog-header { padding:0!important; border-bottom:none!important; background:#fff!important; }
.tst-dlg .p-dialog-content { padding:20px 22px!important; background:#fff!important; max-height:72vh; overflow-y:auto; }
.tst-dlg .p-dialog-footer  { padding:14px 22px!important; border-top:1px solid #F1F5F9!important; background:#FAFBFC!important; border-radius:0 0 14px 14px; }
.tst-dlg .p-dialog-header::before { content:''; display:block; height:4px; background:linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.tst-dlg-edit .p-dialog-header::before { background:linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.tst-dlg-head { display:flex; align-items:center; gap:12px; padding:16px 22px 14px; }
.tst-dlg-icon { width:38px; height:38px; border-radius:10px; background:#F0FDFA; color:#0F766E; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; border:1px solid #CCFBF1; }
.tst-dlg-icon-edit { background:#EFF6FF; color:#2563EB; border-color:#BFDBFE; }
.tst-dlg-titles { flex:1; }
.tst-dlg-title { font-size:15px; font-weight:700; color:#0F172A; }
.tst-dlg-sub   { font-size:11.5px; color:#94A3B8; margin-top:2px; }
.tst-dlg-x { width:30px; height:30px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#94A3B8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; }
.tst-dlg-x:hover:not(:disabled) { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
.tst-dlg-x:disabled { opacity:.4; cursor:not-allowed; }
.tst-dlg-footer { display:flex; justify-content:flex-end; gap:8px; }
.tst-dlg-cancel { display:inline-flex; align-items:center; gap:5px; height:34px; padding:0 14px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#64748B; font-size:12.5px; font-weight:500; cursor:pointer; }
.tst-dlg-cancel:disabled { opacity:.45; cursor:not-allowed; }
.tst-dlg-save { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 16px; border-radius:7px; border:none; background:#0F766E; color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; }
.tst-dlg-save:hover:not(:disabled) { background:#115E59; }
.tst-dlg-save:disabled { opacity:.45; cursor:not-allowed; }
.tst-dlg-save .pi,.tst-dlg-cancel .pi { font-size:10px; }

/* Avatar section */
.tst-avatar-section { display:flex; align-items:center; gap:16px; padding:14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:4px; }
.tst-avatar-preview { width:72px; height:72px; border-radius:50%; overflow:hidden; position:relative; cursor:pointer; flex-shrink:0; background:#F1F5F9; }
.tst-av-img { width:100%; height:100%; object-fit:cover; display:block; }
.tst-av-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
.tst-av-icon { font-size:26px; color:#CBD5E1; }
.tst-av-overlay { position:absolute; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; }
.tst-avatar-preview:hover .tst-av-overlay { opacity:1; }
.tst-av-overlay .pi { font-size:16px; color:#fff; }
.tst-avatar-info { flex:1; }
.tst-av-label { font-size:11.5px; font-weight:600; color:#475569; margin:0 0 6px; }
.tst-av-btn { display:inline-flex; align-items:center; gap:5px; height:28px; padding:0 10px; border-radius:6px; border:1px solid #E2E8F0; background:#fff; color:#0F766E; font-size:11.5px; cursor:pointer; font-weight:600; }
.tst-av-btn:disabled { opacity:.5; cursor:not-allowed; }
.tst-av-btn .pi { font-size:10px; }
.tst-av-remove { margin-left:6px; background:none; border:none; color:#DC2626; font-size:11px; cursor:pointer; padding:0; }
.tst-file-inp { display:none; }

/* Form */
.tst-form { display:flex; flex-direction:column; gap:14px; }
.tst-form-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.tst-field { display:flex; flex-direction:column; gap:5px; }
.tst-label { font-size:10.5px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.07em; }
.tst-req { color:#DC2626; } .tst-hint-inline { font-size:9.5px; color:#94A3B8; text-transform:none; letter-spacing:0; font-weight:400; margin-left:3px; }
.tst-input-wrap { position:relative; display:flex; align-items:center; border:1px solid #E2E8F0; border-radius:8px; background:#fff; transition:border-color .15s,box-shadow .15s; }
.tst-input-wrap:focus-within { border-color:#0F766E; box-shadow:0 0 0 3px rgba(15,118,110,.10); }
.tst-input-wrap.tst-input-err { border-color:#FCA5A5; }
.tst-input-icon { position:absolute; left:10px; font-size:12px; color:#94A3B8; pointer-events:none; }
.tst-inp { width:100%; height:36px; border:none!important; outline:none!important; box-shadow:none!important; background:transparent!important; font-size:13px!important; color:#0F172A!important; padding:0 10px!important; border-radius:8px!important; }
.tst-inp:focus { border:none!important; outline:none!important; box-shadow:none!important; }
.tst-inp-icon { padding-left:30px!important; }
.tst-textarea { width:100%!important; box-sizing:border-box; resize:vertical; padding:9px 11px!important; font-size:13px!important; color:#0F172A!important; border:1px solid #E2E8F0!important; border-radius:8px!important; background:#fff!important; line-height:1.6; box-shadow:none!important; outline:none!important; font-family:inherit!important; }
.tst-textarea:focus { border-color:#0F766E!important; box-shadow:0 0 0 3px rgba(15,118,110,.10)!important; }
.tst-ta-err { border-color:#FCA5A5!important; }

/* Rating */
.tst-rating-row { display:flex; align-items:center; gap:4px; }
.tst-star-btn { background:none; border:none; font-size:22px; cursor:pointer; color:#E2E8F0; transition:color .12s; padding:0 1px; line-height:1; }
.tst-star-active { color:#F59E0B; }
.tst-star-btn:hover { color:#F59E0B; }
.tst-rating-val { font-size:12px; color:#64748B; margin-left:6px; }

/* Toggle */
.tst-toggle-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; border:1.5px solid #E2E8F0; background:#F8FAFC; cursor:pointer; user-select:none; transition:border-color .15s,background .15s; }
.tst-toggle-on { border-color:#BBFFD9; background:#F0FDF9; }
.tst-toggle-left { display:flex; align-items:center; gap:10px; flex:1; }
.tst-toggle-icon { width:32px; height:32px; border-radius:8px; background:#F1F5F9; color:#94A3B8; display:flex; align-items:center; justify-content:center; font-size:13px; }
.tst-toggle-icon-on { background:#ECFDF5; color:#059669; }
.tst-toggle-title { font-size:13px; font-weight:600; color:#0F172A; }
.tst-toggle-sub { font-size:11px; color:#94A3B8; margin-top:1px; }
@media (max-width: 768px) { .tst-table-card { min-width: 0; overflow-x: auto !important; } }
  `]
})
export class AdminTestimonialsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private contentService = inject(ContentService);
  private toast    = inject(MessageService);
  private confirm  = inject(ConfirmationService);
  private fb       = inject(FormBuilder);

  listLoading    = signal(true);
  saving         = signal(false);
  uploadingAvatar = signal(false);
  testimonials   = signal<any[]>([]);
  editingId      = signal<string | null>(null);
  avatarPreview  = signal<string | null>(null);
  dialogVisible  = false;

  activeCount = computed(() => this.testimonials().filter(t => t.isActive).length);
  avgRating   = computed(() => {
    const list = this.testimonials();
    if (!list.length) return '—';
    const avg = list.reduce((s, t) => s + (t.rating ?? 5), 0) / list.length;
    return avg.toFixed(1);
  });

  form = this.fb.group({
    customerName:  ['', Validators.required],
    customerTitle: [''],
    avatarUrl:     [''],
    message:       ['', Validators.required],
    rating:        [5],
    sortOrder:     [0],
    isActive:      [true]
  });

  ngOnInit() { this.load(); }

  load() {
    this.listLoading.set(true);
    this.contentService.getTestimonialsAdmin().subscribe({
      next: res => { this.testimonials.set(res.data ?? []); this.listLoading.set(false); },
      error: () => this.listLoading.set(false)
    });
  }

  openDialog(t?: any) {
    this.editingId.set(t?.id ?? null);
    this.avatarPreview.set(t?.avatarUrl ?? null);
    if (t) {
      this.form.patchValue({
        customerName: t.customerName, customerTitle: t.customerTitle ?? '',
        avatarUrl: t.avatarUrl ?? '', message: t.message,
        rating: t.rating ?? 5, sortOrder: t.sortOrder ?? 0, isActive: t.isActive
      });
    } else {
      this.form.reset({ rating: 5, sortOrder: 0, isActive: true });
      this.avatarPreview.set(null);
    }
    this.dialogVisible = true;
  }

  setRating(n: number) { this.form.patchValue({ rating: n }); }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingAvatar.set(true);
    this.contentService.uploadTestimonialAvatar(file).subscribe({
      next: res => {
        const url = (res.data as any)?.url ?? '';
        this.form.patchValue({ avatarUrl: url });
        this.avatarPreview.set(url);
        this.uploadingAvatar.set(false);
      },
      error: () => { this.uploadingAvatar.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Avatar upload failed', life: 3000 }); }
    });
  }

  removeAvatar() {
    this.form.patchValue({ avatarUrl: '' });
    this.avatarPreview.set(null);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = { ...this.form.value, rating: Number(this.form.value.rating ?? 5), sortOrder: Number(this.form.value.sortOrder ?? 0) };
    const req$ = this.editingId()
      ? this.contentService.updateTestimonial(this.editingId()!, payload)
      : this.contentService.createTestimonial(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Testimonial ${this.editingId() ? 'updated' : 'added'}`, life: 3000 });
        this.dialogVisible = false;
        this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save', life: 3000 }); }
    });
  }

  deleteTestimonial(t: any) {
    this.confirm.confirm({
      header: 'Delete Testimonial', message: `Delete testimonial from "${t.customerName}"?`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contentService.deleteTestimonial(t.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Testimonial deleted', life: 3000 });
            this.testimonials.update(list => list.filter(x => x.id !== t.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  starArray(rating: number)      { return Array.from({ length: Math.min(rating, 5) }); }
  emptyStarArray(rating: number) { return Array.from({ length: Math.max(0, 5 - rating) }); }
}
