import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  username: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  method?: string;
  old_values?: any;
  new_values?: any;
  changes_summary?: string;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  extra_metadata?: any;
}

interface Stats {
  total_events: number;
  success_count: number;
  failed_count: number;
  failed_logins: number;
  by_action: {action: string, count: number}[];
  by_resource: {resource_type: string, count: number}[];
  top_users: {username: string, count: number}[];
  events_per_day: {date: string, count: number}[];
  date_range: {start: string, end: string};
}

@Component({
  standalone: true,
  selector: 'app-admin-logging',
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="logging-page">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon>event_note</mat-icon>
          <div class="stat-info">
            <span class="stat-value">{{ stats()?.total_events || 0 }}</span>
            <span class="stat-label">Total Events</span>
          </div>
        </div>
        <div class="stat-card success">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="stat-value">{{ stats()?.success_count || 0 }}</span>
            <span class="stat-label">Success</span>
          </div>
        </div>
        <div class="stat-card failed">
          <mat-icon>error</mat-icon>
          <div class="stat-info">
            <span class="stat-value">{{ stats()?.failed_count || 0 }}</span>
            <span class="stat-label">Failed</span>
          </div>
        </div>
        <div class="stat-card warning">
          <mat-icon>warning</mat-icon>
          <div class="stat-info">
            <span class="stat-value">{{ stats()?.failed_logins || 0 }}</span>
            <span class="stat-label">Failed Logins</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-panel">
        <h3>
          <mat-icon>filter_list</mat-icon>
          Filters
          @if (hasActiveFilters()) {
            <button class="clear-btn" (click)="clearFilters()">
              <mat-icon>close</mat-icon>
              Clear
            </button>
          }
        </h3>

        <div class="filter-grid">
          <mat-form-field appearance="outline">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="filters.search" placeholder="Search in logs..." (ngModelChange)="applyFilters()">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <input matInput [(ngModel)]="filters.username" (ngModelChange)="applyFilters()">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Action</mat-label>
            <mat-select [(ngModel)]="filters.action" (ngModelChange)="applyFilters()">
              <mat-option value="">All Actions</mat-option>
              <mat-option value="user.login">User Login</mat-option>
              <mat-option value="user.login_failed">Login Failed</mat-option>
              <mat-option value="user.logout">User Logout</mat-option>
              <mat-option value="user.created">User Created</mat-option>
              <mat-option value="user.updated">User Updated</mat-option>
              <mat-option value="user.deleted">User Deleted</mat-option>
              <mat-option value="alarm.acknowledged">Alarm Acknowledged</mat-option>
              <mat-option value="alarm.deleted">Alarm Deleted</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Resource Type</mat-label>
            <mat-select [(ngModel)]="filters.resource_type" (ngModelChange)="applyFilters()">
              <mat-option value="">All Resources</mat-option>
              <mat-option value="user">User</mat-option>
              <mat-option value="role">Role</mat-option>
              <mat-option value="video_source">Video Source</mat-option>
              <mat-option value="ai_task">AI Task</mat-option>
              <mat-option value="alarm">Alarm</mat-option>
              <mat-option value="ai_box">AI Box</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="filters.status" (ngModelChange)="applyFilters()">
              <mat-option value="">All Status</mat-option>
              <mat-option value="success">Success</mat-option>
              <mat-option value="failed">Failed</mat-option>
              <mat-option value="partial">Partial</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>IP Address</mat-label>
            <input matInput [(ngModel)]="filters.ip_address" (ngModelChange)="applyFilters()">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" [(ngModel)]="filters.start_date" (ngModelChange)="applyFilters()">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" [(ngModel)]="filters.end_date" (ngModelChange)="applyFilters()">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="showing-info">
          Showing {{ logs().length }} of {{ totalLogs() }} events
        </div>
        <div class="action-buttons">
          <button mat-raised-button (click)="refreshLogs()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-raised-button (click)="exportCSV()">
            <mat-icon>download</mat-icon>
            Export CSV
          </button>
          <button mat-raised-button (click)="exportJSON()">
            <mat-icon>code</mat-icon>
            Export JSON
          </button>
        </div>
      </div>

      <!-- Timeline Visualization -->
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="timeline-container">
          @for (log of logs(); track log.id) {
            <div class="timeline-item" [class.failed]="log.status === 'failed'" (click)="openDetailDialog(log)">
              <div class="timeline-marker">
                <div class="timeline-icon" [class]="getIconClass(log)">
                  <mat-icon>{{ getIcon(log) }}</mat-icon>
                </div>
                <div class="timeline-line"></div>
              </div>

              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-meta">
                    <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
                    <span class="separator">•</span>
                    <span class="username">{{ log.username }}</span>
                    @if (log.ip_address) {
                      <span class="separator">•</span>
                      <span class="ip">{{ log.ip_address }}</span>
                    }
                  </div>
                  <div class="timeline-status" [class]="log.status">
                    <mat-icon>{{ log.status === 'success' ? 'check_circle' : 'error' }}</mat-icon>
                    <span>{{ log.status }}</span>
                  </div>
                </div>

                <div class="timeline-body">
                  <div class="action-badge" [class]="getActionType(log.action)">
                    {{ log.action }}
                  </div>
                  <span class="resource-info">
                    {{ log.resource_type }}: {{ log.resource_name || log.resource_id || 'N/A' }}
                  </span>
                </div>

                @if (log.changes_summary || log.error_message) {
                  <div class="timeline-summary" [class.error-summary]="log.status === 'failed'">
                    <mat-icon>{{ log.error_message ? 'error_outline' : 'info' }}</mat-icon>
                    <span>{{ log.error_message || log.changes_summary }}</span>
                  </div>
                }

                <!-- Additional details for failed events -->
                @if (log.status === 'failed') {
                  <div class="failure-details">
                    <div class="detail-item">
                      <mat-icon class="detail-icon">person_outline</mat-icon>
                      <span class="detail-label">Attempted by:</span>
                      <span class="detail-value">{{ log.username }} ({{ log.user_email }})</span>
                    </div>
                    @if (log.ip_address) {
                      <div class="detail-item">
                        <mat-icon class="detail-icon">language</mat-icon>
                        <span class="detail-label">IP Address:</span>
                        <span class="detail-value">{{ log.ip_address }}</span>
                      </div>
                    }
                    @if (log.endpoint) {
                      <div class="detail-item">
                        <mat-icon class="detail-icon">api</mat-icon>
                        <span class="detail-label">Endpoint:</span>
                        <span class="detail-value">{{ log.method }} {{ log.endpoint }}</span>
                      </div>
                    }
                    @if (log.user_agent) {
                      <div class="detail-item">
                        <mat-icon class="detail-icon">devices</mat-icon>
                        <span class="detail-label">User Agent:</span>
                        <span class="detail-value user-agent">{{ log.user_agent }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>history</mat-icon>
              <span>No audit logs found</span>
              <p>Try adjusting your filters</p>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (logs().length > 0) {
          <div class="pagination">
            <button mat-icon-button [disabled]="currentPage() === 0" (click)="previousPage()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">
              Page {{ currentPage() + 1 }} of {{ totalPages() }}
            </span>
            <button mat-icon-button [disabled]="currentPage() >= totalPages() - 1" (click)="nextPage()">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .logging-page { display: flex; flex-direction: column; gap: 24px; }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .stat-card {
      display: flex; align-items: center; gap: 16px;
      padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md); transition: all 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
      &.success mat-icon { color: #22c55e; }
      &.failed mat-icon { color: #ef4444; }
      &.warning mat-icon { color: #f59e0b; }
      .stat-info { display: flex; flex-direction: column; }
      .stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
      .stat-label { font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; }
    }

    /* Filter Panel */
    .filter-panel {
      background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md); padding: 20px;
      h3 { margin: 0 0 16px; display: flex; align-items: center; gap: 8px; font-size: 16px; color: var(--text-primary); }
      .clear-btn {
        margin-left: auto; padding: 4px 12px; border: none;
        background: rgba(239, 68, 68, 0.1); color: #ef4444;
        border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;
        font-size: 12px; transition: all 0.2s;
        mat-icon { font-size: 16px; width: 16px; height: 16px; }
        &:hover { background: rgba(239, 68, 68, 0.2); }
      }
      .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    }

    /* Actions Bar */
    .actions-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      .showing-info { font-size: 14px; color: var(--text-secondary); }
      .action-buttons { display: flex; gap: 8px; }
      button { display: flex; align-items: center; gap: 6px; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    /* Timeline */
    .timeline-container { position: relative; }
    .timeline-item {
      display: flex; gap: 20px; position: relative; cursor: pointer;
      padding: 16px; margin-bottom: 16px;
      background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md); transition: all 0.2s;
      &:hover {
        transform: translateX(4px);
        box-shadow: 0 0 0 2px var(--accent-primary), 0 4px 12px rgba(0,0,0,0.2);
      }
      &.failed {
        border-left: 4px solid #ef4444;
        &:hover {
          box-shadow: inset 4px 0 0 0 #ef4444, 0 0 0 2px #ef4444, 0 4px 12px rgba(0,0,0,0.2);
        }
      }
    }

    .timeline-marker {
      display: flex; flex-direction: column; align-items: center;
      .timeline-icon {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white; z-index: 1;
        &.create { background: linear-gradient(135deg, #22c55e, #15803d); }
        &.update { background: linear-gradient(135deg, #f59e0b, #d97706); }
        &.delete { background: linear-gradient(135deg, #ef4444, #dc2626); }
        &.login { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
      }
      .timeline-line {
        width: 2px; flex: 1; background: var(--glass-border);
        margin-top: 8px;
      }
    }

    .timeline-content { flex: 1; }

    .timeline-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
      .timeline-meta {
        display: flex; align-items: center; gap: 8px; font-size: 13px;
        .timestamp { color: var(--text-primary); font-weight: 500; }
        .separator { color: var(--text-tertiary); }
        .username { color: var(--accent-primary); }
        .ip { color: var(--text-tertiary); font-family: monospace; }
      }
      .timeline-status {
        display: flex; align-items: center; gap: 4px;
        padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
        text-transform: uppercase;
        &.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        &.failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        &.partial { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }
    }

    .timeline-body {
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
      .action-badge {
        padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;
        font-family: monospace;
        &.create { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        &.update { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        &.delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        &.read { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        &.login { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
      }
      .resource-info { font-size: 14px; color: var(--text-secondary); }
    }

    .timeline-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; background: var(--glass-bg-hover); border-radius: 6px;
      font-size: 13px; color: var(--text-secondary);
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-tertiary); }
      &.error-summary {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        font-weight: 500;
        mat-icon { color: #ef4444; }
      }
    }

    /* Failure Details */
    .failure-details {
      margin-top: 12px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text-secondary);

        .detail-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: #ef4444;
        }

        .detail-label {
          font-weight: 600;
          color: var(--text-tertiary);
          min-width: 100px;
        }

        .detail-value {
          color: var(--text-primary);
          font-family: monospace;
          font-size: 11px;

          &.user-agent {
            white-space: normal;
            word-break: break-word;
            line-height: 1.4;
          }
        }
      }
    }

    /* Pagination */
    .pagination {
      display: flex; justify-content: center; align-items: center; gap: 16px;
      padding: 16px; background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      .page-info { font-size: 14px; color: var(--text-secondary); }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary); text-align: center;
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
      span { font-size: 18px; font-weight: 500; }
      p { margin: 0; font-size: 14px; }
    }
  `]
})
export class AdminLoggingComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private dialog = inject(MatDialog);

  loading = signal(true);
  logs = signal<AuditLog[]>([]);
  stats = signal<Stats | null>(null);
  totalLogs = signal(0);
  currentPage = signal(0);
  pageSize = 50;

  filters = {
    search: '',
    username: '',
    action: '',
    resource_type: '',
    status: '',
    ip_address: '',
    start_date: null as Date | null,
    end_date: null as Date | null
  };

  totalPages = computed(() => Math.ceil(this.totalLogs() / this.pageSize));

  hasActiveFilters = computed(() => {
    return this.filters.search || this.filters.username || this.filters.action ||
           this.filters.resource_type || this.filters.status || this.filters.ip_address ||
           this.filters.start_date || this.filters.end_date;
  });

  ngOnInit() {
    this.loadStats();
    this.loadLogs();
  }

  loadStats() {
    this.http.get<Stats>(`${this.apiUrl}/audit-logs/stats`).subscribe({
      next: (res) => this.stats.set(res),
      error: () => {}
    });
  }

  loadLogs() {
    this.loading.set(true);
    let params = new HttpParams()
      .set('skip', this.currentPage() * this.pageSize)
      .set('limit', this.pageSize);

    if (this.filters.search) params = params.set('search', this.filters.search);
    if (this.filters.username) params = params.set('username', this.filters.username);
    if (this.filters.action) params = params.set('action', this.filters.action);
    if (this.filters.resource_type) params = params.set('resource_type', this.filters.resource_type);
    if (this.filters.status) params = params.set('status', this.filters.status);
    if (this.filters.ip_address) params = params.set('ip_address', this.filters.ip_address);
    if (this.filters.start_date) params = params.set('start_date', this.filters.start_date.toISOString());
    if (this.filters.end_date) params = params.set('end_date', this.filters.end_date.toISOString());

    this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs`, { params }).subscribe({
      next: (res) => {
        this.logs.set(res);
        this.totalLogs.set(res.length); // Backend should return total in header
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadLogs();
  }

  clearFilters() {
    this.filters = {
      search: '', username: '', action: '', resource_type: '',
      status: '', ip_address: '', start_date: null, end_date: null
    };
    this.applyFilters();
  }

  refreshLogs() {
    this.loadStats();
    this.loadLogs();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
      this.loadLogs();
    }
  }

  previousPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadLogs();
    }
  }

  exportCSV() {
    let params = this.buildExportParams();
    window.open(`${this.apiUrl}/audit-logs/export/csv?${params.toString()}`, '_blank');
  }

  exportJSON() {
    let params = this.buildExportParams();
    window.open(`${this.apiUrl}/audit-logs/export/json?${params.toString()}`, '_blank');
  }

  private buildExportParams(): HttpParams {
    let params = new HttpParams();
    if (this.filters.search) params = params.set('search', this.filters.search);
    if (this.filters.username) params = params.set('username', this.filters.username);
    if (this.filters.action) params = params.set('action', this.filters.action);
    if (this.filters.resource_type) params = params.set('resource_type', this.filters.resource_type);
    if (this.filters.status) params = params.set('status', this.filters.status);
    if (this.filters.ip_address) params = params.set('ip_address', this.filters.ip_address);
    if (this.filters.start_date) params = params.set('start_date', this.filters.start_date.toISOString());
    if (this.filters.end_date) params = params.set('end_date', this.filters.end_date.toISOString());
    return params;
  }

  openDetailDialog(log: AuditLog) {
    // TODO: Implement detail dialog with before/after comparison
    console.log('Open detail for:', log);
  }

  formatTime(timestamp: string): string {
    // Backend returns UTC timestamp without 'Z' indicator
    // Add 'Z' to ensure it's parsed as UTC, then convert to local time
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(utcTimestamp);

    return date.toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Jakarta' // WIB timezone
    });
  }

  getIcon(log: AuditLog): string {
    if (log.action.includes('login')) return 'login';
    if (log.action.includes('logout')) return 'logout';
    if (log.action.includes('created')) return 'add_circle';
    if (log.action.includes('updated')) return 'edit';
    if (log.action.includes('deleted')) return 'delete';
    return 'history';
  }

  getIconClass(log: AuditLog): string {
    if (log.action.includes('created')) return 'create';
    if (log.action.includes('updated')) return 'update';
    if (log.action.includes('deleted')) return 'delete';
    if (log.action.includes('login')) return 'login';
    return 'read';
  }

  getActionType(action: string): string {
    if (action.includes('created')) return 'create';
    if (action.includes('updated')) return 'update';
    if (action.includes('deleted')) return 'delete';
    if (action.includes('login') || action.includes('logout')) return 'login';
    return 'read';
  }
}
