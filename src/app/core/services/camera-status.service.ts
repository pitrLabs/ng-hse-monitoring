import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type CameraStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface CameraStatusEntry {
  status: CameraStatus;
  source: string; // 'mediamtx' | 'bmapp' | 'removed'
  ready?: boolean;
  bytesReceived?: number;
  taskSession?: string;
  mediaName?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

@Injectable({
  providedIn: 'root'
})
export class CameraStatusService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // WebSocket
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private logoutSubscription?: Subscription;

  // Signals
  private _connectionStatus = signal<ConnectionStatus>('disconnected');
  private _statuses = signal<Record<string, CameraStatusEntry>>({});

  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly statuses = this._statuses.asReadonly();

  constructor() {
    this.connect();

    this.logoutSubscription = this.authService.onLogout$.subscribe(() => {
      this.disconnect();
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.logoutSubscription?.unsubscribe();
  }

  /**
   * Get status for a local MediaMTX stream by stream_name
   */
  getStatus(streamName: string): CameraStatus {
    const entry = this._statuses()[streamName];
    return entry?.status as CameraStatus || 'offline';
  }

  /**
   * Get status for a BM-APP task by session name
   */
  getBmappStatus(taskSession: string): CameraStatus {
    const key = `bmapp:${taskSession}`;
    const entry = this._statuses()[key];
    return entry?.status as CameraStatus || 'offline';
  }

  // ============ WebSocket Methods ============

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this._connectionStatus.set('connecting');

    const wsProtocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = this.apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/camera-status/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[CameraStatusService] WebSocket connected');
        this._connectionStatus.set('connected');
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('[CameraStatusService] WebSocket disconnected');
        this._connectionStatus.set('disconnected');
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[CameraStatusService] WebSocket error:', error);
        this._connectionStatus.set('disconnected');
      };

    } catch (error) {
      console.error('[CameraStatusService] Failed to create WebSocket:', error);
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

      if (message.type === 'status_snapshot') {
        // Full snapshot — replace all statuses
        this._statuses.set(message.data || {});
      } else if (message.type === 'status_update') {
        // Partial update — merge changes
        this._statuses.update(current => ({
          ...current,
          ...message.data
        }));
      }
    } catch (error) {
      console.error('[CameraStatusService] Failed to parse message:', error);
    }
  }

  // ============ HTTP Fallback ============

  loadStatuses(): void {
    this.http.get<Record<string, CameraStatusEntry>>(
      `${this.apiUrl}/camera-status/`
    ).subscribe({
      next: (statuses) => this._statuses.set(statuses),
      error: (err) => console.error('[CameraStatusService] Failed to load statuses:', err)
    });
  }
}
