import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import { VideoPlayerComponent } from '../../shared/components/video-player';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    VideoPlayerComponent
  ],
  template: `
    <div class="monitor-container">
      <!-- Top Bar -->
      <div class="top-bar glass-card-static">
        <div class="search-section">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search video sources..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-icon-button matTooltip="Refresh" (click)="loadVideoSources()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
        <div class="source-count">
          <mat-icon>videocam</mat-icon>
          <span>{{ filteredVideoSources().length }} Sources</span>
        </div>
        <div class="top-actions">
          <button mat-icon-button matTooltip="Fullscreen" (click)="toggleFullscreen()">
            <mat-icon>{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Panel - Video Source List -->
        <div class="left-panel glass-card-static">
          <div class="panel-header">
            <h3>Video Sources</h3>
            <mat-checkbox [(ngModel)]="showActiveOnly" color="primary" (change)="loadVideoSources()">
              Active Only
            </mat-checkbox>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading sources...</span>
            </div>
          } @else if (filteredVideoSources().length === 0) {
            <div class="empty-state">
              <mat-icon>videocam_off</mat-icon>
              <span>No video sources found</span>
            </div>
          } @else {
            <div class="source-list">
              @for (source of filteredVideoSources(); track source.id) {
                <div
                  class="source-item"
                  [class.selected]="isSourceSelected(source)"
                  [class.active]="source.is_active"
                  (click)="selectSource(source)"
                  (dblclick)="addToGrid(source)"
                >
                  <mat-icon class="source-icon">videocam</mat-icon>
                  <div class="source-info">
                    <span class="source-name">{{ source.name }}</span>
                    <span class="source-location">{{ source.location || 'No location' }}</span>
                  </div>
                  <span class="status-indicator" [class.online]="source.is_active"></span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Center - Video Grid -->
        <div class="center-panel glass-card-static">
          <div class="video-controls">
            <div class="grid-selector">
              <button mat-icon-button [class.active]="gridLayout() === '1x1'" (click)="setGridLayout('1x1')" matTooltip="1x1">
                <mat-icon>crop_square</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '2x2'" (click)="setGridLayout('2x2')" matTooltip="2x2">
                <mat-icon>grid_view</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '3x3'" (click)="setGridLayout('3x3')" matTooltip="3x3">
                <mat-icon>apps</mat-icon>
              </button>
              <button mat-icon-button [class.active]="gridLayout() === '4x4'" (click)="setGridLayout('4x4')" matTooltip="4x4">
                <mat-icon>view_module</mat-icon>
              </button>
            </div>
            <button mat-button class="clear-btn" (click)="clearAllWindows()">
              <mat-icon>clear_all</mat-icon>
              Clear All
            </button>
          </div>

          <div class="video-grid" [class]="'grid-' + gridLayout()">
            @for (cell of gridCells(); track cell.index) {
              <div
                class="video-cell"
                [class.has-source]="cell.source"
                (dragover)="onDragOver($event)"
                (drop)="onDrop($event, cell.index)"
              >
                @if (cell.source) {
                  <div class="video-content">
                    <app-video-player [streamName]="cell.source.stream_name" [muted]="true"></app-video-player>
                    <div class="video-info">
                      <span class="video-name">{{ cell.source.name }}</span>
                      <span class="video-type">{{ cell.source.source_type | uppercase }}</span>
                    </div>
                  </div>
                  <div class="video-overlay">
                    <span class="channel-label">{{ cell.source.name }}</span>
                    <div class="overlay-actions">
                      <button mat-icon-button class="action-btn" matTooltip="Fullscreen" (click)="fullscreenCell(cell.index)">
                        <mat-icon>fullscreen</mat-icon>
                      </button>
                      <button mat-icon-button class="action-btn close" matTooltip="Remove" (click)="removeFromGrid(cell.index)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="video-placeholder" (click)="openSourceSelector(cell.index)">
                    <mat-icon>add_circle_outline</mat-icon>
                    <span>Click to add source</span>
                    <span class="hint">or drag from list</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: calc(100vh - 118px);
    }

    // Top Bar
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      gap: 16px;
    }

    .search-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      width: 280px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-tertiary);
      }

      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 13px;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .source-count {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 13px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .top-actions {
      display: flex;
      gap: 4px;
    }

    // Main Content
    .main-content {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 16px;
      overflow: hidden;
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);

      h3 {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .loading-state, .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 13px;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        opacity: 0.5;
      }
    }

    .source-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .source-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      margin-bottom: 4px;
      transition: all 0.2s ease;
      opacity: 0.6;

      &.active {
        opacity: 1;
      }

      &:hover {
        background: var(--glass-bg-hover);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid var(--accent-primary);
      }
    }

    .source-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--accent-primary);
    }

    .source-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .source-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .source-location {
      font-size: 11px;
      color: var(--text-tertiary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);

      &.online {
        background: var(--success);
        box-shadow: 0 0 8px var(--success);
      }
    }

    // Center Panel
    .center-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .video-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
    }

    .grid-selector {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);

      button {
        width: 32px;
        height: 32px;
        color: var(--text-secondary);

        &.active {
          background: var(--accent-primary);
          color: white;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .clear-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      font-size: 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
    }

    .video-grid {
      flex: 1;
      display: grid;
      gap: 4px;
      padding: 8px;
      background: var(--bg-primary);
      overflow: auto;

      &.grid-1x1 {
        grid-template-columns: 1fr;
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

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      min-height: 120px;
      border: 2px dashed var(--glass-border);
      transition: all 0.2s ease;

      &.has-source {
        border: none;
      }

      &:hover {
        border-color: var(--accent-primary);
      }
    }

    .video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.05);
      }

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      span {
        font-size: 12px;
      }

      .hint {
        font-size: 10px;
        opacity: 0.7;
      }
    }

    .video-content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;

      app-video-player {
        flex: 1;
        min-height: 0;
      }
    }

    .video-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--glass-border);
    }

    .video-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .video-type {
      font-size: 10px;
      padding: 2px 8px;
      background: var(--accent-primary);
      color: white;
      border-radius: 4px;
      font-weight: 600;
    }

    .video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: linear-gradient(180deg, rgba(0,0,0,0.7), transparent);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .video-cell:hover .video-overlay {
      opacity: 1;
    }

    .channel-label {
      font-size: 11px;
      font-weight: 500;
      color: white;
    }

    .overlay-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 28px;
      height: 28px;
      color: white;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(4px);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.close:hover {
        background: var(--error);
      }
    }

    @media (max-width: 900px) {
      .main-content {
        grid-template-columns: 1fr;
      }

      .left-panel {
        max-height: 200px;
      }
    }
  `]
})
export class MonitorComponent implements OnInit {
  searchQuery = '';
  showActiveOnly = true;
  isFullscreen = false;
  gridLayout = signal('2x2');
  selectedSource = signal<VideoSource | null>(null);
  loading = signal(false);
  videoSources = signal<VideoSource[]>([]);

