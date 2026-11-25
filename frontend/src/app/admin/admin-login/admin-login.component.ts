import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterLink],
  template: `
<div class="al-shell">

  <!-- Left decorative panel -->
  <div class="al-brand">
    <div class="al-brand-inner">
      <div class="al-logo">
        <img src="assets/images/logo.png" alt="Sidham" class="al-logo-img" />
        <div class="al-logo-text">
          <span class="al-logo-name">Sidham</span>
          <span class="al-logo-sub">Admin Panel</span>
        </div>
      </div>
      <div class="al-brand-copy">
        <h2 class="al-brand-h">Manage your<br /><span class="al-brand-accent">store</span> from here.</h2>
        <p class="al-brand-p">Products, orders, customers, content — everything in one place.</p>
      </div>
      <div class="al-stats">
        <div class="al-stat">
          <span class="al-stat-n">∞</span>
          <span class="al-stat-l">Products</span>
        </div>
        <div class="al-stat-div"></div>
        <div class="al-stat">
          <span class="al-stat-n">24/7</span>
          <span class="al-stat-l">Dashboard</span>
        </div>
        <div class="al-stat-div"></div>
        <div class="al-stat">
          <span class="al-stat-n">100%</span>
          <span class="al-stat-l">Control</span>
        </div>
      </div>
    </div>
    <div class="al-brand-bg-circles">
      <div class="al-circle al-c1"></div>
      <div class="al-circle al-c2"></div>
      <div class="al-circle al-c3"></div>
    </div>
  </div>

  <!-- Right form panel -->
  <div class="al-form-panel">
    <div class="al-form-wrap">

      <!-- Header -->
      <div class="al-form-header">
        <div class="al-shield-icon">🛡️</div>
        <h1 class="al-form-title">Admin Sign In</h1>
        <p class="al-form-sub">Enter your admin credentials to continue</p>
      </div>

      <!-- Error -->
      <div class="al-error" *ngIf="error()">
        <span class="al-error-icon">⚠</span> {{ error() }}
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

        <!-- Email -->
        <div class="al-field" [class.al-field-err]="form.get('email')?.invalid && form.get('email')?.touched">
          <label class="al-label" for="admin-email">Email Address</label>
          <div class="al-input-wrap">
            <span class="al-inp-icon">✉</span>
            <input id="admin-email" type="email" formControlName="email"
              placeholder="admin@example.com" class="al-inp" autocomplete="username" />
          </div>
          <span class="al-field-msg" *ngIf="form.get('email')?.hasError('required') && form.get('email')?.touched">Email is required</span>
          <span class="al-field-msg" *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched">Enter a valid email</span>
        </div>

        <!-- Password -->
        <div class="al-field" [class.al-field-err]="form.get('password')?.invalid && form.get('password')?.touched">
          <label class="al-label" for="admin-password">Password</label>
          <div class="al-input-wrap">
            <span class="al-inp-icon">🔒</span>
            <input id="admin-password" [type]="showPwd ? 'text' : 'password'"
              formControlName="password" placeholder="Enter your password"
              class="al-inp" autocomplete="current-password" />
            <button type="button" class="al-eye-btn" (click)="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁' }}
            </button>
          </div>
          <span class="al-field-msg" *ngIf="form.get('password')?.hasError('required') && form.get('password')?.touched">Password is required</span>
        </div>

        <div class="al-forgot-row">
          <a routerLink="/admin/forgot-password" class="al-forgot-a">Forgot password?</a>
        </div>

        <!-- Submit -->
        <button type="submit" class="al-submit" [disabled]="loading()">
          <span *ngIf="!loading()">Sign In to Admin Panel →</span>
          <span *ngIf="loading()" class="al-loading"><span class="al-spinner"></span> Signing in…</span>
        </button>

      </form>

      <!-- Back to store -->
      <div class="al-back-link">
        <a href="/" class="al-back-a">← Back to storefront</a>
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
:host { display:block; height:100vh; }

.al-shell {
  display:grid;
  grid-template-columns: 1fr 1fr;
  min-height:100vh;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;
}
@media (max-width:768px) {
  .al-shell { grid-template-columns:1fr; }
  .al-brand { display:none; }
  .al-form-panel { padding:32px 24px; align-items:flex-start; padding-top:48px; }
}
@media (max-width:480px) {
  .al-form-panel { padding:24px 16px; }
  .al-form-title { font-size:22px; }
}

/* ── Brand panel ── */
.al-brand {
  background: #0F172A;
  position:relative;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:48px;
}
.al-brand-inner { position:relative; z-index:2; width:100%; }

.al-logo { display:flex; align-items:center; gap:14px; margin-bottom:64px; }
.al-logo-img { width:48px; height:48px; object-fit:contain; border-radius:10px; background:rgba(255,255,255,.05); padding:4px; }
.al-logo-name { display:block; font-size:22px; font-weight:800; color:#fff; letter-spacing:-.3px; line-height:1.1; }
.al-logo-sub  { display:block; font-size:11px; font-weight:500; color:#64748B; text-transform:uppercase; letter-spacing:.08em; }

.al-brand-h { font-size:42px; font-weight:800; color:#fff; line-height:1.15; letter-spacing:-.5px; margin:0 0 16px; }
.al-brand-accent { color:#14B8A6; }
.al-brand-p { font-size:15px; color:#94A3B8; line-height:1.7; margin:0 0 56px; max-width:340px; }

.al-stats { display:flex; align-items:center; gap:24px; }
.al-stat { display:flex; flex-direction:column; gap:4px; }
.al-stat-n { font-size:24px; font-weight:800; color:#fff; line-height:1; }
.al-stat-l { font-size:11px; color:#64748B; text-transform:uppercase; letter-spacing:.06em; font-weight:600; }
.al-stat-div { width:1px; height:36px; background:rgba(255,255,255,.1); }

/* background circles */
.al-brand-bg-circles { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.al-circle { position:absolute; border-radius:50%; }
.al-c1 { width:500px; height:500px; background:radial-gradient(circle,rgba(20,184,166,.12) 0%,transparent 70%); right:-180px; top:-100px; }
.al-c2 { width:360px; height:360px; background:radial-gradient(circle,rgba(99,102,241,.10) 0%,transparent 70%); left:-120px; bottom:-80px; }
.al-c3 { width:200px; height:200px; background:radial-gradient(circle,rgba(20,184,166,.07) 0%,transparent 70%); left:40%; top:55%; }

/* ── Form panel ── */
.al-form-panel {
  background:#F6F8FA;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:48px 40px;
}
.al-form-wrap { width:100%; max-width:400px; }

.al-form-header { text-align:center; margin-bottom:32px; }
.al-shield-icon { font-size:40px; display:block; margin-bottom:16px; }
.al-form-title { font-size:26px; font-weight:800; color:#0F172A; margin:0 0 8px; letter-spacing:-.3px; }
.al-form-sub   { font-size:13.5px; color:#64748B; margin:0; }

/* Error */
.al-error {
  display:flex; align-items:center; gap:8px;
  background:#FEF2F2; border:1px solid #FECACA; border-radius:8px;
  padding:10px 14px; color:#DC2626; font-size:13px; font-weight:500;
  margin-bottom:20px;
}
.al-error-icon { font-size:14px; flex-shrink:0; }

/* Fields */
.al-field { margin-bottom:18px; }
.al-label { display:block; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.07em; margin-bottom:6px; }
.al-input-wrap {
  position:relative; display:flex; align-items:center;
  background:#fff; border:1.5px solid #E2E8F0; border-radius:10px;
  transition:border-color .15s, box-shadow .15s;
}
.al-input-wrap:focus-within { border-color:#0F766E; box-shadow:0 0 0 3px rgba(15,118,110,.10); }
.al-field-err .al-input-wrap { border-color:#FCA5A5; }
.al-inp-icon { padding:0 0 0 14px; font-size:14px; flex-shrink:0; color:#94A3B8; }
.al-inp {
  flex:1; height:46px; border:none; outline:none; background:transparent;
  font-size:14px; color:#0F172A; padding:0 12px; font-family:inherit;
}
.al-eye-btn {
  padding:0 12px; background:none; border:none; cursor:pointer;
  font-size:14px; color:#94A3B8; height:46px; display:flex; align-items:center;
}
.al-field-msg { font-size:11.5px; color:#DC2626; margin-top:4px; display:block; }

/* Submit */
.al-submit {
  width:100%; height:50px; border-radius:10px; border:none;
  background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
  color:#fff; font-size:14px; font-weight:700; cursor:pointer;
  margin-top:8px; display:flex; align-items:center; justify-content:center;
  transition:opacity .15s, transform .1s;
  box-shadow: 0 4px 14px rgba(15,118,110,.35);
}
.al-submit:hover:not(:disabled) { opacity:.92; transform:translateY(-1px); }
.al-submit:disabled { opacity:.55; cursor:not-allowed; transform:none; }
.al-loading { display:flex; align-items:center; gap:10px; }
.al-spinner {
  width:16px; height:16px; border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff; border-radius:50%; animation:al-spin .7s linear infinite;
}
@keyframes al-spin { to { transform:rotate(360deg); } }

/* Back link */
.al-forgot-row { text-align:right; margin:-4px 0 18px; }
.al-forgot-a { font-size:13px; color:#0F766E; text-decoration:none; font-weight:600; }
.al-forgot-a:hover { text-decoration:underline; }

.al-back-link { text-align:center; margin-top:24px; }
.al-back-a { font-size:13px; color:#64748B; text-decoration:none; }
.al-back-a:hover { color:#0F766E; }
  `]
})
export class AdminLoginComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading  = signal(false);
  error    = signal('');
  showPwd  = false;

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    // portal 'admin': a customer account is rejected before any session is stored
    this.auth.login({ email: email!, password: password! }, 'admin').subscribe({
      next: () => this.router.navigate(['/admin']),
      error: err => {
        this.error.set(err?.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : err?.error?.message || 'Invalid email or password.');
        this.loading.set(false);
      }
    });
  }
}
