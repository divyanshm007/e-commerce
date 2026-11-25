import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductList } from '../../../core/models/product.models';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor, CurrencyPipe, DecimalPipe, MatIconModule, MediaUrlPipe],
  template: `
<div class="pc-card" [routerLink]="['/products', product.slug]">

  <!-- ── Image ── -->
  <div class="pc-img-wrap">
    <img class="pc-img"
      [src]="(product.primaryImageUrl || 'assets/images/no-image.png') | mediaUrl"
      [alt]="product.name" loading="lazy" />

    <!-- Subtle gradient scrim at bottom for badge legibility -->
    <div class="pc-img-scrim"></div>

    <!-- Status badge: Bestseller > New > Popular — only one, only meaningful -->
    <span *ngIf="product.isBestSeller" class="pc-badge pc-badge-best">Bestseller</span>
    <span *ngIf="!product.isBestSeller && product.isNewArrival" class="pc-badge pc-badge-new">New</span>
    <span *ngIf="!product.isBestSeller && !product.isNewArrival && product.isFeatured" class="pc-badge pc-badge-pick">Popular</span>

    <!-- Discount badge — only when there's a real discount -->
    <span *ngIf="discountPercent > 0" class="pc-badge-discount">{{ discountPercent }}% OFF</span>

    <!-- Prescription Required badge — bottom-right -->
    <span *ngIf="product.prescriptionRequired" class="pc-rx-overlay">Rx Required</span>

    <!-- Action buttons (top-right) -->
    <div class="pc-actions">
      <button class="pc-act-btn" (click)="onWishlist($event)"
        [class.pc-act-active]="isWishlisted" [attr.aria-label]="isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'">
        <mat-icon>{{ isWishlisted ? 'favorite' : 'favorite_border' }}</mat-icon>
      </button>
      <button class="pc-act-btn" (click)="onCompare($event)" aria-label="Add to compare">
        <mat-icon>compare_arrows</mat-icon>
      </button>
    </div>

    <!-- Out of stock -->
    <div class="pc-oos" *ngIf="product.stockQuantity === 0">
      <span>Out of Stock</span>
    </div>
  </div>

  <!-- ── Info ── -->
  <div class="pc-info">

    <!-- Category label — always reserves space for layout consistency -->
    <p class="pc-category">{{ product.categoryName || '' }}</p>

    <!-- Product name — max 2 lines -->
    <h3 class="pc-name">{{ product.name }}</h3>

    <!-- Rating — always shown; defaults to 5 stars when no reviews -->
    <div class="pc-rating">
      <div class="pc-stars">
        <span *ngFor="let s of starRange" class="pc-star"
          [class.pc-star-on]="s <= displayRating">★</span>
      </div>
      <ng-container *ngIf="product.reviewCount > 0">
        <span class="pc-rating-num">{{ product.averageRating | number:'1.1-1' }}</span>
        <span class="pc-rating-ct">({{ product.reviewCount }})</span>
      </ng-container>
      <ng-container *ngIf="product.reviewCount === 0">
        <span class="pc-rating-new">New</span>
      </ng-container>
    </div>
    <!-- Price row -->
    <div class="pc-price-row">
      <span class="pc-price">{{ sellingPrice | currency:'INR':'symbol':'1.0-0' }}</span>
      <span class="pc-original" *ngIf="discountPercent > 0">{{ product.price | currency:'INR':'symbol':'1.0-0' }}</span>
    </div>

    <!-- Add to cart / Prescription -->
    <button class="pc-cart-btn" [class.pc-cart-btn-rx]="product.prescriptionRequired"
      (click)="product.prescriptionRequired ? null : onAddToCart($event)"
      [disabled]="!product.prescriptionRequired && (product.stockQuantity === 0 || adding)">
      <mat-icon class="pc-cart-icon">{{ product.prescriptionRequired ? 'medication' : (product.stockQuantity === 0 ? 'remove_shopping_cart' : 'add_shopping_cart') }}</mat-icon>
      <span>{{ product.prescriptionRequired ? 'Prescription Required' : (product.stockQuantity === 0 ? 'Out of Stock' : (adding ? 'Adding…' : 'Add to Cart')) }}</span>
      <span class="pc-cart-arrow" *ngIf="!product.prescriptionRequired && product.stockQuantity > 0 && !adding">→</span>
    </button>
  </div>
</div>
  `,
  styles: [`
:host { display:block; height:100%; }

/* ── Card shell ── */
.pc-card {
  display:flex; flex-direction:column; height:100%;
  background:#FFFDF7;
  border-radius:12px; overflow:hidden;
  cursor:pointer;
  border:1px solid #EDE7D5;
  box-shadow:0 1px 3px rgba(18,55,42,.05), 0 2px 10px rgba(18,55,42,.04);
  transition:transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s cubic-bezier(.22,1,.36,1), border-color .28s ease;
}
.pc-card:hover {
  transform:translateY(-3px);
  border-color:#D8D0BC;
  box-shadow:0 6px 22px rgba(18,55,42,.10), 0 2px 6px rgba(18,55,42,.06);
}

/* ── Image area ── */
.pc-img-wrap {
  position:relative; overflow:hidden;
  aspect-ratio:4/3;
  background:linear-gradient(148deg, #F5F1E7 0%, #EDE8DC 55%, #F0EBE0 100%);
  flex-shrink:0;
}
.pc-img {
  width:100%; height:100%;
  object-fit:cover;
  display:block;
  transition:transform .5s cubic-bezier(.22,1,.36,1);
}
.pc-card:hover .pc-img { transform:scale(1.025); }

/* Subtle bottom scrim for badge legibility */
.pc-img-scrim {
  position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(to top, rgba(12,30,22,.18) 0%, transparent 38%);
}

/* ── Status badge (top-left) ── */
.pc-badge {
  position:absolute; top:10px; left:10px;
  font-size:9px; font-weight:700;
  text-transform:uppercase; letter-spacing:.07em;
  padding:3px 9px; border-radius:100px;
  line-height:1.5; z-index:2;
}
.pc-badge-best {
  background:rgba(255,253,247,.88); color:#7A5C1E;
  border:1px solid rgba(181,154,90,.4);
  backdrop-filter:blur(4px);
}
.pc-badge-new {
  background:rgba(255,253,247,.88); color:#064E3B;
  border:1px solid rgba(6,78,59,.3);
  backdrop-filter:blur(4px);
}
.pc-badge-pick {
  background:rgba(255,253,247,.88); color:#12372A;
  border:1px solid rgba(18,55,42,.25);
  backdrop-filter:blur(4px);
}

/* ── Discount badge (bottom-left) ── */
.pc-badge-discount {
  position:absolute; bottom:10px; left:10px;
  font-size:9px; font-weight:800;
  text-transform:uppercase; letter-spacing:.06em;
  padding:3px 8px; border-radius:100px; z-index:2;
  background:rgba(6,78,59,.88); color:#fff;
  backdrop-filter:blur(4px);
}

/* ── Rx Required badge (bottom-right) ── */
.pc-rx-overlay {
  position:absolute; bottom:10px; right:10px;
  font-size:9px; font-weight:800;
  text-transform:uppercase; letter-spacing:.06em;
  padding:3px 8px; border-radius:100px; z-index:2;
  background:rgba(139,28,0,.82); color:#fff;
  backdrop-filter:blur(4px);
}

/* ── Action buttons (wishlist + compare) ── */
.pc-actions {
  position:absolute; top:10px; right:10px;
  display:flex; flex-direction:column; gap:5px;
  opacity:0; transform:translateX(4px);
  transition:opacity .2s ease, transform .2s ease;
}
.pc-card:hover .pc-actions { opacity:1; transform:translateX(0); }

.pc-act-btn {
  width:32px; height:32px; border-radius:50%;
  background:rgba(255,255,255,.92);
  border:1px solid rgba(234,228,214,.9);
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 2px 8px rgba(0,0,0,.10);
  transition:transform .15s ease, border-color .15s, background .15s;
  backdrop-filter:blur(4px);
}
.pc-act-btn mat-icon { font-size:16px; width:16px; height:16px; color:#888; transition:color .15s; }
.pc-act-btn:hover { transform:scale(1.1); }
.pc-act-btn:hover mat-icon { color:#064E3B; }

/* Wishlist active state */
.pc-act-active { border-color:rgba(239,68,68,.35) !important; }
.pc-act-active mat-icon { color:#ef4444 !important; }

/* ── OOS overlay ── */
.pc-oos {
  position:absolute; inset:0;
  background:rgba(255,253,247,.78); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center;
  span {
    background:rgba(18,55,42,.82); color:#fff;
    font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
    padding:5px 14px; border-radius:100px;
  }
}

/* ── Info ── */
.pc-info {
  display:flex; flex-direction:column; flex:1;
  padding:12px 14px 14px;
  border-top:1px solid #EDE8DC;
}

/* Always rendered — reserves line height even when categoryName is empty */
.pc-category {
  font-size:9px; font-weight:700;
  text-transform:uppercase; letter-spacing:.1em;
  color:#176B52; margin:0 0 4px;
  min-height:13px; line-height:13px;
}

.pc-name {
  font-family:'Cormorant Garamond', Georgia, serif;
  font-size:16.5px; font-weight:600; color:#0C2416;
  margin:0 0 5px; line-height:1.28; letter-spacing:-.01em;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

/* ── Rating — only rendered when reviewCount > 0 ── */
.pc-rating { display:flex; align-items:center; gap:3px; margin-bottom:2px; }
.pc-stars { display:flex; gap:1px; }
.pc-star { font-size:11px; color:#DDD7CC; }
.pc-star-on { color:#B59A5A; }
.pc-rating-num  { font-size:11px; font-weight:600; color:#0C2416; margin-left:2px; }
.pc-rating-ct   { font-size:11px; color:#A89E8C; }
.pc-rating-new  { font-size:10px; font-weight:600; color:#176B52; margin-left:3px; letter-spacing:.04em; }

/* ── Price — auto top-margin keeps it flush to card bottom ── */
.pc-price-row {
  display:flex; align-items:baseline; gap:7px; flex-wrap:wrap;
  margin-top:auto; padding-top:7px;
}
.pc-price {
  font-size:17px; font-weight:700;
  color:#0C2416; letter-spacing:-.3px; line-height:1;
}
.pc-original {
  font-size:12px; color:#B8AFA0;
  text-decoration:line-through;
}

/* ── Cart button — transparent → forest-green fill on hover ── */
.pc-cart-btn-rx {
  border-color:#8B1C00 !important; color:#8B1C00 !important;
  background:rgba(139,28,0,.04) !important;
}
.pc-cart-btn-rx:hover {
  background:#8B1C00 !important; color:#fff !important;
  box-shadow:0 4px 14px rgba(139,28,0,.2) !important;
}

.pc-cart-btn {
  display:flex; align-items:center; justify-content:center; gap:6px;
  width:100%; height:36px; margin-top:10px; padding:0 14px;
  border:1.5px solid #064E3B; border-radius:6px; cursor:pointer;
  background:transparent; color:#064E3B;
  font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  transition:background .2s ease, color .2s ease, box-shadow .2s ease;
}
.pc-cart-icon { font-size:14px; width:14px; height:14px; line-height:14px; flex-shrink:0; }
.pc-cart-btn:hover:not(:disabled) {
  background:#064E3B; color:#fff;
  box-shadow:0 4px 14px rgba(6,78,59,.20);
}
.pc-cart-btn:active:not(:disabled) { box-shadow:none; }
.pc-cart-btn:disabled {
  opacity:.35; cursor:not-allowed;
  border-color:#C4BAA8; color:#C4BAA8;
}
.pc-cart-arrow { margin-left:auto; font-size:12px; opacity:.6; }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductList;
  @Output() wishlistToggle = new EventEmitter<string>();
  @Output() quickView = new EventEmitter<ProductList>();

  private cartService    = inject(CartService);
  private productService = inject(ProductService);
  private wishlistService = inject(WishlistService);
  private snackBar = inject(MatSnackBar);

  adding = false;
  starRange = [1, 2, 3, 4, 5];

  get isWishlisted(): boolean { return this.wishlistService.isWishlisted(this.product.id); }

  get displayRating(): number {
    return this.product.reviewCount > 0 ? this.product.averageRating : 5;
  }

  get sellingPrice(): number {
    return this.product.discountPrice ?? this.product.price;
  }

  get discountPercent(): number {
    if (this.product.discountPrice && this.product.price > this.product.discountPrice)
      return Math.round(((this.product.price - this.product.discountPrice) / this.product.price) * 100);
    return 0;
  }

  onAddToCart(e: Event): void {
    e.stopPropagation();
    this.adding = true;
    this.cartService.addItem({ productId: this.product.id, quantity: 1 }).subscribe({
      next: () => { this.adding = false; },
      error: () => { this.adding = false; }
    });
  }

  onWishlist(e: Event): void {
    e.stopPropagation();
    this.wishlistService.toggle(this.product.id);
    this.wishlistToggle.emit(this.product.id);
  }

  onQuickView(e: Event): void {
    e.stopPropagation();
    this.quickView.emit(this.product);
  }

  onCompare(e: Event): void {
    e.stopPropagation();
    const added = this.productService.addToCompare(this.product);
    this.snackBar.open(
      added ? `${this.product.name} added to compare` : 'You can compare up to 3 products',
      added ? 'Compare' : 'OK',
      { duration: 3000, panelClass: added ? 'snack-success' : '' }
    ).onAction().subscribe(() => { if (added) window.location.href = '/compare'; });
  }
}
