import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">My Profile</h2>

      <div class="form-card">
        <div class="avatar-section">
          <div class="avatar">{{ initials }}</div>
          <div>
            <h3>{{ auth.customerUser()?.fullName }}</h3>
            <p>{{ auth.customerUser()?.email }}</p>
          </div>
        </div>

        <p class="success-msg" *ngIf="saved">Profile updated successfully!</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" />
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" />
              <mat-error>Required</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" [value]="auth.customerUser()?.email" readonly />
            <mat-hint>Email cannot be changed</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Phone Number</mat-label>
            <input matInput type="tel" formControlName="phone" />
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Saving...' : 'Save Changes' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 24px; }

    .form-card {
      background: var(--surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 32px;
      max-width: 600px;
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      h3 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
      p { font-size: 14px; color: var(--text-secondary); margin: 0; }
    }

    .avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
      flex-shrink: 0;
    }

    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; mat-form-field { width: 100%; } @media(max-width:600px){grid-template-columns:1fr;} }
    .full-width { width: 100%; margin-bottom: 8px; }

    .success-msg { background: #e8f5e9; color: #2e7d32; padding: 12px 16px; border-radius: var(--radius-sm); font-size: 14px; margin-bottom: 16px; }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['']
  });

  loading = false;
  saved = false;

  get initials(): string {
    const u = this.auth.customerUser();
    return ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || 'U';
  }

  ngOnInit(): void {
    const fill = () => {
      const u = this.auth.customerUser();
      if (u) this.form.patchValue({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? '' });
    };
    fill();
    // the stored copy can be old or incomplete: load the current details from the server
    this.auth.getProfile().subscribe({ next: () => fill(), error: () => {} });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.updateProfile(this.form.value as any).subscribe({
      next: () => { this.saved = true; this.loading = false; setTimeout(() => this.saved = false, 3000); },
      error: () => { this.loading = false; }
    });
  }
}
