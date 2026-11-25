import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { Category, ProductFilter, ProductList } from '../../../core/models/product.models';
import { PagedResult } from '../../../core/models/api.models';

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, CurrencyPipe, FormsModule, MatIconModule, MatProgressSpinnerModule, ProductCardComponent, MediaUrlPipe],
  template: `
<!-- ── BREADCRUMB ── -->
<div class="cp-breadcrumb-bar">
  <div class="container">
    <nav class="cp-breadcrumb">
      <a routerLink="/">Home</a>
      <span class="cp-bc-sep">›</span>
      <a routerLink="/products">Shop</a>
      <ng-container *ngFor="let anc of ancestors()">
        <span class="cp-bc-sep">›</span>
        <a [routerLink]="['/products/category', anc.slug]">{{ anc.name }}</a>
      </ng-container>
      <span class="cp-bc-sep">›</span>
      <span class="cp-bc-current">{{ category()?.name }}</span>
    </nav>
  </div>
</div>

<!-- ── CATEGORY HERO ── -->
<div class="cp-hero" *ngIf="category()">
  <div class="cp-hero-bg" *ngIf="category()?.imageUrl"
    [style.background-image]="'url(' + (category()!.imageUrl | mediaUrl) + ')'"></div>
  <div class="cp-hero-overlay"></div>
  <div class="container cp-hero-inner">
    <p class="cp-hero-eyebrow">{{ category()?.parentCategoryName || 'Ayurvedic Collection' }}</p>
    <h1 class="cp-hero-title">{{ category()?.name }}</h1>
    <p class="cp-hero-desc" *ngIf="category()?.description">{{ category()?.description }}</p>
    <p class="cp-hero-count">
      <span class="cp-count-pill">{{ totalProductCount() }} {{ totalProductCount() === 1 ? 'Product' : 'Products' }}</span>
    </p>
  </div>
</div>

<!-- ── CHILD CATEGORIES ── -->
<div class="cp-children-bar" *ngIf="shoppableChildren().length">
  <div class="container">
    <p class="cp-children-label">Explore Within {{ category()?.name }}</p>
    <div class="cp-children-row">
      <a class="cp-child-chip"
        *ngFor="let ch of shoppableChildren()"
        [routerLink]="['/products/category', ch.slug]">
        {{ ch.name }}
        <span class="cp-child-count">{{ getChildCount(ch.id) }}</span>
      </a>
    </div>
  </div>
</div>

<!-- ── MAIN AREA ── -->
<div class="container cp-main">

  <!-- Toolbar -->
  <div class="cp-toolbar">
    <p class="cp-result-count" *ngIf="pagedResult">
      Showing <strong>{{ (currentPage - 1) * pageSize + 1 }}–{{ (currentPage - 1) * pageSize + products().length }}</strong>
      of <strong>{{ pagedResult.totalCount }}</strong> products
    </p>
    <div class="cp-toolbar-right">
      <!-- Search -->
      <div class="cp-search-wrap">
        <mat-icon class="cp-search-icon">search</mat-icon>
        <input class="cp-search-input" type="text" [(ngModel)]="searchQuery"
          placeholder="Search in {{ category()?.name }}…"
          (keyup.enter)="applySearch()" />
        <button class="cp-search-clear" *ngIf="searchQuery" (click)="searchQuery=''; applySearch()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <!-- Sort -->
      <select class="cp-sort-select" [(ngModel)]="sortValue" (ngModelChange)="onSortChange()">
        <option value="createdAt_desc">Newest First</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="rating_desc">Top Rated</option>
        <option value="popular_desc">Best Selling</option>
      </select>
    </div>
  </div>

  <!-- Filter chips -->
  <div class="cp-filter-chips" *ngIf="hasActiveFilters">
    <span class="cp-chip" *ngIf="filter.search">
      "{{ filter.search }}" <button (click)="filter.search=undefined; loadProducts()"><mat-icon>close</mat-icon></button>
    </span>
    <span class="cp-chip" *ngIf="filter.inStock">
      In Stock <button (click)="filter.inStock=undefined; loadProducts()"><mat-icon>close</mat-icon></button>
    </span>
    <span class="cp-chip" *ngIf="filter.isBestSeller">
      Best Sellers <button (click)="filter.isBestSeller=undefined; loadProducts()"><mat-icon>close</mat-icon></button>
    </span>
    <span class="cp-chip" *ngIf="filter.isNewArrival">
      New Arrivals <button (click)="filter.isNewArrival=undefined; loadProducts()"><mat-icon>close</mat-icon></button>
    </span>
    <button class="cp-chip-clear" (click)="clearFilters()">Clear All</button>
  </div>

  <!-- Loading -->
  <div class="cp-loading" *ngIf="loading">
    <mat-spinner diameter="44"></mat-spinner>
  </div>

  <!-- Products grid -->
  <div class="cp-product-grid" *ngIf="!loading && products().length">
    <app-product-card *ngFor="let p of products()" [product]="p" />
  </div>

  <!-- Empty -->
  <div class="cp-empty" *ngIf="!loading && !products().length && !catLoading">
    <mat-icon>inventory_2</mat-icon>
    <h3>No products found</h3>
    <p>Try adjusting your filters, or explore our other collections.</p>
    <div class="cp-empty-actions">
      <button class="cp-empty-btn" (click)="clearFilters()">Clear Filters</button>
      <a class="cp-empty-btn cp-empty-btn-outline" routerLink="/products">Browse All Products</a>
    </div>
  </div>

  <!-- Pagination -->
  <div class="cp-pagination" *ngIf="pagedResult && pagedResult.totalCount > pageSize">
    <button class="cp-page-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
      <mat-icon>chevron_left</mat-icon>
    </button>
    <button class="cp-page-btn cp-page-num"
      *ngFor="let p of pageNumbers()"
      [class.cp-page-active]="p === currentPage"
      (click)="goToPage(p)">{{ p }}</button>
    <button class="cp-page-btn" [disabled]="currentPage === totalPages()" (click)="goToPage(currentPage + 1)">
      <mat-icon>chevron_right</mat-icon>
    </button>
  </div>

</div>
  `,
  styles: [`
:host { display:block; background:var(--bg); min-height:100vh; }

/* ── Breadcrumb ── */
.cp-breadcrumb-bar {
  background:#fff;
  border-bottom:1px solid var(--border);
  padding:12px 0;
}
.cp-breadcrumb {
  display:flex; align-items:center; flex-wrap:wrap; gap:4px;
  font-size:13px; color:var(--text-secondary);
  a { color:var(--text-secondary); transition:color .15s; }
  a:hover { color:var(--primary); }
}
.cp-bc-sep { color:var(--border); font-size:16px; }
.cp-bc-current { color:var(--primary); font-weight:600; }

/* ── Category Hero ── */
.cp-hero {
  position:relative; overflow:hidden;
  min-height:280px; display:flex; align-items:center;
}
.cp-hero-bg {
  position:absolute; inset:0;
  background-size:cover; background-position:center;
  transform:scale(1.04); transition:transform 6s ease;
}
.cp-hero:hover .cp-hero-bg { transform:scale(1); }
.cp-hero-overlay {
  position:absolute; inset:0;
  background:linear-gradient(105deg, rgba(5,30,18,.82) 0%, rgba(6,78,59,.72) 60%, rgba(10,50,35,.5) 100%);
}
/* When no image: solid gradient */
.cp-hero:not(:has(.cp-hero-bg)) {
  background:linear-gradient(135deg, #071F14 0%, #064E3B 55%, #0A5845 100%);
}
.cp-hero-inner { position:relative; z-index:2; padding:64px 16px; }
.cp-hero-eyebrow {
  font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:rgba(181,154,90,.9); margin:0 0 12px;
}
.cp-hero-title {
  font-family:'Cormorant Garamond', Georgia, serif;
  font-size:52px; font-weight:500; color:#fff;
  margin:0 0 14px; line-height:1.06; letter-spacing:-.3px;
}
@media (max-width:640px) { .cp-hero-title { font-size:36px; } }
.cp-hero-desc {
  font-size:16px; color:rgba(255,255,255,.72); max-width:560px;
  margin:0 0 22px; line-height:1.65;
}
.cp-count-pill {
  display:inline-block;
  background:rgba(255,255,255,.12); backdrop-filter:blur(6px);
  border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.9); font-size:13px; font-weight:600;
  padding:5px 16px; border-radius:100px;
}

/* ── Child categories ── */
.cp-children-bar {
  background:#fff; border-bottom:1px solid var(--border);
  padding:18px 0;
}
.cp-children-label {
  font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--text-muted); margin:0 0 12px;
}
.cp-children-row { display:flex; flex-wrap:wrap; gap:8px; }
.cp-child-chip {
  display:inline-flex; align-items:center; gap:6px;
  padding:7px 16px; border-radius:100px;
  border:1.5px solid var(--border);
  background:var(--ivory); color:var(--primary);
  font-size:13px; font-weight:600; text-decoration:none;
  transition:all .2s;
}
.cp-child-chip:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
.cp-child-count {
  background:var(--primary-light); color:var(--primary);
  font-size:10px; font-weight:700; padding:2px 7px; border-radius:100px;
}
.cp-child-chip:hover .cp-child-count { background:rgba(255,255,255,.2); color:#fff; }

/* ── Main ── */
.cp-main { padding:28px 16px 72px; }

/* ── Toolbar ── */
.cp-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:12px; margin-bottom:20px;
}
.cp-result-count { font-size:14px; color:var(--text-secondary); margin:0; }
.cp-toolbar-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

.cp-search-wrap {
  display:flex; align-items:center; gap:0;
  border:1.5px solid var(--border); border-radius:8px;
  background:#fff; overflow:hidden; height:40px;
  transition:border-color .2s;
  &:focus-within { border-color:var(--primary); }
}
.cp-search-icon { font-size:18px !important; color:var(--text-muted); margin:0 8px 0 10px; flex-shrink:0; }
.cp-search-input {
  border:none; outline:none; background:transparent;
  font-size:13.5px; color:var(--text-primary); width:200px; padding:0 8px 0 0;
}
.cp-search-clear {
  border:none; background:transparent; cursor:pointer; padding:0 8px;
  display:flex; align-items:center;
  mat-icon { font-size:16px; width:16px; height:16px; color:var(--text-muted); }
}

.cp-sort-select {
  height:40px; padding:0 32px 0 12px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  font-size:13.5px; color:var(--text-primary); outline:none;
  appearance:none; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%238E9A94'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 8px center;
  background-size:18px;
  transition:border-color .2s;
  &:focus { border-color:var(--primary); }
}

/* ── Filter chips ── */
.cp-filter-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
.cp-chip {
  display:inline-flex; align-items:center; gap:4px;
  background:var(--primary-light); color:var(--primary);
  font-size:12.5px; font-weight:600; padding:4px 10px; border-radius:100px;
  button { border:none; background:none; cursor:pointer; display:flex; align-items:center; padding:0; }
  mat-icon { font-size:14px; width:14px; height:14px; }
}
.cp-chip-clear {
  border:none; background:transparent; color:var(--text-muted);
  font-size:12.5px; font-weight:600; cursor:pointer; text-decoration:underline;
}

/* ── Loading ── */
.cp-loading { display:flex; justify-content:center; padding:72px 0; }

/* ── Product grid ── */
.cp-product-grid {
  display:grid;
  grid-template-columns:repeat(4, 1fr);
  gap:24px;
}
@media (max-width:1100px) { .cp-product-grid { grid-template-columns:repeat(3,1fr); gap:20px; } }
@media (max-width:768px)  { .cp-product-grid { grid-template-columns:repeat(2,1fr); gap:14px; } }
@media (max-width:480px)  { .cp-product-grid { grid-template-columns:1fr; } }

/* ── Empty state ── */
.cp-empty {
  text-align:center; padding:80px 24px;
  mat-icon { font-size:52px; width:52px; height:52px; color:var(--border); }
  h3 { font-size:22px; font-weight:700; color:var(--text-primary); margin:16px 0 8px; }
  p { font-size:15px; color:var(--text-secondary); margin:0 0 28px; }
}
.cp-empty-actions { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; }
.cp-empty-btn {
  height:44px; padding:0 24px; border-radius:8px; border:none;
  background:var(--primary); color:#fff; font-size:14px; font-weight:600;
  cursor:pointer; text-decoration:none; display:inline-flex; align-items:center;
  transition:background .2s;
  &:hover { background:var(--primary-dark); }
}
.cp-empty-btn-outline {
  background:transparent; border:1.5px solid var(--border); color:var(--text-primary);
  &:hover { border-color:var(--primary); color:var(--primary); background:transparent; }
}

/* ── Pagination ── */
.cp-pagination { display:flex; justify-content:center; align-items:center; gap:6px; margin-top:48px; }
.cp-page-btn {
  min-width:40px; height:40px; border-radius:8px;
  border:1.5px solid var(--border); background:#fff;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:600; color:var(--text-primary);
  cursor:pointer; transition:all .2s;
  mat-icon { font-size:18px; width:18px; height:18px; }
  &:hover:not(:disabled) { border-color:var(--primary); color:var(--primary); }
  &:disabled { opacity:.35; cursor:not-allowed; }
  &.cp-page-num { padding:0 14px; }
}
.cp-page-active { background:var(--primary) !important; border-color:var(--primary) !important; color:#fff !important; }
  `]
})
export class CategoryPageComponent implements OnInit {
  private productService = inject(ProductService);
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);

  category     = signal<Category | null>(null);
  allCategories = signal<Category[]>([]);
  products     = signal<ProductList[]>([]);
  pagedResult: PagedResult<ProductList> | null = null;

  loading    = false;
  catLoading = true;
  currentPage = 1;
  pageSize    = 24;
  sortValue   = 'createdAt_desc';
  searchQuery = '';

  filter: ProductFilter = {};

  ancestors = computed(() => {
    const cat = this.category();
    const all = this.allCategories();
    if (!cat || !all.length) return [];
    const chain: Category[] = [];
    let current = all.find(c => c.id === cat.parentCategoryId);
    while (current) {
      chain.unshift(current);
      current = all.find(c => c.id === current!.parentCategoryId);
    }
    return chain;
  });

  shoppableChildren = computed(() => {
    const cat = this.category();
    const all = this.allCategories();
    if (!cat || !all.length) return [];
    const children = all.filter(c => c.parentCategoryId === cat.id && c.isActive);
    return children.filter(ch => this.treeHasProducts(ch.id, all));
  });

  totalProductCount = computed(() => {
    const cat = this.category();
    const all = this.allCategories();
    if (!cat || !all.length) return this.pagedResult?.totalCount ?? 0;
    return this.getTreeCount(cat.id, all);
  });

  get hasActiveFilters(): boolean {
    return !!(this.filter.search || this.filter.inStock || this.filter.isBestSeller || this.filter.isNewArrival);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['categorySlug'];
      this.catLoading = true;
      this.currentPage = 1;
      this.filter = {};
      this.searchQuery = '';
      this.loadCategory(slug);
      this.loadAllCategories();
    });
  }

  private loadCategory(slug: string): void {
    this.productService.getCategoryBySlug(slug).subscribe({
      next: res => {
        if (res.data) {
          this.category.set(res.data);
          this.catLoading = false;
          this.loadProducts();
        } else {
          this.router.navigate(['/products']);
        }
      },
      error: () => this.router.navigate(['/products'])
    });
  }

  private loadAllCategories(): void {
    this.productService.getCategories().subscribe(res => {
      if (res.data) this.allCategories.set(res.data);
    });
  }

  loadProducts(): void {
    const cat = this.category();
    if (!cat) return;
    this.loading = true;
    const [sortBy, sortDirection] = this.sortValue.split('_') as [string, 'asc'|'desc'];
    const params: ProductFilter = {
      ...this.filter,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy,
      sortDirection
    };
    this.productService.getCategoryProducts(cat.id, params).subscribe({
      next: res => {
        if (res.data) {
          this.pagedResult = res.data;
          this.products.set(res.data.items);
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applySearch(): void {
    this.filter.search = this.searchQuery || undefined;
    this.currentPage = 1;
    this.loadProducts();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadProducts();
  }

  clearFilters(): void {
    this.filter = {};
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadProducts();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  totalPages(): number {
    return this.pagedResult ? Math.ceil(this.pagedResult.totalCount / this.pageSize) : 1;
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage;
    const pages: number[] = [];
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getChildCount(categoryId: string): number {
    return this.getTreeCount(categoryId, this.allCategories());
  }

  private treeHasProducts(categoryId: string, all: Category[]): boolean {
    const cat = all.find(c => c.id === categoryId);
    if (!cat) return false;
    if ((cat.productCount ?? 0) > 0) return true;
    return all.filter(c => c.parentCategoryId === categoryId)
              .some(ch => this.treeHasProducts(ch.id, all));
  }

  private getTreeCount(categoryId: string, all: Category[]): number {
    const cat = all.find(c => c.id === categoryId);
    if (!cat) return 0;
    const direct = cat.productCount ?? 0;
    const children = all.filter(c => c.parentCategoryId === categoryId);
    const childTotal = children.reduce((sum, ch) => sum + this.getTreeCount(ch.id, all), 0);
    return direct + childTotal;
  }
}
