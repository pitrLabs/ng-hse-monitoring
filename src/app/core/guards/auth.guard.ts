import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guards are simplified because APP_INITIALIZER ensures user data
 * is loaded before any routing happens.
 */

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

export const superuserGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isSuperadmin()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// Guard for pages accessible by P3 and above (all authenticated users)
export const p3Guard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // All authenticated users have P3 access
  return true;
};

// Guard for pages accessible by operator and above (operator, manager, superadmin)
export const operatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isOperator()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// Guard for pages accessible by manager and above (manager, superadmin)
export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isManager()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
