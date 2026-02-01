import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationToastService, ToastNotification } from '../../../core/services/notification-toast.service';
import { getAlarmImageUrl } from '../../../core/models/alarm.model';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [class]="'severity-' + toast.severity" [@slideIn]>
          <div class="toast-header">
            <mat-icon class="toast-icon">{{ getSeverityIcon(toast.severity) }}</mat-icon>
            <span class="toast-title">{{ toast.title }}</span>
            <button mat-icon-button class="toast-close" (click)="dismiss(toast.id)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="toast-body">
            @if (getImageUrl(toast.imageUrl)) {
              <img [src]="getImageUrl(toast.imageUrl)" alt="Alarm capture" class="toast-image" />
            }
            <div class="toast-content">
              <p class="toast-message">{{ toast.message }}</p>
              <span class="toast-time">{{ formatTime(toast.timestamp) }}</span>
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
      max-width: 380px;
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
      }

      &.severity-high {
        border-left: 4px solid #f97316;
        .toast-icon { color: #f97316; }
      }

      &.severity-medium {
        border-left: 4px solid #eab308;
        .toast-icon { color: #eab308; }
      }

      &.severity-low {
        border-left: 4px solid #3b82f6;
        .toast-icon { color: #3b82f6; }
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
      padding: 12px 12px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
      width: 80px;
      height: 60px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-message {
      margin: 0 0 4px;
      font-size: 13px;
      color: var(--text-secondary, #a0a0a0);
      line-height: 1.4;
    }

    .toast-time {
      font-size: 11px;
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

  getImageUrl(url: string | null | undefined): string | null {
    return getAlarmImageUrl(url);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  dismiss(id: string): void {
    this.toastService.dismissToast(id);
  }
}
