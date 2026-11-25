import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/services/auth.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { Cart, hasOffer, mrpLineTotal } from '../../core/models/cart.models';
import { CreateOrderDto, OrderDetail, PaymentMethod, CustomerAddress, AddressSnapshot } from '../../core/models/order.models';

/** Mirrors the server rule: a 10-digit Indian mobile number, optionally written with +91 / 91 / 0 in front. */
function indianMobile(c: AbstractControl): ValidationErrors | null {
  let d = String(c.value ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? null : { mobile: true };
}

/** A 6-digit Indian PIN code. */
function sixDigitPin(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  return !v || /^[1-9][0-9]{5}$/.test(v) ? null : { pin: true };
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, FormsModule, NgFor, NgIf, CurrencyPipe,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatRadioModule, MatDividerModule, MatProgressSpinnerModule,
    BreadcrumbComponent, PageHeroComponent
  ],
  template: `
    <app-page-hero
      title="Checkout"
      subtitle="You're one step away — fill in your details and place your order."
      icon="lock"
      image="/uploads/heroes/hero-checkout.jpg">
    </app-page-hero>

    <div class="container checkout-layout">
      <!-- Left: Contact + Address + Payment -->
      <div class="checkout-main card">

        <!-- Guest notice -->
        <div class="guest-notice" *ngIf="!auth.isLoggedIn()">
          <mat-icon>info_outline</mat-icon>
          <span>Ordering as guest &mdash; <a routerLink="/auth/login" [queryParams]="{returnUrl:'/checkout'}">Log in</a> to save your order history</span>
        </div>

        <form [formGroup]="form">
          <h3>Contact & Delivery</h3>

          <!-- Saved addresses for logged-in users -->
          <div class="saved-addresses" *ngIf="savedAddresses.length && auth.isLoggedIn()">
            <div class="address-cards">
              <div class="address-card" *ngFor="let a of savedAddresses"
                [class.selected]="selectedAddressId === a.id"
                (click)="selectAddress(a)">
                <strong>{{ a.fullName }}</strong>
                <span>{{ a.line1 }}, {{ a.city }}</span>
              </div>
            </div>
            <button mat-button color="primary" type="button"
              (click)="selectedAddressId = null; form.reset({country:'India'})">
              + Use a different address
            </button>
          </div>

          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" />
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Mobile Number</mat-label>
              <input matInput type="tel" formControlName="phone" />
              <mat-error *ngIf="form.get('phone')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="form.get('phone')?.hasError('mobile')">Enter a valid 10-digit mobile number</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" *ngIf="!auth.isLoggedIn()">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>Valid email required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Address Line 1</mat-label>
            <input matInput formControlName="line1" placeholder="House / Flat, Street" />
            <mat-error>Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Address Line 2 (optional)</mat-label>
            <input matInput formControlName="line2" placeholder="Landmark, Area" />
          </mat-form-field>

          <div class="row-3">
            <mat-form-field appearance="outline">
              <mat-label>City</mat-label>
              <input matInput formControlName="city" />
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>State</mat-label>
              <input matInput formControlName="state" />
              <mat-error>Required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pincode</mat-label>
              <input matInput formControlName="postalCode" inputmode="numeric" maxlength="6" />
              <mat-error *ngIf="form.get('postalCode')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="form.get('postalCode')?.hasError('pin')">Enter a valid 6-digit PIN code</mat-error>
            </mat-form-field>
          </div>

          <mat-divider style="margin:20px 0" />

          <h3>Payment Method</h3>
          <mat-radio-group formControlName="paymentMethod" class="payment-options">
            <mat-radio-button [value]="PaymentMethod.Razorpay" color="primary">
              <div class="pay-option">
                <mat-icon>credit_card</mat-icon>
                <div>
                  <strong>Pay Online (Razorpay)</strong>
                  <p>Card, UPI, Netbanking, Wallet</p>
                </div>
              </div>
            </mat-radio-button>
            <mat-radio-button *ngIf="auth.isLoggedIn()" [value]="PaymentMethod.CashOnDelivery" color="primary">
              <div class="pay-option">
                <mat-icon>local_shipping</mat-icon>
                <div>
                  <strong>Cash on Delivery</strong>
                  <p>Pay when you receive your order</p>
                </div>
              </div>
            </mat-radio-button>
          </mat-radio-group>
          <p class="cod-note" *ngIf="!auth.isLoggedIn()">
            <mat-icon>info_outline</mat-icon>
            Cash on Delivery is available for logged-in customers.
            <a routerLink="/auth/login" [queryParams]="{returnUrl:'/checkout'}">Log in</a> to use it.
          </p>
        </form>
      </div>

      <!-- Right: Order Summary -->
      <div class="order-summary card">
        <h3>Order Summary</h3>

        <div class="summary-items" *ngIf="cart">
          <div class="summary-item" *ngFor="let item of cart.items">
            <div class="item-left">
              <span class="item-name">{{ item.productName }} <span class="item-qty">×{{ item.quantity }}</span></span>
              <span class="item-discount-label" *ngIf="cart.discountAmount > 0 && item.itemDiscountAmount > 0">
                {{ cart.couponDiscountType === 1 ? (cart.couponDiscountValue + '% OFF') : 'COUPON OFF' }}
                <span class="item-discount-saved">-{{ item.itemDiscountAmount | currency:'INR':'symbol':'1.2-2' }}</span>
              </span>
            </div>
            <div class="item-price-wrap">
              <span class="item-original-price" *ngIf="hasOffer(item)">{{ mrpLineTotal(item) | currency:'INR':'symbol':'1.2-2' }}</span>
              <span class="item-original-price" *ngIf="!hasOffer(item) && cart.discountAmount > 0 && item.itemDiscountAmount > 0">{{ item.originalLineTotal | currency:'INR':'symbol':'1.2-2' }}</span>
              <span class="item-final-price" [class.item-discounted]="hasOffer(item) || (cart.discountAmount > 0 && item.itemDiscountAmount > 0)">{{ item.lineTotal | currency:'INR':'symbol':'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <mat-divider style="margin:16px 0" />

        <div class="summary-rows" *ngIf="cart">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>{{ cart.subTotal | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
          <div class="summary-row" *ngIf="cart.shippingCharge > 0">
            <span>Shipping</span>
            <span>{{ cart.shippingCharge | currency:'INR':'symbol':'1.0-0' }}</span>
          </div>
        </div>

        <!-- Coupon -->
        <div class="coupon-row" *ngIf="cart">
          <mat-form-field appearance="outline" class="coupon-field">
            <mat-label>Coupon Code</mat-label>
            <input matInput [(ngModel)]="couponCode" placeholder="SAVE10" />
          </mat-form-field>
          <button mat-stroked-button (click)="applyCoupon()" [disabled]="!couponCode || applyingCoupon">
            {{ applyingCoupon ? '…' : 'Apply' }}
          </button>
        </div>
        <p class="coupon-msg success" *ngIf="couponMsg">{{ couponMsg }}</p>
        <div class="summary-row discount" *ngIf="cart && cart.discountAmount > 0">
          <span>Coupon Discount</span>
          <span>-{{ cart.discountAmount | currency:'INR':'symbol':'1.0-0' }}</span>
        </div>

        <mat-divider style="margin:8px 0 16px" />

        <div class="summary-row total" *ngIf="cart">
          <span>Total</span>
          <span class="total-price-wrap">
            <span class="original-price" *ngIf="cart.discountAmount > 0">{{ cart.subTotal + cart.shippingCharge | currency:'INR':'symbol':'1.0-0' }}</span>
            <span class="final-price" [class.discounted]="cart.discountAmount > 0">{{ cart.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
          </span>
        </div>

        <button mat-flat-button color="primary" class="place-btn"
          (click)="placeOrder()"
          [disabled]="form.invalid || placingOrder || !cart?.items?.length">
          <mat-icon *ngIf="!placingOrder">shopping_bag</mat-icon>
          <mat-spinner diameter="18" *ngIf="placingOrder" />
          {{ placingOrder ? 'Placing Order…' : 'Place Order' }}
        </button>

        <div class="security-note">
          <mat-icon>lock</mat-icon> Secured by Razorpay
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 28px;
      padding: 24px 16px 80px;
      align-items: start;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
      @media (max-width: 600px) { padding: 12px 12px 60px; gap: 16px; }
    }

    .checkout-main { padding: 28px; @media (max-width: 600px) { padding: 16px; } }

    h3 { font-size: 17px; font-weight: 700; margin: 0 0 16px; color: var(--text-primary); }

    .guest-notice {
      display: flex; align-items: center; gap: 8px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 20px; font-size: 13px; color: #1e40af;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      a { color: #1d4ed8; font-weight: 600; text-decoration: none; &:hover { text-decoration: underline; } }
    }

    .saved-addresses { margin-bottom: 20px; }
    .address-cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
    .address-card {
      border: 2px solid var(--border); border-radius: 8px; padding: 10px 14px;
      cursor: pointer; font-size: 13px; min-width: 180px;
      strong { display: block; margin-bottom: 2px; }
      span { color: var(--text-muted); font-size: 12px; }
      &.selected { border-color: var(--primary); background: var(--primary-light, #f0fdf4); }
    }

    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media(max-width:600px){grid-template-columns:1fr;} }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; @media(max-width:600px){grid-template-columns:1fr;} }
    .full-width { width: 100%; }
    mat-form-field { width: 100%; }

    .payment-options { display: flex; flex-direction: column; gap: 12px; }
    .cod-note { display:flex; align-items:center; gap:8px; margin:12px 0 0; font-size:13px; color:var(--text-secondary); mat-icon { font-size:18px; width:18px; height:18px; color:#059669; } a { color:#047857; font-weight:600; } }
    .pay-option {
      display: flex; align-items: center; gap: 12px; padding: 8px 0;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--primary); }
      strong { display: block; font-size: 14px; }
      p { font-size: 12px; color: var(--text-muted); margin: 2px 0 0; }
    }

    /* Summary */
    .order-summary { padding: 24px; }
    .order-summary h3 { font-size: 17px; font-weight: 700; margin: 0 0 16px; }

    .summary-items { display: flex; flex-direction: column; gap: 10px; }
    .summary-item {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
      .item-left { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
      .item-name { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
      .item-qty { font-size: 12px; color: var(--text-muted); font-weight: 400; }
      .item-discount-label {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px; font-weight: 700; color: #16a34a;
        background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;
        padding: 1px 5px; width: fit-content; margin-top: 1px;
        .item-discount-saved { font-weight: 600; }
      }
      .item-price-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; flex-shrink: 0; }
      .item-original-price { font-size: 11px; color: var(--text-muted); text-decoration: line-through; }
      .item-final-price { font-size: 13px; font-weight: 600; color: var(--text-primary); }
      .item-final-price.item-discounted { color: #16a34a; font-size: 14px; }
    }

    .summary-rows { margin-bottom: 4px; }
    .summary-row {
      display: flex; justify-content: space-between; font-size: 14px;
      padding: 7px 0; color: var(--text-secondary);
      &.total { font-size: 18px; font-weight: 700; color: var(--text-primary); }
      &.discount { color: #16a34a; font-size: 13px; padding: 4px 0; }
    }
    .total-price-wrap {
      display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
      .original-price { font-size: 13px; font-weight: 400; color: var(--text-muted); text-decoration: line-through; }
      .final-price { font-size: 18px; font-weight: 700; color: var(--text-primary); }
      .final-price.discounted { font-size: 22px; color: #16a34a; }
    }

    .coupon-row {
      display: flex; gap: 8px; align-items: center; margin: 12px 0 4px;
      .coupon-field { flex: 1; }
      button { flex-shrink: 0; height: 56px; }
    }
    .coupon-msg { font-size: 12px; color: #16a34a; margin: 0 0 4px; }

    .place-btn {
      width: 100%; height: 52px; font-size: 16px; font-weight: 700;
      margin-top: 20px; gap: 8px;
      display: flex; align-items: center; justify-content: center;
    }

    .security-note {
      display: flex; align-items: center; gap: 6px; justify-content: center;
      font-size: 12px; color: var(--text-muted); margin-top: 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  readonly PaymentMethod = PaymentMethod;
  readonly hasOffer = hasOffer;
  readonly mrpLineTotal = mrpLineTotal;

  form: FormGroup = this.fb.group({
    fullName:      ['', Validators.required],
    phone:         ['', [Validators.required, indianMobile]],
    email:         ['', [Validators.email]],
    line1:         ['', Validators.required],
    line2:         [''],
    city:          ['', Validators.required],
    state:         ['', Validators.required],
    postalCode:    ['', [Validators.required, sixDigitPin]],
    country:       ['India'],
    paymentMethod: [PaymentMethod.Razorpay],
  });

  cart: Cart | null = null;
  savedAddresses: CustomerAddress[] = [];
  selectedAddressId: string | null = null;
  placingOrder = false;
  couponCode = '';
  couponMsg = '';
  applyingCoupon = false;

  ngOnInit(): void {
    // Email required only for guests
    if (!this.auth.isLoggedIn()) {
      this.form.patchValue({ paymentMethod: PaymentMethod.Razorpay });        // guests can only pay online
      this.form.get('email')!.addValidators(Validators.required);
      this.form.get('email')!.updateValueAndValidity();
    }

    this.cartService.loadCart().subscribe(res => { this.cart = res.data ?? null; });

    if (this.auth.isLoggedIn()) {
      this.orderService.getAddresses().subscribe(res => {
        if (res.data) {
          this.savedAddresses = res.data;
          const def = res.data.find(a => a.isDefault);
          if (def) this.selectAddress(def);
        }
      });
    }
  }

  /** The server already removed the purchased items; refresh what the UI shows and show the confirmation. */
  private afterPurchase(order: OrderDetail): void {
    this.cartService.clearLocal();
    this.cartService.loadCart().subscribe({ error: () => {} });
    // the confirmation page shows the order the server just returned; it never has to look an order up by number
    this.router.navigate(['/order-confirmation', order.orderNumber], { state: { order } });
  }

  /** The server's reason for refusing the order (validation or stock), or a generic fallback. */
  private orderError(err: any): string {
    const e = err?.error;
    if (e?.message) return e.message;
    if (e?.errors && typeof e.errors === 'object') {
      const first = Object.values(e.errors).flat()[0];
      if (first) return String(first);
    }
    return 'Could not place the order. Please check your details and try again.';
  }

  selectAddress(a: CustomerAddress): void {
    this.selectedAddressId = a.id;
    this.form.patchValue({
      fullName: a.fullName, phone: a.phone,
      line1: a.line1, line2: a.line2 || '',
      city: a.city, state: a.state,
      postalCode: a.postalCode, country: a.country || 'India'
    });
  }

  applyCoupon(): void {
    if (!this.couponCode) return;
    this.applyingCoupon = true;
    this.cartService.applyCoupon(this.couponCode).subscribe({
      next: (res) => {
        this.cart = res.data ?? this.cart;
        this.couponMsg = 'Coupon applied!';
        this.applyingCoupon = false;
      },
      error: () => {
        this.couponMsg = 'Invalid coupon code';
        this.applyingCoupon = false;
      }
    });
  }

  placeOrder(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.cart?.items?.length) return;
    this.placingOrder = true;

    const v = this.form.value;
    const addr: AddressSnapshot = {
      fullName: v.fullName, phone: v.phone,
      line1: v.line1, line2: v.line2,
      city: v.city, state: v.state,
      postalCode: v.postalCode, country: v.country || 'India'
    };

    const dto: CreateOrderDto = {
      paymentMethod: this.auth.isLoggedIn() ? v.paymentMethod : PaymentMethod.Razorpay,
      couponCode: this.couponCode || undefined,
      shippingAddress: addr,
      billingAddress: addr,
      items: this.cart.items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity
      })),
      ...(!this.auth.isLoggedIn() && {
        guestName:  v.fullName,
        guestEmail: v.email,
        guestPhone: v.phone,
      })
    };

    if (dto.paymentMethod === PaymentMethod.CashOnDelivery) {
      this.orderService.create(dto).subscribe({
        next: (res) => {
          if (res.data) {
            this.snackBar.open('Order placed successfully!', undefined, { duration: 3000 });
            this.afterPurchase(res.data);
          }
          this.placingOrder = false;
        },
        error: (err) => { this.snackBar.open(this.orderError(err), undefined, { duration: 5000 }); this.placingOrder = false; }
      });
    } else {
      this.orderService.create(dto).subscribe({
        next: (orderRes) => {
          const order = orderRes.data;
          if (!order) { this.placingOrder = false; return; }
          this.paymentService.createRazorpayOrder(order.id).subscribe({
            next: (rzpRes) => {
              if (!rzpRes.data) { this.placingOrder = false; return; }
              this.paymentService.openRazorpayCheckout(rzpRes.data, {
                onSuccess: (response: any) => {
                  this.paymentService.verifyPayment({
                    orderId: order.id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature
                  }).subscribe({
                    next: () => {
                      this.snackBar.open('Payment successful!', undefined, { duration: 3000, panelClass: 'snack-success' });
                      this.afterPurchase(order);
                    },
                    error: () => {
                      this.snackBar.open('Payment verification failed. Contact support.', undefined, { duration: 5000 });
                      this.placingOrder = false;
                    }
                  });
                },
                onDismiss: () => { this.placingOrder = false; }
              });
            },
            error: () => { this.placingOrder = false; }
          });
        },
        error: (err) => { this.snackBar.open(this.orderError(err), undefined, { duration: 5000 }); this.placingOrder = false; }
      });
    }
  }
}
