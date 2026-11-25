import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-referral',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">Referral & Rewards</h2>

      <!-- Code Card -->
      <div class="referral-hero card">
        <div class="rh-left">
          <div class="gift-icon">🎁</div>
          <h3>Refer a Friend, Earn ₹{{ rewardAmount }}</h3>
          <p>Share your unique code with friends. When they sign up and make their first purchase, you both earn ₹{{ rewardAmount }} off!</p>
        </div>
        <div class="rh-right" *ngIf="referralCode()">
          <span class="code-label">Your Referral Code</span>
          <div class="code-box">
            <span class="code-text">{{ referralCode() }}</span>
            <button mat-icon-button (click)="copyCode()" matTooltip="Copy code">
              <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>
          <div class="share-actions">
            <button mat-stroked-button (click)="shareWhatsApp()">
              <mat-icon>share</mat-icon> Share on WhatsApp
            </button>
            <button mat-stroked-button (click)="copyLink()">
              <mat-icon>link</mat-icon> Copy Link
            </button>
          </div>
        </div>
      </div>

      <!-- How it Works -->
      <div class="how-it-works card">
        <h4>How It Works</h4>
        <div class="steps">
          <div class="step" *ngFor="let s of steps; let i = index">
            <div class="step-num">{{ i + 1 }}</div>
            <div><strong>{{ s.title }}</strong><p>{{ s.desc }}</p></div>
          </div>
        </div>
      </div>

      <!-- My Referrals -->
      <div class="my-referrals card" *ngIf="referrals().length">
        <div class="mref-header">
          <h4>My Referrals</h4>
          <span class="total-earned">Total Earned: {{ totalEarned() | currency:'INR':'symbol':'1.0-0' }}</span>
        </div>
        <table class="ref-table">
          <thead><tr><th>Email</th><th>Status</th><th>Reward</th><th>Date</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of referrals()">
              <td>{{ r.referredEmail || 'Pending sign-up' }}</td>
              <td><span class="ref-status" [class]="'rs-' + r.status.toLowerCase()">{{ r.status }}</span></td>
              <td>{{ r.rewardAmount | currency:'INR':'symbol':'1.0-0' }}</td>
              <td>{{ r.createdAt | date:'mediumDate' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-referrals card" *ngIf="!referrals().length && referralCode()">
        <mat-icon>people_outline</mat-icon>
        <p>No referrals yet. Share your code to start earning!</p>
      </div>
    </div>
  `,
  styles: [`
    .page-content { padding: 24px 0; }
    .page-title { font-size: 22px; font-weight: 700; margin: 0 0 24px; }
    .referral-hero { padding: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; margin-bottom: 20px; @media (max-width: 700px) { grid-template-columns: 1fr; } }
    .rh-left { .gift-icon { font-size: 48px; margin-bottom: 12px; } h3 { font-size: 20px; font-weight: 700; margin: 0 0 8px; } p { font-size: 14px; color: var(--text-secondary); margin: 0; } }
    .rh-right { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
    .code-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
    .code-box { display: flex; align-items: center; gap: 8px; background: var(--bg); border: 2px dashed var(--primary); border-radius: var(--radius-md); padding: 12px 16px; width: 100%; }
    .code-text { font-size: 22px; font-weight: 800; color: var(--primary); letter-spacing: 2px; flex: 1; }
    .share-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .how-it-works { padding: 24px; margin-bottom: 20px; h4 { font-size: 16px; font-weight: 700; margin: 0 0 16px; } }
    .steps { display: flex; gap: 24px; @media (max-width: 600px) { flex-direction: column; } }
    .step { display: flex; gap: 12px; flex: 1; .step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; } strong { font-size: 14px; } p { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; } }
    .my-referrals { padding: 24px; }
    .mref-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; h4 { font-size: 16px; font-weight: 700; margin: 0; } .total-earned { font-size: 15px; font-weight: 700; color: var(--primary); } }
    .ref-table { width: 100%; border-collapse: collapse; font-size: 13px; th, td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: left; } th { font-weight: 600; color: var(--text-muted); font-size: 12px; text-transform: uppercase; } }
    .ref-status { padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; &.rs-pending { background: #fef3c7; color: #b45309; } &.rs-completed { background: #dcfce7; color: #166534; } &.rs-expired { background: #f3f4f6; color: #6b7280; } }
    .no-referrals { padding: 32px; text-align: center; mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--border); display: block; margin: 0 auto 12px; } p { font-size: 14px; color: var(--text-secondary); margin: 0; } }
  `]
})
export class ReferralComponent implements OnInit {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  referralCode = signal('');
  referrals = signal<any[]>([]);
  totalEarned = signal(0);
  rewardAmount = 50;
  copied = false;

  steps = [
    { title: 'Share Your Code', desc: 'Send your unique code to friends via WhatsApp, email, or link' },
    { title: 'Friend Signs Up', desc: 'Your friend registers using your referral code' },
    { title: 'Both Earn ₹50', desc: 'When they place their first order, you both get ₹50 reward' },
  ];

  ngOnInit(): void {
    this.api.get<any>('referral/my-code').subscribe(res => {
      if (res.data) {
        this.referralCode.set(res.data.code);
        this.rewardAmount = res.data.rewardAmount;
      }
    });
    this.api.get<any>('referral/my-referrals').subscribe(res => {
      if (res.data) {
        this.referrals.set(res.data.referrals ?? []);
        this.totalEarned.set(res.data.totalEarned ?? 0);
      }
    });
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.referralCode());
    this.copied = true;
    this.snackBar.open('Referral code copied!', undefined, { duration: 2000 });
    setTimeout(() => this.copied = false, 3000);
  }

  copyLink(): void {
    navigator.clipboard.writeText(`${window.location.origin}/auth/register?ref=${this.referralCode()}`);
    this.snackBar.open('Referral link copied!', undefined, { duration: 2000 });
  }

  shareWhatsApp(): void {
    const text = `Use my referral code *${this.referralCode()}* on Sidham Pharmacy and get ₹50 off your first order! Shop here: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
}
