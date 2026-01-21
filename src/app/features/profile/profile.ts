import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <div class="profile-page">
      <div class="profile-grid">
        <!-- Profile Card -->
        <div class="profile-card glass-card-static animate-fade-in">
          <div class="profile-header">
            <div class="profile-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <div class="profile-info">
              <h2 class="profile-name">{{ currentUser()?.full_name || currentUser()?.username }}</h2>
              <p class="profile-username">&#64;{{ currentUser()?.username }}</p>
              <div class="profile-badges">
                @if (currentUser()?.is_superuser) {
                  <span class="badge badge-info">Superuser</span>
                }
                <span class="badge" [class.badge-success]="currentUser()?.is_active" [class.badge-error]="!currentUser()?.is_active">
                  {{ currentUser()?.is_active ? 'Active' : 'Inactive' }}
                </span>
                <span class="level-badge">Level {{ currentUser()?.user_level }}</span>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="profile-details">
            <div class="detail-item">
              <mat-icon>email</mat-icon>
              <div class="detail-content">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ currentUser()?.email }}</span>
              </div>
            </div>
            <div class="detail-item">
              <mat-icon>calendar_today</mat-icon>
              <div class="detail-content">
                <span class="detail-label">Member Since</span>
                <span class="detail-value">{{ currentUser()?.created_at | date:'mediumDate' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <mat-icon>update</mat-icon>
              <div class="detail-content">
                <span class="detail-label">Last Updated</span>
                <span class="detail-value">{{ currentUser()?.updated_at | date:'medium' }}</span>
              </div>
            </div>
          </div>

          @if (currentUser()?.roles?.length) {
            <mat-divider></mat-divider>
            <div class="profile-roles">
              <h4 class="roles-title">
                <mat-icon>admin_panel_settings</mat-icon>
                Assigned Roles
              </h4>
              <div class="roles-list">
                @for (role of currentUser()?.roles; track role.id) {
                  <mat-chip class="role-chip">{{ role.name }}</mat-chip>
                }
              </div>
            </div>
          }
        </div>

        <!-- Settings Form -->
        <div class="settings-card glass-card-static animate-fade-in" style="animation-delay: 0.1s">
          <h3 class="card-title">
            <mat-icon>settings</mat-icon>
            Account Settings
          </h3>

          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()" class="settings-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="full_name" placeholder="Enter your full name">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" placeholder="Enter your email">
              @if (profileForm.get('email')?.hasError('email')) {
                <mat-error>Please enter a valid email</mat-error>
              }
            </mat-form-field>

            <button type="submit" class="btn-gradient" [disabled]="profileForm.invalid || isUpdatingProfile()">
              @if (isUpdatingProfile()) {
                <mat-spinner diameter="20"></mat-spinner>
              }
              <span>Update Profile</span>
            </button>
          </form>

          <mat-divider></mat-divider>

          <h3 class="card-title">
            <mat-icon>lock</mat-icon>
            Change Password
          </h3>

          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="settings-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" placeholder="Enter new password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (passwordForm.get('password')?.hasError('minlength')) {
                <mat-error>Password must be at least 6 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="hideConfirmPassword() ? 'password' : 'text'" formControlName="confirmPassword" placeholder="Confirm new password">
              <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword.set(!hideConfirmPassword())">
                <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (passwordForm.hasError('mismatch')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button type="submit" class="btn-gradient" [disabled]="passwordForm.invalid || isChangingPassword()">
              @if (isChangingPassword()) {
                <mat-spinner diameter="20"></mat-spinner>
              }
              <span>Change Password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 1200px;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 24px;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .profile-card {
      padding: 0;
      height: fit-content;
    }

    .profile-header {
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
    }

    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 24px;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: white;
      }
    }

    .profile-name {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .profile-username {
      font-size: 14px;
      color: var(--text-tertiary);
      margin: 4px 0 12px;
    }

    .profile-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .level-badge {
      display: inline-flex;
      padding: 4px 10px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 20px;
      font-size: 12px;
      color: var(--accent-primary);
      font-weight: 500;
    }

    .profile-details {
      padding: 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 16px;

      mat-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--glass-bg);
        border-radius: 10px;
        color: var(--accent-primary);
      }
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 12px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 14px;
      color: var(--text-primary);
    }

    .profile-roles {
      padding: 24px 32px;
    }

    .roles-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      margin: 0 0 12px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .roles-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .role-chip {
      height: 28px !important;
      font-size: 12px !important;
      background: var(--glass-bg) !important;
      border: 1px solid var(--glass-border) !important;
    }

    .settings-card {
      padding: 32px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 24px;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: var(--accent-primary);
      }
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    mat-divider {
      margin: 8px 0 32px;
      border-color: var(--glass-border);
    }

    .full-width {
      width: 100%;
    }

    .btn-gradient {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    ::ng-deep {
      .mat-mdc-form-field-icon-prefix {
        padding: 0 8px 0 0 !important;
        color: var(--text-secondary);
      }

      .mat-mdc-form-field-icon-suffix {
        padding: 0 0 0 8px !important;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  currentUser = this.authService.currentUser;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isUpdatingProfile = signal(false);
  isChangingPassword = signal(false);

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    const user = this.currentUser();
    this.profileForm = this.fb.group({
      full_name: [user?.full_name || ''],
      email: [user?.email || '', Validators.email]
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isUpdatingProfile.set(true);
    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
        this.isUpdatingProfile.set(false);
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Failed to update profile', 'Close', { duration: 3000 });
        this.isUpdatingProfile.set(false);
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword.set(true);
    this.authService.updateProfile({ password: this.passwordForm.value.password }).subscribe({
      next: () => {
        this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
        this.passwordForm.reset();
        this.isChangingPassword.set(false);
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Failed to change password', 'Close', { duration: 3000 });
        this.isChangingPassword.set(false);
      }
    });
  }
}
