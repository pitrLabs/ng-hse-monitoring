import { Component, inject, OnInit, signal } from '@angular/core';
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
import { Role, Permission } from '../../core/models/user.model';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-role-form-dialog',
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
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>{{ isEditMode ? 'Edit Role' : 'Add New Role' }}</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter role name">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Role name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Enter role description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Permissions</mat-label>
          <mat-select formControlName="permission_ids" multiple>
            @for (perm of permissions(); track perm.id) {
              <mat-option [value]="perm.id">
                {{ perm.name }} ({{ perm.resource }}:{{ perm.action }})
              </mat-option>
            }
          </mat-select>
          <mat-hint>Select permissions for this role</mat-hint>
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
  `]
})
export class RoleFormDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RoleFormDialogComponent>);
  private data = inject(MAT_DIALOG_DATA) as { role?: Role; permissions: Permission[] };
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  permissions = signal<Permission[]>([]);
  isSubmitting = signal(false);

  get isEditMode(): boolean {
    return !!this.data?.role;
  }

  ngOnInit(): void {
    this.permissions.set(this.data?.permissions || []);
    this.initForm();
  }

  private initForm(): void {
    const role = this.data?.role;
    this.form = this.fb.group({
      name: [role?.name || '', Validators.required],
      description: [role?.description || ''],
      permission_ids: [role?.permissions?.map(p => p.id) || []]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const formData = this.form.value;

    const request = this.isEditMode
      ? this.roleService.updateRole(this.data.role!.id, formData)
      : this.roleService.createRole(formData);

    request.subscribe({
      next: () => {
        this.snackBar.open(`Role ${this.isEditMode ? 'updated' : 'created'} successfully`, 'Close', { duration: 3000 });
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
