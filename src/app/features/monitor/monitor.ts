import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

interface Device {
  id: number;
  name: string;
  online: boolean;
  type: string;
}

interface DeviceGroup {
  id: number;
  name: string;
  expanded: boolean;
  devices: Device[];
}

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
    MatTabsModule
  ],
  template: `
    <div class="monitor-container">
      <!-- Top Bar -->
      <div class="top-bar glass-card-static">
        <div class="search-section">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search device name/ID..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-icon-button matTooltip="Refresh" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Add Device" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
          </button>
        </div>
        <div class="broadcast-section">
          <button mat-button class="broadcast-btn" [matMenuTriggerFor]="broadcastMenu">
            <mat-icon>campaign</mat-icon>
            Broadcast
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #broadcastMenu="matMenu" class="broadcast-panel">
            <div class="broadcast-content" (click)="$event.stopPropagation()">
              <div class="broadcast-tables">
                <div class="broadcast-table">
                  <h4>Filter Devices</h4>
                  <input type="text" placeholder="Search..." class="table-search">
                  <div class="table-list">
                    @for (device of allDevices(); track device.id) {
                      <div class="table-item">
                        <mat-checkbox></mat-checkbox>
                        <span>{{ device.name }}</span>
                      </div>
                    }
                  </div>
                </div>
                <div class="broadcast-table">
                  <h4>Selected Devices</h4>
                  <button mat-button class="table-action">Broadcast</button>
                  <div class="table-list">
                    <div class="empty-state">No devices selected</div>
                  </div>
                </div>
                <div class="broadcast-table">
                  <h4>Broadcast Results</h4>
                  <div class="table-list">
                    <div class="empty-state">No results yet</div>
                  </div>
                </div>
              </div>
            </div>
          </mat-menu>
        </div>
        <div class="top-actions">
          <button mat-icon-button matTooltip="Minimize">
            <mat-icon>remove</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Panel - Device Lists -->
        <div class="left-panel">
          <mat-tab-group>
            <mat-tab label="Device List">
              <div class="tab-content">
                <mat-checkbox [(ngModel)]="deviceOnlineOnly" color="primary" class="filter-checkbox">
                  Online Only
                </mat-checkbox>
                <div class="device-tree">
                  @for (group of filteredDeviceGroups(); track group.id) {
                    <div class="tree-node">
                      <div class="node-header" (click)="toggleGroup(group)">
                        <mat-icon class="expand-icon" [class.expanded]="group.expanded">
                          chevron_right
                        </mat-icon>
                        <mat-icon class="folder-icon">folder</mat-icon>
                        <span class="node-name">{{ group.name }}</span>
                      </div>
                      @if (group.expanded) {
                        <div class="node-children">
                          @for (device of getFilteredDevices(group); track device.id) {
                            <div class="device-item" (click)="selectDevice(device)" [class.selected]="isDeviceSelected(device)">
                              <mat-icon class="device-icon" [class.online]="device.online">
                                {{ getDeviceIcon(device.type) }}
                              </mat-icon>
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
                <div class="device-tree">
                  @for (user of users(); track user.id) {
                    <div class="user-item" [class.online]="user.online">
                      <mat-icon class="user-icon">person</mat-icon>
                      <span class="user-name">{{ user.name }}</span>
                      <span class="status-dot" [class.online]="user.online"></span>
                    </div>
                  }
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Center - Video Grid -->
        <div class="center-panel glass-card-static">
          <div class="video-controls">
            <div class="grid-selector">
              <button mat-icon-button [class.active]="gridLayout() === '1x1'" (click)="setGridLayout('1x1')" matTooltip="1x1">
                <mat-icon>crop_square</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '2x2'" (click)="setGridLayout('2x2')" matTooltip="2x2">
                <mat-icon>grid_view</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '3x3'" (click)="setGridLayout('3x3')" matTooltip="3x3">
                <mat-icon>apps</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '4x4'" (click)="setGridLayout('4x4')" matTooltip="4x4">
                <mat-icon>view_module</mat-icon>
              </button>
            </div>
            <button mat-icon-button matTooltip="Fullscreen">
              <mat-icon>fullscreen</mat-icon>
            </button>
            <button mat-button class="group-btn" [matMenuTriggerFor]="videoGroupMenu">
              <mat-icon>video_library</mat-icon>
              Video Group
            </button>
            <mat-menu #videoGroupMenu="matMenu">
              <button mat-menu-item>Group A</button>
              <button mat-menu-item>Group B</button>
              <button mat-menu-item>All Cameras</button>
            </mat-menu>
            <button mat-button class="clear-btn" (click)="clearAllWindows()">
              <mat-icon>clear_all</mat-icon>
              Clear Window
            </button>
          </div>

          <div class="video-grid" [class]="'grid-' + gridLayout()">
            @for (i of getGridCells(); track i) {
              <div class="video-cell">
                <div class="video-placeholder">
                  <mat-icon>videocam</mat-icon>
                  <span>Channel {{ i }}</span>
                </div>
                <div class="video-overlay">
                  <span class="channel-label">CH {{ i }}</span>
                  <button mat-icon-button class="cell-close-btn">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: calc(100vh - 118px);
    }

    // Top Bar
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      gap: 16px;
    }

    .search-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      width: 280px;

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

    .broadcast-section {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .broadcast-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
    }

    .broadcast-content {
      padding: 16px;
      min-width: 600px;
    }

    .broadcast-tables {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .broadcast-table {
      h4 {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 8px;
      }

      .table-search {
        width: 100%;
        padding: 6px 10px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-size: 12px;
        outline: none;
        margin-bottom: 8px;
      }

      .table-action {
        width: 100%;
        background: var(--accent-primary);
        color: white;
        margin-bottom: 8px;
      }

      .table-list {
        height: 150px;
        overflow-y: auto;
        background: var(--glass-bg);
        border-radius: var(--radius-sm);
        padding: 8px;
      }

      .table-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 12px;
        color: var(--text-secondary);
      }

      .empty-state {
        text-align: center;
        color: var(--text-muted);
        font-size: 12px;
        padding: 20px;
      }
    }

    .top-actions {
      display: flex;
      gap: 4px;
    }

    // Main Content
    .main-content {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 16px;
      overflow: hidden;
    }

    // Left Panel
    .left-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      overflow: hidden;

      ::ng-deep .mat-mdc-tab-header {
        background: var(--bg-secondary);
      }

      ::ng-deep .mat-mdc-tab-body-wrapper {
        flex: 1;
      }
    }

    .tab-content {
      padding: 12px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .filter-checkbox {
      margin-bottom: 12px;

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .device-tree {
      flex: 1;
      overflow-y: auto;
    }

    .tree-node {
      margin-bottom: 4px;
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
        background: rgba(0, 212, 255, 0.15);
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

    // Center Panel
    .center-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .video-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .grid-selector {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);

      button {
        width: 32px;
        height: 32px;
        color: var(--text-secondary);

        &.active {
          background: var(--accent-primary);
          color: white;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .group-btn, .clear-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      font-size: 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
    }

    .video-grid {
      flex: 1;
      display: grid;
      gap: 4px;
      padding: 8px;
      background: var(--bg-primary);

      &.grid-1x1 {
        grid-template-columns: 1fr;
      }

      &.grid-2x2 {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
      }

      &.grid-3x3 {
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
      }

      &.grid-4x4 {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
      }
    }

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: 4px;
      position: relative;
      overflow: hidden;
      min-height: 100px;
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-muted);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      span {
        font-size: 11px;
      }
    }

    .video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: linear-gradient(180deg, rgba(0,0,0,0.5), transparent);
    }

    .channel-label {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .cell-close-btn {
      width: 20px;
      height: 20px;
      opacity: 0.7;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        opacity: 1;
      }
    }

    @media (max-width: 900px) {
      .main-content {
        grid-template-columns: 1fr;
      }

      .left-panel {
        max-height: 250px;
      }
    }
  `]
})
export class MonitorComponent {
  searchQuery = '';
  deviceOnlineOnly = false;
  userOnlineOnly = false;
  gridLayout = signal('2x2');
  selectedDevices = signal<number[]>([]);

