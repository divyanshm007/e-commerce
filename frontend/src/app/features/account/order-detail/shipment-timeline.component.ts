import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FulfilmentService, OrderShipment } from '../../../core/services/fulfilment.service';
import { OrderProgressComponent } from '../../../shared/components/order-progress/order-progress.component';

/** What the customer sees of their delivery: courier, AWB, status, timeline, and an expected date only when Delhivery supplied one. */
@Component({
  selector: 'app-shipment-timeline',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, OrderProgressComponent],
  template: `
<div class="detail-card card" style="margin-bottom:16px">
  <h3>Order status</h3>
  <app-order-progress [status]="status" [placedAt]="placedAt" [shippedAt]="shippedAt" [deliveredAt]="deliveredAt"
    [shipmentStatus]="info()?.hasShipment ? info()?.status : null" [courier]="info()?.courier" [awb]="info()?.awb"
    [expected]="info()?.expectedDeliveryDate" [timeline]="info()?.timeline" />
</div>
<div class="detail-card card" style="margin-top:16px" *ngIf="info() as s">
  <ng-container *ngIf="s.hasShipment">
    <h3>Courier updates</h3>
    <div class="info-rows">
      <div class="info-row"><span>Courier</span><span>{{ s.courier }}</span></div>
      <div class="info-row" *ngIf="s.awb"><span>Tracking no. (AWB)</span><span>{{ s.awb }}</span></div>
      <div class="info-row"><span>Status</span><span>{{ label(s.status) }}</span></div>
      <div class="info-row" *ngIf="s.expectedDeliveryDate"><span>Expected delivery</span><span>{{ s.expectedDeliveryDate | date:'mediumDate' }}</span></div>
    </div>
    <ol *ngIf="s.timeline.length" style="list-style:none;margin:14px 0 0;padding:0;border-left:2px solid #d1fae5">
      <li *ngFor="let e of s.timeline" style="padding:0 0 12px 14px;font-size:13px;position:relative">
        <span style="position:absolute;left:-6px;top:4px;width:10px;height:10px;border-radius:50%;background:#16a34a"></span>
        <strong>{{ e.status }}</strong><span *ngIf="e.location" style="color:#64748b"> · {{ e.location }}</span>
        <div style="color:#64748b;font-size:12px">{{ e.time | date:'dd MMM yyyy, h:mm a':'+0530' }} IST</div>
      </li>
    </ol>
  </ng-container>
</div>
  `
})
export class ShipmentTimelineComponent implements OnInit {
  @Input({ required: true }) orderId!: string;
  @Input({ required: true }) status!: number;
  @Input() placedAt?: string | null;
  @Input() shippedAt?: string | null;
  @Input() deliveredAt?: string | null;
  private svc = inject(FulfilmentService);
  info = signal<OrderShipment | null>(null);

  ngOnInit(): void {
    this.svc.myShipment(this.orderId).subscribe({ next: r => this.info.set(r.data ?? null), error: () => this.info.set(null) });
  }

  label(v?: string | null): string { return (v ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
}
