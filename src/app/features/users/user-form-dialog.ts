import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { User, Role } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>{{ isEditMode ? 'Edit User' : 'Add New User' }}</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" placeholder="Enter username">
          @if (form.get('username')?.hasError('required')) {
            <mat-error>Username is required</mat-error>
          }
          @if (form.get('username')?.hasError('minlength')) {
            <mat-error>Username must be at least 3 characters</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" placeholder="Enter email">
          @if (form.get('email')?.hasError('required')) {
            <mat-error>Email is required</mat-error>
          }
          @if (form.get('email')?.hasError('email')) {
            <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="full_name" placeholder="Enter full name">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password {{ isEditMode ? '(leave empty to keep current)' : '' }}</mat-label>
          <input matInput formControlName="password" type="password" placeholder="Enter password">
          @if (form.get('password')?.hasError('minlength')) {
            <mat-error>Password must be at least 6 characters</mat-error>
          }
        </mat-form-field>

        <div class="checkbox-field">
          <mat-checkbox formControlName="is_superadmin">Super Admin</mat-checkbox>
          <span class="checkbox-hint">Super Admin has full access to all features</span>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role_id">
            @for (role of filteredRoles(); track role.id) {
              <mat-option [value]="role.id">{{ role.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="dialog-actions">
          <button type="button" class="btn-glass" (click)="close()">Cancel</button>
          <button type="submit" class="btn-gradient" [disabled]="form.invalid || isSubmitting()">
            @if (isSubmitting()) {
              <mat-spinner diameter="20"></mat-spinner>
            }
            <span>{{ isEditMode ? 'Update' : 'Create' }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--glass-border);

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      button {
        color: var(--text-secondary);
      }
    }

    .dialog-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .checkbox-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;

      .checkbox-hint {
        font-size: 12px;
        color: var(--text-secondary);
        margin-left: 32px;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;

      button {
        min-width: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    }

    ::ng-deep .glass-dialog .mat-mdc-dialog-container {
      background: transparent !important;
      padding: 0 !important;
    }
  `]
})
export class UserFormDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  private data = inject(MAT_DIALOG_DATA) as { user?: User };
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  roles = signal<Role[]>([]);
  isSubmitting = signal(false);

  // Filter out Super Admin from the role list
  filteredRoles = computed(() =>
    this.roles().filter(role => {
      const name = role.name.toLowerCase().replace(/[\s_-]/g, '');
      return name !== 'superadmin';
    })
  );

  get isEditMode(): boolean {
    return !!this.data?.user;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadRoles();
    this.setupSuperAdminToggle();
  }

  private setupSuperAdminToggle(): void {
    // Watch for changes to is_superadmin checkbox
    this.form.get('is_superadmin')?.valueChanges.subscribe(isSuperAdmin => {
      const roleControl = this.form.get('role_id');
      if (isSuperAdmin) {
        roleControl?.disable();
        roleControl?.setValue(null);
      } else {
        roleControl?.enable();
      }
    });

    // Apply initial state
    if (this.form.get('is_superadmin')?.value) {
      this.form.get('role_id')?.disable();
    }
  }

  private initForm(): void {
    const user = this.data?.user;

    // Check if user is superadmin (has superadmin role, is_superadmin flag, or is_superuser flag)
    const isSuperAdmin = user?.is_superadmin || user?.is_superuser ||
      user?.roles?.some(r => r.name.toLowerCase() === 'superadmin' || r.name.toLowerCase() === 'super admin');

    // Get the first non-superadmin role id
    const roleId = user?.roles?.find(r =>
      r.name.toLowerCase() !== 'superadmin' && r.name.toLowerCase() !== 'super admin'
    )?.id || null;

    this.form = this.fb.group({
      username: [user?.username || '', [Validators.required, Validators.minLength(3)]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      full_name: [user?.full_name || ''],
      password: ['', this.isEditMode ? [Validators.minLength(6)] : [Validators.required, Validators.minLength(6)]],
      is_superadmin: [isSuperAdmin || false],
      role_id: [roleId]
    });

    if (this.isEditMode) {
      this.form.get('username')?.disable();
    }
  }

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const formData = this.form.getRawValue();

    if (this.isEditMode && !formData.password) {
      delete formData.password;
    }
    delete formData.username;

    // Convert role_id to role_ids array for the API
    const roleIds: string[] = [];

    // Add superadmin role if checked
    if (formData.is_superadmin) {
      const superAdminRole = this.roles().find(r =>
        r.name.toLowerCase() === 'superadmin' || r.name.toLowerCase() === 'super admin'
      );
      if (superAdminRole) {
        roleIds.push(superAdminRole.id);
      }
    }

    // Add selected role if not superadmin
    if (!formData.is_superadmin && formData.role_id) {
      roleIds.push(formData.role_id);
    }

    // Replace role_id with role_ids for API
    delete formData.role_id;
    formData.role_ids = roleIds;

    const request = this.isEditMode
      ? this.userService.updateUser(this.data.user!.id, formData)
      : this.userService.createUser(formData);

    request.subscribe({
      next: () => {
        this.snackBar.open(`User ${this.isEditMode ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'An error occurred', 'Close', { duration: 3000 });
        this.isSubmitting.set(false);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
