import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BmappVideoPlayerComponent } from '../../../shared/components/bmapp-video-player/bmapp-video-player.component';
import { WsVideoPlayerComponent } from '../../../shared/components/ws-video-player/ws-video-player.component';
import { VideoSourceService, VideoSource } from '../../../core/services/video-source.service';
import { AITaskService, AITask, ZLMStream } from '../../../core/services/ai-task.service';
import { environment } from '../../../../environments/environment';

interface VideoChannel {
  id: string;
  name: string;
  status: 'online' | 'offline';
  statusLabel?: string;
  isConnecting?: boolean;
  stream: string;
  app: string;
  taskIdx?: number; // For WebSocket video streaming (group/TaskIdx format)
}

@Component({
  standalone: true,
  selector: 'app-admin-realtime-preview',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, BmappVideoPlayerComponent, WsVideoPlayerComponent],
  template: `
    <div class="realtime-preview" #previewContainer>
      <!-- Toolbar -->
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <div class="tab-group">
            <button class="tab-btn" [class.active]="sourceMode === 'direct'" (click)="sourceMode = 'direct'; loadVideoSources()">
              <mat-icon>cast_connected</mat-icon>
              <span>Direct AI</span>
            </button>
            <button class="tab-btn" [class.active]="sourceMode === 'bmapp'" (click)="sourceMode = 'bmapp'; loadVideoSources()">
              <mat-icon>smart_display</mat-icon>
              <span>Via Backend</span>
            </button>
            <button class="tab-btn" [class.active]="sourceMode === 'local'" (click)="sourceMode = 'local'; loadVideoSources()">
              <mat-icon>videocam</mat-icon>
              <span>Local Sources</span>
            </button>
          </div>
          <button class="action-btn refresh-btn" (click)="loadVideoSources()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <div class="toolbar-right">
          <div class="player-mode-toggle">
            <button class="mode-btn" [class.active]="playerMode === 'ws'" (click)="playerMode = 'ws'" matTooltip="WebSocket JPEG (Recommended)">
              <mat-icon>image</mat-icon>
              <span>WS</span>
            </button>
            <button class="mode-btn" [class.active]="playerMode === 'webrtc'" (click)="playerMode = 'webrtc'" matTooltip="WebRTC H.264">
              <mat-icon>videocam</mat-icon>
              <span>RTC</span>
            </button>
          </div>
          <div class="layout-buttons">
            <button class="layout-btn" [class.active]="gridLayout === '1x1'" (click)="setGridLayout('1x1')" matTooltip="1x1">
              <div class="layout-icon grid-1x1"></div>
            </button>
            <button class="layout-btn" [class.active]="gridLayout === '2x2'" (click)="setGridLayout('2x2')" matTooltip="2x2">
              <div class="layout-icon grid-2x2"></div>
            </button>
            <button class="layout-btn" [class.active]="gridLayout === '3x3'" (click)="setGridLayout('3x3')" matTooltip="3x3">
              <div class="layout-icon grid-3x3"></div>
            </button>
            <button class="layout-btn" [class.active]="gridLayout === '4x4'" (click)="setGridLayout('4x4')" matTooltip="4x4">
              <div class="layout-icon grid-4x4"></div>
            </button>
          </div>

          <button class="action-btn" (click)="toggleFullscreen()" matTooltip="Fullscreen">
            <mat-icon>{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="preview-content">
        <!-- Device List Sidebar -->
        <div class="device-sidebar">
          <div class="sidebar-header">
            <mat-icon>{{ sourceMode === 'direct' ? 'cast_connected' : sourceMode === 'bmapp' ? 'smart_display' : 'videocam' }}</mat-icon>
            <span>{{ sourceMode === 'direct' ? 'AI Streams' : sourceMode === 'bmapp' ? 'Backend Tasks' : 'Local Devices' }}</span>
          </div>
          <div class="device-list">
            @if (loading) {
              <div class="loading-devices">
                <mat-spinner diameter="24"></mat-spinner>
                <span>Loading...</span>
              </div>
            } @else if (videoChannels.length === 0) {
              <div class="no-devices">
                <mat-icon>videocam_off</mat-icon>
                <span>No video sources found</span>
              </div>
            } @else {
              @for (channel of videoChannels; track channel.id) {
                <div class="device-item"
                     [class.online]="channel.status === 'online'"
                     [class.connecting]="channel.isConnecting"
                     (click)="selectChannel(channel)"
                     [matTooltip]="channel.statusLabel || ''">
                  <mat-icon>{{ channel.status === 'online' ? 'videocam' : channel.isConnecting ? 'sync' : 'videocam_off' }}</mat-icon>
                  <span class="device-name">{{ channel.name }}</span>
                  <span class="status-dot"
                        [class.online]="channel.status === 'online'"
                        [class.connecting]="channel.isConnecting"></span>
                </div>
              }
            }
          </div>
        </div>

        <!-- Video Grid -->
        <div class="video-grid" [class]="'grid-' + gridLayout">
          @for (slot of getGridSlots(); track slot; let i = $index) {
            <div class="video-slot">
              @if (getChannelForSlot(i); as channel) {
                <div class="video-container">
                  @if (playerMode === 'ws') {
                    <app-ws-video-player
                      [stream]="getWsStreamId(channel)"
                      [showControls]="true"
                      [showFps]="true">
                    </app-ws-video-player>
                  } @else {
                    <app-bmapp-video-player
                      [app]="channel.app"
                      [stream]="channel.stream"
                      [showControls]="true">
                    </app-bmapp-video-player>
                  }
                  <div class="video-overlay-controls">
                    <button mat-icon-button matTooltip="Close" (click)="removeFromSlot(i)">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <div class="video-info">
                    <span class="status-indicator online"></span>
                    <span class="channel-name">{{ channel.name }}</span>
                  </div>
                </div>
              } @else {
                <div class="empty-slot">
                  <mat-icon>add_to_queue</mat-icon>
                  <span>Click a camera to add</span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .realtime-preview {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      gap: 16px;
    }

    /* Fullscreen mode */
    .realtime-preview:fullscreen {
      height: 100vh;
      padding: 16px;
      background: var(--bg-primary, #0a0a14);
    }

    .realtime-preview:fullscreen .preview-content {
      height: calc(100vh - 80px);
    }

    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--glass-bg);
      border-radius: 12px;
      border: 1px solid var(--glass-border);
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tab-group {
      display: flex;
      gap: 8px;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: var(--glass-bg);
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--glass-border);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--text-primary);
        background: var(--glass-bg-hover);
      }

      &.active {
        color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.1);
        border-color: var(--accent-primary);
      }
    }

    .player-mode-toggle {
      display: flex;
      gap: 2px;
      background: rgba(0, 0, 0, 0.2);
      padding: 4px;
      border-radius: 8px;
      margin-right: 8px;
    }

    .mode-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 6px;
      font-size: 11px;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        background: var(--accent-primary);
        color: white;
      }
    }

    .layout-buttons {
      display: flex;
      gap: 8px;
    }

    .layout-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      background: var(--glass-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        background: var(--glass-bg-hover);
      }

      &.active {
        background: rgba(0, 212, 255, 0.1);
        border-color: var(--accent-primary);

        .layout-icon {
          border-color: var(--accent-primary);
        }
      }
    }

    .layout-icon {
      width: 18px;
      height: 18px;
      border: 1px solid var(--text-muted);
      border-radius: 2px;
      position: relative;

      &.grid-2x2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 2px;
        padding: 2px;
      }

      &.grid-3x3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        padding: 2px;
      }

      &.grid-4x4 {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        padding: 1px;
      }
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      background: var(--glass-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-secondary);
      }

      &:hover {
        background: var(--glass-bg-hover);
        mat-icon {
          color: var(--accent-primary);
        }
      }

      &.refresh-btn {
        margin-left: 12px;
      }
    }

    .preview-content {
      flex: 1;
      display: flex;
      gap: 16px;
      min-height: 0;
    }

    .device-sidebar {
      width: 240px;
      background: var(--glass-bg);
      border-radius: 12px;
      border: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border-bottom: 1px solid var(--glass-border);
      background: rgba(0, 0, 0, 0.1);

      mat-icon {
        color: var(--accent-primary);
      }

      span {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .device-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .loading-devices, .no-devices {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px;
      color: var(--text-muted);
      font-size: 12px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-radius: 10px;
      margin-bottom: 8px;
      background: rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-muted);
      }

      .device-name {
        flex: 1;
        font-size: 13px;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;

        &.online {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        &.connecting {
          background: #f59e0b;
          animation: pulse-connecting 1.5s infinite;
        }
      }

      @keyframes pulse-connecting {
        0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
        50% { opacity: 0.5; box-shadow: none; }
      }

      .device-item.connecting mat-icon {
        color: #f59e0b;
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      &.online mat-icon {
        color: var(--accent-primary);
      }

      &:hover {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .video-grid {
      flex: 1;
      display: grid;
      gap: 12px;
      min-height: 0;

      &.grid-1x1 {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
      }

      &.grid-2x2 {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
      }

      &.grid-3x3 {
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
      }

      &.grid-4x4 {
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
      }
    }

    .video-slot {
      background: var(--glass-bg);
      border-radius: 12px;
      border: 1px solid var(--glass-border);
      overflow: hidden;
      min-height: 0;
    }

    .video-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #0a0a14;
    }

    .video-overlay-controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 20;

      button {
        width: 32px;
        height: 32px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 6px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: white;
        }

        &:hover {
          background: rgba(0, 0, 0, 0.8);
        }
      }
    }

    .video-container:hover .video-overlay-controls {
      opacity: 1;
    }

    .video-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 12px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      display: flex;
      align-items: center;
      gap: 8px;

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;

        &.online {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }
      }

      .channel-name {
        font-size: 12px;
        color: white;
      }
    }

    .empty-slot {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.1);
      border: 2px dashed var(--glass-border);
      border-radius: 10px;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--text-muted);
      }

      span {
        font-size: 13px;
        color: var(--text-muted);
      }
    }
  `]
})
export class AdminRealtimePreviewComponent implements OnInit, OnDestroy {
  @ViewChild('previewContainer') previewContainer!: ElementRef<HTMLElement>;

