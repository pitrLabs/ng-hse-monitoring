import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

interface AttendanceGroup {
  id: number;
  name: string;
  workType: string;
  placeCount: number;
  attendanceDays: number;
}

interface AttendanceEmployee {
  id: number;
  name: string;
  type: 'user' | 'device';
}

@Component({
  selector: 'app-attend',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  template: `
    <div class="attend-container">
      <!-- Top Bar -->
      <div class="top-bar glass-card-static">
        <button mat-button class="add-group-btn" (click)="openAddGroupDialog()">
          <mat-icon>add</mat-icon>
          Add Group
        </button>
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search..." [(ngModel)]="searchQuery" class="search-input">
        </div>
        <button mat-button class="more-btn" [matMenuTriggerFor]="moreMenu">
          More
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #moreMenu="matMenu">
          <button mat-menu-item>
            <mat-icon>settings</mat-icon>
            <span>Manage</span>
          </button>
          <button mat-menu-item>
            <mat-icon>today</mat-icon>
            <span>Daily</span>
          </button>
          <button mat-menu-item>
            <mat-icon>date_range</mat-icon>
            <span>Monthly</span>
          </button>
        </mat-menu>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Attendance Table -->
        <div class="attendance-table glass-card-static">
          <div class="table-header">
            <span class="col-name">Name</span>
            <span class="col-type">Work Type</span>
            <span class="col-place">Place Count</span>
            <span class="col-days">Attendance Days</span>
            <span class="col-action">Operation</span>
          </div>
          <div class="table-body">
            @for (group of filteredGroups(); track group.id) {
              <div class="table-row" [class.selected]="selectedGroup()?.id === group.id" (click)="selectGroup(group)">
                <span class="col-name">{{ group.name }}</span>
                <span class="col-type">
                  <span class="type-badge">{{ group.workType }}</span>
                </span>
                <span class="col-place">{{ group.placeCount }}</span>
                <span class="col-days">{{ group.attendanceDays }}</span>
                <span class="col-action">
                  <button mat-icon-button matTooltip="Edit" (click)="editGroup(group); $event.stopPropagation()">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="deleteGroup(group); $event.stopPropagation()">
                    <mat-icon>delete</mat-icon>
                  </button>
                </span>
              </div>
            }

            @if (filteredGroups().length === 0) {
              <div class="empty-state">
                <mat-icon>how_to_reg</mat-icon>
                <span>No attendance groups found</span>
              </div>
            }
          </div>
        </div>

        <!-- Detail Panel -->
        @if (selectedGroup()) {
          <div class="detail-panel glass-card-static">
            <h3 class="panel-title">{{ selectedGroup()!.name }}</h3>

            <!-- Attendance Staff Section -->
            <div class="detail-section">
              <div class="section-header">
                <span>Attendance Staff</span>
                <button mat-button class="add-btn" [matMenuTriggerFor]="addStaffMenu">
                  <mat-icon>add</mat-icon>
                  Add
                </button>
                <mat-menu #addStaffMenu="matMenu">
                  <button mat-menu-item>
                    <mat-icon>person</mat-icon>
                    <span>User</span>
                  </button>
                  <button mat-menu-item>
                    <mat-icon>devices</mat-icon>
                    <span>Device</span>
                  </button>
                </mat-menu>
              </div>
              <div class="staff-table">
                <div class="staff-header">
                  <span class="staff-col-name">Name</span>
                  <span class="staff-col-type">Employee Type</span>
                  <span class="staff-col-action">Operation</span>
                </div>
                <div class="staff-body">
                  @for (employee of employees(); track employee.id) {
                    <div class="staff-row">
                      <span class="staff-col-name">
                        <mat-icon>{{ employee.type === 'user' ? 'person' : 'devices' }}</mat-icon>
                        {{ employee.name }}
                      </span>
                      <span class="staff-col-type">{{ employee.type | titlecase }}</span>
                      <span class="staff-col-action">
                        <button mat-icon-button matTooltip="Remove">
                          <mat-icon>close</mat-icon>
                        </button>
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Location Section -->
            <div class="detail-section">
              <div class="section-header">
                <span>Location</span>
                <button mat-button class="add-btn" (click)="addLocation()">
                  <mat-icon>add</mat-icon>
                  Add Point
                </button>
              </div>
              <div class="location-table">
                <div class="location-header">
                  <span class="loc-col-name">Name</span>
                  <span class="loc-col-location">Location</span>
                </div>
                <div class="location-body">
                  @for (location of locations(); track location.id) {
                    <div class="location-row">
                      <span class="loc-col-name">{{ location.name }}</span>
                      <span class="loc-col-location">{{ location.coords }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Attendance Time Section -->
            <div class="detail-section">
              <div class="section-header">
                <span>Attendance Time</span>
                <mat-form-field appearance="outline" class="shift-select">
                  <mat-select [(ngModel)]="selectedShift">
                    <mat-option value="fixed">Fixed Shift</mat-option>
                    <mat-option value="flexible">Flexible Shift</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="shift-table">
                <div class="shift-header">
                  <span class="shift-col-day">Work Day</span>
                  <span class="shift-col-shift">Shift</span>
                </div>
                <div class="shift-body">
                  @for (day of workDays(); track day.day) {
                    <div class="shift-row">
                      <span class="shift-col-day">{{ day.day }}</span>
                      <span class="shift-col-shift">{{ day.shift }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .attend-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: calc(100vh - 118px);
    }

    // Top Bar
    .top-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
    }

    .add-group-btn {
      background: var(--accent-gradient);
      color: white;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .search-box {
      flex: 1;
      max-width: 300px;
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

    .more-btn {
      margin-left: auto;
      color: var(--text-secondary);
    }

    // Main Content
    .main-content {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 16px;
      overflow: hidden;
    }

    // Attendance Table
    .attendance-table {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      padding: 12px 16px;
      background: var(--glass-bg);
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
      padding: 14px 16px;
      border-bottom: 1px solid var(--glass-border);
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

    .col-name { flex: 1; font-size: 13px; color: var(--text-primary); font-weight: 500; }
    .col-type { width: 120px; }
    .col-place { width: 100px; font-size: 13px; color: var(--text-secondary); text-align: center; }
    .col-days { width: 120px; font-size: 13px; color: var(--text-secondary); text-align: center; }
    .col-action { width: 100px; text-align: right; }

    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(0, 212, 255, 0.15);
      color: var(--accent-primary);
      border-radius: 4px;
      font-size: 11px;
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

    // Detail Panel
    .detail-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      overflow-y: auto;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      span {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .add-btn {
      font-size: 12px;
      color: var(--accent-primary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .shift-select {
      width: 140px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    // Staff Table
    .staff-table, .location-table, .shift-table {
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .staff-header, .location-header, .shift-header {
      display: flex;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .staff-body, .location-body, .shift-body {
      max-height: 120px;
      overflow-y: auto;
    }

    .staff-row, .location-row, .shift-row {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--glass-border);
      font-size: 12px;
      color: var(--text-primary);

      &:last-child {
        border-bottom: none;
      }
    }

    .staff-col-name {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-tertiary);
      }
    }
    .staff-col-type { width: 80px; color: var(--text-secondary); }
    .staff-col-action { width: 40px; }

    .loc-col-name { flex: 1; }
    .loc-col-location { width: 150px; color: var(--text-secondary); font-family: monospace; font-size: 11px; }

    .shift-col-day { flex: 1; }
    .shift-col-shift { width: 100px; color: var(--text-secondary); }

    @media (max-width: 1000px) {
      .main-content {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto;
      }

      .detail-panel {
        max-height: 300px;
      }
    }
  `]
})
export class AttendComponent {
  searchQuery = '';
  selectedShift = 'fixed';

