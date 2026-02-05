import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { UserFormDialogComponent } from './user-form-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="users-page">
      <!-- Header -->
      <div class="page-header animate-fade-in">
        <div class="header-content">
          <h2 class="page-subtitle">Manage system users and their access</h2>
        </div>
        <button class="btn-gradient" (click)="openUserDialog()">
          <mat-icon>add</mat-icon>
          <span>Add User</span>
        </button>
      </div>

      <!-- Users Table -->
      <div class="table-container glass-card-static animate-fade-in" style="animation-delay: 0.1s">
        @if (isLoading()) {
          <div class="loading-overlay">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        }

        <table mat-table [dataSource]="users()" class="users-table">
          <!-- User Column -->
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let user">
              <div class="user-cell">
                <div class="user-avatar">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="user-info">
                  <span class="user-name">{{ user.full_name || user.username }}</span>
                  <span class="user-username">&#64;{{ user.username }}</span>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Email Column -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let user">{{ user.email }}</td>
          </ng-container>

          <!-- Roles Column -->
          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef>Roles</th>
            <td mat-cell *matCellDef="let user">
              <div class="roles-cell">
                @if (user.is_superuser) {
                  <mat-chip class="role-chip superuser">Superuser</mat-chip>
                }
                @for (role of user.roles.slice(0, 2); track role.id) {
                  <mat-chip class="role-chip">{{ role.name }}</mat-chip>
                }
                @if (user.roles.length > 2) {
                  <span class="more-roles">+{{ user.roles.length - 2 }}</span>
                }
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let user">
              <span class="badge" [class.badge-success]="user.is_active" [class.badge-error]="!user.is_active">
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let user">
              <button mat-icon-button [matMenuTriggerFor]="menu" class="action-btn">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openUserDialog(user)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="toggleUserStatus(user)">
                  <mat-icon>{{ user.is_active ? 'block' : 'check_circle' }}</mat-icon>
                  <span>{{ user.is_active ? 'Deactivate' : 'Activate' }}</span>
                </button>
                <button mat-menu-item (click)="deleteUser(user)" class="delete-item">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        @if (users().length === 0 && !isLoading()) {
          <div class="empty-state">
            <mat-icon>people_outline</mat-icon>
            <h3>No users found</h3>
            <p>Get started by adding your first user</p>
            <button class="btn-gradient" (click)="openUserDialog()">
              <mat-icon>add</mat-icon>
              <span>Add User</span>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .users-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .btn-gradient {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .table-container {
      padding: 0;
      overflow: hidden;
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10, 10, 15, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .users-table {
      width: 100%;

      th {
        background: var(--bg-secondary);
        color: var(--text-secondary);
        font-weight: 500;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--glass-border);
      }

      td {
        padding: 16px 20px;
        border-bottom: 1px solid var(--glass-border);
        color: var(--text-primary);
        font-size: 14px;
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr:hover td {
        background: var(--glass-bg);
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: white;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .user-username {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .roles-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .role-chip {
      height: 24px !important;
      font-size: 11px !important;
      background: var(--glass-bg) !important;
      border: 1px solid var(--glass-border) !important;

      &.superuser {
        background: rgba(124, 58, 237, 0.15) !important;
        border-color: rgba(124, 58, 237, 0.3) !important;
        color: var(--accent-secondary) !important;
      }
    }

    .more-roles {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .action-btn {
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }

    .delete-item {
      color: var(--error) !important;

      mat-icon {
        color: var(--error) !important;
      }
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--text-muted);
        margin-bottom: 16px;
      }

      h3 {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 8px;
      }

      p {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 24px;
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private userService = inject(UserService);

  users = signal<User[]>([]);
  isLoading = signal(false);
  displayedColumns = ['user', 'email', 'roles', 'status', 'actions'];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  openUserDialog(user?: User): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      data: { user },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  toggleUserStatus(user: User): void {
    this.userService.updateUser(user.id, { is_active: !user.is_active }).subscribe({
      next: () => {
        this.snackBar.open(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: () => {
        this.snackBar.open('Failed to update user status', 'Close', { duration: 3000 });
      }
    });
  }

  deleteUser(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete User',
        message: `Are you sure you want to delete "${user.username}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.snackBar.open('User deleted successfully', 'Close', { duration: 3000 });
            this.loadUsers();
          },
          error: () => {
            this.snackBar.open('Failed to delete user', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
