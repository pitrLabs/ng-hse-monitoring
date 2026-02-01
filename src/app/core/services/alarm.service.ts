import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Alarm,
  AlarmStats,
  AlarmNotification,
  getAlarmNotificationType
} from '../models/alarm.model';
import { NotificationToastService } from './notification-toast.service';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root'
})
export class AlarmService implements OnDestroy {
  private http = inject(HttpClient);
  private toastService = inject(NotificationToastService);
  private apiUrl = environment.apiUrl;

  // WebSocket
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;

  // Audio for notifications
  private audioContext: AudioContext | null = null;
  private _soundEnabled = signal<boolean>(true);
  readonly soundEnabled = this._soundEnabled.asReadonly();

  // Signals
  private _connectionStatus = signal<ConnectionStatus>('disconnected');
  private _alarms = signal<Alarm[]>([]);
  private _recentAlarms = signal<Alarm[]>([]);
  private _stats = signal<AlarmStats | null>(null);

  // Public computed signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly alarms = this._alarms.asReadonly();
  readonly recentAlarms = this._recentAlarms.asReadonly();
  readonly stats = this._stats.asReadonly();

  // Notifications for Home page (derived from recent alarms)
  readonly notifications = computed<AlarmNotification[]>(() => {
    return this._recentAlarms().slice(0, 10).map(alarm => this.alarmToNotification(alarm));
  });

  // Count of new alarms
  readonly newAlarmsCount = computed(() => {
    return this._alarms().filter(a => a.status === 'new').length;
  });

  constructor() {
    this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  // ============ WebSocket Methods ============

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this._connectionStatus.set('connecting');

    // Build WebSocket URL from API URL
    const wsProtocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = this.apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/alarms/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[AlarmService] WebSocket connected');
        this._connectionStatus.set('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('[AlarmService] WebSocket disconnected');
        this._connectionStatus.set('disconnected');
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[AlarmService] WebSocket error:', error);
        this._connectionStatus.set('disconnected');
      };

    } catch (error) {
      console.error('[AlarmService] Failed to create WebSocket:', error);
      this._connectionStatus.set('disconnected');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connectionStatus.set('disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(data: string): void {
    if (data === 'pong') return;

    try {
      const message = JSON.parse(data);

      // Handle new alarm from BM-APP
      if (message.type === 'alarm' && message.data) {
        const alarm = message.data as Alarm;
        this.addNewAlarm(alarm);
      }
      // Handle alarm list update
      else if (Array.isArray(message)) {
        this._alarms.set(message);
      }
    } catch (error) {
      console.error('[AlarmService] Failed to parse message:', error);
    }
  }

  private addNewAlarm(alarm: Alarm): void {
    // Play notification sound
    this.playNotificationSound();

    // Show toast notification popup
    this.toastService.showAlarmToast(alarm);

    // Add to alarms list
    this._alarms.update(alarms => [alarm, ...alarms]);

    // Add to recent alarms (keep last 20)
    this._recentAlarms.update(alarms => {
      const updated = [alarm, ...alarms];
      return updated.slice(0, 20);
    });

    // Update stats
    this._stats.update(stats => {
      if (!stats) return stats;
      return {
        ...stats,
        total: stats.total + 1,
        new: stats.new + 1,
        by_type: {
          ...stats.by_type,
          [alarm.alarm_type]: (stats.by_type[alarm.alarm_type] || 0) + 1
        }
      };
    });
  }

  // ============ Sound Methods ============

  toggleSound(): void {
    this._soundEnabled.update(enabled => !enabled);
  }

  setSoundEnabled(enabled: boolean): void {
    this._soundEnabled.set(enabled);
  }

  private playNotificationSound(): void {
    if (!this._soundEnabled()) return;

    try {
      // Initialize AudioContext on first use (requires user interaction in some browsers)
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;

      // Create oscillator for alarm beep
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Alarm sound: two-tone beep (like emergency alert)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15); // E5
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5

      // Envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.45);

    } catch (error) {
      console.warn('[AlarmService] Could not play notification sound:', error);
    }
  }

