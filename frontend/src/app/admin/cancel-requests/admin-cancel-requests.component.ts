import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

interface CancelRow {
  id: string; orderId: string; orderNumber: string; customerName: string; customerEmail: string; reason: string;
  status: string; wasDispatched: boolean; orderStatus: string; awb?: string | null; adminNotes?: string | null; createdAt: string;
}

/** Customers ask to cancel an order that is already dispatched; here an administrator approves or declines. */
@Component({
  selector: 'app-admin-cancel-requests',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor, DatePipe],
  template: `
<div class="min-h-screen bg-slate-50 p-6 flex flex-col gap-5">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 m-0">Cancellation requests</h1>
      <p class="text-sm text-slate-500 m-0">An order that is already dispatched is cancelled only after you approve.</p>
    </div>
    <div class="flex gap-2">
      <button type="button" *ngFor="let t of tabs" (click)="select(t.key)"
              class="px-3 py-2 rounded-lg text-sm font-semibold border"
              [class.bg-green-600]="status() === t.key" [class.text-white]="status() === t.key" [class.border-slate-300]="status() !== t.key">{{ t.label }}</button>
    </div>
  </div>

  <div class="flex flex-col gap-3">
    <div *ngFor="let r of rows()" class="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-2">
      <div class="flex justify-between flex-wrap gap-2">
        <a [routerLink]="['/admin/orders', r.orderId]" class="text-green-700 font-semibold">#{{ r.orderNumber }}</a>
        <span class="text-xs text-slate-400">{{ r.createdAt | date:'dd MMM yyyy, h:mm a' }}</span>
      </div>
      <div class="text-sm text-slate-700">{{ r.customerName }} <span class="text-slate-400">({{ r.customerEmail }})</span></div>
      <div class="text-sm"><strong>Reason:</strong> {{ r.reason }}</div>
      <div class="text-xs text-slate-500">Order status: {{ r.orderStatus }}<span *ngIf="r.awb"> · AWB {{ r.awb }}</span><span *ngIf="r.wasDispatched"> · already dispatched</span></div>
      <div *ngIf="r.adminNotes" class="text-xs text-slate-500">Your note: {{ r.adminNotes }}</div>
      <div *ngIf="r.status === 'Pending'" class="flex flex-col gap-2 mt-1">
        <input class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Note for the customer (optional)" [value]="notes[r.id] || ''" (input)="notes[r.id] = $any($event.target).value" />
        <div class="flex gap-2">
          <button type="button" class="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50" [disabled]="busy()" (click)="act(r, 'approve')">Approve cancellation</button>
          <button type="button" class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-50" [disabled]="busy()" (click)="act(r, 'reject')">Decline</button>
        </div>
        <p *ngIf="r.wasDispatched" class="text-xs text-amber-700 m-0">If you approve, also cancel the shipment in the Delhivery portal so the parcel is not delivered.</p>
      </div>
      <div *ngIf="r.status !== 'Pending'" class="text-xs font-semibold" [class.text-green-700]="r.status === 'Approved'" [class.text-red-600]="r.status === 'Rejected'">{{ r.status }}</div>
    </div>
    <p *ngIf="!loading() && !rows().length" class="text-slate-400 text-center py-10 m-0">Nothing here.</p>
  </div>
  <div *ngIf="message()" class="text-sm" [class.text-red-600]="isError()" [class.text-green-700]="!isError()">{{ message() }}</div>
</div>
  `
})
export class AdminCancelRequestsComponent implements OnInit {
  private api = inject(ApiService);
  readonly tabs = [{ key: 'Pending', label: 'Waiting' }, { key: 'Approved', label: 'Approved' }, { key: 'Rejected', label: 'Declined' }];
  rows = signal<CancelRow[]>([]);
  status = signal('Pending');
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  isError = signal(false);
  notes: Record<string, string> = {};

  ngOnInit(): void { this.load(); }

  select(k: string): void { this.status.set(k); this.message.set(''); this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.get<any>('cancel-requests', { status: this.status(), page: 1, pageSize: 50 }).subscribe({
      next: r => { this.rows.set([...(r.data?.items ?? [])]); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  act(r: CancelRow, what: 'approve' | 'reject'): void {
    this.busy.set(true); this.message.set('');
    this.api.post<string>(`cancel-requests/${r.id}/${what}`, { notes: this.notes[r.id] || null }).subscribe({
      next: res => { this.busy.set(false); this.isError.set(false); this.message.set(String(res.data ?? res.message)); this.load(); },
      error: e => { this.busy.set(false); this.isError.set(true); this.message.set(e?.error?.message || 'The action failed.'); }
    });
  }
}
