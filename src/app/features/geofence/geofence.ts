import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

interface GeoFence {
  id: number;
  name: string;
  type: 'polygon' | 'circle' | 'rectangle';
  status: 'active' | 'inactive';
  alertCount: number;
}

@Component({
  selector: 'app-geofence',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="geofence-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="panel-header">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search fence name..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-icon-button class="action-btn" matTooltip="Add GeoFence" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button class="action-btn" matTooltip="Refresh" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <!-- Fence List -->
        <div class="fence-list">
          @for (fence of filteredFences(); track fence.id) {
            <div class="fence-item" [class.selected]="selectedFence()?.id === fence.id" (click)="selectFence(fence)">
              <div class="fence-icon" [class]="fence.type">
                <mat-icon>{{ getFenceIcon(fence.type) }}</mat-icon>
              </div>
              <div class="fence-info">
                <span class="fence-name">{{ fence.name }}</span>
                <span class="fence-meta">
                  <span class="fence-type">{{ fence.type | titlecase }}</span>
                  <span class="fence-status" [class]="fence.status">{{ fence.status }}</span>
                </span>
              </div>
              <div class="fence-alerts" [class.has-alerts]="fence.alertCount > 0">
                @if (fence.alertCount > 0) {
                  <mat-icon>notification_important</mat-icon>
                  <span>{{ fence.alertCount }}</span>
                }
              </div>
              <button mat-icon-button [matMenuTriggerFor]="fenceMenu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #fenceMenu="matMenu">
                <button mat-menu-item>
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item>
                  <mat-icon>{{ fence.status === 'active' ? 'pause' : 'play_arrow' }}</mat-icon>
                  <span>{{ fence.status === 'active' ? 'Deactivate' : 'Activate' }}</span>
                </button>
                <button mat-menu-item class="delete-item">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </div>
          }

          @if (filteredFences().length === 0) {
            <div class="empty-state">
              <mat-icon>fence</mat-icon>
              <span>No geofences found</span>
            </div>
          }
        </div>
      </div>

      <!-- Map Area -->
      <div class="map-area glass-card-static">
        <!-- Map Toolbar -->
        <div class="map-toolbar">
          <div class="toolbar-left">
            <button mat-icon-button matTooltip="Draw Polygon" [class.active]="activeTool() === 'polygon'" (click)="setTool('polygon')">
              <mat-icon>pentagon</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Draw Circle" [class.active]="activeTool() === 'circle'" (click)="setTool('circle')">
              <mat-icon>radio_button_unchecked</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Draw Rectangle" [class.active]="activeTool() === 'rectangle'" (click)="setTool('rectangle')">
              <mat-icon>crop_square</mat-icon>
            </button>
            <div class="divider"></div>
            <button mat-icon-button matTooltip="Edit Mode" [class.active]="activeTool() === 'edit'" (click)="setTool('edit')">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Delete Mode" [class.active]="activeTool() === 'delete'" (click)="setTool('delete')">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <div class="toolbar-right">
            <button mat-button class="map-menu-btn" [matMenuTriggerFor]="layersMenu">
              <mat-icon>layers</mat-icon>
              Layers
            </button>
            <mat-menu #layersMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>check_box</mat-icon>
                <span>Show Active Zones</span>
              </button>
              <button mat-menu-item>
                <mat-icon>check_box_outline_blank</mat-icon>
                <span>Show Inactive Zones</span>
              </button>
              <button mat-menu-item>
                <mat-icon>check_box</mat-icon>
                <span>Show Devices</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Map Placeholder -->
        <div class="map-content">
          <div class="map-placeholder">
            <mat-icon>fence</mat-icon>
            <span>GeoFence Map</span>
            <span class="hint">Draw and manage geographic boundaries</span>
          </div>

          <!-- Selected Fence Details -->
          @if (selectedFence()) {
            <div class="fence-details">
              <h4>{{ selectedFence()!.name }}</h4>
              <div class="detail-row">
                <span class="label">Type:</span>
                <span class="value">{{ selectedFence()!.type | titlecase }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value status" [class]="selectedFence()!.status">{{ selectedFence()!.status | titlecase }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Alerts:</span>
                <span class="value">{{ selectedFence()!.alertCount }}</span>
              </div>
              <div class="detail-actions">
                <button mat-button>
                  <mat-icon>center_focus_strong</mat-icon>
                  Focus
                </button>
                <button mat-button>
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .geofence-container {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
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

    .action-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

      &:hover {
        background: var(--glass-bg-hover);
        color: var(--accent-primary);
      }
    }

    // Fence List
    .fence-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .fence-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: var(--glass-bg-hover);
        border-color: var(--glass-border-hover);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
        border-color: var(--accent-primary);
      }
    }

    .fence-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &.polygon {
        background: rgba(124, 58, 237, 0.15);
        mat-icon { color: var(--accent-secondary); }
      }

      &.circle {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.rectangle {
        background: rgba(16, 185, 129, 0.15);
        mat-icon { color: var(--success); }
      }
    }

    .fence-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .fence-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .fence-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
    }

    .fence-type {
      color: var(--text-tertiary);
    }

    .fence-status {
      &.active {
        color: var(--success);
      }
      &.inactive {
        color: var(--text-muted);
      }
    }

    .fence-alerts {
      display: flex;
      align-items: center;
      gap: 4px;

      &.has-alerts {
        color: var(--warning);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        span {
          font-size: 12px;
          font-weight: 600;
        }
      }
    }

    .delete-item {
      color: var(--error);
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
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .toolbar-left button {
      color: var(--text-secondary);

      &.active {
        background: var(--accent-primary);
        color: white;
      }
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--glass-border);
      margin: 0 8px;
    }

    .map-menu-btn {
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

    .fence-details {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 16px;
      min-width: 200px;

      h4 {
        margin: 0 0 12px;
        font-size: 14px;
        color: var(--text-primary);
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 12px;

        .label {
          color: var(--text-tertiary);
        }

        .value {
          color: var(--text-primary);

          &.status.active {
            color: var(--success);
          }

          &.status.inactive {
            color: var(--text-muted);
          }
        }
      }

      .detail-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--glass-border);

        button {
          flex: 1;
          font-size: 11px;

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
            margin-right: 4px;
          }
        }
      }
    }

    @media (max-width: 900px) {
      .geofence-container {
        grid-template-columns: 1fr;
        grid-template-rows: 300px 1fr;
      }
    }
  `]
})
export class GeoFenceComponent {
  searchQuery = '';
  activeTool = signal<string | null>(null);
  selectedFence = signal<GeoFence | null>(null);

  fences = signal<GeoFence[]>([
    { id: 1, name: 'Restricted Area A', type: 'polygon', status: 'active', alertCount: 3 },
    { id: 2, name: 'Warehouse Perimeter', type: 'rectangle', status: 'active', alertCount: 0 },
    { id: 3, name: 'Parking Zone', type: 'polygon', status: 'active', alertCount: 1 },
    { id: 4, name: 'Control Room Radius', type: 'circle', status: 'active', alertCount: 0 },
    { id: 5, name: 'Emergency Exit Zone', type: 'rectangle', status: 'inactive', alertCount: 0 },
    { id: 6, name: 'Loading Bay', type: 'polygon', status: 'active', alertCount: 2 }
  ]);

  filteredFences(): GeoFence[] {
    if (!this.searchQuery) return this.fences();
    return this.fences().filter(f =>
      f.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  getFenceIcon(type: string): string {
    switch (type) {
      case 'polygon': return 'pentagon';
      case 'circle': return 'radio_button_unchecked';
      case 'rectangle': return 'crop_square';
      default: return 'fence';
    }
  }

  selectFence(fence: GeoFence): void {
    this.selectedFence.set(fence);
  }

  setTool(tool: string): void {
    this.activeTool.set(this.activeTool() === tool ? null : tool);
  }

  openCreateDialog(): void {
    console.log('Opening create dialog');
  }

  refresh(): void {
    console.log('Refreshing...');
  }
}
