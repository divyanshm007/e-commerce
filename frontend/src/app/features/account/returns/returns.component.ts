import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { OrderService } from '../../../core/services/order.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DatePipe, ReactiveFormsModule, BreadcrumbComponent,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="page-content">
      <h2 class="page-title">Returns & Refunds</h2>

      <!-- New Request -->
      <div class="card new-request" *ngIf="!showForm()">
        <div class="nr-icon">📦</div>
        <h3>Want to Return an Item?</h3>
        <p>We offer hassle-free returns within 7 days of delivery. Eligible items in original condition can be returned for a full refund.</p>
        <button mat-flat-button color="primary" (click)="showForm.set(true)">
          <mat-icon>assignment_return</mat-icon> Request a Return
        </button>
      </div>

      <!-- Return Form -->
      <div class="card return-form" *ngIf="showForm() && !submitted()">
        <h3><mat-icon>assignment_return</mat-icon> Return Request</h3>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Order *</mat-label>
            <mat-select formControlName="orderId">
              <mat-option *ngFor="let o of orders()" [value]="o.id">
                #{{ o.orderNumber }} — {{ o.createdAt | date:'mediumDate' }}
              </mat-option>
            </mat-select>
            <mat-error>Please select an order</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Reason for Return *</mat-label>
            <mat-select formControlName="reason">
              <mat-option value="Wrong product received">Wrong product received</mat-option>
              <mat-option value="Damaged or defective product">Damaged or defective product</mat-option>
              <mat-option value="Product not as described">Product not as described</mat-option>
              <mat-option value="Allergic reaction">Allergic reaction</mat-option>
              <mat-option value="Changed my mind">Changed my mind</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
            <mat-error>Please select a reason</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Additional Details</mat-label>
            <textarea matInput formControlName="description" rows="4" placeholder="Please describe the issue in detail..."></textarea>
          </mat-form-field>

          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="showForm.set(false)">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Submitting...' : 'Submit Return Request' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Success -->
      <div class="card success-card" *ngIf="submitted()">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <h3>Return Request Submitted!</h3>
        <p>We'll review your request and contact you within 24–48 hours.</p>
        <button mat-stroked-button (click)="submitted.set(false); showForm.set(false)">View My Returns</button>
      </div>

      <!-- Existing Returns -->
      <div class="returns-list" *ngIf="returnRequests().length">
        <h3>My Return Requests</h3>
        <div class="return-card card" *ngFor="let r of returnRequests()">
          <div class="rc-header">
            <span class="order-num">Order #{{ r.orderNumber }}</span>
            <span class="status-chip" [class]="'status-' + r.status.toLowerCase()">{{ r.status }}</span>
          </div>
          <p class="reason"><strong>Reason:</strong> {{ r.reason }}</p>
          <p class="admin-note" *ngIf="r.adminNotes"><mat-icon>info</mat-icon> {{ r.adminNotes }}</p>
          <span class="date">{{ r.createdAt | date:'mediumDate' }}</span>
        </div>
      </div>

      <!-- Policy -->
      <div class="policy-box card">
        <h4>📋 Return Policy</h4>
        <ul>
          <li>Returns accepted within <strong>7 days</strong> of delivery</li>
          <li>Items must be <strong>unused and in original packaging</strong></li>
          <li>Refund processed within <strong>5–7 business days</strong></li>
          <li>Opened Ayurvedic products are non-returnable for hygiene reasons unless defective</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .page-content { padding: 24px 0; }
    .page-title { font-size: 22px; font-weight: 700; margin: 0 0 24px; }
    .new-request { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; .nr-icon { font-size: 48px; } h3 { font-size: 20px; font-weight: 700; margin: 0; } p { font-size: 14px; color: var(--text-secondary); max-width: 480px; margin: 0; } }
    .return-form { padding: 28px; h3 { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; margin: 0 0 20px; mat-icon { color: var(--primary); } } }
    .full-width { width: 100%; margin-bottom: 8px; display: block; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
    .success-card { padding: 40px; text-align: center; .success-icon { font-size: 56px; width: 56px; height: 56px; color: #22c55e; } h3 { font-size: 20px; font-weight: 700; } p { color: var(--text-secondary); } }
    .returns-list { margin-top: 32px; h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; } }
    .return-card { padding: 20px; margin-bottom: 12px; }
    .rc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .order-num { font-weight: 700; font-size: 15px; }
    .status-chip { padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; &.status-pending { background: #fef3c7; color: #b45309; } &.status-approved { background: #dcfce7; color: #166534; } &.status-rejected { background: #fee2e2; color: #b91c1c; } &.status-completed { background: #dbeafe; color: #1e40af; } }
    .reason, .admin-note, .date { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
    .admin-note { display: flex; align-items: center; gap: 4px; color: var(--primary); mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .policy-box { padding: 24px; margin-top: 32px; h4 { font-size: 15px; font-weight: 700; margin: 0 0 12px; } ul { margin: 0; padding: 0 0 0 20px; li { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.5; } }  }
  `]
})
export class ReturnsComponent implements OnInit {
  private api = inject(ApiService);
  private orderService = inject(OrderService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  showForm = signal(false);
  submitted = signal(false);
  submitting = signal(false);
  orders = signal<any[]>([]);
  returnRequests = signal<any[]>([]);

  form = this.fb.group({
    orderId: ['', Validators.required],
    reason: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe(res => {
      if (res.data) this.orders.set(res.data);
    });
    this.api.get<any[]>('returns/my').subscribe(res => {
      if (res.data) this.returnRequests.set(res.data);
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.api.post('returns', this.form.value).subscribe({
      next: () => { this.submitting.set(false); this.submitted.set(true); this.loadReturns(); },
      error: (err) => { this.submitting.set(false); this.snackBar.open(err.error?.message || 'Submission failed', 'OK', { duration: 3000 }); }
    });
  }

  private loadReturns(): void {
    this.api.get<any[]>('returns/my').subscribe(res => { if (res.data) this.returnRequests.set(res.data); });
  }
}
