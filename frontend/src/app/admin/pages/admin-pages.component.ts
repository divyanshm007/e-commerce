import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { EditorModule } from 'primeng/editor';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface PageDef { slug: string; label: string; }

@Component({
  selector: 'app-admin-pages',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgIf, FormsModule, InputTextModule, EditorModule, SkeletonModule, ToastModule, TooltipModule],
  template: `
<p-toast />

<div class="pg-page">

  <!-- Page Header -->
  <div class="pg-page-header">
    <div>
      <h1 class="pg-page-title">Static Pages</h1>
      <p class="pg-page-sub">Edit the content for each policy and legal page shown to customers.</p>
    </div>
    <div class="pg-header-actions">
      @if (selected) {
        <a class="pg-preview-link" [href]="'/page/' + selected.slug" target="_blank">
          <i class="pi pi-external-link"></i> Preview
        </a>
        <button class="pg-save-btn" [disabled]="saving" (click)="save()">
          <i [class]="saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
          {{ saving ? 'Saving…' : 'Save Page' }}
        </button>
      }
    </div>
  </div>

  <!-- Layout -->
  <div class="pg-layout">

    <!-- Left Sidebar -->
    <div class="pg-sidebar">
      <div class="pg-sidebar-label">Pages</div>
      @for (pg of pages; track pg.slug) {
        <button type="button" class="pg-page-item" [class.pg-page-active]="selected?.slug === pg.slug" (click)="selectPage(pg)">
          <div class="pg-page-item-icon"><i class="pi pi-file-edit"></i></div>
          <div class="pg-page-item-body">
            <div class="pg-page-item-name">{{ pg.label }}</div>
            <div class="pg-page-item-slug">/page/{{ pg.slug }}</div>
          </div>
          <i class="pi pi-chevron-right pg-page-item-arrow"></i>
        </button>
      }
    </div>

    <!-- Editor panel -->
    @if (!selected) {
      <div class="pg-empty-panel">
        <div class="pg-empty-icon"><i class="pi pi-file-edit"></i></div>
        <h3 class="pg-empty-title">Select a page to edit</h3>
        <p class="pg-empty-sub">Choose a policy page from the left to view and edit its content.</p>
      </div>
    }

    @if (selected) {
      <div class="pg-editor-card">

        @if (loading) {
          <div class="pg-editor-loader">
            <i class="pi pi-spin pi-spinner"></i>
            <span>Loading page content…</span>
          </div>
        }

        <!-- Editor header -->
        <div class="pg-editor-head">
          <div class="pg-editor-head-icon"><i class="pi pi-file-edit"></i></div>
          <div>
            <div class="pg-editor-head-title">{{ selected.label }}</div>
            <a class="pg-editor-head-link" [href]="'/page/' + selected.slug" target="_blank">
              <i class="pi pi-external-link"></i> /page/{{ selected.slug }}
            </a>
          </div>
        </div>

        <div class="pg-editor-body">

          <!-- Title -->
          <div class="pg-field">
            <label class="pg-label">Page Title <span class="pg-req">*</span></label>
            <p class="pg-hint">Displayed as the main heading at the top of the page.</p>
            <div class="pg-input-wrap">
              <i class="pi pi-heading pg-input-icon"></i>
              <input pInputText [(ngModel)]="title" placeholder="e.g. Privacy Policy" class="pg-inp pg-inp-icon" />
            </div>
          </div>

          <!-- Rich Text Editor -->
          <div class="pg-field">
            <label class="pg-label">Page Content <span class="pg-req">*</span></label>
            <p class="pg-hint">Use the toolbar to format text — headings, bold, lists, links and more.</p>
            <div class="pg-editor-wrap">
              <p-editor
                [(ngModel)]="content"
                [style]="{ height: '420px' }"
              ></p-editor>
            </div>
          </div>

          <!-- Save (bottom) -->
          <div class="pg-editor-footer">
            <button class="pg-save-btn" [disabled]="saving" (click)="save()">
              <i [class]="saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
              {{ saving ? 'Saving…' : 'Save Page' }}
            </button>
          </div>

        </div>
      </div>
    }

  </div>
</div>
  `,
  styles: [`

/* ================================================================
   ADMIN PAGES — ViewEncapsulation.None, all selectors .pg-*
================================================================ */

.pg-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.pg-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.pg-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.pg-page-sub      { font-size: 13px; color: #64748B; font-weight: 400; margin: 2px 0 0; }
.pg-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.pg-preview-link  { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #0F766E; font-size: 12px; font-weight: 600; text-decoration: none; }
.pg-preview-link:hover { background: #F0FDFA; border-color: #CCFBF1; }
.pg-save-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 14px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); transition: background 0.13s; }
.pg-save-btn:hover:not(:disabled) { background: #115E59; }
.pg-save-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.pg-save-btn .pi { font-size: 11px; }

/* Layout */
.pg-layout { display: grid; grid-template-columns: 260px 1fr; gap: 14px; align-items: start; flex: 1; }

/* Sidebar */
.pg-sidebar { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.pg-sidebar-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 14px 8px; }
.pg-page-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: none; border: none; border-bottom: 1px solid #F1F5F9; cursor: pointer; text-align: left; transition: background 0.12s; }
.pg-page-item:last-child { border-bottom: none; }
.pg-page-item:hover:not(.pg-page-active) { background: #FAFDFC; }
.pg-page-active { background: #F0FDF9 !important; border-left: 3px solid #0F766E; }
.pg-page-item-icon { width: 30px; height: 30px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #94A3B8; flex-shrink: 0; }
.pg-page-active .pg-page-item-icon { background: #CCFBF1; color: #0F766E; }
.pg-page-item-body { flex: 1; min-width: 0; }
.pg-page-item-name { font-size: 12.5px; font-weight: 600; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pg-page-item-slug { font-size: 10.5px; color: #94A3B8; margin-top: 1px; }
.pg-page-active .pg-page-item-name { color: #0F766E; }
.pg-page-item-arrow { font-size: 9px; color: #CBD5E1; flex-shrink: 0; }

/* Empty state */
.pg-empty-panel { background: rgba(255,255,255,0.88); border: 1.5px dashed #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
.pg-empty-icon  { width: 48px; height: 48px; border-radius: 12px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.pg-empty-icon .pi { font-size: 20px; color: #94A3B8; }
.pg-empty-title { font-size: 15px; font-weight: 600; color: #334155; margin: 0 0 5px; }
.pg-empty-sub   { font-size: 12px; color: #94A3B8; margin: 0; max-width: 300px; }

/* Editor card */
.pg-editor-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(15,23,42,0.04); position: relative; }
.pg-editor-loader { position: absolute; inset: 0; background: rgba(255,255,255,0.88); display: flex; align-items: center; justify-content: center; gap: 10px; z-index: 10; border-radius: 14px; font-size: 13px; color: #64748B; }
.pg-editor-loader .pi { font-size: 22px; color: #0F766E; }
.pg-editor-head { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.pg-editor-head-icon { width: 38px; height: 38px; border-radius: 10px; background: #CCFBF1; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.pg-editor-head-title { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.pg-editor-head-link  { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #0F766E; text-decoration: none; margin-top: 2px; }
.pg-editor-head-link:hover { text-decoration: underline; }
.pg-editor-head-link .pi { font-size: 10px; }
.pg-editor-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.pg-editor-footer { display: flex; justify-content: flex-end; padding-top: 6px; }

/* Fields */
.pg-field { display: flex; flex-direction: column; gap: 5px; }
.pg-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.pg-req   { color: #DC2626; }
.pg-hint  { font-size: 11px; color: #94A3B8; margin: 0; }
.pg-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; }
.pg-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.pg-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; }
.pg-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.pg-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.pg-inp-icon { padding-left: 30px !important; }

/* Quill editor overrides */
.pg-editor-wrap .ql-toolbar { border-radius: 8px 8px 0 0; border-color: #E2E8F0 !important; background: #F8FAFC; }
.pg-editor-wrap .ql-container { border-radius: 0 0 8px 8px; border-color: #E2E8F0 !important; font-size: 14px; font-family: inherit; }
.pg-editor-wrap .ql-editor { min-height: 380px; line-height: 1.75; color: #1E293B; }
.pg-editor-wrap .ql-editor:focus { outline: none; }
.pg-editor-wrap:focus-within .ql-toolbar,
.pg-editor-wrap:focus-within .ql-container { border-color: #0F766E !important; }
.pg-editor-wrap .ql-toolbar .ql-formats button:hover,
.pg-editor-wrap .ql-toolbar .ql-formats button.ql-active { color: #0F766E; }
.pg-editor-wrap .ql-toolbar .ql-formats .ql-stroke { stroke: currentColor; }
.pg-editor-wrap .ql-snow .ql-picker { color: #475569; }

  `]
})
export class AdminPagesComponent implements OnInit {
  private contentService = inject(ContentService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(MessageService);

  pages: PageDef[] = [
    { slug: 'privacy-policy',   label: 'Privacy Policy'    },
    { slug: 'terms-conditions', label: 'Terms & Conditions' },
    { slug: 'shipping-policy',  label: 'Shipping Policy'    },
    { slug: 'return-policy',    label: 'Return Policy'      },
    { slug: 'refund-policy',    label: 'Refund Policy'      },
  ];

  selected: PageDef | null = null;
  loading = false;
  saving  = false;
  title   = '';
  content = '';

  ngOnInit() {}

  selectPage(pg: PageDef) {
    this.selected = pg;
    this.loading  = true;
    this.title    = '';
    this.content  = '';

    this.contentService.getPage(pg.slug).subscribe({
      next: res => {
        if (res?.data) {
          this.title   = res.data.title   ?? pg.label;
          this.content = res.data.content ?? '';
        } else {
          this.title = pg.label;
        }
        this.loading = false;
      },
      error: () => { this.title = pg.label; this.loading = false; }
    });
  }

  save() {
    if (!this.selected || !this.title.trim()) {
      this.toast.add({ severity: 'warn', summary: 'Required', detail: 'Page title is required', life: 3000 });
      return;
    }
    this.saving = true;
    this.contentService.upsertPage(this.selected.slug, {
      title:   this.title.trim(),
      content: this.content
    }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Page saved successfully', life: 3000 });
        this.saving = false;
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Save failed. Please try again.', life: 4000 });
        this.saving = false;
      }
    });
  }
}
