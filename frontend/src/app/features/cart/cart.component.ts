import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CartService } from '../../core/services/cart.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { Cart, CartItem, hasOffer, mrpLineTotal, offerPercent, cartMrpSavings } from '../../core/models/cart.models';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    MatDialogModule,
    RouterLink, NgFor, NgIf, CurrencyPipe,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    BreadcrumbComponent, MediaUrlPipe, PageHeroComponent
  ],

  template: `
    <app-page-hero
      title="Shopping Cart"
      subtitle="Review your selected Ayurvedic products before checkout."
      icon="shopping_cart"
      image="/uploads/heroes/hero-cart.jpg">
    </app-page-hero>

    <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

    <!-- Empty Cart -->
    <div class="empty-state" *ngIf="!loading && !cart?.items?.length">
      <mat-icon>shopping_cart</mat-icon>
      <h3>Your cart is empty</h3>
      <p>Looks like you haven't added anything to your cart yet.</p>
      <a mat-flat-button color="primary" routerLink="/products">Start Shopping</a>
    </div>

    <!-- Cart Content -->
    <div class="container cart-layout" *ngIf="!loading && cart?.items?.length">
      <!-- Items -->
      <div class="cart-items">
        <h2>Shopping Cart ({{ cart!.items.length }} items)</h2>

        <div class="cart-item" *ngFor="let item of cart!.items">
          <img [src]="(item.productImageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="item.productName" class="item-img" />
          <div class="item-info">
            <a [routerLink]="['/products', item.productSlug]" class="item-name">{{ item.productName }}</a>
            <p class="item-variant" *ngIf="item.variantInfo">{{ item.variantInfo }}</p>
            <p class="item-price" *ngIf="!hasOffer(item)">{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</p>
            <p class="item-price" *ngIf="hasOffer(item)">
              <span class="price-now">{{ item.discountPrice | currency:'INR':'symbol':'1.0-0' }}</span>
              <s class="price-mrp">{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</s>
              <span class="price-off">{{ offerPercent(item) }}% off</span>
            </p>
          </div>
          <div class="qty-control">
            <button mat-icon-button (click)="updateQty(item, item.quantity - 1)" [disabled]="item.quantity <= 1">
              <mat-icon>remove</mat-icon>
            </button>
            <span>{{ item.quantity }}</span>
            <button mat-icon-button (click)="updateQty(item, item.quantity + 1)">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          <p class="item-total">
            <s class="total-mrp" *ngIf="hasOffer(item)">{{ mrpLineTotal(item) | currency:'INR':'symbol':'1.0-0' }}</s>
            {{ item.lineTotal | currency:'INR':'symbol':'1.0-0' }}
          </p>
          <button mat-icon-button color="warn" (click)="removeItem(item)" class="item-delete">
            <mat-icon>delete</mat-icon>
          </button>
        </div>

        <div class="cart-actions">
          <a mat-button routerLink="/products"><mat-icon>arrow_back</mat-icon> Continue Shopping</a>
          <button mat-button color="warn" (click)="clearCart()">Clear Cart</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="cart-summary card">
        <div class="sum-rows" *ngIf="cart">
          <div class="sum-row" *ngIf="savings() > 0"><span>Total MRP</span><s>{{ (cart.totalAmount - cart.shippingCharge + cart.discountAmount + savings()) | currency:'INR':'symbol':'1.0-0' }}</s></div>
          <div class="sum-row sum-save" *ngIf="savings() > 0"><span>You save</span><span>-{{ savings() | currency:'INR':'symbol':'1.0-0' }}</span></div>
          <div class="sum-row sum-save" *ngIf="cart.discountAmount > 0"><span>Coupon{{ cart.appliedCouponCode ? ' (' + cart.appliedCouponCode + ')' : '' }}</span><span>-{{ cart.discountAmount | currency:'INR':'symbol':'1.0-0' }}</span></div>
          <div class="sum-row"><span>Shipping</span><span>{{ cart.shippingCharge === 0 ? 'FREE' : (cart.shippingCharge | currency:'INR':'symbol':'1.0-0') }}</span></div>
          <div class="sum-row sum-total"><span>Total</span><span>{{ cart.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span></div>
        </div>
        <a mat-flat-button color="primary" routerLink="/checkout" class="checkout-btn">
          Proceed to Checkout <mat-icon>arrow_forward</mat-icon>
        </a>
        <div class="payment-note">
          <mat-icon>lock</mat-icon> Secure checkout powered by Razorpay
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 32px;
      padding: 24px 16px 64px;
      align-items: start;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
      @media (max-width: 600px) { padding: 12px 12px 48px; gap: 20px; }
    }

    h2 { font-size: 22px; font-weight: 700; margin: 0 0 20px; }

    .cart-item {
      display: grid;
      grid-template-columns: 80px 1fr auto auto auto;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
      &:last-of-type { border: none; }
      @media (max-width: 600px) {
        grid-template-columns: 72px 1fr auto;
        grid-template-rows: auto auto;
        gap: 8px 10px;
      }
    }

    .item-img {
      width: 80px; height: 80px; object-fit: contain;
      border-radius: var(--radius-sm); background: #f5f5f5; padding: 4px;
      @media (max-width: 600px) { width: 72px; height: 72px; grid-row: 1 / 3; }
    }

    .price-now { font-weight: 700; color: var(--text-primary); margin-right: 6px; }
    .price-mrp, .total-mrp { color: var(--text-muted); font-size: 12px; font-weight: 400; margin-right: 6px; }
    .price-off { font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; border-radius: 100px; padding: 2px 8px; }
    .total-mrp { display: block; text-align: right; margin: 0; }
    .sum-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .sum-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-secondary); s { color: var(--text-muted); } }
    .sum-save { color: #047857; font-weight: 600; }
    .sum-total { font-size: 17px; font-weight: 700; color: var(--text-primary); border-top: 1px solid var(--border); padding-top: 10px; }
    .item-info {
      min-width: 0;
      .item-name { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; &:hover { color: var(--primary); } }
      .item-variant { font-size: 12px; color: var(--text-muted); margin: 2px 0; }
      .item-price { font-size: 13px; color: var(--text-secondary); margin: 0; }
      @media (max-width: 600px) { grid-column: 2; }
    }

    .qty-control {
      display: flex; align-items: center; gap: 4px;
      border: 1px solid var(--border); border-radius: 100px; padding: 2px;
      span { min-width: 28px; text-align: center; font-weight: 600; font-size: 14px; }
      @media (max-width: 600px) { grid-column: 2; grid-row: 2; justify-self: start; }
    }

    .item-total {
      font-size: 15px; font-weight: 700; color: var(--primary);
      min-width: 70px; text-align: right; margin: 0;
      @media (max-width: 600px) { grid-column: 3; grid-row: 2; min-width: unset; }
    }

    .item-delete {
      @media (max-width: 600px) { grid-column: 3; grid-row: 1; justify-self: end; }
    }

    .cart-actions { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 8px; }

    .checkout-btn { width: 100%; height: 52px; font-size: 16px; font-weight: 600; }

    .payment-note {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--text-muted);
      justify-content: center; margin-top: 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

  `]
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);

  private dialog = inject(MatDialog);
  readonly hasOffer = hasOffer;
  readonly mrpLineTotal = mrpLineTotal;
  readonly offerPercent = offerPercent;
  savings(): number { return this.cart ? cartMrpSavings(this.cart.items) : 0; }
  cart: Cart | null = null;
  loading = true;

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.cartService.loadCart().subscribe({
      next: (res) => { this.cart = res.data ?? null; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  updateQty(item: CartItem, qty: number): void {
    if (qty < 1) return;
    this.cartService.updateItem(item.id, qty).subscribe(() => this.loadCart());
  }

  /** Nothing is removed until the customer confirms in a popup. */
  removeItem(item: CartItem): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove item',
        message: `Do you want to remove "${item.productName}" from your cart?`,
        confirmLabel: 'Yes, remove',
        cancelLabel: 'No, keep it',
        confirmColor: 'warn',
        icon: 'delete'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) this.cartService.removeItem(item.id).subscribe(() => this.loadCart());
    });
  }

  clearCart(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Clear cart',
        message: 'Do you want to remove all items from your cart?',
        confirmLabel: 'Yes, clear cart',
        cancelLabel: 'No, keep them',
        confirmColor: 'warn',
        icon: 'delete_sweep'
      }
    }).afterClosed().subscribe(ok => {
      if (ok) this.cartService.clearCart().subscribe(() => this.loadCart());
    });
  }

}
