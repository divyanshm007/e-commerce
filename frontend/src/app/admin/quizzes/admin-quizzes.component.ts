import { Component, OnInit, inject, signal, computed, ViewChild, ViewEncapsulation } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { QuizService } from '../../core/services/quiz.service';

@Component({
  selector: 'app-admin-quizzes',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, NgFor, ReactiveFormsModule, FormsModule,
    TableModule, InputTextModule, TextareaModule, ToggleSwitchModule,
    ToastModule, ConfirmDialogModule, DialogModule, SkeletonModule, SelectModule, TooltipModule
  ],
  template: `
<p-toast />
<p-confirmDialog />

<!-- ============================= LIST VIEW ============================= -->
<div class="qz-page" *ngIf="view() === 'list'">

  <div class="qz-page-header">
    <div>
      <h1 class="qz-page-title">Quizzes</h1>
      <p class="qz-page-sub">{{ quizzes().length }} quizzes total</p>
    </div>
    <div class="qz-header-actions">
      <button class="qz-refresh-btn" (click)="loadList()"><i class="pi pi-refresh"></i></button>
      <button class="qz-add-btn" (click)="openQuizDialog()"><i class="pi pi-plus"></i> New Quiz</button>
    </div>
  </div>

  <!-- KPI -->
  <div class="qz-kpi-row">
    @if (listLoading()) {
      @for (i of [1,2,3]; track i) {
        <div class="qz-kpi-card qz-kpi-skeleton">
          <p-skeleton width="36px" height="36px" styleClass="qz-sk-icon" />
          <p-skeleton width="55%" height="26px" styleClass="qz-sk-num" />
          <p-skeleton width="80%" height="11px" />
        </div>
      }
    }
    @if (!listLoading()) {
      <div class="qz-kpi-card qz-card-blue">
        <div class="qz-kpi-icon qz-icon-blue"><i class="pi pi-list-check"></i></div>
        <div class="qz-kpi-num">{{ quizzes().length }}</div>
        <div class="qz-kpi-lbl">Total Quizzes</div>
      </div>
      <div class="qz-kpi-card qz-card-teal">
        <div class="qz-kpi-icon qz-icon-teal"><i class="pi pi-check-circle"></i></div>
        <div class="qz-kpi-num">{{ activeCount() }}</div>
        <div class="qz-kpi-lbl">Active</div>
      </div>
      <div class="qz-kpi-card qz-card-amber">
        <div class="qz-kpi-icon qz-icon-amber"><i class="pi pi-eye-slash"></i></div>
        <div class="qz-kpi-num">{{ inactiveCount() }}</div>
        <div class="qz-kpi-lbl">Inactive</div>
      </div>
    }
  </div>

  <!-- Table -->
  <div class="qz-table-card">
    @if (listLoading()) {
      <div class="qz-load-toolbar"></div>
      <div class="qz-load-head"></div>
      @for (r of [1,2,3]; track r) { <div class="qz-load-row" [style.opacity]="(4-r)/4"></div> }
    }
    @if (!listLoading()) {
      <div class="qz-toolbar">
        <div class="qz-search-wrap">
          <i class="pi pi-search qz-search-icon"></i>
          <input class="qz-search-input" type="text" placeholder="Search…"
            [(ngModel)]="searchValue"
            (input)="dt.filterGlobal(searchValue, 'contains')" />
          <button *ngIf="searchValue" class="qz-search-clear" (click)="searchValue=''; dt.filterGlobal('', 'contains')">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="qz-toolbar-spacer"></div>
      </div>
      <p-table #dt [value]="quizzes()" styleClass="qz-dt" [tableStyle]="{'min-width':'600px'}"
        [globalFilterFields]="['title', 'slug']"
        [paginator]="true" [rows]="20" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:46px" class="qz-th-center">#</th>
            <th>Quiz</th>
            <th style="width:110px" class="qz-th-center">Questions</th>
            <th style="width:110px" class="qz-th-center">Result Types</th>
            <th style="width:100px" class="qz-th-center">Status</th>
            <th style="width:120px" class="qz-th-center">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-quiz let-i="rowIndex">
          <tr>
            <td class="qz-td-center qz-row-idx">{{ i + 1 }}</td>
            <td>
              <div class="qz-quiz-cell">
                <div class="qz-quiz-gradient" [style.background]="quiz.heroGradient"></div>
                <div>
                  <div class="qz-quiz-title">{{ quiz.title }}</div>
                  <div class="qz-quiz-slug">/quiz/{{ quiz.slug }}</div>
                </div>
              </div>
            </td>
            <td class="qz-td-center"><span class="qz-count-badge">{{ quiz.questionCount }}</span></td>
            <td class="qz-td-center"><span class="qz-count-badge qz-badge-purple">{{ quiz.resultTypeCount }}</span></td>
            <td class="qz-td-center">
              <span class="qz-status-pill" [class.qz-s-active]="quiz.isActive" [class.qz-s-inactive]="!quiz.isActive">
                <span class="qz-status-dot"></span>{{ quiz.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="qz-actions">
                <button class="qz-act-btn qz-act-manage" (click)="openEditor(quiz)" pTooltip="Manage Questions & Results" tooltipPosition="top">
                  <i class="pi pi-cog"></i>
                </button>
                <button class="qz-act-btn qz-act-edit" (click)="openQuizDialog(quiz)" pTooltip="Edit Info" tooltipPosition="top">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="qz-act-btn qz-act-del" (click)="deleteQuiz(quiz)" pTooltip="Delete" tooltipPosition="top">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">
            <div class="qz-empty">
              <div class="qz-empty-icon"><i class="pi pi-list-check"></i></div>
              <p class="qz-empty-title">No quizzes yet</p>
              <button class="qz-state-btn" (click)="openQuizDialog()"><i class="pi pi-plus"></i> Create First Quiz</button>
            </div>
          </td></tr>
        </ng-template>
      </p-table>
    }
  </div>
</div>

<!-- ============================= EDITOR VIEW ============================= -->
<div class="qz-editor" *ngIf="view() === 'editor'">

  <!-- Editor header -->
  <div class="qz-editor-header">
    <button class="qz-back-btn" (click)="backToList()"><i class="pi pi-arrow-left"></i> All Quizzes</button>
    <div class="qz-editor-title-row">
      <div class="qz-editor-badge" [style.background]="selectedQuiz()?.heroGradient">Q</div>
      <div>
        <h2 class="qz-editor-title">{{ selectedQuiz()?.title }}</h2>
        <span class="qz-editor-slug">/quiz/{{ selectedQuiz()?.slug }}</span>
      </div>
      <button class="qz-refresh-btn" style="margin-left:auto" (click)="reloadEditor()" [disabled]="editorLoading()">
        <i class="pi" [class]="editorLoading() ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
      </button>
    </div>
  </div>

  <div class="qz-editor-body" *ngIf="!editorLoading()">

    <!-- ── Result Types ── -->
    <div class="qz-section">
      <div class="qz-section-header">
        <div>
          <h3 class="qz-section-title">Result Types</h3>
          <p class="qz-section-sub">Define the outcomes users can get (e.g. Vata, Pitta, Kapha)</p>
        </div>
        <button class="qz-add-btn" (click)="openRtDialog()"><i class="pi pi-plus"></i> Add Type</button>
      </div>

      <div class="qz-rt-grid" *ngIf="editorQuiz()?.resultTypes?.length">
        <div class="qz-rt-card" *ngFor="let rt of editorQuiz().resultTypes">
          <div class="qz-rt-hero" [style.background]="rt.colorGradient || '#166534'">
            <span class="qz-rt-emoji">{{ rt.emoji }}</span>
          </div>
          <div class="qz-rt-body">
            <div class="qz-rt-key">{{ rt.key }}</div>
            <div class="qz-rt-title">{{ rt.title }}</div>
            <div class="qz-rt-desc" *ngIf="rt.description">{{ rt.description.substring(0,80) }}…</div>
          </div>
          <div class="qz-rt-actions">
            <button class="qz-act-btn qz-act-edit" (click)="openRtDialog(rt)" pTooltip="Edit" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
            <button class="qz-act-btn qz-act-del" (click)="deleteResultType(rt)" pTooltip="Delete" tooltipPosition="top"><i class="pi pi-trash"></i></button>
          </div>
        </div>
      </div>
      <div class="qz-rt-empty" *ngIf="!editorQuiz()?.resultTypes?.length">
        <i class="pi pi-tags"></i> No result types yet — add at least 2 before adding questions.
      </div>
    </div>

    <!-- ── Questions ── -->
    <div class="qz-section">
      <div class="qz-section-header">
        <div>
          <h3 class="qz-section-title">Questions</h3>
          <p class="qz-section-sub">{{ editorQuiz()?.questions?.length || 0 }} questions · each has 4 answer options</p>
        </div>
        <button class="qz-add-btn" (click)="openQDialog()" [disabled]="!editorQuiz()?.resultTypes?.length">
          <i class="pi pi-plus"></i> Add Question
        </button>
      </div>

      <div class="qz-questions-list" *ngIf="editorQuiz()?.questions?.length">
        <div class="qz-q-row" *ngFor="let q of editorQuiz().questions; let i = index">
          <div class="qz-q-num">Q{{ i + 1 }}</div>
          <div class="qz-q-content">
            <div class="qz-q-text">{{ q.text }}</div>
            <div class="qz-q-opts">
              <span class="qz-opt-chip" *ngFor="let opt of q.options">
                <span class="qz-opt-key" [attr.data-key]="opt.resultTypeKey">{{ opt.resultTypeKey }}</span>
                {{ opt.text }}
              </span>
            </div>
          </div>
          <div class="qz-q-actions">
            <button class="qz-act-btn qz-act-edit" (click)="openQDialog(q)" pTooltip="Edit" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
            <button class="qz-act-btn qz-act-del" (click)="deleteQuestion(q)" pTooltip="Delete" tooltipPosition="top"><i class="pi pi-trash"></i></button>
          </div>
        </div>
      </div>
      <div class="qz-rt-empty" *ngIf="!editorQuiz()?.questions?.length">
        <i class="pi pi-question-circle"></i> No questions yet.
        {{ !editorQuiz()?.resultTypes?.length ? 'Add result types first.' : 'Click "+ Add Question" to start.' }}
      </div>
    </div>
  </div>

  <div class="qz-editor-loading" *ngIf="editorLoading()">
    @for (i of [1,2,3,4]; track i) { <div class="qz-load-row" [style.opacity]="(5-i)/5"></div> }
  </div>
</div>

<!-- ===================== DIALOG: Quiz Info ===================== -->
<p-dialog [(visible)]="quizDialogVisible" [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="qz-dlg" [class.qz-dlg-edit]="!!quizEditingId()" [style]="{width:'520px',maxWidth:'96vw'}">
  <ng-template pTemplate="header">
    <div class="qz-dlg-head">
      <div class="qz-dlg-icon" [class.qz-dlg-icon-edit]="!!quizEditingId()">
        <i [class]="quizEditingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="qz-dlg-titles">
        <div class="qz-dlg-title">{{ quizEditingId() ? 'Edit Quiz' : 'New Quiz' }}</div>
        <div class="qz-dlg-sub">Configure basic quiz information</div>
      </div>
      <button class="qz-dlg-x" (click)="quizDialogVisible = false" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>
  <form [formGroup]="quizForm" autocomplete="off" class="qz-form">
    <div class="qz-field">
      <label class="qz-label">Title <span class="qz-req">*</span></label>
      <div class="qz-input-wrap" [class.qz-input-err]="quizForm.get('title')?.invalid && quizForm.get('title')?.touched">
        <i class="pi pi-list-check qz-input-icon"></i>
        <input pInputText formControlName="title" placeholder="e.g. Dosha Quiz" class="qz-inp qz-inp-icon" (input)="onQuizTitleChange()" />
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Slug <span class="qz-req">*</span></label>
      <div class="qz-input-wrap" [class.qz-input-err]="quizForm.get('slug')?.invalid && quizForm.get('slug')?.touched">
        <span class="qz-slug-prefix">/quiz/</span>
        <input pInputText formControlName="slug" placeholder="dosha-quiz" class="qz-inp qz-inp-prefix" />
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Description</label>
      <textarea pTextarea formControlName="description" rows="2" placeholder="Short description shown on the quiz intro…" class="qz-textarea"></textarea>
    </div>
    <div class="qz-field">
      <label class="qz-label">Hero Background</label>
      <div class="qz-gradient-presets">
        <button type="button" class="qz-grad-btn" *ngFor="let g of gradientPresets"
          [class.active]="quizForm.get('heroGradient')?.value === g.value"
          [style.background]="g.value" (click)="quizForm.patchValue({heroGradient: g.value})">
          {{ g.label }}
        </button>
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Visibility</label>
      <label class="qz-toggle-card" [class.qz-toggle-on]="quizForm.get('isActive')?.value">
        <div class="qz-toggle-left">
          <div class="qz-toggle-icon" [class.qz-toggle-icon-on]="quizForm.get('isActive')?.value">
            <i [class]="quizForm.get('isActive')?.value ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
          </div>
          <div>
            <div class="qz-toggle-title">{{ quizForm.get('isActive')?.value ? 'Active' : 'Inactive' }}</div>
            <div class="qz-toggle-sub">{{ quizForm.get('isActive')?.value ? 'Visible to users' : 'Hidden from users' }}</div>
          </div>
        </div>
        <p-toggleswitch formControlName="isActive" />
      </label>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <div class="qz-dlg-footer">
      <button class="qz-dlg-cancel" [disabled]="saving()" (click)="quizDialogVisible = false"><i class="pi pi-times"></i> Cancel</button>
      <button class="qz-dlg-save" [disabled]="quizForm.invalid || saving()" (click)="saveQuiz()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (quizEditingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (quizEditingId() ? 'Update Quiz' : 'Create Quiz') }}
      </button>
    </div>
  </ng-template>
</p-dialog>

<!-- ===================== DIALOG: Result Type ===================== -->
<p-dialog [(visible)]="rtDialogVisible" [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="qz-dlg" [class.qz-dlg-edit]="!!rtEditingId()" [style]="{width:'580px',maxWidth:'96vw'}">
  <ng-template pTemplate="header">
    <div class="qz-dlg-head">
      <div class="qz-dlg-icon" [class.qz-dlg-icon-edit]="!!rtEditingId()">
        <i [class]="rtEditingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="qz-dlg-titles">
        <div class="qz-dlg-title">{{ rtEditingId() ? 'Edit Result Type' : 'New Result Type' }}</div>
        <div class="qz-dlg-sub">Define what this result means for the user</div>
      </div>
      <button class="qz-dlg-x" (click)="rtDialogVisible = false" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>
  <form [formGroup]="rtForm" autocomplete="off" class="qz-form">
    <div class="qz-form-2col">
      <div class="qz-field">
        <label class="qz-label">Key <span class="qz-req">*</span> <span class="qz-hint-inline">(e.g. vata)</span></label>
        <div class="qz-input-wrap" [class.qz-input-err]="rtForm.get('key')?.invalid && rtForm.get('key')?.touched">
          <i class="pi pi-key qz-input-icon"></i>
          <input pInputText formControlName="key" placeholder="vata" class="qz-inp qz-inp-icon" />
        </div>
      </div>
      <div class="qz-field">
        <label class="qz-label">Emoji</label>
        <div class="qz-input-wrap">
          <i class="pi pi-face-smile qz-input-icon"></i>
          <input pInputText formControlName="emoji" placeholder="🌬️" class="qz-inp qz-inp-icon" />
        </div>
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Title <span class="qz-req">*</span></label>
      <div class="qz-input-wrap" [class.qz-input-err]="rtForm.get('title')?.invalid && rtForm.get('title')?.touched">
        <i class="pi pi-tag qz-input-icon"></i>
        <input pInputText formControlName="title" placeholder="e.g. Vata Dominant" class="qz-inp qz-inp-icon" />
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Description</label>
      <textarea pTextarea formControlName="description" rows="3" placeholder="What this result type means for the user…" class="qz-textarea"></textarea>
    </div>
    <div class="qz-form-2col">
      <div class="qz-field">
        <label class="qz-label">Traits <span class="qz-hint-inline">(one per line)</span></label>
        <textarea pTextarea formControlName="traits" rows="4" placeholder="Creative & imaginative&#10;Quick thinker&#10;Sensitive to cold" class="qz-textarea"></textarea>
      </div>
      <div class="qz-field">
        <label class="qz-label">Search Terms <span class="qz-hint-inline">(one per line)</span></label>
        <textarea pTextarea formControlName="searchTerms" rows="4" placeholder="Ashwagandha&#10;Triphala&#10;Ginger Tea" class="qz-textarea"></textarea>
      </div>
    </div>
    <div class="qz-field">
      <label class="qz-label">Recommendations <span class="qz-hint-inline">(one per line)</span></label>
      <textarea pTextarea formControlName="recommendations" rows="4" placeholder="Eat warm, oily, grounding foods regularly&#10;Ashwagandha to reduce anxiety…" class="qz-textarea"></textarea>
    </div>
    <div class="qz-field">
      <label class="qz-label">Color Gradient</label>
      <div class="qz-gradient-presets">
        <button type="button" class="qz-grad-btn" *ngFor="let g of colorPresets"
          [class.active]="rtForm.get('colorGradient')?.value === g.value"
          [style.background]="g.value" (click)="rtForm.patchValue({colorGradient: g.value})">
          {{ g.label }}
        </button>
      </div>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <div class="qz-dlg-footer">
      <button class="qz-dlg-cancel" [disabled]="saving()" (click)="rtDialogVisible = false"><i class="pi pi-times"></i> Cancel</button>
      <button class="qz-dlg-save" [disabled]="rtForm.invalid || saving()" (click)="saveResultType()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (rtEditingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (rtEditingId() ? 'Update' : 'Add Type') }}
      </button>
    </div>
  </ng-template>
</p-dialog>

<!-- ===================== DIALOG: Question ===================== -->
<p-dialog [(visible)]="qDialogVisible" [modal]="true" [draggable]="false" [resizable]="false" [closable]="true" [dismissableMask]="true"
  styleClass="qz-dlg" [class.qz-dlg-edit]="!!qEditingId()" [style]="{width:'620px',maxWidth:'96vw'}">
  <ng-template pTemplate="header">
    <div class="qz-dlg-head">
      <div class="qz-dlg-icon" [class.qz-dlg-icon-edit]="!!qEditingId()">
        <i [class]="qEditingId() ? 'pi pi-pencil' : 'pi pi-plus'"></i>
      </div>
      <div class="qz-dlg-titles">
        <div class="qz-dlg-title">{{ qEditingId() ? 'Edit Question' : 'New Question' }}</div>
        <div class="qz-dlg-sub">Question text + 4 answer options mapped to result types</div>
      </div>
      <button class="qz-dlg-x" (click)="qDialogVisible = false" [disabled]="saving()"><i class="pi pi-times"></i></button>
    </div>
  </ng-template>
  <form [formGroup]="qForm" autocomplete="off" class="qz-form">
    <div class="qz-field">
      <label class="qz-label">Question Text <span class="qz-req">*</span></label>
      <div class="qz-input-wrap" [class.qz-input-err]="qForm.get('text')?.invalid && qForm.get('text')?.touched">
        <i class="pi pi-question-circle qz-input-icon"></i>
        <input pInputText formControlName="text" placeholder="e.g. How would you describe your body frame?" class="qz-inp qz-inp-icon" />
      </div>
    </div>

    <div class="qz-options-section">
      <div class="qz-options-header">
        <span class="qz-options-title">Answer Options</span>
        <span class="qz-options-hint">Each option maps to a result type</span>
      </div>

      <div class="qz-option-row" *ngFor="let ctrl of optionsArray.controls; let i = index" [formGroup]="asGroup(ctrl)">
        <div class="qz-opt-letter">{{ ['A','B','C','D'][i] }}</div>
        <div class="qz-opt-fields">
          <div class="qz-input-wrap" [class.qz-input-err]="ctrl.get('text')?.invalid && ctrl.get('text')?.touched">
            <input pInputText formControlName="text" [placeholder]="'Option ' + ['A','B','C','D'][i] + ' text'" class="qz-inp" />
          </div>
          <p-select
            formControlName="resultTypeKey"
            [options]="resultTypeOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Maps to…"
            styleClass="qz-opt-select" />
        </div>
      </div>
    </div>

    <div class="qz-field">
      <label class="qz-label">Sort Order</label>
      <div class="qz-input-wrap">
        <i class="pi pi-sort-numeric-up qz-input-icon"></i>
        <input pInputText type="number" formControlName="sortOrder" placeholder="0" class="qz-inp qz-inp-icon" />
      </div>
    </div>
  </form>
  <ng-template pTemplate="footer">
    <div class="qz-dlg-footer">
      <button class="qz-dlg-cancel" [disabled]="saving()" (click)="qDialogVisible = false"><i class="pi pi-times"></i> Cancel</button>
      <button class="qz-dlg-save" [disabled]="qForm.invalid || saving()" (click)="saveQuestion()">
        <i [class]="saving() ? 'pi pi-spin pi-spinner' : (qEditingId() ? 'pi pi-check' : 'pi pi-plus')"></i>
        {{ saving() ? 'Saving…' : (qEditingId() ? 'Update Question' : 'Add Question') }}
      </button>
    </div>
  </ng-template>
</p-dialog>
  `,
  styles: [`
/* ================================================================
   ADMIN QUIZZES — ViewEncapsulation.None, all selectors .qz-*
================================================================ */
.qz-page { min-height:100vh; background:#F6F8FA; padding:20px; display:flex; flex-direction:column; }
.qz-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
.qz-page-title  { font-size:22px; font-weight:700; color:#0F172A; letter-spacing:-0.3px; margin:0; line-height:1.25; }
.qz-page-sub    { font-size:13px; color:#64748B; margin:2px 0 0; }
.qz-header-actions { display:flex; align-items:center; gap:8px; margin-top:2px; }
.qz-refresh-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid #E2E8F0; border-radius:7px; background:#fff; color:#64748B; cursor:pointer; font-size:12px; }
.qz-refresh-btn:hover { background:#F8FAFC; color:#0F172A; }
.qz-refresh-btn:disabled { opacity:.5; cursor:not-allowed; }
.qz-add-btn { display:inline-flex; align-items:center; gap:5px; height:32px; padding:0 12px; border-radius:7px; background:#0F766E; color:#fff; font-size:12px; font-weight:600; border:none; cursor:pointer; }
.qz-add-btn:hover:not(:disabled) { background:#115E59; }
.qz-add-btn:disabled { opacity:.5; cursor:not-allowed; }
.qz-add-btn .pi { font-size:11px; }

/* KPI */
.qz-kpi-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
.qz-kpi-card { background:rgba(255,255,255,.82); backdrop-filter:blur(10px); border:1px solid rgba(226,232,240,.85); border-top-width:3px; border-radius:14px; padding:16px; min-height:130px; display:flex; flex-direction:column; box-shadow:0 2px 8px rgba(15,23,42,.05),0 8px 24px rgba(15,23,42,.07); transition:box-shadow .18s,transform .18s; }
.qz-kpi-card:hover { transform:translateY(-2px); }
.qz-kpi-skeleton { background:rgba(255,255,255,.82); border:1px solid rgba(226,232,240,.85); border-radius:14px; padding:16px; min-height:130px; display:flex; flex-direction:column; }
.qz-card-blue { border-top-color:#2563EB !important; } .qz-card-teal { border-top-color:#0F766E !important; } .qz-card-amber { border-top-color:#D97706 !important; }
.qz-kpi-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; margin-bottom:10px; flex-shrink:0; }
.qz-icon-blue { background:#EFF6FF; color:#2563EB; } .qz-icon-teal { background:#F0FDFA; color:#0F766E; } .qz-icon-amber { background:#FFFBEB; color:#D97706; }
.qz-kpi-num { font-size:26px; font-weight:700; color:#0F172A; line-height:1; letter-spacing:-.5px; margin-bottom:5px; }
.qz-kpi-lbl { font-size:10.5px; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:.06em; margin-top:auto; }
.qz-sk-icon { border-radius:8px !important; margin-bottom:10px; display:block; } .qz-sk-num { margin-bottom:6px; display:block; }

/* Table card */
.qz-table-card { background:rgba(255,255,255,.88); border:1px solid rgba(226,232,240,.9); border-radius:14px; overflow:hidden; box-shadow:0 4px 16px rgba(15,23,42,.035); flex:1; }
.qz-dt .p-datatable-thead > tr > th { background:#F0FDF9 !important; color:#0F5C4D !important; font-size:10.5px !important; font-weight:600 !important; text-transform:uppercase !important; letter-spacing:.04em !important; padding:0 13px !important; height:44px !important; border:none !important; border-bottom:1px solid #DDEFE9 !important; white-space:nowrap; }
.qz-th-center { text-align:center !important; } .qz-td-center { text-align:center !important; }
.qz-dt .p-datatable-tbody > tr > td { padding:0 13px !important; height:68px !important; vertical-align:middle !important; border:none !important; border-bottom:1px solid #F1F5F9 !important; color:#334155; }
.qz-dt .p-datatable-tbody > tr:last-child > td { border-bottom:none !important; }
.qz-dt .p-datatable-tbody > tr:hover > td { background:#FAFDFC !important; }
.qz-table-card .p-paginator { padding:6px 12px !important; min-height:46px; border-top:1px solid #E2E8F0 !important; border-radius:0 0 14px 14px; background:#FAFBFC !important; font-size:12px; }
.qz-load-toolbar { height:46px; background:#FAFBFC; border-bottom:1px solid #E2E8F0; }
.qz-load-head { height:44px; background:#F0FDF9; border-bottom:1px solid #DDEFE9; }
.qz-load-row { height:68px; background:#fff; border-bottom:1px solid #F1F5F9; }
.qz-row-idx { font-size:11.5px; color:#CBD5E1; font-weight:500; }

.qz-quiz-cell { display:flex; align-items:center; gap:10px; }
.qz-quiz-gradient { width:36px; height:36px; border-radius:8px; flex-shrink:0; }
.qz-quiz-title { font-size:13px; font-weight:600; color:#0F172A; }
.qz-quiz-slug  { font-size:11px; color:#94A3B8; }
.qz-count-badge { display:inline-flex; align-items:center; justify-content:center; min-width:28px; height:22px; padding:0 6px; border-radius:5px; background:#EFF6FF; color:#2563EB; font-size:12px; font-weight:700; }
.qz-badge-purple { background:#F5F3FF; color:#7C3AED; }
.qz-status-pill { display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500; }
.qz-s-active { background:#F0FDF4; color:#16A34A; } .qz-s-inactive { background:#FEF2F2; color:#DC2626; }
.qz-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; flex-shrink:0; }
.qz-toolbar { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #E2E8F0; background: #FAFBFC; }
.qz-toolbar-spacer { flex: 1; }
.qz-search-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; height: 32px; min-width: 200px; max-width: 300px; transition: border-color 0.15s, box-shadow 0.15s; }
.qz-search-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.qz-search-icon { position: absolute; left: 9px; font-size: 11px; color: #94A3B8; pointer-events: none; }
.qz-search-input { width: 100%; height: 100%; border: none; outline: none; background: transparent; padding: 0 28px 0 28px; font-size: 12.5px; color: #0F172A; }
.qz-search-input::placeholder { color: #CBD5E1; }
.qz-search-clear { position: absolute; right: 6px; width: 18px; height: 18px; border-radius: 50%; border: none; background: #E2E8F0; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 9px; transition: background 0.12s; }
.qz-search-clear:hover { background: #CBD5E1; }
.qz-actions { display:flex; align-items:center; justify-content:center; gap:2px; }
.qz-act-btn { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; border:none; background:none; cursor:pointer; color:#64748B; transition:background .12s,color .12s; }
.qz-act-btn .pi { font-size:12px; }
.qz-act-manage:hover { background:#F5F3FF; color:#7C3AED; }
.qz-act-edit { color: #2563EB; } .qz-act-edit:hover { background:#EFF6FF; color:#1D4ED8; }
.qz-act-del { color: #DC2626; } .qz-act-del:hover  { background:#FEF2F2; color:#B91C1C; }
.qz-state-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:6px; background:#0F766E; color:#fff; border:none; font-size:12px; cursor:pointer; }
.qz-empty { display:flex; flex-direction:column; align-items:center; padding:28px; text-align:center; gap:8px; }
.qz-empty-icon { width:36px; height:36px; border-radius:8px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; }
.qz-empty-icon .pi { font-size:16px; color:#94A3B8; }
.qz-empty-title { font-size:13px; font-weight:600; color:#334155; margin:0; }

/* ── EDITOR VIEW ── */
.qz-editor { min-height:100vh; background:#F6F8FA; padding:20px; }
.qz-editor-header { margin-bottom:20px; }
.qz-back-btn { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#64748B; background:none; border:none; cursor:pointer; padding:0; margin-bottom:12px; }
.qz-back-btn:hover { color:#0F172A; }
.qz-back-btn .pi { font-size:11px; }
.qz-editor-title-row { display:flex; align-items:center; gap:12px; }
.qz-editor-badge { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; font-weight:800; flex-shrink:0; }
.qz-editor-title { font-size:20px; font-weight:700; color:#0F172A; margin:0; line-height:1.2; }
.qz-editor-slug { font-size:11.5px; color:#94A3B8; }
.qz-editor-body { display:flex; flex-direction:column; gap:16px; }
.qz-editor-loading { display:flex; flex-direction:column; gap:0; }

.qz-section { background:#fff; border:1px solid #E2E8F0; border-radius:14px; overflow:hidden; }
.qz-section-header { display:flex; align-items:flex-start; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #F1F5F9; }
.qz-section-title { font-size:14px; font-weight:700; color:#0F172A; margin:0 0 2px; }
.qz-section-sub   { font-size:11.5px; color:#94A3B8; margin:0; }

/* Result type cards */
.qz-rt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; padding:16px; }
.qz-rt-card { border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; position:relative; }
.qz-rt-hero { height:70px; display:flex; align-items:center; justify-content:center; }
.qz-rt-emoji { font-size:28px; }
.qz-rt-body { padding:10px 12px; }
.qz-rt-key   { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94A3B8; margin-bottom:2px; }
.qz-rt-title { font-size:12px; font-weight:700; color:#0F172A; margin-bottom:3px; }
.qz-rt-desc  { font-size:10.5px; color:#94A3B8; line-height:1.4; }
.qz-rt-actions { position:absolute; top:6px; right:6px; display:flex; gap:2px; opacity:0; transition:opacity .15s; }
.qz-rt-card:hover .qz-rt-actions { opacity:1; }
.qz-rt-empty { display:flex; align-items:center; gap:8px; padding:16px 20px; font-size:12.5px; color:#94A3B8; .pi { font-size:14px; } }

/* Questions list */
.qz-questions-list { display:flex; flex-direction:column; }
.qz-q-row { display:flex; align-items:flex-start; gap:14px; padding:14px 20px; border-bottom:1px solid #F8FAFC; }
.qz-q-row:last-child { border-bottom:none; }
.qz-q-row:hover { background:#FAFBFC; }
.qz-q-num { width:28px; height:28px; border-radius:6px; background:#F0FDF9; color:#0F766E; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.qz-q-content { flex:1; min-width:0; }
.qz-q-text { font-size:13px; font-weight:600; color:#0F172A; margin-bottom:8px; line-height:1.35; }
.qz-q-opts  { display:flex; flex-wrap:wrap; gap:6px; }
.qz-opt-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:4px; background:#F1F5F9; font-size:11px; color:#475569; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.qz-opt-key { font-size:9.5px; font-weight:700; text-transform:uppercase; background:#0F766E; color:#fff; padding:1px 4px; border-radius:3px; flex-shrink:0; }
.qz-q-actions { display:flex; gap:2px; flex-shrink:0; }

/* ── DIALOGS ── */
.qz-dlg { border-radius:14px !important; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,.18) !important; }
.qz-dlg .p-dialog-header { padding:0 !important; border-bottom:none !important; background:#fff !important; }
.qz-dlg .p-dialog-content { padding:20px 22px !important; background:#fff !important; max-height:72vh; overflow-y:auto; }
.qz-dlg .p-dialog-footer  { padding:14px 22px !important; border-top:1px solid #F1F5F9 !important; background:#FAFBFC !important; border-radius:0 0 14px 14px; }
.qz-dlg .p-dialog-header::before { content:''; display:block; height:4px; background:linear-gradient(90deg,#0F766E 0%,#14B8A6 100%); }
.qz-dlg-edit .p-dialog-header::before { background:linear-gradient(90deg,#2563EB 0%,#7C3AED 100%); }
.qz-dlg-head { display:flex; align-items:center; gap:12px; padding:16px 22px 14px; }
.qz-dlg-icon { width:38px; height:38px; border-radius:10px; background:#F0FDFA; color:#0F766E; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; border:1px solid #CCFBF1; }
.qz-dlg-icon-edit { background:#EFF6FF; color:#2563EB; border-color:#BFDBFE; }
.qz-dlg-titles { flex:1; min-width:0; }
.qz-dlg-title { font-size:15px; font-weight:700; color:#0F172A; line-height:1.25; }
.qz-dlg-sub   { font-size:11.5px; color:#94A3B8; margin-top:2px; }
.qz-dlg-x { width:30px; height:30px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#94A3B8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; flex-shrink:0; }
.qz-dlg-x:hover:not(:disabled) { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
.qz-dlg-x:disabled { opacity:.4; cursor:not-allowed; }
.qz-dlg-footer { display:flex; justify-content:flex-end; gap:8px; }
.qz-dlg-cancel { display:inline-flex; align-items:center; gap:5px; height:34px; padding:0 14px; border-radius:7px; border:1px solid #E2E8F0; background:#fff; color:#64748B; font-size:12.5px; font-weight:500; cursor:pointer; }
.qz-dlg-cancel:disabled { opacity:.45; cursor:not-allowed; }
.qz-dlg-save { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 16px; border-radius:7px; border:none; background:#0F766E; color:#fff; font-size:12.5px; font-weight:600; cursor:pointer; }
.qz-dlg-save:hover:not(:disabled) { background:#115E59; }
.qz-dlg-save:disabled { opacity:.45; cursor:not-allowed; }
.qz-dlg-save .pi,.qz-dlg-cancel .pi { font-size:10px; }

/* Form fields */
.qz-form { display:flex; flex-direction:column; gap:14px; }
.qz-field { display:flex; flex-direction:column; gap:5px; }
.qz-form-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.qz-label { font-size:10.5px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.07em; }
.qz-req { color:#DC2626; } .qz-hint-inline { font-size:9.5px; color:#94A3B8; text-transform:none; letter-spacing:0; font-weight:400; margin-left:3px; }
.qz-input-wrap { position:relative; display:flex; align-items:center; border:1px solid #E2E8F0; border-radius:8px; background:#fff; transition:border-color .15s,box-shadow .15s; }
.qz-input-wrap:focus-within { border-color:#0F766E; box-shadow:0 0 0 3px rgba(15,118,110,.10); }
.qz-input-wrap.qz-input-err { border-color:#FCA5A5; }
.qz-input-icon { position:absolute; left:10px; font-size:12px; color:#94A3B8; pointer-events:none; z-index:1; }
.qz-slug-prefix { padding:0 0 0 12px; font-size:12px; color:#94A3B8; white-space:nowrap; flex-shrink:0; }
.qz-inp { width:100%; height:36px; border:none !important; outline:none !important; box-shadow:none !important; background:transparent !important; font-size:13px !important; color:#0F172A !important; padding:0 10px !important; border-radius:8px !important; }
.qz-inp:focus { border:none !important; outline:none !important; box-shadow:none !important; }
.qz-inp-icon { padding-left:30px !important; } .qz-inp-prefix { padding-left:4px !important; }
.qz-textarea { width:100% !important; box-sizing:border-box; resize:vertical; padding:9px 11px !important; font-size:13px !important; color:#0F172A !important; border:1px solid #E2E8F0 !important; border-radius:8px !important; background:#fff !important; line-height:1.6; box-shadow:none !important; outline:none !important; font-family:inherit !important; min-height:70px; }
.qz-textarea:focus { border-color:#0F766E !important; box-shadow:0 0 0 3px rgba(15,118,110,.10) !important; }

/* Gradient presets */
.qz-gradient-presets { display:flex; flex-wrap:wrap; gap:6px; }
.qz-grad-btn { height:28px; padding:0 12px; border-radius:6px; border:2px solid transparent; color:#fff; font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; text-shadow:0 1px 2px rgba(0,0,0,.3); }
.qz-grad-btn.active { border-color:#fff; box-shadow:0 0 0 2px #0F766E; }

/* Question options in dialog */
.qz-options-section { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; }
.qz-options-header { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid #E2E8F0; background:#F0FDF9; }
.qz-options-title { font-size:11px; font-weight:700; color:#0F5C4D; text-transform:uppercase; letter-spacing:.05em; }
.qz-options-hint  { font-size:10.5px; color:#94A3B8; }
.qz-option-row { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid #F1F5F9; }
.qz-option-row:last-child { border-bottom:none; }
.qz-opt-letter { width:24px; height:24px; border-radius:6px; background:#0F766E; color:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qz-opt-fields { flex:1; display:flex; gap:8px; min-width:0; }
.qz-opt-fields .qz-input-wrap { flex:1; }
.qz-opt-select { width:130px !important; font-size:12px !important; }

/* Toggle */
.qz-toggle-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; border:1.5px solid #E2E8F0; background:#F8FAFC; cursor:pointer; user-select:none; transition:border-color .15s,background .15s; }
.qz-toggle-on { border-color:#BBFFD9; background:#F0FDF9; }
.qz-toggle-left { display:flex; align-items:center; gap:10px; flex:1; }
.qz-toggle-icon { width:32px; height:32px; border-radius:8px; background:#F1F5F9; color:#94A3B8; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
.qz-toggle-icon-on { background:#ECFDF5; color:#059669; }
.qz-toggle-title { font-size:13px; font-weight:600; color:#0F172A; }
.qz-toggle-sub { font-size:11px; color:#94A3B8; margin-top:1px; }
@media (max-width: 768px) { .qz-table-card { min-width: 0; overflow-x: auto !important; } }
  `]
})
export class AdminQuizzesComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  searchValue = '';

  private quizService = inject(QuizService);
  private toast   = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private fb      = inject(FormBuilder);

  // ── view state
  view         = signal<'list' | 'editor'>('list');
  listLoading  = signal(true);
  editorLoading = signal(false);
  saving       = signal(false);

  quizzes      = signal<any[]>([]);
  selectedQuiz = signal<any>(null);
  editorQuiz   = signal<any>(null);

  activeCount   = computed(() => this.quizzes().filter(q => q.isActive).length);
  inactiveCount = computed(() => this.quizzes().filter(q => !q.isActive).length);

  // ── dialog visibility
  quizDialogVisible = false;
  rtDialogVisible   = false;
  qDialogVisible    = false;

  // ── editing ids
  quizEditingId = signal<string | null>(null);
  rtEditingId   = signal<string | null>(null);
  qEditingId    = signal<string | null>(null);

  // ── result type options for question option dropdowns
  resultTypeOptions = computed(() =>
    (this.editorQuiz()?.resultTypes ?? []).map((rt: any) => ({ label: `${rt.emoji ?? ''} ${rt.title}`, value: rt.key }))
  );

  // ── gradient presets
  gradientPresets = [
    { label: 'Green',  value: 'linear-gradient(135deg, #166534, #15803d)' },
    { label: 'Blue',   value: 'linear-gradient(135deg, #1e40af, #2563eb)' },
    { label: 'Amber',  value: 'linear-gradient(135deg, #b45309, #d97706)' },
    { label: 'Purple', value: 'linear-gradient(135deg, #5b21b6, #7c3aed)' },
    { label: 'Teal',   value: 'linear-gradient(135deg, #0f5c4d, #0f766e)' },
    { label: 'Rose',   value: 'linear-gradient(135deg, #9f1239, #e11d48)' },
  ];

  colorPresets = [
    { label: 'Sky',    value: 'linear-gradient(135deg, #0369a1, #0284c7)' },
    { label: 'Amber',  value: 'linear-gradient(135deg, #b45309, #d97706)' },
    { label: 'Green',  value: 'linear-gradient(135deg, #166534, #15803d)' },
    { label: 'Purple', value: 'linear-gradient(135deg, #5b21b6, #7c3aed)' },
    { label: 'Rose',   value: 'linear-gradient(135deg, #9f1239, #e11d48)' },
    { label: 'Teal',   value: 'linear-gradient(135deg, #0f5c4d, #0f766e)' },
  ];

  // ── forms
  quizForm = this.fb.group({
    title:        ['', Validators.required],
    slug:         ['', Validators.required],
    description:  [''],
    heroGradient: ['linear-gradient(135deg, #166534, #15803d)'],
    sortOrder:    [0],
    isActive:     [true]
  });

  rtForm = this.fb.group({
    key:             ['', Validators.required],
    title:           ['', Validators.required],
    emoji:           [''],
    description:     [''],
    traits:          [''],
    recommendations: [''],
    searchTerms:     [''],
    colorGradient:   ['linear-gradient(135deg, #0369a1, #0284c7)'],
    sortOrder:       [0]
  });

  qForm = this.fb.group({
    text:      ['', Validators.required],
    sortOrder: [0],
    options:   this.fb.array([
      this.makeOption(), this.makeOption(), this.makeOption(), this.makeOption()
    ])
  });

  get optionsArray(): FormArray { return this.qForm.get('options') as FormArray; }
  asGroup(ctrl: any): FormGroup { return ctrl as FormGroup; }

  ngOnInit() { this.loadList(); }

  // ── helpers
  private makeOption() {
    return this.fb.group({
      text:          ['', Validators.required],
      resultTypeKey: ['', Validators.required]
    });
  }

  // ── LIST actions
  loadList() {
    this.listLoading.set(true);
    this.quizService.getAllQuizzes().subscribe({
      next: res => { this.quizzes.set(res.data ?? []); this.listLoading.set(false); },
      error: () => this.listLoading.set(false)
    });
  }

  openQuizDialog(quiz?: any) {
    this.quizEditingId.set(quiz?.id ?? null);
    if (quiz) {
      this.quizForm.patchValue({
        title: quiz.title, slug: quiz.slug, description: quiz.description ?? '',
        heroGradient: quiz.heroGradient, sortOrder: quiz.sortOrder, isActive: quiz.isActive
      });
    } else {
      this.quizForm.reset({ heroGradient: 'linear-gradient(135deg, #166534, #15803d)', sortOrder: 0, isActive: true });
    }
    this.quizDialogVisible = true;
  }

  onQuizTitleChange() {
    if (!this.quizEditingId()) {
      const title = this.quizForm.get('title')?.value ?? '';
      const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
      this.quizForm.patchValue({ slug }, { emitEvent: false });
    }
  }

  saveQuiz() {
    if (this.quizForm.invalid) { this.quizForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = { ...this.quizForm.value, sortOrder: Number(this.quizForm.value.sortOrder ?? 0) };
    const req$ = this.quizEditingId()
      ? this.quizService.updateQuiz(this.quizEditingId()!, payload)
      : this.quizService.createQuiz(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Quiz ${this.quizEditingId() ? 'updated' : 'created'}`, life: 3000 });
        this.quizDialogVisible = false;
        this.loadList();
        if (this.view() === 'editor') this.reloadEditor();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save quiz', life: 3000 }); }
    });
  }

  deleteQuiz(quiz: any) {
    this.confirm.confirm({
      header: 'Delete Quiz', message: `Delete "${quiz.title}" and all its questions? This cannot be undone.`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.quizService.deleteQuiz(quiz.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Quiz deleted', life: 3000 });
            this.quizzes.update(list => list.filter(q => q.id !== quiz.id));
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }

  // ── EDITOR navigation
  openEditor(quiz: any) {
    this.selectedQuiz.set(quiz);
    this.view.set('editor');
    this.reloadEditor();
  }

  backToList() { this.view.set('list'); this.loadList(); }

  reloadEditor() {
    const id = this.selectedQuiz()?.id;
    if (!id) return;
    this.editorLoading.set(true);
    this.quizService.getQuizFull(id).subscribe({
      next: res => { this.editorQuiz.set(res.data ?? null); this.editorLoading.set(false); },
      error: () => this.editorLoading.set(false)
    });
  }

  // ── RESULT TYPES
  openRtDialog(rt?: any) {
    this.rtEditingId.set(rt?.id ?? null);
    if (rt) {
      this.rtForm.patchValue({
        key: rt.key, title: rt.title, emoji: rt.emoji ?? '', description: rt.description ?? '',
        traits: rt.traits ?? '', recommendations: rt.recommendations ?? '', searchTerms: rt.searchTerms ?? '',
        colorGradient: rt.colorGradient ?? 'linear-gradient(135deg, #0369a1, #0284c7)', sortOrder: rt.sortOrder ?? 0
      });
    } else {
      this.rtForm.reset({ colorGradient: 'linear-gradient(135deg, #0369a1, #0284c7)', sortOrder: 0 });
    }
    this.rtDialogVisible = true;
  }

  saveResultType() {
    if (this.rtForm.invalid) { this.rtForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const quizId = this.editorQuiz()?.id;
    const req$ = this.rtEditingId()
      ? this.quizService.updateResultType(this.rtEditingId()!, this.rtForm.value)
      : this.quizService.addResultType(quizId, this.rtForm.value);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Result type ${this.rtEditingId() ? 'updated' : 'added'}`, life: 3000 });
        this.rtDialogVisible = false;
        this.reloadEditor();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save result type', life: 3000 }); }
    });
  }

  deleteResultType(rt: any) {
    this.confirm.confirm({
      header: 'Delete Result Type', message: `Delete "${rt.title}"?`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.quizService.deleteResultType(rt.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Result type deleted', life: 3000 });
            this.reloadEditor();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }

  // ── QUESTIONS
  openQDialog(q?: any) {
    this.qEditingId.set(q?.id ?? null);
    if (q) {
      this.qForm.patchValue({ text: q.text, sortOrder: q.sortOrder ?? 0 });
      const opts = q.options ?? [];
      this.optionsArray.controls.forEach((ctrl, i) => {
        ctrl.patchValue({ text: opts[i]?.text ?? '', resultTypeKey: opts[i]?.resultTypeKey ?? '' });
      });
    } else {
      this.qForm.reset({ sortOrder: 0 });
      this.optionsArray.controls.forEach(ctrl => ctrl.reset());
    }
    this.qDialogVisible = true;
  }

  saveQuestion() {
    if (this.qForm.invalid) { this.qForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const quizId = this.editorQuiz()?.id;
    const raw = this.qForm.value;
    const payload = {
      text: raw.text,
      sortOrder: Number(raw.sortOrder ?? 0),
      options: (raw.options as any[]).map((o, i) => ({
        text: o.text, resultTypeKey: o.resultTypeKey, sortOrder: i + 1
      }))
    };
    const req$ = this.qEditingId()
      ? this.quizService.updateQuestion(this.qEditingId()!, payload)
      : this.quizService.addQuestion(quizId, payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: `Question ${this.qEditingId() ? 'updated' : 'added'}`, life: 3000 });
        this.qDialogVisible = false;
        this.reloadEditor();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save question', life: 3000 }); }
    });
  }

  deleteQuestion(q: any) {
    this.confirm.confirm({
      header: 'Delete Question', message: `Delete this question and its options?`,
      icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.quizService.deleteQuestion(q.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Deleted', detail: 'Question deleted', life: 3000 });
            this.reloadEditor();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000 })
        });
      }
    });
  }
}
