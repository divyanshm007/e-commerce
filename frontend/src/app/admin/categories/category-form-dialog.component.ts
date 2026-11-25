import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../core/services/product.service';
import { Category } from '../../core/models/product.models';
import { ToastService } from '../../core/services/toast.service';

export interface CategoryDialogData {
  category?: Category;
  allCategories: Category[];
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule, NgFor, NgIf,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatProgressSpinnerModule
  ],
  template: `
<div class="dlg-shell">

  <!-- ═══ GRADIENT HEADER ═══ -->
  <div class="dlg-hero" [class.hero-edit]="isEdit">
    <button class="hero-close" (click)="close()" aria-label="Close">
      <mat-icon>close</mat-icon>
    </button>
    <div class="hero-badge">
      <mat-icon>{{ isEdit ? 'edit_note' : 'category' }}</mat-icon>
    </div>
    <h2 class="hero-title">{{ isEdit ? 'Edit Category' : 'New Category' }}</h2>
    <p class="hero-sub">{{ isEdit ? 'Update the details below' : 'Fill in the details to create a category' }}</p>
  </div>

  <!-- ═══ FORM BODY ═══ -->
  <div class="dlg-body" mat-dialog-content>
    <form [formGroup]="form" autocomplete="off">

      <!-- Name -->
      <div class="field-group">
        <label class="fl">Category Name <span class="req">*</span></label>
        <div class="input-wrap" [class.has-error]="f['name'].invalid && f['name'].touched">
          <mat-icon class="fi">sell</mat-icon>
          <input class="fi-input" formControlName="name"
                 placeholder="e.g. Pain Relief, Vitamins, Supplements"
                 (input)="onNameInput()" />
        </div>
        <p class="ferr" *ngIf="f['name'].hasError('required') && f['name'].touched">Name is required</p>
        <p class="ferr" *ngIf="f['name'].hasError('maxlength') && f['name'].touched">Max 100 characters</p>
      </div>

      <!-- Slug -->
      <div class="field-group">
        <label class="fl">URL Slug</label>
        <div class="input-wrap">
          <mat-icon class="fi">link</mat-icon>
          <input class="fi-input slug-field" formControlName="slug"
                 placeholder="auto-generated from name" />
        </div>
        <p class="fhint">Auto-generated · editable</p>
      </div>

      <!-- Parent -->
      <div class="field-group">
        <label class="fl">Parent Category</label>
        <div class="select-wrap">
          <mat-icon class="fi">account_tree</mat-icon>
          <select class="fi-select" formControlName="parentCategoryId">
            <option value="">— Root Category (no parent) —</option>
            <option *ngFor="let c of parentOptions" [value]="c.id">{{ c.name }}</option>
          </select>
          <mat-icon class="sel-arrow">expand_more</mat-icon>
        </div>
      </div>

      <!-- Description -->
      <div class="field-group">
        <label class="fl">Description</label>
        <div class="input-wrap textarea-wrap">
          <mat-icon class="fi" style="margin-top:12px">notes</mat-icon>
          <textarea class="fi-input fi-ta" formControlName="description" rows="3"
                    placeholder="Briefly describe this category…"></textarea>
        </div>
      </div>

      <!-- Toggles -->
      <div class="toggle-grid">
        <div class="tgl-card" [class.tgl-active]="f['isFeatured'].value">
          <div class="tgl-left">
            <div class="tgl-dot star-dot">
              <mat-icon>star</mat-icon>
            </div>
            <div>
              <div class="tgl-name">Featured</div>
              <div class="tgl-hint">Show in featured sections</div>
            </div>
          </div>
          <mat-slide-toggle formControlName="isFeatured" color="primary"></mat-slide-toggle>
        </div>
        <div class="tgl-card" [class.tgl-active]="f['isActive'].value">
          <div class="tgl-left">
            <div class="tgl-dot vis-dot">
              <mat-icon>visibility</mat-icon>
            </div>
            <div>
              <div class="tgl-name">Active</div>
              <div class="tgl-hint">Visible to customers</div>
            </div>
          </div>
          <mat-slide-toggle formControlName="isActive" color="primary"></mat-slide-toggle>
        </div>
      </div>

    </form>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="dlg-ft" mat-dialog-actions>
    <button class="btn-ghost" (click)="close()" [disabled]="saving()">
      Cancel
    </button>
    <button class="btn-primary" (click)="save()" [disabled]="form.invalid || saving()">
      <mat-spinner *ngIf="saving()" diameter="16"></mat-spinner>
      <mat-icon *ngIf="!saving()">{{ isEdit ? 'save' : 'add_circle' }}</mat-icon>
      {{ saving() ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Category' : 'Create Category') }}
    </button>
  </div>

</div>
  `,
  styles: [`
    /* ── Strip Material dialog container so .dlg-shell controls shape ── */
    .cat-dlg-panel .mat-mdc-dialog-container,
    .cat-dlg-panel .mat-mdc-dialog-surface,
    .cat-dlg-panel .mdc-dialog__surface {
      border-radius: 16px !important;
      overflow: hidden !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .dlg-shell {
      display: flex; flex-direction: column;
      width: 520px; max-width: 95vw;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.14);
    }

    /* ── Hero header ── */
    .dlg-hero {
      position: relative;
      background: linear-gradient(135deg, #16a34a 0%, #059669 55%, #0d9488 100%);
      padding: 32px 28px 28px; text-align: center;
      display: flex; flex-direction: column; align-items: center;
    }
    .dlg-hero.hero-edit {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%);
    }
    .hero-close {
      position: absolute; top: 14px; right: 14px;
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(255,255,255,.18); border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .2s; color: #fff;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(255,255,255,.3); }
    }
    .hero-badge {
      width: 68px; height: 68px; border-radius: 20px;
      background: rgba(255,255,255,.2);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(255,255,255,.35);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
      mat-icon { font-size: 34px; width: 34px; height: 34px; color: #fff; }
    }
    .hero-title {
      font-size: 22px; font-weight: 800; color: #fff;
      margin: 0 0 6px; letter-spacing: -.3px;
    }
    .hero-sub { font-size: 13.5px; color: rgba(255,255,255,.8); margin: 0; }

    /* ── Body ── */
    .dlg-body {
      padding: 22px 24px !important;
      max-height: 55vh; overflow-y: auto;
      background: #fff;
    }
    .dlg-body::-webkit-scrollbar { width: 4px; }
    .dlg-body::-webkit-scrollbar-track { background: transparent; }
    .dlg-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

    /* ── Fields ── */
    .field-group { margin-bottom: 16px; }
    .fl { display: block; font-size: 12.5px; font-weight: 700; color: #374151; margin-bottom: 6px; letter-spacing: .3px; text-transform: uppercase; }
    .req { color: #ef4444; }

    .input-wrap {
      display: flex; align-items: center; gap: 0;
      border: 1.5px solid #e5e7eb; border-radius: 10px;
      background: #f9fafb; transition: all .2s; overflow: hidden;
      &:focus-within { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
      &.has-error { border-color: #ef4444; }
    }
    .textarea-wrap { align-items: flex-start; }

    .fi {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #9ca3af; flex-shrink: 0; margin: 0 10px 0 12px;
    }
    .fi-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #111827; padding: 11px 12px 11px 0;
      &::placeholder { color: #9ca3af; }
    }
    .fi-ta { resize: none; padding-top: 12px; min-height: 80px; font-family: inherit; }
    .slug-field { font-family: 'Courier New', monospace; font-size: 13px; color: #059669; }

    .select-wrap {
      position: relative; display: flex; align-items: center;
      border: 1.5px solid #e5e7eb; border-radius: 10px; background: #f9fafb;
      transition: all .2s; overflow: hidden;
      &:focus-within { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
    }
    .fi-select {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #111827; padding: 11px 40px 11px 0;
      appearance: none; cursor: pointer;
    }
    .sel-arrow {
      position: absolute; right: 10px; font-size: 20px !important;
      width: 20px !important; height: 20px !important; color: #9ca3af; pointer-events: none;
    }

    .ferr { font-size: 12px; color: #ef4444; margin: 4px 0 0; }
    .fhint { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }

    /* ── Toggles ── */
    .toggle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
    .tgl-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e5e7eb;
      background: #f9fafb; transition: all .2s; gap: 10px;
      &.tgl-active { border-color: #bbf7d0; background: #f0fdf4; }
    }
    .tgl-left { display: flex; align-items: center; gap: 10px; }
    .tgl-dot {
      width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .star-dot { background: #fef9c3; mat-icon { color: #ca8a04; } }
    .vis-dot  { background: #dbeafe; mat-icon { color: #2563eb; } }
    .tgl-name { font-size: 13px; font-weight: 700; color: #111827; }
    .tgl-hint { font-size: 11px; color: #9ca3af; margin-top: 1px; }

    /* ── Footer ── */
    .dlg-ft {
      display: flex !important; justify-content: flex-end;
      gap: 10px; padding: 16px 24px !important;
      border-top: 1px solid #f1f5f9; background: #fafafa;
      min-height: unset !important;
    }
    .btn-ghost {
      height: 42px; padding: 0 20px; border-radius: 10px;
      border: 1.5px solid #e5e7eb; background: #fff;
      font-size: 14px; font-weight: 600; color: #6b7280;
      cursor: pointer; transition: all .2s;
      &:hover:not([disabled]) { border-color: #9ca3af; color: #374151; }
      &[disabled] { opacity: .5; cursor: not-allowed; }
    }
    .btn-primary {
      height: 42px; padding: 0 22px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #16a34a, #059669);
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer; transition: all .2s;
      display: flex; align-items: center; gap: 8px; min-width: 160px; justify-content: center;
      box-shadow: 0 4px 12px rgba(22,163,74,.3);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not([disabled]) { box-shadow: 0 6px 18px rgba(22,163,74,.4); transform: translateY(-1px); }
      &[disabled] { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
    }
    .dlg-hero.hero-edit ~ .dlg-ft .btn-primary {
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      box-shadow: 0 4px 12px rgba(37,99,235,.3);
    }
  `]
})
export class CategoryFormDialogComponent {
  private ref   = inject(MatDialogRef<CategoryFormDialogComponent>);
  private data: CategoryDialogData = inject(MAT_DIALOG_DATA);
  private svc   = inject(ProductService);
  private toast = inject(ToastService);
  private fb    = inject(FormBuilder);

  saving = signal(false);
  isEdit = !!this.data.category;

  parentOptions = this.data.allCategories.filter(c => c.id !== this.data.category?.id);

  form = this.fb.group({
    name:             [this.data.category?.name ?? '',             [Validators.required, Validators.maxLength(100)]],
    slug:             [this.data.category?.slug ?? ''],
    parentCategoryId: [this.data.category?.parentCategoryId ?? ''],
    description:      [this.data.category?.description ?? ''],
    isFeatured:       [this.data.category?.isFeatured ?? false],
    isActive:         [this.data.category?.isActive ?? true]
  });

  get f() { return this.form.controls; }

  onNameInput() {
    if (this.isEdit) return;
    const name = this.f['name'].value ?? '';
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    this.f['slug'].setValue(slug, { emitEvent: false });
  }

  close() { this.ref.close(false); }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const dto = this.form.value;
    const req$ = this.isEdit
      ? this.svc.updateCategory(this.data.category!.id, dto)
      : this.svc.createCategory(dto);

    req$.subscribe({
      next: () => {
        this.toast.success(`Category ${this.isEdit ? 'updated' : 'created'} successfully`);
        this.ref.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Failed to save category. Please try again.');
      }
    });
  }
}
