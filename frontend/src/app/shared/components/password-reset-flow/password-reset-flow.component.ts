import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

const RESEND_SECONDS = 60;
const REDIRECT_DELAY_MS = 2000;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

/**
 * Email -> one-time code -> new password. Used by both login portals; the `portal` input keeps a
 * customer from resetting an admin account (and vice versa). Emits `finished` after a short pause
 * so the host page can send the user back to its own login screen.
 */
@Component({
  selector: 'app-password-reset-flow',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <div class="rf">
      <!-- Step 1: email -->
      <form *ngIf="step() === 'email'" [formGroup]="emailForm" (ngSubmit)="sendCode()" novalidate>
        <h1 class="rf-title">Forgot password?</h1>
        <p class="rf-sub">Enter your registered email and we'll send you a 6-digit code.</p>
        <p class="rf-error" *ngIf="error()">{{ error() }}</p>

        <label class="rf-label" for="rf-email">Email address</label>
        <input id="rf-email" class="rf-input" type="email" formControlName="email" autocomplete="email" placeholder="you@example.com" />
        <span class="rf-hint rf-hint-err" *ngIf="emailForm.get('email')?.invalid && emailForm.get('email')?.touched">Enter a valid email address</span>

        <button class="rf-btn" type="submit" [disabled]="loading()">{{ loading() ? 'Sending…' : 'Send code' }}</button>
      </form>

      <!-- Step 2: OTP -->
      <form *ngIf="step() === 'otp'" [formGroup]="otpForm" (ngSubmit)="verifyCode()" novalidate>
        <h1 class="rf-title">Enter the code</h1>
        <p class="rf-sub">If <strong>{{ email }}</strong> is registered, a 6-digit code is on its way. It expires in 10 minutes.</p>
        <p class="rf-error" *ngIf="error()">{{ error() }}</p>

        <label class="rf-label" for="rf-otp">Verification code</label>
        <input id="rf-otp" class="rf-input rf-otp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
               formControlName="otp" placeholder="••••••" />

        <button class="rf-btn" type="submit" [disabled]="loading()">{{ loading() ? 'Verifying…' : 'Verify code' }}</button>

        <p class="rf-resend">
          Didn't get it?
          <button type="button" class="rf-link" [disabled]="cooldown() > 0 || loading()" (click)="resend()">
            {{ cooldown() > 0 ? 'Resend in ' + cooldown() + 's' : 'Resend code' }}
          </button>
          &nbsp;·&nbsp;
          <button type="button" class="rf-link" (click)="changeEmail()">Change email</button>
        </p>
      </form>

      <!-- Step 3: new password -->
      <form *ngIf="step() === 'password'" [formGroup]="passwordForm" (ngSubmit)="setPassword()" novalidate>
        <h1 class="rf-title">Set a new password</h1>
        <p class="rf-sub">Choose a strong password you haven't used before.</p>
        <p class="rf-error" *ngIf="error()">{{ error() }}</p>

        <label class="rf-label" for="rf-pw">New password</label>
        <input id="rf-pw" class="rf-input" type="password" formControlName="newPassword" autocomplete="new-password" />
        <span class="rf-hint" [class.rf-hint-err]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched">
          At least 8 characters, with one uppercase letter and one number.
        </span>

        <label class="rf-label" for="rf-pw2">Confirm password</label>
        <input id="rf-pw2" class="rf-input" type="password" formControlName="confirmPassword" autocomplete="new-password" />
        <span class="rf-hint rf-hint-err" *ngIf="passwordForm.hasError('mismatch') && passwordForm.get('confirmPassword')?.touched">Passwords do not match</span>

        <button class="rf-btn" type="submit" [disabled]="loading()">{{ loading() ? 'Saving…' : 'Reset password' }}</button>
      </form>

      <!-- Done -->
      <div *ngIf="step() === 'done'" class="rf-done">
        <div class="rf-done-icon">✓</div>
        <h1 class="rf-title">Password updated</h1>
        <p class="rf-sub">You've been signed out everywhere. Taking you to the login page…</p>
      </div>
    </div>
  `,
  styles: [`
    .rf { width: 100%; text-align: left; color: var(--rf-text, #0f172a); }
    .rf-title { font-size: 24px; font-weight: 700; margin: 0 0 6px; }
    .rf-sub { font-size: 14px; color: var(--rf-muted, #64748b); margin: 0 0 20px; line-height: 1.5; }
    .rf-error { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 0 0 16px; }
    .rf-label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 6px; }
    .rf-input { width: 100%; box-sizing: border-box; height: 46px; padding: 0 14px; border: 1.5px solid var(--rf-border, #cbd5e1); border-radius: 10px; font-size: 15px; background: var(--rf-input-bg, #fff); color: inherit; outline: none; }
    .rf-input:focus { border-color: var(--rf-accent, #2e7d32); box-shadow: 0 0 0 3px var(--rf-accent-soft, rgba(46,125,50,.15)); }
    .rf-otp { letter-spacing: 10px; text-align: center; font-size: 22px; font-weight: 700; }
    .rf-hint { display: block; font-size: 12px; color: var(--rf-muted, #64748b); margin-top: 6px; }
    .rf-hint-err { color: #dc2626; }
    .rf-btn { width: 100%; height: 48px; margin-top: 22px; border: 0; border-radius: 10px; background: var(--rf-accent, #2e7d32); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
    .rf-btn:disabled { opacity: .55; cursor: not-allowed; }
    .rf-resend { text-align: center; font-size: 13px; color: var(--rf-muted, #64748b); margin: 18px 0 0; }
    .rf-link { background: none; border: 0; padding: 0; font: inherit; color: var(--rf-accent, #2e7d32); font-weight: 600; cursor: pointer; }
    .rf-link:disabled { color: var(--rf-muted, #94a3b8); cursor: not-allowed; }
    .rf-done { text-align: center; }
    .rf-done-icon { width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 32px; display: flex; align-items: center; justify-content: center; }
  `]
})
export class PasswordResetFlowComponent implements OnDestroy {
  @Input() portal: 'admin' | 'customer' = 'customer';
  @Output() finished = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  step = signal<'email' | 'otp' | 'password' | 'done'>('email');
  loading = signal(false);
  error = signal('');
  cooldown = signal(0);

  email = '';
  private resetToken = '';
  private timer: ReturnType<typeof setInterval> | null = null;

  emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  passwordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  ngOnDestroy(): void {
    this.stopTimer();
  }

  sendCode(): void {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.email = this.emailForm.value.email!.trim();
    this.requestCode(true);
  }

  resend(): void {
    if (this.cooldown() > 0) return;
    this.requestCode(false);
  }

  changeEmail(): void {
    this.error.set('');
    this.stopTimer();
    this.otpForm.reset();
    this.step.set('email');
  }

  private requestCode(firstTime: boolean): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword({ email: this.email, portal: this.portal }).subscribe({
      next: () => {
        this.loading.set(false);
        this.startCooldown();
        if (firstTime) this.step.set('otp');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(this.messageFor(err, 'Could not send the code. Please try again.'));
      }
    });
  }

  verifyCode(): void {
    if (this.otpForm.invalid) { this.otpForm.markAllAsTouched(); this.error.set('Enter the 6-digit code.'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyResetOtp({ email: this.email, otp: this.otpForm.value.otp!, portal: this.portal }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.resetToken = res.data;
          this.stopTimer();
          this.step.set('password');
        } else {
          this.error.set(res.message || 'Invalid or expired code.');
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(this.messageFor(err, 'Invalid or expired code.'));
      }
    });
  }

  setPassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword({
      email: this.email,
      resetToken: this.resetToken,
      newPassword: this.passwordForm.value.newPassword!,
      portal: this.portal
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('done');
        setTimeout(() => this.finished.emit(), REDIRECT_DELAY_MS);
      },
      error: err => {
        this.loading.set(false);
        const msg = this.messageFor(err, 'Could not reset the password. Please start again.');
        this.error.set(msg);
        // an expired/invalid reset session can't be recovered from this step
        if (err?.status === 400 && /session|expired/i.test(msg)) this.changeEmail();
      }
    });
  }

  private startCooldown(): void {
    this.stopTimer();
    this.cooldown.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      const left = this.cooldown() - 1;
      this.cooldown.set(Math.max(left, 0));
      if (left <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private messageFor(err: any, fallback: string): string {
    if (err?.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    // validation problems come back as { errors: { Field: [msgs] } }
    const fieldErrors = err?.error?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors).flat()[0];
      if (typeof first === 'string') return first;
    }
    return err?.error?.message || fallback;
  }
}
