import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { TrackingService } from './core/services/tracking.service';

/**
 * Initialize authentication state before app starts.
 * This ensures user data is loaded before any routing happens.
 */
function initializeAuth(): () => Promise<void> {
  const authService = inject(AuthService);
  return () => authService.initAuth();
}

/**
 * Initialize page tracking service.
 * Tracks user navigation for audit logging.
 */
function initializeTracking(): () => void {
  const trackingService = inject(TrackingService);
  return () => trackingService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTracking,
      multi: true
    }
  ]
};
