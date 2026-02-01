import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Endpoints that should not trigger auto-logout on 401
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Check if this is a public endpoint - don't logout for these
        const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
          req.url.includes(endpoint)
        );

        // Only auto-logout if:
        // 1. Not a public endpoint
        // 2. User was previously authenticated (has token)
        // 3. The /auth/me endpoint fails (confirms token is invalid)
        if (!isPublicEndpoint && token && req.url.includes('/auth/me')) {
          authService.logout();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
