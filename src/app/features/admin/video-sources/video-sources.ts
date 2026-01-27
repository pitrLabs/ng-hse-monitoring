import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-admin-video-sources',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="admin-video-sources">
      <div class="page-header">
        <div class="header-left">
          <h2>Video Sources</h2>
          <span class="count">{{ videoSources().length }} sources</span>
        </div>
        <div class="header-right">
          <button mat-stroked-button (click)="syncBmApp()" [disabled]="syncing()">
            <mat-icon>sync</mat-icon>
            Sync BM-APP
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
            <div class="col-url">Stream URL</div>
            <div class="col-type">Type</div>
            <div class="col-status">Status</div>
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
              <div class="col-url">
                <span class="url-text" [matTooltip]="source.url">{{ source.url | slice:0:40 }}...</span>
              </div>
              <div class="col-type">
                <span class="type-badge">{{ source.source_type || 'RTSP' }}</span>
              </div>
              <div class="col-status">
                <span class="status-badge" [class.active]="source.is_active">
                  {{ source.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="col-actions">
                <button mat-icon-button matTooltip="Toggle" (click)="toggleSource(source)">
                  <mat-icon>{{ source.is_active ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Edit" (click)="editSource(source)">
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
            </div>
          }
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

    .header-right { display: flex; gap: 12px; }
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
      grid-template-columns: 2fr 3fr 100px 100px 120px;
      gap: 16px; padding: 16px 20px; align-items: center;
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
      .source-name { font-weight: 500; color: var(--text-primary); }
      .source-stream { font-size: 12px; color: var(--text-tertiary); }
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
      background: rgba(239, 68, 68, 0.2); color: #ef4444;
      &.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
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
  `]
})
export class AdminVideoSourcesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  syncing = signal(false);
  videoSources = signal<any[]>([]);

  ngOnInit() { this.loadSources(); }

  loadSources() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/video-sources`).subscribe({
      next: (res) => { this.videoSources.set(res); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  syncBmApp() {
    this.syncing.set(true);
    this.http.post(`${this.apiUrl}/video-sources/sync-bmapp`, {}).subscribe({
      next: () => { this.syncing.set(false); this.loadSources(); },
      error: () => this.syncing.set(false)
    });
  }

  toggleSource(source: any) {
    this.http.patch(`${this.apiUrl}/video-sources/${source.id}/toggle`, {}).subscribe(() => this.loadSources());
  }

  openCreateDialog() { console.log('Create source'); }
  editSource(source: any) { console.log('Edit source', source); }
  deleteSource(source: any) {
    if (confirm(`Delete source "${source.name}"?`)) {
      this.http.delete(`${this.apiUrl}/video-sources/${source.id}`).subscribe(() => this.loadSources());
    }
  }
}
