import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface TrackResult {
  orderNumber: string;
  status: number;
  placedAt: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  trackingNumber?: string | null;
  items: { productName: string; quantity: number }[];
  shipment?: {
    courier?: string | null; awb?: string | null; status?: string | null; expectedDeliveryDate?: string | null;
    timeline: { status: string; location?: string | null; time?: string | null }[];
  } | null;
}

/** Public page: a guest (no account) tracks an order with the order number plus the e-mail or mobile number used at checkout. */
@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, FormsModule, RouterLink],
  template: `
<div class="page-content" style="max-width:640px;margin:32px auto;padding:0 16px">
  <h1 style="margin:0 0 6px">Track your order</h1>
  <p style="color:#64748b;margin:0 0 20px">Enter your order number and the e-mail address or mobile number you used at checkout. No login needed.</p>

  <form (ngSubmit)="track()" class="card" style="padding:20px;display:flex;flex-direction:column;gap:12px">
    <label style="font-size:13px;font-weight:600">Order number
      <input name="order" [(ngModel)]="orderNumber" required placeholder="ORD-20261109-ABC123"
             style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px" />
    </label>
    <label style="font-size:13px;font-weight:600">E-mail or mobile number
      <input name="contact" [(ngModel)]="contact" required placeholder="you@example.com or 9876543210"
             style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px" />
    </label>
    <button type="submit" [disabled]="loading() || !orderNumber.trim() || !contact.trim()"
            style="padding:12px;border:0;border-radius:8px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">
      {{ loading() ? 'Checking…' : 'Track order' }}
    </button>
    <p *ngIf="error()" style="margin:0;color:#b91c1c;font-size:14px">{{ error() }}</p>
    <p style="margin:0;font-size:13px;color:#64748b">Have an account? <a routerLink="/account/orders">View your orders</a> after logging in.</p>
  </form>

  <div *ngIf="result() as r" class="card" style="padding:20px;margin-top:16px">
    <h3 style="margin:0 0 4px">Order #{{ r.orderNumber }}</h3>
    <p style="margin:0 0 12px;color:#64748b;font-size:13px">Placed {{ r.placedAt | date:'mediumDate' }}</p>
    <p style="margin:0 0 12px"><strong>Status:</strong> {{ statusLabel(r.status) }}</p>
    <ul style="margin:0 0 12px;padding-left:18px">
      <li *ngFor="let i of r.items">{{ i.productName }} × {{ i.quantity }}</li>
    </ul>

    <ng-container *ngIf="r.shipment as s; else notShipped">
      <p style="margin:0"><strong>Courier:</strong> {{ s.courier }}</p>
      <p style="margin:0" *ngIf="s.awb"><strong>Tracking number (AWB):</strong> {{ s.awb }}</p>
      <p style="margin:0" *ngIf="s.status"><strong>Delivery status:</strong> {{ label(s.status) }}</p>
      <p style="margin:0" *ngIf="s.expectedDeliveryDate"><strong>Expected delivery:</strong> {{ s.expectedDeliveryDate | date:'mediumDate' }}</p>
      <ol *ngIf="s.timeline.length" style="list-style:none;margin:14px 0 0;padding:0;border-left:2px solid #d1fae5">
        <li *ngFor="let e of s.timeline" style="padding:0 0 12px 14px;font-size:13px">
          <strong>{{ e.status }}</strong><span *ngIf="e.location" style="color:#64748b"> · {{ e.location }}</span>
          <div style="color:#94a3b8;font-size:12px">{{ e.time | date:'dd MMM yyyy, h:mm a' }}</div>
        </li>
      </ol>
    </ng-container>
    <ng-template #notShipped>
      <p style="margin:0;color:#64748b;font-size:14px">Your order has not been handed to the courier yet. Tracking details will appear here and in your e-mail once it ships.</p>
    </ng-template>
  </div>
</div>
  `
})
export class TrackOrderComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  orderNumber = '';
  contact = '';
  loading = signal(false);
  error = signal('');
  result = signal<TrackResult | null>(null);

  ngOnInit(): void {
    this.orderNumber = this.route.snapshot.queryParamMap.get('order') ?? '';
  }

  statusLabel(s: number): string {
    return ({ 1: 'Order placed', 2: 'Confirmed', 3: 'Shipped', 4: 'Delivered', 5: 'Cancelled', 6: 'Returned' } as Record<number, string>)[s] ?? 'Processing';
  }

  label(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }

  track(): void {
    this.loading.set(true); this.error.set(''); this.result.set(null);
    this.api.post<TrackResult>('orders/track', { orderNumber: this.orderNumber.trim(), contact: this.contact.trim() }).subscribe({
      next: r => { this.loading.set(false); this.result.set(r.data ?? null); },
      error: e => {
        this.loading.set(false);
        this.error.set(e?.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : e?.error?.message || 'We could not find an order matching these details.');
      }
    });
  }
}
