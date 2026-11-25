import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { CartService } from './cart.service';
import {
  AuthResponse, LoginDto, RegisterDto, ForgotPasswordDto, VerifyResetOtpDto,
  ResetPasswordDto, ChangePasswordDto, UpdateProfileDto, UserProfile, UserRole
} from '../models/auth.models';
import { ApiResponse } from '../models/api.models';

const CUSTOMER_TOKEN_KEY = 'ec_token';
const CUSTOMER_USER_KEY  = 'ec_user';
const ADMIN_TOKEN_KEY    = 'ec_admin_token';
const ADMIN_USER_KEY     = 'ec_admin_user';

export type LoginPortal = 'admin' | 'customer';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _customerToken = signal<string | null>(localStorage.getItem(CUSTOMER_TOKEN_KEY));
  private _adminToken    = signal<string | null>(localStorage.getItem(ADMIN_TOKEN_KEY));
  private _customerUser  = signal<UserProfile | null>(this.loadUser(CUSTOMER_USER_KEY));
  private _adminUser     = signal<UserProfile | null>(this.loadUser(ADMIN_USER_KEY));

  // Use customerUser in storefront; user() in admin context (admin takes priority)
  readonly customerUser = computed(() => this._customerUser());
  readonly user         = computed(() => this._adminUser() ?? this._customerUser());
  readonly isLoggedIn   = computed(() => !!this._customerToken());
  readonly isAdmin      = computed(() => !!this._adminToken() && this._adminUser()?.role === UserRole.SuperAdmin);
  readonly isCustomer   = computed(() => !!this._customerToken() && this._customerUser()?.role === UserRole.Customer);

  constructor(private api: ApiService, private router: Router, private cart: CartService) {}

  /** True while the browser is inside the admin panel. */
  inAdminArea(): boolean {
    return window.location.pathname.startsWith('/admin');
  }

  register(dto: RegisterDto): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('auth/register', dto).pipe(
      tap(res => { if (res.success && res.data) this.storeSession(res.data); })
    );
  }

  /**
   * Signs in. When a portal is given, the account type must match it — a customer can't
   * start an admin session and an admin can't start a storefront session. The mismatch is
   * rejected BEFORE anything is stored, so no stray token is left behind.
   */
  login(dto: LoginDto, portal?: LoginPortal): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('auth/login', dto).pipe(
      switchMap(res => {
        if (res.success && res.data) {
          const isAdminAccount = res.data.user.role === UserRole.SuperAdmin;
          if (portal === 'customer' && isAdminAccount)
            return throwError(() => ({ error: { message: 'Admin accounts must use the Admin Login portal.' } }));
          if (portal === 'admin' && !isAdminAccount)
            return throwError(() => ({ error: { message: 'Access denied. This login is for admin accounts only.' } }));
          this.storeSession(res.data);
        }
        return of(res);
      })
    );
  }

  /** Step 1: email a one-time code. The answer is the same whether or not the account exists. */
  forgotPassword(dto: ForgotPasswordDto): Observable<ApiResponse<string>> {
    return this.api.post<string>('auth/forgot-password', dto);
  }

  /** Step 2: exchange the emailed code for a single-use reset token (returned as data). */
  verifyResetOtp(dto: VerifyResetOtpDto): Observable<ApiResponse<string>> {
    return this.api.post<string>('auth/verify-reset-otp', dto);
  }

  /** Step 3: set the new password with the reset token. All existing sessions stop working. */
  resetPassword(dto: ResetPasswordDto): Observable<ApiResponse<string>> {
    return this.api.post<string>('auth/reset-password', dto);
  }

  changePassword(dto: ChangePasswordDto): Observable<ApiResponse<string>> {
    return this.api.post<string>('auth/change-password', dto);
  }

  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.api.get<UserProfile>('auth/profile').pipe(
      tap(res => { if (res.success && res.data) {
        if (res.data.role === UserRole.SuperAdmin) this._adminUser.set(res.data);
        else this._customerUser.set(res.data);
      }})
    );
  }

  updateProfile(dto: UpdateProfileDto): Observable<ApiResponse<UserProfile>> {
    return this.api.put<UserProfile>('auth/profile', dto).pipe(
      tap(res => { if (res.success && res.data) {
        if (res.data.role === UserRole.SuperAdmin) {
          this._adminUser.set(res.data);
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(res.data));
        } else {
          this._customerUser.set(res.data);
          localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(res.data));
        }
      }})
    );
  }

  /** Clears the customer session and navigates to the customer login page. */
  logout(): void {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_USER_KEY);
    this._customerToken.set(null);
    this._customerUser.set(null);
    // the in-memory cart belongs to the user who just left — never show it to the next visitor
    this.cart.clearLocal();
    this.router.navigate(['/auth/login']);
  }

  /** Clears the admin session and navigates to the admin login page. */
  adminLogout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    this._adminToken.set(null);
    this._adminUser.set(null);
    this.router.navigate(['/admin/login']);
  }

  /**
   * The token for the area the user is in: the admin panel sends the admin token, the storefront
   * sends the customer token. They are never mixed, so a shopper is never recorded as the admin.
   */
  getToken(): string | null {
    return this.inAdminArea() ? this._adminToken() : this._customerToken();
  }

  private storeSession(data: AuthResponse): void {
    if (data.user.role === UserRole.SuperAdmin) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
      this._adminToken.set(data.token);
      this._adminUser.set(data.user);
    } else {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, data.token);
      localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(data.user));
      this._customerToken.set(data.token);
      this._customerUser.set(data.user);
      this.syncCartAfterLogin();
    }
  }

  /** Drop whatever cart was in memory, fold the guest cart into the user's own, then load theirs. */
  private syncCartAfterLogin(): void {
    this.cart.clearLocal();
    this.cart.mergeCart().pipe(
      catchError(() => of(null)),
      switchMap(() => this.cart.loadCart())
    ).subscribe({ error: () => {} });
  }

  private loadUser(key: string): UserProfile | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
