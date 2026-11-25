import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { OrderService } from '../../../core/services/order.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CustomerAddress } from '../../../core/models/order.models';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="page-content">
      <div class="acct-page-header">
        <h2 class="page-title">Saved Addresses</h2>
        <button mat-flat-button color="primary" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> Add Address
        </button>
      </div>

      <!-- Add Form -->
      <div class="address-form card" *ngIf="showForm">
        <h3>New Address</h3>
        <form [formGroup]="form" (ngSubmit)="saveAddress()">
          <div class="row-2">
            <mat-form-field appearance="outline"><mat-label>Full Name</mat-label><input matInput formControlName="fullName" /><mat-error>Required</mat-error></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput formControlName="phone" /><mat-error>Required</mat-error></mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full-width"><mat-label>Address Line 1</mat-label><input matInput formControlName="line1" /></mat-form-field>
          <mat-form-field appearance="outline" class="full-width"><mat-label>Address Line 2 (optional)</mat-label><input matInput formControlName="line2" /></mat-form-field>
          <div class="row-3">
            <mat-form-field appearance="outline"><mat-label>City</mat-label><input matInput formControlName="city" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>State</mat-label><input matInput formControlName="state" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Pincode</mat-label><input matInput formControlName="postalCode" /></mat-form-field>
          </div>
          <div class="form-actions">
            <button mat-button type="button" (click)="showForm = false">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving...' : 'Save Address' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Saved List -->
      <div class="address-cards" *ngIf="addresses().length">
        <div class="address-card card" *ngFor="let a of addresses()">
          <div class="addr-info">
            <p class="addr-name"><strong>{{ a.fullName }}</strong> · {{ a.phone }}</p>
            <p>{{ a.line1 }}{{ a.line2 ? ', ' + a.line2 : '' }}</p>
            <p>{{ a.city }}, {{ a.state }} {{ a.postalCode }}</p>
            <p>{{ a.country }}</p>
          </div>
          <button mat-icon-button color="warn" (click)="deleteAddress(a)">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <div class="empty-state" *ngIf="!addresses().length && !showForm">
        <mat-icon>location_off</mat-icon>
        <h3>No addresses saved</h3>
        <p>Add a delivery address to speed up checkout.</p>
      </div>
    </div>
  `,
  styles: [`
    .acct-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0; }

    .address-form { margin-bottom: 24px; h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; } }

    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; mat-form-field { width: 100%; } @media(max-width:600px){grid-template-columns:1fr;} }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; mat-form-field { width: 100%; } @media(max-width:600px){grid-template-columns:1fr;} }
    .full-width { width: 100%; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

    .address-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

    .address-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      .addr-info p { font-size: 13px; color: var(--text-secondary); margin: 0 0 4px; }
      .addr-name { color: var(--text-primary); }
    }
  `]
})
export class AddressesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private orderService = inject(OrderService);
  private dialog = inject(MatDialog);

  addresses = signal<CustomerAddress[]>([]);
  showForm = false;
  saving = false;

  form = this.fb.group({
    fullName: ['', Validators.required],
    phone: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['India']
  });

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.orderService.getAddresses().subscribe(res => {
      if (res.data) this.addresses.set(res.data);
    });
  }

  saveAddress(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.orderService.addAddress(this.form.value).subscribe({
      next: () => { this.showForm = false; this.form.reset({ country: 'India' }); this.saving = false; this.loadAddresses(); },
      error: () => { this.saving = false; }
    });
  }

  deleteAddress(a: CustomerAddress): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Address', message: 'Remove this address?', icon: 'delete' }
    }).afterClosed().subscribe(ok => {
      if (ok) this.orderService.deleteAddress(a.id).subscribe(() => this.loadAddresses());
    });
  }
}
