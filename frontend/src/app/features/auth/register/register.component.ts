import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatch(control: AbstractControl) {
  const pwd = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pwd === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, NgIf,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div class="auth-page">
      <div class="form-card" style="max-width:520px">
        <h1 class="form-title">Create Account</h1>
        <p class="form-subtitle">Join us today and enjoy exclusive benefits</p>

        <p class="error-msg" *ngIf="error">{{ error }}</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" />
              <mat-error *ngIf="form.get('firstName')?.hasError('required')">Required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" />
              <mat-error *ngIf="form.get('lastName')?.hasError('required')">Required</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="form.get('email')?.hasError('email')">Enter a valid email</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Phone Number</mat-label>
            <input matInput type="tel" formControlName="phone" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password" />
            <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
              <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
            <mat-error *ngIf="form.get('password')?.hasError('minlength')">At least 8 characters</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirm Password</mat-label>
            <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="confirmPassword" />
            <mat-error *ngIf="form.hasError('mismatch')">Passwords do not match</mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" class="submit-btn" [disabled]="loading">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <p class="switch-link">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 32px 16px;
    }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      mat-form-field { width: 100%; margin-bottom: 8px; }
    }

    .full-width { width: 100%; margin-bottom: 8px; }

    .error-msg {
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      margin-bottom: 16px;
      border-left: 4px solid #f44336;
    }

    .submit-btn { width: 100%; height: 48px; font-size: 16px; font-weight: 600; margin-top: 8px; }

    .switch-link {
      text-align: center;
      font-size: 14px;
      margin-top: 24px;
      color: var(--text-secondary);
      a { color: var(--primary); font-weight: 600; &:hover { text-decoration: underline; } }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['']
  }, { validators: passwordMatch });

  showPwd = false;
  loading = false;
  error = '';

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const { confirmPassword, ...dto } = this.form.value;
    this.auth.register(dto as any).subscribe({
      next: () => this.router.navigate(['/account/dashboard']),
      error: (err) => {
        this.error = err?.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
