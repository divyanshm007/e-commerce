import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-admin-newsletter',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [
    NgIf, FormsModule,
    TableModule, ButtonModule, SkeletonModule,
    ToastModule, SelectModule, TooltipModule
  ],
  template: `
<p-toast />

<div class="nl-page">

  <!-- Page Header -->
  <div class="nl-page-header">
    <div>
      <h1 class="nl-page-title">Newsletter</h1>
      <p class="nl-page-sub">{{ totalSubscribers() }} email subscribers</p>
    </div>
    <div class="nl-header-actions">
      <button class="nl-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      <button class="nl-export-btn" (click)="exportCsv()" [disabled]="loading()">
        <i class="pi pi-download"></i> Export CSV
      </button>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="nl-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3]; track i) {
        <div class="nl-kpi-card nl-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="nl-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="nl-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="nl-kpi-card nl-card-blue">
        <div class="nl-kpi-icon nl-icon-blue"><i class="pi pi-users"></i></div>
        <div class="nl-kpi-num">{{ totalSubscribers() }}</div>
        <div class="nl-kpi-lbl">Total Subscribers</div>
      </div>
      <div class="nl-kpi-card nl-card-teal">
        <div class="nl-kpi-icon nl-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="nl-kpi-num">{{ activeSubscribers() }}</div>
        <div class="nl-kpi-lbl">Subscribed</div>
      </div>
      <div class="nl-kpi-card nl-card-red">
        <div class="nl-kpi-icon nl-icon-red"><i class="pi pi-times-circle"></i></div>
        <div class="nl-kpi-num">{{ inactiveSubscribers() }}</div>
        <div class="nl-kpi-lbl">Unsubscribed</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="nl-table-card">

    @if (loading()) {
      <div class="nl-load-toolbar"></div>
      <div class="nl-load-head"></div>
      @for (r of [1,2,3,4,5,6,7,8]; track r) {
        <div class="nl-load-row" [style.opacity]="(9-r)/9"></div>
      }
    }

    @if (!loading()) {

      @if (hasActiveFilters()) {
        <div class="nl-filter-bar">
          <span class="nl-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="nl-clear-all-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="nl-toolbar">
        <div class="nl-search-wrap">
          <i class="pi pi-search nl-search-icon"></i>
          <input class="nl-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="nl-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="nl-toolbar-spacer"></div>
        <button class="nl-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="subscribers()"
        [globalFilterFields]="['email', 'name']"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50,100]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="nl-dt" [tableStyle]="{'min-width':'500px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} subscribers"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:48px" class="nl-th-center">#</th>
            <th pSortableColumn="email">
              Email <p-sortIcon field="email" />
              <p-columnFilter type="text" field="email" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="name" style="width:180px">
              Name <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="subscribedAt" style="width:140px">
              Subscribed <p-sortIcon field="subscribedAt" />
            </th>
            <th style="width:130px">
              Status
              <p-columnFilter field="isActive" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value"
                    (onChange)="filter($event.value)" placeholder="All"
                    [showClear]="true" styleClass="nl-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-s let-i="rowIndex">
          <tr>
            <td class="nl-td-center nl-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="nl-email-cell">
                <div class="nl-avatar">{{ initials(s.email) }}</div>
                <span class="nl-email">{{ s.email }}</span>
              </div>
            </td>
            <td>
              <span class="nl-name" *ngIf="s.name">{{ s.name }}</span>
              <span class="nl-no-name" *ngIf="!s.name">—</span>
            </td>
            <td>
              <span class="nl-date">{{ formatDate(s.subscribedAt || s.createdAt) }}</span>
            </td>
            <td>
              <span class="nl-status-badge"
                [class.nl-status-active]="s.isActive !== false"
                [class.nl-status-inactive]="s.isActive === false">
                <span class="nl-status-dot"></span>
                {{ s.isActive !== false ? 'Subscribed' : 'Unsubscribed' }}
              </span>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5">
            <div class="nl-empty">
              <div class="nl-empty-icon"><i class="pi pi-envelope"></i></div>
              <p class="nl-empty-title">No subscribers found</p>
              <p class="nl-empty-sub">{{ totalSubscribers() === 0 ? 'No one has subscribed yet.' : 'Try adjusting your filters.' }}</p>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>
  `,
  styles: [`

/* ================================================================
   NEWSLETTER — ViewEncapsulation.None, all selectors .nl-*
================================================================ */

.nl-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.nl-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.nl-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.nl-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.nl-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.nl-refresh-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; transition: background 0.14s; }
.nl-refresh-btn:hover { background: #F8FAFC; color: #0F172A; }
.nl-export-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; background: #fff; color: #334155; font-size: 12px; font-weight: 600; border: 1px solid #E2E8F0; cursor: pointer; transition: background 0.13s,border-color 0.13s; }
.nl-export-btn:hover:not(:disabled) { background: #F8FAFC; border-color: #CBD5E1; }
.nl-export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.nl-export-btn .pi { font-size: 11px; color: #0F766E; }

/* KPI — 3 cols */
.nl-kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.nl-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.nl-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.nl-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.nl-card-blue { border-top-color: #2563EB !important; }
.nl-card-teal { border-top-color: #0F766E !important; }
.nl-card-red  { border-top-color: #DC2626 !important; }
.nl-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.nl-icon-blue { background: #EFF6FF; color: #2563EB; }
.nl-icon-teal { background: #F0FDFA; color: #0F766E; }
.nl-icon-red  { background: #FEF2F2; color: #DC2626; }
.nl-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; margin-bottom: 5px; }
.nl-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.nl-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.nl-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.nl-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.nl-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.nl-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.nl-filter-info .pi { font-size: 11px; }
.nl-clear-all-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.nl-clear-all-btn .pi { font-size: 10px; }
.nl-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.nl-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.nl-load-row     { height: 52px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.nl-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.nl-toolbar-spacer { flex: 1; }
.nl-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.nl-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.nl-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.nl-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.nl-search-input::placeholder { color: #CBD5E1; }
.nl-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.nl-search-clear:hover { background: #CBD5E1; }
.nl-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.nl-icon-btn:hover { background: #F8FAFC; }

/* Table header */
.nl-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.nl-th-center { text-align: center !important; }
.nl-td-center { text-align: center !important; }
.nl-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; vertical-align: middle; }
.nl-dt .p-datatable-thead th:hover svg.p-icon { color: #0F766E !important; }
.nl-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.nl-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.nl-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.nl-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.nl-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 52px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.nl-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.nl-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.nl-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.nl-col-sel { width: 100% !important; font-size: 12px !important; }

/* Cell content */
.nl-row-idx { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.nl-email-cell { display: flex; align-items: center; gap: 9px; }
.nl-avatar { width: 28px; height: 28px; border-radius: 50%; background: #DBEAFE; color: #2563EB; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; }
.nl-email { font-size: 13px; font-weight: 500; color: #0F172A; }
.nl-name    { font-size: 12.5px; color: #475569; }
.nl-no-name { font-size: 12px; color: #CBD5E1; }
.nl-date    { font-size: 12px; color: #64748B; }

.nl-status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.nl-status-dot   { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.nl-status-active   { background: #F0FDF4; color: #16A34A; }
.nl-status-inactive { background: #FEF2F2; color: #DC2626; }

.nl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; gap: 2px; }
.nl-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.nl-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.nl-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.nl-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }
@media (max-width: 768px) { .nl-table-card { min-width: 0; overflow-x: auto !important; } }

  `]
})
export class AdminNewsletterComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private contentService = inject(ContentService);
  private toast = inject(MessageService);

  loading     = signal(true);
  subscribers = signal<any[]>([]);

  totalSubscribers    = computed(() => this.subscribers().length);
  activeSubscribers   = computed(() => this.subscribers().filter(s => s.isActive !== false).length);
  inactiveSubscribers = computed(() => this.subscribers().filter(s => s.isActive === false).length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Subscribed',   value: true },
    { label: 'Unsubscribed', value: false }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.contentService.getSubscribers().subscribe({
      next: res => { this.subscribers.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onTableFilter(event: any): void {
    let count = 0;
    for (const key of Object.keys(event.filters ?? {})) {
      const rules = event.filters[key];
      if (Array.isArray(rules)) count += rules.filter((r: any) => r.value !== null && r.value !== undefined && r.value !== '').length;
    }
    this.activeFilterCount.set(count);
  }

  clearAllFilters(): void { this.dt.clear(); this.activeFilterCount.set(0); }

  initials(email: string): string {
    return (email?.[0] ?? '?').toUpperCase();
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  exportCsv() {
    const rows = this.subscribers().map((s: any) =>
      `${s.email},${s.name ?? ''},${s.subscribedAt ?? s.createdAt ?? ''},${s.isActive !== false ? 'Subscribed' : 'Unsubscribed'}`
    );
    const csv = 'Email,Name,Subscribed On,Status\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.add({ severity: 'success', summary: 'Exported', detail: 'CSV file downloaded', life: 2000 });
  }
}
