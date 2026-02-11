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

        if (!isPublicEndpoint && token) {
          const errorDetail = error.error?.detail;

          if (errorDetail === 'session_invalid_another_device') {
            // Session invalidated - user logged in from another device
            authService.forceLogout('Sesi Anda telah berakhir karena login dari perangkat lain.');
          } else if (errorDetail === 'session_invalid_force_logout') {
            // Session invalidated - force logged out by admin
            authService.forceLogout('Sesi Anda telah diakhiri oleh admin.');
          } else if (req.url.includes('/auth/me')) {
            // Token expired or invalid
            authService.logout();
          }
        }
      }
      return throwError(() => error);
    })
  );
};
