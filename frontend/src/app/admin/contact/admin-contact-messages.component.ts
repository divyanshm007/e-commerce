import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-contact-messages',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [NgIf, DatePipe, FormsModule, TableModule, SkeletonModule, ToastModule, TooltipModule, ConfirmDialogModule],
  template: `
<p-toast />
<p-confirmDialog />

<div class="cm-page">

  <!-- Header -->
  <div class="cm-page-header">
    <div>
      <h1 class="cm-page-title">Contact Messages</h1>
      <p class="cm-page-sub">{{ messages().length }} message{{ messages().length !== 1 ? 's' : '' }} received</p>
    </div>
    <button class="cm-refresh-btn" (click)="load()" pTooltip="Refresh" tooltipPosition="left">
      <i class="pi pi-refresh"></i>
    </button>
  </div>

  <!-- KPI Cards -->
  <div class="cm-kpi-row">
    @if (loading()) {
      @for (i of [1,2,3,4]; track i) {
        <div class="cm-kpi-card cm-kpi-skeleton">
          <p-skeleton width="36px" height="36px" />
          <p-skeleton width="55%" height="26px" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!loading()) {
      <div class="cm-kpi-card cm-card-blue">
        <div class="cm-kpi-icon cm-icon-blue"><i class="pi pi-inbox"></i></div>
        <div class="cm-kpi-num">{{ messages().length }}</div>
        <div class="cm-kpi-lbl">Total Messages</div>
      </div>
      <div class="cm-kpi-card cm-card-amber">
        <div class="cm-kpi-icon cm-icon-amber"><i class="pi pi-envelope"></i></div>
        <div class="cm-kpi-num">{{ unreadCount() }}</div>
        <div class="cm-kpi-lbl">Unread</div>
      </div>
      <div class="cm-kpi-card cm-card-teal">
        <div class="cm-kpi-icon cm-icon-teal"><i class="pi pi-calendar"></i></div>
        <div class="cm-kpi-num">{{ todayCount() }}</div>
        <div class="cm-kpi-lbl">Today</div>
      </div>
      <div class="cm-kpi-card cm-card-violet">
        <div class="cm-kpi-icon cm-icon-violet"><i class="pi pi-calendar-times"></i></div>
        <div class="cm-kpi-num">{{ thisWeekCount() }}</div>
        <div class="cm-kpi-lbl">This Week</div>
      </div>
    }
  </div>

  <!-- Table Card -->
  <div class="cm-table-card">

    @if (loading()) {
      <div class="cm-load-toolbar"></div>
      <div class="cm-load-head"></div>
      @for (r of [1,2,3,4,5,6]; track r) {
        <div class="cm-load-row" [style.opacity]="(7-r)/7"></div>
      }
    }

    @if (!loading()) {
      <div class="cm-toolbar">
        <div class="cm-search-wrap">
          <i class="pi pi-search cm-search-icon"></i>
          <input class="cm-search-input" type="text" placeholder="Search by name, email or message…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="cm-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="cm-toolbar-spacer"></div>
        <button class="cm-icon-btn" (click)="load()" pTooltip="Refresh"><i class="pi pi-refresh"></i></button>
      </div>

      <p-table #dt
        [value]="messages()"
        [globalFilterFields]="['name', 'email', 'phone', 'subject', 'message']"
        [paginator]="true" [rows]="25" [rowsPerPageOptions]="[10,25,50]"
        dataKey="id"
        styleClass="cm-dt" [tableStyle]="{'min-width':'860px'}"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} messages"
        [sortField]="'createdAt'" [sortOrder]="-1"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="cm-th-center">#</th>
            <th pSortableColumn="name" style="width:160px">Name <p-sortIcon field="name" /></th>
            <th style="width:200px">Contact</th>
            <th>Subject &amp; Message</th>
            <th style="width:90px" class="cm-th-center">Status</th>
            <th pSortableColumn="createdAt" style="width:130px" class="cm-th-center">
              Date <p-sortIcon field="createdAt" />
            </th>
            <th style="width:70px" class="cm-th-center">Action</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-msg let-i="rowIndex">
          <tr [class.cm-row-unread]="!msg.isRead">
            <td class="cm-td-center cm-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="cm-name-cell">
                <div class="cm-avatar">{{ initials(msg.name) }}</div>
                <div class="cm-name">{{ msg.name }}</div>
              </div>
            </td>
            <td>
              <div class="cm-contact-email">
                <i class="pi pi-envelope"></i>
                <a [href]="'mailto:' + msg.email" class="cm-email-link">{{ msg.email }}</a>
              </div>
              <div class="cm-contact-phone" *ngIf="msg.phone">
                <i class="pi pi-phone"></i>
                {{ msg.phone }}
              </div>
            </td>
            <td>
              <div class="cm-subject" *ngIf="msg.subject">{{ msg.subject }}</div>
              <div class="cm-message-full">{{ msg.message }}</div>
            </td>
            <td class="cm-td-center">
              <span class="cm-badge" [class.cm-badge-new]="!msg.isRead" [class.cm-badge-read]="msg.isRead">
                {{ msg.isRead ? 'Read' : 'New' }}
              </span>
            </td>
            <td class="cm-td-center">
              <div class="cm-date">{{ msg.createdAt | date:'dd MMM yyyy' }}</div>
              <div class="cm-time">{{ msg.createdAt | date:'hh:mm a' }}</div>
            </td>
            <td class="cm-td-center">
              <button class="cm-del-btn" (click)="confirmDelete(msg)"
                pTooltip="Delete message" tooltipPosition="left"
                [disabled]="deletingId() === msg.id">
                <i class="pi" [class.pi-trash]="deletingId() !== msg.id" [class.pi-spin]="deletingId() === msg.id" [class.pi-spinner]="deletingId() === msg.id"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="empty">
          <tr>
            <td colspan="7" class="cm-empty">
              <i class="pi pi-inbox cm-empty-icon"></i>
              <p>No contact messages yet</p>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }

    <div class="cm-error" *ngIf="error()">
      <i class="pi pi-exclamation-triangle"></i> {{ error() }}
    </div>
  </div>
</div>
  `,
  styles: [`
    .cm-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }

    /* ── Header ── */
    .cm-page-header {
      display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px;
    }
    .cm-page-title { font-size: 22px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
    .cm-page-sub   { font-size: 13px; color: #64748B; margin: 0; }
    .cm-refresh-btn {
      background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
      width: 36px; height: 36px; display: grid; place-items: center;
      cursor: pointer; color: #475569; transition: background 0.15s;
      &:hover { background: #F1F5F9; }
    }

    /* ── KPI Cards ── */
    .cm-kpi-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .cm-kpi-card {
      flex: 1; min-width: 150px; background: #fff; border-radius: 12px;
      padding: 20px; border: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 8px;
    }
    .cm-kpi-skeleton { opacity: 0.7; }
    .cm-kpi-icon {
      width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center;
      font-size: 18px; margin-bottom: 4px;
    }
    .cm-kpi-num  { font-size: 28px; font-weight: 700; color: #0F172A; line-height: 1; }
    .cm-kpi-lbl  { font-size: 12px; color: #64748B; font-weight: 500; }

    .cm-card-blue   { border-left: 3px solid #3B82F6; }
    .cm-card-amber  { border-left: 3px solid #F59E0B; }
    .cm-card-teal   { border-left: 3px solid #14B8A6; }
    .cm-card-violet { border-left: 3px solid #8B5CF6; }
    .cm-icon-blue   { background: #EFF6FF; color: #3B82F6; }
    .cm-icon-amber  { background: #FFFBEB; color: #F59E0B; }
    .cm-icon-teal   { background: #F0FDFA; color: #14B8A6; }
    .cm-icon-violet { background: #F5F3FF; color: #8B5CF6; }

    /* ── Table Card ── */
    .cm-table-card {
      background: #fff; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;
    }

    /* Loading skeleton */
    .cm-load-toolbar { height: 58px; background: #F8FAFC; border-bottom: 1px solid #F1F5F9; }
    .cm-load-head    { height: 44px; background: #F1F5F9; }
    .cm-load-row     { height: 56px; border-bottom: 1px solid #F8FAFC; background: #fff; }

    /* Toolbar */
    .cm-toolbar {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-bottom: 1px solid #F1F5F9; background: #F8FAFC;
    }
    .cm-search-wrap {
      position: relative; display: flex; align-items: center;
      background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
      flex: 1; max-width: 420px;
    }
    .cm-search-icon  { position: absolute; left: 12px; color: #94A3B8; font-size: 13px; pointer-events: none; }
    .cm-search-input {
      width: 100%; padding: 8px 36px; border: none; outline: none; background: transparent;
      font-size: 13px; color: #334155;
    }
    .cm-search-clear {
      position: absolute; right: 8px; background: none; border: none; cursor: pointer;
      color: #94A3B8; display: grid; place-items: center; padding: 4px;
      &:hover { color: #475569; }
    }
    .cm-toolbar-spacer { flex: 1; }
    .cm-icon-btn {
      background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
      width: 34px; height: 34px; display: grid; place-items: center;
      cursor: pointer; color: #475569; font-size: 13px;
      &:hover { background: #F1F5F9; }
    }

    /* Table */
    .cm-dt .p-datatable-table { font-size: 13px; }
    .cm-dt .p-datatable-thead > tr > th {
      background: #F8FAFC; color: #374151; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 14px;
      border-bottom: 1px solid #E2E8F0; white-space: nowrap;
    }
    .cm-dt .p-datatable-tbody > tr > td {
      padding: 14px 14px; border-bottom: 1px solid #F1F5F9; vertical-align: top;
    }
    .cm-dt .p-datatable-tbody > tr:hover { background: #F8FAFC !important; }
    .cm-th-center, .cm-td-center { text-align: center !important; }
    .cm-row-idx { color: #94A3B8; font-size: 12px; }

    /* Cells */
    .cm-name-cell { display: flex; align-items: center; gap: 10px; }
    .cm-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366F1, #8B5CF6);
      color: #fff; font-size: 12px; font-weight: 600; display: grid; place-items: center;
      flex-shrink: 0;
    }
    .cm-name { font-size: 13px; font-weight: 600; color: #1E293B; }
    .cm-contact-email, .cm-contact-phone {
      display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569;
      margin-bottom: 3px;
      i { font-size: 11px; color: #94A3B8; }
    }
    .cm-email-link { color: #3B82F6; text-decoration: none; &:hover { text-decoration: underline; } }

    /* Message cell */
    .cm-subject {
      font-size: 12px; font-weight: 700; color: #1E293B; margin-bottom: 5px;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .cm-message-full {
      font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
    }

    /* Badges */
    .cm-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      padding: 3px 9px; border-radius: 20px; letter-spacing: 0.02em; white-space: nowrap;
    }
    .cm-badge-new  { background: #FEF3C7; color: #B45309; }
    .cm-badge-read { background: #F1F5F9; color: #64748B; }

    /* Unread row highlight */
    .cm-row-unread > td { background: #FFFBEB !important; }

    /* Date */
    .cm-date { font-size: 12px; color: #475569; font-weight: 500; }
    .cm-time { font-size: 11px; color: #94A3B8; margin-top: 2px; }

    /* Delete button */
    .cm-del-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid #FEE2E2;
      background: #FFF5F5; color: #EF4444; cursor: pointer;
      display: grid; place-items: center; font-size: 13px;
      transition: background 0.15s, color 0.15s;
      &:hover:not(:disabled) { background: #EF4444; color: #fff; border-color: #EF4444; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* Empty */
    .cm-empty { text-align: center; padding: 60px 20px !important; color: #94A3B8; }
    .cm-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }
    .cm-empty p { margin: 0; font-size: 14px; }

    /* Error */
    .cm-error {
      padding: 16px 20px; color: #DC2626; font-size: 13px;
      display: flex; align-items: center; gap: 8px;
    }

    /* Paginator */
    .cm-dt .p-paginator { border-top: 1px solid #F1F5F9; padding: 10px 16px; }

    @media (max-width: 768px) {
      .cm-page { padding: 16px; }
      .cm-kpi-row { flex-wrap: wrap; }
      .cm-kpi-card { min-width: calc(50% - 8px); }
    }
  `]
})
export class AdminContactMessagesComponent implements OnInit {
  private api         = inject(ApiService);
  private toast       = inject(MessageService);
  private confirm     = inject(ConfirmationService);

