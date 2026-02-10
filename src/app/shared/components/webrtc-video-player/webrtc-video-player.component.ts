import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

declare const ZLMRTCClient: any;

@Component({
  selector: 'app-webrtc-video-player',
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

      <video
        #videoElement
        [style.display]="status() === 'playing' ? 'block' : 'none'"
        autoplay
        playsinline
        muted
        class="stream-video">
      </video>

      @if (status() === 'playing' && showControls) {
        <div class="video-controls">
          <button class="control-btn" (click)="toggleMute()">
            <mat-icon>{{ isMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
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

    .stream-video {
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

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class WebrtcVideoPlayerComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() app = '';  // ZLMediaKit app name (e.g., "live")
  @Input() stream = '';  // Stream name (e.g., "camera1")
  @Input() webrtcUrl = '';  // Base WebRTC URL (e.g., "http://192.168.1.100:2323/webrtc")
  @Input() aiboxId = '';  // AI Box ID for using backend proxy (rewrites private IPs)
  @Input() useProxy = true;  // Use backend proxy for SDP rewriting (default: true)
  @Input() showControls = true;
  @Input() autoConnect = true;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  status = signal<'idle' | 'connecting' | 'reconnecting' | 'playing' | 'error'>('idle');
  statusMessage = signal('Connecting...');
  errorMessage = signal('');
  retryCount = signal(0);
  isMuted = signal(true);

  readonly maxRetries = 10;
  readonly baseDelay = 2000;
  readonly maxDelay = 30000;

  private player: any = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private zlmLoaded = false;
  private viewReady = false;  // Track if video element is available

  private readonly sessionId = `webrtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  ngOnInit() {
    this.loadZLMRTCClient();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.autoConnect && this.stream && this.zlmLoaded) {
      this.connect();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['stream'] || changes['app'] || changes['webrtcUrl'] || changes['aiboxId']) && !changes['stream']?.firstChange) {
      this.disconnect();
      this.resetRetry();
      if (this.stream && this.zlmLoaded) {
        setTimeout(() => this.connect(), 100);
      }
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.clearTimers();
  }

  private loadZLMRTCClient() {
    if (typeof ZLMRTCClient !== 'undefined') {
      this.zlmLoaded = true;
      // Don't connect here - wait for ngAfterViewInit when video element is ready
      return;
    }

    const script = document.createElement('script');
    script.src = '/assets/js/ZLMRTCClient.js';
    script.onload = () => {
      this.zlmLoaded = true;
      if (this.autoConnect && this.stream && this.viewReady) {
        this.connect();
      }
    };
    script.onerror = () => {
      this.status.set('error');
      this.errorMessage.set('Failed to load video player library');
    };
    document.head.appendChild(script);
  }

  connect() {
    if (this.isDestroyed || !this.zlmLoaded) return;

    if (!this.stream) {
      this.status.set('idle');
      return;
    }

    if (this.status() !== 'reconnecting') {
      this.status.set('connecting');
    }
    this.statusMessage.set('Connecting to stream...');
    this.disconnect();

    try {
      const videoEl = this.videoElement?.nativeElement;
      if (!videoEl) {
        setTimeout(() => this.connect(), 500);
        return;
      }

      // Build WebRTC URL
      const appName = this.app || 'live';
      const streamName = this.stream;
      let zlmUrl: string;

      if (this.useProxy && this.aiboxId) {
        // Use backend proxy for SDP rewriting (fixes private IP issue)
        zlmUrl = `${environment.apiUrl}/webrtc-proxy/${this.aiboxId}?app=${encodeURIComponent(appName)}&stream=${encodeURIComponent(streamName)}&type=play`;
      } else {
        // Direct connection to BM-APP
        let baseUrl = this.webrtcUrl;
        if (!baseUrl) {
          baseUrl = `${window.location.protocol}//${window.location.host}/bmapp-api/webrtc`;
        }
        zlmUrl = `${baseUrl}?app=${encodeURIComponent(appName)}&stream=${encodeURIComponent(streamName)}&type=play`;
      }

      console.log(`[${this.sessionId}] Connecting to: ${streamName}`);

      console.log(`[${this.sessionId}] ZLM URL: ${zlmUrl}`);

      this.player = new ZLMRTCClient.Endpoint({
        element: videoEl,
        debug: true,  // Enable debug to see ICE/SDP details
        zlmsdpUrl: zlmUrl,
        videoEnable: true,
        audioEnable: true,
        recvOnly: true,
        resolution: { w: 1280, h: 720 }
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ON_REMOTE_STREAMS, (e: any) => {
        console.log(`[${this.sessionId}] Stream received:`, e);

        // Check video element
        const video = this.videoElement?.nativeElement;
        if (video) {
          console.log(`[${this.sessionId}] Video state:`, {
            srcObject: video.srcObject ? 'SET' : 'NULL',
            readyState: video.readyState,
            paused: video.paused
          });

          // Force play if paused
          if (video.paused) {
            video.play().catch((err: any) => console.error(`[${this.sessionId}] Play error:`, err));
          }
        }

        this.status.set('playing');
        this.resetRetry();
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ICE_CANDIDATE_ERROR, (e: any) => {
        console.log(`[${this.sessionId}] ICE error:`, e);
        this.handleConnectionError('ICE negotiation failed');
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, (e: any) => {
        console.log(`[${this.sessionId}] SDP exchange failed:`, e);
        this.handleConnectionError('Connection negotiation failed');
      });

      this.player.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, (state: string) => {
        console.log(`[${this.sessionId}] Connection state: ${state}`);
        if (state === 'failed' || state === 'disconnected') {
          this.handleConnectionError('Connection lost');
        } else if (state === 'connected') {
          this.status.set('playing');
          this.resetRetry();
        }
      });

    } catch (error: any) {
      this.handleConnectionError(error.message || 'Failed to connect');
    }
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
      const video = this.videoElement.nativeElement;
      video.srcObject = null;
      video.load();
    }
  }

  private handleConnectionError(message: string) {
    if (this.isDestroyed) return;

    // Don't reconnect if already playing - stream is working
    if (this.status() === 'playing') {
      console.log(`[${this.sessionId}] Ignoring error while playing: ${message}`);
      return;
    }

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

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && this.status() !== 'playing') {
        this.connect();
      }
    }, delay);
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
    this.connect();
  }

  toggleMute() {
    if (this.videoElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.muted = !video.muted;
      this.isMuted.set(video.muted);
    }
  }

  toggleFullscreen() {
    const container = this.videoElement?.nativeElement?.closest('.video-player-container') as HTMLElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  }
}
