import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { RecordingService } from '../../core/services/recording.service';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import {
  Recording,
  CalendarDay,
  formatDuration,
  formatFileSize,
  getTriggerTypeLabel,
  getTriggerTypeColor
} from '../../core/models/recording.model';

interface CalendarDayDisplay {
  day: number;
  date: string;
  currentMonth: boolean;
  hasData: boolean;
  count: number;
  selected: boolean;
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
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  template: `
    <div class="playback-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
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
            <mat-icon>play_circle</mat-icon>
            Player
          </button>
        </div>

        <!-- Camera Filter -->
        <div class="filter-section">
          <label class="filter-label">Camera</label>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="filterCameraId" (ngModelChange)="onCameraChange()" placeholder="All Cameras">
              <mat-option [value]="null">All Cameras</mat-option>
              @for (camera of cameras(); track camera.id) {
                <mat-option [value]="camera.stream_name">{{ camera.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Trigger Type Filter -->
        <div class="filter-section">
          <label class="filter-label">Recording Type</label>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="filterTriggerType" (ngModelChange)="loadRecordingsForDate()" placeholder="All Types">
              <mat-option [value]="null">All Types</mat-option>
              <mat-option value="auto">Auto</mat-option>
              <mat-option value="alarm">Alarm</mat-option>
              <mat-option value="manual">Manual</mat-option>
              <mat-option value="schedule">Scheduled</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Selected Date -->
        @if (selectedDate()) {
          <div class="selected-date-info">
            <mat-icon>event</mat-icon>
            <span>{{ formatSelectedDate() }}</span>
          </div>
        }

        <!-- Recording List (Left Panel) -->
        @if (viewMode() !== 'calendar') {
          <div class="recording-list">
            <div class="list-header">
              <span>Recordings</span>
              <span class="count-badge">{{ recordings().length }}</span>
            </div>
            <div class="list-items">
              @for (rec of recordings(); track rec.id) {
                <div class="recording-item" [class.selected]="selectedRecording()?.id === rec.id" (click)="selectRecording(rec)">
                  <mat-icon class="rec-icon">videocam</mat-icon>
                  <div class="rec-info">
                    <span class="rec-name">{{ rec.camera_name || 'Unknown Camera' }}</span>
                    <span class="rec-time">{{ formatRecordingTime(rec.start_time) }}</span>
                  </div>
                  <span class="trigger-badge" [class]="getTriggerColor(rec.trigger_type)">{{ getTriggerLabel(rec.trigger_type) }}</span>
                </div>
              } @empty {
                <div class="empty-list">
                  <mat-icon>folder_off</mat-icon>
                  <span>No recordings</span>
                </div>
              }
            </div>
          </div>
        }

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
                  @for (day of calendarDays(); track day.date) {
                    <div class="day-cell" [class.other-month]="!day.currentMonth" [class.has-data]="day.hasData" [class.selected]="day.selected" (click)="selectDate(day)">
                      <span class="day-number">{{ day.day }}</span>
                      @if (day.hasData) {
                        <span class="data-indicator">{{ day.count }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
              <div class="calendar-legend">
                <div class="legend-item">
                  <span class="legend-dot has-data"></span>
                  <span>Has Recordings</span>
                </div>
              </div>
            </div>
          }
          @case ('list') {
            <div class="list-view glass-card-static">
              <div class="list-title-row">
                <h3 class="section-title">Recordings</h3>
                <span class="table-count">{{ recordings().length }} files</span>
              </div>
              <div class="list-header-row">
                <span class="col-camera">Camera</span>
                <span class="col-trigger">Type</span>
                <span class="col-start">Start Time</span>
                <span class="col-duration">Duration</span>
                <span class="col-size">Size</span>
                <span class="col-action">Actions</span>
              </div>
              <div class="list-body">
                @if (isLoading()) {
                  <div class="loading-state">
                    <mat-spinner diameter="32"></mat-spinner>
                    <span>Loading recordings...</span>
                  </div>
                } @else {
                  @for (rec of recordings(); track rec.id) {
                    <div class="list-row" [class.selected]="selectedRecording()?.id === rec.id" (click)="selectRecording(rec); setViewMode('window')">
                      <span class="col-camera">{{ rec.camera_name || 'Unknown' }}</span>
                      <span class="col-trigger">
                        <span class="trigger-badge" [class]="getTriggerColor(rec.trigger_type)">{{ getTriggerLabel(rec.trigger_type) }}</span>
                      </span>
                      <span class="col-start">{{ formatRecordingTime(rec.start_time) }}</span>
                      <span class="col-duration">{{ formatDuration(rec.duration) }}</span>
                      <span class="col-size">{{ formatFileSize(rec.file_size) }}</span>
                      <span class="col-action" (click)="$event.stopPropagation()">
                        <button mat-icon-button matTooltip="Play" (click)="playRecording(rec)">
                          <mat-icon>play_arrow</mat-icon>
                        </button>
                        <button mat-icon-button matTooltip="Download" (click)="downloadRecording(rec)">
                          <mat-icon>download</mat-icon>
                        </button>
                        @if (rec.alarm_id) {
                          <button mat-icon-button matTooltip="View Alarm" (click)="viewAlarm(rec)">
                            <mat-icon>warning</mat-icon>
                          </button>
                        }
                      </span>
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <mat-icon>folder_off</mat-icon>
                      <span>No recordings found</span>
                      <span class="hint">Select a date with recordings from the calendar</span>
                    </div>
                  }
                }
              </div>
            </div>
          }
          @case ('window') {
            <div class="window-view glass-card-static">
              @if (selectedRecording()) {
                <div class="video-player">
                  <video
                    #videoPlayer
                    [src]="videoUrl()"
                    (loadedmetadata)="onVideoLoaded($event)"
                    (timeupdate)="onTimeUpdate($event)"
                    (ended)="onVideoEnded()"
                    (error)="onVideoError($event)"
                    playsinline
                  ></video>

                  @if (videoError()) {
                    <div class="video-error">
                      <mat-icon>error_outline</mat-icon>
                      <span>{{ videoError() }}</span>
                      <button mat-stroked-button (click)="retryVideo()">
                        <mat-icon>refresh</mat-icon>
                        Retry
                      </button>
                    </div>
                  }

                  <div class="player-info">
                    <span class="camera-name">{{ selectedRecording()!.camera_name || 'Unknown Camera' }}</span>
                    <span class="recording-time">{{ formatRecordingTime(selectedRecording()!.start_time) }}</span>
                    @if (selectedRecording()!.alarm_id) {
                      <span class="alarm-badge">
                        <mat-icon>warning</mat-icon>
                        Alarm Recording
                      </span>
                    }
                  </div>
                </div>
                <div class="player-controls">
                  <div class="timeline" (click)="seekTo($event)">
                    <div class="timeline-bar"></div>
                    <div class="timeline-progress" [style.width.%]="playProgress()"></div>
                    <div class="timeline-handle" [style.left.%]="playProgress()"></div>
                  </div>
                  <div class="controls-row">
                    <div class="left-controls">
                      <button mat-icon-button (click)="skipBack()">
                        <mat-icon>replay_10</mat-icon>
                      </button>
                      <button mat-icon-button class="play-btn" (click)="togglePlay()">
                        <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
                      </button>
                      <button mat-icon-button (click)="skipForward()">
                        <mat-icon>forward_10</mat-icon>
                      </button>
                      <span class="time-display">{{ currentTimeStr() }} / {{ totalTimeStr() }}</span>
                    </div>
                    <div class="right-controls">
                      <button mat-icon-button matTooltip="Download" (click)="downloadRecording(selectedRecording()!)">
                        <mat-icon>download</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Speed" [matMenuTriggerFor]="speedMenu">
                        <mat-icon>speed</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Volume" (click)="toggleMute()">
                        <mat-icon>{{ isMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Fullscreen" (click)="toggleFullscreen()">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="video-placeholder">
                  <mat-icon>play_circle</mat-icon>
                  <span>Select a recording to play</span>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>

    <!-- Speed Menu (hidden, referenced by button) -->
    <mat-menu #speedMenu="matMenu">
      <button mat-menu-item (click)="setPlaybackRate(0.5)">0.5x</button>
      <button mat-menu-item (click)="setPlaybackRate(1)">1x</button>
      <button mat-menu-item (click)="setPlaybackRate(1.5)">1.5x</button>
      <button mat-menu-item (click)="setPlaybackRate(2)">2x</button>
    </mat-menu>
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
      gap: 16px;
      overflow: hidden;
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

    .filter-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .filter-field {
      width: 100%;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        padding: 0 8px;
      }

      ::ng-deep .mat-mdc-form-field-infix {
        padding: 8px 0;
        min-height: 36px;
      }
    }

    .selected-date-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: var(--radius-sm);
      color: var(--accent-primary);
      font-size: 13px;
      font-weight: 500;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .recording-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: var(--glass-bg);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .count-badge {
      padding: 2px 8px;
      background: var(--accent-primary);
      color: white;
      border-radius: 10px;
      font-size: 10px;
    }

    .list-items {
      flex: 1;
      overflow-y: auto;
    }

    .recording-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--glass-border);
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .rec-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
    }

    .rec-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .rec-name {
      font-size: 12px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rec-time {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    .trigger-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;

      &.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.info { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
      &.success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .empty-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 30px 20px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        opacity: 0.5;
      }

      span {
        font-size: 12px;
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
        min-width: 180px;
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
      gap: 4px;
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
        background: rgba(0, 212, 255, 0.05);
      }

      &.selected {
        background: var(--accent-primary);

        .day-number, .data-indicator {
          color: white;
        }
      }

      .day-number {
        font-size: 14px;
        color: var(--text-primary);
      }

      .data-indicator {
        font-size: 10px;
        color: var(--accent-primary);
        font-weight: 600;
      }
    }

    .calendar-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--glass-border);
      margin-top: 16px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;

      &.has-data {
        background: var(--accent-primary);
      }
    }

    // List View
    .list-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .list-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .table-count {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .list-header-row {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      background: var(--glass-bg);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .col-camera { width: 200px; font-size: 12px; color: var(--text-primary); }
    .col-trigger { width: 100px; }
    .col-start { width: 160px; font-size: 12px; color: var(--text-primary); }
    .col-duration { width: 80px; font-size: 12px; color: var(--text-secondary); }
    .col-size { width: 80px; font-size: 12px; color: var(--text-secondary); }
    .col-action { flex: 1; display: flex; justify-content: flex-end; gap: 4px; }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 20px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }

      .hint {
        font-size: 12px;
        opacity: 0.7;
      }
    }

    // Window View
    .window-view {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .video-player {
      flex: 1;
      position: relative;
      background: #0a0b0f;
      display: flex;
      align-items: center;
      justify-content: center;

      video {
        max-width: 100%;
        max-height: 100%;
      }
    }

    .video-error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.85);
      color: var(--error);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
    }

    .player-info {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .camera-name {
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .recording-time {
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
    }

    .alarm-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.9);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      color: white;

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .video-placeholder {
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
      height: 6px;
      background: var(--glass-border);
      border-radius: 3px;
      position: relative;
      margin-bottom: 12px;
      cursor: pointer;
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
      border-radius: 3px;
    }

    .timeline-handle {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      background: var(--accent-primary);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 900px) {
      .playback-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .left-panel {
        max-height: 200px;
      }

      .recording-list {
        display: none;
      }
    }
  `]
})
export class PlaybackComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recordingService = inject(RecordingService);
  private videoSourceService = inject(VideoSourceService);

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter state
  filterCameraId: string | null = null;
  filterTriggerType: string | null = null;

  // Signals
  viewMode = signal<'calendar' | 'list' | 'window'>('calendar');
  currentMonth = signal(new Date());
  selectedDate = signal<string | null>(null);
  cameras = signal<VideoSource[]>([]);
  isSyncing = signal(false);

  // From service
  recordings = this.recordingService.recordings;
  calendarData = this.recordingService.calendarData;
  isLoading = this.recordingService.isLoading;
  selectedRecording = this.recordingService.selectedRecording;

  // Video player state
  videoUrl = signal<string>('');
  videoError = signal<string | null>(null);
  isPlaying = signal(false);
  isMuted = signal(false);
  playProgress = signal(0);
  currentTimeStr = signal('00:00');
  totalTimeStr = signal('00:00');

  // Computed calendar days
  calendarDays = computed<CalendarDayDisplay[]>(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calData = this.calendarData();
    const calDataMap = new Map<string, number>();
    calData.forEach(cd => calDataMap.set(cd.date, cd.count));

    const selectedDateStr = this.selectedDate();

    const days: CalendarDayDisplay[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr, currentMonth: false, hasData: false, count: 0, selected: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const count = calDataMap.get(dateStr) || 0;
      days.push({
        day: i,
        date: dateStr,
        currentMonth: true,
        hasData: count > 0,
        count,
        selected: dateStr === selectedDateStr
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr, currentMonth: false, hasData: false, count: 0, selected: false });
    }

    return days;
  });

  ngOnInit(): void {
    // Load cameras
    this.videoSourceService.loadVideoSources().subscribe(cameras => {
      this.cameras.set(cameras);
    });

    // Load calendar for current month
    this.loadCalendar();

    // Check for alarm_id query param
    this.route.queryParams.subscribe(params => {
      const alarmId = params['alarm_id'];
      if (alarmId) {
        this.loadRecordingsForAlarm(alarmId);
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  currentMonthYear(): string {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  setViewMode(mode: 'calendar' | 'list' | 'window'): void {
    this.viewMode.set(mode);
  }

  prevMonth(): void {
    const date = this.currentMonth();
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth() - 1, 1));
    this.loadCalendar();
  }

  nextMonth(): void {
    const date = this.currentMonth();
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth() + 1, 1));
    this.loadCalendar();
  }

  loadCalendar(): void {
    const date = this.currentMonth();
    this.recordingService.loadCalendar(date.getFullYear(), date.getMonth() + 1, this.filterCameraId || undefined).subscribe();
  }

  onCameraChange(): void {
    this.loadCalendar();
    if (this.selectedDate()) {
      this.loadRecordingsForDate();
    }
  }

  selectDate(day: CalendarDayDisplay): void {
    if (!day.currentMonth) return;

    this.selectedDate.set(day.date);
    this.loadRecordingsForDate();
    this.setViewMode('list');
  }

  loadRecordingsForDate(): void {
    const date = this.selectedDate();
    if (!date) return;

    this.recordingService.loadRecordingsByDate(date, this.filterCameraId || undefined).subscribe();
  }

  loadRecordingsForAlarm(alarmId: string): void {
    this.recordingService.getRecordingsByAlarm(alarmId).subscribe(recordings => {
      if (recordings.length > 0) {
        this.selectRecording(recordings[0]);
        this.setViewMode('window');
      }
    });
  }

  selectRecording(recording: Recording): void {
    this.recordingService.selectRecording(recording);
    this.loadVideoUrl(recording);
  }

  loadVideoUrl(recording: Recording): void {
    this.videoError.set(null);
    this.recordingService.getVideoUrl(recording.id).subscribe({
      next: (response) => {
        this.videoUrl.set(response.video_url);
      },
      error: (err) => {
        console.error('Failed to get video URL:', err);
        this.videoError.set('Failed to load video');
      }
    });
  }

  playRecording(recording: Recording): void {
    this.selectRecording(recording);
    this.setViewMode('window');
  }

  // Video player methods
  onVideoLoaded(event: Event): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      this.totalTimeStr.set(this.formatTime(video.duration));
      video.play().catch(() => {
        // Autoplay blocked
      });
    }
  }

  onTimeUpdate(event: Event): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      this.playProgress.set((video.currentTime / video.duration) * 100);
      this.currentTimeStr.set(this.formatTime(video.currentTime));
      this.isPlaying.set(!video.paused);
    }
  }

  onVideoEnded(): void {
    this.isPlaying.set(false);
  }

  onVideoError(event: Event): void {
    this.videoError.set('Failed to play video');
    this.isPlaying.set(false);
  }

  togglePlay(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
      this.isPlaying.set(!video.paused);
    }
  }

  toggleMute(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.muted = !video.muted;
      this.isMuted.set(video.muted);
    }
  }

  skipBack(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10);
    }
  }

  skipForward(): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    }
  }

  seekTo(event: MouseEvent): void {
    const video = this.videoPlayer?.nativeElement;
    const timeline = event.currentTarget as HTMLElement;
    if (video && timeline) {
      const rect = timeline.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      video.currentTime = video.duration * percent;
    }
  }

  setPlaybackRate(rate: number): void {
    const video = this.videoPlayer?.nativeElement;
    if (video) {
      video.playbackRate = rate;
    }
  }

  toggleFullscreen(): void {
    const container = this.videoPlayer?.nativeElement?.parentElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  }

  retryVideo(): void {
    const recording = this.selectedRecording();
    if (recording) {
      this.loadVideoUrl(recording);
    }
  }

  // Download
  downloadRecording(recording: Recording): void {
    this.recordingService.downloadRecording(recording.id);
  }

  // Navigation
  viewAlarm(recording: Recording): void {
    if (recording.alarm_id) {
      this.router.navigate(['/event'], { queryParams: { alarm_id: recording.alarm_id } });
    }
  }

  // Sync
  syncRecordings(): void {
    this.isSyncing.set(true);
    this.recordingService.syncFromAlarms().subscribe({
      next: () => {
        this.isSyncing.set(false);
        this.loadCalendar();
        if (this.selectedDate()) {
          this.loadRecordingsForDate();
        }
      },
      error: () => {
        this.isSyncing.set(false);
      }
    });
  }

  // Formatters
  formatSelectedDate(): string {
    const date = this.selectedDate();
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatRecordingTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number | undefined): string {
    return formatDuration(seconds);
  }

  formatFileSize(bytes: number | undefined): string {
    return formatFileSize(bytes);
  }

  getTriggerLabel(type: string): string {
    return getTriggerTypeLabel(type);
  }

  getTriggerColor(type: string): string {
    return getTriggerTypeColor(type);
  }
}
