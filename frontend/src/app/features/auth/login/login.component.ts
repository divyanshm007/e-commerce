import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatch(control: AbstractControl) {
  const pwd = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pwd === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgIf],
  template: `
    <div class="login-page" style="background-image: url('assets/images/login-bg.jpg');">

      <div class="login-container">

        <!-- ===== LEFT BRAND PANEL ===== -->
        <div class="brand-panel">
          <img src="assets/images/about-hero.jpg" class="deco deco-top" alt="" aria-hidden="true" loading="lazy" />

          <div class="brand-logo">
            <a class="logo-wrap" routerLink="/" style="text-decoration:none;color:inherit;cursor:pointer" aria-label="Home">
              <img src="assets/images/logo.png" alt="Sidham Pharmacy logo" />
            </a>
          </div>

          <div class="brand-hero">
            <h1 class="brand-heading" *ngIf="!isSignUp()">Welcome <span class="accent">Back!</span></h1>
            <h1 class="brand-heading" *ngIf="isSignUp()">Join <span class="accent">Us Today!</span></h1>
            <p class="brand-subtext" *ngIf="!isSignUp()">
              Sign in to your account and continue<br />
              your journey towards a healthier life.
            </p>
            <p class="brand-subtext" *ngIf="isSignUp()">
              Create your account and start<br />
              your Ayurvedic wellness journey.
            </p>
          </div>

          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon">🌿</div>
              <span class="feature-label">100% Natural</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">⭐</div>
              <span class="feature-label">Premium Quality</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🛡️</div>
              <span class="feature-label">Trusted Brand</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">💚</div>
              <span class="feature-label">Healthy Life</span>
            </div>
          </div>

          <div class="product-composition">
            <img src="assets/images/about-story.jpg" alt="Premium Ayurvedic products" class="product-main" loading="lazy" />
            <div class="product-badge">
              <span class="badge-num">500+</span>
              <span class="badge-label">Herbal Products</span>
            </div>
          </div>

          <div class="brand-footer">
            <span>© 2026 <a href="https://sidham.in" target="_blank" rel="noopener" class="footer-link">sidham.in</a> All rights reserved</span>
          </div>
        </div>

        <!-- ===== RIGHT FORM PANEL ===== -->
        <div class="form-panel">
          <div class="leaf-tl" aria-hidden="true"></div>
          <div class="leaf-br" aria-hidden="true"></div>

          <!-- ── TAB SWITCHER ── -->
          <div class="tab-bar">
            <button class="tab-btn" [class.active]="!isSignUp()" (click)="switchTo(false)" type="button">Sign In</button>
            <button class="tab-btn" [class.active]="isSignUp()" (click)="switchTo(true)" type="button">Sign Up</button>
            <div class="tab-indicator" [style.transform]="isSignUp() ? 'translateX(100%)' : 'translateX(0)'"></div>
          </div>

          <div class="form-wrap">

            <!-- ══ LOGIN FORM ══ -->
            <ng-container *ngIf="!isSignUp()">
              <div class="form-header">
                <div class="header-accent"></div>
                <h2 class="form-title">Sign in to your account</h2>
                <p class="form-subtitle">Enter your credentials to access your account</p>
              </div>

              <div class="error-alert" *ngIf="loginError">
                <span class="error-icon">⚠</span> {{ loginError }}
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onLogin()" novalidate>
                <div class="field-group" [class.field-error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
                  <label class="field-label" for="login-email">Email Address</label>
                  <div class="input-wrap">
                    <span class="input-icon">✉</span>
                    <input id="login-email" type="email" formControlName="email" autocomplete="email" placeholder="Enter your email address" class="field-input" />
                  </div>
                  <span class="field-err-msg" *ngIf="loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched">Email is required</span>
                  <span class="field-err-msg" *ngIf="loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched">Enter a valid email address</span>
                </div>

                <div class="field-group" [class.field-error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
                  <label class="field-label" for="login-password">Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">🔑</span>
                    <input id="login-password" [type]="showLoginPwd ? 'text' : 'password'" formControlName="password" autocomplete="current-password" placeholder="Enter your password" class="field-input" />
                    <button type="button" class="eye-btn" (click)="showLoginPwd = !showLoginPwd">{{ showLoginPwd ? '🙈' : '👁' }}</button>
                  </div>
                  <span class="field-err-msg" *ngIf="loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched">Password is required</span>
                </div>

                <!-- Sign Up link + Forgot password -->
                <div class="form-row">
                  <button type="button" class="signup-toggle" (click)="switchTo(true)">
                    Don't have an account? <span class="signup-toggle-link">Sign Up</span>
                  </button>
                  <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
                </div>

                <button type="submit" class="signin-btn" [disabled]="loginLoading">
                  <span>{{ loginLoading ? 'Signing in…' : 'Sign In' }}</span>
                  <span class="btn-arrow" *ngIf="!loginLoading">→</span>
                  <span class="btn-spinner" *ngIf="loginLoading"></span>
                </button>
              </form>
            </ng-container>

            <!-- ══ REGISTER FORM ══ -->
            <ng-container *ngIf="isSignUp()">
              <div class="form-header">
                <div class="header-accent"></div>
                <h2 class="form-title">Create your account</h2>
                <p class="form-subtitle">Join thousands on their Ayurvedic wellness journey</p>
              </div>

              <div class="error-alert" *ngIf="registerError">
                <span class="error-icon">⚠</span> {{ registerError }}
              </div>
              <div class="success-alert" *ngIf="registerSuccess">
                <span>✓</span> Account created! Signing you in…
              </div>

              <form [formGroup]="registerForm" (ngSubmit)="onRegister()" novalidate>
                <div class="field-row-2">
                  <div class="field-group" [class.field-error]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched">
                    <label class="field-label" for="reg-fname">First Name</label>
                    <div class="input-wrap">
                      <span class="input-icon">👤</span>
                      <input id="reg-fname" type="text" formControlName="firstName" placeholder="First name" class="field-input" />
                    </div>
                    <span class="field-err-msg" *ngIf="registerForm.get('firstName')?.hasError('required') && registerForm.get('firstName')?.touched">Required</span>
                  </div>
                  <div class="field-group" [class.field-error]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched">
                    <label class="field-label" for="reg-lname">Last Name</label>
                    <div class="input-wrap">
                      <span class="input-icon">👤</span>
                      <input id="reg-lname" type="text" formControlName="lastName" placeholder="Last name" class="field-input" />
                    </div>
                    <span class="field-err-msg" *ngIf="registerForm.get('lastName')?.hasError('required') && registerForm.get('lastName')?.touched">Required</span>
                  </div>
                </div>

                <div class="field-group" [class.field-error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                  <label class="field-label" for="reg-email">Email Address</label>
                  <div class="input-wrap">
                    <span class="input-icon">✉</span>
                    <input id="reg-email" type="email" formControlName="email" autocomplete="email" placeholder="Enter your email address" class="field-input" />
                  </div>
                  <span class="field-err-msg" *ngIf="registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched">Email is required</span>
                  <span class="field-err-msg" *ngIf="registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched">Enter a valid email</span>
                </div>

                <div class="field-row-2">
                  <div class="field-group">
                    <label class="field-label" for="reg-phone">Phone</label>
                    <div class="input-wrap">
                      <span class="input-icon">📱</span>
                      <input id="reg-phone" type="tel" formControlName="phone" placeholder="Phone number" class="field-input" />
                    </div>
                  </div>
                  <div class="field-group" [class.field-error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                    <label class="field-label" for="reg-pwd">Password</label>
                    <div class="input-wrap">
                      <span class="input-icon">🔑</span>
                      <input id="reg-pwd" [type]="showRegPwd ? 'text' : 'password'" formControlName="password" placeholder="Min 8 chars" class="field-input" />
                      <button type="button" class="eye-btn" (click)="showRegPwd = !showRegPwd">{{ showRegPwd ? '🙈' : '👁' }}</button>
                    </div>
                    <span class="field-err-msg" *ngIf="registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched">At least 8 characters</span>
                    <span class="field-hint" *ngIf="!registerForm.get('password')?.touched || registerForm.get('password')?.valid">Min 8 chars · must include uppercase &amp; number</span>
                  </div>
                </div>

                <div class="field-group" [class.field-error]="registerForm.hasError('mismatch') && registerForm.get('confirmPassword')?.touched">
                  <label class="field-label" for="reg-cpwd">Confirm Password</label>
                  <div class="input-wrap">
                    <span class="input-icon">🔑</span>
                    <input id="reg-cpwd" [type]="showRegPwd ? 'text' : 'password'" formControlName="confirmPassword" placeholder="Repeat your password" class="field-input" />
                  </div>
                  <span class="field-err-msg" *ngIf="registerForm.hasError('mismatch') && registerForm.get('confirmPassword')?.touched">Passwords do not match</span>
                </div>

                <!-- Already have account -->
                <div class="form-row">
                  <button type="button" class="signup-toggle" (click)="switchTo(false)">
                    Already have an account? <span class="signup-toggle-link">Sign In</span>
                  </button>
                </div>

                <button type="submit" class="signin-btn" [disabled]="registerLoading">
                  <span>{{ registerLoading ? 'Creating account…' : 'Create Account' }}</span>
                  <span class="btn-arrow" *ngIf="!registerLoading">→</span>
                  <span class="btn-spinner" *ngIf="registerLoading"></span>
                </button>
              </form>
            </ng-container>

          </div>
        </div>

      </div>

      <div class="social-notice-overlay" *ngIf="showSocialNotice" (click)="showSocialNotice = false">
        <div class="social-notice-card">
          <p>Social login is not configured in this demo.</p>
          <button (click)="showSocialNotice = false" class="notice-ok">OK</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; background: #F0FDF4; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }

    .login-page {
      height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center;
      padding: 20px 16px; background-size: cover; background-position: center; background-repeat: no-repeat;
      animation: pageFadeIn 0.5s ease; box-sizing: border-box;
      &::before { content: ''; position: fixed; inset: 0; background: rgba(6,78,59,0.35); pointer-events: none; z-index: 0; }
    }
    @keyframes pageFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .login-container {
      position: relative; z-index: 1; display: flex; width: 100%; max-width: 1220px;
      height: calc(100vh - 40px); max-height: 800px; border-radius: 26px; overflow: hidden;
      box-shadow: 0 32px 80px rgba(6,78,59,0.18), 0 8px 24px rgba(0,0,0,0.08);
      animation: containerSlideUp 0.55s cubic-bezier(.22,.68,0,1.2);
    }
    @keyframes containerSlideUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* ── Left brand panel ── */
    .brand-panel {
      flex: 0 0 46%; background: linear-gradient(145deg, #064E3B 0%, #14532D 60%, #166534 100%);
      display: flex; flex-direction: column; padding: 28px 40px 0; position: relative; overflow: hidden;
    }
    .deco { position: absolute; pointer-events: none; border-radius: 12px; }
    .deco-top { top: -40px; right: -40px; width: 220px; height: 220px; object-fit: cover; opacity: 0.08; border-radius: 50%; }
    .brand-logo { position: relative; z-index: 2; margin-bottom: 28px; }
    .logo-wrap { display: inline-flex; align-items: center; justify-content: center; background: #fff; border-radius: 16px; padding: 10px 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .logo-wrap img { height: 44px; width: auto; object-fit: contain; display: block; }
    .brand-hero { position: relative; z-index: 2; margin-bottom: 32px; animation: slideUp 0.6s ease 0.15s both; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .brand-heading { font-size: 38px; font-weight: 800; color: #fff; line-height: 1.15; margin: 0 0 14px; letter-spacing: -0.5px; }
    .brand-heading .accent { color: #86EFAC; }
    .brand-subtext { font-size: 15px; color: rgba(255,255,255,0.78); line-height: 1.65; margin: 0; }
    .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; position: relative; z-index: 2; animation: slideUp 0.6s ease 0.25s both; }
    .feature-item { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 10px 14px; }
    .feature-icon { font-size: 20px; flex-shrink: 0; width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .feature-label { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.92); }
    .product-composition { flex: 1; position: relative; display: flex; align-items: flex-end; justify-content: center; margin: 0 -40px; overflow: hidden; animation: slideUp 0.7s ease 0.35s both; }
    .product-main { width: 100%; height: 180px; object-fit: cover; object-position: center; display: block; }
    .product-badge { position: absolute; top: 16px; right: 24px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 14px; padding: 10px 16px; text-align: center; backdrop-filter: blur(6px); }
    .badge-num { display: block; font-size: 22px; font-weight: 800; color: #86EFAC; line-height: 1; }
    .badge-label { display: block; font-size: 10px; color: rgba(255,255,255,0.8); font-weight: 500; margin-top: 3px; white-space: nowrap; }
    .brand-footer { display: flex; align-items: center; justify-content: center; padding: 12px 0; background: rgba(0,0,0,0.2); margin: 0 -40px; font-size: 11.5px; color: rgba(255,255,255,0.65); }
    .footer-link { color: #86EFAC; text-decoration: none; font-weight: 600; &:hover { text-decoration: underline; } }

    /* ── Right form panel ── */
    .form-panel { flex: 0 0 54%; background: #fff; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .leaf-tl, .leaf-br { position: absolute; border-radius: 50% 0 50% 0; pointer-events: none; opacity: 0.055; }
    .leaf-tl { width: 180px; height: 180px; top: -60px; right: -40px; background: #14532D; transform: rotate(35deg); }
    .leaf-br { width: 220px; height: 220px; bottom: -80px; left: -60px; background: #2F7D32; transform: rotate(-20deg); }

    /* ── Tab switcher ── */
    .tab-bar {
      position: relative; display: flex; border-bottom: 2px solid #E8F5E9; margin: 0; z-index: 2; flex-shrink: 0;
    }
    .tab-btn {
      flex: 1; padding: 16px 0; border: none; background: transparent; font-size: 14px; font-weight: 600;
      color: #94A3B8; cursor: pointer; position: relative; z-index: 1; transition: color 0.2s; font-family: inherit;
      &.active { color: #14532D; }
      &:hover:not(.active) { color: #475569; }
    }
    .tab-indicator {
      position: absolute; bottom: -2px; left: 0; width: 50%; height: 2px;
      background: #14532D; border-radius: 2px 2px 0 0; transition: transform 0.25s cubic-bezier(.4,0,.2,1);
    }

    /* ── Form wrap ── */
    .form-wrap {
      flex: 1; display: flex; flex-direction: column; justify-content: center;
      padding: 20px 48px 24px; position: relative; z-index: 2; overflow-y: auto;
    }
    .form-header { margin-bottom: 20px; }
    .header-accent { width: 44px; height: 4px; background: linear-gradient(90deg, #14532D, #65A30D); border-radius: 4px; margin-bottom: 14px; }
    .form-title { font-size: 24px; font-weight: 800; color: #14221A; margin: 0 0 6px; letter-spacing: -0.4px; }
    .form-subtitle { font-size: 13.5px; color: #66736B; margin: 0; }

    /* ── Alerts ── */
    .error-alert {
      display: flex; align-items: center; gap: 8px; background: #FEF2F2; color: #B91C1C;
      border: 1px solid #FECACA; border-left: 4px solid #EF4444; border-radius: 10px;
      padding: 11px 16px; font-size: 13.5px; margin-bottom: 16px;
    }
    .success-alert {
      display: flex; align-items: center; gap: 8px; background: #F0FDF4; color: #166534;
      border: 1px solid #BBF7D0; border-left: 4px solid #22C55E; border-radius: 10px;
      padding: 11px 16px; font-size: 13.5px; margin-bottom: 16px;
    }
    .error-icon { font-size: 15px; }

    /* ── Fields ── */
    .field-group { margin-bottom: 14px; }
    .field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-label { display: block; font-size: 13px; font-weight: 600; color: #14221A; margin-bottom: 6px; }
    .input-wrap {
      display: flex; align-items: center; border: 1.5px solid #DDE5DE; border-radius: 11px;
      background: #F7FAF7; transition: border-color 0.2s, box-shadow 0.2s; overflow: hidden;
      &:focus-within { border-color: #14532D; box-shadow: 0 0 0 3px rgba(20,83,45,0.1); background: #fff; }
    }
    .field-group.field-error .input-wrap { border-color: #EF4444; }
    .input-icon { padding: 0 12px; font-size: 15px; color: #66736B; flex-shrink: 0; }
    .field-input { flex: 1; height: 48px; border: none; outline: none; background: transparent; font-size: 13.5px; color: #14221A; font-family: inherit; &::placeholder { color: #9CA3AF; } }
    .eye-btn { border: none; background: transparent; cursor: pointer; padding: 0 14px; font-size: 17px; color: #66736B; line-height: 1; display: flex; align-items: center; height: 48px; transition: color 0.15s; &:hover { color: #14532D; } }
    .field-err-msg { display: block; font-size: 11.5px; color: #EF4444; margin-top: 4px; padding-left: 4px; }
    .field-hint { display: block; font-size: 11px; color: #9CA3AF; margin-top: 4px; padding-left: 4px; }

    /* ── Form row (signup toggle + forgot) ── */
    .form-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .signup-toggle {
      background: none; border: none; padding: 0; cursor: pointer; font-size: 13px; color: #66736B; font-family: inherit;
    }
    .signup-toggle-link { color: #14532D; font-weight: 700; &:hover { text-decoration: underline; } }
    .forgot-link { font-size: 13px; font-weight: 600; color: #14532D; text-decoration: none; transition: color 0.15s; &:hover { color: #065F46; text-decoration: underline; } }

    /* ── Submit button ── */
    .signin-btn {
      width: 100%; height: 50px; background: linear-gradient(135deg, #14532D 0%, #166534 100%);
      color: #fff; border: none; border-radius: 11px; font-size: 15px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 16px rgba(20,83,45,0.3);
      font-family: inherit; letter-spacing: 0.3px; margin-bottom: 0;
      &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(20,83,45,0.38); }
      &:active:not(:disabled) { transform: translateY(0); }
      &:disabled { opacity: 0.65; cursor: not-allowed; }
    }
    .btn-arrow { font-size: 20px; line-height: 1; }
    .btn-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Social notice ── */
    .social-notice-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: pageFadeIn 0.2s ease; }
    .social-notice-card { background: #fff; border-radius: 16px; padding: 32px 40px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.18); max-width: 340px; p { font-size: 15px; color: #14221A; margin: 0 0 20px; } }
    .notice-ok { padding: 10px 32px; background: #14532D; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; &:hover { background: #166534; } }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      /* the page must be able to scroll on a phone, and the form must come first: the marketing panel shrinks to a header */
      :host { height: auto; min-height: 100vh; overflow: visible; }      /* the host itself was cut to one screen, which hid the rest of the sign-up form */
      .login-page { height: auto; min-height: 100vh; overflow: visible; align-items: flex-start; }
      .login-container { flex-direction: column; max-width: 520px; height: auto; max-height: none; min-height: auto; border-radius: 20px; }
      .brand-panel { flex: none; padding: 22px 24px 22px; }
      .brand-logo { margin-bottom: 14px; }
      .brand-hero { margin-bottom: 0; }
      .brand-heading { font-size: 26px; margin-bottom: 8px; }
      .brand-subtext { font-size: 13.5px; }
      .features-grid, .product-composition, .brand-footer { display: none; }
      .form-panel { flex: none; }
      .form-wrap { padding: 20px 28px 28px; overflow-y: visible; }
    }
    @media (max-width: 540px) {
      .login-page { padding: 0; }
      .login-container { border-radius: 0; max-width: 100%; min-height: 100vh; }
      .logo-wrap { padding: 6px 12px; border-radius: 12px; }
      .logo-wrap img { height: 32px; }
      .brand-heading { font-size: 23px; }
      .field-row-2 { grid-template-columns: 1fr; gap: 0; }
      .form-wrap { padding: 16px 20px 24px; }
      .form-title { font-size: 21px; }
      .deco-top { display: none; }
    }
  `]
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  isSignUp = signal(false);

  loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  registerForm = this.fb.group({
    firstName:       ['', Validators.required],
    lastName:        ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    phone:           [''],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatch });

  showLoginPwd  = false;
  showRegPwd    = false;
  loginLoading  = false;
  registerLoading = false;
  loginError    = '';
  registerError = '';
  registerSuccess = false;
  showSocialNotice = false;

  switchTo(signup: boolean) {
    this.isSignUp.set(signup);
    this.loginError = '';
    this.registerError = '';
    this.registerSuccess = false;
  }

  onLogin() {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loginLoading = true;
    this.loginError = '';
    const { email, password } = this.loginForm.value;
    // portal 'customer': an admin account is rejected before any session is stored
    this.auth.login({ email: email!, password: password! }, 'customer').subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/account/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loginError = err?.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : err?.error?.message || 'Invalid email or password';
        this.loginLoading = false;
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.registerLoading = true;
    this.registerError = '';
    const { firstName, lastName, email, phone, password } = this.registerForm.value;
    this.auth.register({ firstName: firstName!, lastName: lastName!, email: email!, phone: phone || '', password: password! }).subscribe({
      next: () => {
        this.registerSuccess = true;
        this.registerLoading = false;
        setTimeout(() => this.router.navigateByUrl('/'), 1000);
      },
      error: (err) => {
        const body = err?.error;
        // Handle ASP.NET ModelState validation errors: { errors: { Field: ["msg"] } }
        if (body?.errors) {
          const msgs = Object.values(body.errors as Record<string, string[]>).flat();
          this.registerError = msgs[0] || body.title || 'Validation error.';
        } else {
          this.registerError = body?.message || body?.title || 'Registration failed. Please try again.';
        }
        this.registerLoading = false;
      }
    });
  }
}
