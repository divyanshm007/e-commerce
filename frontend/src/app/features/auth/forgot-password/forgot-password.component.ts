import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PasswordResetFlowComponent } from '../../../shared/components/password-reset-flow/password-reset-flow.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, MatIconModule, PasswordResetFlowComponent],
  template: `
    <div class="auth-page">
      <a routerLink="/" class="auth-logo" aria-label="Home"><img src="assets/images/logo.png" alt="Sidham Pharmacy" /></a>
      <div class="form-card">
        <app-password-reset-flow portal="customer" (finished)="goToLogin()" />

        <p class="switch-link">
          <a routerLink="/auth/login"><mat-icon>arrow_back</mat-icon> Back to login</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-logo { display: block; margin-bottom: 18px; img { height: 56px; width: auto; display: block; margin: 0 auto; } }
    .auth-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      padding: 32px 16px;
    }

    .switch-link {
      text-align: center;
      margin-top: 24px;
      a {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 14px; color: var(--primary);
        &:hover { text-decoration: underline; }
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private router = inject(Router);

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