  // Grid cells with optional video source
  gridCells = signal<{ index: number; source: VideoSource | null }[]>([
    { index: 0, source: null },
    { index: 1, source: null },
    { index: 2, source: null },
    { index: 3, source: null }
  ]);

  constructor(private videoSourceService: VideoSourceService) {}

  ngOnInit() {
    this.loadVideoSources();
  }

  loadVideoSources() {
    this.loading.set(true);
    const activeOnly = this.showActiveOnly ? true : undefined;
    this.videoSourceService.loadVideoSources(activeOnly).subscribe({
      next: (sources) => {
        this.videoSources.set(sources);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  filteredVideoSources(): VideoSource[] {
    let sources = this.videoSources();
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      sources = sources.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.location?.toLowerCase().includes(query)
      );
    }
    return sources;
  }

  selectSource(source: VideoSource) {
    this.selectedSource.set(source);
  }

  isSourceSelected(source: VideoSource): boolean {
    return this.selectedSource()?.id === source.id;
  }

  addToGrid(source: VideoSource) {
    const cells = this.gridCells();
    const emptyIndex = cells.findIndex(c => !c.source);
    if (emptyIndex !== -1) {
      this.assignSourceToCell(emptyIndex, source);
    }
  }

  assignSourceToCell(cellIndex: number, source: VideoSource) {
    const cells = [...this.gridCells()];
    cells[cellIndex] = { index: cellIndex, source };
    this.gridCells.set(cells);
  }

  removeFromGrid(cellIndex: number) {
    const cells = [...this.gridCells()];
    cells[cellIndex] = { index: cellIndex, source: null };
    this.gridCells.set(cells);
  }

  openSourceSelector(cellIndex: number) {
    const selected = this.selectedSource();
    if (selected) {
      this.assignSourceToCell(cellIndex, selected);
    }
  }

  setGridLayout(layout: string) {
    this.gridLayout.set(layout);
    this.updateGridCells();
  }

  updateGridCells() {
    const layout = this.gridLayout();
    let count = 4;
    switch (layout) {
      case '1x1': count = 1; break;
      case '2x2': count = 4; break;
      case '3x3': count = 9; break;
      case '4x4': count = 16; break;
    }

    const currentCells = this.gridCells();
    const newCells: { index: number; source: VideoSource | null }[] = [];

    for (let i = 0; i < count; i++) {
      if (i < currentCells.length) {
        newCells.push({ index: i, source: currentCells[i].source });
      } else {
        newCells.push({ index: i, source: null });
      }
    }

    this.gridCells.set(newCells);
  }

  clearAllWindows() {
    const cells = this.gridCells().map(c => ({ index: c.index, source: null }));
    this.gridCells.set(cells);
  }

  fullscreenCell(index: number) {
    const cell = this.gridCells().find(c => c.index === index);
    if (cell?.source) {
      // For now, just switch to 1x1 with this source
      this.setGridLayout('1x1');
      this.gridCells.set([{ index: 0, source: cell.source }]);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, cellIndex: number) {
    event.preventDefault();
    const selected = this.selectedSource();
    if (selected) {
      this.assignSourceToCell(cellIndex, selected);
    }
  }
}
