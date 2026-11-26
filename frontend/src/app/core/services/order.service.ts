import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResult, PaginationParams } from '../models/api.models';
import { OrderReport, OrderList, OrderDetail, CreateOrderDto, UpdateOrderStatusDto, CustomerAddress } from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private api: ApiService) {}

  getAll(params: PaginationParams): Observable<ApiResponse<PagedResult<OrderList>>> {
    return this.api.get<PagedResult<OrderList>>('orders', params as any);
  }

  /** Sales totals for the Reports page: from / to are yyyy-MM-dd calendar days. */
  getReport(from?: string, to?: string): Observable<ApiResponse<OrderReport>> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.api.get<OrderReport>('orders/report', params);
  }

  getById(id: string): Observable<ApiResponse<OrderDetail>> {
    return this.api.get<OrderDetail>(`orders/${id}`);
  }

  getByOrderNumber(num: string): Observable<ApiResponse<OrderDetail>> {
    return this.api.get<OrderDetail>(`orders/number/${num}`);
  }

  getMyOrders(): Observable<ApiResponse<OrderList[]>> {
    return this.api.get<OrderList[]>('orders/my-orders');
  }

  create(dto: CreateOrderDto): Observable<ApiResponse<OrderDetail>> {
    return this.api.post<OrderDetail>('orders', dto);
  }

  updateStatus(id: string, dto: UpdateOrderStatusDto): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`orders/${id}/status`, dto);
  }

  cancel(id: string, reason?: string): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`orders/${id}/cancel`, { reason });
  }

  downloadInvoice(id: string): Observable<Blob> {
    return this.api['http'].get(`${this.api['base']}/orders/${id}/invoice`, {
      responseType: 'blob'
    });
  }

  getStats(): Observable<ApiResponse<any>> {
    return this.api.get<any>('orders/stats');
  }

  // Customer addresses
  getAddresses(): Observable<ApiResponse<CustomerAddress[]>> {
    return this.api.get<CustomerAddress[]>('customers/addresses');
  }

  addAddress(dto: any): Observable<ApiResponse<CustomerAddress>> {
    return this.api.post<CustomerAddress>('customers/addresses', dto);
  }

  deleteAddress(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`customers/addresses/${id}`);
  }
}
