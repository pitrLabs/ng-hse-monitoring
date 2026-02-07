import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlarmService } from '../../core/services/alarm.service';

interface AIDevice {
  id: number;
  name: string;
  online: boolean;
  type: string;
}

interface AIRule {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  alerts: number;
}

@Component({
  selector: 'app-smart-ai',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <!-- BM-APP Connection Warning -->
    @if (alarmService.connectionStatus() === 'disconnected') {
      <div class="connection-warning">
        <mat-icon>warning</mat-icon>
        <span>BM-APP connection lost. Trying to reconnect... Some AI features may be unavailable.</span>
      </div>
    }

    <div class="smart-ai-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search devices..." [(ngModel)]="searchQuery" class="search-input">
        </div>

        <mat-checkbox [(ngModel)]="onlineOnly" color="primary" class="filter-checkbox">
          Online Only
        </mat-checkbox>

        <div class="device-list">
          @for (device of filteredDevices(); track device.id) {
            <div class="device-item" [class.selected]="selectedDevice()?.id === device.id" (click)="selectDevice(device)">
              <mat-icon class="device-icon" [class.online]="device.online">
                {{ getDeviceIcon(device.type) }}
              </mat-icon>
              <span class="device-name">{{ device.name }}</span>
              <span class="status-dot" [class.online]="device.online"></span>
            </div>
          }
        </div>
      </div>

      <!-- Map Area -->
      <div class="map-area glass-card-static">
        <!-- Map Toolbar -->
        <div class="map-toolbar">
          <div class="toolbar-left">
            <button mat-icon-button matTooltip="Zoom In">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Zoom Out">
              <mat-icon>remove</mat-icon>
            </button>
            <div class="divider"></div>
            <button mat-icon-button matTooltip="Measure" [class.active]="activeTool() === 'ruler'" (click)="setTool('ruler')">
              <mat-icon>straighten</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Draw Rectangle" [class.active]="activeTool() === 'rectangle'" (click)="setTool('rectangle')">
              <mat-icon>crop_square</mat-icon>
            </button>
            <div class="divider"></div>
            <button mat-icon-button matTooltip="Import">
              <mat-icon>upload_file</mat-icon>
            </button>
          </div>

          <div class="toolbar-right">
            <button mat-button class="option-btn" [matMenuTriggerFor]="optionMenu">
              <mat-icon>settings</mat-icon>
              Options
            </button>
            <mat-menu #optionMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>build</mat-icon>
                <span>Map Tools</span>
              </button>
              <button mat-menu-item>
                <mat-icon>layers</mat-icon>
                <span>Map Type</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Map Content -->
        <div class="map-content">
          <div class="map-placeholder">
            <mat-icon>psychology</mat-icon>
            <span>Smart AI Map</span>
            <span class="hint">AI-powered detection and analysis zones</span>
          </div>

          <!-- Compass -->
          <div class="compass">
            <mat-icon>explore</mat-icon>
          </div>
        </div>
      </div>

      <!-- Right Panel - Details -->
      <div class="right-panel glass-card-static">
        <h3 class="panel-title">
          <mat-icon>psychology</mat-icon>
          AI Details
        </h3>

        @if (selectedDevice()) {
          <div class="device-info">
            <div class="info-header">
              <mat-icon>{{ getDeviceIcon(selectedDevice()!.type) }}</mat-icon>
              <span>{{ selectedDevice()!.name }}</span>
              <span class="status-badge" [class.online]="selectedDevice()!.online">
                {{ selectedDevice()!.online ? 'Online' : 'Offline' }}
              </span>
            </div>

            <div class="info-section">
              <h4>AI Rules</h4>
              <div class="rules-list">
                @for (rule of deviceRules(); track rule.id) {
                  <div class="rule-item">
                    <div class="rule-icon" [class]="rule.type">
                      <mat-icon>{{ getRuleIcon(rule.type) }}</mat-icon>
                    </div>
                    <div class="rule-info">
                      <span class="rule-name">{{ rule.name }}</span>
                      <span class="rule-status" [class]="rule.status">{{ rule.status }}</span>
                    </div>
                    @if (rule.alerts > 0) {
                      <span class="rule-alerts">{{ rule.alerts }}</span>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="info-section">
              <h4>Recent Detections</h4>
              <div class="detections-list">
                @for (detection of recentDetections(); track detection.id) {
                  <div class="detection-item">
                    <mat-icon [class]="detection.type">{{ detection.icon }}</mat-icon>
                    <div class="detection-info">
                      <span class="detection-label">{{ detection.label }}</span>
                      <span class="detection-time">{{ detection.time }}</span>
                    </div>
                    <span class="detection-confidence">{{ detection.confidence }}%</span>
                  </div>
                }
              </div>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>smart_toy</mat-icon>
            <span>Select a device to view AI details</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .connection-warning {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15));
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius-md);
      color: #f59e0b;
      animation: pulse-warning 2s infinite;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      span {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
      }
    }

    @keyframes pulse-warning {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .smart-ai-container {
      display: grid;
      grid-template-columns: 250px 1fr 320px;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
      overflow: hidden;
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

    .filter-checkbox {
      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .device-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
        border-left: 3px solid var(--accent-primary);
      }
    }

    .device-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);

      &.online {
        color: var(--success);
      }
    }

    .device-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);

      &.online {
        background: var(--success);
        box-shadow: 0 0 6px var(--success);
      }
    }

    // Map Area
    .map-area {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .map-toolbar {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .toolbar-left {
      display: flex;
      gap: 4px;
      align-items: center;

      button {
        color: var(--text-secondary);

        &.active {
          background: var(--accent-primary);
          color: white;
        }
      }
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--glass-border);
      margin: 0 8px;
    }

    .option-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    .map-content {
      flex: 1;
      position: relative;
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
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(0, 212, 255, 0.08));

      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
      }

      span {
        font-size: 16px;
      }

      .hint {
        font-size: 13px;
        opacity: 0.7;
      }
    }

    .compass {
      position: absolute;
      right: 12px;
      bottom: 12px;
      width: 48px;
      height: 48px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--accent-primary);
      }
    }

    // Right Panel
    .right-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      overflow: hidden;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--accent-secondary);
      }
    }

    .device-info {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .info-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-primary);
      }

      span:first-of-type {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        background: rgba(107, 114, 128, 0.2);
        color: var(--text-secondary);

        &.online {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
        }
      }
    }

    .info-section {
      h4 {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin: 0 0 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
    }

    .rule-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.intrusion {
        background: rgba(239, 68, 68, 0.15);
        mat-icon { color: var(--error); }
      }

      &.motion {
        background: rgba(245, 158, 11, 0.15);
        mat-icon { color: var(--warning); }
      }

      &.face {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.object {
        background: rgba(124, 58, 237, 0.15);
        mat-icon { color: var(--accent-secondary); }
      }
    }

    .rule-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .rule-name {
        font-size: 13px;
        color: var(--text-primary);
      }

      .rule-status {
        font-size: 11px;

        &.active { color: var(--success); }
        &.inactive { color: var(--text-muted); }
      }
    }

    .rule-alerts {
      padding: 2px 8px;
      background: var(--error);
      color: white;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .detections-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detection-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;

        &.person { color: var(--accent-primary); }
        &.vehicle { color: var(--warning); }
        &.alert { color: var(--error); }
      }

      .detection-info {
        flex: 1;
        display: flex;
        flex-direction: column;

        .detection-label {
          font-size: 12px;
          color: var(--text-primary);
        }

        .detection-time {
          font-size: 10px;
          color: var(--text-tertiary);
        }
      }

      .detection-confidence {
        font-size: 12px;
        font-weight: 600;
        color: var(--success);
      }
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      span {
        font-size: 13px;
        text-align: center;
      }
    }

    @media (max-width: 1100px) {
      .smart-ai-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
      }

      .left-panel {
        flex-direction: row;
        flex-wrap: wrap;

        .device-list {
          width: 100%;
          max-height: 150px;
          flex-direction: row;
          flex-wrap: wrap;
        }
      }

      .right-panel {
        max-height: 300px;
      }
    }
  `]
})
export class SmartAIComponent {
  alarmService = inject(AlarmService);

  searchQuery = '';
  onlineOnly = false;
  activeTool = signal<string | null>(null);
  selectedDevice = signal<AIDevice | null>(null);

  devices = signal<AIDevice[]>([
    { id: 1, name: 'AI Camera 01', online: true, type: 'camera' },
    { id: 2, name: 'AI Camera 02', online: true, type: 'camera' },
    { id: 3, name: 'AI Camera 03', online: false, type: 'camera' },
    { id: 4, name: 'AI Sensor 01', online: true, type: 'sensor' },
    { id: 5, name: 'AI Sensor 02', online: true, type: 'sensor' }
  ]);

  deviceRules = signal<AIRule[]>([
    { id: 1, name: 'Intrusion Detection', type: 'intrusion', status: 'active', alerts: 2 },
    { id: 2, name: 'Motion Analysis', type: 'motion', status: 'active', alerts: 0 },
    { id: 3, name: 'Face Recognition', type: 'face', status: 'active', alerts: 1 },
    { id: 4, name: 'Object Detection', type: 'object', status: 'inactive', alerts: 0 }
  ]);

  recentDetections = signal([
    { id: 1, label: 'Person detected', time: '2 min ago', confidence: 95, type: 'person', icon: 'person' },
    { id: 2, label: 'Vehicle entering', time: '5 min ago', confidence: 89, type: 'vehicle', icon: 'directions_car' },
    { id: 3, label: 'Unknown object', time: '12 min ago', confidence: 72, type: 'alert', icon: 'help' }
  ]);

  filteredDevices(): AIDevice[] {
    let devices = this.devices();
    if (this.onlineOnly) {
      devices = devices.filter(d => d.online);
    }
    if (this.searchQuery) {
      devices = devices.filter(d =>
        d.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    return devices;
  }

  selectDevice(device: AIDevice): void {
    this.selectedDevice.set(device);
  }

  setTool(tool: string): void {
    this.activeTool.set(this.activeTool() === tool ? null : tool);
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'camera': return 'videocam';
      case 'sensor': return 'sensors';
      default: return 'device_hub';
    }
  }

  getRuleIcon(type: string): string {
    switch (type) {
      case 'intrusion': return 'security';
      case 'motion': return 'directions_run';
      case 'face': return 'face';
      case 'object': return 'category';
      default: return 'rule';
    }
  }
}
