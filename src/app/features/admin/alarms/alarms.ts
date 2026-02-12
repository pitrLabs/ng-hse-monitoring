import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AlarmService } from '../../../core/services/alarm.service';
import { Alarm, getAlarmSeverity, getBestAlarmImageUrl } from '../../../core/models/alarm.model';
import { formatDate, formatTime, formatDateTime } from '../../../shared/utils/date.utils';

@Component({
  standalone: true,
  selector: 'app-admin-alarms',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule
  ],
  template: `
    <div class="admin-alarms">
      <div class="page-header">
        <div class="header-left">
          <h2>Alarm Management</h2>
          <span class="count">{{ filteredAlarms().length }} alarms</span>
          @if (alarmService.connectionStatus() === 'connected') {
            <span class="live-badge">
              <span class="live-dot"></span>
              Live
            </span>
          }
        </div>
        <div class="header-right">
          <select [(ngModel)]="filterStatus" (change)="applyFilter()">
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select [(ngModel)]="filterType" (change)="applyFilter()">
            <option value="">All Types</option>
            @for (type of alarmTypes(); track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
          <button mat-stroked-button (click)="refresh()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-stroked-button (click)="exportAlarms()">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      @if (alarmService.stats(); as stats) {
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item new">
            <span class="stat-value">{{ stats.new }}</span>
            <span class="stat-label">New</span>
          </div>
          <div class="stat-item acknowledged">
            <span class="stat-value">{{ stats.acknowledged }}</span>
            <span class="stat-label">Acknowledged</span>
          </div>
          <div class="stat-item resolved">
            <span class="stat-value">{{ stats.resolved }}</span>
            <span class="stat-label">Resolved</span>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="alarms-table">
          <div class="table-header">
            <div class="col-check">
              <input type="checkbox" [(ngModel)]="selectAll" (change)="toggleSelectAll()">
            </div>
            <div class="col-time">Time</div>
            <div class="col-type">Type</div>
            <div class="col-camera">Camera</div>
            <div class="col-confidence">Confidence</div>
            <div class="col-status">Status</div>
            <div class="col-actions">Actions</div>
          </div>
          @for (alarm of filteredAlarms(); track alarm.id) {
            <div class="table-row" [class]="alarm.status" [class.selected]="selectedIds().has(alarm.id)">
              <div class="col-check">
                <input type="checkbox" [checked]="selectedIds().has(alarm.id)" (change)="toggleSelect(alarm.id)">
              </div>
              <div class="col-time">
                <span class="time-date">{{ fmtDate(alarm.alarm_time) }}</span>
                <span class="time-hour">{{ fmtTime(alarm.alarm_time) }}</span>
              </div>
              <div class="col-type">
                <span class="type-badge" [attr.data-severity]="getSeverity(alarm.alarm_type)">
                  {{ alarm.alarm_name || alarm.alarm_type }}
                </span>
              </div>
              <div class="col-camera">{{ alarm.camera_name || '-' }}</div>
              <div class="col-confidence">
                @if (alarm.confidence) {
                  <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="alarm.confidence * 100"></div>
                  </div>
                  <span class="confidence-value">{{ (alarm.confidence * 100) | number:'1.0-0' }}%</span>
                }
              </div>
              <div class="col-status">
                <span class="status-badge" [class]="alarm.status">{{ alarm.status }}</span>
              </div>
              <div class="col-actions">
                <button mat-icon-button matTooltip="View" (click)="viewAlarm(alarm)">
                  <mat-icon>visibility</mat-icon>
                </button>
                @if (alarm.status === 'new') {
                  <button mat-icon-button matTooltip="Acknowledge" (click)="acknowledgeAlarm(alarm)">
                    <mat-icon>check</mat-icon>
                  </button>
                }
                @if (alarm.status !== 'resolved') {
                  <button mat-icon-button matTooltip="Resolve" (click)="resolveAlarm(alarm)">
                    <mat-icon>done_all</mat-icon>
                  </button>
                }
                <button mat-icon-button matTooltip="Delete" (click)="deleteAlarm(alarm)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>notifications_off</mat-icon>
              <span>No alarms found</span>
            </div>
          }
        </div>

        <!-- Bulk Actions -->
        @if (selectedIds().size > 0) {
          <div class="bulk-actions">
            <span>{{ selectedIds().size }} selected</span>
            <button mat-stroked-button (click)="bulkAcknowledge()">
              <mat-icon>check</mat-icon>
              Acknowledge All
            </button>
            <button mat-stroked-button (click)="bulkResolve()">
              <mat-icon>done_all</mat-icon>
              Resolve All
            </button>
          </div>
        }
      }

      <!-- Alarm Detail Dialog -->
      @if (selectedAlarm()) {
        <div class="dialog-overlay" (click)="closeDialog()">
          <div class="alarm-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Alarm Details</h3>
              <button mat-icon-button (click)="closeDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-content">
              @if (getImageUrl(selectedAlarm())) {
                <div class="alarm-image">
                  <img [src]="getImageUrl(selectedAlarm())" alt="Alarm Image">
                </div>
              }
              <div class="alarm-details">
                <div class="detail-row">
                  <span class="detail-label">Type</span>
                  <span class="detail-value">{{ selectedAlarm()?.alarm_name || selectedAlarm()?.alarm_type }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Camera</span>
                  <span class="detail-value">{{ selectedAlarm()?.camera_name || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location</span>
                  <span class="detail-value">{{ selectedAlarm()?.location || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-value">{{ fmtDateTime(selectedAlarm()?.alarm_time) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Confidence</span>
                  <span class="detail-value">{{ ((selectedAlarm()?.confidence || 0) * 100) | number:'1.1-1' }}%</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status</span>
                  <span class="status-badge" [class]="selectedAlarm()?.status">{{ selectedAlarm()?.status }}</span>
                </div>
                @if (selectedAlarm()?.description) {
                  <div class="detail-row full">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">{{ selectedAlarm()?.description }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="dialog-actions">
              @if (selectedAlarm()?.video_url) {
                <a mat-stroked-button [href]="selectedAlarm()?.video_url" target="_blank">
                  <mat-icon>play_circle</mat-icon>
                  View Video
                </a>
              }
              @if (selectedAlarm()?.status === 'new') {
                <button mat-flat-button color="primary" (click)="acknowledgeAlarm(selectedAlarm()!); closeDialog()">
                  <mat-icon>check</mat-icon>
                  Acknowledge
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-alarms { display: flex; flex-direction: column; gap: 20px; }

    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

    .header-left {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .live-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 20px;
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      font-size: 12px; font-weight: 500;
    }

    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .header-right {
      display: flex; gap: 12px;
      select {
        padding: 8px 16px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
      }
    }

    .stats-bar {
      display: flex; gap: 16px;
      .stat-item {
        flex: 1; padding: 16px; text-align: center;
        background: var(--glass-bg); border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        &.new { border-left: 3px solid #ef4444; }
        &.acknowledged { border-left: 3px solid #f59e0b; }
        &.resolved { border-left: 3px solid #22c55e; }
      }
      .stat-value { display: block; font-size: 24px; font-weight: 700; color: var(--text-primary); }
      .stat-label { font-size: 12px; color: var(--text-tertiary); }
    }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .alarms-table {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 40px 140px 1fr 1fr 100px 110px 140px;
      gap: 12px; padding: 14px 16px; align-items: center;
    }

    .table-header {
      background: var(--glass-bg-hover);
      font-weight: 600; font-size: 12px;
      color: var(--text-tertiary); text-transform: uppercase;
    }

    .table-row {
      border-top: 1px solid var(--glass-border);
      &:hover { background: var(--glass-bg-hover); }
      &.new { border-left: 3px solid #ef4444; }
      &.acknowledged { border-left: 3px solid #f59e0b; }
      &.resolved { border-left: 3px solid #22c55e; }
      &.selected { background: rgba(99, 102, 241, 0.1); }
    }

    .col-time {
      display: flex; flex-direction: column;
      .time-date { font-size: 13px; color: var(--text-primary); }
      .time-hour { font-size: 11px; color: var(--text-tertiary); }
    }

    .type-badge {
      padding: 4px 10px; border-radius: 4px;
      font-size: 12px; font-weight: 500;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);

      &[data-severity="critical"] { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
      &[data-severity="high"] { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &[data-severity="medium"] { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &[data-severity="low"] { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .confidence-bar {
      width: 60px; height: 6px;
      background: var(--glass-border); border-radius: 3px;
      overflow: hidden; display: inline-block; vertical-align: middle;
      margin-right: 8px;
    }
    .confidence-fill { height: 100%; background: var(--accent-primary); border-radius: 3px; }
    .confidence-value { font-size: 11px; color: var(--text-secondary); }

    .status-badge {
      padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 500; text-transform: capitalize;

      &.new { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.acknowledged { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .col-actions {
      display: flex; gap: 2px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }

    .bulk-actions {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 16px;
      background: var(--glass-bg); border: 1px solid var(--accent-primary);
      border-radius: var(--radius-sm);
      span { font-size: 14px; color: var(--text-primary); }
    }

    .dialog-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
    }

    .alarm-dialog {
      width: 90%; max-width: 600px;
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .dialog-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    }

    .dialog-content { padding: 20px; }

    .alarm-image {
      margin-bottom: 20px;
      img { width: 100%; border-radius: var(--radius-sm); }
    }

    .alarm-details { display: flex; flex-direction: column; gap: 12px; }

    .detail-row {
      display: flex; gap: 12px;
      &.full { flex-direction: column; }
      .detail-label { width: 100px; font-size: 13px; color: var(--text-tertiary); }
      .detail-value { flex: 1; font-size: 14px; color: var(--text-primary); }
    }

    .dialog-actions {
      display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 20px; border-top: 1px solid var(--glass-border);
    }
  `]
})
export class AdminAlarmsComponent implements OnInit, OnDestroy {
  alarmService = inject(AlarmService);
  private dialog = inject(MatDialog);

