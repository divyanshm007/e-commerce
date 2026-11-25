import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

/** Shell of every "My Account" page: a small menu on the left (a scrolling row on phones) and the page on the right. */
@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule],
  template: `
    <div class="acct-wrap container">
      <nav class="acct-nav" aria-label="My account">
        <a *ngFor="let i of items" [routerLink]="i.path" routerLinkActive="active"><mat-icon>{{ i.icon }}</mat-icon><span>{{ i.label }}</span></a>
        <a class="acct-logout" (click)="auth.logout()"><mat-icon>logout</mat-icon><span>Logout</span></a>
      </nav>
      <main class="acct-main"><router-outlet /></main>
    </div>
  `,
  styles: [`
    .acct-wrap { display:grid; grid-template-columns:230px 1fr; gap:24px; padding-top:24px; padding-bottom:40px; align-items:start; }
    .acct-nav { background:#fff; border:1px solid var(--border); border-radius:14px; padding:10px; display:flex; flex-direction:column; gap:2px; position:sticky; top:90px; }
    .acct-nav a { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px; color:var(--text-primary); text-decoration:none; font-size:14.5px; font-weight:500; cursor:pointer; }
    .acct-nav a mat-icon { font-size:20px; width:20px; height:20px; color:#64748B; }
    .acct-nav a:hover { background:#F1F5F9; }
    .acct-nav a.active { background:#ECFDF5; color:#047857; font-weight:600; }
    .acct-nav a.active mat-icon { color:#059669; }
    .acct-logout { margin-top:6px; border-top:1px solid var(--border); border-radius:0 0 10px 10px !important; }
    .acct-main { min-width:0; }
    @media (max-width: 860px) {
      .acct-wrap { grid-template-columns:1fr; gap:14px; padding-top:14px; }
      .acct-nav { flex-direction:row; overflow-x:auto; position:static; padding:6px; gap:4px; }
      .acct-nav { scrollbar-width:none; -webkit-overflow-scrolling:touch; }
      .acct-nav::-webkit-scrollbar { display:none; }
      .acct-nav a { white-space:nowrap; padding:9px 12px; flex-shrink:0; }
      .acct-nav a span { font-size:13.5px; }
      .acct-logout { margin:0; border:0; }
    }
  `]
})
export class AccountLayoutComponent {
  auth = inject(AuthService);
  readonly items = [
    { path: '/account/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/account/profile', label: 'My Profile', icon: 'person' },
    { path: '/account/orders', label: 'My Orders', icon: 'receipt_long' },
    { path: '/account/returns', label: 'Returns', icon: 'assignment_return' },
    { path: '/account/referral', label: 'Referral & Rewards', icon: 'card_giftcard' },
    { path: '/account/addresses', label: 'Addresses', icon: 'location_on' },
    { path: '/account/change-password', label: 'Password', icon: 'lock' },
  ];
}
