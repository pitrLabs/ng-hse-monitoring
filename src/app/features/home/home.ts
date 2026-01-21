import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

interface Notification {
  id: number;
  message: string;
  location: string;
  time: string;
  type: 'warning' | 'error' | 'info';
}

interface DeviceStatus {
  online: number;
  offline: number;
}

interface AlarmData {
  date: string;
  count: number;
}

interface DeviceClass {
  name: string;
  online: number;
  offline: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="home-container">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Status Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>pie_chart</mat-icon>
            Status
          </h3>
          <div class="pie-chart-container">
            <svg viewBox="0 0 100 100" class="pie-chart">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--info)" stroke-width="20"
                [attr.stroke-dasharray]="getOnlineArc() + ' ' + getOfflineArc()"
                stroke-dashoffset="25" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--success)" stroke-width="20"
                [attr.stroke-dasharray]="getOfflineArc() + ' ' + getOnlineArc()"
                [attr.stroke-dashoffset]="25 - getOnlineArc()" />
            </svg>
            <div class="chart-center">
              <span class="total-count">{{ deviceStatus().online + deviceStatus().offline }}</span>
              <span class="total-label">Total</span>
            </div>
          </div>
          <div class="legend">
            <div class="legend-item">
              <span class="legend-color online"></span>
              <span class="legend-label">Online</span>
              <span class="legend-value">{{ deviceStatus().online }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color offline"></span>
              <span class="legend-label">Offline</span>
              <span class="legend-value">{{ deviceStatus().offline }}</span>
            </div>
          </div>
        </div>

        <!-- Alarm Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>show_chart</mat-icon>
            Alarm
          </h3>
          <div class="line-chart-container">
            <svg viewBox="0 0 300 150" class="line-chart" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="40" y2="120" stroke="var(--glass-border)" stroke-width="1"/>
              <line x1="40" y1="120" x2="290" y2="120" stroke="var(--glass-border)" stroke-width="1"/>
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <line [attr.x1]="40" [attr.y1]="20 + i * 25" [attr.x2]="290" [attr.y2]="20 + i * 25"
                  stroke="var(--glass-border)" stroke-width="0.5" stroke-dasharray="4"/>
              }
              <!-- Y-axis labels -->
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <text [attr.x]="35" [attr.y]="25 + i * 25" fill="var(--text-tertiary)" font-size="8" text-anchor="end">
                  {{ 50 - i * 12 }}
                </text>
              }
              <!-- Line path -->
              <path [attr.d]="getAlarmLinePath()" fill="none" stroke="var(--accent-primary)" stroke-width="2"/>
              <!-- Area fill -->
              <path [attr.d]="getAlarmAreaPath()" fill="url(#alarmGradient)" opacity="0.3"/>
              <!-- Gradient definition -->
              <defs>
                <linearGradient id="alarmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-primary)"/>
                  <stop offset="100%" stop-color="transparent"/>
                </linearGradient>
              </defs>
              <!-- Data points -->
              @for (point of alarmDataPoints(); track point.x; let i = $index) {
                <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" fill="var(--accent-primary)"/>
              }
              <!-- X-axis labels -->
              @for (data of alarmData(); track data.date; let i = $index) {
                <text [attr.x]="55 + i * 40" [attr.y]="135" fill="var(--text-tertiary)" font-size="7" text-anchor="middle">
                  {{ data.date }}
                </text>
              }
            </svg>
          </div>
        </div>

        <!-- Device Class Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>devices</mat-icon>
            Device Class
          </h3>
          <div class="bar-chart-container">
            @for (device of deviceClasses(); track device.name) {
              <div class="bar-row">
                <span class="bar-label">{{ device.name }}</span>
                <div class="bar-wrapper">
                  <div class="bar online" [style.width.%]="getBarWidth(device.online)"></div>
                  <div class="bar offline" [style.width.%]="getBarWidth(device.offline)"></div>
                </div>
                <span class="bar-total">{{ device.online + device.offline }}</span>
              </div>
            }
          </div>
          <div class="legend horizontal">
            <div class="legend-item">
              <span class="legend-color online"></span>
              <span class="legend-label">Online</span>
            </div>
            <div class="legend-item">
              <span class="legend-color offline"></span>
              <span class="legend-label">Offline</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Column -->
      <div class="center-column">
        <!-- Map Container -->
        <div class="map-container glass-card-static">
          <div class="map-toolbar-left">
            <button mat-icon-button class="map-tool-btn" matTooltip="Zoom In">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-icon-button class="map-tool-btn" matTooltip="Zoom Out">
              <mat-icon>remove</mat-icon>
            </button>
            <mat-divider></mat-divider>
            <button mat-icon-button class="map-tool-btn" matTooltip="Grouping">
              <mat-icon>workspaces</mat-icon>
            </button>
            <button mat-icon-button class="map-tool-btn" matTooltip="Classify">
              <mat-icon>category</mat-icon>
            </button>
            <button mat-icon-button class="map-tool-btn" matTooltip="Status">
              <mat-icon>visibility</mat-icon>
            </button>
            <div class="auto-label">Auto-Google</div>
          </div>

          <div class="map-toolbar-right">
            <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapToolsMenu">
              <mat-icon>build</mat-icon>
              Map Tools
            </button>
            <mat-menu #mapToolsMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>straighten</mat-icon>
                <span>Measure Distance</span>
              </button>
              <button mat-menu-item>
                <mat-icon>square_foot</mat-icon>
                <span>Measure Area</span>
              </button>
            </mat-menu>

            <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapTypeMenu">
              <mat-icon>layers</mat-icon>
              Map Type
            </button>
            <mat-menu #mapTypeMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>map</mat-icon>
                <span>Standard</span>
              </button>
              <button mat-menu-item>
                <mat-icon>satellite</mat-icon>
                <span>Satellite</span>
              </button>
              <button mat-menu-item>
                <mat-icon>terrain</mat-icon>
                <span>Terrain</span>
              </button>
            </mat-menu>
          </div>

          <div class="compass">
            <mat-icon>explore</mat-icon>
          </div>

          <div class="map-placeholder">
            <mat-icon>map</mat-icon>
            <span>Map View</span>
            <span class="map-hint">Interactive map will be displayed here</span>
          </div>
        </div>

        <!-- Video Preview Panel -->
        <div class="video-panel glass-card-static">
          <div class="video-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="video-cell">
                <div class="video-placeholder">
                  <mat-icon>videocam</mat-icon>
                  <span>Camera {{ i }}</span>
                </div>
                <div class="video-controls">
                  <button mat-icon-button class="video-ctrl-btn" matTooltip="Close">
                    <mat-icon>close</mat-icon>
                  </button>
                  <span class="video-empty-label">Empty</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <!-- Notify List -->
        <div class="widget notify-widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>notifications_active</mat-icon>
            Notify List
          </h3>
          <div class="notify-list">
            @for (notif of notifications(); track notif.id) {
              <div class="notify-item" [class]="notif.type">
                <div class="notify-icon">
                  <mat-icon>{{ getNotifyIcon(notif.type) }}</mat-icon>
                </div>
                <div class="notify-content">
                  <span class="notify-message">{{ notif.message }}</span>
                  <span class="notify-location">{{ notif.location }}</span>
                  <span class="notify-time">{{ notif.time }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: grid;
      grid-template-columns: 280px 1fr 300px;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    .left-column, .right-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .center-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    // Widget Base
    .widget {
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    // Pie Chart
    .pie-chart-container {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto 16px;
    }

    .pie-chart {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .chart-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      display: flex;
      flex-direction: column;
    }

    .total-count {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .total-label {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    // Legend
    .legend {
      display: flex;
      flex-direction: column;
      gap: 8px;

      &.horizontal {
        flex-direction: row;
        justify-content: center;
        gap: 20px;
      }
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;

      &.online {
        background: var(--info);
      }

      &.offline {
        background: var(--success);
      }
    }

    .legend-label {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .legend-value {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }

    // Line Chart
    .line-chart-container {
      width: 100%;
      height: 160px;
    }

    .line-chart {
      width: 100%;
      height: 100%;
    }

    // Bar Chart
    .bar-chart-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar-label {
      width: 60px;
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bar-wrapper {
      flex: 1;
      height: 16px;
      background: var(--glass-bg);
      border-radius: 4px;
      display: flex;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      transition: width 0.3s ease;

      &.online {
        background: var(--info);
      }

      &.offline {
        background: var(--success);
      }
    }

    .bar-total {
      width: 24px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
    }

    // Map Container
    .map-container {
      flex: 1;
      min-height: 300px;
      position: relative;
      overflow: hidden;
    }

    .map-toolbar-left {
      position: absolute;
      left: 12px;
      top: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 10;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 4px;

      mat-divider {
        margin: 4px 0;
        border-color: var(--glass-border);
      }
    }

    .map-tool-btn {
      width: 32px;
      height: 32px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--accent-primary);
        background: var(--glass-bg-hover);
      }
    }

    .auto-label {
      font-size: 9px;
      color: var(--text-tertiary);
      text-align: center;
      padding: 4px;
    }

    .map-toolbar-right {
      position: absolute;
      right: 12px;
      top: 12px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }

    .map-menu-btn {
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      font-size: 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
      }
    }

    .compass {
      position: absolute;
      right: 12px;
      bottom: 60px;
      width: 40px;
      height: 40px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-primary);
      }
    }

    .map-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-tertiary);
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(124, 58, 237, 0.05));

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      span {
        font-size: 14px;
      }

      .map-hint {
        font-size: 12px;
        opacity: 0.7;
      }
    }

    // Video Panel
    .video-panel {
      height: 200px;
      padding: 8px;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      height: 100%;
    }

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      position: relative;
      overflow: hidden;
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      span {
        font-size: 11px;
      }
    }

    .video-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    }

    .video-ctrl-btn {
      width: 24px;
      height: 24px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .video-empty-label {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    // Notify Widget
    .notify-widget {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .notify-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notify-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      border-left: 3px solid;

      &.warning {
        border-color: var(--warning);
        .notify-icon { color: var(--warning); }
      }

      &.error {
        border-color: var(--error);
        .notify-icon { color: var(--error); }
      }

      &.info {
        border-color: var(--info);
        .notify-icon { color: var(--info); }
      }
    }

    .notify-icon {
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .notify-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notify-message {
      font-size: 12px;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .notify-location {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .notify-time {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    // Responsive
    @media (max-width: 1200px) {
      .home-container {
        grid-template-columns: 1fr;
        height: auto;
      }

      .left-column, .right-column {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .widget {
        flex: 1;
        min-width: 250px;
      }

      .notify-widget {
        width: 100%;
        max-height: 300px;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  deviceStatus = signal<DeviceStatus>({ online: 45, offline: 12 });

  alarmData = signal<AlarmData[]>([
    { date: '01/15', count: 12 },
    { date: '01/16', count: 28 },
    { date: '01/17', count: 18 },
    { date: '01/18', count: 35 },
    { date: '01/19', count: 22 },
    { date: '01/20', count: 15 }
  ]);

  deviceClasses = signal<DeviceClass[]>([
    { name: 'Camera', online: 24, offline: 3 },
    { name: 'Sensor', online: 18, offline: 5 },
    { name: 'Gateway', online: 8, offline: 2 },
    { name: 'Radio', online: 12, offline: 1 }
  ]);

  notifications = signal<Notification[]>([
    { id: 1, message: 'Motion detected in restricted area', location: 'Zone A - Camera 01', time: '2 min ago', type: 'warning' },
    { id: 2, message: 'Device connection lost', location: 'Sensor 05 - Building B', time: '5 min ago', type: 'error' },
    { id: 3, message: 'New device registered', location: 'Camera 12 - Gate C', time: '10 min ago', type: 'info' },
    { id: 4, message: 'Temperature threshold exceeded', location: 'Sensor 08 - Warehouse', time: '15 min ago', type: 'warning' },
    { id: 5, message: 'Battery low warning', location: 'Radio Unit 03', time: '20 min ago', type: 'warning' }
  ]);

  ngOnInit(): void {}

  getOnlineArc(): number {
    const status = this.deviceStatus();
    const total = status.online + status.offline;
    return (status.online / total) * 251.2; // 2 * PI * 40
  }

  getOfflineArc(): number {
    const status = this.deviceStatus();
    const total = status.online + status.offline;
    return (status.offline / total) * 251.2;
  }

  alarmDataPoints(): { x: number; y: number }[] {
    const data = this.alarmData();
    const maxCount = Math.max(...data.map(d => d.count));
    return data.map((d, i) => ({
      x: 55 + i * 40,
      y: 120 - (d.count / maxCount) * 100
    }));
  }

  getAlarmLinePath(): string {
    const points = this.alarmDataPoints();
    if (points.length === 0) return '';
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  getAlarmAreaPath(): string {
    const points = this.alarmDataPoints();
    if (points.length === 0) return '';
    const linePath = this.getAlarmLinePath();
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePath} L ${lastX} 120 L ${firstX} 120 Z`;
  }

  getBarWidth(value: number): number {
    const maxTotal = Math.max(...this.deviceClasses().map(d => d.online + d.offline));
    return (value / maxTotal) * 100;
  }

  getNotifyIcon(type: string): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }
}
