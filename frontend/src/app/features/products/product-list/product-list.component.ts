import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { ProductList, ProductFilter, Category } from '../../../core/models/product.models';
import { PagedResult } from '../../../core/models/api.models';

interface CategoryNode extends Category {
  children: CategoryNode[];
  expanded: boolean;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, FormsModule, NgFor, NgIf, CurrencyPipe, DecimalPipe, MatIconModule, MatProgressSpinnerModule, ProductCardComponent, MediaUrlPipe],
  template: `
<!-- ── HERO ── -->
<div class="pl-hero">
  <div class="container pl-hero-content">
    <p class="pl-hero-eyebrow">Siddham Pharmacy</p>
    <h1 class="pl-hero-title">All Products</h1>
    <p class="pl-hero-sub">Authentic Ayurvedic remedies, handpicked for your wellness journey</p>
  </div>
</div>

<!-- ── LAYOUT ── -->
<div class="container pl-layout">

  <!-- ── SIDEBAR: categories only ── -->
  <aside class="pl-sidebar" [class.pl-sidebar-open]="sidebarOpen">
    <div class="pl-sidebar-head">
      <span class="pl-sidebar-title">Categories</span>
      <button class="pl-sidebar-close" (click)="sidebarOpen=false"><mat-icon>close</mat-icon></button>
    </div>

    <div class="pl-cat-tree">
      <button class="pl-cat-item pl-cat-all"
        [class.active]="!filter.categoryId"
        (click)="onCategoryFilter(undefined)">
        <mat-icon>apps</mat-icon> All Products
      </button>

      <ng-container *ngFor="let root of categoryTree()">
        <div class="pl-cat-root-wrap">
          <button class="pl-cat-item"
            [class.active]="filter.categoryId === root.id"
            (click)="onCategoryFilter(root.id)">
            <span class="pl-cat-name">{{ root.name }}</span>
            <span class="pl-cat-meta">
              <span class="pl-cat-count">{{ root.productCount }}</span>
              <button *ngIf="root.children.length" class="pl-expand-btn"
                (click)="$event.stopPropagation(); root.expanded = !root.expanded">
                <mat-icon>{{ root.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </span>
          </button>
          <a class="pl-cat-browse-link" [routerLink]="['/products/category', root.slug]" title="Browse {{ root.name }}">
            <mat-icon>open_in_new</mat-icon>
          </a>
        </div>

        <div class="pl-children" *ngIf="root.expanded && root.children.length">
          <button *ngFor="let ch of root.children"
            class="pl-cat-child"
            [class.active]="filter.categoryId === ch.id"
            (click)="onCategoryFilter(ch.id)">
            <span>{{ ch.name }}</span>
            <span class="pl-cat-count">{{ ch.productCount }}</span>
          </button>
        </div>
      </ng-container>
    </div>
  </aside>

  <!-- ── MAIN ── -->
  <div class="pl-main">

    <!-- ── TOP ROW: count + search + sort ── -->
    <div class="pl-top-row">
      <div class="pl-top-left">
        <button class="pl-filter-toggle" (click)="sidebarOpen=true">
          <mat-icon>menu</mat-icon>
        </button>
        <p class="pl-count" *ngIf="pagedResult">
          Showing <strong>{{ rangeStart }}–{{ rangeEnd }}</strong> of <strong>{{ pagedResult.totalCount }}</strong> products
        </p>
      </div>
      <div class="pl-top-right">
        <div class="pl-search-box" [class.focused]="searchFocused">
          <mat-icon class="pl-s-icon">search</mat-icon>
          <input class="pl-s-input" type="text" [(ngModel)]="searchQuery"
            placeholder="Search products…"
            (focus)="searchFocused=true" (blur)="searchFocused=false"
            (keyup.enter)="applySearch()" />
          <button *ngIf="searchQuery" class="pl-s-clear" (click)="searchQuery=''; applySearch()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <select class="pl-sort" [(ngModel)]="sortValue" (ngModelChange)="onSortChange()">
          <option value="createdAt_desc">Newest First</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rating_desc">Top Rated</option>
          <option value="popular_desc">Best Selling</option>
        </select>
      </div>
    </div>

    <!-- ── FILTER BAR ── -->
    <div class="pl-filter-bar">

      <!-- Price Range -->
      <div class="pl-filt-item" [class.pl-filt-open]="openPanel==='price'" #pricePanel>
        <button class="pl-filt-btn" [class.pl-filt-active]="filter.minPrice || filter.maxPrice"
          (click)="togglePanel('price')">
          Price
          <span *ngIf="filter.minPrice || filter.maxPrice" class="pl-filt-dot"></span>
          <mat-icon>{{ openPanel==='price' ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
        <div class="pl-filt-panel pl-price-panel" *ngIf="openPanel==='price'">
          <p class="pl-pp-label">₹{{ sliderMin | number:'1.0-0' }} — ₹{{ sliderMax | number:'1.0-0' }}</p>
          <div class="pl-dual-range">
            <div class="pl-range-track">
              <div class="pl-range-fill"
                [style.left.%]="minPct"
                [style.width.%]="maxPct - minPct"></div>
            </div>
            <input class="pl-range-input" type="range"
              [min]="PRICE_MIN" [max]="PRICE_MAX" [step]="stepSize"
              [(ngModel)]="sliderMin" (input)="onSliderMin()" />
            <input class="pl-range-input" type="range"
              [min]="PRICE_MIN" [max]="PRICE_MAX" [step]="stepSize"
              [(ngModel)]="sliderMax" (input)="onSliderMax()" />
          </div>
          <div class="pl-pp-inputs">
            <input class="pl-pp-num" type="number" [(ngModel)]="sliderMin"
              (change)="onSliderMin()" placeholder="Min" [min]="PRICE_MIN" [max]="PRICE_MAX" />
            <span>—</span>
            <input class="pl-pp-num" type="number" [(ngModel)]="sliderMax"
              (change)="onSliderMax()" placeholder="Max" [min]="PRICE_MIN" [max]="PRICE_MAX" />
          </div>
          <div class="pl-pp-actions">
            <button class="pl-pp-clear" (click)="clearPrice()">Clear</button>
            <button class="pl-pp-apply" (click)="applyPrice()">Apply</button>
          </div>
        </div>
      </div>

      <!-- Availability -->
      <div class="pl-filt-item" [class.pl-filt-open]="openPanel==='avail'" #availPanel>
        <button class="pl-filt-btn" [class.pl-filt-active]="filter.inStock"
          (click)="togglePanel('avail')">
          Availability
          <span *ngIf="filter.inStock" class="pl-filt-dot"></span>
          <mat-icon>{{ openPanel==='avail' ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
        <div class="pl-filt-panel" *ngIf="openPanel==='avail'">
          <label class="pl-chk-row" (click)="toggleBool('inStock')">
            <span class="pl-chk" [class.pl-chk-on]="filter.inStock">
              <mat-icon *ngIf="filter.inStock">check</mat-icon>
            </span>
            In Stock Only
          </label>
        </div>
      </div>

      <!-- Collections -->
      <div class="pl-filt-item" [class.pl-filt-open]="openPanel==='coll'" #collPanel>
        <button class="pl-filt-btn" [class.pl-filt-active]="hasCollectionFilter"
          (click)="togglePanel('coll')">
          Collections
          <span *ngIf="hasCollectionFilter" class="pl-filt-dot"></span>
          <mat-icon>{{ openPanel==='coll' ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
        <div class="pl-filt-panel" *ngIf="openPanel==='coll'">
          <label class="pl-chk-row" (click)="toggleBool('isBestSeller')">
            <span class="pl-chk" [class.pl-chk-on]="filter.isBestSeller"><mat-icon *ngIf="filter.isBestSeller">check</mat-icon></span>
            Best Sellers
          </label>
          <label class="pl-chk-row" (click)="toggleBool('isNewArrival')">
            <span class="pl-chk" [class.pl-chk-on]="filter.isNewArrival"><mat-icon *ngIf="filter.isNewArrival">check</mat-icon></span>
            New Arrivals
          </label>
          <label class="pl-chk-row" (click)="toggleBool('isSpecialOffer')">
            <span class="pl-chk" [class.pl-chk-on]="filter.isSpecialOffer"><mat-icon *ngIf="filter.isSpecialOffer">check</mat-icon></span>
            Special Offers
          </label>
          <label class="pl-chk-row" (click)="toggleBool('isFeatured')">
            <span class="pl-chk" [class.pl-chk-on]="filter.isFeatured"><mat-icon *ngIf="filter.isFeatured">check</mat-icon></span>
            Featured
          </label>
        </div>
      </div>

      <!-- Rx -->
      <div class="pl-filt-item" [class.pl-filt-open]="openPanel==='rx'" #rxPanel>
        <button class="pl-filt-btn" [class.pl-filt-active]="filter.prescriptionRequired === false"
          (click)="togglePanel('rx')">
          Prescription
          <span *ngIf="filter.prescriptionRequired != null" class="pl-filt-dot"></span>
          <mat-icon>{{ openPanel==='rx' ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
        <div class="pl-filt-panel" *ngIf="openPanel==='rx'">
          <label class="pl-chk-row" (click)="setRx(false)">
            <span class="pl-chk" [class.pl-chk-on]="filter.prescriptionRequired === false"><mat-icon *ngIf="filter.prescriptionRequired === false">check</mat-icon></span>
            No Prescription Needed
          </label>
          <label class="pl-chk-row" (click)="setRx(true)">
            <span class="pl-chk" [class.pl-chk-on]="filter.prescriptionRequired === true"><mat-icon *ngIf="filter.prescriptionRequired === true">check</mat-icon></span>
            Prescription Required
          </label>
        </div>
      </div>

      <!-- Clear all -->
      <button class="pl-clear-all" *ngIf="hasAnyFilter" (click)="clearFilters()">
        <mat-icon>close</mat-icon> Clear All
      </button>
    </div>

    <!-- ── ACTIVE CHIPS ── -->
    <div class="pl-chips" *ngIf="hasAnyFilter">
      <span class="pl-chip" *ngIf="filter.search">"{{ filter.search }}" <button (click)="filter.search=undefined; searchQuery=''; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.categoryId">{{ categoryNameFor(filter.categoryId) }} <button (click)="onCategoryFilter(undefined)"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.minPrice || filter.maxPrice">₹{{ filter.minPrice || 0 }}–₹{{ filter.maxPrice || PRICE_MAX }} <button (click)="clearPrice(); reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.inStock">In Stock <button (click)="filter.inStock=undefined; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.isBestSeller">Best Sellers <button (click)="filter.isBestSeller=undefined; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.isNewArrival">New Arrivals <button (click)="filter.isNewArrival=undefined; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.isSpecialOffer">Special Offers <button (click)="filter.isSpecialOffer=undefined; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.isFeatured">Featured <button (click)="filter.isFeatured=undefined; reload()"><mat-icon>close</mat-icon></button></span>
      <span class="pl-chip" *ngIf="filter.prescriptionRequired != null">{{ filter.prescriptionRequired ? 'Rx Required' : 'No Rx' }} <button (click)="filter.prescriptionRequired=undefined; reload()"><mat-icon>close</mat-icon></button></span>
    </div>

    <!-- ── LOADING ── -->
    <div class="pl-loading" *ngIf="loading"><mat-spinner diameter="44"></mat-spinner></div>

    <!-- ── GRID ── -->
    <div class="pl-grid" *ngIf="!loading && products().length">
      <app-product-card *ngFor="let p of products()" [product]="p" />
    </div>

    <!-- ── EMPTY ── -->
    <div class="pl-empty" *ngIf="!loading && !products().length">
      <mat-icon>inventory_2</mat-icon>
      <h3>No products found</h3>
      <p>Try adjusting your filters or search query.</p>
      <button class="pl-empty-btn" (click)="clearFilters()">Clear All Filters</button>
    </div>

    <!-- ── PAGINATION ── -->
    <div class="pl-pagination" *ngIf="pagedResult && pagedResult.totalCount > pageSize">
      <button class="pl-pg-btn" [disabled]="currentPage===1" (click)="goToPage(currentPage-1)">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <button class="pl-pg-btn pl-pg-num"
        *ngFor="let p of pageNumbers()"
        [class.pl-pg-active]="p===currentPage"
        (click)="goToPage(p)">{{ p }}</button>
      <button class="pl-pg-btn" [disabled]="currentPage===totalPages()" (click)="goToPage(currentPage+1)">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>

  </div><!-- /pl-main -->
</div>

<!-- Mobile overlay -->
<div class="pl-overlay" *ngIf="sidebarOpen" (click)="sidebarOpen=false"></div>
  `,
  styles: [`
:host { display:block; background:var(--bg); min-height:100vh; }

/* ── Hero ── */
.pl-hero {
  background:linear-gradient(135deg, #071F14 0%, #064E3B 60%, #0A5845 100%);
  padding:52px 0 48px;
}
.pl-hero-eyebrow { font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:rgba(181,154,90,.9); margin:0 0 10px; }
.pl-hero-title { font-family:'Cormorant Garamond',Georgia,serif; font-size:42px; font-weight:500; color:#fff; margin:0 0 10px; line-height:1.08; }
.pl-hero-sub { font-size:15px; color:rgba(255,255,255,.6); margin:0; max-width:480px; }

/* ── Layout ── */
.pl-layout { display:grid; grid-template-columns:230px 1fr; gap:28px; padding:28px 16px 80px; align-items:start; }
@media (max-width:900px) { .pl-layout { grid-template-columns:1fr; } }

/* ── Sidebar ── */
.pl-sidebar {
  background:#fff; border:1px solid var(--border); border-radius:12px;
  overflow:hidden; position:sticky; top:88px;
}
@media (max-width:900px) {
  .pl-sidebar {
    position:fixed; inset:0 auto 0 0; width:280px;
    border-radius:0; z-index:500; overflow-y:auto;
    transform:translateX(-100%); transition:transform .3s ease;
    &.pl-sidebar-open { transform:translateX(0); }
  }
}
.pl-sidebar-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px 12px; border-bottom:1px solid var(--border);
}
.pl-sidebar-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--primary); }
.pl-sidebar-close {
  border:none; background:none; cursor:pointer; display:flex; align-items:center; padding:2px;
  mat-icon { font-size:18px; color:var(--text-muted); }
  @media (min-width:901px) { display:none; }
}

/* ── Category tree ── */
.pl-cat-tree { padding:8px 0 12px; }
.pl-cat-root-wrap { display:flex; align-items:center; }
.pl-cat-item {
  flex:1; display:flex; align-items:center; gap:8px;
  padding:8px 16px; border:none; background:transparent;
  cursor:pointer; text-align:left; font-size:13.5px; color:var(--text-primary);
  transition:background .15s; width:100%;
  &:hover { background:var(--bg); }
  &.active { background:var(--primary-light); color:var(--primary); font-weight:700; }
  mat-icon { font-size:17px; color:var(--primary); flex-shrink:0; }
}
.pl-cat-all { gap:8px; }
.pl-cat-name { flex:1; font-weight:500; }
.pl-cat-meta { display:flex; align-items:center; gap:2px; margin-left:auto; }
.pl-cat-count {
  font-size:11px; color:var(--text-muted);
  background:var(--bg); padding:1px 6px; border-radius:100px;
  .active & { background:var(--primary); color:#fff; }
}
.pl-expand-btn {
  border:none; background:none; cursor:pointer; display:flex; align-items:center; padding:0;
  mat-icon { font-size:16px; width:16px; height:16px; color:var(--text-muted); }
}
.pl-cat-browse-link {
  padding:6px 10px; display:flex; align-items:center; opacity:0; transition:opacity .15s;
  mat-icon { font-size:14px; color:var(--primary); }
  .pl-cat-root-wrap:hover & { opacity:1; }
}
.pl-children { padding-left:20px; }
.pl-cat-child {
  display:flex; align-items:center; justify-content:space-between;
  width:100%; padding:6px 16px 6px 8px; border:none; background:transparent;
  cursor:pointer; text-align:left; font-size:13px; color:var(--text-secondary);
  transition:background .15s;
  &:hover { background:var(--bg); color:var(--primary); }
  &.active { color:var(--primary); font-weight:600; }
}

/* ── Main ── */
.pl-main { min-width:0; }

/* ── Top row ── */
.pl-top-row {
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; flex-wrap:wrap; margin-bottom:10px;
  @media (max-width:600px) { gap:8px; }
}
.pl-top-left { display:flex; align-items:center; gap:10px; }
.pl-top-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; justify-content:flex-end;
  @media (max-width:600px) { width:100%; }
}

.pl-filter-toggle {
  display:none; align-items:center; justify-content:center;
  width:38px; height:38px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff; cursor:pointer;
  mat-icon { font-size:20px; color:var(--text-primary); }
  @media (max-width:900px) { display:flex; }
}

.pl-count { font-size:13.5px; color:var(--text-secondary); margin:0; }

.pl-search-box {
  display:flex; align-items:center; gap:0;
  border:1.5px solid var(--border); border-radius:8px;
  background:#fff; height:38px; overflow:hidden; transition:border-color .2s;
  &.focused { border-color:var(--primary); }
}
.pl-s-icon { font-size:17px !important; color:var(--text-muted); margin:0 6px 0 10px; flex-shrink:0; }
.pl-s-input {
  border:none; outline:none; background:transparent;
  font-size:13.5px; color:var(--text-primary); width:190px; padding:0;
  @media (max-width:600px) { width:100%; min-width:0; }
}
.pl-search-box { @media (max-width:600px) { flex:1; } }
.pl-s-clear {
  border:none; background:none; cursor:pointer; padding:0 8px; display:flex; align-items:center;
  mat-icon { font-size:15px; width:15px; height:15px; color:var(--text-muted); }
}

.pl-sort {
  height:38px; padding:0 28px 0 12px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  font-size:13.5px; color:var(--text-primary); outline:none;
  appearance:none; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%238E9A94'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 6px center; background-size:16px;
  &:focus { border-color:var(--primary); }
}

/* ── Filter bar ── */
.pl-filter-bar {
  display:flex; align-items:center; flex-wrap:wrap; gap:6px;
  padding:10px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border);
  margin-bottom:14px; position:relative;
}

.pl-filt-item { position:relative; }
.pl-filt-btn {
  display:flex; align-items:center; gap:4px;
  height:34px; padding:0 12px; border-radius:100px;
  border:1.5px solid var(--border); background:#fff;
  font-size:13px; font-weight:600; color:var(--text-primary);
  cursor:pointer; white-space:nowrap; transition:all .2s;
  mat-icon { font-size:16px; width:16px; height:16px; }
  &:hover { border-color:var(--primary); color:var(--primary); }
  &.pl-filt-active { border-color:var(--primary); background:var(--primary-light); color:var(--primary); }
}
.pl-filt-dot {
  width:6px; height:6px; border-radius:50%; background:var(--primary);
  flex-shrink:0; margin-left:2px;
}
.pl-filt-open .pl-filt-btn { border-color:var(--primary); box-shadow:0 0 0 2px rgba(6,78,59,.1); }

.pl-filt-panel {
  position:absolute; top:calc(100% + 8px); left:0; z-index:200;
  background:#fff; border:1px solid var(--border); border-radius:10px;
  box-shadow:0 8px 32px rgba(0,0,0,.12); padding:14px; min-width:200px;
}

/* Price panel */
.pl-price-panel { min-width:240px; }
.pl-pp-label { font-size:13px; font-weight:700; color:var(--primary); margin:0 0 14px; text-align:center; }

.pl-dual-range { position:relative; height:36px; margin-bottom:12px; }
.pl-range-track {
  position:absolute; top:50%; left:0; right:0; height:4px;
  background:var(--border); border-radius:2px; transform:translateY(-50%);
}
.pl-range-fill {
  position:absolute; height:4px; background:var(--primary); border-radius:2px;
}
.pl-range-input {
  position:absolute; width:100%; top:50%; transform:translateY(-50%);
  -webkit-appearance:none; appearance:none; height:4px; background:transparent;
  outline:none; cursor:pointer; pointer-events:none;
  &::-webkit-slider-thumb {
    -webkit-appearance:none; appearance:none;
    width:18px; height:18px; border-radius:50%;
    background:#fff; border:2.5px solid var(--primary);
    cursor:pointer; pointer-events:all;
    box-shadow:0 1px 4px rgba(0,0,0,.15);
    transition:transform .1s;
    &:hover { transform:scale(1.15); }
  }
  &::-moz-range-thumb {
    width:18px; height:18px; border-radius:50%;
    background:#fff; border:2.5px solid var(--primary);
    cursor:pointer; pointer-events:all;
  }
}
.pl-pp-inputs {
  display:flex; align-items:center; gap:8px; margin-bottom:12px;
  span { color:var(--text-muted); font-size:14px; }
}
.pl-pp-num {
  flex:1; height:34px; padding:0 10px; border-radius:7px;
  border:1.5px solid var(--border); background:var(--ivory);
  font-size:13px; color:var(--text-primary); outline:none;
  &:focus { border-color:var(--primary); }
}
.pl-pp-actions { display:flex; gap:8px; }
.pl-pp-clear {
  flex:1; height:32px; border-radius:7px;
  border:1.5px solid var(--border); background:transparent;
  font-size:13px; font-weight:600; color:var(--text-secondary); cursor:pointer;
  &:hover { border-color:var(--primary); color:var(--primary); }
}
.pl-pp-apply {
  flex:1; height:32px; border-radius:7px; border:none;
  background:var(--primary); color:#fff;
  font-size:13px; font-weight:700; cursor:pointer;
  &:hover { background:#053d2f; }
}

/* Checkbox rows */
.pl-chk-row {
  display:flex; align-items:center; gap:10px;
  padding:7px 2px; font-size:13.5px; color:var(--text-primary);
  cursor:pointer; white-space:nowrap;
  &:hover { color:var(--primary); }
}
.pl-chk {
  width:17px; height:17px; border-radius:4px;
  border:1.5px solid var(--border); background:#fff;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  transition:all .15s;
  &.pl-chk-on { background:var(--primary); border-color:var(--primary); }
  mat-icon { font-size:12px; width:12px; height:12px; color:#fff; }
}

.pl-clear-all {
  display:flex; align-items:center; gap:4px;
  height:34px; padding:0 12px; border-radius:100px;
  border:1.5px solid #E5E7EB; background:transparent;
  font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer;
  transition:all .2s; margin-left:auto;
  mat-icon { font-size:15px; width:15px; height:15px; }
  &:hover { border-color:#DC2626; color:#DC2626; }
}

/* ── Active chips ── */
.pl-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.pl-chip {
  display:inline-flex; align-items:center; gap:4px;
  background:var(--primary-light); color:var(--primary);
  font-size:12px; font-weight:600; padding:4px 8px; border-radius:100px;
  button { border:none; background:none; cursor:pointer; display:flex; align-items:center; padding:0; }
  mat-icon { font-size:13px; width:13px; height:13px; }
}

/* ── Loading ── */
.pl-loading { display:flex; justify-content:center; padding:72px 0; }

/* ── Grid ── */
.pl-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
@media (max-width:1200px) { .pl-grid { grid-template-columns:repeat(3,1fr); } }
@media (max-width:900px)  { .pl-grid { grid-template-columns:repeat(2,1fr); gap:14px; } }
@media (max-width:480px)  { .pl-grid { grid-template-columns:1fr; } }

/* ── Empty ── */
.pl-empty {
  text-align:center; padding:80px 24px;
  mat-icon { font-size:52px; width:52px; height:52px; color:var(--border); }
  h3 { font-size:22px; font-weight:700; color:var(--text-primary); margin:16px 0 8px; }
  p  { font-size:15px; color:var(--text-secondary); margin:0 0 24px; }
}
.pl-empty-btn {
  height:44px; padding:0 28px; border-radius:8px;
  background:var(--primary); color:#fff; border:none;
  font-size:14px; font-weight:600; cursor:pointer;
  &:hover { background:#053d2f; }
}

/* ── Pagination ── */
.pl-pagination { display:flex; justify-content:center; align-items:center; gap:6px; margin-top:48px; }
.pl-pg-btn {
  min-width:40px; height:40px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:600; color:var(--text-primary);
  cursor:pointer; transition:all .2s;
  mat-icon { font-size:18px; }
  &:hover:not(:disabled) { border-color:var(--primary); color:var(--primary); }
  &:disabled { opacity:.35; cursor:not-allowed; }
  &.pl-pg-num { padding:0 14px; }
}
.pl-pg-active { background:var(--primary) !important; border-color:var(--primary) !important; color:#fff !important; }

/* ── Mobile overlay ── */
.pl-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:499;
  @media (min-width:901px) { display:none; }
}
  `]
})
export class ProductListComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private route          = inject(ActivatedRoute);
  private elRef          = inject(ElementRef);

  products      = signal<ProductList[]>([]);
  allCategories = signal<Category[]>([]);
  pagedResult: PagedResult<ProductList> | null = null;

  loading     = false;
  sidebarOpen = false;
  searchFocused = false;
  currentPage = 1;
  pageSize    = 24;
  sortValue   = 'createdAt_desc';
  searchQuery = '';
  openPanel: string | null = null;

  readonly PRICE_MIN = 0;
  readonly PRICE_MAX = 5000;
  readonly stepSize  = 50;

  sliderMin = this.PRICE_MIN;
  sliderMax = this.PRICE_MAX;

  filter: ProductFilter = {};

  categoryTree = computed<CategoryNode[]>(() => {
    const all = this.allCategories();
    const roots = all.filter(c => !c.parentCategoryId && c.isActive && this.treeHasProducts(c.id, all));
    return roots.map(r => this.buildNode(r, all)).sort((a, b) => a.sortOrder - b.sortOrder);
  });

  private buildNode(cat: Category, all: Category[]): CategoryNode {
    const children = all
      .filter(c => c.parentCategoryId === cat.id && c.isActive && this.treeHasProducts(c.id, all))
      .map(ch => this.buildNode(ch, all))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return { ...cat, children, expanded: false };
  }

  private treeHasProducts(id: string, all: Category[]): boolean {
    const cat = all.find(c => c.id === id);
    if (!cat) return false;
    if ((cat.productCount ?? 0) > 0) return true;
    return all.filter(c => c.parentCategoryId === id).some(ch => this.treeHasProducts(ch.id, all));
  }

  get minPct(): number { return ((this.sliderMin - this.PRICE_MIN) / (this.PRICE_MAX - this.PRICE_MIN)) * 100; }
  get maxPct(): number { return ((this.sliderMax - this.PRICE_MIN) / (this.PRICE_MAX - this.PRICE_MIN)) * 100; }

  get hasCollectionFilter(): boolean {
    return !!(this.filter.isBestSeller || this.filter.isNewArrival || this.filter.isSpecialOffer || this.filter.isFeatured);
  }

  get hasAnyFilter(): boolean {
    return !!(this.filter.search || this.filter.categoryId || this.filter.minPrice ||
              this.filter.maxPrice || this.filter.inStock || this.hasCollectionFilter ||
              this.filter.prescriptionRequired != null);
  }

  get rangeStart(): number { return (this.currentPage - 1) * this.pageSize + 1; }
  get rangeEnd(): number { return Math.min(this.currentPage * this.pageSize, this.pagedResult?.totalCount ?? 0); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.openPanel && !this.elRef.nativeElement.querySelector('.pl-filter-bar')?.contains(e.target)) {
      this.openPanel = null;
    }
  }

  ngOnInit(): void {
    this.productService.getCategories().subscribe(res => { if (res.data) this.allCategories.set(res.data); });
    this.route.queryParams.subscribe(params => {
      this.filter = {
        search:         params['search'],
        categoryId:     params['categoryId'],
        isFeatured:     params['isFeatured']    === 'true' ? true : undefined,
        isNewArrival:   params['isNewArrival']  === 'true' ? true : undefined,
        isBestSeller:   params['isBestSeller']  === 'true' ? true : undefined,
        isSpecialOffer: params['isSpecialOffer'] === 'true' ? true : undefined,
      };
      this.searchQuery = this.filter.search ?? '';
      this.currentPage = 1;
      this.reload();
    });
  }

  ngOnDestroy(): void {}

  reload(): void {
    this.loading = true;
    const [sortBy, sortDirection] = this.sortValue.split('_') as [string, 'asc'|'desc'];
    this.productService.getAll({ ...this.filter, page: this.currentPage, pageSize: this.pageSize, sortBy, sortDirection }).subscribe({
      next: res => { if (res.data) { this.pagedResult = res.data; this.products.set(res.data.items); } this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  togglePanel(name: string): void { this.openPanel = this.openPanel === name ? null : name; }

  applySearch(): void { this.filter.search = this.searchQuery || undefined; this.currentPage = 1; this.reload(); }
  onSortChange(): void { this.currentPage = 1; this.reload(); }
  onCategoryFilter(id: string | undefined): void { this.filter.categoryId = id; this.currentPage = 1; this.reload(); }

  toggleBool(key: 'inStock' | 'isBestSeller' | 'isNewArrival' | 'isSpecialOffer' | 'isFeatured'): void {
    (this.filter as any)[key] = (this.filter as any)[key] ? undefined : true;
    this.currentPage = 1; this.reload();
  }

  setRx(val: boolean): void {
    this.filter.prescriptionRequired = this.filter.prescriptionRequired === val ? undefined : val;
    this.currentPage = 1; this.reload();
  }

  onSliderMin(): void {
    if (this.sliderMin > this.sliderMax - this.stepSize) this.sliderMin = this.sliderMax - this.stepSize;
  }
  onSliderMax(): void {
    if (this.sliderMax < this.sliderMin + this.stepSize) this.sliderMax = this.sliderMin + this.stepSize;
  }

  applyPrice(): void {
    this.filter.minPrice = this.sliderMin > this.PRICE_MIN ? this.sliderMin : undefined;
    this.filter.maxPrice = this.sliderMax < this.PRICE_MAX ? this.sliderMax : undefined;
    this.currentPage = 1; this.openPanel = null; this.reload();
  }

  clearPrice(): void {
    this.sliderMin = this.PRICE_MIN; this.sliderMax = this.PRICE_MAX;
    this.filter.minPrice = undefined; this.filter.maxPrice = undefined;
  }

  clearFilters(): void {
    this.filter = {}; this.searchQuery = ''; this.currentPage = 1;
    this.sortValue = 'createdAt_desc'; this.sliderMin = this.PRICE_MIN; this.sliderMax = this.PRICE_MAX;
    this.reload();
  }

  goToPage(page: number): void { this.currentPage = page; this.reload(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  totalPages(): number { return this.pagedResult ? Math.ceil(this.pagedResult.totalCount / this.pageSize) : 1; }
  pageNumbers(): number[] {
    const total = this.totalPages(), cur = this.currentPage;
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i);
    return pages;
  }
  categoryNameFor(id: string): string { return this.allCategories().find(c => c.id === id)?.name ?? 'Category'; }
}
