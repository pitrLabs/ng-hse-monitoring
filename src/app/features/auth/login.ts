import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <!-- Background image -->
      <div class="bg-image"></div>
      <div class="bg-overlay"></div>

      <div class="login-card glass-card-static animate-fade-in">
        <!-- Logo/Brand -->
        <div class="brand">
          <div class="logo">
            <img src="/Picture2.png" alt="Logo" class="logo-img">
          </div>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-field">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="username" placeholder="Enter your username" autocomplete="username">
              @if (loginForm.get('username')?.hasError('required') && loginForm.get('username')?.touched) {
                <mat-error>Username is required</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="form-field">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" placeholder="Enter your password" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>
          </div>

          @if (infoMessage()) {
            <div class="info-message animate-fade-in">
              <mat-icon>info</mat-icon>
              <span>{{ infoMessage() }}</span>
            </div>
          }

          @if (errorMessage()) {
            <div class="error-message animate-fade-in">
              <mat-icon>error</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <button type="submit" class="btn-gradient login-btn" [disabled]="isLoading() || loginForm.invalid">
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
              <span>Signing in...</span>
            } @else {
              <span>Sign In</span>
              <mat-icon>arrow_forward</mat-icon>
            }
          </button>
        </form>

        <!-- Footer -->
        <div class="login-footer">
          <p>Operated by <span class="text-gradient">PLN UP2D JATENG & DIY</span></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .bg-image {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('/240_F_404622143_vlgoOVBtqVkKQ50utCnv411gV2o27AMs.jpg') center/cover no-repeat;
      z-index: 0;
    }

    .bg-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(10, 14, 23, 0.92) 0%,
        rgba(10, 14, 23, 0.85) 50%,
        rgba(10, 14, 23, 0.92) 100%
      );
      z-index: 1;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 48px 40px;
      position: relative;
      z-index: 1;
    }

    .brand {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo {
      width: 200px;
      margin: 0 auto 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-img {
      width: 100%;
      height: auto;
      object-fit: contain;
    }

    .brand-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .brand-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-field {
      margin-bottom: 8px;
    }

    .full-width {
      width: 100%;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--radius-sm);
      color: #3b82f6;
      font-size: 14px;
      margin-bottom: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      color: var(--error);
      font-size: 14px;
      margin-bottom: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .login-btn {
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 16px;

      mat-spinner {
        ::ng-deep circle {
          stroke: white !important;
        }
      }

      mat-icon {
        transition: transform 0.3s ease;
      }

      &:hover:not(:disabled) mat-icon {
        transform: translateX(4px);
      }
    }

    .login-footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--glass-border);

      p {
        font-size: 13px;
        color: var(--text-tertiary);
        margin: 0;
      }
    }

    ::ng-deep {
      .mat-mdc-form-field-icon-prefix {
        padding: 0 8px 0 0 !important;
        color: var(--text-secondary);
      }

      .mat-mdc-form-field-icon-suffix {
        padding: 0 0 0 8px !important;
      }

      .mdc-notched-outline__leading,
      .mdc-notched-outline__notch,
      .mdc-notched-outline__trailing {
        border-color: var(--glass-border) !important;
      }

      .mat-mdc-form-field:hover .mdc-notched-outline__leading,
      .mat-mdc-form-field:hover .mdc-notched-outline__notch,
      .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
        border-color: var(--glass-border-hover) !important;
      }

      .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
      .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
      .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
        border-color: var(--accent-primary) !important;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check for message from query params (e.g., session invalidation)
    this.route.queryParams.subscribe(params => {
      if (params['message']) {
        this.infoMessage.set(params['message']);
        // Clear the query param from URL without navigation
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Login failed. Please check your credentials.');
      }
    });
  }
}
