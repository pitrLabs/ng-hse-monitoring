import { Component, signal, OnInit, computed, inject } from '@angular/core';
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
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import { VideoPlayerComponent } from '../../shared/components/video-player';
import { WsVideoPlayerComponent } from '../../shared/components/ws-video-player/ws-video-player.component';
import { CameraGroupsService } from '../../core/services/camera-groups.service';
import { AuthService } from '../../core/services/auth.service';
import { AITaskService, BmappTask } from '../../core/services/ai-task.service';

interface CameraGroup {
  id: string;
  name: string;          // Original name (for grouping)
  displayName: string;   // Custom display name (can be renamed)
  expanded: boolean;
  cameras: VideoSource[];
}

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
    MatInputModule,
    MatFormFieldModule,
    VideoPlayerComponent,
    WsVideoPlayerComponent
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
        <div class="source-toggle">
          <button class="source-btn" [class.active]="sourceMode() === 'local'" (click)="setSourceMode('local')" matTooltip="Local Sources (MediaMTX)">
            <mat-icon>videocam</mat-icon>
            <span>Local</span>
          </button>
          <button class="source-btn" [class.active]="sourceMode() === 'bmapp'" (click)="setSourceMode('bmapp')" matTooltip="BM-APP AI Streams">
            <mat-icon>smart_display</mat-icon>
            <span>BM-APP</span>
          </button>
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
          } @else if (filteredGroups().length === 0) {
            <div class="empty-state">
              <mat-icon>videocam_off</mat-icon>
              <span>No video sources found</span>
            </div>
          } @else {
            <div class="source-list">
              @for (group of filteredGroups(); track group.id) {
                <div class="tree-node">
                  <div class="node-header" (click)="toggleGroup(group)">
                    <mat-icon class="expand-icon" [class.expanded]="group.expanded">chevron_right</mat-icon>
                    <mat-icon class="folder-icon">folder</mat-icon>
                    <span class="node-name">{{ group.displayName }}</span>
                    <span class="node-count">({{ group.cameras.length }})</span>
                    @if (canRenameGroups()) {
                      <button mat-icon-button class="rename-btn" matTooltip="Rename folder" (click)="openRenameDialog(group); $event.stopPropagation()">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                  </div>
                  @if (group.expanded) {
                    <div class="node-children">
                      @for (source of getFilteredCameras(group); track source.id) {
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
                    @if (sourceMode() === 'local') {
                      <app-video-player [streamName]="cell.source.stream_name" [muted]="true" mode="mediamtx"></app-video-player>
                    } @else {
                      <app-ws-video-player
                        [stream]="getWsStreamId(cell.source)"
                        [showControls]="true"
                        [showFps]="true">
                      </app-ws-video-player>
                    }
                    <div class="video-info">
                      <span class="video-name">{{ cell.source.name }}</span>
                      <span class="video-type">{{ sourceMode() === 'local' ? (cell.source.source_type | uppercase) : 'AI' }}</span>
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

          <!-- Pagination for 4x4 grid -->
          @if (showPagination) {
            <div class="pagination-bar">
              <button mat-icon-button [disabled]="currentPage() === 1" (click)="previousPage()" matTooltip="Previous Page">
                <mat-icon>chevron_left</mat-icon>
              </button>
              @for (page of pageNumbers; track page) {
                <button mat-button
                  class="page-btn"
                  [class.active]="page === currentPage()"
                  (click)="goToPage(page)">
                  {{ page }}
                </button>
              }
              <button mat-icon-button [disabled]="currentPage() === totalPages" (click)="nextPage()" matTooltip="Next Page">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <span class="page-info">Page {{ currentPage() }} of {{ totalPages }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Rename Dialog -->
      @if (renameDialogOpen()) {
        <div class="dialog-overlay" (click)="closeRenameDialog()">
          <div class="rename-dialog glass-card-static" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Rename Folder</h3>
              <button mat-icon-button (click)="closeRenameDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="current-name">
                <label>Original Name</label>
                <span>{{ renameTarget()?.name }}</span>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Display Name</mat-label>
                <input matInput [(ngModel)]="newDisplayName" placeholder="Enter new display name">
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button mat-button (click)="closeRenameDialog()">Cancel</button>
              <button mat-flat-button color="primary" (click)="saveGroupRename()" [disabled]="!newDisplayName || renaming()">
                @if (renaming()) {
                  <mat-spinner diameter="16"></mat-spinner>
                } @else {
                  Save
                }
              </button>
            </div>
          </div>
        </div>
      }
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

    .source-toggle {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
      border: 1px solid var(--glass-border);
    }

    .source-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--glass-bg-hover);
      }

      &.active {
        background: var(--accent-primary);
        color: white;
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

    .tree-node {
      margin-bottom: 2px;
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--glass-bg-hover);
      }
    }

    .expand-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      min-width: 16px;
      color: var(--text-tertiary);
      transition: transform 0.2s;
      flex-shrink: 0;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .folder-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      min-width: 16px;
      color: var(--warning);
      flex-shrink: 0;
    }

    .node-name {
      flex: 1;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .node-count {
      font-size: 11px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      margin-right: 4px;
    }

    .node-children {
      padding-left: 16px;
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

    // Pagination Bar
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 12px 16px;
      border-top: 1px solid var(--glass-border);
      background: var(--glass-bg);
    }

    .page-btn {
      min-width: 36px;
      height: 36px;
      padding: 0;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-weight: 500;

      &.active {
        background: var(--accent-gradient);
        color: white;
      }

      &:hover:not(.active) {
        background: var(--glass-bg-hover);
      }
    }

    .page-info {
      margin-left: 16px;
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .rename-btn {
      width: 24px;
      height: 24px;
      min-width: 24px;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.2s, visibility 0.2s;
      margin-left: auto;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .node-header:hover .rename-btn {
      visibility: visible;
      opacity: 1;
    }

    // Rename Dialog
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rename-dialog {
      width: 400px;
      max-width: 90vw;
      padding: 0;
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .dialog-body {
      padding: 20px;

      .current-name {
        margin-bottom: 16px;

        label {
          display: block;
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 4px;
        }

        span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }
      }

      .full-width {
        width: 100%;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--glass-border);
      background: var(--glass-bg);
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
  private cameraGroupsService = inject(CameraGroupsService);
  private authService = inject(AuthService);
  private aiTaskService = inject(AITaskService);

  searchQuery = '';
  showActiveOnly = true;
  isFullscreen = false;
  gridLayout = signal('2x2');
  selectedSource = signal<VideoSource | null>(null);
  loading = signal(false);
  videoSources = signal<VideoSource[]>([]);
  cameraGroups = signal<CameraGroup[]>([]);

  // Source mode: local (MediaMTX) or bmapp (BM-APP WebSocket)
  sourceMode = signal<'local' | 'bmapp'>('local');

  // BM-APP tasks for WebSocket streaming
  aiTasks = signal<BmappTask[]>([]);

  // Pagination for 4x4 grid
  currentPage = signal(1);
  itemsPerPage = 16;

  // Grid cells with optional video source
  gridCells = signal<{ index: number; source: VideoSource | null }[]>([
    { index: 0, source: null },
    { index: 1, source: null },
    { index: 2, source: null },
    { index: 3, source: null }
  ]);

  // Rename dialog state
  renameDialogOpen = signal(false);
  renameTarget = signal<CameraGroup | null>(null);
  newDisplayName = '';
  renaming = signal(false);

  // Check if user can rename (superadmin or manager)
  canRenameGroups = this.authService.isManager;

  constructor(private videoSourceService: VideoSourceService) {}

  ngOnInit() {
    // Load camera groups from backend first
    this.cameraGroupsService.loadGroups();
    this.loadVideoSources();
    // Pre-load AI tasks for BM-APP mode (avoid race condition)
    this.loadAiTasks();
  }

  loadVideoSources() {
    this.loading.set(true);
    const activeOnly = this.showActiveOnly ? true : undefined;
    this.videoSourceService.loadVideoSources(activeOnly).subscribe({
      next: (sources) => {
        this.videoSources.set(sources);
        this.buildCameraGroups(sources);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setSourceMode(mode: 'local' | 'bmapp') {
    this.sourceMode.set(mode);
    if (mode === 'bmapp') {
      this.loadAiTasks();
    }
  }

  loadAiTasks() {
    // Use getBmappTasks to get the BM-APP format with AlgTaskSession and MediaName
    this.aiTaskService.getBmappTasks().subscribe({
      next: (tasks) => this.aiTasks.set(tasks),
      error: () => this.aiTasks.set([])
    });
  }

  // Get WebSocket stream ID for BM-APP video WebSocket
  // Correct format from app_preview_channel API:
  // - Individual camera: "task/<AlgTaskSession>" (e.g., "task/DCC1-HARKP3_KOPER03")
  // - Mosaic view: "group/<number>" (e.g., "group/1")
  getWsStreamId(source: VideoSource): string {
    // Try to find matching AI task by camera name
    const tasks = this.aiTasks();
    const task = tasks.find(t =>
      t.MediaName === source.name ||
      t.MediaName?.includes(source.name) ||
      source.name?.includes(t.MediaName)
    );

    // Debug logging
    console.log('[Monitor.getWsStreamId] Source:', source.name, 'Matching task:', task ? {
      MediaName: task.MediaName,
      AlgTaskSession: task.AlgTaskSession,
      TaskIdx: task.TaskIdx
    } : 'none');

    // Use "task/<AlgTaskSession>" format for individual camera view
    if (task && task.AlgTaskSession) {
      const streamId = `task/${task.AlgTaskSession}`;
      console.log('[Monitor.getWsStreamId] Using task/AlgTaskSession:', streamId);
      return streamId;
    }

    // Fallback: use task/<source.name> format
    const streamId = `task/${source.name}`;
    console.log('[Monitor.getWsStreamId] Fallback to task/source.name:', streamId);
    return streamId;
  }

  /**
   * Build camera groups from video sources
   * Simple grouping by first word: "H8C-1" → "H8C", "BWC SALATIGA 1" → "BWC"
   */
  buildCameraGroups(sources: VideoSource[]) {
    const groupMap = new Map<string, VideoSource[]>();

    for (const source of sources) {
      // Simple: take first word (split by space or dash)
      const firstWord = source.name.split(/[\s-]/)[0] || 'Other';
      const groupName = firstWord.toUpperCase();

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(source);
    }

    // Convert to array and sort
    const groups: CameraGroup[] = [];
    groupMap.forEach((cameras, name) => {
      // Get display name from service (custom name set by user)
      const displayName = this.cameraGroupsService.getDisplayName(name);
      groups.push({
        id: name.toLowerCase(),
        name: name,  // Original name for grouping
        displayName: displayName,  // Custom display name
        expanded: true,
        cameras: cameras.sort((a, b) => a.name.localeCompare(b.name))
      });
    });

    // Sort groups alphabetically by display name, but put "Other" at the end
    groups.sort((a, b) => {
      if (a.name === 'OTHER') return 1;
      if (b.name === 'OTHER') return -1;
      return a.displayName.localeCompare(b.displayName);
    });

    this.cameraGroups.set(groups);

    // Sync group names to backend (creates any missing groups)
    const groupNames = Array.from(groupMap.keys());
    this.cameraGroupsService.syncGroups(groupNames);
  }

  toggleGroup(group: CameraGroup) {
    group.expanded = !group.expanded;
  }

  filteredGroups(): CameraGroup[] {
    const groups = this.cameraGroups();
    if (!this.searchQuery) {
      return groups;
    }

    const query = this.searchQuery.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        cameras: group.cameras.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.location?.toLowerCase().includes(query)
        )
      }))
      .filter(group => group.cameras.length > 0);
  }

  getFilteredCameras(group: CameraGroup): VideoSource[] {
    if (!this.searchQuery) {
      return group.cameras;
    }
    const query = this.searchQuery.toLowerCase();
    return group.cameras.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.location?.toLowerCase().includes(query)
    );
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

  // Pagination methods
  get totalPages(): number {
    const sources = this.filteredVideoSources();
    return Math.ceil(sources.length / this.itemsPerPage);
  }

  get showPagination(): boolean {
    return this.gridLayout() === '4x4' && this.totalPages > 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
      this.loadPageSources();
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadPageSources();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages) {
      this.currentPage.update(p => p + 1);
      this.loadPageSources();
    }
  }

  loadPageSources() {
    const sources = this.filteredVideoSources();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    const pageSources = sources.slice(startIndex, startIndex + this.itemsPerPage);

    // Fill grid cells with sources from current page
    const cells: { index: number; source: VideoSource | null }[] = [];
    for (let i = 0; i < 16; i++) {
      cells.push({
        index: i,
        source: pageSources[i] || null
      });
    }
    this.gridCells.set(cells);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage();

    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Rename group methods
  openRenameDialog(group: CameraGroup) {
    this.renameTarget.set(group);
    this.newDisplayName = group.displayName;
    this.renameDialogOpen.set(true);
  }

  closeRenameDialog() {
    this.renameDialogOpen.set(false);
    this.renameTarget.set(null);
    this.newDisplayName = '';
  }

  async saveGroupRename() {
    const group = this.renameTarget();
    if (!group || !this.newDisplayName) return;

    this.renaming.set(true);
    try {
      await this.cameraGroupsService.renameGroup(group.name, this.newDisplayName);

      // Update local state
      this.cameraGroups.update(groups =>
        groups.map(g => g.name === group.name ? { ...g, displayName: this.newDisplayName } : g)
      );

      this.closeRenameDialog();
    } catch (error) {
      console.error('Failed to rename group:', error);
    } finally {
      this.renaming.set(false);
    }
  }
}
