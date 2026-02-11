import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { VideoSourceService, VideoSource } from '../../../core/services/video-source.service';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  is_active: boolean;
  is_superuser: boolean;
  role_id: string | null;
}

interface UserSession {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_logged_in: boolean;
  last_login_at?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule, MatCheckboxModule, MatSelectModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="admin-users">
      <div class="page-header">
        <div class="header-left">
          <h2>User Management</h2>
          <span class="count">{{ filteredUsers().length }} users</span>
        </div>
        <div class="header-right">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search users..." [(ngModel)]="searchTerm" (input)="filterUsers()">
          </div>
          <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add User
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="users-table">
          <div class="table-header">
            <div class="col-user">User</div>
            <div class="col-email">Email</div>
            <div class="col-role">Role</div>
            <div class="col-cameras">Cameras</div>
            <div class="col-status">Status</div>
            <div class="col-login">Login</div>
            <div class="col-actions">Actions</div>
          </div>
          @for (user of filteredUsers(); track user.id) {
            <div class="table-row">
              <div class="col-user">
                <div class="user-avatar">{{ getInitials(user) }}</div>
                <div class="user-info">
                  <span class="user-name">{{ user.full_name || user.username }}</span>
                  <span class="user-username">&#64;{{ user.username }}</span>
                </div>
              </div>
              <div class="col-email">{{ user.email || '-' }}</div>
              <div class="col-role">
                <span class="role-badge" [class]="'role-badge ' + getRoleBadgeClass(user)">
                  {{ getRoleDisplayName(user) }}
                </span>
              </div>
              <div class="col-cameras">
                @if (user.is_superuser || isManagerOrAbove(user)) {
                  <span class="cameras-badge all">All</span>
                } @else {
                  <span class="cameras-badge" [class.none]="!user.assigned_video_sources?.length">
                    {{ user.assigned_video_sources?.length || 0 }} assigned
                  </span>
                }
              </div>
              <div class="col-status">
                <span class="status-badge" [class.active]="user.is_active">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="col-login">
                <span class="login-badge" [class.online]="isUserLoggedIn(user.id)">
                  {{ isUserLoggedIn(user.id) ? 'Online' : 'Offline' }}
                </span>
              </div>
              <div class="col-actions">
                @if (isUserLoggedIn(user.id)) {
                  <button mat-icon-button matTooltip="Force Logout" (click)="openForceLogoutModal(user)" class="force-logout-btn">
                    <mat-icon>logout</mat-icon>
                  </button>
                }
                @if (!user.is_superuser && !isManagerOrAbove(user)) {
                  <button mat-icon-button matTooltip="Assign Cameras" (click)="openCameraAssignment(user)">
                    <mat-icon>videocam</mat-icon>
                  </button>
                }
                <button mat-icon-button matTooltip="Edit" (click)="editUser(user)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" (click)="deleteUser(user)" [disabled]="user.is_superuser">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>people_outline</mat-icon>
              <span>No users found</span>
            </div>
          }
        </div>
      }
    </div>

    <!-- Camera Assignment Modal -->
    @if (showCameraModal()) {
      <div class="modal-overlay" (click)="closeCameraModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Assign Cameras to {{ selectedUser()?.full_name || selectedUser()?.username }}</h3>
            <button mat-icon-button (click)="closeCameraModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            @if (loadingCameras()) {
              <div class="loading-container small">
                <mat-spinner diameter="30"></mat-spinner>
              </div>
            } @else {
              <div class="camera-list">
                <div class="select-all">
                  <mat-checkbox
                    [checked]="allCamerasSelected()"
                    [indeterminate]="someCamerasSelected()"
                    (change)="toggleAllCameras($event.checked)">
                    Select All ({{ allCameras().length }} cameras)
                  </mat-checkbox>
                </div>
                @for (camera of allCameras(); track camera.id) {
                  <div class="camera-item">
                    <mat-checkbox
                      [checked]="isCameraSelected(camera.id)"
                      (change)="toggleCamera(camera.id, $event.checked)">
                      <div class="camera-info">
                        <span class="camera-name">{{ camera.name }}</span>
                        <span class="camera-stream">{{ camera.stream_name }}</span>
                      </div>
                    </mat-checkbox>
                  </div>
                }
              </div>
            }
          </div>
          <div class="modal-footer">
            <span class="selected-count">{{ selectedCameraIds().length }} cameras selected</span>
            <div class="modal-actions">
              <button mat-button (click)="closeCameraModal()">Cancel</button>
              <button mat-raised-button class="btn-primary" (click)="saveCameraAssignment()" [disabled]="savingAssignment()">
                @if (savingAssignment()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  Save
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirmation Modal -->
    @if (showDeleteModal()) {
      <div class="modal-overlay" (click)="closeDeleteModal()">
        <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="delete-icon-wrapper">
              <mat-icon>warning</mat-icon>
            </div>
            <h3>Delete User</h3>
            <button mat-icon-button (click)="closeDeleteModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-message">
              Are you sure you want to delete <strong>{{ userToDelete()?.full_name || userToDelete()?.username }}</strong>?
            </p>
            <p class="delete-warning">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <div class="modal-actions">
              <button mat-button (click)="closeDeleteModal()">Cancel</button>
              <button mat-raised-button class="btn-danger" (click)="confirmDelete()" [disabled]="deletingUser()">
                @if (deletingUser()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  Delete
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Force Logout Confirmation Modal -->
    @if (showForceLogoutModal()) {
      <div class="modal-overlay" (click)="closeForceLogoutModal()">
        <div class="modal-content delete-modal" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="delete-icon-wrapper logout-icon">
              <mat-icon>logout</mat-icon>
            </div>
            <h3>Force Logout User</h3>
            <button mat-icon-button (click)="closeForceLogoutModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            <p class="delete-message">
              Apakah Anda yakin ingin memaksa logout <strong>{{ userToForceLogout()?.full_name || userToForceLogout()?.username }}</strong>?
            </p>
            <p class="delete-warning">User akan bisa login kembali setelah ini.</p>
          </div>
          <div class="modal-footer">
            <div class="modal-actions">
              <button mat-button (click)="closeForceLogoutModal()">Cancel</button>
              <button mat-raised-button class="btn-warning" (click)="confirmForceLogout()" [disabled]="forcingLogout()">
                @if (forcingLogout()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  Force Logout
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- User Form Modal (Create/Edit) -->
    @if (showUserModal()) {
      <div class="modal-overlay" (click)="closeUserModal()">
        <div class="modal-content user-form-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ isEditMode() ? 'Edit User' : 'Create New User' }}</h3>
            <button mat-icon-button (click)="closeUserModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-body">
            <form class="user-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Username</mat-label>
                <input matInput [(ngModel)]="userForm.username" name="username" [disabled]="isEditMode()" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="userForm.email" name="email" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input matInput [(ngModel)]="userForm.full_name" name="full_name">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ isEditMode() ? 'New Password (leave blank to keep)' : 'Password' }}</mat-label>
                <input matInput type="password" [(ngModel)]="userForm.password" name="password" [required]="!isEditMode()">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Role</mat-label>
                <mat-select [(ngModel)]="userForm.role_id" name="role_id" [disabled]="userForm.is_superuser">
                  @for (role of filteredRoles(); track role.id) {
                    <mat-option [value]="role.id">{{ formatRoleName(role.name) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="checkbox-group">
                <mat-checkbox [(ngModel)]="userForm.is_superuser" name="is_superuser" class="superuser-checkbox">
                  <span class="checkbox-label-content">
                    <mat-icon class="superuser-icon">verified_user</mat-icon>
                    Super Admin
                  </span>
                </mat-checkbox>
                <span class="checkbox-hint">Super Admin has full access to all features and cameras</span>
              </div>

              @if (isEditMode()) {
                <div class="status-toggle">
                  <mat-checkbox [(ngModel)]="userForm.is_active" name="is_active">
                    Active
                  </mat-checkbox>
                </div>
              }

              @if (formError()) {
                <div class="form-error">
                  <mat-icon>error</mat-icon>
                  {{ formError() }}
                </div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <div class="modal-actions">
              <button mat-button (click)="closeUserModal()">Cancel</button>
              <button mat-raised-button class="btn-primary" (click)="saveUser()" [disabled]="savingUser()">
                @if (savingUser()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  {{ isEditMode() ? 'Update' : 'Create' }}
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-users { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);

      mat-icon { color: var(--text-tertiary); font-size: 20px; width: 20px; height: 20px; }
      input { border: none; background: transparent; color: var(--text-primary); outline: none; width: 200px; }
    }

    .btn-primary {
      background: var(--accent-gradient) !important;
      color: white !important;
    }

    .loading-container {
      display: flex; justify-content: center; align-items: center; min-height: 300px;
    }

    .users-table {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: minmax(150px, 1.5fr) minmax(120px, 1.5fr) minmax(80px, 0.8fr) minmax(70px, 0.7fr) 70px 70px 130px;
      gap: 12px;
      padding: 14px 16px;
      align-items: center;
    }

    .table-header {
      background: var(--glass-bg-hover);
      font-weight: 600;
      font-size: 13px;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .table-row {
      border-top: 1px solid var(--glass-border);
      &:hover { background: var(--glass-bg-hover); }
    }

    .col-user {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .user-avatar {
      width: 36px; height: 36px;
      border-radius: 8px;
      background: var(--accent-gradient);
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; color: white; font-size: 13px;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;

      .user-name {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .user-username {
        font-size: 11px;
        color: var(--text-tertiary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .col-email {
      color: var(--text-secondary);
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .role-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: var(--glass-border);
      color: var(--text-secondary);
      white-space: nowrap;

      &.role-superadmin { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
      &.role-manager { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
      &.role-operator { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
      &.role-p3 { background: rgba(234, 179, 8, 0.2); color: #eab308; }
    }

    .status-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      white-space: nowrap;

      &.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .login-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(107, 114, 128, 0.2);
      color: #6b7280;
      white-space: nowrap;

      &.online { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .col-actions {
      display: flex;
      gap: 2px;
      justify-content: flex-end;

      button {
        color: var(--text-secondary);
        width: 32px;
        height: 32px;

        &:hover { color: var(--accent-primary); }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }

    .cameras-badge {
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      white-space: nowrap;

      &.all { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
      &.none { background: rgba(107, 114, 128, 0.2); color: #6b7280; }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--glass-border);

      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
      button { color: var(--text-secondary); }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }

    .loading-container.small {
      min-height: 150px;
    }

    .camera-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .select-all {
      padding: 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      margin-bottom: 8px;
    }

    .camera-item {
      padding: 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      transition: all 0.2s;

      &:hover { background: var(--glass-bg-hover); }
    }

    .camera-info {
      display: flex;
      flex-direction: column;
      margin-left: 8px;

      .camera-name { color: var(--text-primary); font-weight: 500; }
      .camera-stream { font-size: 12px; color: var(--text-tertiary); }
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-top: 1px solid var(--glass-border);

      .selected-count { font-size: 13px; color: var(--text-secondary); }
      .modal-actions { display: flex; gap: 12px; }
    }

    /* Delete Modal */
    .delete-modal {
      max-width: 400px;
    }

    .delete-header {
      gap: 12px;

      .delete-icon-wrapper {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon { color: #ef4444; font-size: 22px; width: 22px; height: 22px; }
      }

      h3 { flex: 1; }
    }

    .delete-message {
      color: var(--text-primary);
      font-size: 14px;
      margin: 0 0 8px 0;

      strong { font-weight: 600; }
    }

    .delete-warning {
      color: var(--text-tertiary);
      font-size: 13px;
      margin: 0;
    }

    .btn-danger {
      background: #ef4444 !important;
      color: white !important;

      &:hover { background: #dc2626 !important; }
    }

    .btn-warning {
      background: #f59e0b !important;
      color: white !important;

      &:hover { background: #d97706 !important; }
    }

    .logout-icon {
      background: rgba(245, 158, 11, 0.15) !important;

      mat-icon { color: #f59e0b !important; }
    }

    .force-logout-btn {
      color: #f59e0b !important;
      &:hover { color: #d97706 !important; }
    }

    /* User Form Modal */
    .user-form-modal {
      max-width: 480px;
    }

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .full-width {
      width: 100%;
    }

    .status-toggle {
      margin-top: 8px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: rgba(168, 85, 247, 0.05);
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: var(--radius-sm);
      margin-top: 8px;

      .checkbox-hint {
        font-size: 12px;
        color: var(--text-tertiary);
        margin-left: 28px;
      }
    }

    .checkbox-label-content {
      display: flex;
      align-items: center;
      gap: 6px;

      .superuser-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #a855f7;
      }
    }

    .form-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    ::ng-deep {
      .user-form-modal .mat-mdc-form-field {
        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--glass-border) !important;
        }
      }

      .user-form-modal .mat-mdc-form-field:hover .mdc-notched-outline__leading,
      .user-form-modal .mat-mdc-form-field:hover .mdc-notched-outline__notch,
      .user-form-modal .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
        border-color: var(--glass-border-hover) !important;
      }

      .user-form-modal .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
      .user-form-modal .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
      .user-form-modal .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
        border-color: var(--accent-primary) !important;
      }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private videoSourceService = inject(VideoSourceService);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  users = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  searchTerm = '';

  // Camera assignment modal
  showCameraModal = signal(false);
  selectedUser = signal<any>(null);
  allCameras = signal<VideoSource[]>([]);
  selectedCameraIds = signal<string[]>([]);
  loadingCameras = signal(false);
  savingAssignment = signal(false);

  // Delete confirmation modal
  showDeleteModal = signal(false);
  userToDelete = signal<any>(null);
  deletingUser = signal(false);

  // User form modal
  showUserModal = signal(false);
  isEditMode = signal(false);
  roles = signal<Role[]>([]);
  savingUser = signal(false);
  formError = signal('');
  userForm: UserFormData = this.getEmptyUserForm();

  // Session management
  userSessions = signal<UserSession[]>([]);
  showForceLogoutModal = signal(false);
  userToForceLogout = signal<any>(null);
  forcingLogout = signal(false);

  // Filter out Super Admin from role list
  filteredRoles = computed(() => {
    return this.roles().filter(role => {
      const name = role.name.toLowerCase().replace(/[\s_-]/g, '');
      return name !== 'superadmin';
    });
  });

  // Computed for checkbox states
  allCamerasSelected = computed(() => {
    const all = this.allCameras();
    const selected = this.selectedCameraIds();
    return all.length > 0 && selected.length === all.length;
  });

  someCamerasSelected = computed(() => {
    const all = this.allCameras();
    const selected = this.selectedCameraIds();
    return selected.length > 0 && selected.length < all.length;
  });

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
    this.loadUserSessions();
  }

  getEmptyUserForm(): UserFormData {
    return {
      username: '',
      email: '',
      full_name: '',
      password: '',
      is_active: true,
      is_superuser: false,
      role_id: null
    };
  }

  loadRoles() {
    this.http.get<Role[]>(`${this.apiUrl}/roles`).subscribe({
      next: (res) => this.roles.set(res),
      error: () => console.error('Failed to load roles')
    });
  }

  loadUserSessions() {
    this.http.get<UserSession[]>(`${this.apiUrl}/users/sessions`).subscribe({
      next: (res) => this.userSessions.set(res),
      error: () => console.error('Failed to load user sessions')
    });
  }

  isUserLoggedIn(userId: string): boolean {
    const session = this.userSessions().find(s => s.id === userId);
    return session?.is_logged_in || false;
  }

  openForceLogoutModal(user: any) {
    this.userToForceLogout.set(user);
    this.showForceLogoutModal.set(true);
  }

  closeForceLogoutModal() {
    this.showForceLogoutModal.set(false);
    this.userToForceLogout.set(null);
  }

  confirmForceLogout() {
    const user = this.userToForceLogout();
    if (!user) return;

    this.forcingLogout.set(true);
    this.http.post(`${this.apiUrl}/users/${user.id}/force-logout`, {}).subscribe({
      next: () => {
        this.forcingLogout.set(false);
        this.closeForceLogoutModal();
        this.loadUserSessions(); // Refresh session data
      },
      error: (err) => {
        this.forcingLogout.set(false);
        console.error('Failed to force logout user:', err);
        alert(err.error?.detail || 'Failed to force logout user');
      }
    });
  }

  loadUsers() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/users`).subscribe({
      next: (res) => {
        this.users.set(res);
        this.filteredUsers.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers.set(
      this.users().filter(u =>
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term)
      )
    );
  }

  getInitials(user: any): string {
    const name = user.full_name || user.username || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  isManagerOrAbove(user: any): boolean {
    if (user.is_superuser) return true;
    const managerRoles = ['manager', 'superadmin'];
    return user.roles?.some((r: any) => managerRoles.includes(r.name?.toLowerCase()));
  }

  /**
   * Map role name from DB to proper display name
   */
  formatRoleName(name: string): string {
    const map: Record<string, string> = {
      'superadmin': 'Super Admin',
      'manager': 'Manager',
      'operator': 'Operator',
      'p3': 'P3',
    };
    return map[name?.toLowerCase()] || name;
  }

  getRoleDisplayName(user: any): string {
    if (user.is_superuser) return 'Super Admin';
    const role = user.roles?.[0]?.name;
    if (!role) return 'No Role';
    return this.formatRoleName(role);
  }

  getRoleBadgeClass(user: any): string {
    if (user.is_superuser) return 'role-superadmin';
    const role = user.roles?.[0]?.name?.toLowerCase();
    if (role) return 'role-' + role;
    return '';
  }

  openCreateDialog() {
    this.isEditMode.set(false);
    this.userForm = this.getEmptyUserForm();
    this.formError.set('');
    this.showUserModal.set(true);
  }

  editUser(user: any) {
    this.isEditMode.set(true);
    this.selectedUser.set(user);

    // Get first non-superadmin role
    const regularRole = user.roles?.find((r: Role) => {
      const name = r.name.toLowerCase().replace(/[\s_-]/g, '');
      return name !== 'superadmin';
    });

    this.userForm = {
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      is_active: user.is_active,
      is_superuser: user.is_superuser || false,
      role_id: regularRole?.id || null
    };
    this.formError.set('');
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.selectedUser.set(null);
    this.userForm = this.getEmptyUserForm();
    this.formError.set('');
  }

  saveUser() {
    this.formError.set('');

    // Validation
    if (!this.userForm.username.trim()) {
      this.formError.set('Username is required');
      return;
    }
    if (!this.userForm.email.trim()) {
      this.formError.set('Email is required');
      return;
    }
    if (!this.isEditMode() && !this.userForm.password) {
      this.formError.set('Password is required');
      return;
    }

    this.savingUser.set(true);

    // Build role_ids array for API
    const roleIds: string[] = [];
    if (!this.userForm.is_superuser && this.userForm.role_id) {
      roleIds.push(this.userForm.role_id);
    }

    if (this.isEditMode()) {
      // Update existing user
      const user = this.selectedUser();
      const updatePayload: any = {
        email: this.userForm.email,
        full_name: this.userForm.full_name || null,
        is_active: this.userForm.is_active,
        is_superuser: this.userForm.is_superuser,
        role_ids: roleIds
      };

      if (this.userForm.password) {
        updatePayload.password = this.userForm.password;
      }

      this.http.put<any>(`${this.apiUrl}/users/${user.id}`, updatePayload).subscribe({
        next: () => {
          this.savingUser.set(false);
          this.closeUserModal();
          this.loadUsers();
        },
        error: (err) => {
          this.savingUser.set(false);
          this.formError.set(err.error?.detail || 'Failed to update user');
        }
      });
    } else {
      // Create new user
      const createPayload = {
        username: this.userForm.username,
        email: this.userForm.email,
        full_name: this.userForm.full_name || null,
        password: this.userForm.password,
        is_superuser: this.userForm.is_superuser,
        role_ids: roleIds
      };

      console.log('Creating user with payload:', createPayload);
      console.log('Form data:', this.userForm);

      this.http.post<any>(`${this.apiUrl}/users`, createPayload).subscribe({
        next: () => {
          this.savingUser.set(false);
          this.closeUserModal();
          this.loadUsers();
        },
        error: (err) => {
          this.savingUser.set(false);
          console.error('Create user error:', err.error);
          const detail = err.error?.detail;
          if (Array.isArray(detail)) {
            // Pydantic validation error format
            const msg = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ');
            this.formError.set(msg);
          } else if (typeof detail === 'string') {
            this.formError.set(detail);
          } else {
            this.formError.set('Failed to create user');
          }
        }
      });
    }
  }

  deleteUser(user: any) {
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  confirmDelete() {
    const user = this.userToDelete();
    if (!user) return;

    this.deletingUser.set(true);
    this.http.delete(`${this.apiUrl}/users/${user.id}`).subscribe({
      next: () => {
        this.deletingUser.set(false);
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        this.deletingUser.set(false);
        this.closeDeleteModal();
        console.error('Failed to delete user:', err);
      }
    });
  }

  // Camera Assignment Methods
  openCameraAssignment(user: any) {
    this.selectedUser.set(user);
    this.showCameraModal.set(true);
    this.loadingCameras.set(true);

    // Load all cameras (admin sees all)
    this.http.get<VideoSource[]>(`${this.apiUrl}/video-sources`).subscribe({
      next: (cameras) => {
        this.allCameras.set(cameras);
        // Set currently assigned cameras
        const assignedIds = user.assigned_video_sources?.map((vs: any) => vs.id) || [];
        this.selectedCameraIds.set(assignedIds);
        this.loadingCameras.set(false);
      },
      error: () => this.loadingCameras.set(false)
    });
  }

  closeCameraModal() {
    this.showCameraModal.set(false);
    this.selectedUser.set(null);
    this.selectedCameraIds.set([]);
  }

  isCameraSelected(cameraId: string): boolean {
    return this.selectedCameraIds().includes(cameraId);
  }

  toggleCamera(cameraId: string, checked: boolean) {
    const current = this.selectedCameraIds();
    if (checked) {
      this.selectedCameraIds.set([...current, cameraId]);
    } else {
      this.selectedCameraIds.set(current.filter(id => id !== cameraId));
    }
  }

  toggleAllCameras(checked: boolean) {
    if (checked) {
      this.selectedCameraIds.set(this.allCameras().map(c => c.id));
    } else {
      this.selectedCameraIds.set([]);
    }
  }

  saveCameraAssignment() {
    const user = this.selectedUser();
    if (!user) return;

    this.savingAssignment.set(true);

    this.http.put<any>(`${this.apiUrl}/users/${user.id}/cameras`, {
      video_source_ids: this.selectedCameraIds()
    }).subscribe({
      next: (updatedUser) => {
        // Update user in list
        const users = this.users();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index] = { ...users[index], assigned_video_sources: updatedUser.assigned_video_sources };
          this.users.set([...users]);
          this.filterUsers();
        }
        this.savingAssignment.set(false);
        this.closeCameraModal();
      },
      error: (err) => {
        console.error('Failed to save camera assignment:', err);
        this.savingAssignment.set(false);
        alert('Failed to save camera assignment');
      }
    });
  }
}
