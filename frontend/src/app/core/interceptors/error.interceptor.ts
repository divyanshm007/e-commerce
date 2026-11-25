import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// These endpoints answer 401 for "wrong credentials" — that must not sign anyone out.
const CREDENTIAL_ENDPOINTS = /\/auth\/(login|register|forgot-password|verify-reset-otp|reset-password)/;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const inAdmin = auth.inAdminArea();

      // An expired/invalid session only ends the session of the area the request came from.
      if (err.status === 401 && req.headers.has('Authorization') && !CREDENTIAL_ENDPOINTS.test(req.url)) {
        if (inAdmin) auth.adminLogout();
        else auth.logout();
      }
      if (err.status === 403 && !inAdmin) {
        router.navigate(['/']);
      }
      return throwError(() => err);
    })
  );
};
