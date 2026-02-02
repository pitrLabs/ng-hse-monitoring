import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginResponse, UserUpdate } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'hse_access_token';

  // Event emitter for logout - other services can subscribe to this
  private logoutSubject = new Subject<void>();
  readonly onLogout$ = this.logoutSubject.asObservable();

  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);
  private isInitialized = signal(false);

  // Cache the initialization promise to prevent duplicate fetches
  private initPromise: Promise<void> | null = null;

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getToken());

  // Role-based access: superadmin, manager, operator, p3
  // Users without roles are treated as having minimum access (same as p3)
  readonly primaryRole = computed(() => {
    const user = this.currentUserSignal();
    if (!user) return null;
    if (user.is_superuser) return 'superadmin';
    // Return the first role name, or 'p3' as default for users without roles
    return user.roles.length > 0 ? user.roles[0].name : 'p3';
  });

  readonly isSuperadmin = computed(() => this.currentUserSignal()?.is_superuser === true);
  readonly isManager = computed(() => this.primaryRole() === 'manager' || this.isSuperadmin());
  readonly isOperator = computed(() => this.primaryRole() === 'operator' || this.isManager());
  // P3 is the minimum access level - any authenticated user should have at least this level
  readonly isP3 = computed(() => {
    const user = this.currentUserSignal();
    if (!user) return false;
    // All authenticated users have at least P3 access
    return true;
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Initialize auth state. Called by APP_INITIALIZER before app starts.
   * This ensures user data is loaded before any routing happens.
   */
  initAuth(): Promise<void> {
    // Return cached promise if already initializing/initialized
    if (this.initPromise) {
      return this.initPromise;
    }

    const token = this.getToken();
    if (!token) {
      this.isInitialized.set(true);
      return Promise.resolve();
    }

    this.initPromise = firstValueFrom(this.fetchCurrentUser())
      .then(() => {
        this.isInitialized.set(true);
      })
      .catch(() => {
        // Token invalid, clear it
        this.removeToken();
        this.isInitialized.set(true);
      });

    return this.initPromise;
  }

  /**
   * Ensure user data is loaded. Used by guards.
   * Returns the user if authenticated, null otherwise.
   */
  async ensureUserLoaded(): Promise<User | null> {
    // Wait for initialization if not done
    if (!this.isInitialized()) {
      await this.initAuth();
    }
    return this.currentUserSignal();
  }

  /**
   * Login and fetch user data.
   * Returns Observable that completes only after user data is loaded.
   */
  login(username: string, password: string): Observable<User> {
    this.isLoadingSignal.set(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return new Observable<User>(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, formData).subscribe({
        next: async (response) => {
          this.setToken(response.access_token);
          // Reset init state for fresh login
          this.initPromise = null;
          this.isInitialized.set(false);

          try {
            // Wait for user data to be loaded
            const user = await firstValueFrom(this.fetchCurrentUser());
            this.isInitialized.set(true);
            observer.next(user);
            observer.complete();
          } catch (error) {
            this.isLoadingSignal.set(false);
            observer.error(error);
          }
        },
        error: (error) => {
          this.isLoadingSignal.set(false);
          observer.error(error);
        }
      });
    });
  }

  fetchCurrentUser(): Observable<User> {
    this.isLoadingSignal.set(true);
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  updateProfile(data: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/auth/me`, data).pipe(
      tap(user => this.currentUserSignal.set(user))
    );
  }

  logout(): void {
    // Emit logout event so other services can cleanup (e.g., disconnect WebSocket)
    this.logoutSubject.next();

    // Clear all auth state
    this.removeToken();
    this.currentUserSignal.set(null);
    this.initPromise = null;
    this.isInitialized.set(false);

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  hasPermission(resource: string, action: string): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    if (user.is_superuser) return true;

    return user.roles.some(role =>
      role.permissions.some(p => p.resource === resource && p.action === action)
    );
  }
}
