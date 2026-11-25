import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor, CurrencyPipe, DatePipe } from '@angular/common';
import { FulfilmentService, FulfilmentDashboard, FulfilmentQueue, FulfilmentRow } from '../../core/services/fulfilment.service';

interface Tab { key: FulfilmentQueue; label: string; count: (d: FulfilmentDashboard) => number; }

/** Fulfilment overview: the approval queue and the automatic pipeline. Approving is the only manual dispatch step. */
@Component({
  selector: 'app-admin-fulfilment',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor, CurrencyPipe, DatePipe],
  template: `
<div class="min-h-screen bg-slate-50 p-6 flex flex-col gap-5">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 m-0">Fulfilment</h1>
      <p class="text-sm text-slate-500 m-0">Approve an order and the shipment is created and tracked automatically.</p>
    </div>
    <div class="flex items-center gap-3">
      <span *ngIf="dash() as d" class="px-3 py-1 rounded-full text-xs font-bold"
            [class.bg-amber-100]="d.mode !== 'live'" [class.text-amber-800]="d.mode !== 'live'"
            [class.bg-green-100]="d.mode === 'live'" [class.text-green-800]="d.mode === 'live'">
        Delhivery: {{ d.mode === 'invalid' ? 'INVALID MODE' : d.mode.toUpperCase() }}
      </span>
      <button type="button" class="ful-refresh-btn" title="Refresh" aria-label="Refresh" (click)="reload()"><i class="pi pi-refresh"></i></button>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-6 gap-3" *ngIf="dash() as d">
    <button type="button" *ngFor="let t of tabs" (click)="select(t.key)"
            class="text-left bg-white rounded-xl border p-4 shadow-sm"
            [class.border-green-500]="active() === t.key" [class.border-slate-100]="active() !== t.key">
      <div class="text-2xl font-bold text-slate-900">{{ t.count(d) }}</div>
      <div class="text-xs text-slate-500">{{ t.label }}</div>
    </button>
  </div>

  <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
          <th class="p-3">Order</th><th class="p-3">Customer</th><th class="p-3">Payment</th><th class="p-3">Total</th>
          <th class="p-3">Shipment</th><th class="p-3">Notes</th><th class="p-3"></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of rows()" class="border-b border-slate-50 align-top">
          <td class="p-3"><a [routerLink]="['/admin/orders', r.orderId]" class="text-green-700 font-semibold">#{{ r.orderNumber }}</a>
            <div class="text-xs text-slate-400">{{ r.orderDate | date:'dd MMM, h:mm a' }}</div></td>
          <td class="p-3">{{ r.customerName }}</td>
          <td class="p-3">{{ r.paymentMethod }}<div class="text-xs text-slate-400">{{ r.paymentStatus }}</div></td>
          <td class="p-3">{{ r.totalAmount | currency:'INR':'symbol':'1.0-0' }}</td>
          <td class="p-3">
            <div *ngIf="r.awb" class="font-mono text-xs">{{ r.awb }}</div>
            <div class="text-xs text-slate-500">{{ label(r.shipmentStatus || r.fulfilmentState) }}</div>
          </td>
          <td class="p-3 text-xs">
            <div *ngFor="let i of r.issues" class="text-red-600">{{ i }}</div>
            <div *ngIf="r.attentionReason" class="text-amber-700">{{ r.attentionReason }}</div>
            <div *ngIf="!r.attentionReason && r.lastError" class="text-slate-500">{{ r.lastError }}</div>
          </td>
          <td class="p-3 whitespace-nowrap">
            <ng-container *ngIf="active() === 'awaiting-approval'">
              <button type="button" class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-40" [disabled]="busy() || !r.eligible" (click)="approve(r)">Approve</button>
              <button type="button" class="ml-2 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold disabled:opacity-40" [disabled]="busy()" (click)="reject(r)">Reject</button>
            </ng-container>
            <ng-container *ngIf="active() === 'exceptions' || active() === 'creation-failures'">
              <button type="button" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-40" [disabled]="busy()" *ngIf="!r.awb" (click)="retry(r)">Retry</button>
              <button type="button" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-40" [disabled]="busy()" *ngIf="r.awb" (click)="resolve(r)">Mark reviewed</button>
            </ng-container>
          </td>
        </tr>
        <tr *ngIf="!loading() && rows().length === 0"><td colspan="7" class="p-6 text-center text-slate-400">Nothing here.</td></tr>
      </tbody>
    </table>
  </div>
  <div *ngIf="message()" class="text-sm" [class.text-red-600]="isError()" [class.text-green-700]="!isError()">{{ message() }}</div>
</div>
  `,
  styles: [`
    .ful-refresh-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
      background: #fff; color: #64748B; cursor: pointer; font-size: 12px; padding: 0;
      transition: background 0.14s, color 0.14s, border-color 0.14s;
    }
    .ful-refresh-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }
  `]
})
export class AdminFulfilmentComponent implements OnInit {
  private svc = inject(FulfilmentService);

  readonly tabs: Tab[] = [
    { key: 'awaiting-approval', label: 'Awaiting approval', count: d => d.awaitingApproval },
    { key: 'awaiting-shipment', label: 'Approved, awaiting shipment', count: d => d.approvedAwaitingShipment },
    { key: 'creation-failures', label: 'Creation failures', count: d => d.creationFailures },
    { key: 'in-transit', label: 'In transit', count: d => d.inTransit },
    { key: 'delivered', label: 'Delivered', count: d => d.delivered },
    { key: 'exceptions', label: 'Exceptions', count: d => d.exceptions },
  ];

  dash = signal<FulfilmentDashboard | null>(null);
  rows = signal<FulfilmentRow[]>([]);
  active = signal<FulfilmentQueue>('awaiting-approval');
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  isError = signal(false);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.svc.dashboard().subscribe({ next: r => this.dash.set(r.data ?? null), error: () => this.dash.set(null) });
    this.loadRows();
  }

  select(k: FulfilmentQueue): void { this.active.set(k); this.message.set(''); this.loadRows(); }

  private loadRows(): void {
    this.loading.set(true);
    this.svc.queue(this.active(), 1, 50).subscribe({
      next: r => { this.rows.set([...(r.data?.items ?? [])]); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  label(v?: string | null): string { return (v ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }

  approve(r: FulfilmentRow): void { this.act(this.svc.approve(r.orderId)); }
  retry(r: FulfilmentRow): void { this.act(this.svc.retry(r.orderId)); }
  resolve(r: FulfilmentRow): void { this.act(this.svc.resolve(r.orderId)); }
  reject(r: FulfilmentRow): void {
    const reason = window.prompt(`Reason for rejecting order #${r.orderNumber}?`)?.trim();
    if (reason) this.act(this.svc.reject(r.orderId, reason));
  }

  private act(call: ReturnType<FulfilmentService['approve']>): void {
    this.busy.set(true); this.message.set('');
    call.subscribe({
      next: res => { this.busy.set(false); this.isError.set(false); this.message.set(String(res.data ?? res.message)); this.reload(); },
      error: e => {
        this.busy.set(false); this.isError.set(true);
        this.message.set([e?.error?.message || 'The action failed.', ...(e?.error?.errors ?? [])].join(' '));
      }
    });
  }
}
