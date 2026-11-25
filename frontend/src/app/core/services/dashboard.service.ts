import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getStats(): Observable<ApiResponse<any>> {
    return this.api.get<any>('dashboard/stats');
  }

  getSalesChart(period: 'weekly' | 'monthly' = 'weekly'): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('dashboard/sales-chart', { period });
  }

  getRecentOrders(count: number = 10): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('dashboard/recent-orders', { count });
  }

  getBestSellers(count: number = 10): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('dashboard/best-sellers', { count });
  }

  getLowStock(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('dashboard/low-stock');
  }

  getVisitorStats(): Observable<ApiResponse<any>> {
    return this.api.get<any>('dashboard/visitor-stats');
  }
}
