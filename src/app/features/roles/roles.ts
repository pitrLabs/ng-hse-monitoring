import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoleService } from '../../core/services/role.service';
import { Role, Permission } from '../../core/models/user.model';
import { RoleFormDialogComponent } from './role-form-dialog';
import { PermissionFormDialogComponent } from './permission-form-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="roles-page">
      <!-- Header -->
      <div class="page-header animate-fade-in">
        <div class="header-content">
          <h2 class="page-subtitle">Manage roles and permissions for access control</h2>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="glass-tabs animate-fade-in" style="animation-delay: 0.1s">
        <!-- Roles Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>admin_panel_settings</mat-icon>
            <span>Roles</span>
          </ng-template>

          <div class="tab-content">
            <div class="tab-header">
              <span class="tab-description">Define roles and assign permissions to control user access</span>
              <button class="btn-gradient" (click)="openRoleDialog()">
                <mat-icon>add</mat-icon>
                <span>Add Role</span>
              </button>
            </div>

            <div class="table-container glass-card-static">
              @if (isLoadingRoles()) {
                <div class="loading-overlay">
                  <mat-spinner diameter="40"></mat-spinner>
                </div>
              }

              <table mat-table [dataSource]="roles()" class="data-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Role Name</th>
                  <td mat-cell *matCellDef="let role">
                    <div class="name-cell">
                      <div class="role-icon">
                        <mat-icon>shield</mat-icon>
                      </div>
                      <span class="role-name">{{ role.name }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let role">
                    {{ role.description || 'No description' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="permissions">
                  <th mat-header-cell *matHeaderCellDef>Permissions</th>
                  <td mat-cell *matCellDef="let role">
                    <div class="permissions-cell">
                      @for (perm of role.permissions.slice(0, 3); track perm.id) {
                        <mat-chip class="perm-chip" [matTooltip]="perm.resource + ':' + perm.action">
                          {{ perm.name }}
                        </mat-chip>
                      }
                      @if (role.permissions.length > 3) {
                        <span class="more-perms">+{{ role.permissions.length - 3 }} more</span>
                      }
                      @if (role.permissions.length === 0) {
                        <span class="no-perms">No permissions</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="created">
                  <th mat-header-cell *matHeaderCellDef>Created</th>
                  <td mat-cell *matCellDef="let role">
                    {{ role.created_at | date:'mediumDate' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let role">
                    <button mat-icon-button [matMenuTriggerFor]="roleMenu" class="action-btn">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #roleMenu="matMenu">
                      <button mat-menu-item (click)="openRoleDialog(role)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit</span>
                      </button>
                      <button mat-menu-item (click)="deleteRole(role)" class="delete-item">
                        <mat-icon>delete</mat-icon>
                        <span>Delete</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="roleColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: roleColumns;"></tr>
              </table>

              @if (roles().length === 0 && !isLoadingRoles()) {
                <div class="empty-state">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <h3>No roles found</h3>
                  <p>Create your first role to manage access control</p>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Permissions Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>verified_user</mat-icon>
            <span>Permissions</span>
          </ng-template>

          <div class="tab-content">
            <div class="tab-header">
              <span class="tab-description">Define granular permissions for resources and actions</span>
              <button class="btn-gradient" (click)="openPermissionDialog()">
                <mat-icon>add</mat-icon>
                <span>Add Permission</span>
              </button>
            </div>

            <div class="table-container glass-card-static">
              @if (isLoadingPermissions()) {
                <div class="loading-overlay">
                  <mat-spinner diameter="40"></mat-spinner>
                </div>
              }

              <table mat-table [dataSource]="permissions()" class="data-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Permission Name</th>
                  <td mat-cell *matCellDef="let perm">
                    <div class="name-cell">
                      <div class="perm-icon">
                        <mat-icon>key</mat-icon>
                      </div>
                      <span class="perm-name">{{ perm.name }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="resource">
                  <th mat-header-cell *matHeaderCellDef>Resource</th>
                  <td mat-cell *matCellDef="let perm">
                    <span class="resource-badge">{{ perm.resource }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let perm">
                    <span class="action-badge" [class]="'action-' + perm.action">{{ perm.action }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let perm">
                    {{ perm.description || '-' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let perm">
                    <button mat-icon-button class="action-btn" (click)="deletePermission(perm)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="permissionColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: permissionColumns;"></tr>
              </table>

              @if (permissions().length === 0 && !isLoadingPermissions()) {
                <div class="empty-state">
                  <mat-icon>verified_user</mat-icon>
                  <h3>No permissions found</h3>
                  <p>Create your first permission to define access control</p>
                </div>
              }
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .roles-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .glass-tabs {
      ::ng-deep {
        .mat-mdc-tab-header {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: 8px 8px 0;
        }

        .mat-mdc-tab {
          color: var(--text-secondary);
          min-width: 140px;

          .mdc-tab__text-label {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }

          &.mdc-tab--active {
            color: var(--accent-primary);

            .mdc-tab__text-label {
              color: var(--accent-primary);
            }
          }
        }

        .mat-mdc-tab-body-wrapper {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-top: none;
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }

        .mdc-tab-indicator__content--underline {
          border-color: var(--accent-primary);
        }
      }
    }

    .tab-content {
      padding: 24px;
    }

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .tab-description {
      font-size: 14px;
      color: var(--text-secondary);
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

    .data-table {
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

    .name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .role-icon, .perm-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .role-icon {
      background: rgba(124, 58, 237, 0.15);
      mat-icon { color: var(--accent-secondary); }
    }

    .perm-icon {
      background: rgba(0, 212, 255, 0.15);
      mat-icon { color: var(--accent-primary); }
    }

    .role-name, .perm-name {
      font-weight: 500;
    }

    .permissions-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .perm-chip {
      height: 24px !important;
      font-size: 11px !important;
      background: var(--glass-bg) !important;
      border: 1px solid var(--glass-border) !important;
    }

    .more-perms, .no-perms {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .resource-badge {
      display: inline-flex;
      padding: 4px 10px;
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 20px;
      font-size: 12px;
      color: var(--accent-secondary);
      font-weight: 500;
    }

    .action-badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;

      &.action-read {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: var(--info);
      }

      &.action-create {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: var(--success);
      }

      &.action-update {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        color: var(--warning);
      }

      &.action-delete {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: var(--error);
      }
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
        margin: 0;
      }
    }
  `]
})
export class RolesComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private roleService = inject(RoleService);

  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  isLoadingRoles = signal(false);
  isLoadingPermissions = signal(false);

  roleColumns = ['name', 'description', 'permissions', 'created', 'actions'];
  permissionColumns = ['name', 'resource', 'action', 'description', 'actions'];

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles(): void {
    this.isLoadingRoles.set(true);
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.isLoadingRoles.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load roles', 'Close', { duration: 3000 });
        this.isLoadingRoles.set(false);
      }
    });
  }

  loadPermissions(): void {
    this.isLoadingPermissions.set(true);
    this.roleService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.isLoadingPermissions.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load permissions', 'Close', { duration: 3000 });
        this.isLoadingPermissions.set(false);
      }
    });
  }

  openRoleDialog(role?: Role): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '500px',
      data: { role, permissions: this.permissions() },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  deleteRole(role: Role): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Role',
        message: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.roleService.deleteRole(role.id).subscribe({
          next: () => {
            this.snackBar.open('Role deleted successfully', 'Close', { duration: 3000 });
            this.loadRoles();
          },
          error: () => {
            this.snackBar.open('Failed to delete role', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  openPermissionDialog(): void {
    const dialogRef = this.dialog.open(PermissionFormDialogComponent, {
      width: '500px',
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPermissions();
      }
    });
  }

  deletePermission(permission: Permission): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Permission',
        message: `Are you sure you want to delete "${permission.name}"? This will remove it from all roles.`,
        confirmText: 'Delete',
        confirmColor: 'warn'
      },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.roleService.deletePermission(permission.id).subscribe({
          next: () => {
            this.snackBar.open('Permission deleted successfully', 'Close', { duration: 3000 });
            this.loadPermissions();
            this.loadRoles();
          },
          error: () => {
            this.snackBar.open('Failed to delete permission', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
