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
 * After auth completes, initialize tracking service.
 */
function initializeAuth(): () => Promise<void> {
  const authService = inject(AuthService);
  const trackingService = inject(TrackingService);

  return async () => {
    // Wait for auth to complete first
    await authService.initAuth();

    // Then initialize tracking (only if user is authenticated)
    if (authService.currentUser()) {
      trackingService.initialize();
    }
  };
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
    }
  ]
};
