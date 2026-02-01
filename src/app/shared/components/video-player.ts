import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

export type StreamingMode = 'bmapp' | 'mediamtx';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="video-player-container">
      @if (status() === 'connecting') {
        <div class="status-overlay">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Connecting...</span>
        </div>
      } @else if (status() === 'error') {
        <div class="status-overlay error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMessage() }}</span>
          <button class="retry-btn" (click)="connect()">
            <mat-icon>refresh</mat-icon>
            Retry
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
    </div>
  `,
  styles: [`
    .video-player-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #0a0b0f;
      overflow: hidden;
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
      background: rgba(0, 0, 0, 0.8);
      color: var(--text-secondary);
      font-size: 13px;
      z-index: 10;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      &.error {
        mat-icon {
          color: var(--error, #ef4444);
        }
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
  `]
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;

  @Input() streamName = '';
  @Input() muted = true;
  @Input() mode: StreamingMode = 'bmapp'; // Default to BM-APP WebRTC

  status = signal<'idle' | 'connecting' | 'playing' | 'error'>('idle');
  errorMessage = signal('');

  private peerConnection: RTCPeerConnection | null = null;

  private getBmAppWebRtcUrl(): string {
    return (window as any).__env?.BMAPP_WEBRTC_URL || environment.bmappWebrtcUrl || environment.bmappUrl + '/webrtc';
  }

  private getMediaServerUrl(): string {
    return (window as any).__env?.MEDIA_SERVER_URL || environment.mediaServerUrl;
  }

  ngOnInit() {
    if (this.streamName) {
      this.connect();
    }
  }

  ngOnDestroy() {
    this.disconnect();
  }

  async connect() {
    if (!this.streamName) {
      this.status.set('error');
      this.errorMessage.set('No stream name provided');
      return;
    }

    this.status.set('connecting');
    this.disconnect();

    try {
      if (this.mode === 'bmapp') {
        await this.connectBmApp();
      } else {
        await this.connectMediaMtx();
      }
    } catch (error: any) {
      console.error('WebRTC connection error:', error);
      this.status.set('error');
      this.errorMessage.set(error.message || 'Connection failed');
    }
  }

  /**
   * Connect via BM-APP's ZLMediaKit WebRTC
   * Format: POST to /webrtc?app=task&stream=<name>&type=play
   * Request: SDP offer as text/plain
   * Response: JSON { code: 0, sdp: "..." }
   */
  private async connectBmApp() {
    // ZLMediaKit uses null config (no STUN) for direct connection
    this.peerConnection = new RTCPeerConnection();

    this.peerConnection.ontrack = (event) => {
      console.log(`[BM-APP WebRTC] Track received:`, event.track.kind);
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = event.streams[0];
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[BM-APP WebRTC] Local ICE candidate:`, event.candidate.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`[BM-APP WebRTC] ICE connection state: ${this.peerConnection?.iceConnectionState}`);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[BM-APP WebRTC] Connection state: ${state}`);
      if (state === 'failed' || state === 'disconnected') {
        this.status.set('error');
        this.errorMessage.set('Connection lost');
      }
    };

    // Add transceivers for receive-only
    this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
    this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering
    await this.waitForIceGathering();

    // ZLMediaKit WebRTC endpoint format
    // BM-APP uses "task" as the app name for camera streams
    // URL encode stream name to handle spaces and special characters
    const encodedStreamName = encodeURIComponent(this.streamName);
    const webrtcUrl = `${this.getBmAppWebRtcUrl()}?app=task&stream=${encodedStreamName}&type=play`;
    console.log(`[BM-APP WebRTC] Connecting to: ${webrtcUrl}`);

    const response = await fetch(webrtcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: this.peerConnection.localDescription?.sdp
    });

    if (!response.ok) {
      throw new Error(`WebRTC request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(result.msg || `ZLMediaKit error: ${result.code}`);
    }

    // Log SDP answer to see ICE candidates from server
    console.log(`[BM-APP WebRTC] SDP Answer received, ICE candidates in SDP:`);
    const iceCandidates = result.sdp.match(/a=candidate:.*/g) || [];
    iceCandidates.forEach((c: string) => console.log(`  ${c}`));

    // Set remote description from ZLMediaKit response
    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: result.sdp
    });

    console.log(`[BM-APP WebRTC] Connected to stream: ${this.streamName}`);
  }

  /**
   * Connect via MediaMTX WHEP
   * Format: POST to /<stream>/whep
   * Request: SDP offer as application/sdp
   * Response: SDP answer as text
   */
  private async connectMediaMtx() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.ontrack = (event) => {
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = event.streams[0];
      }
    };

    this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
    this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.waitForIceGathering();

    const encodedStreamName = encodeURIComponent(this.streamName);
    const whepUrl = `${this.getMediaServerUrl()}/${encodedStreamName}/whep`;
    console.log(`[MediaMTX WHEP] Connecting to: ${whepUrl}`);

    const response = await fetch(whepUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp'
      },
      body: this.peerConnection.localDescription?.sdp
    });

    if (!response.ok) {
      throw new Error(`WHEP request failed: ${response.status}`);
    }

    const answerSdp = await response.text();
    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp
    });
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (this.peerConnection?.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection?.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(() => {
        this.peerConnection?.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 5000);
    });
  }

  disconnect() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  onPlaying() {
    this.status.set('playing');
  }

  onError(event: Event) {
    console.error('Video error:', event);
    if (this.status() !== 'error') {
      this.status.set('error');
      this.errorMessage.set('Video playback error');
    }
  }
}
