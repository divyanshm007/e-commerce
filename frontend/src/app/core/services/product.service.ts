import { Injectable, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResult } from '../models/api.models';
import { ProductList, ProductDetail, ProductFilter, Category, Review, CreateProductDto } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private _compareCount = signal(JSON.parse(localStorage.getItem('compare_list') ?? '[]').length);
  readonly compareCount = computed(() => this._compareCount());

  constructor(private api: ApiService) {}

  getAll(filter: ProductFilter): Observable<ApiResponse<PagedResult<ProductList>>> {
    return this.api.get<PagedResult<ProductList>>('products', filter as any);
  }

  getById(id: string): Observable<ApiResponse<ProductDetail>> {
    return this.api.get<ProductDetail>(`products/${id}`);
  }

  getBySlug(slug: string): Observable<ApiResponse<ProductDetail>> {
    return this.api.get<ProductDetail>(`products/slug/${slug}`);
  }

  getFeatured(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('products/featured');
  }

  getNewArrivals(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('products/new-arrivals');
  }

  getBestSellers(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('products/best-sellers');
  }

  getSpecialOffers(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('products/special-offers');
  }

  getRelated(id: string): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>(`products/${id}/related`);
  }

  getLowStock(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('products/low-stock');
  }

  create(dto: CreateProductDto): Observable<ApiResponse<ProductDetail>> {
    return this.api.post<ProductDetail>('products', dto);
  }

  update(id: string, dto: any): Observable<ApiResponse<ProductDetail>> {
    return this.api.put<ProductDetail>(`products/${id}`, dto);
  }

  delete(id: string): Observable<ApiResponse<string>> {
    return this.api.delete<string>(`products/${id}`);
  }

  toggleStatus(id: string): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`products/${id}/toggle-status`);
  }

  updateStock(id: string, quantity: number): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`products/${id}/stock`, { quantity });
  }

  uploadImages(id: string, files: File[]): Observable<any> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return this.api.uploadFile(`products/${id}/images`, fd);
  }

  // Wishlist
  getWishlist(): Observable<ApiResponse<ProductList[]>> {
    return this.api.get<ProductList[]>('wishlist');
  }

  addToWishlist(productId: string): Observable<ApiResponse<string>> {
    return this.api.post<string>('wishlist', { productId });
  }

  removeFromWishlist(productId: string): Observable<ApiResponse<string>> {
    return this.api.delete<string>(`wishlist/${productId}`);
  }

  checkWishlist(productId: string): Observable<ApiResponse<boolean>> {
    return this.api.get<boolean>(`wishlist/check/${productId}`);
  }

  // Recently Viewed (localStorage)
  addToRecentlyViewed(product: ProductList): void {
    const key = 'recently_viewed';
    const stored: ProductList[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const filtered = stored.filter(p => p.id !== product.id);
    filtered.unshift(product);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
  }

  getRecentlyViewed(): ProductList[] {
    return JSON.parse(localStorage.getItem('recently_viewed') ?? '[]');
  }

  // Compare (localStorage)
  getCompareList(): ProductList[] {
    return JSON.parse(localStorage.getItem('compare_list') ?? '[]');
  }

  addToCompare(product: ProductList): boolean {
    const list = this.getCompareList();
    if (list.length >= 3) return false;
    if (list.some(p => p.id === product.id)) return true;
    list.push(product);
    localStorage.setItem('compare_list', JSON.stringify(list));
    this._compareCount.set(list.length);
    return true;
  }

  removeFromCompare(productId: string): void {
    const list = this.getCompareList().filter(p => p.id !== productId);
    localStorage.setItem('compare_list', JSON.stringify(list));
    this._compareCount.set(list.length);
  }

  clearCompare(): void {
    localStorage.removeItem('compare_list');
    this._compareCount.set(0);
  }

  // Categories
  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.api.get<Category[]>('categories');
  }

  getRootCategories(): Observable<ApiResponse<Category[]>> {
    return this.api.get<Category[]>('categories/root');
  }

  getCategoryBySlug(slug: string): Observable<ApiResponse<Category>> {
    return this.api.get<Category>(`categories/slug/${slug}`);
  }

  getCategoryProducts(id: string, filter: ProductFilter): Observable<ApiResponse<PagedResult<ProductList>>> {
    return this.api.get<PagedResult<ProductList>>(`categories/${id}/products`, filter as any);
  }

  createCategory(dto: any): Observable<ApiResponse<Category>> {
    return this.api.post<Category>('categories', dto);
  }

  updateCategory(id: string, dto: any): Observable<ApiResponse<Category>> {
    return this.api.put<Category>(`categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<ApiResponse<string>> {
    return this.api.delete<string>(`categories/${id}`);
  }

  toggleCategoryStatus(id: string): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`categories/${id}/toggle-status`);
  }

  uploadCategoryImage(file: File): Observable<ApiResponse<any>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.uploadFile('categories/upload-image', fd);
  }

  // Reviews
  getReviewsByProduct(productId: string): Observable<ApiResponse<Review[]>> {
    return this.api.get<Review[]>(`reviews/product/${productId}`);
  }

  getAllReviews(params: any): Observable<ApiResponse<PagedResult<Review>>> {
    return this.api.get<PagedResult<Review>>('reviews', params);
  }

  createReview(dto: any): Observable<ApiResponse<Review>> {
    return this.api.post<Review>('reviews', dto);
  }

  approveReview(id: string): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`reviews/${id}/approve`);
  }

  rejectReview(id: string): Observable<ApiResponse<string>> {
    return this.api.patch<string>(`reviews/${id}/reject`);
  }

  deleteReview(id: string): Observable<ApiResponse<string>> {
    return this.api.delete<string>(`reviews/${id}`);
  }
}
