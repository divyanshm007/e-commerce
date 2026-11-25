import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ProductDetail } from '../../core/models/product.models';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { RatingComponent } from '../../shared/components/rating/rating.component';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, CurrencyPipe, MatButtonModule, MatIconModule, BreadcrumbComponent, RatingComponent, MediaUrlPipe, PageHeroComponent],
  template: `
    <app-page-hero
      title="Compare Products"
      subtitle="Side-by-side comparison to help you choose the right Ayurvedic remedy."
      icon="compare"
      image="/uploads/heroes/hero-compare.jpg">
    </app-page-hero>

    <div class="container compare-page">
      <div class="page-header">
        <h1>Compare Products</h1>
        <button mat-stroked-button color="warn" (click)="clearAll()" *ngIf="products().length">
          <mat-icon>delete</mat-icon> Clear All
        </button>
      </div>

      <!-- Empty state -->
      <div class="empty-compare" *ngIf="!products().length">
        <mat-icon>compare_arrows</mat-icon>
        <h3>No products to compare</h3>
        <p>Add up to 3 products to compare them side by side</p>
        <a mat-flat-button color="primary" routerLink="/products">Browse Products</a>
      </div>

      <!-- Compare Table -->
      <div class="compare-table-wrap" *ngIf="products().length">
        <table class="compare-table">
          <!-- Product Images & Names -->
          <tr class="product-row">
            <th class="attr-col">Product</th>
            <td *ngFor="let p of products()" class="product-col">
              <div class="product-header">
                <img [src]="(p.primaryImageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="p.name" />
                <a [routerLink]="['/products', p.slug]" class="p-name">{{ p.name }}</a>
                <span class="p-cat">{{ p.categoryName }}</span>
              </div>
            </td>
            <td *ngIf="products().length < 3" class="add-col">
              <a routerLink="/products" class="add-more-btn">
                <mat-icon>add_circle</mat-icon>
                <span>Add Product</span>
              </a>
            </td>
          </tr>

          <tr>
            <th>Price</th>
            <td *ngFor="let p of products()">
              <div class="price-cell">
                <span class="price-main">{{ (p.discountPrice ?? p.price) | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="price-mrp" *ngIf="p.discountPrice">{{ p.price | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
            </td>
          </tr>

          <tr>
            <th>Rating</th>
            <td *ngFor="let p of products()">
              <app-rating [value]="p.averageRating" [count]="p.reviewCount" [showCount]="true" />
            </td>
          </tr>

          <tr>
            <th>Category</th>
            <td *ngFor="let p of products()">{{ p.categoryName || '—' }}</td>
          </tr>

          <tr>
            <th>Stock</th>
            <td *ngFor="let p of products()">
              <span [class]="p.stockQuantity > 0 ? 'in-stock' : 'out-stock'">
                {{ p.stockQuantity > 0 ? 'In Stock' : 'Out of Stock' }}
              </span>
            </td>
          </tr>

          <tr *ngFor="let attr of detailAttrs">
            <th>{{ attr.label }}</th>
            <td *ngFor="let p of detailProducts()">
              <span *ngIf="p && getAttr(p, attr.key)">{{ getAttr(p, attr.key) }}</span>
              <span *ngIf="!p || !getAttr(p, attr.key)" class="no-data">—</span>
            </td>
          </tr>

          <tr class="action-row">
            <th>Actions</th>
            <td *ngFor="let p of products()">
              <div class="action-btns">
                <button class="cmp-cart-btn"
                  [disabled]="p.stockQuantity === 0 || adding[p.id]"
                  (click)="onAddToCart(p.id)">
                  <mat-icon>{{ adding[p.id] ? 'hourglass_empty' : 'add_shopping_cart' }}</mat-icon>
                  {{ p.stockQuantity === 0 ? 'Out of Stock' : (adding[p.id] ? 'Adding…' : 'Add to Cart') }}
                </button>
                <div class="cmp-secondary-btns">
                  <button class="cmp-icon-btn" [class.cmp-wish-active]="wishlist.isWishlisted(p.id)"
                    (click)="onWishlist(p.id)" [attr.aria-label]="wishlist.isWishlisted(p.id) ? 'Remove from wishlist' : 'Add to wishlist'">
                    <mat-icon>{{ wishlist.isWishlisted(p.id) ? 'favorite' : 'favorite_border' }}</mat-icon>
                  </button>
                  <a class="cmp-icon-btn" [routerLink]="['/products', p.slug]" aria-label="View product">
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                  <button class="cmp-icon-btn cmp-remove-btn" (click)="removeProduct(p.id)" aria-label="Remove from compare">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .compare-page { padding: 24px 16px 80px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px;
      h1 { font-size: 26px; font-weight: 700; margin: 0; }
    }

    .empty-compare {
      text-align: center; padding: 80px 20px;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      mat-icon { font-size: 72px; width: 72px; height: 72px; color: var(--border); }
      h3 { font-size: 22px; font-weight: 700; margin: 0; }
      p { color: var(--text-secondary); margin: 0; }
    }

    .compare-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }

    .compare-table {
      width: 100%; border-collapse: collapse; min-width: 560px;
      th, td {
        padding: 14px 18px; border-bottom: 1px solid var(--border);
        border-right: 1px solid var(--border); font-size: 14px; vertical-align: middle;
        &:last-child { border-right: none; }
      }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      th { background: var(--bg); font-weight: 600; text-align: left; white-space: nowrap; width: 130px; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
      td { text-align: center; background: #fff; }
    }

    .product-header {
      display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0;
      img { width: 110px; height: 110px; object-fit: contain; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); }
      .p-name { font-size: 14px; font-weight: 700; color: var(--text-primary); line-height: 1.35; }
      .p-cat { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--primary); }
    }

    .price-cell {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      .price-main { font-size: 20px; font-weight: 800; color: var(--primary); }
      .price-mrp { font-size: 12px; color: var(--text-muted); text-decoration: line-through; }
    }

    .in-stock  { color: #16a34a; font-weight: 600; font-size: 13px; }
    .out-stock { color: #dc2626; font-weight: 600; font-size: 13px; }
    .no-data   { color: var(--text-muted); }

    .add-col { min-width: 160px; background: #fafafa !important; }
    .add-more-btn {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 16px; color: var(--primary); cursor: pointer; text-decoration: none;
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      span { font-size: 13px; font-weight: 600; }
      &:hover { background: var(--primary-light); border-radius: 8px; }
    }

    /* Action row */
    .action-row td { padding: 16px 18px; }
    .action-btns { display: flex; flex-direction: column; align-items: center; gap: 10px; }

    .cmp-cart-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; max-width: 200px; height: 40px; padding: 0 16px;
      background: var(--primary); color: #fff; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: .03em;
      transition: background .2s, transform .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover:not(:disabled) { background: #053d2f; transform: translateY(-1px); }
      &:disabled { opacity: .45; cursor: not-allowed; }
    }

    .cmp-secondary-btns { display: flex; align-items: center; gap: 8px; }

    .cmp-icon-btn {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1.5px solid var(--border); background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s; text-decoration: none;
      mat-icon { font-size: 17px; width: 17px; height: 17px; color: var(--text-muted); }
      &:hover { border-color: var(--primary); }
      &:hover mat-icon { color: var(--primary); }
    }
    .cmp-wish-active { border-color: rgba(239,68,68,.4) !important; }
    .cmp-wish-active mat-icon { color: #ef4444 !important; }
    .cmp-remove-btn:hover { border-color: #dc2626 !important; }
    .cmp-remove-btn:hover mat-icon { color: #dc2626 !important; }
  `]
})
export class CompareComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService    = inject(CartService);
  readonly wishlist      = inject(WishlistService);

  products       = signal(this.productService.getCompareList());
  detailProducts = signal<(ProductDetail | null)[]>([]);
  adding: Record<string, boolean> = {};

  detailAttrs = [
    { label: 'Ingredients', key: 'ingredients' },
    { label: 'Benefits',    key: 'benefits' },
    { label: 'How to Use',  key: 'howToUse' },
    { label: 'Dosage',      key: 'dosageInstructions' },
    { label: 'Certifications', key: 'certifications' },
    { label: 'Form',        key: 'dosageForm' },
    { label: 'Manufacturer', key: 'manufacturer' },
  ];

  ngOnInit(): void {
    this.loadDetails();
  }

  loadDetails(): void {
    const list = this.products();
    const details: (ProductDetail | null)[] = Array(list.length).fill(null);
    list.forEach((p, i) => {
      this.productService.getById(p.id).subscribe(res => {
        if (res.data) details[i] = res.data;
        this.detailProducts.set([...details]);
      });
    });
  }

  getAttr(p: ProductDetail, key: string): string | undefined {
    return (p as any)[key];
  }

  onAddToCart(productId: string): void {
    if (this.adding[productId]) return;
    this.adding[productId] = true;
    this.cartService.addItem({ productId, quantity: 1 }).subscribe({
      next: () => { this.adding[productId] = false; },
      error: () => { this.adding[productId] = false; }
    });
  }

  onWishlist(productId: string): void {
    this.wishlist.toggle(productId);
  }

  removeProduct(id: string): void {
    this.productService.removeFromCompare(id);
    this.products.set(this.productService.getCompareList());
    this.loadDetails();
  }

  clearAll(): void {
    this.productService.clearCompare();
    this.products.set([]);
    this.detailProducts.set([]);
  }
}
