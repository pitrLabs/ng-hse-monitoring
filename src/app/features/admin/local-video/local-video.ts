import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface LocalVideo {
  id: string;
  name: string;
  filename: string;
  format: string;
  size: string;
  duration: string;
  resolution: string;
  status: 'ready' | 'processing' | 'error';
  uploadDate: string;
  thumbnail?: string;
}

@Component({
  selector: 'app-admin-local-video',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
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
          <button class="action-btn primary" (click)="openUploadDialog()">
            <mat-icon>upload</mat-icon>
            Upload Video
          </button>
        </div>
      </div>

      <div class="storage-info">
        <div class="info-card">
          <mat-icon>folder</mat-icon>
          <div class="info-content">
            <span class="label">Storage Path</span>
            <span class="value">/data/videos</span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>storage</mat-icon>
          <div class="info-content">
            <span class="label">Total Size</span>
            <span class="value">{{ getTotalSize() }}</span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>video_library</mat-icon>
          <div class="info-content">
            <span class="label">Video Count</span>
            <span class="value">{{ videos().length }}</span>
          </div>
        </div>
        <div class="info-card">
          <mat-icon>schedule</mat-icon>
          <div class="info-content">
            <span class="label">Total Duration</span>
            <span class="value">{{ getTotalDuration() }}</span>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search videos..." [(ngModel)]="searchQuery">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="formatFilter">
            <option value="">All Formats</option>
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mkv">MKV</option>
            <option value="mov">MOV</option>
          </select>
          <select [(ngModel)]="statusFilter">
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      @if (viewMode() === 'grid') {
        <div class="videos-grid">
          @for (video of filteredVideos(); track video.id) {
            <div class="video-card" [class]="video.status">
              <div class="video-thumbnail">
                <mat-icon>movie</mat-icon>
                <span class="duration">{{ video.duration }}</span>
                <span class="status-badge" [class]="video.status">{{ video.status }}</span>
              </div>
              <div class="video-info">
                <h4>{{ video.name }}</h4>
                <div class="video-meta">
                  <span><mat-icon>straighten</mat-icon>{{ video.resolution }}</span>
                  <span><mat-icon>sd_storage</mat-icon>{{ video.size }}</span>
                </div>
                <span class="upload-date">{{ video.uploadDate }}</span>
              </div>
              <div class="video-actions">
                <button mat-icon-button (click)="playVideo(video)" matTooltip="Play"><mat-icon>play_arrow</mat-icon></button>
                <button mat-icon-button (click)="analyzeVideo(video)" matTooltip="Analyze"><mat-icon>psychology</mat-icon></button>
                <button mat-icon-button (click)="downloadVideo(video)" matTooltip="Download"><mat-icon>download</mat-icon></button>
                <button mat-icon-button (click)="deleteVideo(video)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
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
              <span class="format">{{ video.format }}</span>
              <span>{{ video.size }}</span>
              <span>{{ video.duration }}</span>
              <span>{{ video.resolution }}</span>
              <span class="status-badge" [class]="video.status">{{ video.status }}</span>
              <span class="actions">
                <button mat-icon-button (click)="playVideo(video)"><mat-icon>play_arrow</mat-icon></button>
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
              <button mat-icon-button (click)="closeUploadDialog()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="dialog-body">
              <div class="upload-zone" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
                <mat-icon>cloud_upload</mat-icon>
                <h4>Drag & Drop Video Here</h4>
                <p>or click to browse</p>
                <input type="file" accept="video/*" (change)="onFileSelected($event)" hidden #fileInput>
                <button class="action-btn secondary" (click)="fileInput.click()">Browse Files</button>
              </div>
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

    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }

    .storage-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .info-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .info-content { display: flex; flex-direction: column; }
    .info-content .label { font-size: 11px; color: var(--text-muted); }
    .info-content .value { font-size: 14px; font-weight: 600; color: var(--text-primary); }

    .filters-bar { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; flex: 1; min-width: 250px; }
    .search-box mat-icon { color: var(--text-muted); }
    .search-box input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 14px; }
    .filter-group { display: flex; gap: 12px; }
    .filter-group select { padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; }

    .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .video-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; transition: all 0.2s; }
    .video-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    .video-thumbnail { position: relative; height: 160px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
    .video-thumbnail mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); }
    .video-thumbnail .duration { position: absolute; bottom: 8px; right: 8px; padding: 4px 8px; background: rgba(0,0,0,0.8); border-radius: 4px; font-size: 11px; color: white; }
    .video-thumbnail .status-badge { position: absolute; top: 8px; right: 8px; }

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
    .upload-zone:hover { border-color: var(--accent-primary); background: rgba(0, 212, 255, 0.05); }
    .upload-zone mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px; }
    .upload-zone h4 { margin: 0 0 8px; color: var(--text-primary); }
    .upload-zone p { margin: 0 0 16px; font-size: 13px; color: var(--text-muted); }

    @media (max-width: 768px) {
      .storage-info { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminLocalVideoComponent {
  viewMode = signal<'grid' | 'list'>('grid');
  showUploadDialog = signal(false);
  searchQuery = '';
  formatFilter = '';
  statusFilter = '';

  videos = signal<LocalVideo[]>([
    { id: '1', name: 'Production Line Camera 01', filename: 'cam01_20240128.mp4', format: 'MP4', size: '2.5 GB', duration: '08:32:15', resolution: '1920x1080', status: 'ready', uploadDate: '2024-01-28' },
    { id: '2', name: 'Warehouse Entrance', filename: 'warehouse_entry.mp4', format: 'MP4', size: '1.8 GB', duration: '06:15:42', resolution: '1920x1080', status: 'ready', uploadDate: '2024-01-27' },
    { id: '3', name: 'Safety Training Video', filename: 'training_2024.avi', format: 'AVI', size: '850 MB', duration: '00:45:30', resolution: '1280x720', status: 'processing', uploadDate: '2024-01-28' },
    { id: '4', name: 'Incident Recording', filename: 'incident_001.mkv', format: 'MKV', size: '420 MB', duration: '00:12:18', resolution: '1920x1080', status: 'ready', uploadDate: '2024-01-26' },
    { id: '5', name: 'Corrupted File', filename: 'corrupted.mp4', format: 'MP4', size: '0 MB', duration: '00:00:00', resolution: 'Unknown', status: 'error', uploadDate: '2024-01-25' }
  ]);

  filteredVideos = signal<LocalVideo[]>([]);

  constructor() {
    this.updateFilteredVideos();
  }

  updateFilteredVideos() {
    let result = this.videos();
    if (this.searchQuery) {
      result = result.filter(v => v.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
    }
    if (this.formatFilter) {
      result = result.filter(v => v.format.toLowerCase() === this.formatFilter.toLowerCase());
    }
    if (this.statusFilter) {
      result = result.filter(v => v.status === this.statusFilter);
    }
    this.filteredVideos.set(result);
  }

  getTotalSize(): string { return '5.57 GB'; }
  getTotalDuration(): string { return '15:45:45'; }

  openUploadDialog() { this.showUploadDialog.set(true); }
  closeUploadDialog() { this.showUploadDialog.set(false); }

  onDragOver(event: DragEvent) { event.preventDefault(); }
  onDrop(event: DragEvent) { event.preventDefault(); console.log('File dropped'); }
  onFileSelected(event: Event) { console.log('File selected'); }

  playVideo(video: LocalVideo) { console.log('Playing:', video.name); }
  analyzeVideo(video: LocalVideo) { console.log('Analyzing:', video.name); }
  downloadVideo(video: LocalVideo) { console.log('Downloading:', video.name); }
  deleteVideo(video: LocalVideo) {
    if (confirm(`Delete video "${video.name}"?`)) {
      this.videos.update(v => v.filter(x => x.id !== video.id));
      this.updateFilteredVideos();
    }
  }
}
