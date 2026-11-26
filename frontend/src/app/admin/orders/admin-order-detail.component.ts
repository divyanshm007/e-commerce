import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrderService } from '../../core/services/order.service';
import { OrderDetail, OrderStatus, PaymentStatus, PaymentMethod, orderItemHasOffer, orderItemSellingUnit } from '../../core/models/order.models';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { OrderShipmentCardComponent } from './order-shipment-card.component';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [
    NgIf, DatePipe, CurrencyPipe, RouterLink, ReactiveFormsModule, FormsModule,
    ButtonModule, TagModule, SkeletonModule, SelectModule,
    InputTextModule, TextareaModule, ToastModule, ConfirmDialogModule, TooltipModule,
    MediaUrlPipe, OrderShipmentCardComponent
  ],
  template: `
<p-toast />
<p-confirmDialog />

<div class="min-h-screen bg-slate-50 p-6 flex flex-col gap-6">

  <!-- Back + Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div class="flex items-center gap-3">
      <a routerLink="/admin/orders"
        class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
        <i class="pi pi-arrow-left text-sm"></i>
      </a>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 m-0">
          Order {{ order() ? '#' + order()!.orderNumber : '' }}
        </h1>
        <p class="text-sm text-slate-500 mt-0.5 mb-0">{{ order()?.createdAt | date:'dd MMM yyyy, HH:mm' }}</p>
      </div>
    </div>
    @if (order()) {
      <div class="flex items-center gap-2">
        <p-tag [value]="'Order: ' + orderStatusLabel(order()!.status)" [severity]="orderStatusSeverity(order()!.status)" />
        <p-tag [value]="'Payment: ' + paymentStatusLabel(order()!.paymentStatus)" [severity]="paymentStatusSeverity(order()!.paymentStatus)" />
      </div>
    }
  </div>

  @if (loading()) {
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 flex flex-col gap-4">
        <p-skeleton width="100%" height="200px" />
        <p-skeleton width="100%" height="300px" />
      </div>
      <div class="flex flex-col gap-4">
        <p-skeleton width="100%" height="180px" />
        <p-skeleton width="100%" height="250px" />
      </div>
    </div>
  }

  @if (!loading() && order()) {
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LEFT: Items + Address -->
      <div class="lg:col-span-2 flex flex-col gap-6">

        <!-- Order Items -->
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <i class="pi pi-shopping-cart text-green-600"></i>
            <h3 class="text-base font-bold text-slate-900 m-0">Order Items</h3>
            <span class="ml-auto text-xs text-slate-500">{{ order()!.items.length || 0 }} items</span>
          </div>
          <div class="divide-y divide-slate-50">
            @for (item of order()!.items; track item.id) {
              <div class="flex items-center gap-4 px-5 py-4">
                @if (item.productImageUrl) {
                  <img [src]="item.productImageUrl | mediaUrl" [alt]="item.productName"
                    class="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" />
                } @else {
                  <div class="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-image text-slate-400"></i>
                  </div>
                }
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-slate-900 text-sm truncate">{{ item.productName }}</div>
                  @if (item.variantInfo) {
                    <div class="text-xs text-slate-500 mt-0.5">{{ item.variantInfo }}</div>
                  }
                  <div class="text-xs text-slate-500 mt-1">Qty: {{ item.quantity }}</div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="font-bold text-slate-900 text-sm">{{ item.totalPrice | currency:'INR':'symbol':'1.0-0' }}</div>
                  <div class="text-xs text-slate-500">
                    {{ (orderItemHasOffer(item) ? orderItemSellingUnit(item) : item.unitPrice) | currency:'INR':'symbol':'1.0-0' }} each
                    @if (orderItemHasOffer(item)) { <s class="ml-1">{{ item.unitPrice | currency:'INR':'symbol':'1.0-0' }}</s> }
                  </div>
                </div>
              </div>
            }
          </div>
          <!-- Summary -->
          <div class="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-2">
            <div class="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{{ order()!.subTotal | currency:'INR':'symbol':'1.0-0' }}</span>
            </div>
            @if (order()!.discountAmount) {
              <div class="flex justify-between text-sm text-green-600">
                <span>Discount {{ order()!.couponCode ? '(' + order()!.couponCode + ')' : '' }}</span>
                <span>-{{ order()!.discountAmount | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
            }
            <div class="flex justify-between text-sm text-slate-600">
              <span>Shipping</span>
              <span>{{ order()!.shippingCharge === 0 ? 'FREE' : (order()!.shippingCharge | currency:'INR':'symbol':'1.0-0') }}</span>
            </div>
            <div class="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200 items-center">
              <span>Total</span>
              <span class="flex flex-col items-end gap-0.5">
                @if (order()!.discountAmount) {
                  <span class="text-xs font-normal text-slate-400 line-through">{{ (order()!.subTotal + order()!.shippingCharge) | currency:'INR':'symbol':'1.0-0' }}</span>
                  <span class="text-xl font-bold text-green-600">{{ order()!.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
                } @else {
                  <span class="text-base font-bold text-slate-900">{{ order()!.totalAmount | currency:'INR':'symbol':'1.0-0' }}</span>
                }
              </span>
            </div>
          </div>
        </div>

        <!-- Shipping Address -->
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <i class="pi pi-map-marker text-green-600"></i>
            <h3 class="text-base font-bold text-slate-900 m-0">Shipping Address</h3>
          </div>
          @if (order()!.shippingAddress) {
            <address class="not-italic text-sm text-slate-600 leading-relaxed">
              <div class="font-semibold text-slate-900">{{ order()!.shippingAddress.fullName }}</div>
              <div>{{ order()!.shippingAddress.line1 }}</div>
              @if (order()!.shippingAddress.line2) {
                <div>{{ order()!.shippingAddress.line2 }}</div>
              }
              <div>{{ order()!.shippingAddress.city }}, {{ order()!.shippingAddress.state }} {{ order()!.shippingAddress.postalCode }}</div>
              <div>{{ order()!.shippingAddress.country }}</div>
              @if (order()!.shippingAddress.phone) {
                <div class="mt-1 flex items-center gap-1"><i class="pi pi-phone text-xs"></i> {{ order()!.shippingAddress.phone }}</div>
              }
            </address>
          }
        </div>

      </div>

      <!-- RIGHT: Customer + Update Status -->
      <div class="flex flex-col gap-6">

        <!-- Customer Info -->
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <i class="pi pi-user text-green-600"></i>
            <h3 class="text-base font-bold text-slate-900 m-0">Customer</h3>
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <div class="font-semibold text-slate-900">{{ order()!.customerName || 'Guest' }}</div>
            <div class="flex items-center gap-2 text-slate-500">
              <i class="pi pi-envelope text-xs"></i> {{ order()!.customerEmail }}
            </div>
            @if (order()!.shippingAddress.phone) {
              <div class="flex items-center gap-2 text-slate-500">
                <i class="pi pi-phone text-xs"></i> {{ order()!.shippingAddress.phone }}
              </div>
            }
          </div>
          <div class="mt-4 pt-4 border-t border-slate-100">
            <div class="text-xs text-slate-500 mb-1">Payment Method</div>
            <span class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
              {{ order()!.paymentMethod === 1 ? 'Razorpay' : 'Cash on Delivery' }}
            </span>
            @if (order()!.payments?.[0]?.razorpayPaymentId) {
              <div class="text-xs text-slate-500 mt-2 font-mono">{{ order()!.payments?.[0]?.razorpayPaymentId }}</div>
            }
          </div>
        </div>

        <app-order-shipment-card [orderId]="order()!.id" (changed)="reloadOrder()" />

        <!-- Update Status -->
        <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <i class="pi pi-sync text-green-600"></i>
            <h3 class="text-base font-bold text-slate-900 m-0">Update Status</h3>
          </div>
          <form [formGroup]="statusForm" (ngSubmit)="updateStatus()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Order Status</label>
              <p-select formControlName="status" [options]="orderStatusOptions" optionLabel="label" optionValue="value"
                styleClass="w-full" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Tracking Number</label>
              <input pInputText class="w-full" readonly [value]="order()?.trackingNumber || ''" placeholder="Filled automatically after dispatch" />
              <p class="text-xs text-slate-600 mt-1 mb-0">Set automatically when the shipment is created.</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Notes</label>
              <textarea pTextarea formControlName="notes" rows="3" class="w-full" placeholder="Internal notes…"></textarea>
            </div>
            <p-button type="submit" label="Update Status" icon="pi pi-check" severity="success"
              [loading]="updating()" styleClass="w-full" />
          </form>
        </div>

        <!-- Cancel Order -->
        @if (canCancel()) {
          <div class="bg-white rounded-xl border border-red-100 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <i class="pi pi-times-circle text-red-500"></i>
              <h3 class="text-base font-bold text-slate-900 m-0">Cancel Order</h3>
            </div>
            <p class="text-sm text-slate-500 mb-4">This will cancel the order and may trigger a refund if already paid.</p>
            <div class="mb-3">
              <label class="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Cancellation Reason</label>
              <textarea pTextarea [(ngModel)]="cancelReason" rows="2" class="w-full" placeholder="Reason for cancellation…"></textarea>
            </div>
            <p-button label="Cancel Order" icon="pi pi-times" severity="danger" styleClass="w-full"
              [outlined]="true" (onClick)="confirmCancel()" [loading]="cancelling()" />
          </div>
        }

      </div>
    </div>
  }

  @if (!loading() && !order()) {
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-exclamation-circle text-slate-300 text-6xl mb-4"></i>
      <div class="text-lg font-bold text-slate-900 mb-2">Order not found</div>
      <a routerLink="/admin/orders" class="text-sm text-green-600 hover:underline">Back to orders</a>
    </div>
  }

</div>
  `,
  styles: [`
    :host ::ng-deep .p-select { width: 100%; }
    /* white text needs a darker green than the default success button */
    :host ::ng-deep .p-button.p-button-success { background: #15803D !important; border-color: #15803D !important; color: #fff !important; }
    :host ::ng-deep .p-button.p-button-success:hover { background: #166534 !important; border-color: #166534 !important; }
  `]
})
export class AdminOrderDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private orderSvc   = inject(OrderService);
  private toast      = inject(MessageService);
  private confirm    = inject(ConfirmationService);
  private fb         = inject(FormBuilder);

  loading   = signal(true);
  updating  = signal(false);
  cancelling = signal(false);
  order     = signal<OrderDetail | null>(null);
  cancelReason = '';

  canCancel = computed(() => {
    const s = this.order()?.status;
    return s === OrderStatus.Pending || s === OrderStatus.Confirmed;
  });

  statusForm = this.fb.group({
    status: [null as number | null, Validators.required],
    trackingNumber: [''],
    notes: ['']
  });

  orderStatusOptions = [
    { label: 'Pending',   value: 1 },
    { label: 'Confirmed', value: 2 },
    { label: 'Shipped',   value: 3 },
    { label: 'Delivered', value: 4 },
    { label: 'Cancelled', value: 5 },
    { label: 'Returned',  value: 6 },
  ];

  private get orderId(): string { return this.route.snapshot.paramMap.get('id')!; }

  readonly orderItemHasOffer = orderItemHasOffer;
  readonly orderItemSellingUnit = orderItemSellingUnit;

  /** Reloads the order (and the Update Status form) after the shipment card changed something. */
  reloadOrder(): void {
    this.orderSvc.getById(this.orderId).subscribe({
      next: res => {
        const d = res.data as OrderDetail | null;
        if (!d) return;
        this.order.set(d);
        this.statusForm.patchValue({ status: d.status, trackingNumber: d.trackingNumber ?? '', notes: d.notes ?? '' });
      }
    });
  }

  ngOnInit(): void {
    this.orderSvc.getById(this.orderId).subscribe({
      next: res => {
        const d = res.data as OrderDetail | null;
        this.order.set(d);
        if (d) {
          this.statusForm.patchValue({
            status: d.status,
            trackingNumber: d.trackingNumber ?? '',
            notes: d.notes ?? ''
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  updateStatus(): void {
    if (this.statusForm.invalid) return;
    this.updating.set(true);
    this.orderSvc.updateStatus(this.orderId, (({ trackingNumber, ...rest }) => rest)(this.statusForm.getRawValue()) as any).subscribe({
      next: res => {
        this.order.set((res.data as OrderDetail | null) ?? this.order());
        this.toast.add({ severity: 'success', summary: 'Updated', detail: 'Order status updated', life: 2500 });
        this.updating.set(false);
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to update status', life: 4000 });
        this.updating.set(false);
      }
    });
  }

  confirmCancel(): void {
    this.confirm.confirm({
      header: 'Cancel Order',
      message: 'Are you sure you want to cancel this order? This action cannot be undone.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Cancel Order', severity: 'danger' },
      rejectButtonProps: { label: 'No, Keep Order', severity: 'secondary', outlined: true },
      accept: () => this.cancelOrder()
    });
  }

  private cancelOrder(): void {
    this.cancelling.set(true);
    this.orderSvc.cancel(this.orderId, this.cancelReason).subscribe({
      next: res => {
        this.order.set((res.data as OrderDetail | null) ?? this.order());
        this.toast.add({ severity: 'success', summary: 'Cancelled', detail: 'Order has been cancelled', life: 2500 });
        this.cancelling.set(false);
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to cancel order', life: 4000 });
        this.cancelling.set(false);
      }
    });
  }

  orderStatusLabel(s: OrderStatus): string {
    return ({ 1:'Pending', 2:'Confirmed', 3:'Shipped', 4:'Delivered', 5:'Cancelled', 6:'Returned' } as any)[s] ?? 'Unknown';
  }

  orderStatusSeverity(s: OrderStatus): 'warn' | 'info' | 'success' | 'danger' | 'secondary' {
    return ({ 1:'warn', 2:'info', 3:'info', 4:'success', 5:'danger', 6:'secondary' } as any)[s] ?? 'secondary';
  }

  paymentStatusLabel(s: PaymentStatus): string {
    return ({ 1:'Pending', 2:'Paid', 3:'Failed', 4:'Refunded' } as any)[s] ?? 'Unknown';
  }

  paymentStatusSeverity(s: PaymentStatus): 'warn' | 'success' | 'danger' | 'info' {
    return ({ 1:'warn', 2:'success', 3:'danger', 4:'info' } as any)[s] ?? 'warn';
  }
}
