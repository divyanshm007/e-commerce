import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResult, PaginationParams } from '../models/api.models';
import { environment } from '../../../environments/environment';

declare var Razorpay: any;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private api: ApiService) {}

  createRazorpayOrder(orderId: string): Observable<ApiResponse<any>> {
    return this.api.post<any>(`payments/razorpay/create-order/${orderId}`, {});
  }

  /** The payment window was closed or failed: the unpaid online order is cancelled on the server. */
  abandonPayment(orderId: string): Observable<ApiResponse<string>> {
    return this.api.post<string>(`payments/razorpay/abandon/${orderId}`, {});
  }

  verifyPayment(dto: any): Observable<ApiResponse<string>> {
    return this.api.post<string>('payments/razorpay/verify', dto);
  }

  getAll(params: PaginationParams): Observable<ApiResponse<PagedResult<any>>> {
    return this.api.get<PagedResult<any>>('payments', params as any);
  }

  getByOrder(orderId: string): Observable<ApiResponse<any>> {
    return this.api.get<any>(`payments/order/${orderId}`);
  }

  initiateRefund(orderId: string, amount?: number): Observable<ApiResponse<string>> {
    return this.api.post<string>(`payments/${orderId}/refund`, { amount });
  }

  openRazorpayCheckout(razorpayData: any, handlers: {
    onSuccess: (response: any) => void;
    onDismiss?: () => void;
  }): void {
    const options = {
      // key follows the test/live switch in the admin panel; the environment key is only a fallback
      key: razorpayData.key || environment.razorpayKeyId,
      amount: razorpayData.amount * 100,
      currency: 'INR',
      name: 'EcommerceApp',
      description: `Order #${razorpayData.orderId}`,
      order_id: razorpayData.razorpayOrderId,
      handler: handlers.onSuccess,
      prefill: {},
      theme: { color: '#1976d2' },
      modal: { ondismiss: handlers.onDismiss }
    };
    const rzp = new Razorpay(options);
    rzp.open();
  }
}
