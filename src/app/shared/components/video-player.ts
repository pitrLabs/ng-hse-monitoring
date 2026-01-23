import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

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

  status = signal<'idle' | 'connecting' | 'playing' | 'error'>('idle');
  errorMessage = signal('');

  private peerConnection: RTCPeerConnection | null = null;

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
      // Create WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Handle incoming tracks
      this.peerConnection.ontrack = (event) => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = event.streams[0];
        }
      };

      // Add transceiver for receiving video and audio
      this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
      this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Wait for ICE gathering
      await this.waitForIceGathering();

      // Send offer to MediaMTX WHEP endpoint
      const whepUrl = `${this.getMediaServerUrl()}/${this.streamName}/whep`;
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

      // Set remote description
      const answerSdp = await response.text();
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

    } catch (error: any) {
      console.error('WebRTC connection error:', error);
      this.status.set('error');
      this.errorMessage.set(error.message || 'Connection failed');
    }
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
