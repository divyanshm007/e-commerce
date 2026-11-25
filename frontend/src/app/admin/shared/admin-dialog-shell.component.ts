import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';

export type AdminDialogMode = 'add' | 'edit' | 'danger' | 'info';

/**
 * Reusable admin dialog shell with gradient hero header.
 * Usage:
 *   <app-admin-dialog-shell title="New Coupon" icon="local_offer" [saving]="saving()">
 *     <ng-container dialog-body>...form fields...</ng-container>
 *     <ng-container dialog-footer>...buttons...</ng-container>
 *   </app-admin-dialog-shell>
 *
 * Add panelClass: 'adlg-panel' to MatDialog.open() config.
 */
@Component({
  selector: 'app-admin-dialog-shell',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [MatIconModule, MatProgressSpinnerModule, NgIf],
  template: `
<div class="adlg-shell">

  <!-- Hero header -->
  <div class="adlg-hero" [class.adlg-edit]="mode === 'edit'"
       [class.adlg-danger]="mode === 'danger'" [class.adlg-info]="mode === 'info'">
    <button class="adlg-x" (click)="closed.emit()" type="button" aria-label="Close">
      <mat-icon>close</mat-icon>
    </button>
    <div class="adlg-badge">
      <mat-icon>{{ icon }}</mat-icon>
    </div>
    <h2 class="adlg-title">{{ title }}</h2>
    <p class="adlg-sub" *ngIf="subtitle">{{ subtitle }}</p>
  </div>

  <!-- Body (scrollable) -->
  <div class="adlg-body">
    <ng-content select="[dialog-body]"></ng-content>
  </div>

  <!-- Footer -->
  <div class="adlg-footer">
    <ng-content select="[dialog-footer]"></ng-content>
  </div>

</div>
  `,
  styles: [`
    /* ── Strip Material container so shell controls shape ── */
    .adlg-panel .mat-mdc-dialog-container,
    .adlg-panel .mat-mdc-dialog-surface,
    .adlg-panel .mdc-dialog__surface {
      border-radius: 16px !important;
      overflow: hidden !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* ── Shell ── */
    .adlg-shell {
      display: flex; flex-direction: column;
      width: 540px; max-width: 95vw;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.14);
    }

    /* ── Hero ── */
    .adlg-hero {
      position: relative;
      background: linear-gradient(135deg, #16a34a 0%, #059669 55%, #0d9488 100%);
      padding: 32px 28px 28px; text-align: center;
      display: flex; flex-direction: column; align-items: center;
    }
    .adlg-hero.adlg-edit   { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%); }
    .adlg-hero.adlg-danger { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 55%, #7f1d1d 100%); }
    .adlg-hero.adlg-info   { background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #4f46e5 100%); }

    .adlg-x {
      position: absolute; top: 14px; right: 14px;
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(255,255,255,.18); border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .2s; color: #fff;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(255,255,255,.3); }
    }

    .adlg-badge {
      width: 68px; height: 68px; border-radius: 20px;
      background: rgba(255,255,255,.2); backdrop-filter: blur(8px);
      border: 2px solid rgba(255,255,255,.35);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
      mat-icon { font-size: 34px; width: 34px; height: 34px; color: #fff; }
    }

    .adlg-title {
      font-size: 22px; font-weight: 800; color: #fff;
      margin: 0 0 6px; letter-spacing: -.3px;
    }
    .adlg-sub { font-size: 13.5px; color: rgba(255,255,255,.8); margin: 0; }

    /* ── Body ── */
    .adlg-body {
      padding: 22px 24px;
      max-height: 58vh; overflow-y: auto;
      background: #fff;
    }
    .adlg-body::-webkit-scrollbar { width: 4px; }
    .adlg-body::-webkit-scrollbar-track { background: transparent; }
    .adlg-body::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

    /* ── Footer ── */
    .adlg-footer {
      display: flex; justify-content: flex-end;
      gap: 10px; padding: 16px 24px;
      border-top: 1px solid #f1f5f9; background: #fafafa;
    }

    /* ── Shared dialog button classes ── */
    .adlg-cancel {
      height: 42px; padding: 0 20px; border-radius: 10px;
      border: 1.5px solid #e5e7eb; background: #fff;
      font-size: 14px; font-weight: 600; color: #6b7280;
      cursor: pointer; transition: all .2s;
      &:hover:not(:disabled) { border-color: #9ca3af; color: #374151; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }

    .adlg-submit {
      height: 42px; padding: 0 22px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #16a34a, #059669);
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer; transition: all .2s;
      display: inline-flex; align-items: center; gap: 8px;
      min-width: 140px; justify-content: center;
      box-shadow: 0 4px 12px rgba(22,163,74,.3);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(22,163,74,.4); transform: translateY(-1px); }
      &:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
    }

    .adlg-submit-edit {
      height: 42px; padding: 0 22px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer; transition: all .2s;
      display: inline-flex; align-items: center; gap: 8px;
      min-width: 140px; justify-content: center;
      box-shadow: 0 4px 12px rgba(37,99,235,.3);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(37,99,235,.4); transform: translateY(-1px); }
      &:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
    }

    .adlg-submit-danger {
      height: 42px; padding: 0 22px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer; transition: all .2s;
      display: inline-flex; align-items: center; gap: 8px;
      min-width: 140px; justify-content: center;
      box-shadow: 0 4px 12px rgba(220,38,38,.3);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(220,38,38,.4); transform: translateY(-1px); }
      &:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }
    }

    /* ── Native input / select inside dialogs ── */
    .adlg-field-group { margin-bottom: 16px; }

    .adlg-label {
      display: block; font-size: 12px; font-weight: 700;
      color: #374151; margin-bottom: 6px;
      letter-spacing: .3px; text-transform: uppercase;
    }
    .adlg-label .req { color: #ef4444; }

    .adlg-input-wrap {
      display: flex; align-items: center;
      border: 1.5px solid #e5e7eb; border-radius: 10px;
      background: #f9fafb; transition: all .2s; overflow: hidden;
      mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important;
        color: #9ca3af; flex-shrink: 0; margin: 0 10px 0 12px; }
      &:focus-within { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
      &.adlg-err { border-color: #ef4444; }
      &.adlg-ta  { align-items: flex-start; mat-icon { margin-top: 12px; } }
    }

    .adlg-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #111827; padding: 11px 12px 11px 0;
      font-family: inherit;
      &::placeholder { color: #9ca3af; }
    }

    .adlg-ta {
      resize: none; padding-top: 12px; min-height: 80px;
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #111827; padding: 12px 12px 12px 0;
      font-family: inherit;
      &::placeholder { color: #9ca3af; }
    }

    .adlg-select-wrap {
      position: relative; display: flex; align-items: center;
      border: 1.5px solid #e5e7eb; border-radius: 10px; background: #f9fafb;
      transition: all .2s; overflow: hidden;
      mat-icon.adlg-si { font-size: 18px !important; width: 18px !important; height: 18px !important;
        color: #9ca3af; flex-shrink: 0; margin: 0 10px 0 12px; }
      mat-icon.adlg-arrow { position: absolute; right: 10px; font-size: 20px !important;
        width: 20px !important; height: 20px !important; color: #9ca3af; pointer-events: none; }
      &:focus-within { border-color: #16a34a; background: #fff; box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
    }

    .adlg-select {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; color: #111827; padding: 11px 36px 11px 0;
      appearance: none; cursor: pointer; font-family: inherit;
    }

    .adlg-ferr { font-size: 12px; color: #ef4444; margin: 4px 0 0; }
    .adlg-hint { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }

    .adlg-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 480px) { .adlg-row-2 { grid-template-columns: 1fr; } }

    /* ── Toggle grid (like category dialog) ── */
    .adlg-tgl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
    .adlg-tgl-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e5e7eb;
      background: #f9fafb; transition: all .2s; gap: 10px;
      &.active { border-color: #bbf7d0; background: #f0fdf4; }
    }
    .adlg-tgl-left { display: flex; align-items: center; gap: 10px; }
    .adlg-tgl-dot {
      width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }
    }
    .adlg-tgl-name { font-size: 13px; font-weight: 700; color: #111827; }
    .adlg-tgl-hint { font-size: 11px; color: #9ca3af; margin-top: 1px; }
  `]
})
export class AdminDialogShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'settings';
  @Input() mode: AdminDialogMode = 'add';
  @Output() closed = new EventEmitter<void>();
}