  gridLayout: '1x1' | '2x2' | '3x3' | '4x4' = '2x2';
  loading = false;
  sourceMode: 'direct' | 'bmapp' | 'local' = 'direct';
  playerMode: 'ws' | 'webrtc' = 'ws'; // WebSocket JPEG is more reliable
  isFullscreen = false;

  private fullscreenChangeHandler = () => this.onFullscreenChange();

  videoChannels: VideoChannel[] = [];
  gridSlots: (VideoChannel | null)[] = [];

  private bmappUrl = environment.bmappUrl;
  // Use proxy in development to bypass CORS
  private bmappProxyUrl = '/bmapp-api';

  constructor(
    private http: HttpClient,
    private videoSourceService: VideoSourceService,
    private aiTaskService: AITaskService
  ) {}

  ngOnInit() {
    this.loadVideoSources();
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  loadVideoSources() {
    this.loading = true;

    if (this.sourceMode === 'direct') {
      this.loadDirectFromBmapp();
    } else if (this.sourceMode === 'bmapp') {
      this.loadFromBackend();
    } else {
      this.loadFromLocal();
    }
  }

  // Direct query to BM-APP API via proxy
  // BM-APP nginx routes: /api/ -> port 10002 (backend API)
  loadDirectFromBmapp() {
    console.log('Loading from BM-APP via proxy...');

    // First try to get tasks (most reliable - uses /api/ route)
    const taskUrl = `${this.bmappProxyUrl}/api/alg_task_fetch`;

    this.http.post<any>(taskUrl, {}).subscribe({
      next: (res) => {
        console.log('Task fetch response:', res);
        if (res.Result?.Code === 0 && res.Content) {
          this.videoChannels = res.Content.map((t: any) => {
            // Status types: 0=Stopped, 1=Connecting, 2=Warning/Error, 4=Healthy/Running
            const statusType = t.AlgTaskStatus?.type;
            const isOnline = statusType === 4; // Only "Healthy" is truly online
            const isConnecting = statusType === 1;

            return {
              id: t.AlgTaskSession,
              name: t.MediaName || t.AlgTaskSession,
              status: isOnline ? 'online' : 'offline',
              statusLabel: t.AlgTaskStatus?.label || 'Unknown',
              isConnecting,
              stream: t.AlgTaskSession, // Task session is the stream name for AI output
              app: 'live',
              taskIdx: t.TaskIdx // For WebSocket video streaming
            };
          });
          console.log('Loaded tasks:', this.videoChannels);
        } else {
          this.videoChannels = [];
        }
        this.initializeGrid();
        this.loading = false;
      },
      error: (err) => {
        console.error('Task fetch failed:', err);
        // Fallback to media fetch
        this.loadMediaFromBmapp();
      }
    });
  }

  // Fallback: Get media/cameras from BM-APP
  loadMediaFromBmapp() {
    console.log('Trying BM-APP media fetch...');
    const mediaUrl = `${this.bmappProxyUrl}/api/alg_media_fetch`;

    this.http.post<any>(mediaUrl, {}).subscribe({
      next: (res) => {
        console.log('Media fetch response:', res);
        if (res.Result?.Code === 0 && res.Content) {
          this.videoChannels = res.Content.map((m: any) => {
            // MediaStatus types: 0=Offline, 2=Online
            const statusType = m.MediaStatus?.type;
            const isOnline = statusType === 2; // For media, type 2 means online

            return {
              id: m.MediaName,
              name: m.MediaName,
              status: isOnline ? 'online' : 'offline',
              statusLabel: m.MediaStatus?.label || 'Unknown',
              stream: m.MediaName,
              app: 'live'
            };
          });
          console.log('Loaded media:', this.videoChannels);
        } else {
          this.videoChannels = [];
        }
        this.initializeGrid();
        this.loading = false;
      },
      error: (err) => {
        console.error('Media fetch failed:', err);
        console.error('All BM-APP endpoints failed - check proxy config');
        this.videoChannels = [];
        this.initializeGrid();
        this.loading = false;
      }
    });
  }

  loadFromBackend() {
    // Via backend (needs BMAPP_ENABLED=true on backend)
    this.aiTaskService.getTasks().subscribe({
      next: (tasks) => {
        this.aiTaskService.getAvailableStreams().subscribe({
          next: (streams) => {
            this.processBmappData(tasks, streams);
          },
          error: () => {
            console.warn('Streams endpoint unavailable, using tasks only');
            this.processBmappData(tasks, []);
          }
        });
      },
      error: (err) => {
        console.error('Failed to load from backend:', err);
        this.sourceMode = 'local';
        this.loadFromLocal();
      }
    });
  }

  private processBmappData(tasks: any[], streams: any[]) {
    const availableStreams = new Set<string>();
    streams.forEach(s => {
      availableStreams.add(s.stream);
    });

    this.videoChannels = tasks.map(t => {
      // Status types: 0=Stopped, 1=Connecting, 2=Warning/Error, 4=Healthy/Running
      const statusType = t.AlgTaskStatus?.type;
      const isHealthy = statusType === 4;
      const isConnecting = statusType === 1;
      const streamName = availableStreams.has(t.MediaName)
        ? t.MediaName
        : availableStreams.has(t.AlgTaskSession)
          ? t.AlgTaskSession
          : t.AlgTaskSession;

      const streamAvailable = streams.length === 0 ? isHealthy : availableStreams.has(streamName);

      return {
        id: t.AlgTaskSession,
        name: t.MediaName,
        status: (isHealthy && streamAvailable) ? 'online' : 'offline',
        statusLabel: t.AlgTaskStatus?.label || 'Unknown',
        isConnecting,
        stream: streamName,
        app: 'live',
        taskIdx: t.TaskIdx
      };
    });

    streams.forEach(s => {
      const hasTask = tasks.some(t => t.MediaName === s.stream || t.AlgTaskSession === s.stream);
      if (!hasTask && s.app === 'live') {
        this.videoChannels.push({
          id: s.stream,
          name: `${s.stream} (raw)`,
          status: 'online',
          stream: s.stream,
          app: s.app
        });
      }
    });

    this.initializeGrid();
    this.loading = false;
  }

  loadFromLocal() {
    this.videoSourceService.getAll(true).subscribe({
      next: (sources) => {
        this.videoChannels = sources.map(s => ({
          id: s.id,
          name: s.name,
          status: s.is_active ? 'online' : 'offline',
          stream: s.stream_name,
          app: 'live'
        }));
        this.initializeGrid();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load video sources:', err);
        this.loading = false;
        this.initializeGrid();
      }
    });
  }

  initializeGrid() {
    const totalSlots = this.getGridSlotCount();
    this.gridSlots = Array(totalSlots).fill(null);

    const onlineChannels = this.videoChannels.filter(c => c.status === 'online');
    for (let i = 0; i < Math.min(onlineChannels.length, totalSlots); i++) {
      this.gridSlots[i] = onlineChannels[i];
    }
  }

  getGridSlotCount(): number {
    switch (this.gridLayout) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      default: return 4;
    }
  }

