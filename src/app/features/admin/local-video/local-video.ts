import { Component, signal, inject, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LocalVideoService, LocalVideo } from '../../../core/services/local-video.service';
import { formatDate as formatDateUtil } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-admin-local-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="local-video-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Local Video Library</h2>
          <p class="subtitle">Manage local video files for analysis</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle">
            <button [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')"><mat-icon>grid_view</mat-icon></button>
            <button [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')"><mat-icon>view_list</mat-icon></button>
          </div>
          <button class="action-btn primary" (click)="openUploadDialog()" [disabled]="videoService.uploading()">
            <mat-icon>upload</mat-icon>
            Upload Video
          </button>
        </div>
      </div>

      <div class="storage-info">
        <div class="info-card">
          <mat-icon>cloud</mat-icon>
          <div class="info-content">
            <span class="label">Storage Status</span>
            <span class="value" [class.healthy]="storageHealthy()" [class.error]="!storageHealthy()">
              {{ storageStatus() }}
            </span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>storage</mat-icon>
          <div class="info-content">
            <span class="label">Total Size</span>
            <span class="value">{{ totalSize() }}</span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>video_library</mat-icon>
          <div class="info-content">
            <span class="label">Video Count</span>
            <span class="value">{{ videoService.videos().length }}</span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>check_circle</mat-icon>
          <div class="info-content">
            <span class="label">Ready</span>
            <span class="value">{{ readyCount() }}</span>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search videos..." [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="formatFilter" (ngModelChange)="onFilterChange()">
            <option value="">All Formats</option>
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mkv">MKV</option>
            <option value="mov">MOV</option>
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
          <button class="action-btn secondary" (click)="refresh()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      @if (videoService.loading()) {
        <div class="loading-state">
          <mat-icon>hourglass_empty</mat-icon>
          <p>Loading videos...</p>
        </div>
      } @else if (filteredVideos().length === 0) {
        <div class="empty-state">
          <mat-icon>video_library</mat-icon>
          <h3>No Videos Found</h3>
          <p>Upload your first video to get started</p>
        </div>
      } @else if (viewMode() === 'grid') {
        <div class="videos-grid">
          @for (video of filteredVideos(); track video.id) {
            <div class="video-card" [class]="video.status">
              <div class="video-thumbnail" (click)="playVideo(video)">
                @if (video.thumbnail_url) {
                  <img [src]="video.thumbnail_url" alt="Thumbnail">
                } @else {
                  <mat-icon>movie</mat-icon>
                }
                <span class="duration">{{ formatDuration(video.duration) }}</span>
                <span class="status-badge" [class]="video.status">{{ video.status }}</span>
                @if (video.status === 'ready') {
                  <div class="play-overlay">
                    <mat-icon>play_circle</mat-icon>
                  </div>
                }
              </div>
              <div class="video-info">
                <h4>{{ video.name }}</h4>
                <div class="video-meta">
                  <span><mat-icon>straighten</mat-icon>{{ video.resolution || 'N/A' }}</span>
                  <span><mat-icon>sd_storage</mat-icon>{{ formatFileSize(video.file_size) }}</span>
                </div>
                <span class="upload-date">{{ formatDate(video.created_at) }}</span>
              </div>
              <div class="video-actions">
                <button mat-icon-button (click)="playVideo(video)" [disabled]="video.status !== 'ready'" matTooltip="Play">
                  <mat-icon>play_arrow</mat-icon>
                </button>
                <button mat-icon-button (click)="downloadVideo(video)" [disabled]="video.status !== 'ready'" matTooltip="Download">
                  <mat-icon>download</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteVideo(video)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="videos-table">
          <div class="table-header">
            <span>Name</span>
            <span>Format</span>
            <span>Size</span>
            <span>Duration</span>
            <span>Resolution</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          @for (video of filteredVideos(); track video.id) {
            <div class="table-row">
              <span class="name"><mat-icon>movie</mat-icon>{{ video.name }}</span>
              <span class="format">{{ video.format || 'N/A' }}</span>
              <span>{{ formatFileSize(video.file_size) }}</span>
              <span>{{ formatDuration(video.duration) }}</span>
              <span>{{ video.resolution || 'N/A' }}</span>
              <span class="status-badge" [class]="video.status">{{ video.status }}</span>
              <span class="actions">
                <button mat-icon-button (click)="playVideo(video)" [disabled]="video.status !== 'ready'">
                  <mat-icon>play_arrow</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteVideo(video)"><mat-icon>delete</mat-icon></button>
              </span>
            </div>
          }
        </div>
      }

      @if (showUploadDialog()) {
        <div class="dialog-overlay" (click)="closeUploadDialog()">
          <div class="dialog-content" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Upload Video</h3>
              <button mat-icon-button (click)="closeUploadDialog()" [disabled]="videoService.uploading()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              @if (!selectedFile()) {
                <div class="upload-zone"
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"
                     (drop)="onDrop($event)"
                     [class.dragover]="isDragOver()">
                  <mat-icon>cloud_upload</mat-icon>
                  <h4>Drag & Drop Video Here</h4>
                  <p>or click to browse</p>
                  <input type="file" accept="video/*" (change)="onFileSelected($event)" hidden #fileInput>
                  <button class="action-btn secondary" (click)="fileInput.click()">Browse Files</button>
                </div>
              } @else {
                <div class="upload-form">
                  <div class="file-preview">
                    <mat-icon>movie</mat-icon>
                    <div class="file-info">
                      <span class="filename">{{ selectedFile()?.name }}</span>
                      <span class="filesize">{{ formatFileSize(selectedFile()?.size || 0) }}</span>
                    </div>
                    @if (!videoService.uploading()) {
                      <button mat-icon-button (click)="clearSelectedFile()">
                        <mat-icon>close</mat-icon>
                      </button>
                    }
                  </div>

                  <div class="form-field">
                    <label>Video Name *</label>
                    <input type="text" [(ngModel)]="uploadName" placeholder="Enter video name" [disabled]="videoService.uploading()">
                  </div>

                  <div class="form-field">
                    <label>Description</label>
                    <textarea [(ngModel)]="uploadDescription" placeholder="Optional description" rows="3" [disabled]="videoService.uploading()"></textarea>
                  </div>

                  @if (videoService.uploading()) {
                    <div class="upload-progress">
                      <div class="progress-header">
                        <span>Uploading...</span>
                        <span>{{ videoService.uploadProgress() }}%</span>
                      </div>
                      <mat-progress-bar mode="determinate" [value]="videoService.uploadProgress()"></mat-progress-bar>
                    </div>
                  }

                  @if (uploadError()) {
                    <div class="upload-error">
                      <mat-icon>error</mat-icon>
                      <span>{{ uploadError() }}</span>
                    </div>
                  }

                  <div class="dialog-actions">
                    <button class="action-btn secondary" (click)="closeUploadDialog()" [disabled]="videoService.uploading()">
                      Cancel
                    </button>
                    <button class="action-btn primary" (click)="startUpload()" [disabled]="!canUpload() || videoService.uploading()">
                      @if (videoService.uploading()) {
                        <mat-icon class="spinning">sync</mat-icon>
                        Uploading...
                      } @else {
                        <mat-icon>upload</mat-icon>
                        Upload
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      @if (showVideoPlayer()) {
        <div class="dialog-overlay" (click)="closeVideoPlayer()">
          <div class="player-content" (click)="$event.stopPropagation()">
            <div class="player-header">
              <h3>{{ playingVideo()?.name }}</h3>
              <button mat-icon-button (click)="closeVideoPlayer()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="player-body">
              @if (videoStreamUrl()) {
                <video controls autoplay [src]="videoStreamUrl()">
                  Your browser does not support the video tag.
                </video>
              } @else {
                <div class="loading-video">
                  <mat-icon class="spinning">sync</mat-icon>
                  <p>Loading video...</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .local-video-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; align-items: center; }

    .view-toggle { display: flex; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; overflow: hidden; }
    .view-toggle button { padding: 8px 12px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
    .view-toggle button.active { background: var(--accent-primary); color: white; }
    .view-toggle button mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }

    .storage-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .info-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .info-content { display: flex; flex-direction: column; }
    .info-content .label { font-size: 11px; color: var(--text-muted); }
    .info-content .value { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .info-content .value.healthy { color: #22c55e; }
    .info-content .value.error { color: #ef4444; }

    .filters-bar { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; flex: 1; min-width: 250px; }
    .search-box mat-icon { color: var(--text-muted); }
    .search-box input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 14px; }
    .filter-group { display: flex; gap: 12px; }
    .filter-group select { padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); }
    .loading-state mat-icon, .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }

    .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .video-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; transition: all 0.2s; }
    .video-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    .video-thumbnail { position: relative; height: 160px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .video-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
    .video-thumbnail mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); }
    .video-thumbnail .duration { position: absolute; bottom: 8px; right: 8px; padding: 4px 8px; background: rgba(0,0,0,0.8); border-radius: 4px; font-size: 11px; color: white; }
    .video-thumbnail .status-badge { position: absolute; top: 8px; right: 8px; }
    .video-thumbnail .play-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
    .video-thumbnail:hover .play-overlay { opacity: 1; }
    .play-overlay mat-icon { font-size: 64px; width: 64px; height: 64px; color: white; }

    .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .status-badge.ready { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.processing { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .video-info { padding: 16px; }
    .video-info h4 { margin: 0 0 8px; font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .video-meta { display: flex; gap: 16px; margin-bottom: 8px; }
    .video-meta span { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); }
    .video-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .upload-date { font-size: 11px; color: var(--text-muted); }

    .video-actions { display: flex; justify-content: flex-end; gap: 4px; padding: 8px 12px; border-top: 1px solid var(--glass-border); }
    .video-actions button { color: var(--text-secondary); }
    .video-actions button:disabled { opacity: 0.3; }

    .videos-table { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 80px 80px 80px 100px 90px 120px; gap: 16px; padding: 12px 20px; align-items: center; }
    .table-header { background: rgba(0,0,0,0.2); font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .table-row { border-bottom: 1px solid var(--glass-border); font-size: 13px; }
    .table-row:last-child { border-bottom: none; }
    .table-row .name { display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
    .table-row .name mat-icon { color: var(--accent-primary); }
    .table-row .format { text-transform: uppercase; color: var(--text-muted); }
    .table-row .actions { display: flex; gap: 4px; }

    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog-content { background: var(--glass-bg); border-radius: 16px; width: 100%; max-width: 500px; }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--glass-border); }
    .dialog-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    .dialog-body { padding: 24px; }

    .upload-zone { border: 2px dashed var(--glass-border); border-radius: 12px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .upload-zone:hover, .upload-zone.dragover { border-color: var(--accent-primary); background: rgba(0, 212, 255, 0.05); }
    .upload-zone mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px; }
    .upload-zone h4 { margin: 0 0 8px; color: var(--text-primary); }
    .upload-zone p { margin: 0 0 16px; font-size: 13px; color: var(--text-muted); }

    .upload-form { display: flex; flex-direction: column; gap: 20px; }
    .file-preview { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(0,0,0,0.2); border-radius: 8px; }
    .file-preview mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
    .file-info { flex: 1; display: flex; flex-direction: column; }
    .file-info .filename { font-size: 14px; color: var(--text-primary); }
    .file-info .filesize { font-size: 12px; color: var(--text-muted); }

    .form-field { display: flex; flex-direction: column; gap: 8px; }
    .form-field label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .form-field input, .form-field textarea { padding: 12px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; outline: none; }
    .form-field input:focus, .form-field textarea:focus { border-color: var(--accent-primary); }
    .form-field input:disabled, .form-field textarea:disabled { opacity: 0.5; }

    .upload-progress { display: flex; flex-direction: column; gap: 8px; }
    .progress-header { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); }

    .upload-error { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; color: #ef4444; font-size: 13px; }

    .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }

    .player-content { background: var(--glass-bg); border-radius: 16px; width: 100%; max-width: 900px; overflow: hidden; }
    .player-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--glass-border); }
    .player-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .player-body { background: black; min-height: 400px; display: flex; align-items: center; justify-content: center; }
    .player-body video { width: 100%; max-height: 70vh; }
    .loading-video { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); }

    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .storage-info { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminLocalVideoComponent implements OnInit {
  videoService = inject(LocalVideoService);

  viewMode = signal<'grid' | 'list'>('grid');
  showUploadDialog = signal(false);
  showVideoPlayer = signal(false);
  searchQuery = '';
  formatFilter = '';
  statusFilter = '';

  // Upload state
  selectedFile = signal<File | null>(null);
  uploadName = '';
  uploadDescription = '';
  uploadError = signal<string | null>(null);
  isDragOver = signal(false);

  // Video player state
  playingVideo = signal<LocalVideo | null>(null);
  videoStreamUrl = signal<string | null>(null);

  // Computed values
  filteredVideos = computed(() => {
    let videos = this.videoService.videos();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      videos = videos.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.original_filename.toLowerCase().includes(query) ||
        (v.description?.toLowerCase().includes(query) ?? false)
      );
    }

    if (this.formatFilter) {
      videos = videos.filter(v =>
        v.format?.toLowerCase() === this.formatFilter.toLowerCase()
      );
    }

    if (this.statusFilter) {
      videos = videos.filter(v => v.status === this.statusFilter);
    }

    return videos;
  });

  totalSize = computed(() => {
    const stats = this.videoService.stats();
    return stats?.total_size_formatted ?? '0 B';
  });

  readyCount = computed(() => {
    const stats = this.videoService.stats();
    return stats?.by_status?.['ready'] ?? 0;
  });

  storageHealthy = computed(() => {
    const health = this.videoService.storageHealth();
    return health?.status === 'healthy';
  });

  storageStatus = computed(() => {
    const health = this.videoService.storageHealth();
    if (!health) return 'Checking...';
    return health.status === 'healthy' ? 'Connected' : health.status;
  });

  canUpload = computed(() => {
    return this.selectedFile() !== null && this.uploadName.trim().length > 0;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.videoService.loadVideos();
    this.videoService.loadStats();
    this.videoService.checkStorageHealth();
  }

  refresh(): void {
    this.loadData();
  }

  onSearchChange(): void {
    // Filtering is done via computed, no action needed
  }

  onFilterChange(): void {
    // Filtering is done via computed, no action needed
  }

  // Upload dialog
  openUploadDialog(): void {
    this.showUploadDialog.set(true);
    this.clearUploadState();
  }

  closeUploadDialog(): void {
    if (this.videoService.uploading()) return;
    this.showUploadDialog.set(false);
    this.clearUploadState();
  }

  clearUploadState(): void {
    this.selectedFile.set(null);
    this.uploadName = '';
    this.uploadDescription = '';
    this.uploadError.set(null);
    this.isDragOver.set(false);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.uploadName = '';
    this.uploadError.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  handleFileSelection(file: File): void {
    if (!file.type.startsWith('video/')) {
      this.uploadError.set('Please select a video file');
      return;
    }

    this.selectedFile.set(file);
    this.uploadError.set(null);

    // Auto-fill name from filename
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    this.uploadName = nameWithoutExt;
  }

  async startUpload(): Promise<void> {
    const file = this.selectedFile();
    if (!file || !this.uploadName.trim()) return;

    this.uploadError.set(null);

    try {
      await this.videoService.uploadVideo(
        file,
        this.uploadName.trim(),
        this.uploadDescription.trim() || undefined
      );

      this.closeUploadDialog();
      this.videoService.loadStats();

    } catch (error: any) {
      console.error('Upload failed:', error);
      this.uploadError.set(error?.error?.detail || error?.message || 'Upload failed');
    }
  }

  // Video player
  async playVideo(video: LocalVideo): Promise<void> {
    if (video.status !== 'ready') return;

    this.playingVideo.set(video);
    this.videoStreamUrl.set(null);
    this.showVideoPlayer.set(true);

    try {
      // Use stream_url from video if available, otherwise fetch it
      if (video.stream_url) {
        this.videoStreamUrl.set(video.stream_url);
      } else {
        const result = await this.videoService.getStreamUrl(video.id);
        this.videoStreamUrl.set(result.stream_url);
      }
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      this.videoStreamUrl.set(null);
    }
  }

  closeVideoPlayer(): void {
    this.showVideoPlayer.set(false);
    this.playingVideo.set(null);
    this.videoStreamUrl.set(null);
  }

  async downloadVideo(video: LocalVideo): Promise<void> {
    if (video.status !== 'ready') return;

    try {
      const streamUrl = video.stream_url || (await this.videoService.getStreamUrl(video.id)).stream_url;

      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = streamUrl;
      link.download = video.original_filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download video:', error);
    }
  }

  async deleteVideo(video: LocalVideo): Promise<void> {
    if (!confirm(`Delete video "${video.name}"?`)) return;

    try {
      await this.videoService.deleteVideo(video.id);
      this.videoService.loadStats();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  }

  // Formatters
  formatFileSize(bytes: number): string {
    return this.videoService.formatFileSize(bytes);
  }

  formatDuration(seconds: number | undefined): string {
    return this.videoService.formatDuration(seconds);
  }

  formatDate(dateStr: string): string {
    return formatDateUtil(dateStr);
  }
}
