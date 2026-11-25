import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-consultation',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgIf, DatePipe, FormsModule, TableModule, SkeletonModule, ToastModule, SelectModule, TooltipModule],
  template: `
<p-toast />

<div class="cn-page">

  <!-- Header -->
  <div class="cn-page-header">
    <div>
      <h1 class="cn-page-title">Consultations</h1>
      <p class="cn-page-sub">{{ totalCount() }} Ayurvedic consultation requests</p>
    </div>
    <button class="cn-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
  </div>

  <!-- KPI Cards -->
  <div class="cn-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="cn-kpi-card cn-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="cn-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="cn-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="cn-kpi-card cn-card-blue">
        <div class="cn-kpi-icon cn-icon-blue"><i class="pi pi-calendar"></i></div>
        <div class="cn-kpi-num">{{ totalCount() }}</div>
        <div class="cn-kpi-lbl">Total Requests</div>
      </div>
      <div class="cn-kpi-card cn-card-amber">
        <div class="cn-kpi-icon cn-icon-amber"><i class="pi pi-clock"></i></div>
        <div class="cn-kpi-num">{{ pendingCount() }}</div>
        <div class="cn-kpi-lbl">Pending</div>
      </div>
      <div class="cn-kpi-card cn-card-teal">
        <div class="cn-kpi-icon cn-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="cn-kpi-num">{{ confirmedCount() }}</div>
        <div class="cn-kpi-lbl">Confirmed</div>
      </div>
      <div class="cn-kpi-card cn-card-green">
        <div class="cn-kpi-icon cn-icon-green"><i class="pi pi-check-square"></i></div>
        <div class="cn-kpi-num">{{ completedCount() }}</div>
        <div class="cn-kpi-lbl">Completed</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="cn-table-card">

    @if (loading()) {
      <div class="cn-load-toolbar"></div>
      <div class="cn-load-head"></div>
      @for (r of [1,2,3,4,5,6]; track r) {
        <div class="cn-load-row" [style.opacity]="(7-r)/7"></div>
      }
    }

    @if (!loading()) {
      @if (hasActiveFilters()) {
        <div class="cn-filter-bar">
          <span class="cn-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="cn-clear-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="cn-toolbar">
        <div class="cn-search-wrap">
          <i class="pi pi-search cn-search-icon"></i>
          <input class="cn-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="cn-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cn-toolbar-spacer"></div>
        <button class="cn-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="consultations()"
        [globalFilterFields]="['name', 'email']"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="cn-dt" [tableStyle]="{'min-width':'860px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="cn-th-center">#</th>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th style="width:180px">Contact</th>
            <th>Concern</th>
            <th style="width:140px">Preferred Date</th>
            <th style="width:100px" class="cn-th-center">Dosha</th>
            <th pSortableColumn="status" style="width:120px" class="cn-th-center">
              Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value" (onChange)="filter($event.value)"
                    placeholder="All" [showClear]="true" styleClass="cn-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th style="width:160px" class="cn-th-center">Update Status</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-c let-i="rowIndex">
          <tr>
            <td class="cn-td-center cn-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="cn-name-cell">
                <div class="cn-avatar">{{ initials(c.name) }}</div>
                <div>
                  <div class="cn-name">{{ c.name }}</div>
                  <div class="cn-date">{{ c.createdAt | date:'dd MMM yyyy' }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="cn-contact-email">{{ c.email }}</div>
              <div class="cn-contact-phone">{{ c.phone }}</div>
            </td>
            <td>
              <div class="cn-concern">{{ c.concern }}</div>
            </td>
            <td>
              <div class="cn-pref-date" *ngIf="c.preferredDate">{{ c.preferredDate }}</div>
              <div class="cn-pref-time" *ngIf="c.preferredTime">{{ c.preferredTime }}</div>
              <span class="cn-na" *ngIf="!c.preferredDate">—</span>
            </td>
            <td class="cn-td-center">
              <span class="cn-dosha-badge" *ngIf="c.doshaType">{{ c.doshaType }}</span>
              <span class="cn-na" *ngIf="!c.doshaType">—</span>
            </td>
            <td class="cn-td-center">
              <span class="cn-status-pill" [class]="'cn-status-' + c.status?.toLowerCase()">
                <span class="cn-status-dot"></span>{{ c.status }}
              </span>
            </td>
            <td class="cn-td-center">
              <p-select [options]="statusOptions" [ngModel]="c.status" optionLabel="label" optionValue="value"
                (onChange)="updateStatus(c.id, $event.value)" styleClass="cn-row-sel" />
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="cn-empty">
              <div class="cn-empty-icon"><i class="pi pi-calendar"></i></div>
              <p class="cn-empty-title">No consultation requests</p>
              <p class="cn-empty-sub">Requests submitted by customers will appear here.</p>
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
   CONSULTATIONS — ViewEncapsulation.None, all selectors .cn-*
================================================================ */

.cn-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }
.cn-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.cn-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; }
.cn-page-sub      { font-size: 13px; color: #64748B; margin: 2px 0 0; }
.cn-refresh-btn   { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.cn-refresh-btn:hover { background: #F8FAFC; }

/* KPI */
.cn-kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.cn-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.cn-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.cn-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.cn-card-blue  { border-top-color: #2563EB !important; }
.cn-card-amber { border-top-color: #D97706 !important; }
.cn-card-teal  { border-top-color: #0F766E !important; }
.cn-card-green { border-top-color: #16A34A !important; }
.cn-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; }
.cn-icon-blue  { background: #EFF6FF; color: #2563EB; }
.cn-icon-amber { background: #FFFBEB; color: #D97706; }
.cn-icon-teal  { background: #F0FDFA; color: #0F766E; }
.cn-icon-green { background: #F0FDF4; color: #16A34A; }
.cn-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; margin-bottom: 5px; font-variant-numeric: tabular-nums; }
.cn-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.cn-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.cn-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.cn-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.cn-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cn-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.cn-clear-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.cn-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.cn-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.cn-load-row     { height: 72px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.cn-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.cn-toolbar-spacer { flex: 1; }
.cn-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.cn-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.cn-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.cn-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.cn-search-input::placeholder { color: #CBD5E1; }
.cn-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.cn-search-clear:hover { background: #CBD5E1; }
.cn-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.cn-col-sel  { width: 100% !important; font-size: 12px !important; }
.cn-row-sel  { font-size: 12px !important; min-width: 130px; }

/* Table header */
.cn-th-center { text-align: center !important; }
.cn-td-center { text-align: center !important; }
.cn-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.cn-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; }
.cn-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.cn-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.cn-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.cn-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.cn-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 72px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.cn-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.cn-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.cn-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.cn-dt .p-column-filter-overlay button.p-button { display: none !important; }

/* Cells */
.cn-row-idx { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.cn-name-cell { display: flex; align-items: center; gap: 9px; }
.cn-avatar    { width: 32px; height: 32px; border-radius: 8px; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; border: 1px solid #CCFBF1; }
.cn-name      { font-size: 13px; font-weight: 600; color: #0F172A; }
.cn-date      { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.cn-contact-email { font-size: 12.5px; color: #334155; }
.cn-contact-phone { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.cn-concern  { font-size: 12.5px; color: #334155; line-height: 1.4; max-width: 220px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cn-pref-date { font-size: 12.5px; color: #334155; }
.cn-pref-time { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.cn-na        { font-size: 12px; color: #CBD5E1; }
.cn-dosha-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; background: #F0FDF4; color: #16A34A; font-size: 11px; font-weight: 600; }
.cn-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.cn-status-dot  { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.cn-status-pending   { background: #FFFBEB; color: #D97706; }
.cn-status-confirmed { background: #EFF6FF; color: #2563EB; }
.cn-status-completed { background: #F0FDF4; color: #16A34A; }
.cn-status-cancelled { background: #FEF2F2; color: #DC2626; }
.cn-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; gap: 2px; }
.cn-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.cn-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.cn-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.cn-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }
@media (max-width: 768px) { .cn-table-card { min-width: 0; overflow-x: auto !important; } }

  `]
})
export class AdminConsultationComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private api   = inject(ApiService);
  private toast = inject(MessageService);

  loading       = signal(true);
  consultations = signal<any[]>([]);

  totalCount    = computed(() => this.consultations().length);
  pendingCount  = computed(() => this.consultations().filter(c => c.status === 'Pending').length);
  confirmedCount = computed(() => this.consultations().filter(c => c.status === 'Confirmed').length);
  completedCount = computed(() => this.consultations().filter(c => c.status === 'Completed').length);

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Pending',   value: 'Pending' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<any>('consultation', { page: 1, pageSize: 100 }).subscribe({
      next: res => { this.consultations.set(res.data?.items ?? []); this.loading.set(false); },
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

  updateStatus(id: string, status: string) {
    this.api.patch(`consultation/${id}/status`, { status }).subscribe({
      next: () => {
        this.consultations.update(list => list.map(c => c.id === id ? { ...c, status } : c));
        this.toast.add({ severity: 'success', summary: 'Updated', detail: 'Status updated', life: 2000 });
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Update failed', life: 3000 })
    });
  }

  initials(name: string): string {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
