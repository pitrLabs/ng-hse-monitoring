import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

interface EventItem {
  id: number;
  time: string;
  device: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTabsModule,
    MatTooltipModule
  ],
  template: `
    <div class="event-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="search-section">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search name/device ID..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-button class="query-btn">
            <mat-icon>search</mat-icon>
            Query
          </button>
          <button mat-button class="detail-btn">
            <mat-icon>info</mat-icon>
            Detail
          </button>
        </div>

        <!-- Device/User Tabs -->
        <mat-tab-group class="list-tabs">
          <mat-tab label="Device List">
            <div class="tab-content">
              <mat-checkbox [(ngModel)]="deviceOnlineOnly" color="primary" class="filter-checkbox">
                Online Only
              </mat-checkbox>
              <div class="device-list">
                @for (device of devices(); track device.id) {
                  <div class="device-item" [class.selected]="selectedDevice()?.id === device.id" (click)="selectDevice(device)">
                    <mat-icon class="device-icon" [class.online]="device.online">sensors</mat-icon>
                    <span class="device-name">{{ device.name }}</span>
                    <span class="status-dot" [class.online]="device.online"></span>
                  </div>
                }
              </div>
            </div>
          </mat-tab>
          <mat-tab label="User List">
            <div class="tab-content">
              <mat-checkbox [(ngModel)]="userOnlineOnly" color="primary" class="filter-checkbox">
                Online Only
              </mat-checkbox>
              <div class="user-list">
                @for (user of users(); track user.id) {
                  <div class="user-item">
                    <mat-icon class="user-icon" [class.online]="user.online">person</mat-icon>
                    <span class="user-name">{{ user.name }}</span>
                    <span class="status-dot" [class.online]="user.online"></span>
                  </div>
                }
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-card glass-card-static">
            <div class="stat-header">
              <span>Alarms This Week</span>
              <mat-icon>calendar_today</mat-icon>
            </div>
            <span class="stat-value">{{ weeklyAlarms() }}</span>
          </div>
          <div class="stat-card glass-card-static">
            <div class="stat-header">
              <span>Alarms This Month</span>
              <mat-icon>date_range</mat-icon>
            </div>
            <span class="stat-value">{{ monthlyAlarms() }}</span>
          </div>
        </div>

        <!-- Chart Section -->
        <div class="chart-section glass-card-static">
          <h3 class="section-title">Alarm Trend</h3>
          <div class="line-chart">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none">
              <!-- Grid -->
              <line x1="50" y1="20" x2="50" y2="170" stroke="var(--glass-border)" stroke-width="1"/>
              <line x1="50" y1="170" x2="580" y2="170" stroke="var(--glass-border)" stroke-width="1"/>
              @for (i of [0,1,2,3,4]; track i) {
                <line [attr.x1]="50" [attr.y1]="20 + i * 37.5" [attr.x2]="580" [attr.y2]="20 + i * 37.5"
                  stroke="var(--glass-border)" stroke-width="0.5" stroke-dasharray="4"/>
                <text [attr.x]="45" [attr.y]="25 + i * 37.5" fill="var(--text-tertiary)" font-size="10" text-anchor="end">
                  {{ 40 - i * 10 }}
                </text>
              }
              <!-- Line -->
              <path [attr.d]="getChartPath()" fill="none" stroke="var(--accent-primary)" stroke-width="2"/>
              <path [attr.d]="getChartAreaPath()" fill="url(#eventGradient)" opacity="0.3"/>
              <defs>
                <linearGradient id="eventGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-primary)"/>
                  <stop offset="100%" stop-color="transparent"/>
                </linearGradient>
              </defs>
              <!-- X-axis labels -->
              @for (label of chartLabels(); track label; let i = $index) {
                <text [attr.x]="75 + i * 75" [attr.y]="185" fill="var(--text-tertiary)" font-size="10" text-anchor="middle">
                  {{ label }}
                </text>
              }
            </svg>
          </div>
        </div>

        <!-- Pie Charts -->
        <div class="pie-section">
          <div class="pie-card glass-card-static">
            <h4>Weekly Distribution</h4>
            <div class="pie-container">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--error)" stroke-width="20" stroke-dasharray="100 152" stroke-dashoffset="25"/>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--warning)" stroke-width="20" stroke-dasharray="80 172" stroke-dashoffset="-75"/>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--info)" stroke-width="20" stroke-dasharray="72 180" stroke-dashoffset="-155"/>
              </svg>
              <div class="pie-center">
                <span>{{ weeklyAlarms() }}</span>
                <span>Total</span>
              </div>
            </div>
            <div class="pie-legend">
              <div class="legend-item"><span class="dot high"></span>High (40%)</div>
              <div class="legend-item"><span class="dot medium"></span>Medium (32%)</div>
              <div class="legend-item"><span class="dot low"></span>Low (28%)</div>
            </div>
          </div>
          <div class="pie-card glass-card-static">
            <h4>Monthly Distribution</h4>
            <div class="pie-container">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--error)" stroke-width="20" stroke-dasharray="90 162" stroke-dashoffset="25"/>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--warning)" stroke-width="20" stroke-dasharray="85 167" stroke-dashoffset="-65"/>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--info)" stroke-width="20" stroke-dasharray="77 175" stroke-dashoffset="-150"/>
              </svg>
              <div class="pie-center">
                <span>{{ monthlyAlarms() }}</span>
                <span>Total</span>
              </div>
            </div>
            <div class="pie-legend">
              <div class="legend-item"><span class="dot high"></span>High (36%)</div>
              <div class="legend-item"><span class="dot medium"></span>Medium (34%)</div>
              <div class="legend-item"><span class="dot low"></span>Low (30%)</div>
            </div>
          </div>
        </div>

        <!-- Event Table -->
        <div class="event-table glass-card-static">
          <h3 class="section-title">Recent Events</h3>
          <div class="table-header">
            <span class="col-time">Time</span>
            <span class="col-device">Device</span>
            <span class="col-type">Type</span>
            <span class="col-action">Operation</span>
          </div>
          <div class="table-body">
            @for (event of events(); track event.id) {
              <div class="table-row">
                <span class="col-time">{{ event.time }}</span>
                <span class="col-device">{{ event.device }}</span>
                <span class="col-type">
                  <span class="type-badge" [class]="event.severity">{{ event.type }}</span>
                </span>
                <span class="col-action">
                  <button mat-icon-button matTooltip="View on Map">
                    <mat-icon>map</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Details">
                    <mat-icon>info</mat-icon>
                  </button>
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .event-container {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
      overflow: hidden;
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
      overflow: hidden;
    }

    .search-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-tertiary);
      }

      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 13px;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .query-btn, .detail-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
    }

    .query-btn {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
      color: white;
    }

    .list-tabs {
      flex: 1;
      overflow: hidden;

      ::ng-deep .mat-mdc-tab-body-wrapper {
        flex: 1;
      }
    }

    .tab-content {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 12px 0;
    }

    .filter-checkbox {
      margin-bottom: 8px;

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .device-list, .user-list {
      flex: 1;
      overflow-y: auto;
    }

    .device-item, .user-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .device-icon, .user-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);

      &.online {
        color: var(--success);
      }
    }

    .device-name, .user-name {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);

      &.online {
        background: var(--success);
      }
    }

    // Right Panel
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    // Stats Row
    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .stat-card {
      padding: 20px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      span {
        font-size: 13px;
        color: var(--text-secondary);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--accent-primary);
      }
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
    }

    // Chart Section
    .chart-section {
      padding: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
    }

    .line-chart {
      height: 200px;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    // Pie Section
    .pie-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .pie-card {
      padding: 20px;

      h4 {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 16px;
        text-align: center;
      }
    }

    .pie-container {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 16px;

      svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
    }

    .pie-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;

      span:first-child {
        display: block;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
      }

      span:last-child {
        font-size: 10px;
        color: var(--text-tertiary);
      }
    }

    .pie-legend {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-secondary);

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 2px;

        &.high { background: var(--error); }
        &.medium { background: var(--warning); }
        &.low { background: var(--info); }
      }
    }

    // Event Table
    .event-table {
      padding: 16px;
    }

    .table-header {
      display: flex;
      padding: 8px 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .table-body {
      max-height: 200px;
      overflow-y: auto;
    }

    .table-row {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid var(--glass-border);

      &:hover {
        background: var(--glass-bg);
      }
    }

    .col-time { width: 150px; font-size: 12px; color: var(--text-primary); }
    .col-device { flex: 1; font-size: 12px; color: var(--text-primary); }
    .col-type { width: 120px; }
    .col-action { width: 80px; }

    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;

      &.high {
        background: rgba(239, 68, 68, 0.15);
        color: var(--error);
      }

      &.medium {
        background: rgba(245, 158, 11, 0.15);
        color: var(--warning);
      }

      &.low {
        background: rgba(59, 130, 246, 0.15);
        color: var(--info);
      }
    }

    @media (max-width: 1100px) {
      .event-container {
        grid-template-columns: 1fr;
      }

      .left-panel {
        max-height: 250px;
      }
    }
  `]
})
export class EventComponent {
  searchQuery = '';
  deviceOnlineOnly = false;
  userOnlineOnly = false;