  getGridSlots(): number[] {
    return Array(this.getGridSlotCount()).fill(0).map((_, i) => i);
  }

  setGridLayout(layout: '1x1' | '2x2' | '3x3' | '4x4') {
    this.gridLayout = layout;
    this.initializeGrid();
  }

  selectChannel(channel: VideoChannel) {
    const emptyIndex = this.gridSlots.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      this.gridSlots[emptyIndex] = channel;
    }
  }

  getChannelForSlot(index: number): VideoChannel | null {
    return this.gridSlots[index] || null;
  }

  removeFromSlot(index: number) {
    this.gridSlots[index] = null;
  }

  // Get WebSocket stream ID for BM-APP video WebSocket
  // Format: TaskIdx as string (e.g., "1", "7") for individual camera view
  // Using "group/X" gives mosaic view, so we use TaskIdx directly
  getWsStreamId(channel: VideoChannel): string {
    // Use TaskIdx directly for individual camera view
    if (channel.taskIdx !== undefined) {
      return String(channel.taskIdx);
    }
    // Fallback: use task session name (also works)
    return channel.id;
  }

  toggleFullscreen() {
    if (!this.previewContainer?.nativeElement) return;

    if (!document.fullscreenElement) {
      this.previewContainer.nativeElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  private onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }
}
