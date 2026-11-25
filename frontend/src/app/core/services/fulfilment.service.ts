import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResult } from '../models/api.models';

export interface FulfilmentDashboard {
  awaitingApproval: number;
  approvedAwaitingShipment: number;
  creationFailures: number;
  inTransit: number;
  delivered: number;
  exceptions: number;
  mode: string;
}

export interface FulfilmentRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  orderDate: string;
  fulfilmentState?: string | null;
  awb?: string | null;
  shipmentStatus?: string | null;
  creationState?: string | null;
  attentionReason?: string | null;
  lastError?: string | null;
  attempts: number;
  eligible: boolean;
  issues: string[];
}

export interface ShipmentEvent { status: string; category: string; location?: string | null; time?: string | null; }

/** Customers receive only the first group of fields; the rest are filled for administrators. */
export interface OrderShipment {
  hasShipment: boolean;
  courier?: string | null;
  awb?: string | null;
  status?: string | null;
  expectedDeliveryDate?: string | null;
  timeline: ShipmentEvent[];
  fulfilmentState?: string | null;
  creationState?: string | null;
  attentionReason?: string | null;
  lastError?: string | null;
  attempts?: number | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  mode?: string | null;
}

export type FulfilmentQueue = 'awaiting-approval' | 'awaiting-shipment' | 'creation-failures' | 'in-transit' | 'delivered' | 'exceptions';

@Injectable({ providedIn: 'root' })
export class FulfilmentService {
  constructor(private api: ApiService) {}

  dashboard(): Observable<ApiResponse<FulfilmentDashboard>> {
    return this.api.get<FulfilmentDashboard>('fulfilment/dashboard');
  }
  queue(kind: FulfilmentQueue, page = 1, pageSize = 20): Observable<ApiResponse<PagedResult<FulfilmentRow>>> {
    return this.api.get<PagedResult<FulfilmentRow>>(`fulfilment/queue/${kind}`, { page, pageSize });
  }
  approve(orderId: string): Observable<ApiResponse<string>> { return this.api.post<string>(`fulfilment/orders/${orderId}/approve`, {}); }
  reject(orderId: string, reason: string): Observable<ApiResponse<string>> { return this.api.post<string>(`fulfilment/orders/${orderId}/reject`, { reason }); }
  retry(orderId: string): Observable<ApiResponse<string>> { return this.api.post<string>(`fulfilment/orders/${orderId}/retry`, {}); }
  resolve(orderId: string, note?: string): Observable<ApiResponse<string>> { return this.api.post<string>(`fulfilment/orders/${orderId}/resolve`, { note }); }
  adminShipment(orderId: string): Observable<ApiResponse<OrderShipment>> { return this.api.get<OrderShipment>(`fulfilment/orders/${orderId}/shipment`); }
  myShipment(orderId: string): Observable<ApiResponse<OrderShipment>> { return this.api.get<OrderShipment>(`orders/${orderId}/shipment`); }
}
