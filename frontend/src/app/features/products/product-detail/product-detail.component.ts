import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { RatingComponent } from '../../../shared/components/rating/rating.component';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { ProductDetail, ProductList, ProductVariant } from '../../../core/models/product.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    RouterLink, NgFor, NgIf, CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule,
    MatIconModule, MatProgressSpinnerModule,
    RatingComponent, ProductCardComponent, MediaUrlPipe
  ],
  template: `
<!-- ── LOADING ── -->
<div class="pd-loading" *ngIf="loading">
  <mat-spinner diameter="48"></mat-spinner>
</div>

<!-- ── NOT FOUND ── -->
<div class="pd-not-found" *ngIf="!loading && !product">
  <mat-icon>search_off</mat-icon>
  <h2>Product not found</h2>
  <p>This product may have been removed or the link is incorrect.</p>
  <a class="pd-btn-primary" routerLink="/products">Browse All Products</a>
</div>

<ng-container *ngIf="!loading && product">

<!-- ── BREADCRUMB ── -->
<div class="pd-bc-bar">
  <div class="container">
    <nav class="pd-breadcrumb">
      <a routerLink="/">Home</a>
      <span class="pd-bc-sep">›</span>
      <a routerLink="/products">Shop</a>
      <ng-container *ngIf="product.categoryName">
        <span class="pd-bc-sep">›</span>
        <span>{{ product.categoryName }}</span>
      </ng-container>
      <span class="pd-bc-sep">›</span>
      <span class="pd-bc-cur">{{ product.name }}</span>
    </nav>
  </div>
</div>

<!-- ── MAIN CONTENT ── -->
<div class="container pd-layout">

  <!-- ── LEFT: IMAGE GALLERY ── -->
  <div class="pd-gallery">
    <!-- Thumbnails -->
    <div class="pd-thumbs" *ngIf="(product.images?.length || 0) > 1">
      <button *ngFor="let img of product.images"
        class="pd-thumb"
        [class.pd-thumb-active]="activeImage === img.imageUrl"
        (click)="activeImage = img.imageUrl">
        <img [src]="img.imageUrl | mediaUrl" [alt]="product.name" />
      </button>
    </div>
    <!-- Main image -->
    <div class="pd-main-img-wrap">
      <div class="pd-badges">
        <span class="pd-badge pd-badge-rx" *ngIf="product.prescriptionRequired">Rx Required</span>
        <span class="pd-badge pd-badge-new" *ngIf="product.isNewArrival">New Arrival</span>
        <span class="pd-badge pd-badge-sale" *ngIf="discountPercent > 0">{{ discountPercent }}% OFF</span>
        <span class="pd-badge pd-badge-best" *ngIf="product.isBestSeller">Best Seller</span>
      </div>
      <img class="pd-main-img"
        [src]="(activeImage || 'assets/images/no-image.png') | mediaUrl"
        [alt]="product.name" />
    </div>
  </div>

  <!-- ── RIGHT: PRODUCT INFO ── -->
  <div class="pd-info">
    <!-- Category & badges -->
    <div class="pd-top-meta">
      <span class="pd-category">{{ product.categoryName || 'Ayurvedic' }}</span>
      <span class="pd-stock-dot" [class.pd-out]="product.stockQuantity === 0">
        {{ product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock' }}
      </span>
      <span class="pd-sku-inline" *ngIf="product.sku">SKU: {{ product.sku }}</span>
    </div>

    <h1 class="pd-name">{{ product.name }}</h1>

    <!-- Rating -->
    <div class="pd-rating-row">
      <app-rating [value]="product.reviewCount > 0 ? product.averageRating : 5" [showCount]="false" />
      <span class="pd-rating-val">{{ product.reviewCount > 0 ? (product.averageRating | number:'1.1-1') : '5.0' }}</span>
      <a class="pd-rating-link" *ngIf="product.reviewCount > 0" (click)="activeTab='reviews'">{{ product.reviewCount }} Reviews</a>
      <span class="pd-no-reviews-inline" *ngIf="product.reviewCount === 0">Be the first to review</span>
    </div>

    <!-- Price -->
    <div class="pd-price-block">
      <span class="pd-sell-price">{{ sellingPrice | currency:'INR':'symbol-narrow':'1.0-0' }}</span>
      <ng-container *ngIf="product.discountPrice && product.price > product.discountPrice">
        <span class="pd-mrp">MRP {{ product.price | currency:'INR':'symbol-narrow':'1.0-0' }}</span>
        <span class="pd-save">You save {{ product.price - product.discountPrice | currency:'INR':'symbol-narrow':'1.0-0' }}</span>
      </ng-container>
    </div>
    <p class="pd-tax-note">Inclusive of all taxes</p>

    <!-- Manufacturer & Pack -->
    <div class="pd-quick-meta" *ngIf="product.manufacturer || product.packaging || product.dosageForm">
      <span *ngIf="product.manufacturer">
        <mat-icon>business</mat-icon> {{ product.manufacturer }}
      </span>
      <span *ngIf="product.dosageForm">
        <mat-icon>medication</mat-icon> {{ product.dosageForm }}
      </span>
      <span *ngIf="product.packaging">
        <mat-icon>inventory_2</mat-icon> {{ product.packaging }}
      </span>
    </div>

    <!-- Variants -->
    <div class="pd-variants" *ngIf="product.variants?.length">
      <p class="pd-field-label">Select Variant</p>
      <div class="pd-variant-row">
        <button *ngFor="let v of product.variants"
          class="pd-variant-chip"
          [class.pd-variant-active]="selectedVariant?.id === v.id"
          [class.pd-variant-oos]="v.stockQuantity === 0"
          [disabled]="v.stockQuantity === 0"
          (click)="onVariantSelect(v)">
          {{ v.name }}: {{ v.value }}
          <span *ngIf="v.priceAdjustment && v.priceAdjustment > 0" class="pd-adj">+{{ v.priceAdjustment | currency:'INR':'symbol-narrow':'1.0-0' }}</span>
        </button>
      </div>
    </div>

    <!-- Quantity + Cart -->
    <div class="pd-cart-section">
      <div class="pd-qty">
        <button class="pd-qty-btn" (click)="decQty()" [disabled]="qty <= 1">
          <mat-icon>remove</mat-icon>
        </button>
        <span class="pd-qty-val">{{ qty }}</span>
        <button class="pd-qty-btn" (click)="incQty()" [disabled]="qty >= product.stockQuantity">
          <mat-icon>add</mat-icon>
        </button>
      </div>
      <button class="pd-btn-cart"
        (click)="addToCart()"
        [disabled]="product.stockQuantity === 0 || addingToCart"
        [class.pd-btn-oos]="product.stockQuantity === 0">
        <mat-icon>{{ product.stockQuantity === 0 ? 'block' : 'shopping_cart' }}</mat-icon>
        {{ product.stockQuantity === 0 ? 'Out of Stock' : addingToCart ? 'Adding…' : 'Add to Cart' }}
      </button>
      <button class="pd-btn-wish"
        [class.pd-wish-active]="wishlisted"
        (click)="toggleWishlist()"
        [title]="wishlisted ? 'Remove from wishlist' : 'Add to wishlist'">
        <mat-icon>{{ wishlisted ? 'favorite' : 'favorite_border' }}</mat-icon>
      </button>
    </div>

    <!-- Stock bar -->
    <p class="pd-stock-info" *ngIf="product.stockQuantity > 0 && product.stockQuantity <= 10">
      <mat-icon>warning_amber</mat-icon> Only {{ product.stockQuantity }} left — order soon!
    </p>

    <!-- Prescription note -->
    <div class="pd-rx-note" *ngIf="product.prescriptionRequired">
      <mat-icon>description</mat-icon>
      <span>This product requires a valid prescription. Upload during checkout.</span>
    </div>

    <!-- Trust badges -->
    <div class="pd-trust">
      <div class="pd-trust-item">
        <mat-icon>verified</mat-icon>
        <span>100% Authentic</span>
      </div>
      <div class="pd-trust-item">
        <mat-icon>local_shipping</mat-icon>
        <span>Fast Delivery</span>
      </div>
      <div class="pd-trust-item">
        <mat-icon>cached</mat-icon>
        <span>Easy Returns</span>
      </div>
      <div class="pd-trust-item">
        <mat-icon>lock</mat-icon>
        <span>Secure Payment</span>
      </div>
    </div>

  </div>

</div><!-- /pd-layout -->

<!-- ── TABS ── -->
<div class="container pd-tabs-wrap">
  <div class="pd-tab-bar">
    <button class="pd-tab-btn" [class.pd-tab-active]="activeTab==='description'" (click)="activeTab='description'">Description</button>
    <button class="pd-tab-btn" *ngIf="product.ingredients" [class.pd-tab-active]="activeTab==='ingredients'" (click)="activeTab='ingredients'">Ingredients</button>
    <button class="pd-tab-btn" *ngIf="product.composition" [class.pd-tab-active]="activeTab==='composition'" (click)="activeTab='composition'">Composition</button>
    <button class="pd-tab-btn" *ngIf="product.benefits" [class.pd-tab-active]="activeTab==='benefits'" (click)="activeTab='benefits'">Benefits</button>
    <button class="pd-tab-btn" *ngIf="product.howToUse" [class.pd-tab-active]="activeTab==='howToUse'" (click)="activeTab='howToUse'">How to Use</button>
    <button class="pd-tab-btn" *ngIf="product.dosageInstructions" [class.pd-tab-active]="activeTab==='dosage'" (click)="activeTab='dosage'">Dosage</button>
    <button class="pd-tab-btn" *ngIf="product.safetyInformation" [class.pd-tab-active]="activeTab==='safety'" (click)="activeTab='safety'">Safety</button>
    <button class="pd-tab-btn" *ngIf="product.sideEffects" [class.pd-tab-active]="activeTab==='sideEffects'" (click)="activeTab='sideEffects'">Side Effects</button>
    <button class="pd-tab-btn" *ngIf="product.storageInstructions" [class.pd-tab-active]="activeTab==='storage'" (click)="activeTab='storage'">Storage</button>
    <button class="pd-tab-btn" *ngIf="product.certifications" [class.pd-tab-active]="activeTab==='certs'" (click)="activeTab='certs'">Certifications</button>
    <button class="pd-tab-btn" [class.pd-tab-active]="activeTab==='reviews'" (click)="activeTab='reviews'">
      Reviews <span *ngIf="product.reviewCount" class="pd-tab-badge">{{ product.reviewCount }}</span>
    </button>
  </div>

  <div class="pd-tab-content">

    <!-- Description -->
    <div *ngIf="activeTab==='description'">
      <div class="pd-rich-text" *ngIf="product.description; else noDesc" [innerHTML]="product.description"></div>
      <ng-template #noDesc><p class="pd-empty-tab">No description provided.</p></ng-template>
    </div>

    <!-- Ingredients -->
    <div *ngIf="activeTab==='ingredients'">
      <div class="pd-ingredients-grid">
        <ng-container *ngFor="let line of splitLines(product.ingredients)">
          <div class="pd-ingredient-item" *ngIf="line.trim()">
            <mat-icon>eco</mat-icon>
            <span>{{ line.trim() }}</span>
          </div>
        </ng-container>
      </div>
    </div>

    <!-- Composition -->
    <div *ngIf="activeTab==='composition'">
      <div class="pd-table-section">
        <div class="pd-comp-row" *ngFor="let line of splitLines(product.composition)">
          <span *ngIf="line.trim()">{{ line.trim() }}</span>
        </div>
      </div>
    </div>

    <!-- Benefits -->
    <div *ngIf="activeTab==='benefits'">
      <div class="pd-benefits-head">
        <h3>Key benefits</h3>
        <span class="pd-benefits-count">{{ benefitItems(product.benefits).length }} benefits</span>
      </div>
      <div class="pd-benefits-grid">
        <div class="pd-benefit-card" *ngFor="let b of benefitItems(product.benefits); trackBy: trackBenefit">
          <span class="pd-benefit-icon"><mat-icon>check</mat-icon></span>
          <div class="pd-benefit-text">
            <strong class="pd-benefit-title">{{ b.title }}</strong>
            <span class="pd-benefit-desc" *ngIf="b.description">{{ b.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- How to Use -->
    <div *ngIf="activeTab==='howToUse'">
      <ol class="pd-steps">
        <li *ngFor="let step of splitLines(product.howToUse)">
          <span *ngIf="step.trim()">{{ step.trim() }}</span>
        </li>
      </ol>
    </div>

    <!-- Dosage -->
    <div *ngIf="activeTab==='dosage'">
      <div class="pd-info-box pd-info-green">
        <mat-icon>schedule</mat-icon>
        <div class="pd-rich-text" style="white-space:pre-line">{{ product.dosageInstructions }}</div>
      </div>
    </div>

    <!-- Safety -->
    <div *ngIf="activeTab==='safety'">
      <div class="pd-info-box pd-info-amber">
        <mat-icon>shield</mat-icon>
        <div style="white-space:pre-line">{{ product.safetyInformation }}</div>
      </div>
    </div>

    <!-- Side Effects -->
    <div *ngIf="activeTab==='sideEffects'">
      <div class="pd-info-box pd-info-red">
        <mat-icon>warning_amber</mat-icon>
        <div style="white-space:pre-line">{{ product.sideEffects }}</div>
      </div>
    </div>

    <!-- Storage -->
    <div *ngIf="activeTab==='storage'">
      <div class="pd-info-box pd-info-blue">
        <mat-icon>thermostat</mat-icon>
        <div style="white-space:pre-line">{{ product.storageInstructions }}</div>
      </div>
    </div>

    <!-- Certifications -->
    <div *ngIf="activeTab==='certs'">
      <div class="pd-certs-grid">
        <div class="pd-cert-card" *ngFor="let c of splitCerts(product.certifications)">
          <mat-icon>verified</mat-icon>
          <span>{{ c }}</span>
        </div>
      </div>
    </div>

    <!-- Reviews -->
    <div *ngIf="activeTab==='reviews'">
      <!-- Summary -->
      <div class="pd-review-summary" *ngIf="product.reviewCount > 0">
        <div class="pd-rs-score">
          <span class="pd-rs-num">{{ product.averageRating | number:'1.1-1' }}</span>
          <app-rating [value]="product.averageRating" [showCount]="false" />
          <span class="pd-rs-count">Based on {{ product.reviewCount }} review{{ product.reviewCount === 1 ? '' : 's' }}</span>
        </div>
      </div>

      <!-- Write review -->
      <div class="pd-write-review" *ngIf="auth.isLoggedIn()">
        <h3 class="pd-section-h">Share Your Experience</h3>
        <form [formGroup]="reviewForm" (ngSubmit)="submitReview()">
          <div class="pd-rating-pick">
            <span>Your Rating:</span>
            <app-rating [value]="reviewRating" [interactive]="true" (rated)="reviewRating = $event" />
          </div>
          <input class="pd-input" type="text" placeholder="Review title (optional)" formControlName="title" />
          <textarea class="pd-textarea" rows="4" placeholder="Tell others about your experience with this product…" formControlName="comment"></textarea>
          <button class="pd-btn-primary pd-btn-sm" type="submit" [disabled]="reviewForm.invalid || submittingReview">
            {{ submittingReview ? 'Submitting…' : 'Submit Review' }}
          </button>
        </form>
      </div>
      <div class="pd-login-prompt" *ngIf="!auth.isLoggedIn()">
        <mat-icon>rate_review</mat-icon>
        <p>Share your experience with this product.</p>
        <a routerLink="/auth/login" class="pd-btn-primary pd-btn-sm">Login to Write a Review</a>
      </div>

      <!-- List -->
      <div class="pd-reviews-list">
        <div class="pd-review-item" *ngFor="let r of product.reviews">
          <div class="pd-ri-header">
            <div class="pd-ri-avatar">{{ (r.customerName || '?')[0].toUpperCase() }}</div>
            <div class="pd-ri-meta">
              <strong>{{ r.customerName }}</strong>
              <span class="pd-ri-date">{{ r.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="pd-ri-rating">
              <app-rating [value]="r.rating" [showCount]="false" />
            </div>
          </div>
          <p class="pd-ri-title" *ngIf="r.title">{{ r.title }}</p>
          <p class="pd-ri-body">{{ r.comment }}</p>
        </div>
        <div class="pd-no-reviews" *ngIf="!product.reviews?.length">
          <mat-icon>reviews</mat-icon>
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ── RELATED PRODUCTS ── -->
<section class="pd-related" *ngIf="relatedProducts().length">
  <div class="container">
    <div class="pd-related-header">
      <p class="pd-section-eyebrow">You Might Also Like</p>
      <h2 class="pd-section-title">Related Products</h2>
    </div>
    <div class="pd-related-grid">
      <app-product-card *ngFor="let p of relatedProducts()" [product]="p" />
    </div>
  </div>
</section>

</ng-container>
  `,
  styles: [`
:host { display:block; background:var(--bg); min-height:100vh; }

/* ── Loading & not found ── */
.pd-loading { display:flex; justify-content:center; padding:120px 0; }
.pd-not-found {
  text-align:center; padding:100px 24px;
  mat-icon { font-size:56px; width:56px; height:56px; color:var(--border); }
  h2 { font-size:26px; font-weight:700; color:var(--text-primary); margin:16px 0 8px; }
  p  { font-size:15px; color:var(--text-secondary); margin:0 0 28px; }
}

/* ── Breadcrumb ── */
.pd-bc-bar { background:#fff; border-bottom:1px solid var(--border); padding:12px 0; }
.pd-breadcrumb {
  display:flex; align-items:center; flex-wrap:wrap; gap:4px;
  font-size:13px; color:var(--text-secondary);
  a { color:var(--text-secondary); transition:color .15s; &:hover { color:var(--primary); } }
}
.pd-bc-sep { color:var(--border); font-size:16px; }
.pd-bc-cur { color:var(--primary); font-weight:600; }

/* ── Layout ── */
.pd-layout {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:56px;
  padding:36px 16px 48px;
  align-items:start;
}
@media (max-width:960px) { .pd-layout { grid-template-columns:1fr; gap:32px; } }

/* ── Gallery ── */
.pd-gallery { display:flex; gap:14px; }
.pd-thumbs {
  display:flex; flex-direction:column; gap:10px;
  @media (max-width:600px) { flex-direction:row; flex-wrap:wrap; }
}
.pd-thumb {
  width:70px; height:70px; border-radius:10px; overflow:hidden;
  border:2px solid var(--border); background:#fff; cursor:pointer;
  padding:4px; transition:border-color .2s; flex-shrink:0;
  &.pd-thumb-active { border-color:var(--primary); }
  img { width:100%; height:100%; object-fit:contain; }
}
.pd-main-img-wrap {
  flex:1; position:relative; border-radius:16px; overflow:hidden;
  background:#fff; border:1px solid var(--border);
  min-height:420px; display:flex; align-items:center; justify-content:center;
}
.pd-main-img {
  width:100%; max-height:500px; object-fit:contain;
  padding:24px; display:block;
}
.pd-badges { position:absolute; top:14px; left:14px; display:flex; flex-direction:column; gap:6px; z-index:2; }
.pd-badge {
  font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
  padding:4px 10px; border-radius:100px;
}
.pd-badge-rx   { background:#FEE2E2; color:#DC2626; }
.pd-badge-new  { background:#D1FAE5; color:#065F46; }
.pd-badge-sale { background:#064E3B; color:#fff; }
.pd-badge-best { background:#FEF3C7; color:#92400E; }

/* ── Info panel ── */
.pd-top-meta { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.pd-category { font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--primary); }
.pd-stock-dot {
  font-size:12px; font-weight:700; padding:3px 10px; border-radius:100px;
  background:#D1FAE5; color:#065F46;
  &.pd-out { background:#FEE2E2; color:#DC2626; }
}

.pd-name {
  font-family:'Cormorant Garamond', Georgia, serif;
  font-size:36px; font-weight:500; color:var(--text-primary);
  margin:0 0 14px; line-height:1.15;
}
@media (max-width:640px) { .pd-name { font-size:28px; } }

.pd-rating-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.pd-rating-val { font-size:14px; font-weight:700; color:var(--text-primary); }
.pd-rating-link {
  font-size:13px; color:var(--primary); font-weight:600; cursor:pointer; text-decoration:underline;
}
.pd-no-reviews { font-size:13px; color:var(--text-muted); margin:0 0 14px; }
.pd-no-reviews-inline { font-size:12.5px; color:var(--text-muted); font-style:italic; }

.pd-price-block { display:flex; align-items:baseline; gap:12px; margin:16px 0 2px; flex-wrap:wrap; }
.pd-sell-price { font-size:38px; font-weight:800; color:var(--primary); line-height:1; }
.pd-mrp { font-size:17px; color:var(--text-muted); text-decoration:line-through; }
.pd-save { font-size:13px; font-weight:700; color:#059669; background:#D1FAE5; padding:3px 8px; border-radius:6px; }
.pd-tax-note { font-size:11.5px; color:var(--text-muted); margin:0 0 16px; }

.pd-quick-meta {
  display:flex; flex-wrap:wrap; gap:12px; margin-bottom:18px;
  span { display:flex; align-items:center; gap:4px; font-size:13px; color:var(--text-secondary); }
  mat-icon { font-size:16px; width:16px; height:16px; color:var(--primary); }
}

/* ── Variants ── */
.pd-variants { margin:4px 0 20px; }
.pd-field-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); margin:0 0 10px; }
.pd-variant-row { display:flex; flex-wrap:wrap; gap:8px; }
.pd-variant-chip {
  padding:7px 18px; border-radius:8px;
  border:2px solid var(--border); background:#fff;
  font-size:13px; font-weight:500; color:var(--text-primary);
  cursor:pointer; transition:all .2s;
  &.pd-variant-active { border-color:var(--primary); background:var(--primary-light); color:var(--primary); font-weight:700; }
  &.pd-variant-oos { opacity:.4; cursor:not-allowed; text-decoration:line-through; }
}
.pd-adj { font-size:11px; color:var(--text-muted); margin-left:4px; }

/* ── Cart section ── */
.pd-cart-section { display:flex; align-items:center; gap:12px; margin:24px 0 8px; flex-wrap:wrap; }
.pd-qty {
  display:flex; align-items:center; gap:0;
  border:1.5px solid var(--border); border-radius:10px;
  background:#fff; overflow:hidden; flex-shrink:0;
}
.pd-qty-btn {
  width:42px; height:48px; border:none; background:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  color:var(--text-primary); transition:background .15s;
  mat-icon { font-size:20px; }
  &:hover:not(:disabled) { background:var(--bg); }
  &:disabled { opacity:.3; cursor:not-allowed; }
}
.pd-qty-val { width:44px; text-align:center; font-size:16px; font-weight:700; color:var(--text-primary); }
.pd-btn-cart {
  flex:1; max-width:220px; height:52px; border-radius:10px;
  border:none; background:var(--primary); color:#fff;
  font-size:15px; font-weight:700; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition:background .2s; box-shadow:0 4px 14px rgba(6,78,59,.25);
  mat-icon { font-size:20px; }
  &:hover:not(:disabled) { background:#053d2f; }
  &:disabled { opacity:.55; cursor:not-allowed; }
  &.pd-btn-oos { background:#9CA3AF; box-shadow:none; }
}
.pd-btn-wish {
  width:52px; height:52px; border-radius:10px;
  border:1.5px solid var(--border); background:#fff;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .2s;
  mat-icon { font-size:22px; color:var(--text-muted); }
  &:hover { border-color:#DC2626; mat-icon { color:#DC2626; } }
  &.pd-wish-active { border-color:#DC2626; background:#FEF2F2; mat-icon { color:#DC2626; } }
}

.pd-stock-info {
  display:flex; align-items:center; gap:6px;
  font-size:13px; font-weight:600; color:#D97706;
  margin:0 0 16px;
  mat-icon { font-size:16px; width:16px; height:16px; }
}
.pd-rx-note {
  display:flex; align-items:flex-start; gap:8px;
  background:#FEF3C7; border:1px solid #FDE68A; border-radius:8px;
  padding:12px 16px; font-size:13px; color:#92400E;
  margin-bottom:18px;
  mat-icon { font-size:18px; width:18px; height:18px; flex-shrink:0; margin-top:1px; }
}

/* ── Trust badges ── */
.pd-trust {
  display:grid; grid-template-columns:repeat(4,1fr);
  gap:10px; margin:20px 0 16px;
  border-top:1px solid var(--border); padding-top:20px;
}
@media (max-width:480px) { .pd-trust { grid-template-columns:repeat(2,1fr); } }
.pd-trust-item {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  text-align:center;
  mat-icon { font-size:22px; color:var(--primary); }
  span { font-size:11px; font-weight:600; color:var(--text-secondary); }
}

.pd-sku-inline { font-size:11px; color:var(--text-muted); font-weight:500; letter-spacing:0.3px; }

/* ── Tabs ── */
.pd-tabs-wrap { margin:48px auto; border-radius:14px; background:#fff; border:1px solid var(--border); overflow:hidden; }
.pd-tab-bar {
  display:flex; overflow-x:auto; border-bottom:1px solid var(--border);
  scrollbar-width:none; &::-webkit-scrollbar { display:none; }
}
.pd-tab-btn {
  flex-shrink:0; padding:14px 20px; border:none; background:transparent;
  font-size:13.5px; font-weight:600; color:var(--text-secondary);
  cursor:pointer; border-bottom:2.5px solid transparent; margin-bottom:-1px;
  transition:all .2s; white-space:nowrap;
  &:hover { color:var(--primary); }
  &.pd-tab-active { color:var(--primary); border-bottom-color:var(--primary); }
}
.pd-tab-badge {
  background:var(--primary); color:#fff;
  font-size:10px; font-weight:700;
  padding:1px 6px; border-radius:100px; margin-left:5px;
}
.pd-tab-content { padding:28px 32px; min-height:200px; }
@media (max-width:640px) { .pd-tab-content { padding:20px 16px; } }

.pd-rich-text { font-size:14.5px; line-height:1.75; color:var(--text-secondary); }
.pd-empty-tab { font-size:14px; color:var(--text-muted); text-align:center; padding:32px; }

.pd-ingredients-grid {
  display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));
  gap:10px;
}
.pd-ingredient-item {
  display:flex; align-items:center; gap:8px;
  background:var(--bg); border:1px solid var(--border); border-radius:8px;
  padding:10px 14px; font-size:13.5px; color:var(--text-primary);
  mat-icon { font-size:16px; color:#059669; flex-shrink:0; }
}

.pd-comp-row {
  font-size:14px; color:var(--text-secondary);
  padding:8px 0; border-bottom:1px solid var(--border);
  &:last-child { border:none; }
}

.pd-benefits-head {
  display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 16px;
  h3 { margin:0; font-size:18px; font-weight:700; color:var(--text-primary); }
}
.pd-benefits-count {
  font-size:12px; font-weight:600; color:#047857; background:#ECFDF5;
  border:1px solid #A7F3D0; border-radius:100px; padding:4px 12px; white-space:nowrap;
}
.pd-benefits-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px; }
.pd-benefit-card {
  display:flex; align-items:flex-start; gap:14px;
  background:#fff; border:1px solid var(--border); border-left:4px solid #059669; border-radius:12px;
  padding:16px 18px; box-shadow:0 1px 2px rgba(15,23,42,.04);
  transition:box-shadow .15s ease, transform .15s ease;
  &:hover { box-shadow:0 6px 16px rgba(5,150,105,.12); transform:translateY(-1px); }
}
.pd-benefit-icon {
  width:30px; height:30px; flex-shrink:0; border-radius:50%;
  background:#D1FAE5; color:#047857; display:flex; align-items:center; justify-content:center;
  mat-icon { font-size:18px; width:18px; height:18px; }
}
.pd-benefit-text { display:flex; flex-direction:column; gap:4px; min-width:0; }
.pd-benefit-title { font-size:14.5px; font-weight:600; color:var(--text-primary); line-height:1.4; }
.pd-benefit-desc { font-size:13px; color:var(--text-secondary); line-height:1.55; }
@media (max-width: 600px) {
  .pd-benefits-grid { grid-template-columns:1fr; }
  .pd-benefit-card { padding:14px; }
}

.pd-steps {
  padding-left:20px; margin:0;
  li { font-size:14.5px; color:var(--text-secondary); line-height:1.7; margin-bottom:10px; }
}

.pd-info-box {
  display:flex; gap:14px; border-radius:12px; padding:20px;
  font-size:14px; color:var(--text-primary); line-height:1.7;
  mat-icon { font-size:24px; flex-shrink:0; margin-top:2px; }
  &.pd-info-green { background:#F0FDF4; mat-icon { color:#059669; } }
  &.pd-info-amber { background:#FFFBEB; mat-icon { color:#D97706; } }
  &.pd-info-red   { background:#FFF1F2; mat-icon { color:#E11D48; } }
  &.pd-info-blue  { background:#EFF6FF; mat-icon { color:#2563EB; } }
}

.pd-certs-grid { display:flex; flex-wrap:wrap; gap:12px; }
.pd-cert-card {
  display:flex; align-items:center; gap:8px;
  background:var(--primary-light); border:1px solid rgba(6,78,59,.15);
  border-radius:100px; padding:10px 20px;
  font-size:13.5px; font-weight:600; color:var(--primary);
  mat-icon { font-size:18px; }
}

/* ── Reviews ── */
.pd-review-summary {
  background:var(--bg); border-radius:12px; padding:20px;
  margin-bottom:24px; display:flex; align-items:center; gap:20px;
}
.pd-rs-score { display:flex; flex-direction:column; align-items:center; gap:6px; }
.pd-rs-num { font-size:40px; font-weight:800; color:var(--primary); line-height:1; }
.pd-rs-count { font-size:12px; color:var(--text-muted); }

.pd-write-review {
  background:var(--bg); border:1px solid var(--border); border-radius:12px;
  padding:24px; margin-bottom:28px;
}
.pd-section-h { font-size:16px; font-weight:700; color:var(--text-primary); margin:0 0 16px; }
.pd-rating-pick { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:600; margin-bottom:14px; }
.pd-input {
  width:100%; height:42px; padding:0 14px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  font-size:13.5px; color:var(--text-primary); outline:none; margin-bottom:10px;
  box-sizing:border-box;
  &:focus { border-color:var(--primary); }
}
.pd-textarea {
  width:100%; padding:12px 14px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  font-size:13.5px; color:var(--text-primary); outline:none;
  resize:vertical; font-family:inherit; margin-bottom:14px;
  box-sizing:border-box;
  &:focus { border-color:var(--primary); }
}

.pd-login-prompt {
  text-align:center; padding:28px; background:var(--bg); border-radius:12px;
  margin-bottom:24px;
  mat-icon { font-size:32px; color:var(--border); }
  p { font-size:14px; color:var(--text-secondary); margin:8px 0 16px; }
}

.pd-reviews-list { display:flex; flex-direction:column; gap:0; }
.pd-review-item {
  padding:20px 0; border-bottom:1px solid var(--border);
  &:last-child { border:none; }
}
.pd-ri-header { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.pd-ri-avatar {
  width:38px; height:38px; border-radius:50%;
  background:var(--primary); color:#fff;
  font-size:15px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.pd-ri-meta { flex:1; strong { display:block; font-size:14px; } }
.pd-ri-date { font-size:12px; color:var(--text-muted); }
.pd-ri-title { font-size:14px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.pd-ri-body  { font-size:14px; color:var(--text-secondary); margin:0; line-height:1.6; }
.pd-no-reviews {
  text-align:center; padding:40px;
  mat-icon { font-size:36px; color:var(--border); }
  p { font-size:14px; color:var(--text-muted); margin:10px 0 0; }
}

/* ── Related ── */
.pd-related {
  background:var(--ivory); border-top:1px solid var(--border);
  padding:64px 0 72px;
}
.pd-related-header { margin-bottom:32px; }
.pd-section-eyebrow {
  font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:var(--primary); margin:0 0 8px;
}
.pd-section-title {
  font-family:'Cormorant Garamond', Georgia, serif;
  font-size:32px; font-weight:500; color:var(--text-primary); margin:0;
}
.pd-related-grid {
  display:grid; grid-template-columns:repeat(4,1fr); gap:22px;
}
@media (max-width:1100px) { .pd-related-grid { grid-template-columns:repeat(3,1fr); } }
@media (max-width:768px)  { .pd-related-grid { grid-template-columns:repeat(2,1fr); gap:14px; } }
@media (max-width:480px)  { .pd-related-grid { grid-template-columns:1fr; } }

/* ── Shared buttons ── */
.pd-btn-primary {
  display:inline-flex; align-items:center; justify-content:center;
  height:46px; padding:0 28px; border-radius:10px;
  background:var(--primary); color:#fff; border:none;
  font-size:14.5px; font-weight:700; cursor:pointer; text-decoration:none;
  transition:background .2s;
  &:hover { background:#053d2f; }
  &:disabled { opacity:.55; cursor:not-allowed; }
}
.pd-btn-sm { height:40px; padding:0 22px; font-size:13.5px; }
  `]
})
export class ProductDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService    = inject(CartService);
  auth                   = inject(AuthService);
  private snackBar       = inject(MatSnackBar);
  private fb             = inject(FormBuilder);

  product: ProductDetail | null = null;
  relatedProducts = signal<ProductList[]>([]);

  activeImage   = '';
  activeTab     = 'description';
  selectedVariant: ProductVariant | null = null;
  qty           = 1;
  wishlisted    = false;
  loading       = true;
  addingToCart  = false;
  reviewRating  = 5;
  submittingReview = false;

  reviewForm = this.fb.group({
    title:   [''],
    comment: ['', Validators.required]
  });

  get sellingPrice(): number {
    const base = this.product?.discountPrice ?? this.product?.price ?? 0;
    return base + (this.selectedVariant?.priceAdjustment ?? 0);
  }

  get discountPercent(): number {
    if (this.product?.discountPrice && this.product.price > this.product.discountPrice) {
      return Math.round(((this.product.price - this.product.discountPrice) / this.product.price) * 100);
    }
    return 0;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) this.loadProduct(slug);
    });
  }

  private loadProduct(slug: string): void {
    this.loading = true;
    this.product = null;
    this.activeTab = 'description';
    this.qty = 1;
    this.selectedVariant = null;
    this.reviewRating = 5;
    this.reviewForm.reset();

    this.productService.getBySlug(slug).subscribe({
      next: res => {
        if (res.data) {
          this.product = res.data;
          const primary = res.data.images?.find(i => i.isPrimary) ?? res.data.images?.[0];
          this.activeImage = primary?.imageUrl ?? res.data.primaryImageUrl ?? '';
          this.loadRelated(res.data.id, res.data.categoryId);
          this.productService.addToRecentlyViewed(res.data as any);
          if (this.auth.isLoggedIn()) {
            this.productService.checkWishlist(res.data.id).subscribe(r => {
              if (r.data != null) this.wishlisted = r.data;
            });
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private loadRelated(productId: string, categoryId?: string): void {
    if (!categoryId) return;
    this.productService.getAll({ categoryId, pageSize: 8 }).subscribe(res => {
      if (res.data?.items) {
        this.relatedProducts.set(res.data.items.filter(p => p.id !== productId).slice(0, 4));
      }
    });
  }

  onVariantSelect(v: ProductVariant): void {
    this.selectedVariant = this.selectedVariant?.id === v.id ? null : v;
  }

  incQty(): void { this.qty++; }
  decQty(): void { if (this.qty > 1) this.qty--; }

  addToCart(): void {
    if (!this.product) return;
    this.addingToCart = true;
    this.cartService.addItem({
      productId: this.product.id,
      quantity:  this.qty,
      variantId: this.selectedVariant?.id
    }).subscribe({
      next: () => {
        this.addingToCart = false;
        this.snackBar.open('Added to cart!', 'View Cart', { duration: 3000 })
          .onAction().subscribe(() => window.location.href = '/cart');
      },
      error: () => { this.addingToCart = false; }
    });
  }

  toggleWishlist(): void {
    if (!this.auth.isLoggedIn()) {
      this.snackBar.open('Please login to save to wishlist', 'Login', { duration: 3000 })
        .onAction().subscribe(() => window.location.href = '/auth/login');
      return;
    }
    if (!this.product) return;
    if (this.wishlisted) {
      this.productService.removeFromWishlist(this.product.id).subscribe(() => {
        this.wishlisted = false;
        this.snackBar.open('Removed from wishlist', undefined, { duration: 2000 });
      });
    } else {
      this.productService.addToWishlist(this.product.id).subscribe(() => {
        this.wishlisted = true;
        this.snackBar.open('Added to wishlist!', undefined, { duration: 2000 });
      });
    }
  }

  submitReview(): void {
    if (this.reviewForm.invalid || !this.product) return;
    this.submittingReview = true;
    this.productService.createReview({
      productId: this.product.id,
      rating:    this.reviewRating,
      ...this.reviewForm.value
    }).subscribe({
      next: () => {
        this.snackBar.open('Review submitted! It will appear after approval.', undefined, { duration: 4000 });
        this.reviewForm.reset();
        this.reviewRating = 5;
        this.submittingReview = false;
      },
      error: () => { this.submittingReview = false; }
    });
  }

  splitLines(text?: string): string[] {
    if (!text) return [];
    return text.split(/\n|,|;/).filter(s => s.trim());
  }

  /**
   * Benefits are written one per line, optionally as "Title – explanation". Only line breaks separate benefits, so a comma or
   * semicolon inside a sentence ("Back pain, cervical spondylosis") stays in one card.
   */
  benefitItems(text?: string): { title: string; description: string }[] {
    if (!text) return [];
    return text
      .split(/\r?\n|\u2022|\u25CF|\u2714|\u2705/)
      .map(line => line.replace(/^[\s\-*\u2013\u2014\u2192>]+/, '').trim())
      .filter(line => line.length > 0)
      .map(line => {
        const m = line.match(/^(.{3,80}?)\s+[\u2013\u2014-]\s+(.+)$/) || line.match(/^([^:]{3,60}):\s+(.+)$/);
        return m ? { title: m[1].trim(), description: m[2].trim() } : { title: line, description: '' };
      });
  }

  trackBenefit(_: number, b: { title: string }): string { return b.title; }

  splitCerts(text?: string): string[] {
    if (!text) return [];
    return text.split(',').map(s => s.trim()).filter(Boolean);
  }
}
