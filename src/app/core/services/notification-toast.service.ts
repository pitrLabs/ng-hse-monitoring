import { Injectable, signal, computed } from '@angular/core';
import { Alarm, getAlarmSeverity, AlarmSeverity } from '../models/alarm.model';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  severity: AlarmSeverity;
  imageUrl?: string | null;
  alarm?: Alarm;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationToastService {
  private _toasts = signal<ToastNotification[]>([]);
  private _maxToasts = 5;
  private _autoHideDelay = 8000; // 8 seconds

  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  /**
   * Show a toast notification for an alarm
   */
  showAlarmToast(alarm: Alarm): void {
    const toast: ToastNotification = {
      id: alarm.id || `toast_${Date.now()}`,
      title: alarm.alarm_type || 'Alert',
      message: `${alarm.camera_name || 'Unknown'} - ${alarm.alarm_name || alarm.alarm_type}`,
      severity: getAlarmSeverity(alarm.alarm_type),
      imageUrl: alarm.image_url,
      alarm,
      timestamp: new Date()
    };

    this._toasts.update(toasts => {
      // Add new toast at the beginning
      const updated = [toast, ...toasts];
      // Keep only max toasts
      return updated.slice(0, this._maxToasts);
    });

    // Auto-hide after delay
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, this._autoHideDelay);
  }

  /**
   * Dismiss a specific toast
   */
  dismissToast(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this._toasts.set([]);
  }
}
