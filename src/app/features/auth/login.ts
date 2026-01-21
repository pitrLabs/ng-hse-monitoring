import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
      <!-- Animated background elements -->
      <div class="bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <div class="login-card glass-card-static animate-fade-in">
        <!-- Logo/Brand -->
        <div class="brand">
          <div class="logo">
            <mat-icon class="logo-icon">security</mat-icon>
          </div>
          <h1 class="brand-title">HSE Monitoring</h1>
          <p class="brand-subtitle">Health, Safety & Environment</p>
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
          <p>Powered by <span class="text-gradient">Object Detection AI</span></p>
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

    .bg-orbs {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.5;
      animation: float 20s ease-in-out infinite;
    }

    .orb-1 {
      width: 400px;
      height: 400px;
      background: var(--accent-primary);
      top: -100px;
      left: -100px;
      animation-delay: 0s;
    }

    .orb-2 {
      width: 300px;
      height: 300px;
      background: var(--accent-secondary);
      bottom: -50px;
      right: -50px;
      animation-delay: -5s;
    }

    .orb-3 {
      width: 200px;
      height: 200px;
      background: linear-gradient(var(--accent-primary), var(--accent-secondary));
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: -10s;
    }

    @keyframes float {
      0%, 100% {
        transform: translate(0, 0) scale(1);
      }
      25% {
        transform: translate(30px, -30px) scale(1.05);
      }
      50% {
        transform: translate(-20px, 20px) scale(0.95);
      }
      75% {
        transform: translate(20px, 10px) scale(1.02);
      }
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
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: var(--accent-gradient);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
    }

    .logo-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: white;
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
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Login failed. Please check your credentials.');
      }
    });
  }
}