  loading = signal(true);
  filterStatus = '';
  filterType = '';
  selectAll = false;
  selectedAlarm = signal<Alarm | null>(null);

  private _selectedIds = signal<Set<string>>(new Set());
  selectedIds = this._selectedIds.asReadonly();

  // Computed filtered alarms
  filteredAlarms = computed(() => {
    let alarms = this.alarmService.alarms();

    if (this.filterStatus) {
      alarms = alarms.filter(a => a.status === this.filterStatus);
    }
    if (this.filterType) {
      alarms = alarms.filter(a => a.alarm_type === this.filterType);
    }

    return alarms;
  });

  // Get unique alarm types
  alarmTypes = computed(() => {
    const types = new Set(this.alarmService.alarms().map(a => a.alarm_type));
    return Array.from(types).sort();
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    // AlarmService is a singleton, no need to disconnect
  }

  loadData() {
    this.loading.set(true);
    this.alarmService.loadAlarms();
    this.alarmService.loadStats();

    // Set loading to false after data loads
    setTimeout(() => this.loading.set(false), 500);
  }

  refresh() {
    this.loadData();
  }

  applyFilter() {
    // Filters are applied automatically via computed signal
  }

  getSeverity(alarmType: string) {
    return getAlarmSeverity(alarmType);
  }

  getImageUrl(alarm: Alarm | undefined | null): string | null {
    return getBestAlarmImageUrl(alarm);
  }

  fmtDate(d: string | undefined | null) { return formatDate(d); }
  fmtTime(d: string | undefined | null) { return formatTime(d); }
  fmtDateTime(d: string | undefined | null) { return formatDateTime(d); }

  toggleSelect(id: string) {
    this._selectedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  toggleSelectAll() {
    if (this.selectAll) {
      const allIds = new Set(this.filteredAlarms().map(a => a.id));
      this._selectedIds.set(allIds);
    } else {
      this._selectedIds.set(new Set());
    }
  }

  viewAlarm(alarm: Alarm) {
    this.selectedAlarm.set(alarm);
  }

  closeDialog() {
    this.selectedAlarm.set(null);
  }

  async acknowledgeAlarm(alarm: Alarm) {
    try {
      await this.alarmService.acknowledgeAlarm(alarm.id);
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  }

  async resolveAlarm(alarm: Alarm) {
    try {
      await this.alarmService.resolveAlarm(alarm.id);
    } catch (err) {
      console.error('Failed to resolve alarm:', err);
    }
  }

  async deleteAlarm(alarm: Alarm) {
    if (confirm('Delete this alarm?')) {
      try {
        await this.alarmService.deleteAlarm(alarm.id);
      } catch (err) {
        console.error('Failed to delete alarm:', err);
      }
    }
  }

  async bulkAcknowledge() {
    try {
      await this.alarmService.bulkAcknowledge(Array.from(this.selectedIds()));
      this._selectedIds.set(new Set());
      this.selectAll = false;
    } catch (err) {
      console.error('Failed to bulk acknowledge:', err);
    }
  }

  async bulkResolve() {
    try {
      await this.alarmService.bulkResolve(Array.from(this.selectedIds()));
      this._selectedIds.set(new Set());
      this.selectAll = false;
    } catch (err) {
      console.error('Failed to bulk resolve:', err);
    }
  }

  exportAlarms() {
    const alarms = this.filteredAlarms();
    const csv = [
      ['Time', 'Type', 'Camera', 'Status', 'Confidence', 'Location'].join(','),
      ...alarms.map(a => [
        a.alarm_time,
        a.alarm_type,
        a.camera_name || '',
        a.status,
        a.confidence ? (a.confidence * 100).toFixed(1) + '%' : '',
        a.location || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alarms-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
