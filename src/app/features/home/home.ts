import { Component, signal, OnInit, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AlarmService } from '../../core/services/alarm.service';
import { AlarmNotification, getAlarmImageUrl } from '../../core/models/alarm.model';
import { LocationsService, CameraLocation } from '../../core/services/locations.service';
import { LeafletMapComponent, MapMarker } from '../../shared/components/leaflet-map/leaflet-map';

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
    LeafletMapComponent
  ],
  template: `
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
          <div class="video-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="video-cell">
                <div class="video-placeholder">
                  <mat-icon>videocam</mat-icon>
                  <span>Camera {{ i }}</span>
                </div>
                <div class="video-controls">
                  <button mat-icon-button class="video-ctrl-btn" matTooltip="Close">
                    <mat-icon>close</mat-icon>
                  </button>
                  <span class="video-empty-label">Empty</span>
                </div>
              </div>
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
            <a routerLink="/admin/alarms" class="view-all-link">View All</a>
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
            <a mat-flat-button color="primary" routerLink="/admin/alarms" (click)="closePopup()">
              View All Alarms
            </a>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
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
      height: 200px;
      padding: 8px;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      height: 100%;
    }

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      position: relative;
      overflow: hidden;
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      span {
        font-size: 11px;
      }
    }

    .video-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    }

    .video-ctrl-btn {
      width: 24px;
      height: 24px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .video-empty-label {
      font-size: 10px;
      color: var(--text-tertiary);
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

  deviceStatus = signal<DeviceStatus>({ online: 45, offline: 12 });

  alarmData = signal<AlarmData[]>([
    { date: '01/15', count: 12 },
    { date: '01/16', count: 28 },
    { date: '01/17', count: 18 },
    { date: '01/18', count: 35 },
    { date: '01/19', count: 22 },
    { date: '01/20', count: 15 }
  ]);

  deviceClasses = signal<DeviceClass[]>([
    { name: 'Camera', online: 24, offline: 3 },
    { name: 'Sensor', online: 18, offline: 5 },
    { name: 'Gateway', online: 8, offline: 2 },
    { name: 'Radio', online: 12, offline: 1 }
  ]);

  selectedNotification = signal<AlarmNotification | null>(null);

  // Map related
  mapMarkers = signal<MapMarker[]>([]);
  mapTileLayer = signal<'dark' | 'standard' | 'satellite'>('dark');
  mapCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta default

  ngOnInit(): void {
    // Load initial alarms and stats
    this.alarmService.loadAlarms({ limit: 20 });
    this.alarmService.loadStats();

    // Load camera locations
    this.loadLocations();
  }

  async loadLocations(): Promise<void> {
    const locations = await this.locationsService.loadLocations({ limit: 500 });
    this.updateMapMarkers(locations);
  }

  // Allowed regions for home page map
  private allowedRegions = ['AMP01', 'AMP02', 'AMP03', 'AMP04'];

  private updateMapMarkers(locations: CameraLocation[]): void {
    const markers: MapMarker[] = locations
      .filter(loc => loc.latitude && loc.longitude)
      .filter(loc => this.isInAllowedRegion(loc))
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

  private isInAllowedRegion(loc: CameraLocation): boolean {
    const extraData = loc.extra_data as Record<string, unknown> | null;

    // Check FEEDER_01 field
    if (extraData?.['FEEDER_01']) {
      const feeder = String(extraData['FEEDER_01']).trim().toUpperCase();
      return this.allowedRegions.some(r => feeder.includes(r));
    }

    // Check location name for region pattern
    if (loc.name) {
      const nameUpper = loc.name.toUpperCase();
      return this.allowedRegions.some(r => nameUpper.includes(r));
    }

    return false;
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
    await this.locationsService.syncLocations('all');
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
}
