import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VideoStreamService } from '../../../core/services/video-stream.service';

@Component({
  selector: 'app-ws-video-player',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="video-player-container">
      @if (status() === 'connecting') {
        <div class="status-overlay">
          <mat-spinner diameter="32"></mat-spinner>
          <span>{{ statusMessage() }}</span>
        </div>
      } @else if (status() === 'reconnecting') {
        <div class="status-overlay reconnecting">
          <mat-spinner diameter="32"></mat-spinner>
          <span>{{ statusMessage() }}</span>
          <span class="retry-info">Attempt {{ retryCount() }}/{{ maxRetries }}</span>
        </div>
      } @else if (status() === 'error') {
        <div class="status-overlay error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMessage() }}</span>
          <button class="retry-btn" (click)="manualRetry()">
            <mat-icon>refresh</mat-icon>
            Retry Now
          </button>
        </div>
      } @else if (status() === 'idle') {
        <div class="status-overlay idle">
          <mat-icon>videocam_off</mat-icon>
          <span>No stream selected</span>
        </div>
      }

      <img
        [src]="frameUrl()"
        [style.display]="status() === 'playing' ? 'block' : 'none'"
        alt="Live Stream"
        class="stream-frame"
      />

      @if (status() === 'playing' && showControls) {
        <div class="video-controls">
          <button class="control-btn" (click)="toggleFullscreen()">
            <mat-icon>fullscreen</mat-icon>
          </button>
        </div>
      }

      @if (status() === 'playing') {
        <div class="live-indicator">
          <span class="live-dot"></span>
          AI LIVE
        </div>
      }

      @if (status() === 'playing' && showFps) {
        <div class="fps-indicator">
          {{ fps() }} FPS
        </div>
      }
    </div>
  `,
  styles: [`
    .video-player-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #0a0b0f;
      overflow: hidden;
      border-radius: 8px;
    }

    .stream-frame {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .status-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.85);
      color: var(--text-secondary, #a0a0a0);
      font-size: 13px;
      z-index: 10;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      &.error mat-icon {
        color: #ef4444;
      }

      &.idle mat-icon {
        color: #666;
      }

      &.reconnecting mat-icon {
        color: #3b82f6;
      }

      .retry-info {
        font-size: 11px;
        color: var(--text-muted, #666);
        margin-top: -8px;
      }
    }

    .retry-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--accent-primary, #00d4ff);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      margin-top: 8px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        opacity: 0.9;
      }
    }

    .video-controls {
      position: absolute;
      bottom: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .video-player-container:hover .video-controls {
      opacity: 1;
    }

    .control-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.9);
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .live-indicator {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.9);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    .fps-indicator {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      color: #00d4ff;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class WsVideoPlayerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() stream = ''; // BM-APP channel URL: "task/<AlgTaskSession>" for individual, "group/<n>" for mosaic
  @Input() mediaName = ''; // MediaName for matching with data.task from BM-APP response
  @Input() showControls = true;
  @Input() showFps = false;
  @Input() autoConnect = true;
  @Input() useSharedService = false; // Use shared VideoStreamService (for multiple streams)
  @Input() wsBaseUrl = ''; // Custom WebSocket base URL (e.g., "ws://192.168.1.100:2323")

  private videoStreamService = inject(VideoStreamService);

  status = signal<'idle' | 'connecting' | 'reconnecting' | 'playing' | 'error'>('idle');
  statusMessage = signal('Connecting...');
  errorMessage = signal('');
  retryCount = signal(0);
  frameUrl = signal('');
  fps = signal(0);

  readonly maxRetries = 10;
  readonly baseDelay = 2000;
  readonly maxDelay = 30000;

  private websocket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private frameCount = 0;
  private fpsTimer: any = null;
  private lastFrameTime = 0;
  private lastChannelResend = 0;
  private channelResendCooldown = 5000; // 5 seconds between resend attempts

  // Unique session ID for this component instance to differentiate WebSocket connections
  private readonly sessionId = this.generateSessionId();

  private generateSessionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getWsUrl(): string {
    // Build WebSocket URL with media parameter for independent stream selection
    // BM-APP format: ws://host/video/stream?media=<media_name>
    let baseUrl: string;

    if (this.wsBaseUrl) {
      // Use custom WebSocket URL from AI Box configuration
      baseUrl = this.wsBaseUrl;
      if (!baseUrl.endsWith('/')) baseUrl += '/';
    } else {
      // Fallback to proxy URL for development
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      baseUrl = `${protocol}//${window.location.host}/bmapp-api/`;
    }

    // Use /video/stream with media parameter for independent stream selection
    // This allows multiple concurrent WebSocket connections without interference
    const mediaName = this.mediaName || this.stream;
    if (mediaName) {
      return `${baseUrl}video/stream?media=${encodeURIComponent(mediaName)}`;
    }

    // Fallback to old video endpoint if no media name
    return `${baseUrl}video/`;
  }

  ngOnInit() {
    if (this.autoConnect && this.stream) {
      if (this.useSharedService) {
        // Use shared service mode - cycles through streams for multiple concurrent views
        this.subscribeToService();
      } else {
        // Use dedicated WebSocket mode
        this.connect();
      }
    }
    this.startFpsCounter();
  }

  ngOnChanges(changes: SimpleChanges) {
    // If WebSocket base URL changed, reconnect
    if (changes['wsBaseUrl'] && !changes['wsBaseUrl'].firstChange) {
      this.disconnect();
      this.resetRetry();
      if (this.stream && !this.useSharedService) {
        this.connect();
      }
    }

    if (changes['stream'] && !changes['stream'].firstChange) {
      this.resetRetry();

      if (this.useSharedService) {
        // Re-subscribe with new stream
        this.unsubscribeFromService();
        if (this.stream) {
          this.subscribeToService();
        }
      } else {
        // Stream changed - send new channel selection if connected
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.sendChannelSelection();
        } else if (this.stream) {
          this.connect();
        }
      }
    }

    if (changes['useSharedService'] && !changes['useSharedService'].firstChange) {
      // Mode changed - switch between dedicated WebSocket and shared service
      this.disconnect();
      this.unsubscribeFromService();
      this.resetRetry();

      if (this.stream) {
        if (this.useSharedService) {
          this.subscribeToService();
        } else {
          this.connect();
        }
      }
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.unsubscribeFromService();
    this.clearTimers();
    this.stopFpsCounter();
  }

  // Shared service mode - uses VideoStreamService for multiple concurrent streams
  private subscribeToService() {
    if (this.isDestroyed || !this.stream) return;

    this.status.set('connecting');
    this.statusMessage.set('Connecting via shared service...');

    // BM-APP expects the channel identifier in format "task/AlgTaskSession" or "group/X"
    const streamUrl = this.stream;
    console.log(`[${this.sessionId}] Subscribing to shared service for: ${streamUrl}, mediaName: ${this.mediaName}`);

    // Subscribe using stream URL and mediaName for matching with data.task from BM-APP
    this.videoStreamService.subscribe(this.sessionId, streamUrl, (frame: string) => {
      this.frameUrl.set(frame);
      this.frameCount++;
      this.lastFrameTime = Date.now();

      if (this.status() !== 'playing') {
        this.status.set('playing');
        this.resetRetry();
      }
    }, this.mediaName || undefined);
  }

  private unsubscribeFromService() {
    this.videoStreamService.unsubscribe(this.sessionId);
  }

  private startFpsCounter() {
    this.fpsTimer = setInterval(() => {
      this.fps.set(this.frameCount);
      this.frameCount = 0;
    }, 1000);
  }

  private stopFpsCounter() {
    if (this.fpsTimer) {
      clearInterval(this.fpsTimer);
      this.fpsTimer = null;
    }
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetRetry() {
    this.retryCount.set(0);
    this.clearTimers();
  }

  manualRetry() {
    this.resetRetry();
    if (this.useSharedService) {
      this.unsubscribeFromService();
      this.subscribeToService();
    } else {
      this.connect();
    }
  }

  connect() {
    if (this.isDestroyed) return;

    if (!this.stream) {
      this.status.set('idle');
      return;
    }

    if (this.status() !== 'reconnecting') {
      this.status.set('connecting');
    }
    this.statusMessage.set('Connecting to video stream...');
    this.disconnect();

    try {
      const wsUrl = this.getWsUrl();
      console.log(`[${this.sessionId}] Connecting to WebSocket for stream: ${this.stream}`);

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log(`[${this.sessionId}] WebSocket connected for stream: ${this.mediaName || this.stream}`);
        // When using media parameter in URL, stream selection happens automatically
        // Only send channel selection if using legacy /video/ endpoint without media param
        if (!this.mediaName && !wsUrl.includes('?media=')) {
          this.statusMessage.set('Selecting channel...');
          this.sendChannelSelection();
        } else {
          this.statusMessage.set('Waiting for stream...');
        }
      };

      this.websocket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.websocket.onclose = (event) => {
        console.log(`[${this.sessionId}] WebSocket closed:`, event.code, event.reason);
        if (!this.isDestroyed) {
          this.handleConnectionError('Connection closed');
        }
      };

      this.websocket.onerror = (error) => {
        console.error(`[${this.sessionId}] WebSocket error:`, error);
        this.handleConnectionError('Connection error');
      };

    } catch (error: any) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError(error.message || 'Failed to connect');
    }
  }

  private sendChannelSelection() {
    if (this.websocket?.readyState === WebSocket.OPEN && this.stream) {
      // BM-APP WebSocket expects: {"chn": "X"} where X is:
      // - TaskIdx number as string (e.g., "1", "7") for individual camera
      // - "group/X" for mosaic view
      const message = JSON.stringify({ chn: this.stream });
      console.log(`[WsVideoPlayer] Sending channel selection:`, {
        stream: this.stream,
        message: message
      });
      this.websocket.send(message);
    }
  }

  private handleMessage(event: MessageEvent) {
    // Handle binary data (Blob or ArrayBuffer)
    if (event.data instanceof Blob) {
      this.handleBinaryMessage(event.data);
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      this.handleBinaryMessage(blob);
      return;
    }

    // Handle text/JSON data
    try {
      const data = JSON.parse(event.data);

      if (data.image) {
        // Update frame
        this.frameUrl.set('data:image/jpeg;base64,' + data.image);
        this.frameCount++;
        this.lastFrameTime = Date.now();

        // First frame received - we're playing
        if (this.status() !== 'playing') {
          this.status.set('playing');
          this.resetRetry();
        }
      }

      if (data.task) {
        // Task identifier from server - verify it matches our requested stream
        // Note: BM-APP sends back task name, but we request by taskIdx number
        // This mismatch is expected, only resend if we're getting a completely different channel
        console.log(`[${this.sessionId}] Receiving stream: ${data.task} (requested: ${this.stream})`);
      }

      if (data.error) {
        console.error('Stream error:', data.error);
        this.handleConnectionError(data.error);
      }

    } catch (e) {
      // If JSON parse fails, the data might be raw binary sent as string
      // This happens when server sends binary data without proper framing
      // Just silently ignore these malformed messages
      if (event.data && typeof event.data === 'string' && event.data.length > 100) {
        // Likely a corrupted/partial message, skip logging to avoid console spam
        return;
      }
      console.warn('Failed to parse WebSocket message:', e);
    }
  }

  private handleBinaryMessage(blob: Blob) {
    // Convert Blob to data URL for image display
    const url = URL.createObjectURL(blob);
    this.frameUrl.set(url);
    this.frameCount++;
    this.lastFrameTime = Date.now();

    // First frame received - we're playing
    if (this.status() !== 'playing') {
      this.status.set('playing');
      this.resetRetry();
    }
  }

  private handleConnectionError(message: string) {
    if (this.isDestroyed) return;

    if (this.retryCount() < this.maxRetries) {
      this.status.set('reconnecting');
      this.statusMessage.set(message + ' - Reconnecting...');
      this.scheduleReconnect();
    } else {
      this.status.set('error');
      this.errorMessage.set(message + ' (Max retries reached)');
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;

    const currentRetry = this.retryCount();
    if (currentRetry >= this.maxRetries) {
      this.status.set('error');
      this.errorMessage.set('Max retries reached. Click to retry.');
      return;
    }

    const delay = Math.min(this.baseDelay * Math.pow(2, currentRetry), this.maxDelay);
    this.retryCount.set(currentRetry + 1);

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.retryCount()}/${this.maxRetries})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && this.status() !== 'playing') {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    if (this.websocket) {
      try {
        this.websocket.close();
      } catch (e) {
        // Ignore
      }
      this.websocket = null;
    }
  }

  toggleFullscreen() {
    const container = document.querySelector('.video-player-container') as HTMLElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  }
}
