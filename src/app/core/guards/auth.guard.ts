import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
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

  if (!authService.getToken()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.currentUser();
  if (user?.is_superuser) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// Guard for pages accessible by P3 and above (P3, operator, manager, superadmin)
export const p3Guard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    router.navigate(['/login']);
    return false;
  }

  // P3 and above can access
  if (authService.isP3()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// Guard for pages accessible by operator and above (operator, manager, superadmin)
export const operatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
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

  if (!authService.getToken()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isManager()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
