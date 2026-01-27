import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface ImageSource {
  id: string;
  name: string;
  type: 'camera' | 'folder' | 'url' | 'upload';
  path: string;
  format: string;
  resolution: string;
  status: 'active' | 'inactive' | 'error';
  imageCount: number;
  lastUpdated: string;
  autoSync: boolean;
}

@Component({
  selector: 'app-admin-image-task-source',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="image-task-source-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Image Task Sources</h2>
          <p class="subtitle">Manage image sources for analysis tasks</p>
        </div>
        <button class="action-btn primary" (click)="addSource()">
          <mat-icon>add_photo_alternate</mat-icon>
          Add Source
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <mat-icon>photo_library</mat-icon>
          <div class="stat-info">
            <span class="value">{{ sources().length }}</span>
            <span class="label">Total Sources</span>
          </div>
        </div>
        <div class="stat-card active">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('active') }}</span>
            <span class="label">Active</span>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon>image</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getTotalImages() | number }}</span>
            <span class="label">Total Images</span>
          </div>
        </div>
        <div class="stat-card error">
          <mat-icon>error</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('error') }}</span>
            <span class="label">Errors</span>
          </div>
        </div>
      </div>

      <div class="source-types">
        <button class="type-tab" [class.active]="filterType === ''" (click)="filterType = ''">
          <mat-icon>apps</mat-icon>
          All
        </button>
        <button class="type-tab" [class.active]="filterType === 'camera'" (click)="filterType = 'camera'">
          <mat-icon>videocam</mat-icon>
          Camera
        </button>
        <button class="type-tab" [class.active]="filterType === 'folder'" (click)="filterType = 'folder'">
          <mat-icon>folder</mat-icon>
          Folder
        </button>
        <button class="type-tab" [class.active]="filterType === 'url'" (click)="filterType = 'url'">
          <mat-icon>link</mat-icon>
          URL
        </button>
        <button class="type-tab" [class.active]="filterType === 'upload'" (click)="filterType = 'upload'">
          <mat-icon>cloud_upload</mat-icon>
          Upload
        </button>
      </div>

      <div class="sources-grid">
        @for (source of getFilteredSources(); track source.id) {
          <div class="source-card" [class]="source.status">
            <div class="source-header">
              <div class="source-icon" [class]="source.type">
                <mat-icon>{{ getTypeIcon(source.type) }}</mat-icon>
              </div>
              <span class="status-badge" [class]="source.status">{{ source.status }}</span>
            </div>
            <div class="source-info">
              <h4>{{ source.name }}</h4>
              <p class="source-path">{{ source.path }}</p>
              <div class="source-details">
                <span class="detail"><mat-icon>aspect_ratio</mat-icon>{{ source.resolution }}</span>
                <span class="detail"><mat-icon>insert_drive_file</mat-icon>{{ source.format }}</span>
              </div>
            </div>
            <div class="source-stats">
              <div class="stat">
                <span class="stat-value">{{ source.imageCount | number }}</span>
                <span class="stat-label">Images</span>
              </div>
              <div class="stat">
                <span class="stat-value last-updated">{{ source.lastUpdated }}</span>
                <span class="stat-label">Last Updated</span>
              </div>
            </div>
            <div class="source-footer">
              <div class="auto-sync">
                <span>Auto Sync</span>
                <mat-slide-toggle [(ngModel)]="source.autoSync" color="primary"></mat-slide-toggle>
              </div>
              <div class="source-actions">
                <button mat-icon-button (click)="syncSource(source)" matTooltip="Sync Now">
                  <mat-icon>sync</mat-icon>
                </button>
                <button mat-icon-button (click)="browseSource(source)" matTooltip="Browse">
                  <mat-icon>folder_open</mat-icon>
                </button>
                <button mat-icon-button (click)="editSource(source)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteSource(source)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (getFilteredSources().length === 0) {
        <div class="empty-state">
          <mat-icon>add_photo_alternate</mat-icon>
          <h3>No image sources found</h3>
          <p>{{ filterType ? 'No ' + filterType + ' sources configured' : 'Add an image source to get started' }}</p>
          <button class="action-btn primary" (click)="addSource()">
            <mat-icon>add</mat-icon>
            Add Source
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-task-source-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.active mat-icon { color: #22c55e; }
    .stat-card.error mat-icon { color: #ef4444; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .source-types { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
    .type-tab { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-secondary); font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .type-tab:hover { border-color: var(--accent-primary); color: var(--text-primary); }
    .type-tab.active { background: rgba(0, 212, 255, 0.1); border-color: var(--accent-primary); color: var(--accent-primary); }
    .type-tab mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .sources-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .source-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px; transition: all 0.2s; }
    .source-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .source-card.active { border-left: 4px solid #22c55e; }
    .source-card.inactive { border-left: 4px solid #6b7280; opacity: 0.7; }
    .source-card.error { border-left: 4px solid #ef4444; }

    .source-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .source-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .source-icon.camera { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .source-icon.folder { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .source-icon.url { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .source-icon.upload { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .source-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .status-badge.active { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.inactive { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .source-info h4 { margin: 0 0 4px; font-size: 16px; color: var(--text-primary); }
    .source-path { margin: 0 0 8px; font-size: 12px; color: var(--text-muted); word-break: break-all; }
    .source-details { display: flex; gap: 16px; }
    .detail { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .detail mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .source-stats { display: flex; justify-content: space-around; padding: 16px 0; margin: 16px 0; border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-value { font-size: 20px; font-weight: 600; color: var(--text-primary); }
    .stat-value.last-updated { font-size: 13px; font-weight: 500; }
    .stat-label { font-size: 11px; color: var(--text-muted); }

    .source-footer { display: flex; justify-content: space-between; align-items: center; }
    .auto-sync { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
    .source-actions { display: flex; gap: 4px; }
    .source-actions button { color: var(--text-secondary); width: 32px; height: 32px; }
    .source-actions button mat-icon { font-size: 18px; }

    .empty-state { text-align: center; padding: 60px 20px; background: var(--glass-bg); border-radius: 16px; border: 1px solid var(--glass-border); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 16px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty-state p { margin: 0 0 20px; color: var(--text-muted); }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminImageTaskSourceComponent {
  filterType = '';

  sources = signal<ImageSource[]>([
    { id: '1', name: 'Production Floor Cameras', type: 'camera', path: 'rtsp://192.168.1.100:554/stream1', format: 'MJPEG', resolution: '1920x1080', status: 'active', imageCount: 15420, lastUpdated: '2 min ago', autoSync: true },
    { id: '2', name: 'Inspection Images', type: 'folder', path: '/data/inspections/2024', format: 'JPEG/PNG', resolution: 'Various', status: 'active', imageCount: 8750, lastUpdated: '1 hour ago', autoSync: true },
    { id: '3', name: 'Remote Camera Feed', type: 'url', path: 'https://cam.example.com/feed', format: 'JPEG', resolution: '1280x720', status: 'error', imageCount: 320, lastUpdated: '3 hours ago', autoSync: false },
    { id: '4', name: 'Manual Uploads', type: 'upload', path: '/uploads/manual', format: 'JPEG/PNG/BMP', resolution: 'Various', status: 'active', imageCount: 1250, lastUpdated: '30 min ago', autoSync: false },
    { id: '5', name: 'Warehouse Cameras', type: 'camera', path: 'rtsp://192.168.1.101:554/stream1', format: 'H.264', resolution: '2560x1440', status: 'active', imageCount: 22100, lastUpdated: '1 min ago', autoSync: true },
    { id: '6', name: 'Archive 2023', type: 'folder', path: '/archive/2023', format: 'JPEG', resolution: '1920x1080', status: 'inactive', imageCount: 45000, lastUpdated: '1 month ago', autoSync: false }
  ]);

  getCountByStatus(status: string): number { return this.sources().filter(s => s.status === status).length; }
  getTotalImages(): number { return this.sources().reduce((sum, s) => sum + s.imageCount, 0); }

  getFilteredSources(): ImageSource[] {
    if (!this.filterType) return this.sources();
    return this.sources().filter(s => s.type === this.filterType);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = { camera: 'videocam', folder: 'folder', url: 'link', upload: 'cloud_upload' };
    return icons[type] || 'image';
  }

  addSource() { console.log('Adding new source...'); }
  syncSource(source: ImageSource) { console.log('Syncing source:', source.name); }
  browseSource(source: ImageSource) { console.log('Browsing source:', source.name); }
  editSource(source: ImageSource) { console.log('Editing source:', source.name); }
  deleteSource(source: ImageSource) {
    if (confirm(`Delete source "${source.name}"?`)) {
      this.sources.update(s => s.filter(x => x.id !== source.id));
    }
  }
}
