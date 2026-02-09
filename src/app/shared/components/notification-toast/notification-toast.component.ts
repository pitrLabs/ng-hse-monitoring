import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationToastService, ToastNotification } from '../../../core/services/notification-toast.service';
import { getBestAlarmImageUrl } from '../../../core/models/alarm.model';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [class]="'severity-' + toast.severity">
          <div class="toast-header">
            <mat-icon class="toast-icon">{{ getSeverityIcon(toast.severity) }}</mat-icon>
            <span class="toast-title">{{ toast.title }}</span>
            <button mat-icon-button class="toast-close" (click)="dismiss(toast.id)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="toast-body">
            @if (getImageUrl(toast)) {
              <img [src]="getImageUrl(toast)" alt="Alarm capture" class="toast-image" (error)="onImageError($event)" />
            } @else {
              <div class="toast-image-placeholder">
                <mat-icon>image_not_supported</mat-icon>
              </div>
            }
            <div class="toast-content">
              <!-- Alarm ID -->
              <div class="toast-row id-row">
                <span class="label">ID:</span>
                <span class="value" [matTooltip]="toast.alarm?.id || toast.id">{{ (toast.alarm?.id || toast.id).substring(0, 8) }}...</span>
              </div>

              <!-- Alarm Type -->
              <div class="toast-row type-row">
                <span class="label">Type:</span>
                <span class="value type-badge" [class]="'severity-' + toast.severity">{{ toast.alarm?.alarm_type || toast.title }}</span>
              </div>

              <!-- Video Source (Camera + RTSP) -->
              <div class="toast-row source-row">
                <span class="label">Source:</span>
                <div class="source-info">
                  <span class="camera-name">{{ toast.alarm?.camera_name || 'Unknown' }}</span>
                  @if (toast.alarm?.media_url) {
                    <span class="rtsp-link" [matTooltip]="toast.alarm.media_url">
                      <mat-icon>videocam</mat-icon>
                      RTSP
                    </span>
                  }
                </div>
              </div>

              <!-- Reporting Condition (Description) -->
              @if (toast.alarm?.description || toast.alarm?.alarm_name) {
                <div class="toast-row condition-row">
                  <span class="label">Condition:</span>
                  <span class="value">{{ toast.alarm?.description || toast.alarm?.alarm_name }}</span>
                </div>
              }

              <!-- Confidence -->
              @if (toast.alarm?.confidence) {
                <div class="toast-row confidence-row">
                  <span class="label">Confidence:</span>
                  <span class="value confidence-badge">{{ (toast.alarm.confidence * 100).toFixed(0) }}%</span>
                </div>
              }

              <!-- Time -->
              <div class="toast-row time-row">
                <mat-icon>schedule</mat-icon>
                <span class="toast-time">{{ formatTime(toast.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
      pointer-events: none;
    }

    .toast-item {
      background: var(--glass-bg, rgba(20, 20, 35, 0.95));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;

      &.severity-critical {
        border-left: 4px solid #ef4444;
        .toast-icon { color: #ef4444; }
        .type-badge.severity-critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      }

      &.severity-high {
        border-left: 4px solid #f97316;
        .toast-icon { color: #f97316; }
        .type-badge.severity-high { background: rgba(249, 115, 22, 0.2); color: #f97316; }
      }

      &.severity-medium {
        border-left: 4px solid #eab308;
        .toast-icon { color: #eab308; }
        .type-badge.severity-medium { background: rgba(234, 179, 8, 0.2); color: #eab308; }
      }

      &.severity-low {
        border-left: 4px solid #3b82f6;
        .toast-icon { color: #3b82f6; }
        .type-badge.severity-low { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.2);
    }

    .toast-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .toast-title {
      flex: 1;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #fff);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .toast-close {
      width: 28px;
      height: 28px;
      margin: -4px -4px 0 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--text-muted, #666);
      }

      &:hover mat-icon {
        color: var(--text-primary, #fff);
      }
    }

    .toast-body {
      display: flex;
      gap: 12px;
      padding: 12px;
    }

    .toast-image {
      width: 100px;
      height: 75px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .toast-image-placeholder {
      width: 100px;
      height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--text-muted, #666);
      }
    }

    .toast-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .toast-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;

      .label {
        color: var(--text-muted, #666);
        min-width: 60px;
        flex-shrink: 0;
      }

      .value {
        color: var(--text-secondary, #a0a0a0);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .type-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;

      .camera-name {
        color: var(--text-primary, #fff);
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rtsp-link {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 1px 4px;
        background: rgba(0, 212, 255, 0.15);
        border-radius: 3px;
        color: var(--accent-primary, #00d4ff);
        font-size: 9px;
        cursor: pointer;
        flex-shrink: 0;

        mat-icon {
          font-size: 10px;
          width: 10px;
          height: 10px;
        }
      }
    }

    .confidence-badge {
      display: inline-block;
      padding: 1px 6px;
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border-radius: 3px;
      font-weight: 600;
    }

    .time-row {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
        color: var(--text-muted, #666);
      }
    }

    .toast-time {
      font-size: 10px;
      color: var(--text-muted, #666);
    }
  `]
})
export class NotificationToastComponent {
  toastService = inject(NotificationToastService);

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'emergency';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'notifications';
    }
  }

  getImageUrl(toast: ToastNotification): string | null {
    // Use getBestAlarmImageUrl which prioritizes MinIO labeled image
    if (toast.alarm) {
      return getBestAlarmImageUrl(toast.alarm);
    }
    return toast.imageUrl || null;
  }

  onImageError(event: Event): void {
    // Hide image if it fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  dismiss(id: string): void {
    this.toastService.dismissToast(id);
  }
}
