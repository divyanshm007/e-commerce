import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-blogs',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, NgFor, ReactiveFormsModule, FormsModule, DatePipe, MediaUrlPipe,
    TableModule, InputTextModule, TextareaModule, EditorModule, ToggleSwitchModule,
    ToastModule, ConfirmDialogModule, DialogModule, SkeletonModule, SelectModule, TooltipModule
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="blg-page">

  <!-- Header -->
  <div class="blg-page-header">
    <div>
      <h1 class="blg-page-title">Blog Posts</h1>
      <p class="blg-page-sub">{{ total() }} posts · {{ activeCount() }} active</p>
    </div>
    <div class="blg-header-actions">
      <button class="blg-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      <button class="blg-add-btn" (click)="openForm()"><i class="pi pi-plus"></i> New Post</button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="blg-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3]; track i) {
        <div class="blg-kpi-card blg-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="blg-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="blg-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="blg-kpi-card blg-card-blue">
        <div class="blg-kpi-icon blg-icon-blue"><i class="pi pi-book"></i></div>
        <div class="blg-kpi-num">{{ total() }}</div>
        <div class="blg-kpi-lbl">Total Posts</div>
      </div>
      <div class="blg-kpi-card blg-card-teal">
        <div class="blg-kpi-icon blg-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="blg-kpi-num">{{ activeCount() }}</div>
        <div class="blg-kpi-lbl">Published</div>
      </div>
      <div class="blg-kpi-card blg-card-amber">
        <div class="blg-kpi-icon blg-icon-amber"><i class="pi pi-eye-slash"></i></div>
        <div class="blg-kpi-num">{{ draftCount() }}</div>
        <div class="blg-kpi-lbl">Drafts</div>
      </div>
    }
  </div>

  <!-- Table -->
  <div class="blg-table-card">

    @if (loading()) {
      <div class="blg-load-toolbar"></div>
      <div class="blg-load-head"></div>
      @for (r of [1,2,3,4,5]; track r) {
        <div class="blg-load-row" [style.opacity]="(6-r)/6"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="blg-filter-bar">
          <span class="blg-filter-info"><i class="pi pi-filter-fill"></i> {{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="blg-clear-all-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="blg-toolbar">
        <div class="blg-search-wrap">
          <i class="pi pi-search blg-search-icon"></i>
          <input class="blg-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="blg-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="blg-toolbar-spacer"></div>
        <button class="blg-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="posts()"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="blg-dt" [tableStyle]="{'min-width':'700px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} posts"
        [globalFilterFields]="['title', 'category', 'author']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="blg-th-center">#</th>
            <th pSortableColumn="title">
              Post <p-sortIcon field="title" />
              <p-columnFilter type="text" field="title" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="category" style="width:120px">
              Category <p-sortIcon field="category" />
              <p-columnFilter type="text" field="category" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="author" style="width:120px">
              Author <p-sortIcon field="author" />
            </th>
            <th pSortableColumn="publishedAt" style="width:110px" class="blg-th-center">
              Date <p-sortIcon field="publishedAt" />
            </th>
            <th pSortableColumn="isActive" style="width:110px" class="blg-th-center">
              Status <p-sortIcon field="isActive" />
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="blg-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:80px" class="blg-th-center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-post let-i="rowIndex">
          <tr>
            <td class="blg-td-center blg-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="blg-post-cell">
                <div class="blg-thumb" *ngIf="post.coverImageUrl">
                  <img [src]="post.coverImageUrl | mediaUrl" [alt]="post.title" class="blg-thumb-img" />
                </div>
                <div class="blg-thumb blg-thumb-placeholder" *ngIf="!post.coverImageUrl">
                  <i class="pi pi-image"></i>
                </div>
                <div class="blg-post-info">
                  <div class="blg-post-title">{{ post.title }}</div>
                  <div class="blg-post-slug">/blogs/{{ post.slug }}</div>
                  <div class="blg-post-excerpt" *ngIf="post.excerpt">
                    {{ post.excerpt.length > 80 ? post.excerpt.slice(0,80) + '…' : post.excerpt }}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <span class="blg-cat-badge" *ngIf="post.category">{{ post.category }}</span>
              <span class="blg-no-cat" *ngIf="!post.category">—</span>
            </td>
            <td>
              <div class="blg-author-cell">
                <div class="blg-author-avatar">{{ post.author?.charAt(0)?.toUpperCase() }}</div>
                <span class="blg-author-name">{{ post.author }}</span>
              </div>
            </td>
            <td class="blg-td-center blg-date-cell">
              {{ (post.publishedAt || post.createdAt) | date:'MMM d, y' }}
            </td>
            <td class="blg-td-center">
              <button class="blg-status-pill"
                [class.blg-status-active]="post.isActive"
                [class.blg-status-inactive]="!post.isActive"
                (click)="toggleStatus(post)"
                [pTooltip]="post.isActive ? 'Click to unpublish' : 'Click to publish'">
                <span class="blg-status-dot"></span>
                {{ post.isActive ? 'Published' : 'Draft' }}
              </button>
            </td>
            <td>
              <div class="blg-actions">
                <button class="blg-act-btn blg-act-edit" (click)="editPost(post)" pTooltip="Edit" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="blg-act-btn blg-act-del" (click)="deletePost(post)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <div class="blg-empty">
              <div class="blg-empty-icon"><i class="pi pi-book"></i></div>
              <p class="blg-empty-title">No blog posts yet</p>
              <p class="blg-empty-sub">{{ total() === 0 ? 'Create your first blog post.' : 'Try adjusting your filters.' }}</p>
              <button *ngIf="total() === 0" class="blg-state-btn" (click)="openForm()"><i class="pi pi-plus"></i> Create First Post</button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ===== BLOG FORM DIALOG ===== -->
<p-dialog
  [(visible)]="dialogVisible"
  [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="blg-dlg" [class.blg-dlg-edit]="!!editingId()"
  [style]="{width:'680px', maxWidth:'96vw'}"
>
  <ng-template pTemplate="header">
    <div class="blg-dlg-head">
      <div class="blg-dlg-icon" [class.blg-dlg-icon-edit]="!!editingId()">
        <i [class]="editingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="blg-dlg-titles">
        <div class="blg-dlg-title">{{ editingId() ? 'Edit Post' : 'New Blog Post' }}</div>
        <div class="blg-dlg-sub">{{ editingId() ? 'Update this blog post' : 'Fill in the details below' }}</div>
      </div>
      <button class="blg-dlg-x" (click)="cancelForm()" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="blg-form">

    <!-- Cover image -->
    <div class="blg-field">
      <label class="blg-label">Cover Image</label>
      <div class="blg-cover-area">
        <div class="blg-cover-preview" *ngIf="coverPreview()">
          <img [src]="coverPreview() | mediaUrl" alt="Cover preview" class="blg-cover-img" />
          <button class="blg-cover-remove" type="button" (click)="removeCover()" pTooltip="Remove cover">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="blg-cover-upload" *ngIf="!coverPreview()" (click)="coverInput.click()">
          <i class="pi pi-image"></i>
          <span>Click to upload cover image</span>
          <small>JPG, PNG, WEBP — max 5MB</small>
        </div>
        <input #coverInput type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onCoverChange($event)" />
        <div class="blg-cover-uploading" *ngIf="uploadingCover()">
          <i class="pi pi-spin pi-spinner"></i> Uploading…
        </div>
      </div>
    </div>

    <!-- Title + Slug -->
    <div class="blg-field">
      <label class="blg-label">Title <span class="blg-req">*</span></label>
      <div class="blg-input-wrap" [class.blg-input-err]="form.get('title')?.invalid && form.get('title')?.touched">
        <i class="pi pi-file-edit blg-input-icon"></i>
        <input pInputText formControlName="title" placeholder="e.g. Top 10 Ayurvedic Herbs for Immunity" class="blg-inp blg-inp-icon"
          (input)="onTitleChange()" />
      </div>
      <small class="blg-err-msg" *ngIf="form.get('title')?.invalid && form.get('title')?.touched">
        <i class="pi pi-exclamation-circle"></i> Title is required
      </small>
    </div>

    <div class="blg-field">
      <label class="blg-label">Slug <span class="blg-req">*</span></label>
      <div class="blg-input-wrap" [class.blg-input-err]="form.get('slug')?.invalid && form.get('slug')?.touched">
        <span class="blg-slug-prefix">/blogs/</span>
        <input pInputText formControlName="slug" placeholder="auto-generated-from-title" class="blg-inp blg-inp-prefix" />
      </div>
      <small class="blg-err-msg" *ngIf="form.get('slug')?.invalid && form.get('slug')?.touched">
        <i class="pi pi-exclamation-circle"></i> Slug is required
      </small>
    </div>

    <!-- Excerpt -->
    <div class="blg-field">
      <label class="blg-label">Excerpt <span class="blg-req">*</span></label>
      <textarea pTextarea formControlName="excerpt" rows="2"
        placeholder="A short summary that appears on the blog listing page…" class="blg-textarea"></textarea>
      <small class="blg-err-msg" *ngIf="form.get('excerpt')?.invalid && form.get('excerpt')?.touched">
        <i class="pi pi-exclamation-circle"></i> Excerpt is required
      </small>
    </div>

    <!-- Content -->
    <div class="blg-field">
      <label class="blg-label">Content <span class="blg-req">*</span></label>
      <div class="blg-editor-wrap">
        <p-editor formControlName="content" [style]="{ height: '380px' }"></p-editor>
      </div>
      <small class="blg-err-msg" *ngIf="form.get('content')?.invalid && form.get('content')?.touched">
        <i class="pi pi-exclamation-circle"></i> Content is required
      </small>
    </div>

    <!-- Category + Author -->
    <div class="blg-form-2col">
      <div class="blg-field">
        <label class="blg-label">Category</label>
        <div class="blg-input-wrap">
          <i class="pi pi-tag blg-input-icon"></i>
          <input pInputText formControlName="category" placeholder="e.g. Health, Wellness…" class="blg-inp blg-inp-icon" />
        </div>
        <small class="blg-hint-msg">Groups posts for filtering</small>
      </div>
      <div class="blg-field">
        <label class="blg-label">Author <span class="blg-req">*</span></label>
        <div class="blg-input-wrap" [class.blg-input-err]="form.get('author')?.invalid && form.get('author')?.touched">
          <i class="pi pi-user blg-input-icon"></i>
          <input pInputText formControlName="author" placeholder="Author name" class="blg-inp blg-inp-icon" />
        </div>
        <small class="blg-err-msg" *ngIf="form.get('author')?.invalid && form.get('author')?.touched">
          <i class="pi pi-exclamation-circle"></i> Author is required
        </small>
      </div>
    </div>

    <!-- Published date + Sort order -->
    <div class="blg-form-2col">
      <div class="blg-field">
        <label class="blg-label">Publish Date</label>
        <div class="blg-input-wrap">
          <i class="pi pi-calendar blg-input-icon"></i>
          <input type="date" formControlName="publishedAt" class="blg-inp blg-inp-icon" />
        </div>
        <small class="blg-hint-msg">Leave blank to use today's date</small>
      </div>
      <div class="blg-field">
        <label class="blg-label">Sort Order</label>
        <div class="blg-input-wrap">
          <i class="pi pi-sort-numeric-up blg-input-icon"></i>
          <input pInputText type="number" formControlName="sortOrder" placeholder="0" class="blg-inp blg-inp-icon" />
        </div>
        <small class="blg-hint-msg">Lower numbers appear first</small>
      </div>
    </div>

    <!-- Visibility toggle -->
    <div class="blg-field">
      <label class="blg-label">Visibility</label>
      <label class="blg-toggle-card" [class.blg-toggle-on]="form.get('isActive')?.value">
        <div class="blg-toggle-left">
          <div class="blg-toggle-icon" [class.blg-toggle-icon-on]="form.get('isActive')?.value">
            <i [class]="form.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="blg-toggle-title">{{ form.get('isActive')?.value ? 'Published' : 'Draft' }}</div>
            <div class="blg-toggle-sub">{{ form.get('isActive')?.value ? 'Visible to readers on the blog' : 'Hidden from public — draft mode' }}</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
    </div>

  </form>

  <ng-template pTemplate="footer">
    <div class="blg-dlg-footer">
      <button class="blg-dlg-cancel" [disabled]="saving()" (click)="cancelForm()"><i class="pi pi-times"></i> Cancel</button>
      <button class="blg-dlg-save" [disabled]="form.invalid || saving() || uploadingCover()" (click)="onSubmit()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (editingId() ? 'Update Post' : 'Publish Post') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`
/* ================================================================
   ADMIN BLOGS — ViewEncapsulation.None, all selectors .blg-*
================================================================ */

.blg-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.blg-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.blg-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.blg-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.blg-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.blg-refresh-btn   { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.blg-refresh-btn:hover { background: #F8FAFC; color: #0F172A; }
.blg-add-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.13s; }
.blg-add-btn:hover { background: #115E59; }
.blg-add-btn .pi { font-size: 11px; }

/* KPI */
.blg-kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.blg-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.blg-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.blg-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.blg-card-blue  { border-top-color: #2563EB !important; }
.blg-card-teal  { border-top-color: #0F766E !important; }
.blg-card-amber { border-top-color: #D97706 !important; }
.blg-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.blg-icon-blue  { background: #EFF6FF; color: #2563EB; }
.blg-icon-teal  { background: #F0FDFA; color: #0F766E; }
.blg-icon-amber { background: #FFFBEB; color: #D97706; }
.blg-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.blg-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.blg-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.blg-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.blg-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.blg-state-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; background: #0F766E; color: #fff; border: none; font-size: 12px; font-weight: 500; cursor: pointer; }
.blg-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.blg-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.blg-filter-info .pi { font-size: 11px; }
.blg-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.blg-clear-all-btn .pi { font-size: 10px; }
.blg-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.blg-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.blg-load-row     { height: 72px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.blg-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.blg-toolbar-spacer { flex: 1; }
.blg-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.blg-icon-btn:hover { background: #F8FAFC; }

/* Table */
.blg-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.blg-th-center { text-align: center !important; }
.blg-td-center { text-align: center !important; }
.blg-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.blg-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.blg-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.blg-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.blg-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 72px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.blg-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.blg-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.blg-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.blg-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.blg-row-idx { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.blg-post-cell { display: flex; align-items: center; gap: 10px; }
.blg-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.blg-thumb-img { width: 100%; height: 100%; object-fit: cover; }
.blg-thumb-placeholder { display: flex; align-items: center; justify-content: center; background: #F1F5F9; .pi { font-size: 18px; color: #CBD5E1; } }
.blg-post-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.blg-post-title { font-size: 13px; font-weight: 600; color: #0F172A; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.blg-post-slug  { font-size: 10.5px; color: #94A3B8; }
.blg-post-excerpt { font-size: 11px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.blg-cat-badge  { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; }
.blg-no-cat     { font-size: 12px; color: #CBD5E1; }
.blg-author-cell { display: flex; align-items: center; gap: 6px; }
.blg-author-avatar { width: 26px; height: 26px; border-radius: 50%; background: #0F766E; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.blg-author-name { font-size: 12px; color: #334155; font-weight: 500; }
.blg-date-cell { font-size: 11.5px; color: #64748B; }
.blg-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; border: none; font-size: 11px; font-weight: 500; cursor: pointer; transition: opacity 0.13s; white-space: nowrap; }
.blg-status-active   { background: #F0FDF4; color: #16A34A; }
.blg-status-inactive { background: #FEF9C3; color: #92400E; }
.blg-status-pill:hover { opacity: 0.75; }
.blg-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.blg-actions { display: flex; align-items: center; justify-content: center; gap: 2px; }
.blg-act-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: none; background: none; cursor: pointer; color: #64748B; transition: background 0.12s,color 0.12s; }
.blg-act-btn .pi { font-size: 12px; }
.blg-act-edit { color: #2563EB; }
.blg-act-edit:hover { background: #EFF6FF; color: #1D4ED8; }
.blg-act-del { color: #DC2626; }
.blg-act-del:hover  { background: #FEF2F2; color: #B91C1C; }
.blg-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.blg-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.blg-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.blg-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.blg-search-input::placeholder { color: #CBD5E1; }
.blg-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.blg-search-clear:hover { background: #CBD5E1; }
.blg-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; gap: 2px; }
.blg-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.blg-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.blg-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.blg-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0 0 10px; }

/* Dialog */
.blg-dlg { border-radius: 14px !important; overflow: hidden; box-shadow: 0 20px 60px rgba(15,23,42,0.18),0 4px 16px rgba(15,23,42,0.10) !important; }
.blg-dlg .p-dialog-header { padding: 0 !important; border-bottom: none !important; background: #fff !important; }
.blg-dlg .p-dialog-content { padding: 20px 22px !important; background: #fff !important; max-height: 76vh; overflow-y: auto; }
.blg-dlg .p-dialog-footer  { padding: 14px 22px !important; border-top: 1px solid #F1F5F9 !important; background: #FAFBFC !important; border-radius: 0 0 14px 14px; }
.blg-dlg .p-dialog-header::before { content:''; display: block; height: 4px; background: linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.blg-dlg-edit .p-dialog-header::before { background: linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.blg-dlg-head   { display: flex; align-items: center; gap: 12px; padding: 16px 22px 14px; }
.blg-dlg-icon   { width: 38px; height: 38px; border-radius: 10px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid #CCFBF1; }
.blg-dlg-icon-edit { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.blg-dlg-titles { flex: 1; min-width: 0; }
.blg-dlg-title  { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.blg-dlg-sub    { font-size: 11.5px; color: #94A3B8; margin-top: 2px; }
.blg-dlg-x { width: 30px; height: 30px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #94A3B8; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; flex-shrink: 0; }
.blg-dlg-x:hover:not(:disabled) { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.blg-dlg-x:disabled { opacity: 0.4; cursor: not-allowed; }

/* Form */
.blg-form { display: flex; flex-direction: column; gap: 14px; }
.blg-field { display: flex; flex-direction: column; gap: 5px; }
.blg-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.blg-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.blg-req   { color: #DC2626; }
.blg-hint-inline { font-size: 9.5px; color: #94A3B8; text-transform: none; letter-spacing: 0; font-weight: 400; margin-left: 4px; }
.blg-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; }
.blg-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.blg-input-wrap.blg-input-err { border-color: #FCA5A5; }
.blg-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; z-index: 1; }
.blg-slug-prefix { padding: 0 0 0 12px; font-size: 12px; color: #94A3B8; white-space: nowrap; flex-shrink: 0; }
.blg-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.blg-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.blg-inp-icon { padding-left: 30px !important; }
.blg-inp-prefix { padding-left: 4px !important; }
input[type="date"].blg-inp { padding-left: 30px !important; }
.blg-textarea { width: 100% !important; box-sizing: border-box; resize: vertical; padding: 9px 11px !important; font-size: 13px !important; color: #0F172A !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; line-height: 1.6; box-shadow: none !important; outline: none !important; font-family: inherit !important; min-height: 70px; }
.blg-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.blg-content-area { min-height: 200px; font-family: 'Courier New', monospace !important; font-size: 12.5px !important; }
.blg-editor-wrap .ql-toolbar { border-radius: 8px 8px 0 0; border-color: #E2E8F0 !important; background: #F8FAFC; }
.blg-editor-wrap .ql-container { border-radius: 0 0 8px 8px; border-color: #E2E8F0 !important; font-size: 14px; font-family: inherit; }
.blg-editor-wrap .ql-editor { min-height: 340px; line-height: 1.75; color: #1E293B; }
.blg-editor-wrap:focus-within .ql-toolbar,
.blg-editor-wrap:focus-within .ql-container { border-color: #0F766E !important; }
.blg-err-msg  { font-size: 11px; color: #DC2626; display: flex; align-items: center; gap: 4px; }
.blg-err-msg .pi { font-size: 10px; }
.blg-hint-msg { font-size: 11px; color: #94A3B8; }

/* Cover upload */
.blg-cover-area { position: relative; }
.blg-cover-upload { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 140px; border: 2px dashed #CBD5E1; border-radius: 10px; cursor: pointer; background: #F8FAFC; transition: border-color 0.15s,background 0.15s; }
.blg-cover-upload:hover { border-color: #0F766E; background: #F0FDFA; }
.blg-cover-upload .pi { font-size: 28px; color: #CBD5E1; }
.blg-cover-upload span { font-size: 13px; color: #64748B; font-weight: 500; }
.blg-cover-upload small { font-size: 11px; color: #94A3B8; }
.blg-cover-preview { position: relative; display: inline-block; }
.blg-cover-img { width: 100%; height: 140px; object-fit: cover; border-radius: 10px; display: block; }
.blg-cover-remove { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; }
.blg-cover-uploading { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #0F766E; padding: 6px 0; }

/* Toggle */
.blg-toggle-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC; cursor: pointer; user-select: none; transition: border-color 0.15s,background 0.15s; }
.blg-toggle-on   { border-color: #BBFFD9; background: #F0FDF9; }
.blg-toggle-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.blg-toggle-icon { width: 32px; height: 32px; border-radius: 8px; background: #F1F5F9; color: #94A3B8; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; transition: background 0.15s,color 0.15s; }
.blg-toggle-icon-on { background: #ECFDF5; color: #059669; }
.blg-toggle-title { font-size: 13px; font-weight: 600; color: #0F172A; }
.blg-toggle-sub   { font-size: 11px; color: #94A3B8; margin-top: 1px; }

/* Dialog footer */
.blg-dlg-footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.blg-dlg-cancel { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-size: 12.5px; font-weight: 500; cursor: pointer; }
.blg-dlg-cancel:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; }
.blg-dlg-cancel:disabled { opacity: 0.45; cursor: not-allowed; }
.blg-dlg-cancel .pi { font-size: 10px; }
.blg-dlg-save { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 16px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); }
.blg-dlg-save:hover:not(:disabled) { background: #115E59; }
.blg-dlg-save:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.blg-dlg-save .pi { font-size: 11px; }

@media (max-width: 768px) {
  .blg-table-card { min-width: 0; overflow-x: auto !important; }
}
  `]
})
export class AdminBlogsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  searchValue = '';
  private contentService = inject(ContentService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  loading       = signal(true);
  saving        = signal(false);
  uploadingCover = signal(false);
  dialogVisible  = false;
  editingId      = signal<string | null>(null);
  posts          = signal<any[]>([]);
  coverPreview   = signal<string | null>(null);

  total        = computed(() => this.posts().length);
  activeCount  = computed(() => this.posts().filter(p => p.isActive).length);
  draftCount   = computed(() => this.posts().filter(p => !p.isActive).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Published', value: true },
    { label: 'Draft',     value: false }
  ];

  form = this.fb.group({
    title:       ['', Validators.required],
    slug:        ['', Validators.required],
    excerpt:     ['', Validators.required],
    content:     ['', Validators.required],
    coverImageUrl: [''],
    category:    [''],
    author:      ['', Validators.required],
    publishedAt: [''],
    sortOrder:   [0],
    isActive:    [true]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.contentService.getBlogPosts().subscribe({
      next: res => { this.posts.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onTableFilter(event: any) {
    let count = 0;
    for (const key of Object.keys(event.filters ?? {})) {
      const rules = event.filters[key];
      if (Array.isArray(rules)) count += rules.filter((r: any) => r.value !== null && r.value !== undefined && r.value !== '').length;
    }
    this.activeFilterCount.set(count);
  }

  clearAllFilters() { this.dt.clear(); this.activeFilterCount.set(0); }

  openForm() {
    this.editingId.set(null);
    this.coverPreview.set(null);
    this.form.reset({ sortOrder: 0, isActive: true });
    this.dialogVisible = true;
  }

  cancelForm() { this.dialogVisible = false; this.editingId.set(null); this.coverPreview.set(null); }

  editPost(post: any) {
    this.editingId.set(post.id);
    this.coverPreview.set(post.coverImageUrl ?? null);
    this.form.patchValue({
      title: post.title,
      slug:  post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? '',
      category: post.category ?? '',
      author: post.author,
      publishedAt: post.publishedAt ? post.publishedAt.substring(0, 10) : '',
      sortOrder: post.sortOrder ?? 0,
      isActive: post.isActive ?? true
    });
    this.dialogVisible = true;
  }

  onTitleChange() {
    if (!this.editingId()) {
      const title = this.form.get('title')?.value ?? '';
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      this.form.patchValue({ slug }, { emitEvent: false });
    }
  }

  onCoverChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingCover.set(true);
    this.contentService.uploadBlogCover(file).subscribe({
      next: res => {
        const url = (res.data as any)?.url ?? '';
        this.coverPreview.set(url);
        this.form.patchValue({ coverImageUrl: url });
        this.uploadingCover.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Upload Failed', detail: 'Could not upload cover image', life: 3000 });
        this.uploadingCover.set(false);
      }
    });
  }

  removeCover() {
    this.coverPreview.set(null);
    this.form.patchValue({ coverImageUrl: '' });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const value = this.form.value;
    const payload = {
      ...value,
      publishedAt: value.publishedAt ? new Date(value.publishedAt).toISOString() : null,
      sortOrder: Number(value.sortOrder ?? 0)
    };
    const req$ = this.editingId()
      ? this.contentService.updateBlogPost(this.editingId()!, payload)
      : this.contentService.createBlogPost(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Post ${this.editingId() ? 'updated' : 'created'}`, life: 3000 });
        this.cancelForm(); this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save post', life: 3000 }); }
    });
  }

  toggleStatus(post: any) {
    this.contentService.updateBlogPost(post.id, { ...post, isActive: !post.isActive }).subscribe({
      next: () => {
        this.posts.update(list => list.map(p => p.id === post.id ? { ...p, isActive: !p.isActive } : p));
        this.toast.add({ severity: 'info', summary: 'Updated', detail: 'Status updated', life: 2000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status', life: 3000 })
    });
  }

  deletePost(post: any) {
    this.confirm.confirm({
      header: 'Delete Post', message: `Delete "${post.title}"? This cannot be undone.`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contentService.deleteBlogPost(post.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Post deleted', life: 3000 });
            this.posts.update(list => list.filter(p => p.id !== post.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete post', life: 3000 })
        });
      }
    });
  }
}
