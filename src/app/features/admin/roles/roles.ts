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
  selector: 'app-admin-roles',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="admin-roles">
      <div class="page-header">
        <div class="header-left">
          <h2>Role Management</h2>
          <span class="count">{{ roles().length }} roles</span>
        </div>
        <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Add Role
        </button>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="roles-grid">
          @for (role of roles(); track role.id) {
            <div class="role-card">
              <div class="role-header">
                <div class="role-icon">
                  <mat-icon>security</mat-icon>
                </div>
                <div class="role-info">
                  <h3>{{ role.name }}</h3>
                  <span class="role-desc">{{ role.description || 'No description' }}</span>
                </div>
                <div class="role-actions">
                  <button mat-icon-button matTooltip="Edit" (click)="editRole(role)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="deleteRole(role)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="role-body">
                <span class="permissions-label">Permissions ({{ role.permissions?.length || 0 }})</span>
                <div class="permissions-list">
                  @for (perm of role.permissions?.slice(0, 5); track perm.id) {
                    <span class="permission-badge">{{ perm.resource }}.{{ perm.action }}</span>
                  }
                  @if ((role.permissions?.length || 0) > 5) {
                    <span class="permission-badge more">+{{ role.permissions.length - 5 }} more</span>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>security</mat-icon>
              <span>No roles found</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-roles { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center;
    }

    .header-left {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .btn-primary { background: var(--accent-gradient) !important; color: white !important; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .role-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .role-header {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .role-icon {
      width: 48px; height: 48px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, #a855f7, #7e22ce);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; }
    }

    .role-info {
      flex: 1;
      h3 { margin: 0 0 4px; font-size: 16px; color: var(--text-primary); }
      .role-desc { font-size: 13px; color: var(--text-tertiary); }
    }

    .role-actions {
      display: flex; gap: 4px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .role-body { padding: 16px 20px; }

    .permissions-label {
      font-size: 12px; color: var(--text-tertiary); text-transform: uppercase;
      display: block; margin-bottom: 12px;
    }

    .permissions-list { display: flex; flex-wrap: wrap; gap: 8px; }

    .permission-badge {
      padding: 4px 10px;
      background: var(--glass-bg-hover);
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-secondary);

      &.more { background: var(--accent-gradient); color: white; }
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
  `]
})
export class AdminRolesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  roles = signal<any[]>([]);

  ngOnInit() { this.loadRoles(); }

  loadRoles() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/roles`).subscribe({
      next: (res) => { this.roles.set(res); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreateDialog() { console.log('Create role'); }
  editRole(role: any) { console.log('Edit role', role); }
  deleteRole(role: any) {
    if (confirm(`Delete role "${role.name}"?`)) {
      this.http.delete(`${this.apiUrl}/roles/${role.id}`).subscribe(() => this.loadRoles());
    }
  }
}
