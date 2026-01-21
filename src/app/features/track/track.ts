import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Device {
  id: number;
  name: string;
  online: boolean;
}

interface DeviceGroup {
  id: number;
  name: string;
  expanded: boolean;
  devices: Device[];
}

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule
  ],
  template: `
    <div class="track-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="panel-header">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search device by ID..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-icon-button matTooltip="Refresh" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <!-- Tabs for Device/User List -->
        <mat-tab-group class="list-tabs">
          <mat-tab label="Device List">
            <div class="tab-content">
              <mat-checkbox [(ngModel)]="deviceOnlineOnly" color="primary" class="filter-checkbox">
                Online Only
              </mat-checkbox>
              <div class="device-tree">
                @for (group of deviceGroups(); track group.id) {
                  <div class="tree-node">
                    <div class="node-header" (click)="toggleGroup(group)">
                      <mat-icon class="expand-icon" [class.expanded]="group.expanded">chevron_right</mat-icon>
                      <mat-icon class="folder-icon">folder</mat-icon>
                      <span class="node-name">{{ group.name }}</span>
                    </div>
                    @if (group.expanded) {
                      <div class="node-children">
                        @for (device of getFilteredDevices(group); track device.id) {
                          <div class="device-item" [class.selected]="isDeviceSelected(device)" (click)="toggleDeviceSelection(device)">
                            <mat-checkbox [checked]="isDeviceSelected(device)" (click)="$event.stopPropagation()"></mat-checkbox>
                            <mat-icon class="device-icon" [class.online]="device.online">gps_fixed</mat-icon>
                            <span class="device-name">{{ device.name }}</span>
                            <span class="status-dot" [class.online]="device.online"></span>
                          </div>
                        }
                      </div>
                    }
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
                  <div class="user-item" [class.selected]="isUserSelected(user)" (click)="toggleUserSelection(user)">
                    <mat-checkbox [checked]="isUserSelected(user)" (click)="$event.stopPropagation()"></mat-checkbox>
                    <mat-icon class="user-icon" [class.online]="user.online">person_pin</mat-icon>
                    <span class="user-name">{{ user.name }}</span>
                    <span class="status-dot" [class.online]="user.online"></span>
                  </div>
                }
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>

        <!-- Base Station Toggle -->
        <div class="base-station-toggle">
          <mat-checkbox [(ngModel)]="showBaseStation" color="primary">
            Show Base Station Position
          </mat-checkbox>
        </div>

        <!-- Time Range -->
        <div class="time-range">
          <div class="date-row">
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate">
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate">
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>
          <div class="action-row">
            <button mat-button class="query-btn" (click)="queryTrack()">
              <mat-icon>search</mat-icon>
              Query
            </button>
            <button mat-button class="open-btn" (click)="openHistory()">
              <mat-icon>history</mat-icon>
              Open
            </button>
          </div>
        </div>
      </div>

      <!-- Map Area -->
      <div class="map-area glass-card-static">
        <div class="map-toolbar">
          <div class="toolbar-left">
            <button mat-icon-button matTooltip="Zoom In">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Zoom Out">
              <mat-icon>remove</mat-icon>
            </button>
            <div class="divider"></div>
            <button mat-icon-button matTooltip="Play Track" [disabled]="!hasTrackData()">
              <mat-icon>play_arrow</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Pause" [disabled]="!hasTrackData()">
              <mat-icon>pause</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Stop" [disabled]="!hasTrackData()">
              <mat-icon>stop</mat-icon>
            </button>
          </div>
          <div class="toolbar-right">
            <span class="track-info" *ngIf="hasTrackData()">
              Track Points: {{ trackPoints().length }}
            </span>
          </div>
        </div>

        <div class="map-content">
          <div class="map-placeholder">
            <mat-icon>route</mat-icon>
            <span>Track View</span>
            <span class="hint">Select devices and query to view track history</span>
          </div>
        </div>

        <!-- Track Timeline -->
        @if (hasTrackData()) {
          <div class="track-timeline">
            <div class="timeline-bar">
              <div class="timeline-progress" [style.width.%]="playProgress()"></div>
            </div>
            <div class="timeline-info">
              <span>{{ currentTime() }}</span>
              <span>{{ totalDuration() }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .track-container {
      display: grid;
      grid-template-columns: 320px 1fr;
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

    .panel-header {
      display: flex;
      gap: 8px;
    }

    .search-box {
      flex: 1;
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

    // Tabs
    .list-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
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

    .device-tree, .user-list {
      flex: 1;
      overflow-y: auto;
    }

    .tree-node {
      margin-bottom: 2px;
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--glass-bg-hover);
      }
    }

    .expand-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);
      transition: transform 0.2s;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .folder-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--warning);
    }

    .node-name {
      font-size: 12px;
      color: var(--text-primary);
    }

    .node-children {
      padding-left: 24px;
    }

    .device-item, .user-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
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
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--text-tertiary);

      &.online {
        color: var(--success);
      }
    }

    .device-name, .user-name {
      flex: 1;
      font-size: 11px;
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

    // Base Station
    .base-station-toggle {
      padding: 8px 0;
      border-top: 1px solid var(--glass-border);

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    // Time Range
    .time-range {
      padding-top: 12px;
      border-top: 1px solid var(--glass-border);
    }

    .date-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .date-field {
      flex: 1;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        padding: 0 8px;
      }

      ::ng-deep input {
        font-size: 12px;
      }
    }

    .action-row {
      display: flex;
      gap: 8px;
    }

    .query-btn, .open-btn {
      flex: 1;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

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

    .query-btn {
      background: var(--accent-primary);
      border-color: var(--accent-primary);
      color: white;

      &:hover {
        background: var(--accent-primary);
        opacity: 0.9;
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
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .toolbar-left {
      display: flex;
      gap: 4px;

      button {
        color: var(--text-secondary);

        &:hover:not([disabled]) {
          color: var(--accent-primary);
        }

        &[disabled] {
          opacity: 0.5;
        }
      }
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--glass-border);
      margin: 0 8px;
    }

    .track-info {
      font-size: 12px;
      color: var(--text-secondary);
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
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(124, 58, 237, 0.05));

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

    // Timeline
    .track-timeline {
      padding: 16px;
      border-top: 1px solid var(--glass-border);
    }

    .timeline-bar {
      height: 4px;
      background: var(--glass-bg);
      border-radius: 2px;
      overflow: hidden;
    }

    .timeline-progress {
      height: 100%;
      background: var(--accent-gradient);
      transition: width 0.1s;
    }

    .timeline-info {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 11px;
      color: var(--text-tertiary);
    }

    @media (max-width: 900px) {
      .track-container {
        grid-template-columns: 1fr;
        grid-template-rows: 350px 1fr;
      }
    }
  `]
})
export class TrackComponent {
  searchQuery = '';
  deviceOnlineOnly = false;
  userOnlineOnly = false;
  showBaseStation = false;
  startDate: Date | null = null;
  endDate: Date | null = null;

