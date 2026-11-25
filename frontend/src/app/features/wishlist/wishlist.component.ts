import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ProductList } from '../../core/models/product.models';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [
    RouterLink, NgFor, NgIf, CurrencyPipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    ProductCardComponent, BreadcrumbComponent, PageHeroComponent
  ],
  template: `
    <app-page-hero
      title="My Wishlist"
      subtitle="Your saved Ayurvedic products — add them to cart whenever you're ready."
      icon="favorite"
      image="/uploads/heroes/hero-wishlist.jpg">
    </app-page-hero>

    <div class="container" style="padding: 24px 16px 80px">
      <div class="section-header">
        <h2>My Wishlist ({{ items().length }} items)</h2>
        <button mat-button color="warn" (click)="clearAll()" *ngIf="items().length">
          <mat-icon>delete_sweep</mat-icon> Clear All
        </button>
      </div>

      <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

      <div class="product-grid" *ngIf="!loading && items().length">
        <app-product-card
          *ngFor="let p of items()"
          [product]="p"
          (wishlistToggle)="removeItem($event)" />
      </div>

      <div class="empty-state" *ngIf="!loading && !items().length">
        <mat-icon>favorite_border</mat-icon>
        <h3>Your wishlist is empty</h3>
        <p>Save products you love to your wishlist and shop them later.</p>
        <a mat-flat-button color="primary" routerLink="/products">Explore Products</a>
      </div>
    </div>
  `,
  styles: []
})
export class WishlistComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  items = signal<ProductList[]>([]);
  loading = true;

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.api.get<ProductList[]>('customers/wishlist').subscribe({
      next: (res) => { if (res.data) this.items.set(res.data); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  removeItem(productId: string): void {
    // WishlistService already called the API; just sync the local list
    this.items.update(list => list.filter(p => p.id !== productId));
  }

  clearAll(): void {
    this.api.delete('customers/wishlist').subscribe(() => {
      this.items.set([]);
      this.snackBar.open('Wishlist cleared', undefined, { duration: 2000 });
    });
  }
}
