import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule } from '@angular/material/paginator';

interface Picture {
  id: number;
  thumbnail: string;
  device: string;
  size: string;
  reason: string;
  date: string;
  selected: boolean;
}

@Component({
  selector: 'app-picture',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTabsModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule
  ],
  template: `
    <div class="picture-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search device name/ID..." [(ngModel)]="searchQuery" class="search-input">
        </div>

        <mat-tab-group class="list-tabs">
          <mat-tab label="Device List">
            <div class="tab-content">
              <mat-checkbox [(ngModel)]="deviceOnlineOnly" color="primary" class="filter-checkbox">
                Online Only
              </mat-checkbox>
              <div class="device-list">
                @for (device of filteredDevices(); track device.id) {
                  <div class="device-item" [class.selected]="selectedDevice()?.id === device.id" (click)="selectDevice(device)">
                    <mat-icon class="device-icon" [class.online]="device.online">videocam</mat-icon>
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
        <!-- Filter Bar -->
        <div class="filter-bar glass-card-static">
          <div class="filter-group">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Date Range</mat-label>
              <input matInput placeholder="Select date range" [(ngModel)]="dateRange">
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Platform</mat-label>
              <mat-select [(ngModel)]="platform">
                <mat-option value="all">All</mat-option>
                <mat-option value="mobile">Mobile</mat-option>
                <mat-option value="fixed">Fixed Camera</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="filter-actions">
            <button mat-button class="search-btn">
              <mat-icon>search</mat-icon>
              Search
            </button>
            <button mat-button class="download-btn" [disabled]="!hasSelection()">
              <mat-icon>download</mat-icon>
              Download
            </button>
          </div>
        </div>

        <!-- Picture Table -->
        <div class="picture-table glass-card-static">
          <div class="table-header">
            <span class="col-check">
              <mat-checkbox [(ngModel)]="selectAll" (change)="toggleSelectAll()" color="primary"></mat-checkbox>
            </span>
            <span class="col-picture">Picture</span>
            <span class="col-device">Device</span>
            <span class="col-size">Size</span>
            <span class="col-reason">Reason</span>
          </div>

          <div class="table-body">
            @for (pic of pictures(); track pic.id) {
              <div class="table-row" (click)="togglePictureSelection(pic)">
                <span class="col-check">
                  <mat-checkbox [(ngModel)]="pic.selected" (click)="$event.stopPropagation()" color="primary"></mat-checkbox>
                </span>
                <span class="col-picture">
                  <div class="thumbnail">
                    <mat-icon>image</mat-icon>
                  </div>
                </span>
                <span class="col-device">{{ pic.device }}</span>
                <span class="col-size">{{ pic.size }}</span>
                <span class="col-reason">
                  <span class="reason-badge" [class]="getReasonClass(pic.reason)">{{ pic.reason }}</span>
                </span>
              </div>
            }

            @if (pictures().length === 0) {
              <div class="empty-state">
                <mat-icon>photo_library</mat-icon>
                <span>No pictures found</span>
              </div>
            }
          </div>

          <div class="table-footer">
            <span class="total-info">Total: {{ pictures().length }}</span>
            <div class="pagination">
              <button mat-icon-button [disabled]="currentPage() === 1" (click)="prevPage()">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
              <button mat-icon-button [disabled]="currentPage() === totalPages()" (click)="nextPage()">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .picture-container {
      display: grid;
      grid-template-columns: 280px 1fr;
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
    }

    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
    }

    .filter-group {
      display: flex;
      gap: 12px;
    }

    .filter-field {
      width: 180px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    .filter-actions {
      display: flex;
      gap: 8px;
    }

    .search-btn {
      background: var(--accent-primary);
      color: white;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
    }

    .download-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    // Picture Table
    .picture-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--glass-bg);
      border-bottom: 1px solid var(--glass-border);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .table-body {
      flex: 1;
      overflow-y: auto;
    }

    .table-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--glass-bg);
      }
    }

    .col-check {
      width: 40px;
    }

    .col-picture {
      width: 100px;
    }

    .col-device {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .col-size {
      width: 80px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .col-reason {
      width: 120px;
    }

    .thumbnail {
      width: 60px;
      height: 40px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .reason-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;

      &.motion {
        background: rgba(245, 158, 11, 0.15);
        color: var(--warning);
      }

      &.manual {
        background: rgba(0, 212, 255, 0.15);
        color: var(--accent-primary);
      }

      &.schedule {
        background: rgba(16, 185, 129, 0.15);
        color: var(--success);
      }

      &.alarm {
        background: rgba(239, 68, 68, 0.15);
        color: var(--error);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: var(--text-muted);
      gap: 12px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--glass-border);
    }

    .total-info {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: 8px;

      .page-info {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 60px;
        text-align: center;
      }
    }

    @media (max-width: 900px) {
      .picture-container {
        grid-template-columns: 1fr;
        grid-template-rows: 250px 1fr;
      }

      .filter-bar {
        flex-direction: column;
        gap: 12px;
      }

      .filter-group {
        width: 100%;
      }

      .filter-field {
        flex: 1;
      }
    }
  `]
})
export class PictureComponent {
  searchQuery = '';
  deviceOnlineOnly = false;
  userOnlineOnly = false;
  dateRange = '';
  platform = 'all';
  selectAll = false;

  selectedDevice = signal<any>(null);
  currentPage = signal(1);
  totalPages = signal(5);

  devices = signal([
    { id: 1, name: 'Camera 01', online: true },
    { id: 2, name: 'Camera 02', online: true },
    { id: 3, name: 'Camera 03', online: false },
    { id: 4, name: 'Camera 04', online: true },
    { id: 5, name: 'Camera 05', online: false }
  ]);

  users = signal([
    { id: 1, name: 'Admin', online: true },
    { id: 2, name: 'Operator 1', online: true },
    { id: 3, name: 'Operator 2', online: false }
  ]);

  pictures = signal<Picture[]>([
    { id: 1, thumbnail: '', device: 'Camera 01', size: '2.4 MB', reason: 'Motion', date: '2024-01-21', selected: false },
    { id: 2, thumbnail: '', device: 'Camera 02', size: '1.8 MB', reason: 'Manual', date: '2024-01-21', selected: false },
    { id: 3, thumbnail: '', device: 'Camera 01', size: '3.1 MB', reason: 'Alarm', date: '2024-01-20', selected: false },
    { id: 4, thumbnail: '', device: 'Camera 03', size: '2.0 MB', reason: 'Schedule', date: '2024-01-20', selected: false },
    { id: 5, thumbnail: '', device: 'Camera 04', size: '1.5 MB', reason: 'Motion', date: '2024-01-19', selected: false }
  ]);

  filteredDevices() {
    let devices = this.devices();
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

  selectDevice(device: any): void {
    this.selectedDevice.set(device);
  }

  togglePictureSelection(pic: Picture): void {
    pic.selected = !pic.selected;
  }

  toggleSelectAll(): void {
    const pictures = this.pictures();
    pictures.forEach(p => p.selected = this.selectAll);
    this.pictures.set([...pictures]);
  }

  hasSelection(): boolean {
    return this.pictures().some(p => p.selected);
  }

  getReasonClass(reason: string): string {
    return reason.toLowerCase();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }
}
