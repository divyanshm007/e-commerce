import { Component, OnInit, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-admin-gallery',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, NgFor, ReactiveFormsModule,
    ToastModule, ConfirmDialogModule, DialogModule,
    InputTextModule, TextareaModule, ToggleSwitchModule,
    SkeletonModule, TooltipModule, MediaUrlPipe
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="gl-page">

  <!-- Header -->
  <div class="gl-page-header">
    <div>
      <h1 class="gl-page-title">Gallery</h1>
      <p class="gl-page-sub">{{ images().length }} images total</p>
    </div>
    <div class="gl-header-actions">
      <button class="gl-refresh-btn" (click)="load()"><i class="pi pi-refresh"></i></button>
      <button class="gl-add-btn" (click)="openDialog()"><i class="pi pi-plus"></i> Upload Image</button>
    </div>
  </div>

  <!-- KPI row -->
  <div class="gl-kpi-row">
    @if (listLoading()) {
      @for (i of [1,2,3]; track i) {
        <div class="gl-kpi-card">
          <p-skeleton width="36px" height="36px" styleClass="gl-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="gl-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!listLoading()) {
      <div class="gl-kpi-card gl-card-blue">
        <div class="gl-kpi-icon gl-icon-blue"><i class="pi pi-images"></i></div>
        <div class="gl-kpi-num">{{ images().length }}</div>
        <div class="gl-kpi-lbl">Total Images</div>
      </div>
      <div class="gl-kpi-card gl-card-teal">
        <div class="gl-kpi-icon gl-icon-teal"><i class="pi pi-eye"></i></div>
        <div class="gl-kpi-num">{{ activeCount() }}</div>
        <div class="gl-kpi-lbl">Visible</div>
      </div>
      <div class="gl-kpi-card gl-card-amber">
        <div class="gl-kpi-icon gl-icon-amber"><i class="pi pi-eye-slash"></i></div>
        <div class="gl-kpi-num">{{ hiddenCount() }}</div>
        <div class="gl-kpi-lbl">Hidden</div>
      </div>
    }
  </div>

  <!-- Skeleton grid -->
  <div class="gl-grid" *ngIf="listLoading()">
    <div class="gl-card gl-card-skeleton" *ngFor="let i of skeletons">
      <p-skeleton height="180px" />
      <div class="gl-card-body">
        <p-skeleton width="70%" height="14px" styleClass="gl-sk-line" />
        <p-skeleton width="90%" height="11px" />
      </div>
    </div>
  </div>

  <!-- Empty -->
  <div class="gl-empty" *ngIf="!listLoading() && images().length === 0">
    <div class="gl-empty-icon"><i class="pi pi-images"></i></div>
    <p class="gl-empty-title">No images yet</p>
    <button class="gl-state-btn" (click)="openDialog()"><i class="pi pi-plus"></i> Upload First Image</button>
  </div>

  <!-- Image grid -->
  <div class="gl-grid" *ngIf="!listLoading() && images().length > 0">
    <div class="gl-card" *ngFor="let img of images()">
      <div class="gl-img-wrap">
        <img [src]="img.imageUrl | mediaUrl" [alt]="img.title" loading="lazy" />
        <div class="gl-img-overlay">
          <button class="gl-act-btn gl-act-edit" (click)="openDialog(img)" pTooltip="Edit" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
          <button class="gl-act-btn gl-act-del"  (click)="deleteImage(img)" pTooltip="Delete" tooltipPosition="top"><i class="pi pi-trash"></i></button>
        </div>
        <span class="gl-status-dot" [class.gl-s-hidden]="!img.isActive" [pTooltip]="img.isActive ? 'Visible' : 'Hidden'" tooltipPosition="top"></span>
      </div>
      <div class="gl-card-body">
        <div class="gl-card-title">{{ img.title }}</div>
        <div class="gl-card-sub" *ngIf="img.subtitle">{{ img.subtitle }}</div>
      </div>
    </div>
  </div>
</div>

<!-- ===================== DIALOG ===================== -->
<p-dialog [(visible)]="dialogVisible" [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="gl-dlg" [class.gl-dlg-edit]="!!editingId()" [style]="{width:'500px',maxWidth:'96vw'}">
  <ng-template pTemplate="header">
    <div class="gl-dlg-head">
      <div class="gl-dlg-icon" [class.gl-dlg-icon-edit]="!!editingId()">
        <i [class]="editingId() ? 'pi pi-pencil' : 'pi pi-upload'"></i>
      </div>
      <div class="gl-dlg-titles">
        <div class="gl-dlg-title">{{ editingId() ? 'Edit Image' : 'Upload Image' }}</div>
        <div class="gl-dlg-sub">{{ editingId() ? 'Update details for this gallery image' : 'Upload a new image to the gallery' }}</div>
      </div>
      <button class="gl-dlg-x" (click)="dialogVisible = false" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>

  <form [formGroup]="form" autocomplete="off" class="gl-form">

    <!-- Image upload area -->
    <div class="gl-upload-area" [class.gl-has-img]="previewUrl()" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
      <img *ngIf="previewUrl()" [src]="previewUrl()! | mediaUrl" class="gl-preview-img" />
      <div class="gl-upload-placeholder" *ngIf="!previewUrl()">
        <i class="pi pi-cloud-upload gl-upload-icon"></i>
        <p class="gl-upload-text">Click or drag & drop to upload</p>
        <p class="gl-upload-hint">JPG, PNG, WebP — max 10MB</p>
      </div>
      <div class="gl-upload-progress" *ngIf="uploading()">
        <i class="pi pi-spin pi-spinner"></i> Uploading…
      </div>
      <button *ngIf="previewUrl() && !uploading()" type="button" class="gl-remove-img" (click)="removeImage($event)"><i class="pi pi-times"></i></button>
    </div>
    <input #fileInput type="file" accept="image/*" class="gl-file-inp" (change)="onFileChange($event)" />
    <div class="gl-upload-err" *ngIf="form.get('imageUrl')?.invalid && form.get('imageUrl')?.touched">
      Please upload an image.
    </div>

    <div class="gl-field">
      <label class="gl-label">Title <span class="gl-req">*</span></label>
      <div class="gl-input-wrap" [class.gl-input-err]="form.get('title')?.invalid && form.get('title')?.touched">
        <i class="pi pi-tag gl-input-icon"></i>
        <input pInputText formControlName="title" placeholder="e.g. Annual Harvest Festival 2024" class="gl-inp gl-inp-icon" />
      </div>
    </div>

    <div class="gl-field">
      <label class="gl-label">Subtitle <span class="gl-hint-inline">(optional)</span></label>
      <div class="gl-input-wrap">
        <i class="pi pi-align-left gl-input-icon"></i>
        <input pInputText formControlName="subtitle" placeholder="Short caption…" class="gl-inp gl-inp-icon" />
      </div>
    </div>

    <div class="gl-field">
      <label class="gl-label">Visibility</label>
      <label class="gl-toggle-card" [class.gl-toggle-on]="form.get('isActive')?.value">
        <div class="gl-toggle-left">
          <div class="gl-toggle-icon" [class.gl-toggle-icon-on]="form.get('isActive')?.value">
            <i [class]="form.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="gl-toggle-title">{{ form.get('isActive')?.value ? 'Visible' : 'Hidden' }}</div>
            <div class="gl-toggle-sub">{{ form.get('isActive')?.value ? 'Shown in the gallery' : 'Not shown in the gallery' }}</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
    </div>
  </form>

  <ng-template pTemplate="footer">
    <div class="gl-dlg-footer">
      <button class="gl-dlg-cancel" [disabled]="saving()" (click)="dialogVisible = false"><i class="pi pi-times"></i> Cancel</button>
      <button class="gl-dlg-save" [disabled]="form.invalid || saving() || uploading()" (click)="save()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (editingId() ? 'pi pi-check' : 'pi pi-cloud-upload')"></i>
        {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Upload & Save') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`
.gl-page { min-height:100vh; background:#F6F8FA; padding:20px; }
.gl-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
.gl-page-title { font-size:22px; font-weight:700; color:#0F172A; letter-spacing:-0.3px; margin:0; }
.gl-page-sub   { font-size:13px; color:#64748B; margin:2px 0 0; }
.gl-header-actions { display:flex; gap:8px; }
.gl-refresh-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid #E2E8F0; border-radius:7px; background:#fff; color:#64748B; cursor:pointer; font-size:12px; }
.gl-refresh-btn:hover { background:#F8FAFC; color:#0F172A; }
.gl-add-btn { display:inline-flex; align-items:center; gap:5px; height:32px; padding:0 12px; border-radius:7px; background:#0F766E; color:#fff; font-size:12px; font-weight:600; border:none; cursor:pointer; }
.gl-add-btn:hover { background:#115E59; }
.gl-add-btn .pi { font-size:11px; }

/* KPI */
.gl-kpi-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.gl-kpi-card { background:rgba(255,255,255,.82); backdrop-filter:blur(10px); border:1px solid rgba(226,232,240,.85); border-top-width:3px; border-radius:14px; padding:16px; min-height:130px; display:flex; flex-direction:column; box-shadow:0 2px 8px rgba(15,23,42,.05),0 8px 24px rgba(15,23,42,.07); transition:box-shadow .18s,transform .18s; }
.gl-kpi-card:hover { transform:translateY(-2px); }
.gl-card-blue { border-top-color:#2563EB!important; } .gl-card-teal { border-top-color:#0F766E!important; } .gl-card-amber { border-top-color:#D97706!important; }
.gl-kpi-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; margin-bottom:10px; }
.gl-icon-blue { background:#EFF6FF; color:#2563EB; } .gl-icon-teal { background:#F0FDFA; color:#0F766E; } .gl-icon-amber { background:#FFFBEB; color:#D97706; }
.gl-kpi-num { font-size:26px; font-weight:700; color:#0F172A; line-height:1; letter-spacing:-.5px; margin-bottom:5px; }
.gl-kpi-lbl { font-size:10.5px; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:.06em; margin-top:auto; }
.gl-sk-icon { border-radius:8px!important; margin-bottom:10px; display:block; } .gl-sk-num { margin-bottom:6px; display:block; }

/* Image grid */
.gl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
.gl-card { background:#fff; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,.04); transition:box-shadow .2s,transform .2s; }
.gl-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(15,23,42,.10); }
.gl-card:hover .gl-img-overlay { opacity:1; }
.gl-card-skeleton { cursor:default; }
.gl-card-skeleton:hover { transform:none; box-shadow:0 2px 8px rgba(15,23,42,.04); }
.gl-img-wrap { position:relative; aspect-ratio:4/3; overflow:hidden; }
.gl-img-wrap img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
.gl-card:hover .gl-img-wrap img { transform:scale(1.04); }
.gl-img-overlay { position:absolute; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; gap:6px; opacity:0; transition:opacity .2s; }
.gl-act-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; border:none; cursor:pointer; }
.gl-act-btn .pi { font-size:13px; }
.gl-act-edit { background:rgba(255,255,255,.95); color:#2563EB; }
.gl-act-del  { background:rgba(255,255,255,.95); color:#DC2626; }
.gl-status-dot { position:absolute; top:8px; right:8px; width:10px; height:10px; border-radius:50%; background:#22C55E; border:2px solid #fff; }
.gl-s-hidden { background:#EF4444; }
.gl-card-body { padding:10px 12px 12px; }
.gl-card-title { font-size:12.5px; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gl-card-sub   { font-size:11px; color:#94A3B8; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gl-sk-line { margin-bottom:6px; display:block; }

.gl-empty { display:flex; flex-direction:column; align-items:center; padding:48px; text-align:center; gap:10px; background:#fff; border:1px solid #E2E8F0; border-radius:14px; }
.gl-empty-icon { width:44px; height:44px; border-radius:10px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; }
.gl-empty-icon .pi { font-size:18px; color:#94A3B8; }
.gl-empty-title { font-size:14px; font-weight:600; color:#334155; margin:0; }
.gl-state-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:6px; background:#0F766E; color:#fff; border:none; font-size:12px; cursor:pointer; }

/* Dialog */
.gl-dlg { border-radius:14px!important; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,.18)!important; }
.gl-dlg .p-dialog-header { padding:0!important; border-bottom:none!important; background:#fff!important; }
.gl-dlg .p-dialog-content { padding:20px 22px!important; background:#fff!important; max-height:72vh; overflow-y:auto; }
.gl-dlg .p-dialog-footer  { padding:14px 22px!important; border-top:1px solid #F1F5F9!important; background:#FAFBFC!important; border-radius:0 0 14px 14px; }
.gl-dlg .p-dialog-header::before { content:''; display:block; height:4px; background:linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.gl-dlg-edit .p-dialog-header::before { background:linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.gl-dlg-head { display:flex; align-items:center; gap:12px; padding:16px 22px 14px; }
.gl-dlg-icon { width:38px; height:38px; border-radius:10px; background:#F0FDFA; color:#0F766E; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; border:1px solid #CCFBF1; }
.gl-dlg-icon-edit { background:#EFF6FF; color:#2563EB; border-color:#BFDBFE; }
.gl-dlg-titles { flex:1; min-width:0; }
.gl-dlg-title { font-size:15px; font-weight:700; color:#0F172A; }
.gl-dlg-sub   { font-size:11.5px; color:#94A3B8; margin-top:2px; }
.gl-dlg-x { width:30px; height:30px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#94A3B8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; }
.gl-dlg-x:hover:not(:disabled) { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
.gl-dlg-x:disabled { opacity:.4; cursor:not-allowed; }
.gl-dlg-footer { display:flex; justify-content:flex-end; gap:8px; }
.gl-dlg-cancel { display:inline-flex; align-items:center; gap:5px; height:34px; padding:0 14px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#64748B; font-size:12.5px; font-weight:500; cursor:pointer; }
.gl-dlg-cancel:disabled { opacity:.45; cursor:not-allowed; }
.gl-dlg-save { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 16px; border-radius:7px; border:none; background:#0F766E; color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; }
.gl-dlg-save:hover:not(:disabled) { background:#115E59; }
.gl-dlg-save:disabled { opacity:.45; cursor:not-allowed; }
.gl-dlg-save .pi,.gl-dlg-cancel .pi { font-size:10px; }

/* Upload area */
.gl-upload-area {
  border:2px dashed #CBD5E1; border-radius:12px; overflow:hidden;
  aspect-ratio:16/7; position:relative; cursor:pointer; display:flex; align-items:center; justify-content:center;
  background:#F8FAFC; transition:border-color .15s,background .15s; margin-bottom:14px;
}
.gl-upload-area:hover { border-color:#0F766E; background:#F0FDFA; }
.gl-has-img { border-style:solid; border-color:#CBD5E1; }
.gl-preview-img { width:100%; height:100%; object-fit:cover; display:block; }
.gl-upload-placeholder { display:flex; flex-direction:column; align-items:center; gap:6px; padding:20px; text-align:center; }
.gl-upload-icon { font-size:32px; color:#94A3B8; }
.gl-upload-text { font-size:13px; font-weight:600; color:#475569; margin:0; }
.gl-upload-hint { font-size:11px; color:#94A3B8; margin:0; }
.gl-upload-progress { position:absolute; inset:0; background:rgba(255,255,255,.85); display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; color:#0F766E; font-weight:600; }
.gl-remove-img { position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:50%; background:rgba(15,23,42,.6); color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; }
.gl-remove-img:hover { background:rgba(220,38,38,.8); }
.gl-file-inp { display:none; }
.gl-upload-err { font-size:11.5px; color:#DC2626; margin-bottom:10px; }

/* Form */
.gl-form { display:flex; flex-direction:column; gap:14px; }
.gl-field { display:flex; flex-direction:column; gap:5px; }
.gl-label { font-size:10.5px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.07em; }
.gl-req { color:#DC2626; } .gl-hint-inline { font-size:9.5px; color:#94A3B8; text-transform:none; letter-spacing:0; font-weight:400; margin-left:3px; }
.gl-input-wrap { position:relative; display:flex; align-items:center; border:1px solid #E2E8F0; border-radius:8px; background:#fff; transition:border-color .15s,box-shadow .15s; }
.gl-input-wrap:focus-within { border-color:#0F766E; box-shadow:0 0 0 3px rgba(15,118,110,.10); }
.gl-input-wrap.gl-input-err { border-color:#FCA5A5; }
.gl-input-icon { position:absolute; left:10px; font-size:12px; color:#94A3B8; pointer-events:none; }
.gl-inp { width:100%; height:36px; border:none!important; outline:none!important; box-shadow:none!important; background:transparent!important; font-size:13px!important; color:#0F172A!important; padding:0 10px!important; border-radius:8px!important; }
.gl-inp:focus { border:none!important; outline:none!important; box-shadow:none!important; }
.gl-inp-icon { padding-left:30px!important; }

.gl-toggle-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; border:1.5px solid #E2E8F0; background:#F8FAFC; cursor:pointer; user-select:none; transition:border-color .15s,background .15s; }
.gl-toggle-on { border-color:#BBFFD9; background:#F0FDF9; }
.gl-toggle-left { display:flex; align-items:center; gap:10px; flex:1; }
.gl-toggle-icon { width:32px; height:32px; border-radius:8px; background:#F1F5F9; color:#94A3B8; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.gl-toggle-icon-on { background:#ECFDF5; color:#059669; }
.gl-toggle-title { font-size:13px; font-weight:600; color:#0F172A; }
.gl-toggle-sub { font-size:11px; color:#94A3B8; margin-top:1px; }
  `]
})
export class AdminGalleryComponent implements OnInit {
  private contentService = inject(ContentService);
  private toast    = inject(MessageService);
  private confirm  = inject(ConfirmationService);
  private fb       = inject(FormBuilder);

  listLoading = signal(true);
  saving      = signal(false);
  uploading   = signal(false);
  images      = signal<any[]>([]);
  editingId   = signal<string | null>(null);
  previewUrl  = signal<string | null>(null);
  dialogVisible = false;
  skeletons   = Array.from({ length: 8 }, (_, i) => i);

  activeCount = computed(() => this.images().filter(i => i.isActive).length);
  hiddenCount = computed(() => this.images().filter(i => !i.isActive).length);

  form = this.fb.group({
    title:    ['', Validators.required],
    subtitle: [''],
    imageUrl: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit() { this.load(); }

  load() {
    this.listLoading.set(true);
    this.contentService.getGalleryImagesAdmin().subscribe({
      next: res => { this.images.set(res.data ?? []); this.listLoading.set(false); },
      error: () => this.listLoading.set(false)
    });
  }

  openDialog(img?: any) {
    this.editingId.set(img?.id ?? null);
    this.previewUrl.set(img?.imageUrl ? img.imageUrl : null);
    if (img) {
      this.form.patchValue({ title: img.title, subtitle: img.subtitle ?? '', imageUrl: img.imageUrl, isActive: img.isActive });
    } else {
      this.form.reset({ isActive: true });
      this.previewUrl.set(null);
    }
    this.dialogVisible = true;
  }

  onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  private uploadFile(file: File) {
    this.uploading.set(true);
    this.contentService.uploadGalleryImage(file).subscribe({
      next: res => {
        const url = (res.data as any)?.url ?? '';
        this.form.patchValue({ imageUrl: url });
        this.previewUrl.set(url);
        this.uploading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed', life: 3000 });
        this.uploading.set(false);
      }
    });
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.form.patchValue({ imageUrl: '' });
    this.previewUrl.set(null);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = this.form.value;
    const req$ = this.editingId()
      ? this.contentService.updateGalleryImage(this.editingId()!, payload)
      : this.contentService.createGalleryImage(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Image ${this.editingId() ? 'updated' : 'uploaded'}`, life: 3000 });
        this.dialogVisible = false;
        this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save', life: 3000 }); }
    });
  }

  deleteImage(img: any) {
    this.confirm.confirm({
      header: 'Delete Image', message: `Delete "${img.title}"? This cannot be undone.`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contentService.deleteGalleryImage(img.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Image deleted', life: 3000 });
            this.images.update(list => list.filter(i => i.id !== img.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }
}
