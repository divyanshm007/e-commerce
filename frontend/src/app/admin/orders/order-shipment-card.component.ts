import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FulfilmentService, OrderShipment } from '../../core/services/fulfilment.service';

/**
 * Shipment block of the admin order page. The only dispatch action is approving or rejecting an eligible order:
 * the shipment itself is created and tracked automatically afterwards. There is deliberately no "create shipment" button.
 */
@Component({
  selector: 'app-order-shipment-card',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe],
  template: `
<div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
  <div class="flex items-center gap-2 mb-4">
    <i class="pi pi-truck text-green-600"></i>
    <h3 class="text-base font-bold text-slate-900 m-0">Shipment</h3>
  </div>

  <ng-container *ngIf="info() as s">
    <div *ngIf="!s.fulfilmentState" class="text-sm text-slate-600 flex flex-col gap-3">
      <p class="m-0">This order has not been approved for dispatch.</p>
      <div class="flex gap-2 flex-wrap">
        <button type="button" class="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50" [disabled]="busy()" (click)="approve()">Approve for dispatch</button>
        <button type="button" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold disabled:opacity-50" [disabled]="busy()" (click)="rejecting.set(true)">Reject</button>
      </div>
      <div *ngIf="rejecting()" class="flex flex-col gap-2">
        <input class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Reason (required)" [value]="reason" (input)="reason = $any($event.target).value" />
        <button type="button" class="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50" [disabled]="busy()" (click)="reject()">Confirm rejection</button>
      </div>
    </div>

    <div *ngIf="s.fulfilmentState" class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><span class="text-slate-400">Dispatch</span><span class="font-semibold">{{ label(s.fulfilmentState) }}</span></div>
      <div class="flex justify-between" *ngIf="s.approvedAt"><span class="text-slate-400">Approved</span><span>{{ s.approvedAt | date:'medium' }}{{ s.approvedBy ? ' by ' + s.approvedBy : '' }}</span></div>
      <div class="flex justify-between" *ngIf="s.courier"><span class="text-slate-400">Courier</span><span>{{ s.courier }}</span></div>
      <div class="flex justify-between" *ngIf="s.awb"><span class="text-slate-400">AWB</span><span class="font-mono font-semibold">{{ s.awb }}</span></div>
      <div class="flex justify-between" *ngIf="s.status"><span class="text-slate-400">Shipment status</span><span class="font-semibold">{{ label(s.status) }}</span></div>
      <div class="flex justify-between" *ngIf="s.expectedDeliveryDate"><span class="text-slate-400">Expected delivery</span><span>{{ s.expectedDeliveryDate | date:'mediumDate' }}</span></div>
      <div class="flex justify-between" *ngIf="s.mode"><span class="text-slate-400">Environment</span><span>{{ s.mode }}</span></div>

      <div *ngIf="s.attentionReason" class="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <strong>Needs attention:</strong> {{ s.attentionReason }}
        <div class="flex gap-2 mt-2">
          <button type="button" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-50" [disabled]="busy()" *ngIf="!s.awb" (click)="retry()">Retry creation</button>
          <button type="button" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-50" [disabled]="busy()" *ngIf="s.awb" (click)="resolve()">Mark as reviewed</button>
        </div>
      </div>
      <div *ngIf="s.lastError && !s.attentionReason" class="text-xs text-slate-500">Last message: {{ s.lastError }}</div>

      <div *ngIf="s.timeline.length" class="mt-3 border-t border-slate-100 pt-3">
        <div class="text-xs font-bold text-slate-500 uppercase mb-2">Tracking history</div>
        <div *ngFor="let e of s.timeline" class="flex gap-3 py-1 text-xs">
          <span class="text-slate-400 w-36 shrink-0">{{ e.time | date:'dd MMM, h:mm a' }}</span>
          <span><strong>{{ e.status }}</strong><span *ngIf="e.location" class="text-slate-500"> – {{ e.location }}</span></span>
        </div>
      </div>
    </div>
  </ng-container>
  <div *ngIf="message()" class="mt-3 text-xs" [class.text-red-600]="isError()" [class.text-green-700]="!isError()">{{ message() }}</div>
</div>
  `
})
export class OrderShipmentCardComponent implements OnInit {
  @Input({ required: true }) orderId!: string;
  /** Fires after approve / reject / retry / resolve so the page can reload the order status. */
  @Output() changed = new EventEmitter<void>();
  private svc = inject(FulfilmentService);

  info = signal<OrderShipment | null>(null);
  busy = signal(false);
  rejecting = signal(false);
  message = signal('');
  isError = signal(false);
  reason = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.adminShipment(this.orderId).subscribe({ next: r => this.info.set(r.data ?? null), error: () => this.info.set(null) });
  }

  label(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }

  approve(): void { this.act(this.svc.approve(this.orderId)); }
  reject(): void { this.act(this.svc.reject(this.orderId, this.reason.trim())); }
  retry(): void { this.act(this.svc.retry(this.orderId)); }
  resolve(): void { this.act(this.svc.resolve(this.orderId)); }

  private act(call: ReturnType<FulfilmentService['approve']>): void {
    this.busy.set(true); this.message.set('');
    call.subscribe({
      next: r => { this.busy.set(false); this.rejecting.set(false); this.isError.set(false); this.message.set(String(r.data ?? r.message)); this.load(); this.changed.emit(); },
      error: e => {
        this.busy.set(false); this.isError.set(true);
        const issues: string[] = e?.error?.errors ?? [];
        this.message.set([e?.error?.message || 'The action failed.', ...issues].join(' '));
      }
    });
  }
}