  selectedGroup = signal<AttendanceGroup | null>(null);

  groups = signal<AttendanceGroup[]>([
    { id: 1, name: 'Security Team', workType: 'Fixed Shift', placeCount: 3, attendanceDays: 22 },
    { id: 2, name: 'Maintenance Crew', workType: 'Flexible', placeCount: 5, attendanceDays: 20 },
    { id: 3, name: 'Operations Staff', workType: 'Fixed Shift', placeCount: 2, attendanceDays: 24 },
    { id: 4, name: 'Warehouse Team', workType: 'Fixed Shift', placeCount: 4, attendanceDays: 21 }
  ]);

  employees = signal<AttendanceEmployee[]>([
    { id: 1, name: 'John Doe', type: 'user' },
    { id: 2, name: 'Jane Smith', type: 'user' },
    { id: 3, name: 'Radio Unit 01', type: 'device' },
    { id: 4, name: 'Radio Unit 02', type: 'device' }
  ]);

  locations = signal([
    { id: 1, name: 'Gate A', coords: '12.3456, 98.7654' },
    { id: 2, name: 'Control Room', coords: '12.3457, 98.7655' },
    { id: 3, name: 'Warehouse', coords: '12.3458, 98.7656' }
  ]);

  workDays = signal([
    { day: 'Monday', shift: '08:00 - 17:00' },
    { day: 'Tuesday', shift: '08:00 - 17:00' },
    { day: 'Wednesday', shift: '08:00 - 17:00' },
    { day: 'Thursday', shift: '08:00 - 17:00' },
    { day: 'Friday', shift: '08:00 - 17:00' }
  ]);

  filteredGroups(): AttendanceGroup[] {
    if (!this.searchQuery) return this.groups();
    return this.groups().filter(g =>
      g.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectGroup(group: AttendanceGroup): void {
    this.selectedGroup.set(group);
  }

  openAddGroupDialog(): void {
    console.log('Opening add group dialog');
  }

  editGroup(group: AttendanceGroup): void {
    console.log('Editing group:', group);
  }

  deleteGroup(group: AttendanceGroup): void {
    console.log('Deleting group:', group);
  }

  addLocation(): void {
    console.log('Adding location');
  }
}
