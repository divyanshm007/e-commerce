import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { OrderService } from '../../../core/services/order.service';
import { OrderList, OrderStatus } from '../../../core/models/order.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgClass, DatePipe, CurrencyPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">My Orders</h2>

      <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

      <div class="orders-list" *ngIf="!loading && orders().length">
        <div class="order-card card" *ngFor="let o of orders()">
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
