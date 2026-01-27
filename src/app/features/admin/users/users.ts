import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
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
            <div class="col-status">Status</div>
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
                <span class="role-badge" [class.admin]="user.is_superuser">
                  {{ user.is_superuser ? 'Admin' : (user.roles?.[0]?.name || 'User') }}
                </span>
              </div>
              <div class="col-status">
                <span class="status-badge" [class.active]="user.is_active">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="col-actions">
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
      grid-template-columns: 2fr 2fr 1fr 1fr 100px;
      gap: 16px;
      padding: 16px 20px;
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
      display: flex; align-items: center; gap: 12px;
    }

    .user-avatar {
      width: 40px; height: 40px;
      border-radius: 8px;
      background: var(--accent-gradient);
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; color: white; font-size: 14px;
    }

    .user-info {
      display: flex; flex-direction: column;
      .user-name { font-weight: 500; color: var(--text-primary); }
      .user-username { font-size: 12px; color: var(--text-tertiary); }
    }

    .col-email { color: var(--text-secondary); }

    .role-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: var(--glass-border);
      color: var(--text-secondary);

      &.admin { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;

      &.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .col-actions {
      display: flex; gap: 4px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  users = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  searchTerm = '';

  ngOnInit() {
    this.loadUsers();
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

  openCreateDialog() {
    // TODO: Implement dialog
    console.log('Create user');
  }

  editUser(user: any) {
    console.log('Edit user', user);
  }

  deleteUser(user: any) {
    if (confirm(`Delete user "${user.username}"?`)) {
      this.http.delete(`${this.apiUrl}/users/${user.id}`).subscribe(() => this.loadUsers());
    }
  }
}
