import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

declare const ZLMRTCClient: any;

@Component({
  selector: 'app-bmapp-video-player',
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
      } @else if (status() === 'server_down') {
        <div class="status-overlay warning">
          <mat-icon>cloud_off</mat-icon>
          <span>Server tidak tersedia</span>
          <span class="sub-message">Menunggu server ready...</span>
          <button class="retry-btn" (click)="manualRetry()">
            <mat-icon>refresh</mat-icon>
            Coba Lagi
          </button>
        </div>
      }
      <video
        #videoElement
        [muted]="muted"
        autoplay
        playsinline
        (playing)="onPlaying()"
        (error)="onError($event)"
      ></video>

      @if (status() === 'playing' && showControls) {
        <div class="video-controls">
          <button class="control-btn" (click)="toggleMute()">
            <mat-icon>{{ muted ? 'volume_off' : 'volume_up' }}</mat-icon>
          </button>
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

    video {
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

      &.warning mat-icon {
        color: #f59e0b;
      }

      &.reconnecting mat-icon {
        color: #3b82f6;
      }

      .sub-message {
        font-size: 11px;
        color: var(--text-muted, #666);
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

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class BmappVideoPlayerComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;

  @Input() app = 'live';
  @Input() stream = '';
  @Input() muted = true;
  @Input() showControls = true;
  @Input() autoConnect = true;

  status = signal<'idle' | 'connecting' | 'reconnecting' | 'playing' | 'error' | 'server_down'>('idle');
  statusMessage = signal('Connecting to AI Stream...');
  errorMessage = signal('');
  retryCount = signal(0);

  readonly maxRetries = 10;
  readonly baseDelay = 2000; // 2 seconds
  readonly maxDelay = 30000; // 30 seconds

  private player: any = null;
  private reconnectTimer: any = null;
  private healthCheckTimer: any = null;
  private isDestroyed = false;

  private getBmappUrl(): string {
    // Use proxy in development to bypass CORS for WebRTC signaling
    // In production, configure nginx to proxy /bmapp-api/ to BM-APP
    return '/bmapp-api';
  }

  ngOnInit() {
    if (this.autoConnect && this.stream) {
      this.connectWithHealthCheck();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stream'] && !changes['stream'].firstChange) {
      this.resetRetry();
      this.streamFormats = []; // Reset stream formats to try new stream
      this.currentFormatIndex = 0;
      this.disconnect();
      if (this.stream) {
        this.connectWithHealthCheck();
      }
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.clearTimers();
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private resetRetry() {
    this.retryCount.set(0);
    this.clearTimers();
  }

  manualRetry() {
    this.resetRetry();
    this.connectWithHealthCheck();
  }

  async connectWithHealthCheck() {
    if (this.isDestroyed) return;

    this.status.set('connecting');
    this.statusMessage.set('Connecting to AI Stream...');

    // Skip health check - directly try to connect
    // Health check has CORS issues and unreliable endpoint
    this.connect();
  }

  private async checkServerHealth(): Promise<boolean> {
    // Simplified health check - just return true and let WebRTC handle connection
    // The actual connection will fail/retry if server is down
    return true;
  }

  // Stream name formats to try
  private streamFormats: string[] = [];
  private currentFormatIndex = 0;

  private generateStreamFormats(): string[] {
    const formats: string[] = [];
    const stream = this.stream;
    const apps = ['live', 'rtp', 'proxy'];

    // Original format
    formats.push(`${this.app}|${stream}`);

    // Try different app names with original stream
    for (const app of apps) {
      formats.push(`${app}|${stream}`);
    }

    // Try with underscores instead of spaces
    const underscoreStream = stream.replace(/ /g, '_');
    for (const app of apps) {
      formats.push(`${app}|${underscoreStream}`);
    }

    // Try lowercase
    const lowerStream = stream.toLowerCase().replace(/ /g, '_');
    for (const app of apps) {
      formats.push(`${app}|${lowerStream}`);
    }

    // Try without spaces
    const noSpaceStream = stream.replace(/ /g, '');
    formats.push(`live|${noSpaceStream}`);

    return [...new Set(formats)]; // Remove duplicates
  }

  connect() {
    if (this.isDestroyed) return;

    if (!this.stream) {
      this.status.set('error');
      this.errorMessage.set('No stream specified');
      return;
    }

    if (typeof ZLMRTCClient === 'undefined') {
      this.status.set('error');
      this.errorMessage.set('ZLMRTCClient not loaded');
      return;
    }

    // Generate stream formats on first connect
    if (this.streamFormats.length === 0) {
      this.streamFormats = this.generateStreamFormats();
      this.currentFormatIndex = 0;
    }

    if (this.status() !== 'reconnecting') {
      this.status.set('connecting');
    }
    this.statusMessage.set('Establishing WebRTC connection...');
    this.disconnect();

    // Get current format to try
    const currentFormat = this.streamFormats[this.currentFormatIndex] || `${this.app}|${this.stream}`;
    const [appName, streamName] = currentFormat.split('|');

    try {
      const encodedStream = encodeURIComponent(streamName);
      const webrtcUrl = `${this.getBmappUrl()}/webrtc?app=${encodeURIComponent(appName)}&stream=${encodedStream}&type=play`;
      console.log(`Connecting to BM-APP WebRTC (format ${this.currentFormatIndex + 1}/${this.streamFormats.length}):`, webrtcUrl);

      this.player = new ZLMRTCClient.Endpoint({
        element: this.videoElement.nativeElement,
        debug: false,
        zlmsdpUrl: webrtcUrl,
        videoEnable: true,
        audioEnable: true,
        recvOnly: true,
        resolution: { w: 1280, h: 720 }
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ON_REMOTE_STREAMS, (stream: MediaStream) => {
        console.log('BM-APP stream received');
        this.resetRetry();
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, (state: string) => {
        console.log('WebRTC state:', state);
        if (state === 'connected') {
          this.status.set('playing');
          this.resetRetry();
        } else if (state === 'failed' || state === 'disconnected') {
          this.handleConnectionError('Connection lost');
        }
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ICE_CANDIDATE_ERROR, () => {
        console.error('ICE candidate error');
        this.handleConnectionError('ICE negotiation failed');
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, (e: any) => {
        console.error('Offer/Answer exchange failed:', e);

        // Check if stream not found - try next format
        if (e && (e.code === -1 || e.msg === 'stream not found')) {
          console.log('Stream not found, trying next format...');
          this.tryNextStreamFormat();
          return;
        }

        // Check for HTTP 400 error (server restart scenario)
        if (e && (e.status === 400 || e.message?.includes('400'))) {
          this.handleServerError('Server restarting, please wait...');
        } else {
          this.handleConnectionError('Connection failed');
        }
      });

    } catch (error: any) {
      console.error('BM-APP WebRTC error:', error);
      this.handleConnectionError(error.message || 'Connection failed');
    }
  }

  private tryNextStreamFormat() {
    if (this.isDestroyed) return;

    this.currentFormatIndex++;

    if (this.currentFormatIndex < this.streamFormats.length) {
      const nextFormat = this.streamFormats[this.currentFormatIndex];
      console.log(`Trying format ${this.currentFormatIndex + 1}/${this.streamFormats.length}: ${nextFormat}`);
      this.statusMessage.set(`Trying format ${this.currentFormatIndex + 1}/${this.streamFormats.length}...`);

      // Small delay before trying next format
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.connect();
        }
      }, 500);
    } else {
      // All formats tried, show error
      console.error('All stream formats tried, none worked');
      this.status.set('error');
      this.errorMessage.set('Stream not found (tried all formats)');
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

  private handleServerError(message: string) {
    if (this.isDestroyed) return;

    this.status.set('server_down');
    this.errorMessage.set(message);
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isDestroyed) return;

    const currentRetry = this.retryCount();
    if (currentRetry >= this.maxRetries) {
      this.status.set('error');
      this.errorMessage.set('Max retries reached. Click to retry.');
      return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s... max 30s
    const delay = Math.min(this.baseDelay * Math.pow(2, currentRetry), this.maxDelay);
    this.retryCount.set(currentRetry + 1);

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.retryCount()}/${this.maxRetries})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && this.status() !== 'playing') {
        this.connectWithHealthCheck();
      }
    }, delay);
  }

  disconnect() {
    if (this.player) {
      try {
        this.player.close();
      } catch (e) {
        // Ignore
      }
      this.player = null;
    }

    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  onPlaying() {
    this.status.set('playing');
    this.resetRetry();
  }

  onError(event: Event) {
    console.error('Video error:', event);
    if (this.status() === 'connecting' || this.status() === 'reconnecting') {
      this.handleConnectionError('Video playback error');
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = this.muted;
    }
  }

  toggleFullscreen() {
    const container = this.videoElement?.nativeElement?.parentElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  }
}