  private alarmToNotification(alarm: Alarm): AlarmNotification {
    const alarmTime = new Date(alarm.alarm_time);
    const now = new Date();
    const diffMs = now.getTime() - alarmTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let timeStr: string;
    if (diffMins < 1) {
      timeStr = 'Just now';
    } else if (diffMins < 60) {
      timeStr = `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      timeStr = `${days} day${days > 1 ? 's' : ''} ago`;
    }

    return {
      id: alarm.id,
      message: alarm.alarm_name || alarm.alarm_type || 'Detection Alert',
      location: alarm.camera_name || alarm.location || 'Unknown Location',
      time: timeStr,
      type: getAlarmNotificationType(alarm.alarm_type),
      alarm
    };
  }

  // ============ HTTP Methods ============

  loadAlarms(params?: {
    skip?: number;
    limit?: number;
    alarm_type?: string;
    camera_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): void {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    this.http.get<Alarm[]>(`${this.apiUrl}/alarms`, { params: httpParams }).subscribe({
      next: (alarms) => {
        this._alarms.set(alarms);
        // Also update recent alarms on initial load
        if (!params?.skip) {
          this._recentAlarms.set(alarms.slice(0, 20));
        }
      },
      error: (err) => console.error('[AlarmService] Failed to load alarms:', err)
    });
  }

  loadStats(startDate?: string, endDate?: string): void {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    this.http.get<AlarmStats>(`${this.apiUrl}/alarms/stats`, { params }).subscribe({
      next: (stats) => this._stats.set(stats),
      error: (err) => console.error('[AlarmService] Failed to load stats:', err)
    });
  }

  acknowledgeAlarm(alarmId: string): Promise<Alarm> {
    return new Promise((resolve, reject) => {
      this.http.patch<Alarm>(`${this.apiUrl}/alarms/${alarmId}/acknowledge`, {}).subscribe({
        next: (alarm) => {
          this._alarms.update(alarms =>
            alarms.map(a => a.id === alarmId ? { ...a, status: 'acknowledged' as const } : a)
          );
          resolve(alarm);
        },
        error: reject
      });
    });
  }

  resolveAlarm(alarmId: string): Promise<Alarm> {
    return new Promise((resolve, reject) => {
      this.http.patch<Alarm>(`${this.apiUrl}/alarms/${alarmId}/resolve`, {}).subscribe({
        next: (alarm) => {
          this._alarms.update(alarms =>
            alarms.map(a => a.id === alarmId ? { ...a, status: 'resolved' as const } : a)
          );
          resolve(alarm);
        },
        error: reject
      });
    });
  }

  deleteAlarm(alarmId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/alarms/${alarmId}`).subscribe({
        next: () => {
          this._alarms.update(alarms => alarms.filter(a => a.id !== alarmId));
          this._recentAlarms.update(alarms => alarms.filter(a => a.id !== alarmId));
          resolve();
        },
        error: reject
      });
    });
  }

  bulkAcknowledge(alarmIds: string[]): Promise<{ acknowledged: number }> {
    return new Promise((resolve, reject) => {
      this.http.post<{ acknowledged: number }>(`${this.apiUrl}/alarms/bulk-acknowledge`, alarmIds).subscribe({
        next: (result) => {
          this._alarms.update(alarms =>
            alarms.map(a => alarmIds.includes(a.id) ? { ...a, status: 'acknowledged' as const } : a)
          );
          resolve(result);
        },
        error: reject
      });
    });
  }

  bulkResolve(alarmIds: string[]): Promise<{ resolved: number }> {
    return new Promise((resolve, reject) => {
      this.http.post<{ resolved: number }>(`${this.apiUrl}/alarms/bulk-resolve`, alarmIds).subscribe({
        next: (result) => {
          this._alarms.update(alarms =>
            alarms.map(a => alarmIds.includes(a.id) ? { ...a, status: 'resolved' as const } : a)
          );
          resolve(result);
        },
        error: reject
      });
    });
  }
}
