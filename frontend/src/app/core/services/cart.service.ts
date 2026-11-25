import { Injectable, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';
import { Cart, AddCartItemDto, CouponValidation } from '../models/cart.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _cart = signal<Cart | null>(null);

  readonly cart = this._cart.asReadonly();
  readonly itemCount = computed(() => {
    const c = this._cart();
    return c ? (c.itemCount || c.items?.length || 0) : 0;
  });
  readonly totalAmount = computed(() => this._cart()?.totalAmount ?? 0);

  constructor(private api: ApiService) {}

  loadCart(): Observable<ApiResponse<Cart>> {
    return this.api.get<Cart>('cart').pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  addItem(dto: AddCartItemDto): Observable<ApiResponse<Cart>> {
    return this.api.post<Cart>('cart/items', dto).pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  updateItem(cartItemId: string, quantity: number): Observable<ApiResponse<Cart>> {
    return this.api.put<Cart>(`cart/items/${cartItemId}`, { quantity }).pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  removeItem(cartItemId: string): Observable<ApiResponse<Cart>> {
    return this.api.delete<Cart>(`cart/items/${cartItemId}`).pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  clearCart(): Observable<ApiResponse<Cart>> {
    return this.api.delete<Cart>('cart').pipe(
      tap(res => { if (res.success) this._cart.set(null); })
    );
  }

  applyCoupon(code: string): Observable<ApiResponse<Cart>> {
    return this.api.post<Cart>('cart/coupon', { code }).pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  removeCoupon(): Observable<ApiResponse<Cart>> {
    return this.api.delete<Cart>('cart/coupon').pipe(
      tap(res => { if (res.success && res.data) this._cart.set(res.data); })
    );
  }

  mergeCart(): Observable<any> {
    return this.api.post<any>('cart/merge', {});
  }

  validateCoupon(code: string, orderAmount: number): Observable<ApiResponse<CouponValidation>> {
    return this.api.post<CouponValidation>('coupons/validate', { code, orderAmount });
  }

  clearLocal(): void {
    this._cart.set(null);
  }
}