  selectedDevice = signal<any>(null);
  weeklyAlarms = signal(47);
  monthlyAlarms = signal(186);

  chartData = signal([15, 28, 22, 35, 18, 42, 25]);
  chartLabels = signal(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  devices = signal([
    { id: 1, name: 'Sensor 01', online: true },
    { id: 2, name: 'Sensor 02', online: true },
    { id: 3, name: 'Sensor 03', online: false },
    { id: 4, name: 'Camera 01', online: true },
    { id: 5, name: 'Camera 02', online: false }
  ]);

  users = signal([
    { id: 1, name: 'Admin', online: true },
    { id: 2, name: 'Operator 1', online: true }
  ]);

  events = signal<EventItem[]>([
    { id: 1, time: '2024-01-21 14:30', device: 'Sensor 01', type: 'Temperature Alert', severity: 'high' },
    { id: 2, time: '2024-01-21 14:15', device: 'Camera 01', type: 'Motion Detected', severity: 'medium' },
    { id: 3, time: '2024-01-21 13:45', device: 'Sensor 02', type: 'Battery Low', severity: 'low' },
    { id: 4, time: '2024-01-21 13:00', device: 'Camera 02', type: 'Connection Lost', severity: 'high' },
    { id: 5, time: '2024-01-21 12:30', device: 'Sensor 03', type: 'Maintenance Due', severity: 'low' }
  ]);

  selectDevice(device: any): void {
    this.selectedDevice.set(device);
  }

  getChartPath(): string {
    const data = this.chartData();
    const maxVal = Math.max(...data);
    const points = data.map((val, i) => {
      const x = 75 + i * 75;
      const y = 170 - (val / maxVal) * 150;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  }

  getChartAreaPath(): string {
    const data = this.chartData();
    const maxVal = Math.max(...data);
    const points = data.map((val, i) => {
      const x = 75 + i * 75;
      const y = 170 - (val / maxVal) * 150;
      return `${x},${y}`;
    });
    const lastX = 75 + (data.length - 1) * 75;
    return `M 75,170 L ${points.join(' L ')} L ${lastX},170 Z`;
  }
}
