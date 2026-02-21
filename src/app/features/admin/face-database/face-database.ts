import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AIBoxService } from '../../../core/services/aibox.service';
import { FaceDatabaseService, FaceAlbum, FaceFeatureRecord } from '../../../core/services/face-database.service';

@Component({
  selector: 'app-admin-face-database',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="face-database-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Face Database</h2>
          <p class="subtitle">Manage face recognition albums and feature records per AI Box</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
          <mat-select [ngModel]="selectedAiBoxId()" (ngModelChange)="selectedAiBoxId.set($event); onAiBoxChange()">
            <mat-option value="">Select AI Box</mat-option>
            @for (box of aiBoxService.aiBoxes(); track box.id) {
              <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || syncing()" (click)="syncAlbums()">
            <mat-icon>cloud_download</mat-icon>
            Sync Albums
          </button>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || syncing()" (click)="syncFeatures()">
            <mat-icon>sync</mat-icon>
            Sync Features
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>face</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to manage its face recognition database</p>
        </div>
      } @else {
        @if (syncMessage()) {
          <div class="sync-message" [class.success]="syncSuccess()">
            <mat-icon>{{ syncSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ syncMessage() }}
          </div>
        }

        <div class="layout-split">
          <!-- Albums Panel -->
          <div class="albums-panel">
            <div class="panel-header">
              <h3>Albums ({{ albums().length }})</h3>
              <button class="icon-btn primary" (click)="showCreateAlbum = true" title="Add Album">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            @if (showCreateAlbum) {
              <div class="create-form">
                <input type="text" [(ngModel)]="newAlbumName" placeholder="Album name" class="form-input">
                <div class="form-actions">
                  <button class="action-btn primary small" [disabled]="!newAlbumName" (click)="createAlbum()">Create</button>
                  <button class="action-btn secondary small" (click)="showCreateAlbum = false; newAlbumName = ''">Cancel</button>
                </div>
              </div>
            }

            @if (loadingAlbums()) {
              <div class="loading-row"><mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner></div>
            }

            @for (album of albums(); track album.id) {
              <div class="album-item" [class.selected]="selectedAlbumId() === album.id" (click)="selectAlbum(album)">
                <mat-icon>folder</mat-icon>
                <div class="album-info">
                  <span class="album-name">{{ album.name }}</span>
                  <span class="album-count">{{ album.feature_count }} faces</span>
                </div>
                <button class="icon-btn danger" (click)="deleteAlbum(album, $event)" title="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }

            @if (!loadingAlbums() && albums().length === 0) {
              <div class="panel-empty">No albums yet. Sync from BM-APP or create a new one.</div>
            }
          </div>

          <!-- Features Panel -->
          <div class="features-panel">
            @if (!selectedAlbumId()) {
              <div class="panel-placeholder">
                <mat-icon>folder_open</mat-icon>
                <p>Select an album to view face records</p>
              </div>
            } @else {
              <div class="panel-header">
                <h3>Features in "{{ getSelectedAlbumName() }}" ({{ features().length }})</h3>
              </div>

              @if (loadingFeatures()) {
                <div class="loading-row"><mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner></div>
              }

              <div class="features-grid">
                @for (feature of features(); track feature.id) {
                  <div class="feature-card">
                    <div class="feature-thumb">
                      @if (feature.minio_path) {
                        <img [src]="feature.minio_path" [alt]="feature.name || 'Face'" onerror="this.style.display='none'">
                      } @else {
                        <mat-icon>person</mat-icon>
                      }
                    </div>
                    <div class="feature-info">
                      <span>{{ feature.name || 'Unknown' }}</span>
                      <span class="muted">ID: {{ feature.bmapp_id || feature.id.slice(0,8) }}</span>
                    </div>
                    <button class="icon-btn danger" (click)="deleteFeature(feature)" title="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
                @if (!loadingFeatures() && features().length === 0) {
                  <div class="features-empty">No face records. Sync features or add manually.</div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .face-database-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .aibox-select { padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; min-width: 180px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
    .empty-state h3 { margin: 0; font-size: 20px; color: var(--text-primary); }

    .sync-message { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 14px; }
    .sync-message.success { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e; }

    .layout-split { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
    @media (max-width: 768px) { .layout-split { grid-template-columns: 1fr; } }

    .albums-panel, .features-panel { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; min-height: 400px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-header h3 { margin: 0; font-size: 15px; color: var(--text-primary); }

    .create-form { padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px; }
    .form-input { width: 100%; padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 14px; box-sizing: border-box; }
    .form-actions { display: flex; gap: 8px; margin-top: 8px; }

    .album-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s; border: 1px solid transparent; }
    .album-item:hover { background: rgba(0,212,255,0.05); }
    .album-item.selected { background: rgba(0,212,255,0.1); border-color: rgba(0,212,255,0.3); }
    .album-item mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--accent-primary); }
    .album-info { flex: 1; display: flex; flex-direction: column; }
    .album-name { font-size: 13px; color: var(--text-primary); }
    .album-count { font-size: 11px; color: var(--text-muted); }

    .panel-empty, .features-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
    .panel-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 12px; color: var(--text-muted); }
    .panel-placeholder mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.2; }

    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .feature-card { background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; overflow: hidden; }
    .feature-thumb { width: 100%; aspect-ratio: 1; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .feature-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .feature-thumb mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--text-muted); opacity: 0.3; }
    .feature-info { padding: 8px; display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
    .feature-info span { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .feature-info .muted { color: var(--text-muted); }

    .loading-row { display: flex; align-items: center; justify-content: center; padding: 24px; }
    .muted { color: var(--text-muted); }

    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn.small { padding: 6px 12px; font-size: 12px; }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: var(--text-muted); display: flex; align-items: center; }
    .icon-btn.primary { color: var(--accent-primary); }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn:hover { background: rgba(255,255,255,0.1); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class AdminFaceDatabaseComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private faceDatabaseService = inject(FaceDatabaseService);

  selectedAiBoxId = signal<string | null>(null);
  selectedAlbumId = signal<string | null>(null);
  albums = signal<FaceAlbum[]>([]);
  features = signal<FaceFeatureRecord[]>([]);
  loadingAlbums = signal(false);
  loadingFeatures = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);

  showCreateAlbum = false;
  newAlbumName = '';

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.selectedAlbumId.set(null);
    this.albums.set([]);
    this.features.set([]);
    this.loadAlbums();
  }

  loadAlbums() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loadingAlbums.set(true);
    this.faceDatabaseService.getAlbums({ aibox_id: id }).subscribe({
      next: (data) => { this.albums.set(data); this.loadingAlbums.set(false); },
      error: () => this.loadingAlbums.set(false)
    });
  }

  selectAlbum(album: FaceAlbum) {
    this.selectedAlbumId.set(album.id);
    this.loadFeatures(album.id);
  }

  getSelectedAlbumName(): string {
    return this.albums().find(a => a.id === this.selectedAlbumId())?.name || '';
  }

  loadFeatures(albumId: string) {
    this.loadingFeatures.set(true);
    this.faceDatabaseService.getFeatures(albumId).subscribe({
      next: (data) => { this.features.set(data); this.loadingFeatures.set(false); },
      error: () => this.loadingFeatures.set(false)
    });
  }

  createAlbum() {
    const id = this.selectedAiBoxId();
    if (!id || !this.newAlbumName) return;
    this.faceDatabaseService.createAlbum({ name: this.newAlbumName, aibox_id: id }).subscribe({
      next: (album) => {
        this.albums.update(a => [...a, album]);
        this.newAlbumName = '';
        this.showCreateAlbum = false;
      }
    });
  }

  deleteAlbum(album: FaceAlbum, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete album "${album.name}"?`)) return;
    this.faceDatabaseService.deleteAlbum(album.id).subscribe({
      next: () => {
        this.albums.update(a => a.filter(x => x.id !== album.id));
        if (this.selectedAlbumId() === album.id) {
          this.selectedAlbumId.set(null);
          this.features.set([]);
        }
      }
    });
  }

  deleteFeature(feature: FaceFeatureRecord) {
    if (!confirm('Delete this face record?')) return;
    this.faceDatabaseService.deleteFeature(feature.id).subscribe({
      next: () => {
        this.features.update(f => f.filter(x => x.id !== feature.id));
        this.albums.update(a => a.map(album =>
          album.id === feature.album_id ? { ...album, feature_count: Math.max(0, album.feature_count - 1) } : album
        ));
      }
    });
  }

  syncAlbums() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.faceDatabaseService.syncAlbumsFromBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.loadAlbums();
        this.showMsg(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMsg(`Sync failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  syncFeatures() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.faceDatabaseService.syncFeaturesFromBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        const albumId = this.selectedAlbumId();
        if (albumId) this.loadFeatures(albumId);
        this.showMsg(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMsg(`Sync failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  private showMsg(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
