import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf } from '@angular/common';
import { AdminDialogShellComponent } from '../../../admin/shared/admin-dialog-shell.component';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [AdminDialogShellComponent, MatIconModule, MatProgressSpinnerModule, NgIf],
  template: `
<app-admin-dialog-shell
  [title]="data.title || 'Confirm Action'"
  [icon]="data.icon || 'help_outline'"
  [mode]="data.confirmColor === 'warn' ? 'danger' : 'info'"
  (closed)="cancel()">

  <ng-container dialog-body>
    <p class="confirm-msg">{{ data.message }}</p>
  </ng-container>

  <ng-container dialog-footer>
    <button class="adlg-cancel" (click)="cancel()">
      {{ data.cancelLabel || 'Cancel' }}
    </button>
    <button
      [class]="data.confirmColor === 'warn' ? 'adlg-submit-danger' : 'adlg-submit'"
      (click)="confirm()">
      <mat-icon>{{ data.icon || 'check' }}</mat-icon>
      {{ data.confirmLabel || 'Confirm' }}
    </button>
  </ng-container>

</app-admin-dialog-shell>
  `,
  styles: [`
    /* phones: the popup may use almost the whole width and its two buttons may be narrower than the desktop minimum */
    .cdk-overlay-pane.mat-mdc-dialog-panel { max-width: 95vw !important; }
    app-confirm-dialog .adlg-cancel, app-confirm-dialog .adlg-submit, app-confirm-dialog .adlg-submit-danger { min-width: 0; }
    .confirm-msg {
      font-size: 14.5px; color: #374151; line-height: 1.6;
      margin: 0; padding: 4px 0;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  confirm(): void { this.dialogRef.close(true); }
  cancel(): void  { this.dialogRef.close(false); }
}
