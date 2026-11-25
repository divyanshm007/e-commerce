import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(private api: ApiService) {}

  getBanners(type?: string): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/banners', type ? { type } : {});
  }

  createBanner(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/banners', dto);
  }

  updateBanner(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`content/banners/${id}`, dto);
  }

  deleteBanner(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`content/banners/${id}`);
  }

  getPromotionHeaders(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/promotion-headers');
  }

  createPromotionHeader(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/promotion-headers', dto);
  }

  updatePromotionHeader(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`content/promotion-headers/${id}`, dto);
  }

  deletePromotionHeader(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`content/promotion-headers/${id}`);
  }

  getTestimonials(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/testimonials');
  }

  createTestimonial(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/testimonials', dto);
  }

  deleteTestimonial(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`content/testimonials/${id}`);
  }

  getFaqs(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/faqs');
  }

  createFaq(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/faqs', dto);
  }

  updateFaq(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`content/faqs/${id}`, dto);
  }

  deleteFaq(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`content/faqs/${id}`);
  }

  getPage(slug: string): Observable<any> {
    return this.api.get<any>(`content/pages/${slug}`);
  }

  upsertPage(slug: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`content/pages/${slug}`, dto);
  }

  subscribe(email: string): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/newsletter/subscribe', { email });
  }

  getSubscribers(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/newsletter/subscribers');
  }

  sendContact(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('content/contact', dto);
  }

  getMessages(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/contact/messages');
  }

  uploadFile(file: File, folder: string = 'general'): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile(`content/upload?folder=${folder}`, fd);
  }

  // ---- Trust Pages ----

  getTrustPage(slug: string): Observable<ApiResponse<any>> {
    return this.api.get<any>(`trust-pages/${slug}`);
  }

  getAllTrustPages(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('trust-pages');
  }

  updateTrustPage(slug: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`trust-pages/${slug}`, dto);
  }

  uploadTrustPageImage(slug: string, file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile(`trust-pages/${slug}/upload-image`, fd);
  }

  uploadTrustPageFile(slug: string, file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile(`trust-pages/${slug}/upload-file`, fd);
  }

  deleteTrustPageFile(slug: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`trust-pages/${slug}/file`);
  }

  uploadTrustPageSectionFile(slug: string, index: number, file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile(`trust-pages/${slug}/sections/${index}/upload-file`, fd);
  }

  // ---- Gallery ----

  getGalleryImages(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('gallery');
  }

  getGalleryImagesAdmin(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('gallery/admin');
  }

  createGalleryImage(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('gallery', dto);
  }

  updateGalleryImage(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`gallery/${id}`, dto);
  }

  deleteGalleryImage(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`gallery/${id}`);
  }

  uploadGalleryImage(file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile('gallery/upload-image', fd);
  }

  // ---- Testimonials (admin) ----

  getTestimonialsAdmin(): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('content/testimonials/admin');
  }

  updateTestimonial(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`content/testimonials/${id}`, dto);
  }

  uploadTestimonialAvatar(file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile('content/testimonials/upload-avatar', fd);
  }

  // ---- Blog ----

  getBlogPosts(category?: string): Observable<ApiResponse<any[]>> {
    return this.api.get<any[]>('blog', category ? { category } : {});
  }

  getBlogBySlug(slug: string): Observable<ApiResponse<any>> {
    return this.api.get<any>(`blog/slug/${slug}`);
  }

  createBlogPost(dto: any): Observable<ApiResponse<any>> {
    return this.api.post<any>('blog', dto);
  }

  updateBlogPost(id: string, dto: any): Observable<ApiResponse<any>> {
    return this.api.put<any>(`blog/${id}`, dto);
  }

  deleteBlogPost(id: string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`blog/${id}`);
  }

  uploadBlogCover(file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile('blog/upload-cover', fd);
  }
}
