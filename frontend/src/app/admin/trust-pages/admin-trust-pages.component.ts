import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';

interface TrustSection { icon: string; heading: string; body: string; attachedFileUrl?: string; attachedFileName?: string; uploading?: boolean; }
interface PageDef { slug: string; label: string; matIcon: string; url: string; }

@Component({
  selector: 'app-admin-trust-pages',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgFor, NgIf, FormsModule, InputTextModule, TextareaModule, SkeletonModule, ToastModule, TooltipModule],
  template: `
<p-toast />

<div class="tp-page">

  <!-- Header -->
  <div class="tp-page-header">
    <div>
      <h1 class="tp-page-title">Trust Pages</h1>
      <p class="tp-page-sub">Edit content, sections, hero image and attached documents for each trust page.</p>
    </div>
    <div class="tp-header-actions">
      @if (selected) {
        <a class="tp-preview-link" [href]="'/' + selected.slug" target="_blank">
          <i class="pi pi-external-link"></i> Preview
        </a>
        <button class="tp-save-btn" [disabled]="saving" (click)="save()">
          <i [class]="saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
          {{ saving ? 'Saving…' : 'Save Page' }}
        </button>
      }
    </div>
  </div>

  <!-- Layout -->
  <div class="tp-layout">

    <!-- Sidebar -->
    <div class="tp-sidebar">
      <div class="tp-sidebar-label">Pages</div>
      @for (pg of pages; track pg.slug) {
        <button type="button" class="tp-page-item"
          [class.tp-page-active]="selected?.slug === pg.slug"
          (click)="selectPage(pg)">
          <div class="tp-page-item-icon">
            <span class="material-icons" style="font-size:15px">{{ pg.matIcon }}</span>
          </div>
          <div class="tp-page-item-body">
            <div class="tp-page-item-name">{{ pg.label }}</div>
            <div class="tp-page-item-slug">/{{ pg.slug }}</div>
          </div>
          <i class="pi pi-chevron-right tp-page-item-arrow"></i>
        </button>
      }
    </div>

    <!-- Empty state -->
    @if (!selected) {
      <div class="tp-empty-panel">
        <div class="tp-empty-icon"><span class="material-icons" style="font-size:22px;color:#94A3B8">verified</span></div>
        <h3 class="tp-empty-title">Select a page to edit</h3>
        <p class="tp-empty-sub">Choose a trust page from the left to edit its content, hero image and attached file.</p>
      </div>
    }

    <!-- Editor -->
    @if (selected) {
      <div class="tp-editor-card">

        @if (loading) {
          <div class="tp-editor-loader">
            <i class="pi pi-spin pi-spinner"></i>
            <span>Loading page content…</span>
          </div>
        }

        <!-- Editor head -->
        <div class="tp-editor-head">
          <div class="tp-editor-head-icon">
            <span class="material-icons" style="font-size:16px">{{ selected.matIcon }}</span>
          </div>
          <div>
            <div class="tp-editor-head-title">{{ selected.label }}</div>
            <a class="tp-editor-head-link" [href]="'/' + selected.slug" target="_blank">
              <i class="pi pi-external-link"></i> /{{ selected.slug }}
            </a>
          </div>
        </div>

        <div class="tp-editor-body">

          <!-- Sections -->
          <div class="tp-field">
            <div class="tp-sections-header">
              <label class="tp-label">Sections</label>
              <button type="button" class="tp-add-section-btn" (click)="addSection()">
                <i class="pi pi-plus"></i> Add Section
              </button>
            </div>
            <p class="tp-hint">Each section is one card on the page. Drag to reorder (coming soon).</p>

            @for (sec of sections; track $index; let i = $index) {
              <div class="tp-section-card">
                <div class="tp-section-num">{{ i + 1 }}</div>
                <div class="tp-section-fields">
                  <div class="tp-section-row">
                    <div class="tp-section-col">
                      <label class="tp-section-label">Material Icon</label>
                      <input pInputText [(ngModel)]="sec.icon" placeholder="e.g. verified, labs, eco" class="tp-sec-inp" />
                    </div>
                    <div class="tp-section-col" style="flex:2">
                      <label class="tp-section-label">Heading</label>
                      <input pInputText [(ngModel)]="sec.heading" placeholder="Section title" class="tp-sec-inp" />
                    </div>
                  </div>
                  <div class="tp-section-col" style="width:100%">
                    <label class="tp-section-label">Body</label>
                    <textarea pTextarea [(ngModel)]="sec.body" rows="2" placeholder="Section description…" class="tp-sec-ta"></textarea>
                  </div>
                  <!-- Per-section attachment (certifications & lab-testing only) -->
                  <div class="tp-section-file-row" *ngIf="showAttachment">
                    <label class="tp-section-label">Attachment</label>
                    <div class="tp-upload-row">
                      @if (sec.attachedFileUrl) {
                        <div class="tp-file-chip">
                          <i class="pi pi-file"></i>
                          <span>{{ sec.attachedFileName || 'Attached' }}</span>
                          <button type="button" class="tp-rm-file-btn" (click)="removeSectionFile(i)" pTooltip="Remove">
                            <i class="pi pi-times"></i>
                          </button>
                        </div>
                      }
                      <label class="tp-upload-btn tp-upload-btn-sm">
                        <i [class]="sec.uploading ? 'pi pi-spin pi-spinner' : 'pi pi-paperclip'"></i>
                        {{ sec.uploading ? 'Uploading…' : (sec.attachedFileUrl ? 'Replace' : 'Attach File') }}
                        <input type="file" style="display:none" (change)="onSectionFileChange($event, i)" [disabled]="sec.uploading" />
                      </label>
                    </div>
                  </div>
                </div>
                <button type="button" class="tp-rm-section-btn" (click)="removeSection(i)" pTooltip="Remove section">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            }
          </div>

          <!-- Footer save -->
          <div class="tp-editor-footer">
            <button class="tp-save-btn" [disabled]="saving" (click)="save()">
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
   ADMIN TRUST PAGES — ViewEncapsulation.None, all selectors .tp-*
================================================================ */

.tp-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; }

.tp-page-header   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.tp-page-title    { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; line-height: 1.25; }
.tp-page-sub      { font-size: 13px; color: #64748B; margin: 2px 0 0; }
.tp-header-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.tp-preview-link  { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid #E2E8F0; background: #fff; color: #0F766E; font-size: 12px; font-weight: 600; text-decoration: none; }
.tp-preview-link:hover { background: #F0FDFA; border-color: #CCFBF1; }
.tp-save-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 14px; border-radius: 7px; border: none; background: #0F766E; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); transition: background 0.13s; }
.tp-save-btn:hover:not(:disabled) { background: #115E59; }
.tp-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tp-save-btn .pi { font-size: 11px; }

.tp-layout { display: grid; grid-template-columns: 240px 1fr; gap: 14px; align-items: start; flex: 1; }

/* Sidebar */
.tp-sidebar { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.tp-sidebar-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 14px 8px; }
.tp-page-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: none; border: none; border-bottom: 1px solid #F1F5F9; cursor: pointer; text-align: left; transition: background 0.12s; }
.tp-page-item:last-child { border-bottom: none; }
.tp-page-item:hover:not(.tp-page-active) { background: #FAFDFC; }
.tp-page-active { background: #F0FDF9 !important; border-left: 3px solid #0F766E; }
.tp-page-item-icon { width: 30px; height: 30px; border-radius: 7px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #94A3B8; }
.tp-page-active .tp-page-item-icon { background: #CCFBF1; color: #0F766E; }
.tp-page-item-body { flex: 1; min-width: 0; }
.tp-page-item-name { font-size: 12.5px; font-weight: 600; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp-page-item-slug { font-size: 10.5px; color: #94A3B8; margin-top: 1px; }
.tp-page-active .tp-page-item-name { color: #0F766E; }
.tp-page-item-arrow { font-size: 9px; color: #CBD5E1; flex-shrink: 0; }

/* Empty */
.tp-empty-panel { background: rgba(255,255,255,0.88); border: 1.5px dashed #E2E8F0; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
.tp-empty-icon  { width: 48px; height: 48px; border-radius: 12px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.tp-empty-title { font-size: 15px; font-weight: 600; color: #334155; margin: 0 0 5px; }
.tp-empty-sub   { font-size: 12px; color: #94A3B8; margin: 0; max-width: 300px; }

/* Editor card */
.tp-editor-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(15,23,42,0.04); position: relative; }
.tp-editor-loader { position: absolute; inset: 0; background: rgba(255,255,255,0.88); display: flex; align-items: center; justify-content: center; gap: 10px; z-index: 10; border-radius: 14px; font-size: 13px; color: #64748B; }
.tp-editor-loader .pi { font-size: 22px; color: #0F766E; }
.tp-editor-head { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #F0FDF9; border-bottom: 1px solid #DDEFE9; }
.tp-editor-head-icon { width: 38px; height: 38px; border-radius: 10px; background: #CCFBF1; color: #0F766E; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tp-editor-head-title { font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.25; }
.tp-editor-head-link  { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #0F766E; text-decoration: none; margin-top: 2px; }
.tp-editor-head-link:hover { text-decoration: underline; }
.tp-editor-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.tp-editor-footer { display: flex; justify-content: flex-end; padding-top: 6px; }

/* Fields */
.tp-field { display: flex; flex-direction: column; gap: 5px; }
.tp-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.tp-req   { color: #DC2626; }
.tp-hint  { font-size: 11px; color: #94A3B8; margin: 0; }
.tp-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; }
.tp-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.tp-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; }
.tp-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.tp-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.tp-inp-icon { padding-left: 30px !important; }

/* Upload */
.tp-upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tp-hero-preview { display: flex; flex-direction: column; gap: 4px; }
.tp-hero-preview img { width: 160px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0; }
.tp-hero-label { font-size: 10px; color: #94A3B8; text-align: center; }
.tp-upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1.5px solid #CBD5E1; background: #fff; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer; transition: border-color 0.13s, background 0.13s; }
.tp-upload-btn:hover { border-color: #0F766E; background: #F0FDF9; color: #0F766E; }
.tp-upload-btn .pi { font-size: 12px; }
.tp-file-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 7px; background: #F0FDF9; border: 1px solid #CCFBF1; color: #0F766E; font-size: 12px; font-weight: 500; }
.tp-file-chip .pi { font-size: 12px; }
.tp-rm-file-btn { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #86EFAC; background: transparent; color: #0F766E; cursor: pointer; font-size: 9px; padding: 0; margin-left: 2px; }
.tp-rm-file-btn:hover { background: #DCFCE7; }

/* Sections */
.tp-sections-header { display: flex; align-items: center; justify-content: space-between; }
.tp-add-section-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1.5px solid #0F766E; border-radius: 7px; color: #0F766E; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; }
.tp-add-section-btn:hover { background: #F0FDF9; }
.tp-add-section-btn .pi { font-size: 10px; }
.tp-section-card { display: flex; align-items: flex-start; gap: 10px; padding: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-top: 8px; }
.tp-section-num  { width: 24px; height: 24px; border-radius: 50%; background: #0F766E; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 22px; }
.tp-section-fields { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.tp-section-row  { display: flex; gap: 8px; }
.tp-section-col  { display: flex; flex: 1; flex-direction: column; gap: 4px; }
.tp-section-label { font-size: 10px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
.tp-sec-inp { width: 100%; height: 34px; border: 1px solid #E2E8F0 !important; border-radius: 7px !important; padding: 0 10px !important; font-size: 13px !important; color: #0F172A !important; background: #fff !important; box-shadow: none !important; outline: none !important; }
.tp-sec-inp:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.08) !important; }
.tp-sec-ta { width: 100%; box-sizing: border-box; resize: vertical; padding: 8px 10px !important; font-size: 13px !important; color: #0F172A !important; border: 1px solid #E2E8F0 !important; border-radius: 7px !important; background: #fff !important; line-height: 1.6; box-shadow: none !important; outline: none !important; font-family: inherit !important; }
.tp-sec-ta:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.08) !important; }
.tp-section-file-row { display: flex; flex-direction: column; gap: 5px; padding-top: 4px; border-top: 1px dashed #E2E8F0; margin-top: 4px; }
.tp-upload-btn-sm { padding: 5px 10px; font-size: 11px; }
.tp-rm-section-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid #FECACA; background: #fff; color: #F87171; cursor: pointer; font-size: 10px; flex-shrink: 0; margin-top: 18px; }
.tp-rm-section-btn:hover { background: #FEF2F2; color: #DC2626; }

  `]
})
export class AdminTrustPagesComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast = inject(MessageService);

  pages: PageDef[] = [
    { slug: 'why-choose-us',    label: 'Why Choose Us',        matIcon: 'verified',          url: 'why-choose-us' },
    { slug: 'quality-assurance',label: 'Quality Assurance',    matIcon: 'science',            url: 'quality-assurance' },
    { slug: 'manufacturing',    label: 'Manufacturing Process', matIcon: 'factory',            url: 'manufacturing' },
    { slug: 'certifications',   label: 'Certifications',        matIcon: 'workspace_premium',  url: 'certifications' },
    { slug: 'lab-testing',      label: 'Lab Testing & Safety',  matIcon: 'biotech',            url: 'lab-testing' },
  ];

  selected: PageDef | null = null;
  loading = false;
  saving  = false;

  sections: TrustSection[] = [];

  get showAttachment(): boolean {
    return this.selected?.slug === 'certifications' || this.selected?.slug === 'lab-testing';
  }

  ngOnInit() {}

  selectPage(pg: PageDef) {
    this.selected = pg;
    this.loading  = true;
    this.sections = [];

    this.contentService.getTrustPage(pg.slug).subscribe({
      next: res => {
        if (res?.data) {
          const d = res.data;
          this.sections = (d.sections ?? []).map((s: any) => ({ icon: s.icon ?? '', heading: s.heading ?? '', body: s.body ?? '', attachedFileUrl: s.attachedFileUrl ?? '', attachedFileName: s.attachedFileName ?? '' }));
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addSection() {
    this.sections.push({ icon: '', heading: '', body: '' });
  }

  removeSection(i: number) {
    this.sections.splice(i, 1);
  }

  save() {
    if (!this.selected) return;
    this.saving = true;
    const dto = { title: this.selected.label, subtitle: '', sections: this.sections };
    this.contentService.updateTrustPage(this.selected.slug, dto).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Trust page saved successfully', life: 3000 });
        this.saving = false;
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Save failed. Please try again.', life: 4000 });
        this.saving = false;
      }
    });
  }

  onSectionFileChange(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.selected) return;
    this.sections[index].uploading = true;
    this.contentService.uploadTrustPageSectionFile(this.selected.slug, index, file).subscribe({
      next: res => {
        this.sections[index].attachedFileUrl  = res?.data?.url  ?? '';
        this.sections[index].attachedFileName = res?.data?.name ?? file.name;
        this.sections[index].uploading = false;
        this.toast.add({ severity: 'success', summary: 'Uploaded', detail: `File attached to section ${index + 1}`, life: 3000 });
      },
      error: () => {
        this.sections[index].uploading = false;
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'File upload failed', life: 4000 });
      }
    });
  }

  removeSectionFile(index: number) {
    this.sections[index].attachedFileUrl  = '';
    this.sections[index].attachedFileName = '';
  }

}
