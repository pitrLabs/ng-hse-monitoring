import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-permission-form-dialog',
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
        <h2>Add New Permission</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Permission Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Read Users">
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Permission name is required</mat-error>
          }
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Resource</mat-label>
            <mat-select formControlName="resource">
              <mat-option value="users">users</mat-option>
              <mat-option value="roles">roles</mat-option>
              <mat-option value="permissions">permissions</mat-option>
              <mat-option value="dashboard">dashboard</mat-option>
              <mat-option value="reports">reports</mat-option>
              <mat-option value="settings">settings</mat-option>
            </mat-select>
            @if (form.get('resource')?.hasError('required')) {
              <mat-error>Resource is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Action</mat-label>
            <mat-select formControlName="action">
              <mat-option value="read">read</mat-option>
              <mat-option value="create">create</mat-option>
              <mat-option value="update">update</mat-option>
              <mat-option value="delete">delete</mat-option>
            </mat-select>
            @if (form.get('action')?.hasError('required')) {
              <mat-error>Action is required</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Describe what this permission allows" rows="2"></textarea>
        </mat-form-field>

        <div class="dialog-actions">
          <button type="button" class="btn-glass" (click)="close()">Cancel</button>
          <button type="submit" class="btn-gradient" [disabled]="form.invalid || isSubmitting()">
            @if (isSubmitting()) {
              <mat-spinner diameter="20"></mat-spinner>
            }
            <span>Create</span>
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

    .form-row {
      display: flex;
      gap: 16px;
    }

    .half-width {
      flex: 1;
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
export class PermissionFormDialogComponent {
  private dialogRef = inject(MatDialogRef<PermissionFormDialogComponent>);
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private snackBar = inject(MatSnackBar);

  form: FormGroup;
  isSubmitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      resource: ['', Validators.required],
      action: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.roleService.createPermission(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Permission created successfully', 'Close', { duration: 3000 });
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