  selectedDevices = signal<number[]>([]);
  selectedUsers = signal<number[]>([]);
  trackPoints = signal<any[]>([]);
  playProgress = signal(0);
  currentTime = signal('00:00:00');
  totalDuration = signal('00:00:00');

  deviceGroups = signal<DeviceGroup[]>([
    {
      id: 1,
      name: 'Vehicles',
      expanded: true,
      devices: [
        { id: 1, name: 'Vehicle 001', online: true },
        { id: 2, name: 'Vehicle 002', online: true },
        { id: 3, name: 'Vehicle 003', online: false }
      ]
    },
    {
      id: 2,
      name: 'Personnel',
      expanded: false,
      devices: [
        { id: 4, name: 'Radio 001', online: true },
        { id: 5, name: 'Radio 002', online: false },
        { id: 6, name: 'Radio 003', online: true }
      ]
    }
  ]);

  users = signal([
    { id: 1, name: 'John Doe', online: true },
    { id: 2, name: 'Jane Smith', online: true },
    { id: 3, name: 'Bob Johnson', online: false },
    { id: 4, name: 'Alice Brown', online: true }
  ]);

  toggleGroup(group: DeviceGroup): void {
    group.expanded = !group.expanded;
  }

  getFilteredDevices(group: DeviceGroup): Device[] {
    let devices = group.devices;
    if (this.deviceOnlineOnly) {
      devices = devices.filter(d => d.online);
    }
    return devices;
  }

  isDeviceSelected(device: Device): boolean {
    return this.selectedDevices().includes(device.id);
  }

  toggleDeviceSelection(device: Device): void {
    const selected = this.selectedDevices();
    if (selected.includes(device.id)) {
      this.selectedDevices.set(selected.filter(id => id !== device.id));
    } else {
      this.selectedDevices.set([...selected, device.id]);
    }
  }

  isUserSelected(user: any): boolean {
    return this.selectedUsers().includes(user.id);
  }

  toggleUserSelection(user: any): void {
    const selected = this.selectedUsers();
    if (selected.includes(user.id)) {
      this.selectedUsers.set(selected.filter(id => id !== user.id));
    } else {
      this.selectedUsers.set([...selected, user.id]);
    }
  }

  hasTrackData(): boolean {
    return this.trackPoints().length > 0;
  }

  queryTrack(): void {
    console.log('Querying track data...');
  }

  openHistory(): void {
    console.log('Opening history...');
  }

  refresh(): void {
    console.log('Refreshing...');
  }
}
