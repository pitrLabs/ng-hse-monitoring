import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlarmService } from '../../core/services/alarm.service';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import {
  Alarm,
  AlarmSeverity,
  getAlarmSeverity,
  getAlarmImageUrl,
  ALARM_TYPE_SEVERITY
} from '../../core/models/alarm.model';

@Component({
  selector: 'app-event',
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
    MatInputModule
  ],
  template: `
    <div class="event-container">
      <!-- Left Panel: Filters -->
      <div class="left-panel glass-card-static">
        <h3 class="panel-title">
          <mat-icon>filter_list</mat-icon>
          Filters
        </h3>

        <!-- Search -->
        <div class="filter-section">
          <label class="filter-label">Search</label>
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search alarms..." [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" class="search-input">
          </div>
        </div>

        <!-- Camera Filter -->
        <div class="filter-section">
          <label class="filter-label">Camera</label>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="filterCameraId" (ngModelChange)="applyFilters()" placeholder="All Cameras">
              <mat-option [value]="null">All Cameras</mat-option>
              @for (camera of cameras(); track camera.id) {
                <mat-option [value]="camera.stream_name">{{ camera.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Alarm Type Filter -->
        <div class="filter-section">
          <label class="filter-label">Alarm Type</label>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="filterAlarmType" (ngModelChange)="applyFilters()" placeholder="All Types">
              <mat-option [value]="null">All Types</mat-option>
              @for (type of alarmTypes(); track type) {
                <mat-option [value]="type">{{ type }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Status Filter -->
        <div class="filter-section">
          <label class="filter-label">Status</label>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" placeholder="All Status">
              <mat-option [value]="null">All Status</mat-option>
              <mat-option value="new">New</mat-option>
              <mat-option value="acknowledged">Acknowledged</mat-option>
              <mat-option value="resolved">Resolved</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Date Range -->
        <div class="filter-section">
          <label class="filter-label">Date Range</label>
          <div class="date-inputs">
            <input type="date" [(ngModel)]="filterStartDate" (ngModelChange)="applyFilters()" class="date-input">
            <span class="date-separator">to</span>
            <input type="date" [(ngModel)]="filterEndDate" (ngModelChange)="applyFilters()" class="date-input">
          </div>
        </div>

        <!-- Clear Filters -->
        <button mat-stroked-button class="clear-btn" (click)="clearFilters()">
          <mat-icon>clear</mat-icon>
          Clear Filters
        </button>

        <!-- Connection Status -->
        <div class="connection-status" [class]="connectionStatus()">
          <span class="status-dot"></span>
          <span class="status-text">
            @switch (connectionStatus()) {
              @case ('connected') { Live Updates Active }
              @case ('connecting') { Connecting... }
              @default { Disconnected }
            }
          </span>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-card glass-card-static">
            <div class="stat-header">
              <span>Total Alarms</span>
              <mat-icon>notifications</mat-icon>
            </div>
            <span class="stat-value">{{ stats()?.total || 0 }}</span>
          </div>
          <div class="stat-card glass-card-static new">
            <div class="stat-header">
              <span>New</span>
              <mat-icon>error</mat-icon>
            </div>
            <span class="stat-value">{{ stats()?.new || 0 }}</span>
          </div>
          <div class="stat-card glass-card-static acknowledged">
            <div class="stat-header">
              <span>Acknowledged</span>
              <mat-icon>check_circle</mat-icon>
            </div>
            <span class="stat-value">{{ stats()?.acknowledged || 0 }}</span>
          </div>
          <div class="stat-card glass-card-static resolved">
            <div class="stat-header">
              <span>Resolved</span>
              <mat-icon>done_all</mat-icon>
            </div>
            <span class="stat-value">{{ stats()?.resolved || 0 }}</span>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <!-- Pie Chart: Alarm by Type -->
          <div class="chart-card glass-card-static">
            <h4>Alarms by Type</h4>
            <div class="pie-container">
              <svg viewBox="0 0 100 100">
                @for (segment of pieSegments(); track segment.type; let i = $index) {
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    [attr.stroke]="segment.color"
                    stroke-width="20"
                    [attr.stroke-dasharray]="segment.dashArray"
                    [attr.stroke-dashoffset]="segment.offset"
                  />
                }
              </svg>
              <div class="pie-center">
                <span>{{ stats()?.total || 0 }}</span>
                <span>Total</span>
              </div>
            </div>
            <div class="pie-legend">
              @for (segment of pieSegments(); track segment.type) {
                <div class="legend-item">
                  <span class="dot" [style.background]="segment.color"></span>
                  {{ segment.type }} ({{ segment.count }})
                </div>
              }
            </div>
          </div>

          <!-- Severity Distribution -->
          <div class="chart-card glass-card-static">
            <h4>Severity Distribution</h4>
            <div class="severity-bars">
              @for (severity of severityData(); track severity.level) {
                <div class="severity-row">
                  <span class="severity-label" [class]="severity.level">{{ severity.level }}</span>
                  <div class="severity-bar-wrapper">
                    <div class="severity-bar" [class]="severity.level" [style.width.%]="severity.percentage"></div>
                  </div>
                  <span class="severity-count">{{ severity.count }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        @if (selectedAlarms().length > 0) {
          <div class="bulk-actions glass-card-static">
            <span>{{ selectedAlarms().length }} selected</span>
            <button mat-stroked-button (click)="bulkAcknowledge()">
              <mat-icon>check</mat-icon>
              Acknowledge All
            </button>
            <button mat-stroked-button (click)="bulkResolve()">
              <mat-icon>done_all</mat-icon>
              Resolve All
            </button>
            <button mat-stroked-button (click)="clearSelection()">
              <mat-icon>clear</mat-icon>
              Clear Selection
            </button>
          </div>
        }

        <!-- Event Table -->
        <div class="event-table glass-card-static">
          <div class="table-title-row">
            <h3 class="section-title">Alarm Events</h3>
            <span class="table-count">{{ filteredAlarms().length }} alarms</span>
          </div>
          <div class="table-header">
            <span class="col-check">
              <mat-checkbox [(ngModel)]="selectAll" (ngModelChange)="toggleSelectAll()" color="primary"></mat-checkbox>
            </span>
            <span class="col-time">Time</span>
            <span class="col-camera">Camera</span>
            <span class="col-type">Type</span>
            <span class="col-severity">Severity</span>
            <span class="col-status">Status</span>
            <span class="col-action">Actions</span>
          </div>
          <div class="table-body">
            @for (alarm of filteredAlarms(); track alarm.id) {
              <div class="table-row" [class.selected]="isSelected(alarm)" (click)="viewAlarmDetail(alarm)">
                <span class="col-check" (click)="$event.stopPropagation()">
                  <mat-checkbox [checked]="isSelected(alarm)" (change)="toggleAlarmSelection(alarm)" color="primary"></mat-checkbox>
                </span>
                <span class="col-time">{{ formatTime(alarm.alarm_time) }}</span>
                <span class="col-camera">{{ alarm.camera_name || 'Unknown' }}</span>
                <span class="col-type">
                  <span class="type-badge">{{ alarm.alarm_type }}</span>
                </span>
                <span class="col-severity">
                  <span class="severity-badge" [class]="getSeverity(alarm.alarm_type)">{{ getSeverity(alarm.alarm_type) }}</span>
                </span>
                <span class="col-status">
                  <span class="status-badge" [class]="alarm.status">{{ alarm.status }}</span>
                </span>
                <span class="col-action" (click)="$event.stopPropagation()">
                  @if (alarm.status === 'new') {
                    <button mat-icon-button matTooltip="Acknowledge" (click)="acknowledgeAlarm(alarm)">
                      <mat-icon>check</mat-icon>
                    </button>
                  }
                  @if (alarm.status !== 'resolved') {
                    <button mat-icon-button matTooltip="Resolve" (click)="resolveAlarm(alarm)">
                      <mat-icon>done_all</mat-icon>
                    </button>
                  }
                  <button mat-icon-button matTooltip="View Details" (click)="viewAlarmDetail(alarm)">
                    <mat-icon>info</mat-icon>
                  </button>
                  @if (alarm.video_url) {
                    <button mat-icon-button matTooltip="View Recording" (click)="viewRecording(alarm)">
                      <mat-icon>videocam</mat-icon>
                    </button>
                  }
                </span>
              </div>
            } @empty {
              <div class="table-empty">
                <mat-icon>notifications_none</mat-icon>
                <span>No alarms found</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Alarm Detail Modal -->
    @if (selectedAlarm()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="alarm-modal" (click)="$event.stopPropagation()">
          <div class="modal-header" [class]="getSeverity(selectedAlarm()!.alarm_type)">
            <mat-icon>{{ getAlarmIcon(selectedAlarm()!.alarm_type) }}</mat-icon>
            <span>{{ selectedAlarm()!.alarm_name }}</span>
            <button mat-icon-button (click)="closeModal()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="modal-content">
            @if (selectedAlarm()!.image_url) {
              <div class="modal-image">
                <img [src]="getImageUrl(selectedAlarm()!.image_url)" alt="Alarm capture" (error)="onImageError($event)">
              </div>
            }
            <div class="modal-details">
              <div class="detail-row">
                <span class="detail-label">Camera</span>
                <span class="detail-value">{{ selectedAlarm()!.camera_name || 'Unknown' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">{{ selectedAlarm()!.location || 'Not specified' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">{{ formatDateTime(selectedAlarm()!.alarm_time) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">
                  <span class="type-badge">{{ selectedAlarm()!.alarm_type }}</span>
                </span>
              </div>
              @if (selectedAlarm()!.confidence) {
                <div class="detail-row">
                  <span class="detail-label">Confidence</span>
                  <span class="detail-value">{{ (selectedAlarm()!.confidence! * 100).toFixed(0) }}%</span>
                </div>
              }
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="status-badge" [class]="selectedAlarm()!.status">{{ selectedAlarm()!.status }}</span>
              </div>
              @if (selectedAlarm()!.description) {
                <div class="detail-row full">
                  <span class="detail-label">Description</span>
                  <span class="detail-value">{{ selectedAlarm()!.description }}</span>
                </div>
              }
            </div>
          </div>
          <div class="modal-actions">
            @if (selectedAlarm()!.status === 'new') {
              <button mat-stroked-button (click)="acknowledgeSelectedAlarm()">
                <mat-icon>check</mat-icon>
                Acknowledge
              </button>
            }
            @if (selectedAlarm()!.status !== 'resolved') {
              <button mat-stroked-button (click)="resolveSelectedAlarm()">
                <mat-icon>done_all</mat-icon>
                Resolve
              </button>
            }
            @if (selectedAlarm()!.video_url) {
              <button mat-flat-button color="primary" (click)="viewRecording(selectedAlarm()!)">
                <mat-icon>videocam</mat-icon>
                View Recording
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .event-container {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
      overflow: hidden;
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
      overflow-y: auto;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
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

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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

    .date-inputs {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .date-input {
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;

      &:focus {
        border-color: var(--accent-primary);
      }
    }

    .date-separator {
      font-size: 11px;
      color: var(--text-tertiary);
      text-align: center;
    }

    .clear-btn {
      margin-top: auto;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 11px;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      &.connected {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        .status-dot { background: #22c55e; animation: pulse 2s infinite; }
      }

      &.connecting {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        .status-dot { background: #f59e0b; }
      }

      &.disconnected {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        .status-dot { background: #ef4444; }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    // Right Panel
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      padding-right: 4px;
    }

    // Stats Row
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .stat-card {
      padding: 16px;

      &.new .stat-header mat-icon { color: #ef4444; }
      &.acknowledged .stat-header mat-icon { color: #f59e0b; }
      &.resolved .stat-header mat-icon { color: #22c55e; }
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      span {
        font-size: 12px;
        color: var(--text-secondary);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
    }

    // Charts Section
    .charts-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .chart-card {
      padding: 16px;

      h4 {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 12px;
      }
    }

    .pie-container {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto 12px;

      svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
    }

    .pie-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;

      span:first-child {
        display: block;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
      }

      span:last-child {
        font-size: 10px;
        color: var(--text-tertiary);
      }
    }

    .pie-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--text-secondary);

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
      }
    }

    // Severity Bars
    .severity-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .severity-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .severity-label {
      width: 60px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
      padding: 2px 6px;
      border-radius: 4px;

      &.critical { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
      &.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.medium { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.low { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    }

    .severity-bar-wrapper {
      flex: 1;
      height: 8px;
      background: var(--glass-bg);
      border-radius: 4px;
      overflow: hidden;
    }

    .severity-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;

      &.critical { background: #dc2626; }
      &.high { background: #ef4444; }
      &.medium { background: #f59e0b; }
      &.low { background: #3b82f6; }
    }

    .severity-count {
      width: 30px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
    }

    // Bulk Actions
    .bulk-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;

      span {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        margin-right: auto;
      }
    }

    // Event Table
    .event-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }

    .table-title-row {
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

    .table-header {
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
      transition: background 0.15s;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .table-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
    }

    .col-check { width: 40px; }
    .col-time { width: 140px; font-size: 12px; color: var(--text-primary); }
    .col-camera { width: 150px; font-size: 12px; color: var(--text-primary); }
    .col-type { width: 120px; }
    .col-severity { width: 80px; }
    .col-status { width: 100px; }
    .col-action { flex: 1; display: flex; justify-content: flex-end; gap: 4px; }

    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(0, 212, 255, 0.15);
      color: var(--accent-primary);
      border-radius: 4px;
      font-size: 11px;
    }

    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: capitalize;

      &.critical { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
      &.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.medium { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.low { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 500;
      text-transform: capitalize;

      &.new { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.acknowledged { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    // Modal
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .alarm-modal {
      width: 100%;
      max-width: 540px;
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      color: #fff;

      &.critical { background: linear-gradient(135deg, #dc2626, #b91c1c); }
      &.high { background: linear-gradient(135deg, #ef4444, #dc2626); }
      &.medium { background: linear-gradient(135deg, #f59e0b, #d97706); }
      &.low { background: linear-gradient(135deg, #3b82f6, #2563eb); }

      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      span { flex: 1; font-size: 14px; font-weight: 600; }
      button { color: rgba(255,255,255,0.8); &:hover { color: #fff; } }
    }

    .modal-content {
      padding: 20px;
    }

    .modal-image {
      margin-bottom: 16px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--bg-tertiary);
      min-height: 200px;

      img {
        width: 100%;
        display: block;
      }
    }

    .modal-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 12px;

      &.full {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .detail-label {
      width: 80px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .detail-value {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--glass-border);
    }

    @media (max-width: 1100px) {
      .event-container {
        grid-template-columns: 1fr;
      }

      .left-panel {
        max-height: 300px;
      }

      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EventComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private alarmService = inject(AlarmService);
  private videoSourceService = inject(VideoSourceService);

  // Filter state
  searchQuery = '';
  filterCameraId: string | null = null;
  filterAlarmType: string | null = null;
  filterStatus: string | null = null;
  filterStartDate: string | null = null;
  filterEndDate: string | null = null;
  selectAll = false;

  // Signals from services
  alarms = this.alarmService.alarms;
  stats = this.alarmService.stats;
  connectionStatus = this.alarmService.connectionStatus;
  cameras = signal<VideoSource[]>([]);
  selectedAlarms = signal<string[]>([]);
  selectedAlarm = signal<Alarm | null>(null);

  // Computed signals
  alarmTypes = computed(() => {
    const types = new Set<string>();
    this.alarms().forEach(a => types.add(a.alarm_type));
    return Array.from(types).sort();
  });

  filteredAlarms = computed(() => {
    let result = this.alarms();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.alarm_name.toLowerCase().includes(query) ||
        a.alarm_type.toLowerCase().includes(query) ||
        (a.camera_name?.toLowerCase().includes(query)) ||
        (a.location?.toLowerCase().includes(query))
      );
    }

    if (this.filterCameraId) {
      result = result.filter(a => a.camera_id === this.filterCameraId);
    }

    if (this.filterAlarmType) {
      result = result.filter(a => a.alarm_type === this.filterAlarmType);
    }

    if (this.filterStatus) {
      result = result.filter(a => a.status === this.filterStatus);
    }

    return result;
  });

  pieSegments = computed(() => {
    const byType = this.stats()?.by_type || {};
    const total = Object.values(byType).reduce((sum: number, count: number) => sum + count, 0) || 1;
    const colors = ['#00d4ff', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e'];

    let offset = 25; // Start from top
    const circumference = 251.2; // 2 * PI * 40

    return Object.entries(byType).map(([type, count], i) => {
      const percentage = (count as number) / total;
      const dashLength = percentage * circumference;
      const segment = {
        type,
        count: count as number,
        color: colors[i % colors.length],
        dashArray: `${dashLength} ${circumference - dashLength}`,
        offset: -offset
      };
      offset += dashLength;
      return segment;
    });
  });

  severityData = computed(() => {
    const counts: Record<AlarmSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    this.alarms().forEach(a => {
      const severity = getAlarmSeverity(a.alarm_type);
      counts[severity]++;
    });
    const total = this.alarms().length || 1;

    return (['critical', 'high', 'medium', 'low'] as AlarmSeverity[]).map(level => ({
      level,
      count: counts[level],
      percentage: (counts[level] / total) * 100
    }));
  });

  ngOnInit(): void {
    // Load alarms and stats
    this.alarmService.loadAlarms({ limit: 200 });
    this.alarmService.loadStats();

    // Load cameras for filter
    this.videoSourceService.loadVideoSources().subscribe(cameras => {
      this.cameras.set(cameras);
    });
  }

  ngOnDestroy(): void {
    // AlarmService is singleton, no cleanup needed
  }

  applyFilters(): void {
    const params: any = { limit: 200 };

    if (this.filterCameraId) {
      params.camera_id = this.filterCameraId;
    }
    if (this.filterAlarmType) {
      params.alarm_type = this.filterAlarmType;
    }
    if (this.filterStatus) {
      params.status = this.filterStatus;
    }
    if (this.filterStartDate) {
      params.start_date = this.filterStartDate;
    }
    if (this.filterEndDate) {
      params.end_date = this.filterEndDate;
    }

    this.alarmService.loadAlarms(params);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterCameraId = null;
    this.filterAlarmType = null;
    this.filterStatus = null;
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.alarmService.loadAlarms({ limit: 200 });
  }

  // Selection methods
  isSelected(alarm: Alarm): boolean {
    return this.selectedAlarms().includes(alarm.id);
  }

  toggleAlarmSelection(alarm: Alarm): void {
    const current = this.selectedAlarms();
    if (current.includes(alarm.id)) {
      this.selectedAlarms.set(current.filter(id => id !== alarm.id));
    } else {
      this.selectedAlarms.set([...current, alarm.id]);
    }
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedAlarms.set(this.filteredAlarms().map(a => a.id));
    } else {
      this.selectedAlarms.set([]);
    }
  }

  clearSelection(): void {
    this.selectedAlarms.set([]);
    this.selectAll = false;
  }

  // Alarm actions
  async acknowledgeAlarm(alarm: Alarm): Promise<void> {
    try {
      await this.alarmService.acknowledgeAlarm(alarm.id);
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  }

  async resolveAlarm(alarm: Alarm): Promise<void> {
    try {
      await this.alarmService.resolveAlarm(alarm.id);
    } catch (err) {
      console.error('Failed to resolve alarm:', err);
    }
  }

  async bulkAcknowledge(): Promise<void> {
    const ids = this.selectedAlarms();
    if (ids.length === 0) return;

    try {
      await this.alarmService.bulkAcknowledge(ids);
      this.clearSelection();
    } catch (err) {
      console.error('Failed to bulk acknowledge:', err);
    }
  }

  async bulkResolve(): Promise<void> {
    const ids = this.selectedAlarms();
    if (ids.length === 0) return;

    try {
      await this.alarmService.bulkResolve(ids);
      this.clearSelection();
    } catch (err) {
      console.error('Failed to bulk resolve:', err);
    }
  }

  // Modal methods
  viewAlarmDetail(alarm: Alarm): void {
    this.selectedAlarm.set(alarm);
  }

  closeModal(): void {
    this.selectedAlarm.set(null);
  }

  async acknowledgeSelectedAlarm(): Promise<void> {
    const alarm = this.selectedAlarm();
    if (alarm) {
      await this.acknowledgeAlarm(alarm);
      // Update the selected alarm status
      this.selectedAlarm.set({ ...alarm, status: 'acknowledged' });
    }
  }

  async resolveSelectedAlarm(): Promise<void> {
    const alarm = this.selectedAlarm();
    if (alarm) {
      await this.resolveAlarm(alarm);
      this.selectedAlarm.set({ ...alarm, status: 'resolved' });
    }
  }

  viewRecording(alarm: Alarm): void {
    this.closeModal();
    this.router.navigate(['/playback'], { queryParams: { alarm_id: alarm.id } });
  }

  // Helper methods
  getSeverity(alarmType: string): AlarmSeverity {
    return getAlarmSeverity(alarmType);
  }

  getImageUrl(imageUrl: string | undefined | null): string | null {
    return getAlarmImageUrl(imageUrl);
  }

  getAlarmIcon(alarmType: string): string {
    const severity = getAlarmSeverity(alarmType);
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'notifications';
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
