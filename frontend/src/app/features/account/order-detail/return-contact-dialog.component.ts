import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AdminDialogShellComponent } from '../../../admin/shared/admin-dialog-shell.component';

export interface ReturnContactData { orderNumber: string; }

/** A delivered order is returned by contacting the store: this popup gives the phone number and e-mail (with the order number filled in) and a link to the Contact page. */
@Component({
  selector: 'app-return-contact-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [AdminDialogShellComponent, MatIconModule],
  template: `
<app-admin-dialog-shell title="Return this order" icon="assignment_return" mode="info" (closed)="close()">
  <ng-container dialog-body>
    <p class="rc-msg">To return order <strong>#{{ data.orderNumber }}</strong>, please contact us and keep your order number ready. Our team will guide you through the return.</p>
    <a class="rc-row" [href]="'tel:' + phoneTel">
      <mat-icon>phone</mat-icon>
      <span><small>Call us</small><strong>{{ phone }}</strong></span>
    </a>
    <a class="rc-row" [href]="mailto">
      <mat-icon>email</mat-icon>
      <span><small>Email us</small><strong>{{ email }}</strong></span>
    </a>
    <p class="rc-note">Returns are accepted within 7 days of delivery, for items in their original condition.</p>
  </ng-container>
  <ng-container dialog-footer>
    <button class="adlg-cancel" (click)="close()">Close</button>
    <button class="adlg-submit" (click)="openContact()"><mat-icon>contact_support</mat-icon> Open Contact page</button>
  </ng-container>
</app-admin-dialog-shell>
  `,
  styles: [`
    /* phones: the popup may use almost the whole width, and its buttons may be narrower than the desktop minimum */
    .cdk-overlay-pane.mat-mdc-dialog-panel { max-width: 95vw !important; }
    app-return-contact-dialog { display: block; max-width: 95vw; }
    app-return-contact-dialog .adlg-cancel, app-return-contact-dialog .adlg-submit { min-width: 0; }
    app-return-contact-dialog .adlg-submit { white-space: nowrap; }
    .rc-msg { font-size: 14.5px; color: #374151; line-height: 1.6; margin: 0 0 14px; }
    .rc-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 10px; border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 10px; text-decoration: none; color: #166534; }
    .rc-row mat-icon { flex-shrink: 0; }
    .rc-row span { display: flex; flex-direction: column; min-width: 0; }
    .rc-row small { font-size: 12px; color: #475569; }
    .rc-row strong { font-size: 16px; color: #14532d; word-break: break-all; }
    .rc-note { margin: 12px 0 0; font-size: 12.5px; color: #64748b; }
  `]
})
export class ReturnContactDialogComponent {
  readonly phone = '+91 9588383903';
  readonly phoneTel = '+919588383903';
  readonly email = 'sidhampharmacy@gmail.com';

  constructor(
    private ref: MatDialogRef<ReturnContactDialogComponent>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: ReturnContactData
  ) {}

  get mailto(): string {
    const subject = encodeURIComponent(`Return request for order ${this.data.orderNumber}`);
    const body = encodeURIComponent(`Hello,\n\nI would like to return order ${this.data.orderNumber}.\nReason: \n\nThank you`);
    return `mailto:${this.email}?subject=${subject}&body=${body}`;
  }

  close(): void { this.ref.close(); }
  openContact(): void { this.ref.close(); this.router.navigate(['/contact']); }
}
