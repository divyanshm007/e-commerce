import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, CurrencyPipe, DatePipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number;
  lineTotal: number;
}

interface CartSummary {
  id: string;
  userId?: string;
  customerEmail?: string;
  customerName?: string;
  sessionId?: string;
  isGuest: boolean;
  status: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  items: CartItem[];
  _expanded?: boolean;
}

@Component({
  selector: 'app-admin-carts',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, DatePipe, SlicePipe, RouterLink, FormsModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule, MediaUrlPipe],
  template: `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <h1>Active Carts</h1>
          <p class="page-sub">All carts with items — guests and registered users</p>
        </div>
        <div class="header-stats">
          <div class="stat-chip"><span>{{ carts().length }}</span> Total</div>
          <div class="stat-chip guest"><span>{{ guestCount() }}</span> Guests</div>
          <div class="stat-chip user"><span>{{ userCount() }}</span> Logged-in</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="search" (ngModelChange)="applyFilter()" placeholder="Search by email, session ID…" />
        </div>
        <div class="filter-tabs">
          <button [class.active]="filter === 'all'" (click)="setFilter('all')">All</button>
          <button [class.active]="filter === 'guest'" (click)="setFilter('guest')">Guests Only</button>
          <button [class.active]="filter === 'user'" (click)="setFilter('user')">Registered</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36" /></div>

      <div class="empty" *ngIf="!loading && filtered().length === 0">
        <mat-icon>shopping_cart</mat-icon>
        <p>No carts found</p>
      </div>

      <!-- Cart List -->
      <div class="cart-list" *ngIf="!loading">
        <div class="cart-card" *ngFor="let c of filtered()" [class.guest-card]="c.isGuest">
          <div class="cart-header" (click)="c._expanded = !c._expanded">
            <div class="cart-meta">
              <span class="type-badge" [class.guest]="c.isGuest">
                <mat-icon>{{ c.isGuest ? 'person_off' : 'person' }}</mat-icon>
                {{ c.isGuest ? 'Guest' : 'Registered' }}
              </span>
              <div class="identity">
                <span class="name" *ngIf="c.customerName">{{ c.customerName }}</span>
                <span class="email" *ngIf="c.customerEmail">{{ c.customerEmail }}</span>
                <span class="session" *ngIf="c.isGuest && c.sessionId" matTooltip="Guest session ID">
                  <mat-icon>fingerprint</mat-icon>{{ c.sessionId | slice:0:8 }}…
                </span>
              </div>
            </div>

            <div class="cart-nums">
              <span class="num-items"><mat-icon>shopping_cart</mat-icon>{{ c.itemCount }} item{{ c.itemCount !== 1 ? 's' : '' }}</span>
              <span class="total">{{ c.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
              <span class="time">{{ c.updatedAt || c.createdAt | date:'dd MMM, hh:mm a' }}</span>
            </div>

            <mat-icon class="expand-icon">{{ c._expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
          </div>

          <!-- Expanded Items -->
          <div class="cart-items" *ngIf="c._expanded">
            <div class="item-row" *ngFor="let item of c.items">
              <img [src]="(item.productImageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="item.productName" />
              <div class="item-info">
                <a [routerLink]="['/products', item.productSlug]" target="_blank">{{ item.productName }}</a>
                <span>Qty: {{ item.quantity }} &times; {{ item.discountPrice || item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
              <span class="item-total">{{ item.lineTotal | currency:'INR':'symbol':'1.0-0' }}</span>
            </div>
            <div class="cart-total-row">
              <span>Cart Total</span>
              <strong>{{ c.totalAmount | currency:'INR':'symbol':'1.0-0' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { padding: 24px; width: 100%; box-sizing: border-box; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 28px; flex-wrap: wrap; gap: 16px;
      h1 { font-size: 26px; font-weight: 700; margin: 0; }
      .page-sub { color: var(--text-muted); margin: 4px 0 0; font-size: 14px; }
    }

    .header-stats { display: flex; gap: 10px; flex-wrap: wrap; }
    .stat-chip {
      padding: 6px 16px; border-radius: 100px; background: var(--surface-b, #f3f4f6); border: none;
      font-size: 13px; font-weight: 400; color: var(--text-secondary);
      span { font-size: 18px; font-weight: 600; color: var(--text-primary); margin-right: 4px; }
      &.guest { background: #fef3c7; color: #92400e; span { color: #92400e; } }
      &.user  { background: #d1fae5; color: #065f46;  span { color: #065f46;  } }
    }

    .filters { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }

    .search-box {
      display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px;
      border: 1.5px solid var(--border); border-radius: 8px; padding: 8px 12px;
      background: var(--surface);
      mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
      input { border: none; background: none; outline: none; font-size: 14px; color: var(--text-primary); flex: 1; }
    }

    .filter-tabs {
      display: flex; gap: 4px;
      button {
        border: 1.5px solid var(--border); background: none; border-radius: 6px;
        padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
        color: var(--text-secondary);
        &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
      }
    }

    .loading { display: flex; justify-content: center; padding: 60px; }
    .empty { text-align: center; padding: 80px; color: var(--text-muted);
      mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; }
    }

    .cart-list { display: flex; flex-direction: column; gap: 12px; }

    .cart-card {
      border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden;
      &.guest-card { border-color: #f59e0b44; }
    }

    .cart-header {
      display: flex; align-items: center; gap: 16px; padding: 14px 18px;
      cursor: pointer; background: var(--surface);
      &:hover { background: var(--bg); }
    }

    .cart-meta { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

    .type-badge {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px;
      border-radius: 100px; font-size: 11px; font-weight: 700; white-space: nowrap;
      background: #e0f2fe; color: #0369a1;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
      &.guest { background: #fef3c7; color: #b45309; }
    }

    .identity { display: flex; flex-direction: column; min-width: 0;
      .name  { font-size: 14px; font-weight: 700; color: var(--text-primary); }
      .email { font-size: 13px; color: var(--text-secondary); }
      .session { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); font-family: monospace;
        mat-icon { font-size: 13px; width: 13px; height: 13px; }
      }
    }

    .cart-nums { display: flex; align-items: center; gap: 20px; flex-shrink: 0;
      .num-items { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted);
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
      .total { font-size: 16px; font-weight: 800; color: var(--primary); }
      .time { font-size: 12px; color: var(--text-muted); }
    }

    .expand-icon { color: var(--text-muted); flex-shrink: 0; }

    .cart-items { padding: 0 18px 16px; border-top: 1px solid var(--border); background: var(--bg); }

    .item-row {
      display: flex; align-items: center; gap: 12px; padding: 12px 0;
      border-bottom: 1px solid var(--border);
      img { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border); background: #fff; flex-shrink: 0; }
      .item-info { flex: 1; min-width: 0;
        a { font-size: 13px; font-weight: 600; color: var(--text-primary); text-decoration: none; display: block;
          &:hover { color: var(--primary); } }
        span { font-size: 12px; color: var(--text-muted); }
      }
      .item-total { font-size: 14px; font-weight: 700; color: var(--primary); flex-shrink: 0; }
    }

    .cart-total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0 0; font-size: 14px; color: var(--text-secondary);
      strong { font-size: 16px; font-weight: 800; color: var(--primary); }
    }

    @media (max-width: 600px) {
      .page-wrap { padding: 14px; }
      .cart-header { flex-wrap: wrap; gap: 10px; padding: 12px 14px; }
      .cart-nums { gap: 12px; }
      .cart-items { padding: 0 14px 12px; }
    }
  `]
})
export class AdminCartsComponent implements OnInit {
  private api = inject(ApiService);

  carts = signal<CartSummary[]>([]);
  filtered = signal<CartSummary[]>([]);
  loading = true;
  search = '';
  filter: 'all' | 'guest' | 'user' = 'all';

  guestCount = () => this.carts().filter(c => c.isGuest).length;
  userCount  = () => this.carts().filter(c => !c.isGuest).length;

  ngOnInit(): void {
    this.api.get<CartSummary[]>('cart/all').subscribe({
      next: res => {
        if (res.data) this.carts.set(res.data.map(c => ({ ...c, _expanded: false })));
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setFilter(f: 'all' | 'guest' | 'user'): void {
    this.filter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    let list = this.carts();
    if (this.filter === 'guest') list = list.filter(c => c.isGuest);
    if (this.filter === 'user')  list = list.filter(c => !c.isGuest);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(c =>
        c.customerEmail?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.sessionId?.toLowerCase().includes(q)
      );
    }
    this.filtered.set(list);
  }
}
