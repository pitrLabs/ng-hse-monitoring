import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-admin-statistics',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="admin-statistics">
      <div class="page-header">
        <h2>Statistics & Reports</h2>
        <div class="header-actions">
          <select [(ngModel)]="selectedPeriod" (change)="loadStats()">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button mat-stroked-button (click)="exportReport()">
            <mat-icon>download</mat-icon>
            Export Report
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon alarms">
            <mat-icon>notifications</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().totalAlarms }}</span>
            <span class="summary-label">Total Alarms</span>
            <span class="summary-trend up">+{{ stats().alarmsTrend }}%</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon resolved">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().resolvedAlarms }}</span>
            <span class="summary-label">Resolved</span>
            <span class="summary-trend up">{{ stats().resolvedRate }}%</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon cameras">
            <mat-icon>videocam</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().activeCameras }}/{{ stats().totalCameras }}</span>
            <span class="summary-label">Active Cameras</span>
            <span class="summary-trend">{{ stats().cameraUptime }}% uptime</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon tasks">
            <mat-icon>smart_toy</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().runningTasks }}</span>
            <span class="summary-label">Running AI Tasks</span>
            <span class="summary-trend">{{ stats().taskEfficiency }}% efficiency</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Alarms by Type</h3>
          </div>
          <div class="chart-body">
            @for (item of alarmsByType(); track item.type) {
              <div class="bar-item">
                <span class="bar-label">{{ item.type }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="item.percentage" [style.background]="item.color"></div>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>Alarms by Camera</h3>
          </div>
          <div class="chart-body">
            @for (item of alarmsByCamera(); track item.camera) {
              <div class="bar-item">
                <span class="bar-label">{{ item.camera }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="item.percentage" style="background: var(--accent-gradient)"></div>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="activity-card">
        <div class="activity-header">
          <h3>Recent Activity</h3>
        </div>
        <div class="activity-list">
          @for (activity of recentActivity(); track activity.id) {
            <div class="activity-item">
              <div class="activity-icon" [class]="activity.type">
                <mat-icon>{{ activity.icon }}</mat-icon>
              </div>
              <div class="activity-info">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-desc">{{ activity.description }}</span>
              </div>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-statistics { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
    }

    .header-actions {
      display: flex; gap: 12px;
      select {
        padding: 8px 16px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
      }
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .summary-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex; align-items: center; gap: 16px;
    }

    .summary-icon {
      width: 56px; height: 56px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: white; }

      &.alarms { background: linear-gradient(135deg, #ef4444, #b91c1c); }
      &.resolved { background: linear-gradient(135deg, #22c55e, #15803d); }
      &.cameras { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      &.tasks { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    }

    .summary-info { display: flex; flex-direction: column; }

    .summary-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
    .summary-label { font-size: 13px; color: var(--text-tertiary); }
    .summary-trend { font-size: 12px; color: var(--text-secondary); &.up { color: #22c55e; } }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .chart-card, .activity-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
    }

    .chart-header, .activity-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
    }

    .chart-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

    .bar-item { display: flex; align-items: center; gap: 12px; }
    .bar-label { width: 100px; font-size: 13px; color: var(--text-secondary); }
    .bar-container { flex: 1; height: 8px; background: var(--glass-border); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { width: 40px; text-align: right; font-weight: 600; color: var(--text-primary); }

    .activity-list { padding: 8px 0; }

    .activity-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      &:hover { background: var(--glass-bg-hover); }
    }

    .activity-icon {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: white; }

      &.alarm { background: #ef4444; }
      &.user { background: #3b82f6; }
      &.task { background: #a855f7; }
    }

    .activity-info { flex: 1; display: flex; flex-direction: column; }
    .activity-title { font-size: 14px; color: var(--text-primary); }
    .activity-desc { font-size: 12px; color: var(--text-tertiary); }
    .activity-time { font-size: 12px; color: var(--text-tertiary); }
  `]
})
export class AdminStatisticsComponent {
  selectedPeriod = 'today';

  stats = signal({
    totalAlarms: 156,
    alarmsTrend: 12,
    resolvedAlarms: 142,
    resolvedRate: 91,
    activeCameras: 7,
    totalCameras: 8,
    cameraUptime: 98,
    runningTasks: 12,
    taskEfficiency: 95
  });

  alarmsByType = signal([
    { type: 'No Helmet', count: 45, percentage: 100, color: '#ef4444' },
    { type: 'No Vest', count: 38, percentage: 84, color: '#f59e0b' },
    { type: 'Intrusion', count: 28, percentage: 62, color: '#3b82f6' },
    { type: 'Fire/Smoke', count: 12, percentage: 27, color: '#dc2626' },
    { type: 'Other', count: 33, percentage: 73, color: '#6b7280' }
  ]);

  alarmsByCamera = signal([
    { camera: 'Camera 01', count: 42, percentage: 100 },
    { camera: 'Camera 02', count: 38, percentage: 90 },
    { camera: 'Camera 03', count: 35, percentage: 83 },
    { camera: 'Camera 04', count: 28, percentage: 67 },
    { camera: 'Camera 05', count: 13, percentage: 31 }
  ]);

  recentActivity = signal([
    { id: 1, type: 'alarm', icon: 'warning', title: 'New Alarm', description: 'No helmet detected at Camera 01', time: '2 min ago' },
    { id: 2, type: 'user', icon: 'person', title: 'User Login', description: 'admin logged in from 192.168.1.100', time: '15 min ago' },
    { id: 3, type: 'task', icon: 'smart_toy', title: 'Task Started', description: 'AI Task "Helmet Detection" started', time: '1 hour ago' },
    { id: 4, type: 'alarm', icon: 'check', title: 'Alarm Resolved', description: 'Intrusion alert marked as resolved', time: '2 hours ago' }
  ]);

  loadStats() { console.log('Load stats for', this.selectedPeriod); }
  exportReport() { console.log('Export report'); }
}
