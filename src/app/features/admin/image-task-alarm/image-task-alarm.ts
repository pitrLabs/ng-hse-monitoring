import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface ImageAlarm {
  id: string;
  taskName: string;
  alarmType: string;
  timestamp: string;
  imageUrl: string;
  confidence: number;
  location: string;
  status: 'new' | 'reviewed' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Component({
  selector: 'app-admin-image-task-alarm',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="image-task-alarm-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Image Task Alarms</h2>
          <p class="subtitle">View and manage alarms captured from image analysis tasks</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="exportAlarms()">
            <mat-icon>download</mat-icon>
            Export
          </button>
          <button class="action-btn secondary" (click)="markAllReviewed()">
            <mat-icon>done_all</mat-icon>
            Mark All Reviewed
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <mat-icon>photo_camera</mat-icon>
          <div class="stat-info">
            <span class="value">{{ alarms().length }}</span>
            <span class="label">Total Alarms</span>
          </div>
        </div>
        <div class="stat-card new">
          <mat-icon>fiber_new</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('new') }}</span>
            <span class="label">New</span>
          </div>
        </div>
        <div class="stat-card critical">
          <mat-icon>priority_high</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountBySeverity('critical') }}</span>
            <span class="label">Critical</span>
          </div>
        </div>
        <div class="stat-card reviewed">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('reviewed') }}</span>
            <span class="label">Reviewed</span>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Search alarms..." (input)="filterAlarms()">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filterType" (change)="filterAlarms()">
            <option value="">All Types</option>
            @for (type of alarmTypes; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
          <select [(ngModel)]="filterSeverity" (change)="filterAlarms()">
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select [(ngModel)]="filterStatus" (change)="filterAlarms()">
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div class="alarms-grid">
        @for (alarm of filteredAlarms(); track alarm.id) {
          <div class="alarm-card" [class]="alarm.severity" [class.new]="alarm.status === 'new'">
            <div class="alarm-image">
              <div class="image-placeholder">
                <mat-icon>image</mat-icon>
              </div>
              <span class="severity-badge" [class]="alarm.severity">{{ alarm.severity }}</span>
              @if (alarm.status === 'new') {
                <span class="new-badge">NEW</span>
              }
            </div>
            <div class="alarm-content">
              <div class="alarm-header">
                <h4>{{ alarm.alarmType }}</h4>
                <span class="confidence">{{ alarm.confidence }}%</span>
              </div>
              <div class="alarm-meta">
                <div class="meta-item">
                  <mat-icon>assignment</mat-icon>
                  <span>{{ alarm.taskName }}</span>
                </div>
                <div class="meta-item">
                  <mat-icon>location_on</mat-icon>
                  <span>{{ alarm.location }}</span>
                </div>
                <div class="meta-item">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ alarm.timestamp }}</span>
                </div>
              </div>
            </div>
            <div class="alarm-actions">
              <button mat-icon-button (click)="viewDetails(alarm)" matTooltip="View Details">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button (click)="markReviewed(alarm)" [disabled]="alarm.status === 'reviewed'" matTooltip="Mark Reviewed">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button (click)="dismissAlarm(alarm)" matTooltip="Dismiss">
                <mat-icon>close</mat-icon>
              </button>
              <button mat-icon-button (click)="downloadImage(alarm)" matTooltip="Download">
                <mat-icon>download</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>

      @if (filteredAlarms().length === 0) {
        <div class="empty-state">
          <mat-icon>photo_camera_front</mat-icon>
          <h3>No alarms found</h3>
          <p>No image task alarms match your current filters</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-task-alarm-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.new mat-icon { color: #3b82f6; }
    .stat-card.critical mat-icon { color: #ef4444; }
    .stat-card.reviewed mat-icon { color: #22c55e; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; flex: 1; max-width: 400px; }
    .search-box mat-icon { color: var(--text-muted); font-size: 20px; width: 20px; height: 20px; }
    .search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 14px; }
    .filter-group { display: flex; gap: 12px; }
    .filter-group select { padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; cursor: pointer; }

    .alarms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .alarm-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; transition: all 0.2s; }
    .alarm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .alarm-card.new { border-color: rgba(59, 130, 246, 0.5); }
    .alarm-card.critical { border-left: 4px solid #ef4444; }
    .alarm-card.high { border-left: 4px solid #f59e0b; }
    .alarm-card.medium { border-left: 4px solid #3b82f6; }
    .alarm-card.low { border-left: 4px solid #22c55e; }

    .alarm-image { position: relative; height: 160px; background: rgba(0,0,0,0.2); }
    .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .image-placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); }
    .severity-badge { position: absolute; top: 12px; left: 12px; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .severity-badge.critical { background: rgba(239, 68, 68, 0.9); color: white; }
    .severity-badge.high { background: rgba(245, 158, 11, 0.9); color: white; }
    .severity-badge.medium { background: rgba(59, 130, 246, 0.9); color: white; }
    .severity-badge.low { background: rgba(34, 197, 94, 0.9); color: white; }
    .new-badge { position: absolute; top: 12px; right: 12px; padding: 4px 10px; background: #3b82f6; border-radius: 6px; font-size: 10px; font-weight: 600; color: white; }

    .alarm-content { padding: 16px; }
    .alarm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .alarm-header h4 { margin: 0; font-size: 15px; color: var(--text-primary); }
    .confidence { padding: 4px 10px; background: rgba(0, 212, 255, 0.1); color: var(--accent-primary); font-size: 12px; font-weight: 600; border-radius: 6px; }

    .alarm-meta { display: flex; flex-direction: column; gap: 6px; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
    .meta-item mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .alarm-actions { display: flex; justify-content: flex-end; gap: 4px; padding: 12px 16px; border-top: 1px solid var(--glass-border); }
    .alarm-actions button { color: var(--text-secondary); width: 36px; height: 36px; }
    .alarm-actions button mat-icon { font-size: 18px; }

    .empty-state { text-align: center; padding: 60px 20px; background: var(--glass-bg); border-radius: 16px; border: 1px solid var(--glass-border); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 16px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty-state p { margin: 0; color: var(--text-muted); }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminImageTaskAlarmComponent {
  searchQuery = '';
  filterType = '';
  filterSeverity = '';
  filterStatus = '';
  alarmTypes = ['PPE Violation', 'Intrusion Detected', 'Fire Detection', 'Smoke Detected', 'Person Detected', 'Vehicle Detected'];

  alarms = signal<ImageAlarm[]>([
    { id: '1', taskName: 'PPE Detection Task', alarmType: 'PPE Violation', timestamp: '2024-01-15 14:32:15', imageUrl: '', confidence: 92, location: 'Production Floor', status: 'new', severity: 'high' },
    { id: '2', taskName: 'Zone Monitoring', alarmType: 'Intrusion Detected', timestamp: '2024-01-15 14:28:00', imageUrl: '', confidence: 88, location: 'Restricted Area B', status: 'new', severity: 'critical' },
    { id: '3', taskName: 'Fire Detection Task', alarmType: 'Smoke Detected', timestamp: '2024-01-15 14:15:22', imageUrl: '', confidence: 75, location: 'Storage Room', status: 'reviewed', severity: 'medium' },
    { id: '4', taskName: 'PPE Detection Task', alarmType: 'PPE Violation', timestamp: '2024-01-15 13:45:10', imageUrl: '', confidence: 95, location: 'Main Entrance', status: 'reviewed', severity: 'high' },
    { id: '5', taskName: 'Vehicle Detection', alarmType: 'Vehicle Detected', timestamp: '2024-01-15 13:30:00', imageUrl: '', confidence: 98, location: 'Loading Dock', status: 'dismissed', severity: 'low' },
    { id: '6', taskName: 'Zone Monitoring', alarmType: 'Person Detected', timestamp: '2024-01-15 13:00:00', imageUrl: '', confidence: 85, location: 'After Hours Zone', status: 'new', severity: 'medium' }
  ]);

  filteredAlarms = signal<ImageAlarm[]>(this.alarms());

  getCountByStatus(status: string): number { return this.alarms().filter(a => a.status === status).length; }
  getCountBySeverity(severity: string): number { return this.alarms().filter(a => a.severity === severity).length; }

  filterAlarms() {
    let result = this.alarms();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(a => a.alarmType.toLowerCase().includes(q) || a.taskName.toLowerCase().includes(q) || a.location.toLowerCase().includes(q));
    }
    if (this.filterType) result = result.filter(a => a.alarmType === this.filterType);
    if (this.filterSeverity) result = result.filter(a => a.severity === this.filterSeverity);
    if (this.filterStatus) result = result.filter(a => a.status === this.filterStatus);
    this.filteredAlarms.set(result);
  }

  exportAlarms() { console.log('Exporting alarms...'); }
  markAllReviewed() { this.alarms.update(a => a.map(x => ({ ...x, status: 'reviewed' as const }))); this.filterAlarms(); }
  viewDetails(alarm: ImageAlarm) { console.log('Viewing alarm:', alarm.id); }
  markReviewed(alarm: ImageAlarm) { alarm.status = 'reviewed'; this.filterAlarms(); }
  dismissAlarm(alarm: ImageAlarm) { alarm.status = 'dismissed'; this.filterAlarms(); }
  downloadImage(alarm: ImageAlarm) { console.log('Downloading image for:', alarm.id); }
}
