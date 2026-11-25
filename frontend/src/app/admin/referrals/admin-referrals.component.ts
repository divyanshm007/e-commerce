import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-referrals',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, CurrencyPipe, DatePipe, FormsModule, TableModule, SkeletonModule, SelectModule],
  template: `
<div class="rf-page">

  <!-- Header -->
  <div class="rf-page-header">
    <div>
      <h1 class="rf-page-title">Referral Program</h1>
      <p class="rf-page-sub">Overview of all referral codes and rewards</p>
    </div>
    <button class="rf-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
  </div>

  <!-- KPI Cards -->
  <div class="rf-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3]; track i) {
        <div class="rf-kpi-card rf-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="rf-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="rf-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="rf-kpi-card rf-card-blue">
        <div class="rf-kpi-icon rf-icon-blue"><i class="pi pi-share-alt"></i></div>
        <div class="rf-kpi-num">{{ total() }}</div>
        <div class="rf-kpi-lbl">Total Referrals</div>
      </div>
      <div class="rf-kpi-card rf-card-teal">
        <div class="rf-kpi-icon rf-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="rf-kpi-num">{{ completedCount() }}</div>
        <div class="rf-kpi-lbl">Completed</div>
      </div>
      <div class="rf-kpi-card rf-card-amber">
        <div class="rf-kpi-icon rf-icon-amber"><i class="pi pi-gift"></i></div>
        <div class="rf-kpi-num">{{ totalRewards() | currency:'INR':'symbol':'1.0-0' }}</div>
        <div class="rf-kpi-lbl">Total Rewards Given</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="rf-table-card">

    @if (loading()) {
      <div class="rf-load-toolbar"></div>
      <div class="rf-load-head"></div>
      @for (r of [1,2,3,4,5,6]; track r) {
        <div class="rf-load-row" [style.opacity]="(7-r)/7"></div>
      }
    }

    @if (!loading()) {
      @if (hasActiveFilters()) {
        <div class="rf-filter-bar">
          <span class="rf-filter-info"><i class="pi pi-filter-fill"></i>{{ activeFilterCount() }} filter{{ activeFilterCount() > 1 ? 's' : '' }} applied</span>
          <button class="rf-clear-btn" (click)="clearAllFilters()"><i class="pi pi-times"></i> Clear All</button>
        </div>
      }

      <div class="rf-toolbar">
        <div class="rf-search-wrap">
          <i class="pi pi-search rf-search-icon"></i>
          <input class="rf-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="rf-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="rf-toolbar-spacer"></div>
        <button class="rf-icon-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="referrals()"
        [globalFilterFields]="['referralCode', 'referrerName']"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id" filterDisplay="menu"
        (onFilter)="onTableFilter($event)"
        styleClass="rf-dt" [tableStyle]="{'min-width':'800px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} referrals"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="rf-th-center">#</th>
            <th style="width:130px">
              Code
              <p-columnFilter type="text" field="referralCode" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th pSortableColumn="referrerName">
              Referrer <p-sortIcon field="referrerName" />
              <p-columnFilter type="text" field="referrerName" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false" />
            </th>
            <th style="width:170px">Referred Email</th>
            <th pSortableColumn="status" style="width:110px" class="rf-th-center">
              Status <p-sortIcon field="status" />
              <p-columnFilter field="status" matchMode="equals" display="menu"
                [showMatchModes]="false" [showOperator]="false" [showAddButton]="false">
                <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                  <p-select [options]="statusOptions" [ngModel]="value" (onChange)="filter($event.value)"
                    placeholder="All" [showClear]="true" styleClass="rf-col-sel" />
                </ng-template>
              </p-columnFilter>
            </th>
            <th pSortableColumn="rewardAmount" style="width:100px" class="rf-th-right">
              Reward <p-sortIcon field="rewardAmount" />
            </th>
            <th style="width:80px" class="rf-th-center">Claimed</th>
            <th pSortableColumn="createdAt" style="width:115px">
              Date <p-sortIcon field="createdAt" />
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-r let-i="rowIndex">
          <tr>
            <td class="rf-td-center rf-row-idx">{{ i + 1 }}</td>
            <td><code class="rf-code">{{ r.referralCode }}</code></td>
            <td>
              <div class="rf-referrer-name">{{ r.referrerName }}</div>
              <div class="rf-referrer-email">{{ r.referrerEmail }}</div>
            </td>
            <td><span class="rf-referred-email">{{ r.referredEmail || '—' }}</span></td>
            <td class="rf-td-center">
              <span class="rf-status-pill" [class]="'rf-status-' + r.status?.toLowerCase()">
                <span class="rf-status-dot"></span>{{ r.status }}
              </span>
            </td>
            <td class="rf-td-right"><span class="rf-reward">{{ r.rewardAmount | currency:'INR':'symbol':'1.0-0' }}</span></td>
            <td class="rf-td-center">
              <i [class]="r.rewardClaimed ? 'pi pi-check-circle rf-claimed-yes' : 'pi pi-circle rf-claimed-no'"></i>
            </td>
            <td><span class="rf-date">{{ r.createdAt | date:'dd MMM yyyy' }}</span></td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8">
            <div class="rf-empty">
              <div class="rf-empty-icon"><i class="pi pi-share-alt"></i></div>
              <p class="rf-empty-title">No referrals yet</p>
              <p class="rf-empty-sub">Referrals created by customers will appear here.</p>
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
   REFERRALS — ViewEncapsulation.None, all selectors .rf-*
================================================================ */

.rf-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }
.rf-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.rf-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; }
.rf-page-sub    { font-size: 13px; color: #64748B; margin: 2px 0 0; }
.rf-refresh-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.rf-refresh-btn:hover { background: #F8FAFC; }

/* KPI */
.rf-kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.rf-kpi-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.85); border-top-width: 3px; border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; box-shadow: 0 2px 8px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.07); transition: box-shadow 0.18s,transform 0.18s; }
.rf-kpi-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.07),0 12px 32px rgba(15,23,42,0.09); transform: translateY(-2px); }
.rf-kpi-skeleton { background: rgba(255,255,255,0.82); border: 1px solid rgba(226,232,240,0.85); border-radius: 14px; padding: 16px; min-height: 130px; display: flex; flex-direction: column; }
.rf-card-blue  { border-top-color: #2563EB !important; }
.rf-card-teal  { border-top-color: #0F766E !important; }
.rf-card-amber { border-top-color: #D97706 !important; }
.rf-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 10px; }
.rf-icon-blue  { background: #EFF6FF; color: #2563EB; }
.rf-icon-teal  { background: #F0FDFA; color: #0F766E; }
.rf-icon-amber { background: #FFFBEB; color: #D97706; }
.rf-kpi-num { font-size: 26px; font-weight: 700; color: #0F172A; line-height: 1; letter-spacing: -0.5px; margin-bottom: 5px; font-variant-numeric: tabular-nums; }
.rf-kpi-lbl { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin-top: auto; }
.rf-sk-icon { border-radius: 8px !important; margin-bottom: 10px; display: block; }
.rf-sk-num  { margin-bottom: 6px; display: block; }

/* Table card */
.rf-table-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.035); flex: 1; }
.rf-filter-bar  { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rf-filter-info { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; color: #0F5C4D; }
.rf-clear-btn   { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border: 1px solid #DDEFE9; border-radius: 5px; background: #fff; color: #0F5C4D; font-size: 11px; font-weight: 500; cursor: pointer; }
.rf-load-toolbar { height: 46px; background: #FAFBFC; border-bottom: 1px solid #E2E8F0; }
.rf-load-head    { height: 44px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.rf-load-row     { height: 64px; background: #fff; border-bottom: 1px solid #F1F5F9; }
.rf-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.rf-toolbar-spacer { flex: 1; }
.rf-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.rf-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.rf-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.rf-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.rf-search-input::placeholder { color: #CBD5E1; }
.rf-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.rf-search-clear:hover { background: #CBD5E1; }
.rf-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff; color: #64748B; cursor: pointer; font-size: 12px; }
.rf-col-sel { width: 100% !important; font-size: 12px !important; }

/* Table header/body */
.rf-th-center { text-align: center !important; }
.rf-th-right  { text-align: right !important; }
.rf-td-center { text-align: center !important; }
.rf-td-right  { text-align: right !important; }
.rf-dt .p-datatable-thead > tr > th { background: #F0FDF9 !important; color: #0F5C4D !important; font-size: 10.5px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important; padding: 0 13px !important; height: 44px !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #DDEFE9 !important; white-space: nowrap; }
.rf-dt .p-datatable-thead th svg.p-icon { width: 9px !important; height: 9px !important; min-width: 9px !important; color: #9ECEC5 !important; }
.rf-dt .p-datatable-thead th.p-sort-column svg.p-icon { color: #0F766E !important; }
.rf-dt .p-column-filter-menu-button { width: 16px !important; height: 16px !important; min-width: 16px !important; padding: 0 !important; margin-left: 2px; border-radius: 3px !important; border: none !important; background: transparent !important; color: #B0D8D1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
.rf-dt .p-column-filter-menu-button:hover { background: rgba(15,118,110,0.10) !important; color: #0F766E !important; }
.rf-dt .p-column-filter-menu-button.p-column-filter-menu-button-active { background: #0F766E !important; color: #fff !important; }
.rf-dt .p-datatable-tbody > tr > td { padding: 0 13px !important; height: 64px !important; vertical-align: middle !important; border-top: none !important; border-right: none !important; border-left: none !important; border-bottom: 1px solid #F1F5F9 !important; color: #334155; }
.rf-dt .p-datatable-tbody > tr:last-child > td { border-bottom: none !important; }
.rf-dt .p-datatable-tbody > tr:hover > td { background: #FAFDFC !important; }
.rf-table-card .p-paginator { padding: 6px 12px !important; min-height: 46px; border-top: 1px solid #E2E8F0 !important; border-right: none !important; border-left: none !important; border-bottom: none !important; border-radius: 0 0 14px 14px; background: #FAFBFC !important; font-size: 12px; }
.rf-dt .p-column-filter-overlay button.p-button { display: none !important; }

/* Cells */
.rf-row-idx { font-size: 11.5px; color: #CBD5E1; font-weight: 500; }
.rf-code    { padding: 2px 8px; border-radius: 4px; background: #F1F5F9; color: #0F766E; font-size: 12px; font-weight: 700; font-family: monospace; }
.rf-referrer-name  { font-size: 13px; font-weight: 600; color: #0F172A; }
.rf-referrer-email { font-size: 11px; color: #94A3B8; margin-top: 1px; }
.rf-referred-email { font-size: 12.5px; color: #334155; }
.rf-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.rf-status-dot  { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.rf-status-pending   { background: #FFFBEB; color: #D97706; }
.rf-status-completed { background: #F0FDF4; color: #16A34A; }
.rf-status-expired   { background: #F1F5F9; color: #64748B; }
.rf-reward      { font-size: 13px; font-weight: 600; color: #0F172A; font-variant-numeric: tabular-nums; }
.rf-claimed-yes { font-size: 16px; color: #16A34A; }
.rf-claimed-no  { font-size: 16px; color: #CBD5E1; }
.rf-date        { font-size: 12px; color: #64748B; }
.rf-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; gap: 2px; }
.rf-empty-icon  { width: 36px; height: 36px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.rf-empty-icon .pi { font-size: 16px; color: #94A3B8; }
.rf-empty-title { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 2px; }
.rf-empty-sub   { font-size: 11px; color: #94A3B8; margin: 0; }
@media (max-width: 768px) { .rf-table-card { min-width: 0; overflow-x: auto !important; } }

  `]
})
export class AdminReferralsComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private api = inject(ApiService);

  loading        = signal(true);
  referrals      = signal<any[]>([]);
  total          = signal(0);
  completedCount = computed(() => this.referrals().filter(r => r.status === 'Completed').length);
  totalRewards   = computed(() => this.referrals().filter(r => r.rewardClaimed).reduce((s, r) => s + r.rewardAmount, 0));

  activeFilterCount = signal(0);
  hasActiveFilters  = computed(() => this.activeFilterCount() > 0);

  statusOptions = [
    { label: 'Pending',   value: 'Pending' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Expired',   value: 'Expired' }
  ];

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any>('referral', { page: 1, pageSize: 100 }).subscribe({
      next: res => {
        const items = res.data?.items ?? [];
        this.referrals.set(items);
        this.total.set(res.data?.total ?? items.length);
        this.loading.set(false);
      },
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
}