  deviceGroups = signal<DeviceGroup[]>([
    {
      id: 1,
      name: 'Building A',
      expanded: true,
      devices: [
        { id: 1, name: 'Camera 01', online: true, type: 'camera' },
        { id: 2, name: 'Camera 02', online: true, type: 'camera' },
        { id: 3, name: 'Camera 03', online: false, type: 'camera' }
      ]
    },
    {
      id: 2,
      name: 'Building B',
      expanded: false,
      devices: [
        { id: 4, name: 'Camera 04', online: true, type: 'camera' },
        { id: 5, name: 'Camera 05', online: false, type: 'camera' }
      ]
    },
    {
      id: 3,
      name: 'Warehouse',
      expanded: false,
      devices: [
        { id: 6, name: 'Camera 06', online: true, type: 'camera' },
        { id: 7, name: 'Camera 07', online: true, type: 'camera' }
      ]
    }
  ]);

  users = signal([
    { id: 1, name: 'Admin', online: true },
    { id: 2, name: 'Operator 1', online: true },
    { id: 3, name: 'Operator 2', online: false },
    { id: 4, name: 'Security', online: true }
  ]);

  allDevices() {
    return this.deviceGroups().flatMap(g => g.devices);
  }

  filteredDeviceGroups() {
    return this.deviceGroups();
  }

  getFilteredDevices(group: DeviceGroup) {
    let devices = group.devices;
    if (this.deviceOnlineOnly) {
      devices = devices.filter(d => d.online);
    }
    if (this.searchQuery) {
      devices = devices.filter(d =>
        d.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    return devices;
  }

  toggleGroup(group: DeviceGroup): void {
    group.expanded = !group.expanded;
  }

  selectDevice(device: Device): void {
    const selected = this.selectedDevices();
    if (selected.includes(device.id)) {
      this.selectedDevices.set(selected.filter(id => id !== device.id));
    } else {
      this.selectedDevices.set([...selected, device.id]);
    }
  }

  isDeviceSelected(device: Device): boolean {
    return this.selectedDevices().includes(device.id);
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'camera': return 'videocam';
      case 'sensor': return 'sensors';
      default: return 'device_hub';
    }
  }

  setGridLayout(layout: string): void {
    this.gridLayout.set(layout);
  }

  getGridCells(): number[] {
    const layout = this.gridLayout();
    switch (layout) {
      case '1x1': return [1];
      case '2x2': return [1, 2, 3, 4];
      case '3x3': return [1, 2, 3, 4, 5, 6, 7, 8, 9];
      case '4x4': return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      default: return [1, 2, 3, 4];
    }
  }

  clearAllWindows(): void {
    console.log('Clearing all windows');
  }

  refresh(): void {
    console.log('Refreshing...');
  }

  openAddDialog(): void {
    console.log('Opening add dialog');
  }
}
