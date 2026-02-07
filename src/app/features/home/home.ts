import { Component, signal, computed, OnInit, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlarmService } from '../../core/services/alarm.service';
import { AlarmNotification, getAlarmImageUrl } from '../../core/models/alarm.model';
import { LocationsService, CameraLocation } from '../../core/services/locations.service';
import { AuthService } from '../../core/services/auth.service';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import { AITaskService, BmappTask } from '../../core/services/ai-task.service';
import { RecordingControlService } from '../../core/services/recording-control.service';
import { LeafletMapComponent, MapMarker } from '../../shared/components/leaflet-map/leaflet-map';
import { WsVideoPlayerComponent } from '../../shared/components/ws-video-player/ws-video-player.component';

interface DeviceStatus {
  online: number;
  offline: number;
}

interface AlarmData {
  date: string;
  count: number;
}

interface DeviceClass {
  name: string;
  online: number;
  offline: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    LeafletMapComponent,
    WsVideoPlayerComponent
  ],
  template: `
    <!-- BM-APP Connection Warning -->
    @if (alarmService.connectionStatus() === 'disconnected') {
      <div class="connection-warning">
        <mat-icon>warning</mat-icon>
        <span>BM-APP connection lost. Trying to reconnect... Some features may be unavailable.</span>
      </div>
    }

    <div class="home-container">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Status Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>pie_chart</mat-icon>
            Status
          </h3>
          <div class="pie-chart-container">
            <svg viewBox="0 0 100 100" class="pie-chart">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--info)" stroke-width="20"
                [attr.stroke-dasharray]="getOnlineArc() + ' ' + getOfflineArc()"
                stroke-dashoffset="25" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--success)" stroke-width="20"
                [attr.stroke-dasharray]="getOfflineArc() + ' ' + getOnlineArc()"
                [attr.stroke-dashoffset]="25 - getOnlineArc()" />
            </svg>
            <div class="chart-center">
              <span class="total-count">{{ deviceStatus().online + deviceStatus().offline }}</span>
              <span class="total-label">Total</span>
            </div>
          </div>
          <div class="legend">
            <div class="legend-item">
              <span class="legend-color online"></span>
              <span class="legend-label">Online</span>
              <span class="legend-value">{{ deviceStatus().online }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color offline"></span>
              <span class="legend-label">Offline</span>
              <span class="legend-value">{{ deviceStatus().offline }}</span>
            </div>
          </div>
        </div>

        <!-- Alarm Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>show_chart</mat-icon>
            Alarm
            @if (alarmService.stats(); as stats) {
              <span class="widget-badge">{{ stats.new }} new</span>
            }
          </h3>
          <div class="line-chart-container">
            <svg viewBox="0 0 300 150" class="line-chart" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="40" y2="120" stroke="var(--glass-border)" stroke-width="1"/>
              <line x1="40" y1="120" x2="290" y2="120" stroke="var(--glass-border)" stroke-width="1"/>
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <line [attr.x1]="40" [attr.y1]="20 + i * 25" [attr.x2]="290" [attr.y2]="20 + i * 25"
                  stroke="var(--glass-border)" stroke-width="0.5" stroke-dasharray="4"/>
              }
              <!-- Y-axis labels -->
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <text [attr.x]="35" [attr.y]="25 + i * 25" fill="var(--text-tertiary)" font-size="8" text-anchor="end">
                  {{ 50 - i * 12 }}
                </text>
              }
              <!-- Line path -->
              <path [attr.d]="getAlarmLinePath()" fill="none" stroke="var(--accent-primary)" stroke-width="2"/>
              <!-- Area fill -->
              <path [attr.d]="getAlarmAreaPath()" fill="url(#alarmGradient)" opacity="0.3"/>
              <!-- Gradient definition -->
              <defs>
                <linearGradient id="alarmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-primary)"/>
                  <stop offset="100%" stop-color="transparent"/>
                </linearGradient>
              </defs>
              <!-- Data points -->
              @for (point of alarmDataPoints(); track point.x; let i = $index) {
                <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" fill="var(--accent-primary)"/>
              }
              <!-- X-axis labels -->
              @for (data of alarmData(); track data.date; let i = $index) {
                <text [attr.x]="55 + i * 40" [attr.y]="135" fill="var(--text-tertiary)" font-size="7" text-anchor="middle">
                  {{ data.date }}
                </text>
              }
            </svg>
          </div>
        </div>

        <!-- Device Class Widget -->
        <div class="widget glass-card-static">
          <h3 class="widget-title">
            <mat-icon>devices</mat-icon>
            Device Class
          </h3>
          <div class="bar-chart-container">
            @for (device of deviceClasses(); track device.name) {
              <div class="bar-row">
                <span class="bar-label">{{ device.name }}</span>
                <div class="bar-wrapper">
                  <div class="bar online" [style.width.%]="getBarWidth(device.online)"></div>
                  <div class="bar offline" [style.width.%]="getBarWidth(device.offline)"></div>
                </div>
                <span class="bar-total">{{ device.online + device.offline }}</span>
              </div>
            }
          </div>
          <div class="legend horizontal">
            <div class="legend-item">
              <span class="legend-color online"></span>
              <span class="legend-label">Online</span>
            </div>
            <div class="legend-item">
              <span class="legend-color offline"></span>
              <span class="legend-label">Offline</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Column -->
      <div class="center-column">
        <!-- Map Container -->
        <div class="map-container glass-card-static">
          <div class="map-toolbar-left">
            <button mat-icon-button class="map-tool-btn" matTooltip="Zoom In" (click)="mapZoomIn()">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-icon-button class="map-tool-btn" matTooltip="Zoom Out" (click)="mapZoomOut()">
              <mat-icon>remove</mat-icon>
            </button>
            <mat-divider></mat-divider>
            <button mat-icon-button class="map-tool-btn" matTooltip="Sync Locations" (click)="syncLocations()">
              <mat-icon>sync</mat-icon>
            </button>
            <button mat-icon-button class="map-tool-btn" matTooltip="Fit All Markers" (click)="fitAllMarkers()">
              <mat-icon>fit_screen</mat-icon>
            </button>
            <div class="auto-label">{{ mapMarkers().length }} locations</div>
          </div>

          <div class="map-toolbar-right">
            <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapTypeMenu">
              <mat-icon>layers</mat-icon>
              Map Type
            </button>
            <mat-menu #mapTypeMenu="matMenu">
              <button mat-menu-item (click)="setMapType('dark')">
                <mat-icon>dark_mode</mat-icon>
                <span>Dark</span>
              </button>
              <button mat-menu-item (click)="setMapType('standard')">
                <mat-icon>map</mat-icon>
                <span>Standard</span>
              </button>
              <button mat-menu-item (click)="setMapType('satellite')">
                <mat-icon>satellite</mat-icon>
                <span>Satellite</span>
              </button>
            </mat-menu>
          </div>

          <div class="compass">
            <mat-icon>explore</mat-icon>
          </div>

          <app-leaflet-map
            #mapComponent
            [markers]="mapMarkers()"
            [tileLayer]="mapTileLayer()"
            [center]="mapCenter"
            [zoom]="10"
            (markerClick)="onMarkerClick($event)"
          ></app-leaflet-map>
        </div>

        <!-- Video Preview Panel -->
        <div class="video-panel glass-card-static">
          <div class="video-panel-header">
            <span class="video-panel-title">
              <mat-icon>smart_display</mat-icon>
              Live Cameras
            </span>
            <span class="video-panel-count">{{ onlineTasks().length }} online</span>
          </div>
          <div class="video-grid">
            @if (loadingCameras()) {
              <div class="video-loading">
                <mat-spinner diameter="32"></mat-spinner>
                <span>Loading cameras...</span>
              </div>
            } @else {
              @for (task of cameraSlots(); track $index; let i = $index) {
                <div class="video-cell" [class.has-video]="task" [class.recording]="task && recordingService.isRecording(getStreamId(task))">
                  @if (task) {
                    <app-ws-video-player
                      [stream]="getStreamId(task)"
                      [mediaName]="task.MediaName"
                      [showControls]="false"
                      [showFps]="false"
                      [useSharedService]="onlineTasks().length > 1">
                    </app-ws-video-player>
                    <div class="video-info-overlay">
                      <span class="video-status online"></span>
                      <span class="video-name">{{ task.MediaName }}</span>
                      @if (recordingService.isRecording(getStreamId(task))) {
                        <span class="recording-indicator">
                          <span class="rec-dot"></span>
                          REC
                        </span>
                      }
                    </div>
                    <!-- Recording Controls (only for Operator+) -->
                    @if (canRecord()) {
                      <div class="video-record-controls">
                        @if (recordingService.isRecording(getStreamId(task))) {
                          <button mat-icon-button class="stop-btn" matTooltip="Stop Recording" (click)="stopRecording(task); $event.stopPropagation()">
                            <mat-icon>stop</mat-icon>
                          </button>
                        } @else {
                          <button mat-icon-button class="record-btn" matTooltip="Start Recording" (click)="startRecording(task); $event.stopPropagation()">
                            <mat-icon>fiber_manual_record</mat-icon>
                          </button>
                        }
                      </div>
                    }
                  } @else {
                    <div class="video-placeholder">
                      <mat-icon>videocam_off</mat-icon>
                      <span>Slot {{ i + 1 }}</span>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <!-- Notify List -->
        <div class="widget notify-widget glass-card-static">
          <div class="widget-title-row">
            <h3 class="widget-title">
              <mat-icon>notifications_active</mat-icon>
              Notify List
              @if (alarmService.connectionStatus() === 'connected') {
                <span class="live-indicator"></span>
              }
            </h3>
            @if (authService.isSuperadmin()) {
              <a routerLink="/admin/alarms" class="view-all-link">View All</a>
            }
          </div>
          <div class="notify-list">
            @for (notif of alarmService.notifications(); track notif.id) {
              <div class="notify-item" [class]="notif.type" (click)="viewAlarmDetail(notif)">
                <div class="notify-icon">
                  <mat-icon>{{ getNotifyIcon(notif.type) }}</mat-icon>
                </div>
                <div class="notify-content">
                  <span class="notify-message">{{ notif.message }}</span>
                  <span class="notify-location">{{ notif.location }}</span>
                  <span class="notify-time">{{ notif.time }}</span>
                </div>
              </div>
            } @empty {
              <div class="notify-empty">
                <mat-icon>notifications_none</mat-icon>
                <span>No recent alarms</span>
                @if (alarmService.connectionStatus() !== 'connected') {
                  <span class="notify-hint">Connecting to alarm service...</span>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Alarm Detail Popup -->
    @if (selectedNotification()) {
      <div class="popup-overlay" (click)="closePopup()">
        <div class="alarm-popup" (click)="$event.stopPropagation()">
          <div class="popup-header" [class]="selectedNotification()?.type">
            <mat-icon>{{ getNotifyIcon(selectedNotification()?.type || 'info') }}</mat-icon>
            <span>{{ selectedNotification()?.message }}</span>
            <button mat-icon-button (click)="closePopup()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="popup-content">
            @if (selectedNotification()?.alarm?.image_url) {
              <div class="popup-image">
                <img [src]="getImageUrl(selectedNotification()?.alarm?.image_url)" alt="Alarm capture">
              </div>
            }
            <div class="popup-details">
              <div class="popup-row">
                <span class="popup-label">Location</span>
                <span class="popup-value">{{ selectedNotification()?.location }}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Time</span>
                <span class="popup-value">{{ selectedNotification()?.alarm?.alarm_time | date:'medium' }}</span>
              </div>
              @if (selectedNotification()?.alarm?.confidence) {
                <div class="popup-row">
                  <span class="popup-label">Confidence</span>
                  <span class="popup-value">{{ (selectedNotification()?.alarm?.confidence || 0) * 100 | number:'1.0-0' }}%</span>
                </div>
              }
              <div class="popup-row">
                <span class="popup-label">Status</span>
                <span class="status-badge" [class]="selectedNotification()?.alarm?.status">
                  {{ selectedNotification()?.alarm?.status }}
                </span>
              </div>
            </div>
          </div>
          <div class="popup-actions">
            @if (selectedNotification()?.alarm?.status === 'new') {
              <button mat-stroked-button (click)="acknowledgeAlarm()">
                <mat-icon>check</mat-icon>
                Acknowledge
              </button>
            }
            @if (authService.isSuperadmin()) {
              <a mat-flat-button color="primary" routerLink="/admin/alarms" (click)="closePopup()">
                View All Alarms
              </a>
            }
          </div>
        </div>
      </div>
    }
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

    .home-container {
      display: grid;
      grid-template-columns: 280px 1fr 300px;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    .left-column, .right-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .center-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    // Widget Base
    .widget {
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .widget-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--glass-border);

      .widget-title {
        margin: 0;
        padding: 0;
        border: none;
      }
    }

    .view-all-link {
      font-size: 12px;
      color: var(--accent-primary);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .widget-badge {
      margin-left: auto;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-radius: 10px;
    }

    .live-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      margin-left: 8px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.9); }
    }

    // Pie Chart
    .pie-chart-container {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto 16px;
    }

    .pie-chart {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .chart-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      display: flex;
      flex-direction: column;
    }

    .total-count {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .total-label {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    // Legend
    .legend {
      display: flex;
      flex-direction: column;
      gap: 8px;

      &.horizontal {
        flex-direction: row;
        justify-content: center;
        gap: 20px;
      }
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;

      &.online {
        background: var(--info);
      }

      &.offline {
        background: var(--success);
      }
    }

    .legend-label {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .legend-value {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }

    // Line Chart
    .line-chart-container {
      width: 100%;
      height: 160px;
    }

    .line-chart {
      width: 100%;
      height: 100%;
    }

    // Bar Chart
    .bar-chart-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bar-label {
      width: 60px;
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bar-wrapper {
      flex: 1;
      height: 16px;
      background: var(--glass-bg);
      border-radius: 4px;
      display: flex;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      transition: width 0.3s ease;

      &.online {
        background: var(--info);
      }

      &.offline {
        background: var(--success);
      }
    }

    .bar-total {
      width: 24px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
    }

    // Map Container
    .map-container {
      flex: 1;
      min-height: 300px;
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

      mat-divider {
        margin: 4px 0;
        border-color: var(--glass-border);
      }
    }

    .map-tool-btn {
      width: 32px;
      height: 32px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--accent-primary);
        background: var(--glass-bg-hover);
      }
    }

    .auto-label {
      font-size: 9px;
      color: var(--text-tertiary);
      text-align: center;
      padding: 4px;
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

    .compass {
      position: absolute;
      right: 12px;
      bottom: 60px;
      width: 40px;
      height: 40px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-primary);
      }
    }

    app-leaflet-map {
      position: absolute;
      inset: 0;
      z-index: 1;
    }

    // Video Panel
    .video-panel {
      height: 220px;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .video-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--glass-border);

      .video-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--accent-primary);
        }
      }

      .video-panel-count {
        font-size: 11px;
        color: var(--text-tertiary);
        padding: 2px 8px;
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border-radius: 10px;
      }
    }

    .video-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 8px;
      min-height: 0;
    }

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      position: relative;
      overflow: hidden;
      min-height: 100px;

      &.has-video {
        background: #000;
      }

      app-ws-video-player {
        position: absolute;
        inset: 0;
      }
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        opacity: 0.5;
      }

      span {
        font-size: 10px;
      }
    }

    .video-info-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));

      .video-status {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #6b7280; /* Gray - offline */

        &.online {
          background: #22c55e; /* Green - streaming */
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        &.connecting {
          background: #3b82f6; /* Blue - connecting */
          box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
          animation: pulse-status 1.5s infinite;
        }

        &.error {
          background: #f59e0b; /* Orange - error */
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
        }
      }

      @keyframes pulse-status {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .video-name {
        flex: 1;
        font-size: 10px;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .recording-indicator {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: rgba(239, 68, 68, 0.9);
        border-radius: 4px;
        font-size: 9px;
        font-weight: 600;
        color: #fff;
        animation: pulse-rec 1s infinite;

        .rec-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
        }
      }

      @keyframes pulse-rec {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    }

    .video-cell.recording {
      border: 2px solid #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
    }

    .video-record-controls {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;

      button {
        width: 28px;
        height: 28px;
        padding: 0;
        backdrop-filter: blur(4px);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .record-btn {
        background: rgba(239, 68, 68, 0.8);
        color: #fff;

        &:hover {
          background: rgba(239, 68, 68, 1);
        }
      }

      .stop-btn {
        background: rgba(239, 68, 68, 0.9);
        color: #fff;
        animation: pulse-rec 1s infinite;

        &:hover {
          background: rgba(239, 68, 68, 1);
        }
      }
    }

    .video-cell:hover .video-record-controls {
      opacity: 1;
    }

    .video-cell.recording .video-record-controls {
      opacity: 1;
    }

    .video-loading {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-tertiary);
      font-size: 12px;
    }

    .video-empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        opacity: 0.5;
      }

      span {
        font-size: 12px;
      }

      .video-hint {
        font-size: 11px;
        opacity: 0.7;
      }
    }

    // Notify Widget
    .notify-widget {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .notify-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notify-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      border-left: 3px solid;
      cursor: pointer;
      transition: transform 0.15s, background 0.15s;

      &:hover {
        background: var(--glass-bg-hover);
        transform: translateX(4px);
      }

      &.warning {
        border-color: var(--warning);
        .notify-icon { color: var(--warning); }
      }

      &.error {
        border-color: var(--error);
        .notify-icon { color: var(--error); }
      }

      &.info {
        border-color: var(--info);
        .notify-icon { color: var(--info); }
      }
    }

    .notify-icon {
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .notify-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notify-message {
      font-size: 12px;
      color: var(--text-primary);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notify-location {
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notify-time {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    .notify-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 40px 20px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        opacity: 0.5;
      }

      span {
        font-size: 13px;
      }

      .notify-hint {
        font-size: 11px;
        opacity: 0.7;
      }
    }

    // Alarm Popup
    .popup-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .alarm-popup {
      width: 100%;
      max-width: 480px;
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .popup-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      color: #fff;

      &.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
      &.warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
      &.info { background: linear-gradient(135deg, #3b82f6, #2563eb); }

      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      span { flex: 1; font-size: 14px; font-weight: 600; }
      button { color: rgba(255,255,255,0.8); &:hover { color: #fff; } }
    }

    .popup-content {
      padding: 20px;
    }

    .popup-image {
      margin-bottom: 16px;
      border-radius: var(--radius-sm);
      overflow: hidden;

      img {
        width: 100%;
        display: block;
      }
    }

    .popup-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .popup-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .popup-label {
      width: 80px;
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .popup-value {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      text-transform: capitalize;

      &.new { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.acknowledged { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .popup-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--glass-border);
    }

    // Responsive
    @media (max-width: 1200px) {
      .home-container {
        grid-template-columns: 1fr;
        height: auto;
      }

      .left-column, .right-column {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .widget {
        flex: 1;
        min-width: 250px;
      }

      .notify-widget {
        width: 100%;
        max-height: 300px;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: LeafletMapComponent;

  alarmService = inject(AlarmService);
  locationsService = inject(LocationsService);
  authService = inject(AuthService);
  videoSourceService = inject(VideoSourceService);
  aiTaskService = inject(AITaskService);
  recordingService = inject(RecordingControlService);

  // BM-APP tasks for video panel
  bmappTasks = signal<BmappTask[]>([]);
  loadingCameras = signal(true);

  // Computed: Get only "Healthy" tasks (AlgTaskStatus.type === 4)
  onlineTasks = computed(() => {
    return this.bmappTasks().filter(task => {
      const statusType = task.AlgTaskStatus?.type;
      return statusType === 4; // 4 = Healthy
    });
  });

  // Computed: Get 4 slots - online tasks first, rest empty
  cameraSlots = computed(() => {
    const online = this.onlineTasks();
    const slots: (BmappTask | null)[] = [];
    for (let i = 0; i < 4; i++) {
      slots.push(online[i] || null);
    }
    return slots;
  });

  // Get stream ID for BM-APP WebSocket
  getStreamId(task: BmappTask): string {
    const session = task.AlgTaskSession?.trim() || '';
    return `task/${session}`;
  }

  // Computed device status from real camera data
  deviceStatus = computed<DeviceStatus>(() => {
    const tasks = this.bmappTasks();
    return {
      online: tasks.filter(t => t.AlgTaskStatus?.type === 4).length,  // Healthy
      offline: tasks.filter(t => t.AlgTaskStatus?.type !== 4).length  // Others
    };
  });

  // Computed alarm data from real stats (last 6 entries)
  alarmData = computed<AlarmData[]>(() => {
    const stats = this.alarmService.stats();
    if (stats?.daily_counts && stats.daily_counts.length > 0) {
      return stats.daily_counts.slice(-6).map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        count: d.count
      }));
    }
    // Fallback to recent alarms grouped by date
    const alarms = this.alarmService.alarms();
    const countsByDate = new Map<string, number>();
    alarms.forEach(alarm => {
      const date = new Date(alarm.alarm_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      countsByDate.set(date, (countsByDate.get(date) || 0) + 1);
    });
    return Array.from(countsByDate.entries())
      .slice(0, 6)
      .map(([date, count]) => ({ date, count }));
  });

  // Computed device classes from real camera groups
  deviceClasses = computed<DeviceClass[]>(() => {
    const tasks = this.bmappTasks();

    // Group tasks by first word of MediaName (e.g., "BWC", "H8C")
    const groups = new Map<string, { online: number; offline: number }>();

    tasks.forEach(task => {
      const mediaName = task.MediaName || 'Other';
      const firstWord = mediaName.split(/[\s-]/)[0] || 'Other';
      const groupName = firstWord.toUpperCase();

      if (!groups.has(groupName)) {
        groups.set(groupName, { online: 0, offline: 0 });
      }

      const group = groups.get(groupName)!;
      if (task.AlgTaskStatus?.type === 4) {  // Healthy
        group.online++;
      } else {
        group.offline++;
      }
    });

    return Array.from(groups.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => (b.online + b.offline) - (a.online + a.offline));
  });

  selectedNotification = signal<AlarmNotification | null>(null);

  // Map related
  mapMarkers = signal<MapMarker[]>([]);
  mapTileLayer = signal<'dark' | 'standard' | 'satellite'>('dark');
  mapCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta default

  ngOnInit(): void {
    // Load initial alarms and stats
    this.alarmService.loadAlarms({ limit: 20 });
    this.alarmService.loadStats();

    // Load video sources for device status
    this.videoSourceService.loadVideoSources();

    // Load camera locations
    this.loadLocations();

    // Load BM-APP tasks for video panel
    this.loadBmappTasks();

    // Load active recordings (for recording indicator)
    this.recordingService.loadActiveRecordings();
  }

  loadBmappTasks(): void {
    this.loadingCameras.set(true);
    this.aiTaskService.getBmappTasks().subscribe({
      next: (tasks) => {
        console.log('[Home] Loaded BM-APP tasks:', tasks.map(t => ({
          MediaName: t.MediaName,
          AlgTaskSession: t.AlgTaskSession,
          status: t.AlgTaskStatus?.type
        })));
        this.bmappTasks.set(tasks);
        this.loadingCameras.set(false);
      },
      error: (err) => {
        console.error('Failed to load BM-APP tasks:', err);
        this.bmappTasks.set([]);
        this.loadingCameras.set(false);
      }
    });
  }

  async loadLocations(): Promise<void> {
    const locations = await this.locationsService.loadLocations({ limit: 500 });
    this.updateMapMarkers(locations);
  }

  private updateMapMarkers(locations: CameraLocation[]): void {
    const markers: MapMarker[] = locations
      .filter(loc => loc.latitude && loc.longitude)
      .map(loc => ({
        id: loc.id,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: loc.location_type || loc.source,
        isOnline: loc.is_active,
        data: loc
      }));
    this.mapMarkers.set(markers);
  }

  mapZoomIn(): void {
    this.mapComponent?.zoomIn();
  }

  mapZoomOut(): void {
    this.mapComponent?.zoomOut();
  }

  fitAllMarkers(): void {
    const markers = this.mapMarkers();
    if (markers.length > 0 && this.mapComponent) {
      const map = this.mapComponent.getMap();
      if (map) {
        const bounds = markers.map(m => [m.latitude, m.longitude] as [number, number]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  setMapType(type: 'dark' | 'standard' | 'satellite'): void {
    this.mapTileLayer.set(type);
  }

  async syncLocations(): Promise<void> {
    await this.locationsService.syncLocations('gps_tim_har');
    await this.loadLocations();
  }

  onMarkerClick(marker: MapMarker): void {
    console.log('Marker clicked:', marker);
  }

  ngOnDestroy(): void {
    // AlarmService is singleton, no cleanup needed
  }

  getOnlineArc(): number {
    const status = this.deviceStatus();
    const total = status.online + status.offline;
    return (status.online / total) * 251.2; // 2 * PI * 40
  }

  getOfflineArc(): number {
    const status = this.deviceStatus();
    const total = status.online + status.offline;
    return (status.offline / total) * 251.2;
  }

  alarmDataPoints(): { x: number; y: number }[] {
    const data = this.alarmData();
    const maxCount = Math.max(...data.map(d => d.count));
    return data.map((d, i) => ({
      x: 55 + i * 40,
      y: 120 - (d.count / maxCount) * 100
    }));
  }

  getAlarmLinePath(): string {
    const points = this.alarmDataPoints();
    if (points.length === 0) return '';
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }

  getAlarmAreaPath(): string {
    const points = this.alarmDataPoints();
    if (points.length === 0) return '';
    const linePath = this.getAlarmLinePath();
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${linePath} L ${lastX} 120 L ${firstX} 120 Z`;
  }

  getBarWidth(value: number): number {
    const maxTotal = Math.max(...this.deviceClasses().map(d => d.online + d.offline));
    return (value / maxTotal) * 100;
  }

  getNotifyIcon(type: string): string {
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  getImageUrl(imageUrl: string | undefined | null): string | null {
    return getAlarmImageUrl(imageUrl);
  }

  viewAlarmDetail(notification: AlarmNotification): void {
    this.selectedNotification.set(notification);
  }

  closePopup(): void {
    this.selectedNotification.set(null);
  }

  async acknowledgeAlarm(): Promise<void> {
    const notification = this.selectedNotification();
    if (notification?.alarm?.id) {
      try {
        await this.alarmService.acknowledgeAlarm(notification.alarm.id);
        this.closePopup();
      } catch (err) {
        console.error('Failed to acknowledge alarm:', err);
      }
    }
  }

  // Recording controls
  canRecord(): boolean {
    // Only Operator and above can record (P3 cannot)
    const user = this.authService.currentUser();
    if (!user) return false;
    const roleNames = user.roles?.map(r => r.name.toLowerCase()) || [];
    return roleNames.some(r => r === 'operator' || r === 'manager' || r === 'superadmin');
  }

  async startRecording(task: BmappTask): Promise<void> {
    const streamId = this.getStreamId(task);
    try {
      await this.recordingService.startRecording(streamId, task.MediaName);
      console.log('[Home] Recording started for:', task.MediaName);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      alert(err?.error?.detail || 'Failed to start recording');
    }
  }

  async stopRecording(task: BmappTask): Promise<void> {
    const streamId = this.getStreamId(task);
    try {
      await this.recordingService.stopRecording(streamId);
      console.log('[Home] Recording stopped for:', task.MediaName);
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      alert(err?.error?.detail || 'Failed to stop recording');
    }
  }
}
