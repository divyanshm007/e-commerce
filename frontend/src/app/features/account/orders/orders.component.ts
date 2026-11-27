import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { OrderList, OrderStatus } from '../../../core/models/order.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, RouterLink, NgFor, NgIf, NgClass, DatePipe, CurrencyPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">My Orders</h2>

      <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

      <div class="filters" *ngIf="!loading && orders().length">
        <div class="status-tabs">
          <button type="button" class="tab" [class.on]="status() === 0" (click)="status.set(0)">All <span>{{ orders().length }}</span></button>
          <button type="button" class="tab" *ngFor="let s of statusTabs()" [class.on]="status() === s.id" (click)="status.set(s.id)">{{ s.label }} <span>{{ s.count }}</span></button>
        </div>
        <div class="filter-row">
          <input class="f-input" type="search" placeholder="Search by order number" [ngModel]="search()" (ngModelChange)="search.set($event)" />
          <select class="f-input" [ngModel]="period()" (ngModelChange)="period.set($event)">
            <option value="all">All time</option>
            <option value="30">Last 30 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
          <button type="button" class="f-clear" *ngIf="filtersOn()" (click)="clear()">Clear filters</button>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && orders().length && !filtered().length">
        <mat-icon>filter_alt_off</mat-icon>
        <h3>No orders match these filters</h3>
        <button mat-stroked-button type="button" (click)="clear()">Clear filters</button>
      </div>

      <div class="orders-list" *ngIf="!loading && filtered().length">
        <div class="order-card card" *ngFor="let o of filtered()">
          <div class="order-header">
            <div>
              <p class="order-num">#{{ o.orderNumber }}</p>
              <p class="order-date">{{ o.createdAt | date:'mediumDate' }}</p>
            </div>
            <span class="chip" [ngClass]="statusChip(o.status)">{{ statusLabel(o.status) }}</span>
          </div>
          <div class="order-footer">
            <p class="order-amount">{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }} · {{ o.itemCount }} item(s)</p>
            <a mat-button color="primary" [routerLink]="['/account/orders', o.id]">View Details</a>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && !orders().length">
        <mat-icon>receipt_long</mat-icon>
        <h3>No orders yet</h3>
        <p>When you place an order, it will appear here.</p>
        <a mat-flat-button color="primary" routerLink="/products">Start Shopping</a>
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 24px; }
    .filters { margin: 0 0 16px; display: flex; flex-direction: column; gap: 12px; }
    .status-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { border: 1px solid var(--border); background: #fff; color: #334155; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .tab span { margin-left: 4px; color: #64748b; font-weight: 500; }
    .tab.on { background: #166534; border-color: #166534; color: #fff; }
    .tab.on span { color: #dcfce7; }
    .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .f-input { flex: 1 1 180px; min-width: 0; height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: #fff; color: #1e293b; }
    .f-clear { border: 0; background: none; color: #166534; font-weight: 600; font-size: 13px; cursor: pointer; }
    .orders-list { display: flex; flex-direction: column; gap: 16px; }

    .order-card {
      .order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
      .order-num { font-size: 15px; font-weight: 700; margin: 0 0 2px; }
      .order-date { font-size: 13px; color: var(--text-muted); margin: 0; }
      .order-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 12px; }
      .order-amount { font-size: 15px; font-weight: 600; margin: 0; }
    }
  `]
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  orders = signal<OrderList[]>([]);
  loading = true;

  // filters (0 = all statuses)
  status = signal(0);
  search = signal('');
  period = signal('all');

  statusTabs = computed(() => {
    const counts = new Map<number, number>();
    for (const o of this.orders()) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([id, count]) => ({ id, count, label: this.statusLabel(id as OrderStatus) }));
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.status();
    const days = this.period() === 'all' ? 0 : Number(this.period());
    const since = days ? Date.now() - days * 86400000 : 0;
    return this.orders().filter(o =>
      (!st || o.status === st) &&
      (!q || o.orderNumber.toLowerCase().includes(q)) &&
      (!since || new Date(o.createdAt).getTime() >= since));
  });

  filtersOn = computed(() => this.status() !== 0 || !!this.search().trim() || this.period() !== 'all');
  clear(): void { this.status.set(0); this.search.set(''); this.period.set('all'); }

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next: (res) => { if (res.data) this.orders.set(res.data); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  statusLabel(status: OrderStatus): string {
    const map: Record<number, string> = {
      1: 'Pending', 2: 'Confirmed', 3: 'Shipped',
      4: 'Delivered', 5: 'Cancelled', 6: 'Returned'
    };
    return map[status] ?? 'Unknown';
  }

  statusChip(status: OrderStatus): string {
    const map: Record<number, string> = {
      1: 'chip-warning', 2: 'chip-info', 3: 'chip-primary',
      4: 'chip-success', 5: 'chip-error', 6: 'chip-default'
    };
    return map[status] ?? 'chip-default';
  }
}
