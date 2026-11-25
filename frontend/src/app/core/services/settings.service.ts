import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private api: ApiService) {}

  getWebsiteSettings(): Observable<ApiResponse<any>> {
    return this.api.get<any>('settings/website');
  }

  updateWebsiteSettings(dto: any): Observable<ApiResponse<string>> {
    return this.api.put<string>('settings/website', dto);
  }

  getShippingConfig(): Observable<ApiResponse<any>> {
    return this.api.get<any>('settings/shipping');
  }

  updateShippingConfig(dto: any): Observable<ApiResponse<string>> {
    return this.api.put<string>('settings/shipping', dto);
  }

  getTaxConfig(): Observable<ApiResponse<any>> {
    return this.api.get<any>('settings/tax');
  }

  updateTaxConfig(dto: any): Observable<ApiResponse<string>> {
    return this.api.put<string>('settings/tax', dto);
  }
}
