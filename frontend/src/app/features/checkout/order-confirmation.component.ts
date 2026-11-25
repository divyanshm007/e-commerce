import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderDetail, orderItemHasOffer } from '../../core/models/order.models';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor, CurrencyPipe, MatIconModule, MatButtonModule],
  template: `
    <div class="oc-page">
      <div class="oc-card" *ngIf="order">
        <mat-icon class="oc-icon">check_circle</mat-icon>
        <h1>Thank you for your order!</h1>
        <p class="oc-sub">
          Order <strong>#{{ order.orderNumber }}</strong> has been placed.
          <ng-container *ngIf="email"> A confirmation email is on its way to <strong>{{ email }}</strong>.</ng-container>
        </p>

        <div class="oc-items">
          <div class="oc-item" *ngFor="let i of order.items">
            <span>{{ i.productName }} × {{ i.quantity }}</span>
            <span>
              <s *ngIf="orderItemHasOffer(i)" style="color:#94a3b8;font-size:12px;margin-right:6px">{{ i.unitPrice * i.quantity | currency:'INR':'symbol':'1.0-2' }}</s>
              {{ i.totalPrice | currency:'INR':'symbol':'1.0-2' }}
            </span>
          </div>
          <div class="oc-item oc-total"><span>Total</span><span>{{ order.totalAmount | currency:'INR':'symbol':'1.0-2' }}</span></div>
        </div>

        <div class="oc-actions">
          <a mat-flat-button color="primary" routerLink="/products">Continue shopping</a>
          <a mat-stroked-button routerLink="/account/orders" *ngIf="auth.isLoggedIn()">View my orders</a>
        </div>
      </div>

      <div class="oc-card" *ngIf="!order && placedOnly">
        <mat-icon class="oc-icon">check_circle</mat-icon>
        <h1>Thank you for your order!</h1>
        <p class="oc-sub">
          Order <strong>#{{ orderNumber }}</strong> has been placed. For your privacy the order details are not shown
          on this page; they are in the confirmation email we sent you.
        </p>
        <div class="oc-actions"><a mat-flat-button color="primary" routerLink="/products">Continue shopping</a></div>
      </div>

      <div class="oc-card" *ngIf="!order && !failed && !placedOnly"><p>Loading your order…</p></div>
      <div class="oc-card" *ngIf="failed">
        <h1>We couldn't load that order</h1>
        <p class="oc-sub">Your order may still have been placed. Check your email or your orders page.</p>
        <a mat-flat-button color="primary" routerLink="/">Back to home</a>
      </div>
    </div>
  `,
  styles: [`
    .oc-page { min-height: 60vh; display: flex; justify-content: center; padding: 48px 16px; }
    .oc-card { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,.08); height: fit-content; }
    .oc-icon { font-size: 64px; width: 64px; height: 64px; color: #4caf50; }
    h1 { font-size: 26px; margin: 8px 0; }
    .oc-sub { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 22px; }
    .oc-items { text-align: left; border-top: 1px solid #e2e8f0; margin-bottom: 24px; }
    .oc-item { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .oc-total { font-weight: 700; font-size: 16px; }
    .oc-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class OrderConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orders = inject(OrderService);
  auth = inject(AuthService);
  readonly orderItemHasOffer = orderItemHasOffer;

  order: OrderDetail | null = null;
  failed = false;
  placedOnly = false;
  orderNumber = '';
  email = '';

  ngOnInit(): void {
    const orderNumber = this.route.snapshot.paramMap.get('orderNumber')!;
    this.orderNumber = orderNumber;

    // right after checkout the order the server returned is passed along, so nothing is looked up by number
    const justPlaced = (history.state?.order ?? null) as OrderDetail | null;
    if (justPlaced && justPlaced.orderNumber === orderNumber) {
      this.order = justPlaced;
      // a signed-in buyer's email is their account address; a guest's is the one typed at checkout
      this.email = this.auth.customerUser()?.email ?? justPlaced.customerEmail ?? '';
      return;
    }

    // a reload or a saved link: a signed-in buyer may load their own order; a guest sees no order details
    if (!this.auth.isLoggedIn()) { this.placedOnly = true; return; }
    this.orders.getByOrderNumber(orderNumber).subscribe({
      next: res => {
        this.order = res.data ?? null;
        this.failed = !res.data;
        this.email = this.auth.customerUser()?.email ?? '';
      },
      error: () => { this.failed = true; }
    });
  }
}
