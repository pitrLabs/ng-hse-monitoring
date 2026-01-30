import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginResponse, UserUpdate } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'hse_access_token';

  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getToken());

  // Role-based access: superadmin, manager, operator, p3
  readonly primaryRole = computed(() => {
    const user = this.currentUserSignal();
    if (!user) return null;
    if (user.is_superuser) return 'superadmin';
    // Return the first role name or null
    return user.roles.length > 0 ? user.roles[0].name : null;
  });

  readonly isSuperadmin = computed(() => this.currentUserSignal()?.is_superuser === true);
  readonly isManager = computed(() => this.primaryRole() === 'manager' || this.isSuperadmin());
  readonly isOperator = computed(() => this.primaryRole() === 'operator' || this.isManager());
  readonly isP3 = computed(() => this.primaryRole() === 'p3' || this.isOperator());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromToken();
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout()
      });
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, formData).pipe(
      tap(response => {
        this.setToken(response.access_token);
        this.fetchCurrentUser().subscribe();
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
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
    this.removeToken();
    this.currentUserSignal.set(null);
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
