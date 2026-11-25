import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PasswordResetFlowComponent } from '../../shared/components/password-reset-flow/password-reset-flow.component';

@Component({
  selector: 'app-admin-forgot-password',
  standalone: true,
  imports: [RouterLink, PasswordResetFlowComponent],
  template: `
    <div class="afp-shell">
      <div class="afp-card">
        <div class="afp-brand">
          <div class="afp-shield">🛡️</div>
          <span>Admin Panel</span>
        </div>

        <app-password-reset-flow portal="admin" (finished)="goToLogin()" />

        <p class="afp-back"><a routerLink="/admin/login">← Back to admin sign in</a></p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .afp-shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px 16px;
      background: linear-gradient(135deg, #0f172a 0%, #134e4a 100%);
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    .afp-card {
      width: 100%; max-width: 420px; background: #fff; border-radius: 18px; padding: 32px 28px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, .35);
      --rf-accent: #0f766e; --rf-accent-soft: rgba(15, 118, 110, .15);
    }
    .afp-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 22px; }
    .afp-shield { font-size: 22px; }
    .afp-back { text-align: center; margin: 24px 0 0; }
    .afp-back a { font-size: 13px; color: #64748b; text-decoration: none; }
    .afp-back a:hover { color: #0f766e; }
  `]
})
export class AdminForgotPasswordComponent {
  private router = inject(Router);

  goToLogin(): void {
    this.router.navigate(['/admin/login']);
  }
}
