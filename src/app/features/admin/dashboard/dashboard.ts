import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription } from 'rxjs';
import { formatDateTime } from '../../../shared/utils/date.utils';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-dashboard">
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon users">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats().totalUsers }}</span>
              <span class="stat-label">Total Users</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon cameras">
              <mat-icon>videocam</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats().activeCameras }}</span>
              <span class="stat-label">Active Cameras</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon tasks">
              <mat-icon>smart_toy</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats().aiTasks }}</span>
              <span class="stat-label">AI Tasks</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon alarms">
              <mat-icon>notifications_active</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats().todayAlarms }}</span>
              <span class="stat-label">Today's Alarms</span>
            </div>
          </div>
        </div>

        <!-- Device Info -->
        <div class="section-grid">
          <div class="card device-card">
            <div class="card-header">
              <mat-icon>developer_board</mat-icon>
              <h3>Device Information</h3>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Device ID</span>
                <span class="value">{{ deviceInfo().deviceId }}</span>
              </div>
              <div class="info-row">
                <span class="label">System Version</span>
                <span class="value">{{ deviceInfo().systemVersion }}</span>
              </div>
              <div class="info-row">
                <span class="label">Temperature</span>
                <span class="value temp">{{ deviceInfo().temperature }}°C</span>
              </div>
              <div class="info-row">
                <span class="label">Disk Available</span>
                <span class="value">{{ (deviceInfo().diskAvailable / 1024).toFixed(1) }} GB</span>
              </div>
              <div class="info-row">
                <span class="label">Box Time</span>
                <span class="value">{{ currentTime() }}</span>
              </div>
            </div>
          </div>

          <div class="card status-card">
            <div class="card-header">
              <mat-icon>monitor_heart</mat-icon>
              <h3>System Status</h3>
            </div>
            <div class="card-body">
              <div class="status-item">
                <span class="status-label">Tasks</span>
                <div class="status-bar">
                  <div class="status-fill healthy" [style.width.%]="systemStatus().tasksHealthy"></div>
                </div>
                <span class="status-value">{{ systemStatus().tasksHealthy }}%</span>
              </div>
              <div class="status-item">
                <span class="status-label">Channels</span>
                <div class="status-bar">
                  <div class="status-fill healthy" [style.width.%]="systemStatus().channelsHealthy"></div>
                </div>
                <span class="status-value">{{ systemStatus().channelsHealthy }}%</span>
              </div>
              <div class="status-item">
                <span class="status-label">Upload</span>
                <div class="status-bar">
                  <div class="status-fill" [class.warning]="systemStatus().uploadHealthy < 80" [style.width.%]="systemStatus().uploadHealthy"></div>
                </div>
                <span class="status-value">{{ systemStatus().uploadHealthy }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Alarms -->
        <div class="card alarms-card">
          <div class="card-header">
            <mat-icon>notifications</mat-icon>
            <h3>Recent Alarms</h3>
          </div>
          <div class="card-body">
            <div class="alarms-list">
              @for (alarm of recentAlarms(); track alarm.id) {
                <div class="alarm-item" [class]="alarm.type">
                  <mat-icon>{{ alarm.icon }}</mat-icon>
                  <div class="alarm-info">
                    <span class="alarm-title">{{ alarm.title }}</span>
                    <span class="alarm-location">{{ alarm.location }}</span>
                  </div>
                  <span class="alarm-time">{{ alarm.time }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .stat-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: white;
      }

      &.users { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      &.cameras { background: linear-gradient(135deg, #22c55e, #15803d); }
      &.tasks { background: linear-gradient(135deg, #a855f7, #7e22ce); }
      &.alarms { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);

      mat-icon {
        color: var(--accent-primary);
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .card-body {
      padding: 20px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--glass-border);

      &:last-child { border-bottom: none; }

      .label {
        color: var(--text-tertiary);
        font-size: 14px;
      }

      .value {
        color: var(--text-primary);
        font-weight: 500;

        &.temp { color: var(--accent-primary); }
      }
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      &:last-child { margin-bottom: 0; }
    }

    .status-label {
      width: 80px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .status-bar {
      flex: 1;
      height: 8px;
      background: var(--glass-border);
      border-radius: 4px;
      overflow: hidden;
    }

    .status-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;

      &.healthy { background: linear-gradient(90deg, #22c55e, #16a34a); }
      &.warning { background: linear-gradient(90deg, #eab308, #ca8a04); }
    }

    .status-value {
      width: 50px;
      text-align: right;
      font-weight: 600;
      color: var(--text-primary);
    }

    .alarms-card {
      .alarms-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .alarm-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--glass-bg-hover);
        border-radius: var(--radius-sm);
        border-left: 3px solid;

        &.safety { border-color: #ef4444; mat-icon { color: #ef4444; } }
        &.intrusion { border-color: #f59e0b; mat-icon { color: #f59e0b; } }
        &.fire { border-color: #dc2626; mat-icon { color: #dc2626; } }
      }

      .alarm-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .alarm-title {
        font-weight: 500;
        color: var(--text-primary);
      }

      .alarm-location {
        font-size: 12px;
        color: var(--text-tertiary);
      }

      .alarm-time {
        font-size: 12px;
        color: var(--text-tertiary);
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  loading = signal(true);
  currentTime = signal('');

  stats = signal({
    totalUsers: 24,
    activeCameras: 8,
    aiTasks: 12,
    todayAlarms: 45
  });

  deviceInfo = signal({
    deviceId: 'BVT-AI-BOX-001',
    systemVersion: '2.5.1',
    temperature: 42.5,
    diskAvailable: 45632
  });

  systemStatus = signal({
    tasksHealthy: 85,
    channelsHealthy: 92,
    uploadHealthy: 78
  });

  recentAlarms = signal([
    { id: 1, title: 'No Helmet Detected', location: 'Camera 01 - Main Gate', type: 'safety', icon: 'warning', time: '2 min ago' },
    { id: 2, title: 'Intrusion Alert', location: 'Camera 03 - Loading Dock', type: 'intrusion', icon: 'security', time: '5 min ago' },
    { id: 3, title: 'No Reflective Vest', location: 'Camera 02 - Warehouse', type: 'safety', icon: 'warning', time: '12 min ago' }
  ]);

  ngOnInit() {
    this.updateTime();
    const timeSub = interval(1000).subscribe(() => this.updateTime());
    this.subscriptions.push(timeSub);

    setTimeout(() => this.loading.set(false), 500);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateTime() {
    this.currentTime.set(formatDateTime(new Date()));
  }
}
