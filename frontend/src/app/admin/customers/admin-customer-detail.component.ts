import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf, NgFor, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface CustomerAddress { id: string; fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean; }
interface CustomerOrder { id: string; orderNumber: string; totalAmount: number; status: number | string; createdAt: string; }
interface CustomerDetail {
  id: string; fullName: string; email: string; phone?: string; orderCount: number; totalSpent: number;
  createdAt: string; lastLoginAt?: string; isActive: boolean; addresses: CustomerAddress[]; recentOrders: CustomerOrder[];
}

const STATUS = ['', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

/** Admin customer page, opened from the eye icon in the customer list. */
@Component({
  selector: 'app-admin-customer-detail',
  standalone: true,
  imports: [NgIf, NgFor, CurrencyPipe, DatePipe, RouterLink],
  template: `
<div class="max-w-4xl mx-auto p-4 flex flex-col gap-4">
  <a routerLink="/admin/customers" class="text-sm font-semibold text-green-700 no-underline">&larr; Back to customers</a>

  <div *ngIf="loading()" class="text-slate-600">Loading…</div>
  <div *ngIf="error()" class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{{ error() }}</div>

  <ng-container *ngIf="c() as u">
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 justify-between items-start">
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-slate-900 m-0 break-words">{{ u.fullName }}</h1>
        <div class="text-sm text-slate-700 break-all mt-1">{{ u.email }}</div>
        <div class="text-sm text-slate-700" *ngIf="u.phone">{{ u.phone }}</div>
        <span class="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold"
              [class]="u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">{{ u.isActive ? 'Active' : 'Inactive' }}</span>
      </div>
      <button type="button" (click)="toggle()" [disabled]="busy()"
              class="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50">
        {{ u.isActive ? 'Deactivate account' : 'Activate account' }}
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-600">Orders</div><div class="text-xl font-bold text-slate-900">{{ u.orderCount }}</div></div>
      <div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-600">Total spent</div><div class="text-xl font-bold text-slate-900">{{ u.totalSpent | currency:'INR':'symbol':'1.0-0' }}</div></div>
      <div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-600">Joined</div><div class="text-sm font-semibold text-slate-900">{{ u.createdAt | date:'mediumDate' }}</div></div>
      <div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-600">Last login</div><div class="text-sm font-semibold text-slate-900">{{ u.lastLoginAt ? (u.lastLoginAt | date:'medium') : 'Never' }}</div></div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 class="text-base font-bold text-slate-900 m-0 mb-3">Recent orders</h2>
      <div *ngIf="!u.recentOrders.length" class="text-sm text-slate-600">No orders yet.</div>
      <a *ngFor="let o of u.recentOrders" [routerLink]="['/admin/orders', o.id]"
         class="flex flex-wrap justify-between gap-2 py-2 border-b border-slate-100 last:border-0 no-underline text-slate-900 text-sm">
        <span class="font-semibold">{{ o.orderNumber }}</span>
        <span class="text-slate-600">{{ o.createdAt | date:'dd MMM yyyy' }}</span>
        <span>{{ statusName(o.status) }}</span>
        <span class="font-semibold">{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
      </a>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 class="text-base font-bold text-slate-900 m-0 mb-3">Addresses</h2>
      <div *ngIf="!u.addresses.length" class="text-sm text-slate-600">No saved addresses.</div>
      <div class="grid gap-3 md:grid-cols-2">
        <div *ngFor="let a of u.addresses" class="border border-slate-200 rounded-lg p-3 text-sm text-slate-800">
          <div class="font-semibold">{{ a.fullName }} <span *ngIf="a.isDefault" class="ml-1 text-xs text-green-700">Default</span></div>
          <div>{{ a.line1 }}<span *ngIf="a.line2">, {{ a.line2 }}</span></div>
          <div>{{ a.city }}, {{ a.state }} {{ a.postalCode }}</div>
          <div>{{ a.phone }}</div>
        </div>
      </div>
    </div>
  </ng-container>
</div>
  `
})
export class AdminCustomerDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  c = signal<CustomerDetail | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<CustomerDetail>(`customers/${id}`).subscribe({
      next: r => { this.c.set(r.data ?? null); this.loading.set(false); if (!r.data) this.error.set('Customer not found.'); },
      error: () => { this.loading.set(false); this.error.set('Could not load this customer.'); }
    });
  }

  statusName(s: number | string): string { return typeof s === 'number' ? (STATUS[s] ?? String(s)) : s; }

  toggle(): void {
    const u = this.c(); if (!u) return;
    this.busy.set(true);
    this.api.patch<{ isActive: boolean }>(`customers/${u.id}/toggle-active`).subscribe({
      next: r => { this.busy.set(false); this.c.set({ ...u, isActive: r.data?.isActive ?? !u.isActive }); },
      error: () => { this.busy.set(false); this.error.set('Could not change the account status.'); }
    });
  }
}
