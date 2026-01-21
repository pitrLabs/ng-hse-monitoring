import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface DeviceGroup {
  id: number;
  name: string;
  expanded: boolean;
  devices: { id: number; name: string; online: boolean }[];
}

@Component({
  selector: 'app-e-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="emap-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <!-- Search -->
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search devices..." [(ngModel)]="searchQuery" class="search-input">
        </div>

        <!-- Filters -->
        <div class="filter-options">
          <mat-checkbox [(ngModel)]="onlineOnly" color="primary">Online Only</mat-checkbox>
          <mat-checkbox [(ngModel)]="onlineInGroup" color="primary">Online in Group</mat-checkbox>
        </div>

        <!-- Device Groups -->
        <div class="device-tree">
          @for (group of filteredGroups(); track group.id) {
            <div class="tree-node">
              <div class="node-header" (click)="toggleGroup(group)">
                <mat-icon class="expand-icon" [class.expanded]="group.expanded">
                  chevron_right
                </mat-icon>
                <mat-icon class="folder-icon">folder</mat-icon>
                <mat-checkbox [checked]="isGroupChecked(group)" (change)="toggleGroupCheck(group, $event)" (click)="$event.stopPropagation()"></mat-checkbox>
                <span class="node-name">{{ group.name }}</span>
                <span class="node-count">({{ group.devices.length }})</span>
              </div>
              @if (group.expanded) {
                <div class="node-children">
                  @for (device of getFilteredDevices(group); track device.id) {
                    <div class="device-item">
                      <mat-checkbox [(ngModel)]="device.online" (click)="$event.stopPropagation()"></mat-checkbox>
                      <mat-icon class="device-icon" [class.online]="device.online">
                        {{ device.online ? 'videocam' : 'videocam_off' }}
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

      <!-- Map Area -->
      <div class="map-area glass-card-static">
        <!-- Left Toolbar -->
        <div class="map-toolbar-left">
          <button mat-icon-button class="map-tool-btn" matTooltip="Zoom In">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Zoom Out">
            <mat-icon>remove</mat-icon>
          </button>
          <div class="toolbar-divider"></div>
          <button mat-icon-button class="map-tool-btn" matTooltip="Draw Polygon" [class.active]="activeTool() === 'polygon'">
            <mat-icon>pentagon</mat-icon>
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Draw Circle" [class.active]="activeTool() === 'circle'">
            <mat-icon>radio_button_unchecked</mat-icon>
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Draw Rectangle" [class.active]="activeTool() === 'rectangle'">
            <mat-icon>crop_square</mat-icon>
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Measure Distance" [class.active]="activeTool() === 'ruler'">
            <mat-icon>straighten</mat-icon>
          </button>
          <div class="toolbar-divider"></div>
          <button mat-icon-button class="map-tool-btn" matTooltip="Import Data">
            <mat-icon>upload_file</mat-icon>
          </button>
        </div>

        <!-- Right Toolbar -->
        <div class="map-toolbar-right">
          <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapToolsMenu">
            <mat-icon>build</mat-icon>
            Map Tools
            <mat-icon>expand_more</mat-icon>
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
            <button mat-menu-item>
              <mat-icon>my_location</mat-icon>
              <span>Get Coordinates</span>
            </button>
          </mat-menu>

          <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapTypeMenu">
            <mat-icon>layers</mat-icon>
            Map Type
            <mat-icon>expand_more</mat-icon>
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
            <button mat-menu-item>
              <mat-icon>traffic</mat-icon>
              <span>Traffic</span>
            </button>
          </mat-menu>
        </div>

        <!-- Compass -->
        <div class="compass">
          <mat-icon>explore</mat-icon>
          <span class="compass-label">N</span>
        </div>

        <!-- Map Placeholder -->
        <div class="map-placeholder">
          <mat-icon>map</mat-icon>
          <span>E-Map View</span>
          <span class="map-hint">Interactive map with device locations</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .emap-container {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
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
        font-size: 14px;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--glass-border);

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 13px;
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
      gap: 8px;
      padding: 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: var(--glass-bg-hover);
      }
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
      transition: transform 0.2s ease;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .folder-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--warning);
    }

    .node-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .node-count {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .node-children {
      padding-left: 32px;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--glass-bg);
      }
    }

    .device-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);

      &.online {
        color: var(--success);
      }
    }

    .device-name {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
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
    }

    .toolbar-divider {
      height: 1px;
      background: var(--glass-border);
      margin: 4px 0;
    }

    .map-tool-btn {
      width: 36px;
      height: 36px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        color: var(--accent-primary);
        background: var(--glass-bg-hover);
      }

      &.active {
        color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.15);
      }
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
      display: flex;
      align-items: center;
      gap: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-primary);
      }

      .compass-label {
        font-size: 8px;
        font-weight: 600;
        color: var(--error);
        margin-top: -4px;
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
        font-size: 80px;
        width: 80px;
        height: 80px;
      }

      span {
        font-size: 16px;
        font-weight: 500;
      }

      .map-hint {
        font-size: 13px;
        opacity: 0.7;
      }
    }

    @media (max-width: 900px) {
      .emap-container {
        grid-template-columns: 1fr;
        grid-template-rows: 300px 1fr;
      }
    }
  `]
})
export class EMapComponent {
  searchQuery = '';
  onlineOnly = false;
  onlineInGroup = false;
  activeTool = signal<string | null>(null);

  deviceGroups = signal<DeviceGroup[]>([
    {
      id: 1,
      name: 'Building A',
      expanded: true,
      devices: [
        { id: 1, name: 'Camera 01', online: true },
        { id: 2, name: 'Camera 02', online: true },
        { id: 3, name: 'Camera 03', online: false },
        { id: 4, name: 'Sensor 01', online: true }
      ]
    },
    {
      id: 2,
      name: 'Building B',
      expanded: false,
      devices: [
        { id: 5, name: 'Camera 04', online: true },
        { id: 6, name: 'Camera 05', online: false },
        { id: 7, name: 'Sensor 02', online: true }
      ]
    },
    {
      id: 3,
      name: 'Warehouse',
      expanded: false,
      devices: [
        { id: 8, name: 'Camera 06', online: true },
        { id: 9, name: 'Camera 07', online: true },
        { id: 10, name: 'Sensor 03', online: true },
        { id: 11, name: 'Sensor 04', online: false }
      ]
    },
    {
      id: 4,
      name: 'Gate Area',
      expanded: false,
      devices: [
        { id: 12, name: 'Camera 08', online: true },
        { id: 13, name: 'Camera 09', online: true }
      ]
    }
  ]);

  filteredGroups() {
    let groups = this.deviceGroups();
    if (this.searchQuery) {
      groups = groups.filter(g =>
        g.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        g.devices.some(d => d.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
    }
    return groups;
  }

  getFilteredDevices(group: DeviceGroup) {
    let devices = group.devices;
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

  toggleGroup(group: DeviceGroup): void {
    group.expanded = !group.expanded;
  }

  isGroupChecked(group: DeviceGroup): boolean {
    return group.devices.every(d => d.online);
  }

  toggleGroupCheck(group: DeviceGroup, event: any): void {
    const checked = event.checked;
    group.devices.forEach(d => d.online = checked);
  }
}