  @ViewChild('dt') dt!: Table;

  messages    = signal<ContactMessage[]>([]);
  loading     = signal(true);
  error       = signal('');
  deletingId  = signal('');
  searchValue = '';

  unreadCount   = computed(() => this.messages().filter(m => !m.isRead).length);
  todayCount    = computed(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return this.messages().filter(m => new Date(m.createdAt) >= today).length;
  });
  thisWeekCount = computed(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0,0,0,0);
    return this.messages().filter(m => new Date(m.createdAt) >= weekAgo).length;
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.get<ContactMessage[]>('content/contact/messages').subscribe({
      next: res => {
        const data = (res as any)?.data ?? res ?? [];
        this.messages.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load messages.');
        this.loading.set(false);
      }
    });
  }

  confirmDelete(msg: ContactMessage) {
    this.confirm.confirm({
      message: `Delete message from <strong>${msg.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>? This cannot be undone.`,
      header: 'Delete Message',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteMessage(msg.id)
    });
  }

  private deleteMessage(id: string) {
    this.deletingId.set(id);
    this.api.delete(`content/contact/messages/${id}`).subscribe({
      next: () => {
        this.messages.update(list => list.filter(m => m.id !== id));
        this.deletingId.set('');
        this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Message deleted successfully.', life: 3000 });
      },
      error: err => {
        this.deletingId.set('');
        const detail = err?.error?.error ?? err?.error?.message ?? err?.error?.title ?? err?.message ?? `HTTP ${err?.status ?? 'error'}`;
        this.toast.add({ severity: 'error', summary: 'Error', detail, life: 6000 });
        console.error('Delete contact message error:', err);
      }
    });
  }

  initials(name: string): string {
    return (name ?? '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
