import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { OrderService } from '../../../core/services/order.service';
import { OrderList } from '../../../core/models/order.models';

/** The page a customer lands on after login: who they are, their orders, returns and referral rewards at a glance. */
@Component({
  selector: 'app-account-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgClass, DatePipe, CurrencyPipe, MatIconModule],
  template: `
    <section class="dash-hero">
      <div class="dash-avatar">{{ initials() }}</div>
      <div class="dash-hero-text">
        <h2>Namaste, {{ firstName() }}!</h2>
        <p>{{ email() }}<span *ngIf="phone()"> · {{ phone() }}</span></p>
      </div>
      <a routerLink="/account/profile" class="dash-edit"><mat-icon>edit</mat-icon> Edit profile</a>
    </section>

    <section class="dash-stats">
      <a class="dash-stat" routerLink="/account/orders">
        <mat-icon class="s-green">receipt_long</mat-icon>
        <div><strong>{{ loadingOrders() ? '–' : orders().length }}</strong><span>Orders</span></div>
      </a>
      <a class="dash-stat" routerLink="/account/orders">
        <mat-icon class="s-blue">local_shipping</mat-icon>
        <div><strong>{{ loadingOrders() ? '–' : activeCount() }}</strong><span>In progress</span></div>
      </a>
      <a class="dash-stat" routerLink="/account/returns">
        <mat-icon class="s-amber">assignment_return</mat-icon>
        <div><strong>{{ loadingReturns() ? '–' : returnsCount() }}</strong><span>Returns</span></div>
      </a>
      <a class="dash-stat" routerLink="/account/referral">
        <mat-icon class="s-purple">card_giftcard</mat-icon>
        <div><strong>{{ totalEarned() | currency:'INR':'symbol':'1.0-0' }}</strong><span>Rewards earned</span></div>
      </a>
    </section>

    <div class="dash-grid">
      <section class="dash-card">
        <div class="dash-card-head"><h3>Recent orders</h3><a routerLink="/account/orders">View all</a></div>
        <p class="dash-empty" *ngIf="!loadingOrders() && !orders().length">You have not placed an order yet. <a routerLink="/products">Start shopping</a></p>
        <a class="dash-order" *ngFor="let o of recent()" [routerLink]="['/account/orders', o.id]">
          <div>
            <strong>#{{ o.orderNumber }}</strong>
            <span>{{ o.createdAt | date:'mediumDate' }} · {{ o.itemCount }} item(s)</span>
          </div>
          <div class="dash-order-right">
            <span class="chip" [ngClass]="statusChip(o.status)">{{ statusLabel(o.status) }}</span>
            <b>{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }}</b>
          </div>
        </a>
      </section>

      <section class="dash-card dash-ref">
        <div class="dash-card-head"><h3>Referral &amp; rewards</h3><a routerLink="/account/referral">Open</a></div>
        <p class="dash-ref-text">Share your code. When a friend places a first order, you both earn ₹{{ rewardAmount() }}.</p>
        <div class="dash-code" *ngIf="code()">{{ code() }}</div>
        <div class="dash-ref-meta">
          <span><b>{{ referralCount() }}</b> referrals</span>
          <span><b>{{ totalEarned() | currency:'INR':'symbol':'1.0-0' }}</b> earned</span>
        </div>
      </section>
    </div>

    <section class="dash-links">
      <a routerLink="/account/addresses"><mat-icon>location_on</mat-icon> Saved addresses</a>
      <a routerLink="/account/change-password"><mat-icon>lock</mat-icon> Change password</a>
      <a routerLink="/track-order"><mat-icon>local_shipping</mat-icon> Track an order</a>
    </section>
  `,
  styles: [`
    .dash-hero { display:flex; align-items:center; gap:18px; background:linear-gradient(135deg,#064E3B,#059669); color:#fff; border-radius:16px; padding:22px 26px; flex-wrap:wrap; }
    .dash-avatar { width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,.18); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; }
    .dash-hero-text { flex:1; min-width:180px; }
    .dash-hero-text h2 { margin:0 0 4px; font-size:22px; }
    .dash-hero-text p { margin:0; font-size:13.5px; opacity:.9; word-break:break-all; }
    .dash-edit { display:inline-flex; align-items:center; gap:6px; color:#fff; border:1px solid rgba(255,255,255,.5); padding:8px 14px; border-radius:100px; text-decoration:none; font-size:13px; }
    .dash-edit mat-icon { font-size:16px; width:16px; height:16px; }
    .dash-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:18px 0; }
    .dash-stat { display:flex; align-items:center; gap:14px; background:#fff; border:1px solid var(--border); border-radius:14px; padding:16px; text-decoration:none; color:var(--text-primary); transition:box-shadow .15s; }
    .dash-stat:hover { box-shadow:0 6px 16px rgba(15,23,42,.08); }
    .dash-stat mat-icon { width:42px; height:42px; font-size:22px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
    .s-green { background:#D1FAE5; color:#047857; } .s-blue { background:#DBEAFE; color:#1D4ED8; } .s-amber { background:#FEF3C7; color:#B45309; } .s-purple { background:#EDE9FE; color:#6D28D9; }
    .dash-stat strong { display:block; font-size:20px; line-height:1.2; } .dash-stat span { font-size:12.5px; color:var(--text-secondary); }
    .dash-grid { display:grid; grid-template-columns:1.6fr 1fr; gap:14px; }
    .dash-card { background:#fff; border:1px solid var(--border); border-radius:14px; padding:18px 20px; }
    .dash-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .dash-card-head h3 { margin:0; font-size:16px; } .dash-card-head a { font-size:13px; color:#047857; text-decoration:none; font-weight:600; }
    .dash-empty { color:var(--text-secondary); font-size:14px; }
    .dash-order { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 0; border-top:1px solid var(--border); text-decoration:none; color:var(--text-primary); }
    .dash-order:first-of-type { border-top:0; }
    .dash-order strong { display:block; font-size:14.5px; } .dash-order span { font-size:12.5px; color:var(--text-secondary); }
    .dash-order-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .dash-ref { background:linear-gradient(180deg,#F5F3FF,#fff); }
    .dash-ref-text { font-size:13.5px; color:var(--text-secondary); margin:0 0 12px; }
    .dash-code { font-family:monospace; font-size:20px; letter-spacing:2px; font-weight:700; text-align:center; border:2px dashed #A78BFA; border-radius:10px; padding:10px; color:#5B21B6; background:#fff; }
    .dash-ref-meta { display:flex; justify-content:space-between; margin-top:12px; font-size:13px; color:var(--text-secondary); }
    .dash-links { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
    .dash-links a { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid var(--border); padding:10px 16px; border-radius:100px; text-decoration:none; color:var(--text-primary); font-size:13.5px; }
    .dash-links mat-icon { font-size:18px; width:18px; height:18px; color:#059669; }
    @media (max-width: 860px) { .dash-stats { grid-template-columns:repeat(2,1fr); } .dash-grid { grid-template-columns:1fr; } }
  `]
})
export class AccountDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private orderService = inject(OrderService);

  // the storefront always shows the CUSTOMER session, even if an admin is also signed in in this browser
  private user = this.auth.customerUser;
  firstName = computed(() => this.user()?.firstName || 'there');
  email = computed(() => this.user()?.email ?? '');
  phone = computed(() => this.user()?.phone ?? '');
  initials = computed(() => {
    const u = this.user();
    return ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || 'U';
  });

  orders = signal<OrderList[]>([]);
  loadingOrders = signal(true);
  returnsCount = signal(0);
  loadingReturns = signal(true);
  code = signal('');
  rewardAmount = signal(50);
  referralCount = signal(0);
  totalEarned = signal(0);

  recent = computed(() => this.orders().slice(0, 4));
  activeCount = computed(() => this.orders().filter(o => o.status === 1 || o.status === 2 || o.status === 3).length);

  ngOnInit(): void {
    this.auth.getProfile().subscribe({ error: () => {} });                      // refresh name / phone from the server
    this.orderService.getMyOrders().subscribe({
      next: r => { this.orders.set(r.data ?? []); this.loadingOrders.set(false); },
      error: () => this.loadingOrders.set(false)
    });
    this.api.get<any[]>('returns/my').subscribe({
      next: r => { this.returnsCount.set((r.data ?? []).length); this.loadingReturns.set(false); },
      error: () => this.loadingReturns.set(false)
    });
    this.api.get<any>('referral/my-code').subscribe({
      next: r => { if (r.data) { this.code.set(r.data.code); this.rewardAmount.set(r.data.rewardAmount ?? 50); } },
      error: () => {}
    });
    this.api.get<any>('referral/my-referrals').subscribe({
      next: r => { this.referralCount.set((r.data?.referrals ?? []).length); this.totalEarned.set(r.data?.totalEarned ?? 0); },
      error: () => {}
    });
  }

  statusLabel(s: number): string {
    return ({ 1: 'Pending', 2: 'Confirmed', 3: 'Shipped', 4: 'Delivered', 5: 'Cancelled', 6: 'Returned' } as Record<number, string>)[s] ?? 'Unknown';
  }
  statusChip(s: number): string {
    return ({ 1: 'chip-warning', 2: 'chip-info', 3: 'chip-primary', 4: 'chip-success', 5: 'chip-error', 6: 'chip-default' } as Record<number, string>)[s] ?? 'chip-default';
  }
}
