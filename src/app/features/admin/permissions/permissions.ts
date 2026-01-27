import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="permissions-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Permissions</h2>
          <p class="subtitle">System permissions and access controls</p>
        </div>
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search permissions..." [(ngModel)]="searchQuery" (ngModelChange)="onSearch()">
        </div>
      </div>

      <div class="permissions-list">
        @for (permission of filteredPermissions(); track permission.id) {
          <div class="permission-item" [class]="permission.category">
            <div class="permission-icon">
              <mat-icon>{{ permission.icon }}</mat-icon>
            </div>
            <div class="permission-info">
              <h4>{{ permission.name }}</h4>
              <p>{{ permission.description }}</p>
            </div>
            <span class="permission-badge" [class]="permission.category">{{ permission.category }}</span>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>search_off</mat-icon>
            <p>No permissions found</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .permissions-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

    .search-box { display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; min-width: 280px; }
    .search-box mat-icon { color: var(--text-muted); }
    .search-box input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 14px; }
    .search-box input::placeholder { color: var(--text-muted); }

    .permissions-list { display: flex; flex-direction: column; gap: 12px; }
    .permission-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; transition: all 0.2s; }
    .permission-item:hover { transform: translateX(4px); border-color: var(--accent-primary); }

    .permission-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .permission-item.delete .permission-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .permission-item.write .permission-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .permission-item.read .permission-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .permission-item.default .permission-icon { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

    .permission-info { flex: 1; }
    .permission-info h4 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .permission-info p { margin: 0; font-size: 13px; color: var(--text-secondary); }

    .permission-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .permission-badge.delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .permission-badge.write { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .permission-badge.read { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .permission-badge.default { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
  `]
})
export class AdminPermissionsComponent implements OnInit {
  searchQuery = '';
  permissions = signal<Permission[]>([]);
  filteredPermissions = computed(() => {
    const query = this.searchQuery.toLowerCase();
    return this.permissions().filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
  });

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    const samplePermissions: Permission[] = [
      { id: '1', name: 'users.create', description: 'Create new users', category: 'write', icon: 'person_add' },
      { id: '2', name: 'users.read', description: 'View user list', category: 'read', icon: 'visibility' },
      { id: '3', name: 'users.update', description: 'Update user information', category: 'write', icon: 'edit' },
      { id: '4', name: 'users.delete', description: 'Delete users', category: 'delete', icon: 'delete' },
      { id: '5', name: 'roles.create', description: 'Create new roles', category: 'write', icon: 'add_circle' },
      { id: '6', name: 'roles.read', description: 'View roles', category: 'read', icon: 'visibility' },
      { id: '7', name: 'roles.update', description: 'Update roles', category: 'write', icon: 'edit' },
      { id: '8', name: 'roles.delete', description: 'Delete roles', category: 'delete', icon: 'delete' },
      { id: '9', name: 'alarms.view', description: 'View alarms', category: 'read', icon: 'visibility' },
      { id: '10', name: 'alarms.acknowledge', description: 'Acknowledge alarms', category: 'write', icon: 'check_circle' },
      { id: '11', name: 'videos.stream', description: 'Stream videos', category: 'read', icon: 'play_circle' },
      { id: '12', name: 'system.admin', description: 'System administration', category: 'default', icon: 'security' }
    ];
    this.permissions.set(samplePermissions);
  }

  onSearch() {}
}
