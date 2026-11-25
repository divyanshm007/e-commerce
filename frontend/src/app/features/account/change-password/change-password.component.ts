import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

function matchPwd(c: AbstractControl) {
  return c.get('newPassword')?.value === c.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">Change Password</h2>

      <div class="form-card">
        <p class="success-msg" *ngIf="saved">Password changed successfully!</p>
        <p class="error-msg" *ngIf="error">{{ error }}</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Current Password</mat-label>
            <input matInput [type]="show ? 'text' : 'password'" formControlName="currentPassword" />
            <button mat-icon-button matSuffix type="button" (click)="show = !show">
              <mat-icon>{{ show ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error>Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>New Password</mat-label>
            <input matInput [type]="show ? 'text' : 'password'" formControlName="newPassword" />
            <mat-error *ngIf="form.get('newPassword')?.hasError('required')">Required</mat-error>
            <mat-error *ngIf="form.get('newPassword')?.hasError('minlength')">At least 8 characters</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirm New Password</mat-label>
            <input matInput [type]="show ? 'text' : 'password'" formControlName="confirmPassword" />
            <mat-error *ngIf="form.hasError('mismatch')">Passwords do not match</mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Updating...' : 'Change Password' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 24px; }
    .form-card { background: var(--surface); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); padding: 32px; max-width: 480px; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .success-msg { background: #e8f5e9; color: #2e7d32; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px; margin-bottom: 16px; }
    .error-msg { background: #ffebee; color: #c62828; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px; margin-bottom: 16px; border-left: 4px solid #f44336; }
  `]
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['']
  }, { validators: matchPwd });

  show = false;
  loading = false;
  saved = false;
  error = '';

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    this.auth.changePassword({
      currentPassword: this.form.value.currentPassword!,
      newPassword: this.form.value.newPassword!
    }).subscribe({
      next: () => {
        this.saved = true;
        this.loading = false;
        this.form.reset();
        setTimeout(() => this.saved = false, 4000);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to change password';
        this.loading = false;
      }
    });
  }
}
