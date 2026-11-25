import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ProductService } from '../../../core/services/product.service';
import { Category } from '../../../core/models/product.models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  providers: [MessageService],
  imports: [
    RouterLink, NgFor, NgIf, DecimalPipe, ReactiveFormsModule,
    InputTextModule, TextareaModule, ButtonModule, SelectModule,
    ToggleSwitchModule, ToastModule, TooltipModule, MediaUrlPipe
  ],
  template: `
<p-toast />
<div class="pf-page">

  <!-- ===== STICKY HEADER ===== -->
  <div class="pf-header">
    <div class="pf-header-left">
      <a class="back-btn" routerLink="/admin/products">
        <i class="pi pi-arrow-left"></i>
      </a>
      <div>
        <h1 class="pf-title">{{ isEdit() ? 'Edit Product' : 'Add Product' }}</h1>
        <p class="pf-sub">{{ isEdit() ? 'Update product information' : 'Create a new product listing' }}</p>
      </div>
    </div>
    <div class="pf-header-actions">
      <a class="btn-cancel" routerLink="/admin/products">Cancel</a>
      <button class="btn-save" [disabled]="form.invalid || saving()" (click)="onSubmit()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
        {{ saving() ? 'Saving…' : (isEdit() ? 'Update Product' : 'Create Product') }}
      </button>
    </div>
  </div>

  <!-- ===== LOADING ===== -->
  <div class="pf-loading" *ngIf="loading()">
    <i class="pi pi-spin pi-spinner" style="font-size:48px;color:#64748b"></i>
    <p>Loading product…</p>
  </div>

  <!-- ===== FORM ===== -->
  <form [formGroup]="form" (ngSubmit)="onSubmit()" *ngIf="!loading()" class="pf-body">
    <div class="pf-grid">

      <!-- ══════════ LEFT COLUMN ══════════ -->
      <div class="pf-left">

        <!-- Basic Information -->
        <div class="pf-card accent-blue">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-blue"><i class="pi pi-info-circle"></i></div>
              <div>
                <div class="card-title">Basic Information</div>
                <div class="card-sub">Product name, category and core details</div>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Product Name <span class="req">*</span></label>
              <input pInputText formControlName="name" class="ff" placeholder="e.g. Paracetamol 500mg"/>
              <small class="fg-err" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">Product name is required</small>
            </div>

            <div class="row-2">
              <div class="fg">
                <label class="fg-label">Category <span class="req">*</span></label>
                <p-select formControlName="categoryId" [options]="categories()" optionLabel="name" optionValue="id"
                  placeholder="Select category" class="ff" styleClass="w-full" />
                <small class="fg-err" *ngIf="false">Category is required</small>
              </div>
              <div class="fg">
                <label class="fg-label">SKU</label>
                <input pInputText formControlName="sku" class="ff" placeholder="e.g. MED-001"/>
              </div>
            </div>

            <div class="row-2">
              <div class="fg">
                <label class="fg-label">Dosage Form</label>
                <input pInputText formControlName="dosageForm" class="ff" placeholder="e.g. Tablet, Syrup"/>
              </div>
              <div class="fg">
                <label class="fg-label">Packaging</label>
                <input pInputText formControlName="packaging" class="ff" placeholder="e.g. Strip of 10"/>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Description</label>
              <textarea pTextarea formControlName="description" rows="4" class="ff" placeholder="Describe the product for customers…"></textarea>
            </div>

            <div class="fg mb-0">
              <label class="fg-label">Composition</label>
              <textarea pTextarea formControlName="composition" rows="3" class="ff" placeholder="Active ingredients and salts…"></textarea>
            </div>
          </div>
        </div>

        <!-- Clinical Details -->
        <div class="pf-card accent-purple">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-purple"><i class="pi pi-heart"></i></div>
              <div>
                <div class="card-title">Clinical Details</div>
                <div class="card-sub">Usage, dosage and safety information</div>
              </div>
            </div>

            <div class="row-2">
              <div class="fg">
                <label class="fg-label">Benefits</label>
                <textarea pTextarea formControlName="benefits" rows="3" class="ff" placeholder="Key benefits…"></textarea>
              </div>
              <div class="fg">
                <label class="fg-label">Side Effects</label>
                <textarea pTextarea formControlName="sideEffects" rows="3" class="ff" placeholder="Known side effects…"></textarea>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Ingredients</label>
              <textarea pTextarea formControlName="ingredients" rows="3" class="ff" placeholder="e.g. Ashwagandha 250mg, Turmeric 100mg…"></textarea>
            </div>

            <div class="row-2">
              <div class="fg">
                <label class="fg-label">How to Use</label>
                <textarea pTextarea formControlName="howToUse" rows="3" class="ff" placeholder="Usage instructions…"></textarea>
              </div>
              <div class="fg">
                <label class="fg-label">Dosage Instructions</label>
                <textarea pTextarea formControlName="dosageInstructions" rows="3" class="ff" placeholder="e.g. 1 tablet twice daily after meals"></textarea>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Safety Information</label>
              <textarea pTextarea formControlName="safetyInformation" rows="3" class="ff" placeholder="Safety warnings, contraindications…"></textarea>
            </div>

            <div class="fg">
              <label class="fg-label">Storage Instructions</label>
              <textarea pTextarea formControlName="storageInstructions" rows="2" class="ff" placeholder="e.g. Store in a cool dry place…"></textarea>
            </div>

            <div class="fg mb-0">
              <label class="fg-label">Certifications</label>
              <input pInputText formControlName="certifications" class="ff" placeholder="e.g. GMP, ISO, AYUSH, Organic"/>
              <small class="fg-hint">Comma-separated: GMP, ISO 9001, AYUSH Certified, Organic</small>
            </div>
          </div>
        </div>

        <!-- SEO -->
        <div class="pf-card accent-teal">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-teal"><i class="pi pi-search"></i></div>
              <div>
                <div class="card-title">SEO</div>
                <div class="card-sub">Improve discoverability in search engines</div>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Meta Title</label>
              <input pInputText formControlName="metaTitle" class="ff" placeholder="Page title for search engines"/>
              <small class="fg-hint">{{ form.get('metaTitle')?.value?.length ?? 0 }}/60 characters</small>
            </div>

            <div class="fg mb-0">
              <label class="fg-label">Meta Description</label>
              <textarea pTextarea formControlName="metaDescription" rows="3" class="ff" placeholder="Brief description for search results…"></textarea>
              <small class="fg-hint">{{ form.get('metaDescription')?.value?.length ?? 0 }}/160 characters</small>
            </div>
          </div>
        </div>

      </div><!-- /pf-left -->

      <!-- ══════════ RIGHT COLUMN ══════════ -->
      <div class="pf-right">

        <!-- Pricing -->
        <div class="pf-card">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-green"><i class="pi pi-indian-rupee"></i></div>
              <div>
                <div class="card-title">Pricing</div>
                <div class="card-sub">Set MRP, sale price and tax</div>
              </div>
            </div>

            <div class="price-row">
              <div class="fg">
                <label class="fg-label">MRP (₹) <span class="req">*</span></label>
                <input pInputText type="number" formControlName="price" min="0" class="ff" placeholder="0"/>
                <small class="fg-err" *ngIf="form.get('price')?.invalid && form.get('price')?.touched">Price is required</small>
              </div>
              <div class="fg">
                <label class="fg-label">Sale Price (₹)</label>
                <input pInputText type="number" formControlName="discountPrice" min="0" class="ff" placeholder="Optional"/>
              </div>
            </div>

            <div class="fg">
              <label class="fg-label">Tax %</label>
              <input pInputText type="number" formControlName="taxPercentage" min="0" max="100" class="ff"/>
            </div>

            <!-- Discount badge preview -->
            <div class="discount-preview" *ngIf="discountPercent > 0">
              <i class="pi pi-tag"></i>
              <span>{{ discountPercent }}% off</span>
              <span class="dp-save">Save ₹{{ discountSave | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <!-- Inventory -->
        <div class="pf-card accent-orange">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-orange"><i class="pi pi-box"></i></div>
              <div>
                <div class="card-title">Inventory</div>
                <div class="card-sub">Stock quantity and alert thresholds</div>
              </div>
            </div>

            <div class="row-2">
              <div class="fg">
                <label class="fg-label">Stock Qty <span class="req">*</span></label>
                <input pInputText type="number" formControlName="stockQuantity" min="0" class="ff"/>
                <small class="fg-err" *ngIf="form.get('stockQuantity')?.invalid && form.get('stockQuantity')?.touched">Stock is required</small>
              </div>
              <div class="fg">
                <label class="fg-label">Low Stock Alert</label>
                <input pInputText type="number" formControlName="lowStockThreshold" min="0" class="ff"/>
                <small class="fg-hint">Alert when below this</small>
              </div>
            </div>

            <!-- Stock status pill -->
            <div class="stock-status">
              <span class="ss-pill"
                [class.ss-out]="stockStatus === 'out'"
                [class.ss-low]="stockStatus === 'low'"
                [class.ss-ok]="stockStatus === 'ok'">
                <span class="ss-dot"></span>
                <span *ngIf="stockStatus === 'out'">Out of Stock</span>
                <span *ngIf="stockStatus === 'low'">Low Stock</span>
                <span *ngIf="stockStatus === 'ok'">In Stock</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Product Flags -->
        <div class="pf-card accent-yellow">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-yellow"><i class="pi pi-tag"></i></div>
              <div>
                <div class="card-title">Product Flags</div>
                <div class="card-sub">Visibility and classification tags</div>
              </div>
            </div>

            <div class="flag-list">
              <label class="flag-row" *ngFor="let flag of flagDefs">
                <div class="flag-info">
                  <div class="flag-ic" [style.background]="flag.bg">
                    <i [class]="'pi ' + flag.icon" [style.color]="flag.color"></i>
                  </div>
                  <div>
                    <div class="flag-lbl">{{ flag.label }}</div>
                    <div class="flag-desc">{{ flag.desc }}</div>
                  </div>
                </div>
                <p-toggleswitch [formControlName]="flag.ctrl" />
              </label>
            </div>
          </div>
        </div>

        <!-- Images -->
        <div class="pf-card accent-pink">
          <div class="card-inner">
            <div class="card-hd">
              <div class="card-ic ic-pink"><i class="pi pi-images"></i></div>
              <div>
                <div class="card-title">Product Images</div>
                <div class="card-sub">{{ isEdit() ? 'Manage product photos' : 'Available after saving' }}</div>
              </div>
            </div>

            <!-- Existing images (edit mode) -->
            <div class="img-grid" *ngIf="imagePreviewUrls.length">
              <div class="img-thumb" *ngFor="let url of imagePreviewUrls">
                <img [src]="url | mediaUrl" alt="Product image" />
              </div>
            </div>

            <!-- Upload zone -->
            <div class="upload-zone" *ngIf="isEdit()" [class.has-files]="selectedFiles.length > 0">
              <input type="file" #fileInput multiple accept="image/*" (change)="onFilesSelected($event)" style="display:none">
              <ng-container *ngIf="!selectedFiles.length">
                <i class="pi pi-cloud-upload uz-ic"></i>
                <p class="uz-txt">Drag & drop or <button type="button" class="uz-link" (click)="fileInput.click()">browse files</button></p>
                <p class="uz-hint">PNG, JPG, WebP — max 5MB each</p>
              </ng-container>
              <ng-container *ngIf="selectedFiles.length">
                <i class="pi pi-check-circle uz-ic ready"></i>
                <p class="uz-txt">{{ selectedFiles.length }} file(s) ready to upload</p>
                <div class="uz-actions">
                  <button type="button" class="uz-change" (click)="fileInput.click()">Change</button>
                  <button type="button" class="uz-upload" (click)="uploadImages()" [disabled]="uploading()">
                    <i [class]="uploading() ? 'pi pi-spin pi-spinner' : 'pi pi-cloud-upload'"></i>
                    {{ uploading() ? 'Uploading…' : 'Upload Now' }}
                  </button>
                </div>
              </ng-container>
            </div>

            <div class="upload-notice" *ngIf="!isEdit()">
              <i class="pi pi-info-circle"></i>
              <span>Save the product first, then you can upload images from the edit page.</span>
            </div>
          </div>
        </div>

      </div><!-- /pf-right -->
    </div><!-- /pf-grid -->

    <!-- ===== BOTTOM ACTIONS ===== -->
    <div class="pf-footer">
      <a class="btn-cancel footer-cancel" routerLink="/admin/products">
        <i class="pi pi-times"></i> Cancel
      </a>
      <button class="btn-save footer-save" type="submit" [disabled]="form.invalid || saving()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
        {{ saving() ? 'Saving…' : (isEdit() ? 'Update Product' : 'Create Product') }}
      </button>
    </div>

  </form>
</div>
  `,
  styles: [`
    /* ── Page shell ── */
    .pf-page { min-height: 100vh; background: #f1f5f9; flex-direction: column; }

    /* ── Page header ── */
    .pf-header {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 14px 28px;
      gap: 16px; flex-wrap: wrap;
      box-shadow: 0 4px 20px rgba(15,23,42,.25);
    }
    .pf-header-left { display: flex; align-items: center; gap: 14px; }
    .back-btn {
      width: 38px; height: 38px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.08);
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,.7); text-decoration: none; transition: all .2s; flex-shrink: 0;
      i.pi { font-size: 18px; }
      &:hover { background: rgba(255,255,255,.18); color: #fff; border-color: rgba(255,255,255,.3); }
    }
    .pf-title { font-size: 19px; font-weight: 800; color: #fff; margin: 0 0 1px; letter-spacing: -.3px; }
    .pf-sub   { font-size: 12.5px; color: rgba(255,255,255,.55); margin: 0; }
    .pf-header-actions { display: flex; gap: 10px; align-items: center; }

    .btn-cancel {
      height: 38px; border-radius: 9px;
      border: 1px solid rgba(255,255,255,.2);
      color: rgba(255,255,255,.8); background: transparent;
      font-size: 13.5px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 6px; padding: 0 16px;
      text-decoration: none; cursor: pointer;
      &:hover { background: rgba(255,255,255,.1); color: #fff; }
    }
    .btn-save {
      height: 38px; border-radius: 9px; border: none;
      background: linear-gradient(135deg, #16a34a, #059669);
      color: #fff; font-weight: 700; font-size: 13.5px;
      display: inline-flex; align-items: center; gap: 7px; min-width: 155px; justify-content: center;
      box-shadow: 0 4px 14px rgba(22,163,74,.4);
      transition: all .2s; cursor: pointer; padding: 0 16px;
      &:disabled { opacity: .55; box-shadow: none; cursor: not-allowed; }
      &:not(:disabled):hover { box-shadow: 0 6px 20px rgba(22,163,74,.5); transform: translateY(-1px); }
      i.pi { font-size: 15px; }
    }

    /* ── Loading ── */
    .pf-loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px; gap: 16px;
      p { color: #64748b; font-size: 14px; }
    }

    /* ── Form body + grid ── */
    .pf-body { padding: 24px; }
    .pf-grid { display: grid; grid-template-columns: 1fr 390px; gap: 22px; align-items: start; }
    .pf-left, .pf-right { display: flex; flex-direction: column; gap: 20px; }

    /* ── Cards with colored top accent ── */
    .pf-card {
      background: #fff; border-radius: 14px; padding: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.04);
      border: 1px solid #e8edf2; overflow: hidden;
      position: relative;
    }
    .pf-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #16a34a, #059669);
    }
    .pf-card.accent-blue::before   { background: linear-gradient(90deg, #2563eb, #4f46e5); }
    .pf-card.accent-purple::before { background: linear-gradient(90deg, #7c3aed, #a855f7); }
    .pf-card.accent-orange::before { background: linear-gradient(90deg, #ea580c, #f59e0b); }
    .pf-card.accent-yellow::before { background: linear-gradient(90deg, #ca8a04, #eab308); }
    .pf-card.accent-teal::before   { background: linear-gradient(90deg, #0d9488, #06b6d4); }
    .pf-card.accent-pink::before   { background: linear-gradient(90deg, #db2777, #ec4899); }

    .card-inner { padding: 22px; }

    .card-hd {
      display: flex; align-items: flex-start; gap: 14px;
      margin-bottom: 22px; padding-bottom: 18px;
      border-bottom: 1px solid #f1f5f9;
    }
    .card-ic {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.1);
      i.pi { font-size: 20px; }
    }
    .ic-blue   { background: linear-gradient(135deg,#dbeafe,#bfdbfe); i.pi { color: #1d4ed8; } }
    .ic-green  { background: linear-gradient(135deg,#dcfce7,#bbf7d0); i.pi { color: #15803d; } }
    .ic-orange { background: linear-gradient(135deg,#ffedd5,#fed7aa); i.pi { color: #c2410c; } }
    .ic-yellow { background: linear-gradient(135deg,#fef9c3,#fef08a); i.pi { color: #a16207; } }
    .ic-purple { background: linear-gradient(135deg,#ede9fe,#ddd6fe); i.pi { color: #6d28d9; } }
    .ic-teal   { background: linear-gradient(135deg,#ccfbf1,#99f6e4); i.pi { color: #0f766e; } }
    .ic-pink   { background: linear-gradient(135deg,#fce7f3,#fbcfe8); i.pi { color: #be185d; } }

    .card-title { font-size: 15.5px; font-weight: 800; color: #0f172a; margin-bottom: 3px; letter-spacing: -.2px; }
    .card-sub   { font-size: 12.5px; color: #94a3b8; }

    /* ── Form field group ── */
    .fg { margin-bottom: 16px; }
    .fg.mb-0 { margin-bottom: 0; }
    .fg-label {
      display: block; font-size: 12px; font-weight: 700; color: #475569;
      margin-bottom: 6px; letter-spacing: 0.3px;
      .req { color: #ef4444; margin-left: 2px; }
    }
    .fg-hint { font-size: 11px; color: #94a3b8; margin-top: 4px; display: block; }
    .fg-err  { font-size: 11px; color: #ef4444; margin-top: 4px; display: block; }
    .ff { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* ── Pricing extras ── */
    .price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .discount-preview {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #86efac; border-radius: 10px;
      padding: 11px 16px; margin-top: 10px;
      i.pi { color: #16a34a; font-size: 18px; }
      span { font-size: 14px; font-weight: 700; color: #15803d; }
      .dp-save {
        font-size: 12px; font-weight: 700; color: #fff;
        background: #16a34a; padding: 3px 10px; border-radius: 20px; margin-left: auto;
      }
    }

    /* ── Stock status ── */
    .stock-status { margin-top: 10px; }
    .ss-pill {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
      letter-spacing: .2px;
    }
    .ss-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .ss-ok  { background: linear-gradient(135deg,#dcfce7,#bbf7d0); color: #15803d; border: 1px solid #86efac; .ss-dot { background: #16a34a; box-shadow: 0 0 5px #16a34a; } }
    .ss-low { background: linear-gradient(135deg,#fff7ed,#ffedd5); color: #c2410c; border: 1px solid #fdba74; .ss-dot { background: #ea580c; box-shadow: 0 0 5px #ea580c; } }
    .ss-out { background: linear-gradient(135deg,#fef2f2,#fee2e2); color: #dc2626; border: 1px solid #fca5a5; .ss-dot { background: #ef4444; box-shadow: 0 0 5px #ef4444; } }

    /* ── Flags ── */
    .flag-list { display: flex; flex-direction: column; gap: 6px; }
    .flag-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; border-radius: 10px; cursor: pointer;
      transition: all .2s; border: 1.5px solid transparent;
      background: #f8fafc;
      &:hover { background: #f0fdf4; border-color: #bbf7d0; }
    }
    .flag-info { display: flex; align-items: center; gap: 12px; }
    .flag-ic {
      width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      i.pi { font-size: 16px; }
    }
    .flag-lbl  { font-size: 13.5px; font-weight: 700; color: #1e293b; }
    .flag-desc { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }

    /* ── Images ── */
    .img-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
    .img-thumb {
      aspect-ratio: 1; border-radius: 10px; overflow: hidden;
      border: 2px solid #f1f5f9; background: #f8fafc;
      transition: transform .2s;
      img { width: 100%; height: 100%; object-fit: cover; }
      &:hover { transform: scale(1.04); }
    }
    .upload-zone {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px 20px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      transition: all .25s; cursor: pointer; background: #f8fafc;
      &.has-files { border-color: #16a34a; background: #f0fdf4; }
      &:not(.has-files):hover { border-color: #94a3b8; background: #f1f5f9; }
    }
    .uz-ic {
      font-size: 42px; color: #cbd5e1; margin-bottom: 12px;
      &.ready { color: #16a34a; }
    }
    .uz-txt { font-size: 14px; color: #475569; margin: 0 0 4px; font-weight: 500; }
    .uz-link {
      color: #16a34a; font-weight: 700; background: none;
      border: none; cursor: pointer; padding: 0; font-size: 14px;
    }
    .uz-hint { font-size: 12px; color: #94a3b8; margin: 0; }
    .uz-actions { display: flex; gap: 10px; align-items: center; margin-top: 14px; }
    .uz-change {
      font-size: 13px; color: #64748b; background: #fff; border: 1.5px solid #e2e8f0;
      border-radius: 8px; padding: 7px 16px; cursor: pointer; font-weight: 600;
      transition: all .2s; &:hover { border-color: #94a3b8; }
    }
    .uz-upload {
      background: linear-gradient(135deg,#16a34a,#059669);
      color: #fff; border-radius: 8px; border: none;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 10px rgba(22,163,74,.3);
      i.pi { font-size: 14px; }
    }
    .upload-notice {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg,#eff6ff,#dbeafe);
      border: 1px solid #93c5fd; border-radius: 10px; padding: 13px 16px;
      font-size: 13px; color: #1d4ed8; font-weight: 500;
      i.pi { font-size: 18px; color: #2563eb; flex-shrink: 0; }
    }

    /* ── Footer ── */
    .pf-footer {
      display: flex; justify-content: flex-end; align-items: center; gap: 14px;
      margin-top: 24px; padding: 22px 0 48px;
      border-top: 2px solid #e2e8f0;
    }
    .footer-cancel {
      border: 1.5px solid #e2e8f0; color: #64748b; background: #fff;
      height: 44px; i.pi { font-size: 15px; }
      &:hover { border-color: #94a3b8; color: #374151; }
    }
    .footer-save {
      height: 44px; font-size: 15px; min-width: 180px; padding: 0 24px;
      box-shadow: 0 6px 20px rgba(22,163,74,.35);
    }

    /* ── Responsive ── */
    @media (max-width: 1080px) { .pf-grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .pf-body { padding: 14px; }
      .pf-header { padding: 12px 16px; }
      .row-2, .price-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminProductFormComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private productService = inject(ProductService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private toast          = inject(MessageService);

  isEdit    = signal(false);
  loading   = signal(false);
  saving    = signal(false);
  uploading = signal(false);
  categories = signal<Category[]>([]);
  selectedFiles: File[] = [];
  imagePreviewUrls: string[] = [];
  private productId: string | null = null;

  flagDefs = [
    { ctrl: 'isFeatured',          label: 'Featured',               desc: 'Show in featured sections',           icon: 'pi-star',         color: '#ca8a04', bg: '#fefce8' },
    { ctrl: 'isNewArrival',        label: 'New Arrival',            desc: 'Mark as newly added',                 icon: 'pi-sparkles',     color: '#059669', bg: '#ecfdf5' },
    { ctrl: 'isBestSeller',        label: 'Best Seller',            desc: 'Highlight as popular product',        icon: 'pi-chart-line',   color: '#2563eb', bg: '#eff6ff' },
    { ctrl: 'isSpecialOffer',      label: 'Special Offer',          desc: 'Include in promotional offers',       icon: 'pi-tag',          color: '#d97706', bg: '#fffbeb' },
    { ctrl: 'prescriptionRequired', label: 'Prescription Required',  desc: "Requires a doctor's prescription",   icon: 'pi-file-check',   color: '#dc2626', bg: '#fef2f2' },
  ];

  get discountPercent(): number {
    const mrp  = +(this.form.get('price')?.value ?? 0);
    const sale = +(this.form.get('discountPrice')?.value ?? 0);
    if (!mrp || !sale) return 0;
    return Math.round(((mrp - sale) / mrp) * 100);
  }

  get discountSave(): number {
    const mrp  = +(this.form.get('price')?.value ?? 0);
    const sale = +(this.form.get('discountPrice')?.value ?? 0);
    return Math.max(0, mrp - sale);
  }

  get stockStatus(): 'out' | 'low' | 'ok' {
    const qty       = +(this.form.get('stockQuantity')?.value ?? 0);
    const threshold = +(this.form.get('lowStockThreshold')?.value ?? 10);
    if (qty === 0) return 'out';
    if (qty <= threshold) return 'low';
    return 'ok';
  }

  form = this.fb.group({
    name:                ['', Validators.required],
    categoryId:          [''],
    sku:                 [''],
    price:               [0, [Validators.required, Validators.min(0)]],
    discountPrice:       [null as number | null],
    taxPercentage:       [0],
    stockQuantity:       [0, [Validators.required, Validators.min(0)]],
    lowStockThreshold:   [10],
    description:         [''],
    composition:         [''],
    dosageForm:          [''],
    packaging:           [''],
    benefits:            [''],
    storageInstructions: [''],
    sideEffects:         [''],
    ingredients:         [''],
    howToUse:            [''],
    dosageInstructions:  [''],
    safetyInformation:   [''],
    certifications:      [''],
    prescriptionRequired: [false],
    isFeatured:          [false],
    isNewArrival:        [false],
    isBestSeller:        [false],
    isSpecialOffer:      [false],
    metaTitle:           [''],
    metaDescription:     ['']
  });

  ngOnInit(): void {
    this.productService.getCategories().subscribe(r => { if (r.data) this.categories.set(r.data); });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.productId = id;
        this.isEdit.set(true);
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.productService.getById(id).subscribe({
      next: res => {
        if (res.data) {
          const p = res.data;
          this.form.patchValue({
            name: p.name,
            categoryId: p.categoryId ?? '',
            sku: p.sku ?? '',
            price: p.price,
            discountPrice: p.discountPrice ?? null,
            taxPercentage: p.taxPercentage,
            stockQuantity: p.stockQuantity,
            lowStockThreshold: 10,
            description: p.description ?? '',
            composition: p.composition ?? '',
            dosageForm: p.dosageForm ?? '',
            packaging: p.packaging ?? '',
            benefits: p.benefits ?? '',
            storageInstructions: p.storageInstructions ?? '',
            sideEffects: p.sideEffects ?? '',
            ingredients: (p as any).ingredients ?? '',
            howToUse: (p as any).howToUse ?? '',
            dosageInstructions: (p as any).dosageInstructions ?? '',
            safetyInformation: (p as any).safetyInformation ?? '',
            certifications: (p as any).certifications ?? '',
            prescriptionRequired: p.prescriptionRequired,
            isFeatured: p.isFeatured,
            isNewArrival: p.isNewArrival,
            isBestSeller: p.isBestSeller,
            isSpecialOffer: p.isSpecialOffer,
            metaTitle: p.metaTitle ?? '',
            metaDescription: p.metaDescription ?? ''
          });
          this.imagePreviewUrls = p.images?.map(i => i.imageUrl) ?? [];
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load product', life: 4000 });
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.selectedFiles = Array.from(input.files);
  }

  uploadImages(): void {
    if (!this.productId || !this.selectedFiles.length) return;
    this.uploading.set(true);
    this.productService.uploadImages(this.productId, this.selectedFiles).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Images uploaded successfully', life: 3000 });
        this.selectedFiles = [];
        this.uploading.set(false);
        this.loadProduct(this.productId!);
      },
      error: () => {
        this.uploading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed. Please try again.', life: 4000 });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const dto = { ...this.form.value, variants: [], categoryId: this.form.value.categoryId || null };

    const req$ = this.isEdit() && this.productId
      ? this.productService.update(this.productId, dto)
      : this.productService.create(dto as any);

    req$.subscribe({
      next: res => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved',
          detail: `Product ${this.isEdit() ? 'updated' : 'created'} successfully`, life: 3000 });
        if (!this.isEdit() && res.data?.id) {
          this.router.navigate(['/admin/products', res.data.id, 'edit']);
        } else {
          this.router.navigate(['/admin/products']);
        }
      },
      error: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save product. Please check all required fields.', life: 4000 });
      }
    });
  }
}
