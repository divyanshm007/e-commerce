import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ReturnContactDialogComponent } from './return-contact-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService } from '../../../core/services/order.service';
import { ApiService } from '../../../core/services/api.service';
import { OrderDetail, OrderStatus, orderItemHasOffer, orderItemSellingUnit } from '../../../core/models/order.models';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { ShipmentTimelineComponent } from './shipment-timeline.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgClass, DatePipe, CurrencyPipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDividerModule, MediaUrlPipe, ShipmentTimelineComponent],
  template: `
    <div class="page-content">
      <div class="acct-page-header">
        <a mat-icon-button routerLink="/account/orders"><mat-icon>arrow_back</mat-icon></a>
        <h2 class="page-title">Order #{{ order?.orderNumber }}</h2>
      </div>

      <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

      <div *ngIf="!loading && order">
        <div class="detail-grid">
          <!-- Items -->
          <div class="detail-card card">
            <h3>Items Ordered</h3>
            <div class="order-items">
              <div class="order-item" *ngFor="let item of order!.items">
                <img [src]="(item.productImageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="item.productName" />
                <div class="item-info">
                  <p class="item-name">{{ item.productName }}</p>
                  <p class="item-meta" *ngIf="item.variantInfo">{{ item.variantInfo }}</p>
                  <p class="item-meta" *ngIf="!orderItemHasOffer(item)">Qty: {{ item.quantity }} × {{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</p>
                  <p class="item-meta" *ngIf="orderItemHasOffer(item)">Qty: {{ item.quantity }} × {{ orderItemSellingUnit(item) | currency:'INR':'symbol':'1.0-0' }}
                    <s style="color:#94a3b8;margin-left:4px">{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</s></p>
                </div>
                <p class="item-total">
                  <s *ngIf="orderItemHasOffer(item)" style="display:block;font-weight:400;font-size:12px;color:#94a3b8">{{ item.unitPrice * item.quantity | currency:'INR':'symbol':'1.0-0' }}</s>
                  {{ item.totalPrice | currency:'INR':'symbol':'1.0-0' }}
                </p>
              </div>
            </div>

            <mat-divider style="margin: 16px 0" />
            <div class="price-rows">
              <div class="price-row"><span>Subtotal</span><span>{{ order!.subTotal | currency:'INR':'symbol':'1.0-0' }}</span></div>
              <div class="price-row" *ngIf="order!.discountAmount > 0"><span class="green">Discount</span><span class="green">-{{ order!.discountAmount | currency:'INR':'symbol':'1.0-0' }}</span></div>
              <div class="price-row"><span>Shipping</span><span>{{ order!.shippingCharge | currency:'INR':'symbol':'1.0-0' }}</span></div>
              <div class="price-row total"><span>Total</span><span>{{ order!.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span></div>
            </div>
          </div>

          <!-- Sidebar info -->
          <div>
            <div class="detail-card card" style="margin-bottom:16px">
              <h3>Order Info</h3>
              <div class="info-rows">
                <div class="info-row"><span>Date</span><span>{{ order!.createdAt | date:'mediumDate' }}</span></div>
                <div class="info-row"><span>Status</span><span class="chip" [ngClass]="statusChip(order!.status)">{{ statusLabel(order!.status) }}</span></div>
                <div class="info-row" *ngIf="order!.trackingNumber"><span>Tracking</span><span>{{ order!.trackingNumber }}</span></div>
              </div>
              <button mat-stroked-button color="warn" style="margin-top:16px;width:100%"
                *ngIf="canCancel()"
                (click)="cancelOrder()">
                {{ order!.status === 3 ? 'Request Cancellation' : 'Cancel Order' }}
              </button>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b" *ngIf="order!.status === 3 && !cancelRequest">
                This order is already shipped, so a cancellation needs our approval. Your request goes to our team by e-mail.
              </p>
              <div *ngIf="cancelRequest" style="margin:12px 0 0;padding:10px 12px;border-radius:8px;font-size:13px"
                [style.background]="cancelRequest.status === 'Pending' ? '#fffbeb' : cancelRequest.status === 'Approved' ? '#f0fdf4' : '#fef2f2'">
                <strong>Cancellation request: {{ cancelRequest.status === 'Pending' ? 'waiting for approval' : cancelRequest.status.toLowerCase() }}</strong>
                <div *ngIf="cancelRequest.adminNotes" style="margin-top:4px">Note from our team: {{ cancelRequest.adminNotes }}</div>
              </div>
              <button mat-flat-button color="primary" style="margin-top:16px;width:100%" *ngIf="order!.status === 4" (click)="returnOrder()">
                <mat-icon>assignment_return</mat-icon> Return this order
              </button>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b" *ngIf="order!.status === 4">
                Delivered. To return it, contact us by phone or e-mail.
              </p>
              <p style="margin:12px 0 0;font-size:13px;color:#047857" *ngIf="cancelInfo">{{ cancelInfo }}</p>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b"
                *ngIf="(order!.status === 1 || order!.status === 2) && order!.paymentStatus === 2">
                This order has been paid. To cancel it, please contact the store.
              </p>
              <p style="margin:12px 0 0;font-size:13px;color:#b91c1c" *ngIf="cancelError">{{ cancelError }}</p>
            </div>

            <app-shipment-timeline [orderId]="order!.id" [status]="order!.status" [placedAt]="order!.createdAt" [shippedAt]="order!.shippedAt" [deliveredAt]="order!.deliveredAt" />

            <div class="detail-card card">
              <h3>Shipping Address</h3>
              <p>{{ order!.shippingAddress.fullName }}</p>
              <p>{{ order!.shippingAddress.line1 }}</p>
              <p *ngIf="order!.shippingAddress.line2">{{ order!.shippingAddress.line2 }}</p>
              <p>{{ order!.shippingAddress.city }}, {{ order!.shippingAddress.state }} {{ order!.shippingAddress.postalCode }}</p>
              <p>{{ order!.shippingAddress.phone }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .acct-page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0; }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }

    .detail-card { padding: 24px; h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; } }

    .order-item {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
      &:last-child { border: none; }
      img { width: 64px; height: 64px; object-fit: contain; border-radius: var(--radius-sm); background: #f5f5f5; flex-shrink: 0; }
      .item-info { flex: 1; }
      .item-name { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
      .item-meta { font-size: 12px; color: var(--text-muted); margin: 0; }
      .item-total { font-size: 14px; font-weight: 700; min-width: 80px; text-align: right; margin: 0; }
    }

    .price-rows, .info-rows { display: flex; flex-direction: column; }
    .price-row, .info-row {
      display: flex; justify-content: space-between;
      font-size: 14px; padding: 8px 0;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      &:last-child { border: none; }
      &.total { font-weight: 700; color: var(--text-primary); font-size: 16px; }
    }
    .green { color: #4caf50; }

    p { font-size: 13px; color: var(--text-secondary); margin: 0 0 4px; }
  `]
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  readonly orderItemHasOffer = orderItemHasOffer;
  readonly orderItemSellingUnit = orderItemSellingUnit;

  order: OrderDetail | null = null;
  cancelRequest: { status: string; reason: string; adminNotes?: string | null } | null = null;
  cancelInfo = '';
  loading = true;
  cancelError = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.orderService.getById(id).subscribe({
      next: (res) => { this.order = res.data ?? null; this.loading = false; this.loadCancelRequest(); },
      error: () => { this.loading = false; }
    });
  }

  /** Shown for an unpaid order before dispatch (cancels at once) and for a shipped order (sends a request for approval). */
  canCancel(): boolean {
    if (!this.order) return false;
    if (this.cancelRequest?.status === 'Pending') return false;
    if (this.order.status === 3) return true;
    return (this.order.status === 1 || this.order.status === 2) && this.order.paymentStatus !== 2;
  }

  private loadCancelRequest(): void {
    if (!this.order) return;
    this.api.get<any>(`orders/${this.order.id}/cancel-request`).subscribe({
      next: r => { this.cancelRequest = r.data ?? null; },
      error: () => { this.cancelRequest = null; }
    });
  }

  /** A delivered order is returned by contacting the store: the popup shows the phone number and e-mail. */
  returnOrder(): void {
    if (!this.order) return;
    this.dialog.open(ReturnContactDialogComponent, { data: { orderNumber: this.order.orderNumber }, autoFocus: false });
  }

  /** Nothing is cancelled until the customer confirms in a popup. */
  cancelOrder(): void {
    if (!this.order) return;
    const shipped = this.order.status === 3;
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: shipped ? 'Request cancellation' : 'Cancel order',
        message: shipped
          ? `Order ${this.order.orderNumber} is already shipped. Do you want to send a cancellation request to our team?`
          : `Do you want to cancel order ${this.order.orderNumber}? This cannot be undone.`,
        confirmLabel: shipped ? 'Yes, send request' : 'Yes, cancel order',
        cancelLabel: 'No, keep my order',
        confirmColor: 'warn',
        icon: 'cancel'
      }
    }).afterClosed().subscribe(ok => { if (ok) this.doCancel(); });
  }

  private doCancel(): void {
    if (!this.order) return;
    this.cancelError = ''; this.cancelInfo = '';
    let reason: string | undefined;
    if (this.order.status === 3) {
      const typed = window.prompt('Why do you want to cancel this order? (optional)');
      if (typed === null) return;                                         // the customer changed their mind
      reason = typed.trim() || undefined;
    }
    this.orderService.cancel(this.order.id, reason).subscribe({
      next: (res) => {
        const msg = String(res.data ?? res.message ?? '');
        // "Order cancelled." = done; anything else is the "request sent for approval" answer
        if (/cancelled/i.test(msg) && !/request/i.test(msg)) { if (this.order) this.order.status = OrderStatus.Cancelled; }
        else { this.cancelInfo = msg; this.loadCancelRequest(); }
      },
      error: (err) => { this.cancelError = err?.error?.message || 'The order could not be cancelled.'; }
    });
  }

  statusLabel(s: OrderStatus): string {
    const m: Record<number, string> = { 1:'Pending',2:'Confirmed',3:'Shipped',4:'Delivered',5:'Cancelled',6:'Returned' };
    return m[s] ?? 'Unknown';
  }

  statusChip(s: OrderStatus): string {
    const m: Record<number, string> = { 1:'chip-warning',2:'chip-info',3:'chip-primary',4:'chip-success',5:'chip-error',6:'chip-default' };
    return m[s] ?? 'chip-default';
  }
}
