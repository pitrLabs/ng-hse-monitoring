import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CameraStatusService, CameraStatus } from '../../../core/services/camera-status.service';

interface VideoSource {
  id: string;
  name: string;
  url: string;
  stream_name: string;
  source_type: 'rtsp' | 'http' | 'file';
  description?: string;
  location?: string;
  group_id?: string | null;
  aibox_id?: string | null;
  task_session?: string | null;
  is_active: boolean;
  sound_alert: boolean;
  is_synced_bmapp: boolean;
  bmapp_sync_error?: string | null;
  created_at: string;
}

interface CameraGroup {
  id: string;
  name: string;
  display_name: string;
}

interface AIBox {
  id: string;
  name: string;
  code: string;
  api_url: string;
  is_active: boolean;
}

interface BmAppMedia {
  id: number;
  mediaUrl: string;
  mediaType: string;
  mediaName?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-video-sources',
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule
  ],
  template: `
    <div class="admin-video-sources">
      <div class="page-header">
        <div class="header-left">
          <h2>Video Sources</h2>
          <span class="count">{{ videoSources().length }} sources</span>
        </div>
        <div class="header-right">
          <button mat-stroked-button (click)="importFromBmApp()" [disabled]="importing()">
            @if (importing()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>download</mat-icon>
            }
            Import from BM-APP
          </button>
          <button mat-stroked-button (click)="syncBmApp()" [disabled]="syncing()">
            @if (syncing()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>cloud_upload</mat-icon>
            }
            Sync to BM-APP
          </button>
          <button mat-stroked-button (click)="syncMediaMtx()" [disabled]="syncingMediaMtx()" matTooltip="Re-sync all streams to MediaMTX (use after MediaMTX restart)">
            @if (syncingMediaMtx()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>sync</mat-icon>
            }
            Sync MediaMTX
          </button>
          <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add Source
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="sources-table">
          <div class="table-header">
            <div class="col-name">Name</div>
            <div class="col-aibox">AI Box</div>
            <div class="col-task">Task ID</div>
            <div class="col-url">Stream URL</div>
            <div class="col-type">Type</div>
            <div class="col-status">Status</div>
            <div class="col-sync">BM-APP</div>
            <div class="col-actions">Actions</div>
          </div>
          @for (source of videoSources(); track source.id) {
            <div class="table-row">
              <div class="col-name">
                <mat-icon class="source-icon">videocam</mat-icon>
                <div class="source-info">
                  <span class="source-name">{{ source.name }}</span>
                  <span class="source-stream">{{ source.stream_name }}</span>
                </div>
              </div>
              <div class="col-aibox">
                @if (getAIBoxName(source.aibox_id)) {
                  <span class="aibox-badge">{{ getAIBoxName(source.aibox_id) }}</span>
                } @else {
                  <span class="aibox-badge unassigned">Not assigned</span>
                }
              </div>
              <div class="col-task">
                @if (source.task_session) {
                  <span class="task-badge" [matTooltip]="source.task_session">{{ truncateTaskId(source.task_session) }}</span>
                } @else {
                  <span class="task-badge none">-</span>
                }
              </div>
              <div class="col-url">
                <span class="url-text" [matTooltip]="source.url">{{ truncateUrl(source.url) }}</span>
              </div>
              <div class="col-type">
                <span class="type-badge">{{ (source.source_type || 'rtsp').toUpperCase() }}</span>
              </div>
              <div class="col-status">
                <span class="status-badge"
                  [class.online]="getRealStatus(source) === 'online'"
                  [class.connecting]="getRealStatus(source) === 'connecting'"
                  [class.error]="getRealStatus(source) === 'error'"
                  [class.offline]="getRealStatus(source) === 'offline'">
                  {{ getRealStatus(source) | titlecase }}
                </span>
              </div>
              <div class="col-sync">
                @if (source.is_synced_bmapp) {
                  <span class="sync-badge synced" matTooltip="Synced to BM-APP">
                    <mat-icon>cloud_done</mat-icon>
                  </span>
                } @else if (source.bmapp_sync_error) {
                  <span class="sync-badge error" [matTooltip]="source.bmapp_sync_error || 'Sync failed'">
                    <mat-icon>cloud_off</mat-icon>
                  </span>
                } @else {
                  <span class="sync-badge pending" matTooltip="Not synced">
                    <mat-icon>cloud_queue</mat-icon>
                  </span>
                }
              </div>
              <div class="col-actions">
                <button mat-icon-button [matTooltip]="source.is_active ? 'Deactivate' : 'Activate'" (click)="toggleSource(source)">
                  <mat-icon>{{ source.is_active ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Edit" (click)="openEditDialog(source)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" (click)="deleteSource(source)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>videocam_off</mat-icon>
              <span>No video sources configured</span>
              <button mat-stroked-button (click)="openCreateDialog()">Add First Source</button>
            </div>
          }
        </div>
      }

      <!-- Create/Edit Dialog -->
      @if (showDialog()) {
        <div class="dialog-backdrop" (click)="closeDialog()">
          <div class="dialog-container" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>{{ editingSource() ? 'Edit Video Source' : 'Add Video Source' }}</h3>
              <button mat-icon-button (click)="closeDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-content">
              <div class="form-group">
                <label>Name *</label>
                <input type="text" [(ngModel)]="formData.name" placeholder="Camera name (e.g., Front Gate Camera)">
              </div>

              <div class="form-group">
                <label>Stream Name *</label>
                <input type="text" [(ngModel)]="formData.stream_name"
                  placeholder="Unique identifier (e.g., cam-front-gate)"
                  [disabled]="!!editingSource()"
                  pattern="[a-zA-Z0-9_-]+">
                <span class="hint">Only letters, numbers, dash and underscore. Cannot be changed after creation.</span>
              </div>

              <div class="form-group">
                <label>Stream URL *</label>
                <input type="text" [(ngModel)]="formData.url"
                  placeholder="rtsp://username:password@192.168.1.100:554/stream1">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Source Type *</label>
                  <select [(ngModel)]="formData.source_type">
                    <option value="rtsp">RTSP</option>
                    <option value="http">HTTP/HLS</option>
                    <option value="file">File</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Folder</label>
                  <div class="folder-select-row">
                    <select [(ngModel)]="formData.group_id" class="folder-select">
                      <option [ngValue]="null">-- No Folder --</option>
                      @for (group of groups(); track group.id) {
                        <option [ngValue]="group.id">{{ group.display_name || group.name }}</option>
                      }
                    </select>
                    <button type="button" mat-icon-button class="new-folder-btn" matTooltip="Create New Folder" (click)="openNewFolderDialog()">
                      <mat-icon>create_new_folder</mat-icon>
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>AI Box *</label>
                <select [(ngModel)]="formData.aibox_id">
                  <option [ngValue]="null">-- Select AI Box --</option>
                  @for (box of aiboxes(); track box.id) {
                    <option [ngValue]="box.id">{{ box.name }} ({{ box.code }})</option>
                  }
                </select>
                <span class="hint">Select which AI Box will process this camera</span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Location</label>
                  <input type="text" [(ngModel)]="formData.location" placeholder="e.g., Building A, Floor 1">
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <input type="text" [(ngModel)]="formData.description" placeholder="Optional description">
                </div>
              </div>

              <div class="form-row checkbox-row">
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="formData.is_active">
                    <span>Active</span>
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="formData.sound_alert">
                    <div class="checkbox-content">
                      <span>Sound Alert</span>
                      <span class="checkbox-hint">Play sound when alarm detected</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="dialog-actions">
              <button mat-stroked-button type="button" (click)="closeDialog()">Cancel</button>
              <button mat-raised-button class="btn-primary save-btn"
                type="button"
                (click)="saveSource()"
                [disabled]="!canSave() || saving()">
                @if (saving()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>{{ editingSource() ? 'save' : 'add' }}</mat-icon>
                    <span>{{ editingSource() ? 'Update' : 'Create' }}</span>
                  </ng-container>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- New Folder Dialog -->
      @if (showNewFolderDialog()) {
        <div class="dialog-backdrop folder-dialog-backdrop" (click)="closeNewFolderDialog()">
          <div class="dialog-container folder-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Create New Folder</h3>
              <button mat-icon-button (click)="closeNewFolderDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-content">
              <div class="form-group">
                <label>Folder Name *</label>
                <input type="text" [(ngModel)]="newFolderName" placeholder="e.g., Building A Cameras">
              </div>
            </div>
            <div class="dialog-actions">
              <button mat-stroked-button type="button" (click)="closeNewFolderDialog()">Cancel</button>
              <button mat-raised-button class="btn-primary save-btn"
                type="button"
                (click)="createNewFolder()"
                [disabled]="!newFolderName.trim() || creatingFolder()">
                @if (creatingFolder()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>create_new_folder</mat-icon>
                    <span>Create</span>
                  </ng-container>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-video-sources { display: flex; flex-direction: column; gap: 24px; }

    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

    .header-left {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .header-right {
      display: flex; gap: 12px;
      button { display: flex; align-items: center; gap: 8px; }
    }
    .btn-primary { background: var(--accent-gradient) !important; color: white !important; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .sources-table {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 1.5fr 90px 100px 2fr 70px 90px 60px 100px;
      gap: 12px; padding: 14px 16px; align-items: center;
    }

    .table-header {
      background: var(--glass-bg-hover);
      font-weight: 600; font-size: 13px;
      color: var(--text-tertiary); text-transform: uppercase;
    }

    .table-row {
      border-top: 1px solid var(--glass-border);
      &:hover { background: var(--glass-bg-hover); }
    }

    .col-name { display: flex; align-items: center; gap: 12px; }

    .source-icon {
      width: 40px; height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #22c55e, #15803d);
      display: flex; align-items: center; justify-content: center;
      color: white;
    }

    .source-info {
      display: flex; flex-direction: column;
      .source-name { font-weight: 500; color: var(--text-primary); font-size: 13px; }
      .source-stream { font-size: 11px; color: var(--text-tertiary); font-family: monospace; }
    }

    .aibox-badge {
      padding: 4px 8px; border-radius: 4px;
      font-size: 11px; font-weight: 600;
      background: rgba(99, 102, 241, 0.2); color: #818cf8;
      font-family: monospace;
      &.unassigned {
        background: rgba(156, 163, 175, 0.15); color: #9ca3af;
        font-weight: 400;
      }
    }

    .task-badge {
      padding: 4px 8px; border-radius: 4px;
      font-size: 11px; font-weight: 500;
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      font-family: monospace;
      &.none {
        background: transparent; color: var(--text-muted);
      }
    }

    .col-url .url-text {
      font-size: 13px; color: var(--text-secondary);
      font-family: monospace;
    }

    .type-badge {
      padding: 4px 10px; border-radius: 4px;
      font-size: 12px; font-weight: 500;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);
    }

    .status-badge {
      padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 500;
      background: rgba(156, 163, 175, 0.2); color: #9ca3af;

      &.online { background: rgba(34, 197, 94, 0.2); color: #22c55e; } /* Green - healthy/streaming */
      &.offline { background: rgba(107, 114, 128, 0.2); color: #6b7280; } /* Gray - not active */
      &.connecting {
        background: rgba(59, 130, 246, 0.2); color: #3b82f6; /* Blue - connecting */
        animation: pulse-badge 1.5s ease-in-out infinite;
      }
      &.error { background: rgba(245, 158, 11, 0.2); color: #f59e0b; } /* Orange - connection error */
    }

    @keyframes pulse-badge {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .col-sync { display: flex; justify-content: center; }

    .sync-badge {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &.synced {
        background: rgba(34, 197, 94, 0.15); color: #22c55e;
      }
      &.pending {
        background: rgba(156, 163, 175, 0.15); color: #9ca3af;
      }
      &.error {
        background: rgba(239, 68, 68, 0.15); color: #ef4444;
      }
    }

    .col-actions {
      display: flex; gap: 4px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }

    /* Dialog Styles */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .dialog-container {
      background: var(--card-bg, #1a1a2e);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--glass-border);

      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
      button { color: var(--text-secondary); }
    }

    .dialog-content {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
      }

      input, select, textarea {
        width: 100%;
        padding: 12px 16px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;

        &:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        &::placeholder {
          color: var(--text-muted);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      select {
        cursor: pointer;
        option { background: #1a1a2e; color: var(--text-primary); }
      }

      .hint {
        display: block;
        margin-top: 6px;
        font-size: 11px;
        color: var(--text-muted);
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-row.checkbox-row {
      margin-top: 8px;
    }

    .folder-select-row {
      display: flex;
      gap: 8px;
      align-items: center;

      .folder-select {
        flex: 1;
      }

      .new-folder-btn {
        width: 40px;
        height: 40px;
        color: var(--accent-primary);
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);

        &:hover {
          background: var(--glass-bg-hover);
        }
      }
    }

    .save-btn {
      display: flex !important;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 120px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      mat-spinner {
        margin: 0;
      }
    }

    .folder-dialog-backdrop {
      z-index: 1100;
    }

    .folder-dialog {
      max-width: 400px;
    }

    .checkbox-group {
      .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        cursor: pointer;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          margin-top: 2px;
        }

        span {
          font-size: 14px;
          color: var(--text-primary);
        }

        .checkbox-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .checkbox-hint {
          font-size: 11px;
          color: var(--text-muted);
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--glass-border);

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class AdminVideoSourcesComponent implements OnInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private cameraStatusService = inject(CameraStatusService);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  syncing = signal(false);
  syncingMediaMtx = signal(false);
  importing = signal(false);
  saving = signal(false);
  creatingFolder = signal(false);
  videoSources = signal<VideoSource[]>([]);
  bmappMedia = signal<BmAppMedia[]>([]);
  groups = signal<CameraGroup[]>([]);
  aiboxes = signal<AIBox[]>([]);

  showNewFolderDialog = signal(false);
  newFolderName = '';

  showDialog = signal(false);
  editingSource = signal<VideoSource | null>(null);

  formData = {
    name: '',
    stream_name: '',
    url: '',
    source_type: 'rtsp' as 'rtsp' | 'http' | 'file',
    description: '',
    location: '',
    group_id: null as string | null,
    aibox_id: null as string | null,
    is_active: true,
    sound_alert: false
  };

  ngOnInit() {
    this.loadSources();
    this.loadGroups();
    this.loadAIBoxes();
  }

  loadSources() {
    this.loading.set(true);
    this.http.get<VideoSource[]>(`${this.apiUrl}/video-sources`).subscribe({
      next: (res) => { this.videoSources.set(res); this.loading.set(false); },
      error: (err) => {
        console.error('Load sources error:', err);
        this.loading.set(false);
        this.showError('Failed to load video sources');
      }
    });
  }

  loadGroups() {
    this.http.get<CameraGroup[]>(`${this.apiUrl}/locations/groups`).subscribe({
      next: (res) => { this.groups.set(res); },
      error: (err) => { console.error('Load groups error:', err); }
    });
  }

  loadAIBoxes() {
    this.http.get<AIBox[]>(`${this.apiUrl}/ai-boxes`).subscribe({
      next: (res) => { this.aiboxes.set(res.filter(b => b.is_active)); },
      error: (err) => { console.error('Load AI boxes error:', err); }
    });
  }

  syncBmApp() {
    this.syncing.set(true);
    this.http.post(`${this.apiUrl}/video-sources/sync-bmapp`, {}).subscribe({
      next: (res: any) => {
        this.syncing.set(false);
        this.loadSources();
        this.showSuccess(res.message || 'Synced to BM-APP successfully');
      },
      error: (err) => {
        console.error('Sync error:', err);
        this.syncing.set(false);
        this.showError(err.error?.detail || 'Failed to sync with BM-APP');
      }
    });
  }

  syncMediaMtx() {
    this.syncingMediaMtx.set(true);
    this.http.post(`${this.apiUrl}/video-sources/sync-mediamtx`, {}).subscribe({
      next: (res: any) => {
        this.syncingMediaMtx.set(false);
        this.showSuccess(res.message || 'Synced to MediaMTX successfully');
      },
      error: (err) => {
        console.error('MediaMTX sync error:', err);
        this.syncingMediaMtx.set(false);
        this.showError(err.error?.detail || 'Failed to sync with MediaMTX');
      }
    });
  }

  importFromBmApp() {
    this.importing.set(true);
    this.http.post<{ imported: number; skipped: number; errors: string[] }>(
      `${this.apiUrl}/video-sources/import-from-bmapp`,
      {}
    ).subscribe({
      next: (res) => {
        this.importing.set(false);
        this.loadSources();
        if (res.imported > 0) {
          this.showSuccess(`Imported ${res.imported} camera(s) from BM-APP${res.skipped > 0 ? `, ${res.skipped} skipped (already exist)` : ''}`);
        } else if (res.skipped > 0) {
          this.showSuccess(`All ${res.skipped} camera(s) already exist locally`);
        } else {
          this.showSuccess('No cameras found in BM-APP to import');
        }
      },
      error: (err) => {
        console.error('Import error:', err);
        this.importing.set(false);
        this.showError(err.error?.detail || 'Failed to import from BM-APP');
      }
    });
  }

  toggleSource(source: VideoSource) {
    this.http.patch(`${this.apiUrl}/video-sources/${source.id}/toggle`, {}).subscribe({
      next: () => {
        this.loadSources();
        this.showSuccess(`Source ${source.is_active ? 'deactivated' : 'activated'} successfully`);
      },
      error: (err) => {
        console.error('Toggle error:', err);
        this.showError('Failed to toggle source status');
      }
    });
  }

  openCreateDialog() {
    this.editingSource.set(null);
    this.resetForm();
    this.showDialog.set(true);
  }

  openEditDialog(source: VideoSource) {
    this.editingSource.set(source);
    this.formData = {
      name: source.name,
      stream_name: source.stream_name,
      url: source.url,
      source_type: source.source_type || 'rtsp',
      description: source.description || '',
      location: source.location || '',
      group_id: source.group_id || null,
      aibox_id: source.aibox_id || null,
      is_active: source.is_active,
      sound_alert: source.sound_alert || false
    };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingSource.set(null);
  }

  resetForm() {
    this.formData = {
      name: '',
      stream_name: '',
      url: '',
      source_type: 'rtsp',
      description: '',
      location: '',
      group_id: null,
      aibox_id: null,
      is_active: true,
      sound_alert: false
    };
  }

  openNewFolderDialog() {
    this.newFolderName = '';
    this.showNewFolderDialog.set(true);
  }

  closeNewFolderDialog() {
    this.showNewFolderDialog.set(false);
    this.newFolderName = '';
  }

  createNewFolder() {
    if (!this.newFolderName.trim()) return;

    this.creatingFolder.set(true);
    this.http.post<CameraGroup>(`${this.apiUrl}/locations/groups`, {
      name: this.newFolderName.trim(),
      display_name: this.newFolderName.trim()
    }).subscribe({
      next: (newGroup) => {
        this.creatingFolder.set(false);
        this.loadGroups();
        this.formData.group_id = newGroup.id;
        this.closeNewFolderDialog();
        this.showSuccess('Folder created successfully');
      },
      error: (err) => {
        this.creatingFolder.set(false);
        this.showError(err.error?.detail || 'Failed to create folder');
      }
    });
  }

  canSave(): boolean {
    return !!(
      this.formData.name.trim() &&
      this.formData.stream_name.trim() &&
      this.formData.url.trim() &&
      this.formData.aibox_id &&
      /^[a-zA-Z0-9_-]+$/.test(this.formData.stream_name)
    );
  }

  saveSource() {
    if (!this.canSave()) return;

    this.saving.set(true);
    const editing = this.editingSource();

    const data = {
      name: this.formData.name.trim(),
      stream_name: this.formData.stream_name.trim(),
      url: this.formData.url.trim(),
      source_type: this.formData.source_type,
      description: this.formData.description.trim() || null,
      location: this.formData.location.trim() || null,
      group_id: this.formData.group_id,
      aibox_id: this.formData.aibox_id,
      is_active: this.formData.is_active,
      sound_alert: this.formData.sound_alert
    };

    const request = editing
      ? this.http.put(`${this.apiUrl}/video-sources/${editing.id}`, data)
      : this.http.post(`${this.apiUrl}/video-sources`, data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadSources();
        this.showSuccess(`Source ${editing ? 'updated' : 'created'} successfully`);
      },
      error: (err) => {
        console.error('Save error:', err);
        this.saving.set(false);
        this.showError(err.error?.detail || `Failed to ${editing ? 'update' : 'create'} source`);
      }
    });
  }

  deleteSource(source: VideoSource) {
    if (confirm(`Delete video source "${source.name}"?\n\nThis will also remove it from MediaMTX and BM-APP.`)) {
      this.http.delete(`${this.apiUrl}/video-sources/${source.id}`).subscribe({
        next: () => {
          this.loadSources();
          this.showSuccess('Source deleted successfully');
        },
        error: (err) => {
          console.error('Delete error:', err);
          this.showError('Failed to delete source');
        }
      });
    }
  }

  getRealStatus(source: VideoSource): CameraStatus {
    return this.cameraStatusService.getStatus(source.stream_name);
  }

  truncateUrl(url: string): string {
    if (url.length > 45) {
      return url.substring(0, 42) + '...';
    }
    return url;
  }

  getAIBoxName(aiboxId: string | null | undefined): string {
    if (!aiboxId) return '';
    const box = this.aiboxes().find(b => b.id === aiboxId);
    return box ? box.code : '';
  }

  truncateTaskId(taskId: string): string {
    if (!taskId) return '-';
    if (taskId.length > 15) {
      return taskId.substring(0, 12) + '...';
    }
    return taskId;
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: 'snack-success' });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: 'snack-error' });
  }
}
