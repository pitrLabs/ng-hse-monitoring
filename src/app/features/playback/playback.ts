import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

interface PlaybackFile {
  id: number;
  user: string;
  device: string;
  reason: string;
  startTime: string;
  duration: string;
  fileName: string;
}

@Component({
  selector: 'app-playback',
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
    <div class="playback-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Device number, User ID, File name..." [(ngModel)]="searchQuery" class="search-input">
        </div>

        <!-- View Mode Tabs -->
        <div class="view-tabs">
          <button [class.active]="viewMode() === 'calendar'" (click)="setViewMode('calendar')">
            <mat-icon>calendar_month</mat-icon>
            Calendar
          </button>
          <button [class.active]="viewMode() === 'list'" (click)="setViewMode('list')">
            <mat-icon>list</mat-icon>
            List
          </button>
          <button [class.active]="viewMode() === 'window'" (click)="setViewMode('window')">
            <mat-icon>grid_view</mat-icon>
            Window
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

      <!-- Center Panel -->
      <div class="center-panel">
        @switch (viewMode()) {
          @case ('calendar') {
            <div class="calendar-view glass-card-static">
              <div class="calendar-header">
                <button mat-icon-button (click)="prevMonth()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="month-year">{{ currentMonthYear() }}</span>
                <button mat-icon-button (click)="nextMonth()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
              <div class="calendar-grid">
                <div class="weekday-header">
                  @for (day of weekDays; track day) {
                    <span>{{ day }}</span>
                  }
                </div>
                <div class="days-grid">
                  @for (day of calendarDays(); track $index) {
                    <div class="day-cell" [class.other-month]="!day.currentMonth" [class.has-data]="day.hasData" [class.selected]="day.selected" (click)="selectDate(day)">
                      <span class="day-number">{{ day.day }}</span>
                      @if (day.hasData) {
                        <span class="data-indicator"></span>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          }
          @case ('list') {
            <div class="list-view glass-card-static">
              <div class="list-header">
                <span class="col-user">User</span>
                <span class="col-device">Device</span>
                <span class="col-reason">Reason</span>
                <span class="col-start">Start Time</span>
                <span class="col-duration">Duration</span>
                <span class="col-file">File Name</span>
                <span class="col-action">Operation</span>
              </div>
              <div class="list-body">
                @for (file of playbackFiles(); track file.id) {
                  <div class="list-row">
                    <span class="col-user">{{ file.user }}</span>
                    <span class="col-device">{{ file.device }}</span>
                    <span class="col-reason">
                      <span class="reason-badge">{{ file.reason }}</span>
                    </span>
                    <span class="col-start">{{ file.startTime }}</span>
                    <span class="col-duration">{{ file.duration }}</span>
                    <span class="col-file">{{ file.fileName }}</span>
                    <span class="col-action">
                      <button mat-icon-button matTooltip="Play">
                        <mat-icon>play_arrow</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Download">
                        <mat-icon>download</mat-icon>
                      </button>
                    </span>
                  </div>
                }
              </div>
            </div>
          }
          @case ('window') {
            <div class="window-view glass-card-static">
              <div class="video-player">
                <div class="player-placeholder">
                  <mat-icon>play_circle</mat-icon>
                  <span>Select a file to playback</span>
                </div>
                <div class="player-controls">
                  <div class="timeline">
                    <div class="timeline-bar"></div>
                    <div class="timeline-progress" [style.width.%]="playProgress()"></div>
                  </div>
                  <div class="controls-row">
                    <div class="left-controls">
                      <button mat-icon-button>
                        <mat-icon>skip_previous</mat-icon>
                      </button>
                      <button mat-icon-button class="play-btn">
                        <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
                      </button>
                      <button mat-icon-button>
                        <mat-icon>skip_next</mat-icon>
                      </button>
                      <span class="time-display">{{ currentTime() }} / {{ totalTime() }}</span>
                    </div>
                    <div class="right-controls">
                      <button mat-icon-button matTooltip="Speed">
                        <mat-icon>speed</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Volume">
                        <mat-icon>volume_up</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .playback-container {
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

    .view-tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);

      button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: var(--text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &.active {
          background: var(--accent-primary);
          color: white;
        }

        &:hover:not(.active) {
          background: var(--glass-bg-hover);
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

    // Calendar View
    .calendar-view {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;

      .month-year {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        min-width: 150px;
        text-align: center;
      }
    }

    .calendar-grid {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .weekday-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;

      span {
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        padding: 8px;
      }
    }

    .days-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(6, 1fr);
      gap: 4px;
    }

    .day-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      cursor: pointer;
      position: relative;
      transition: all 0.2s;

      &:hover {
        background: var(--glass-bg-hover);
      }

      &.other-month {
        opacity: 0.4;
      }

      &.has-data {
        border: 1px solid var(--accent-primary);
      }

      &.selected {
        background: var(--accent-primary);

        .day-number {
          color: white;
        }
      }

      .day-number {
        font-size: 14px;
        color: var(--text-primary);
      }

      .data-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent-primary);
        position: absolute;
        bottom: 8px;
      }
    }

    // List View
    .list-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .list-header {
      display: flex;
      padding: 12px 16px;
      background: var(--glass-bg);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .list-body {
      flex: 1;
      overflow-y: auto;
    }

    .list-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);

      &:hover {
        background: var(--glass-bg);
      }
    }

    .col-user { width: 100px; }
    .col-device { width: 120px; }
    .col-reason { width: 100px; }
    .col-start { width: 150px; }
    .col-duration { width: 80px; }
    .col-file { flex: 1; }
    .col-action { width: 80px; }

    .col-user, .col-device, .col-start, .col-duration, .col-file {
      font-size: 12px;
      color: var(--text-primary);
    }

    .reason-badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(0, 212, 255, 0.15);
      color: var(--accent-primary);
      border-radius: 4px;
      font-size: 11px;
    }

    // Window View
    .window-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .video-player {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .player-placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);
      background: var(--bg-tertiary);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }
    }

    .player-controls {
      padding: 16px;
      background: var(--glass-bg);
    }

    .timeline {
      height: 4px;
      background: var(--glass-border);
      border-radius: 2px;
      position: relative;
      margin-bottom: 12px;
    }

    .timeline-bar {
      position: absolute;
      inset: 0;
    }

    .timeline-progress {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: var(--accent-gradient);
      border-radius: 2px;
    }

    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .left-controls, .right-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .play-btn {
      width: 48px;
      height: 48px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    .time-display {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: 12px;
    }

    @media (max-width: 900px) {
      .playback-container {
        grid-template-columns: 1fr;
        grid-template-rows: 250px 1fr;
      }
    }
  `]
})
export class PlaybackComponent {
  searchQuery = '';
  deviceOnlineOnly = false;
  userOnlineOnly = false;
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  viewMode = signal<'calendar' | 'list' | 'window'>('calendar');
  selectedDevice = signal<any>(null);
  currentMonth = signal(new Date());
  playProgress = signal(0);
  isPlaying = signal(false);
  currentTime = signal('00:00');
  totalTime = signal('00:00');

  devices = signal([
    { id: 1, name: 'Camera 01', online: true },
    { id: 2, name: 'Camera 02', online: true },
    { id: 3, name: 'Camera 03', online: false },
    { id: 4, name: 'Camera 04', online: true }
  ]);

  users = signal([
    { id: 1, name: 'Admin', online: true },
    { id: 2, name: 'Operator 1', online: true }
  ]);

  playbackFiles = signal<PlaybackFile[]>([
    { id: 1, user: 'Admin', device: 'Camera 01', reason: 'Manual', startTime: '2024-01-21 10:00', duration: '05:30', fileName: 'REC_001.mp4' },
    { id: 2, user: 'Admin', device: 'Camera 02', reason: 'Motion', startTime: '2024-01-21 11:30', duration: '02:15', fileName: 'REC_002.mp4' },
    { id: 3, user: 'Operator', device: 'Camera 01', reason: 'Alarm', startTime: '2024-01-21 14:00', duration: '10:00', fileName: 'REC_003.mp4' }
  ]);

  currentMonthYear(): string {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  calendarDays(): { day: number; currentMonth: boolean; hasData: boolean; selected: boolean }[] {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; currentMonth: boolean; hasData: boolean; selected: boolean }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, currentMonth: false, hasData: false, selected: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, hasData: Math.random() > 0.7, selected: false });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, hasData: false, selected: false });
    }

    return days;
  }

  setViewMode(mode: 'calendar' | 'list' | 'window'): void {
    this.viewMode.set(mode);
  }

  selectDevice(device: any): void {
    this.selectedDevice.set(device);
  }

  selectDate(day: any): void {
    // Handle date selection
  }

  prevMonth(): void {
    const date = this.currentMonth();
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const date = this.currentMonth();
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }
}
