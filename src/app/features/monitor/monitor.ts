import { Component, signal, OnInit, computed, inject, effect } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { VideoSourceService, VideoSource } from '../../core/services/video-source.service';
import { VideoPlayerComponent } from '../../shared/components/video-player';
import { WsVideoPlayerComponent } from '../../shared/components/ws-video-player/ws-video-player.component';
import { CameraGroupsService } from '../../core/services/camera-groups.service';
import { AuthService } from '../../core/services/auth.service';
import { AITaskService, BmappTask } from '../../core/services/ai-task.service';
import { CameraStatusService, CameraStatus } from '../../core/services/camera-status.service';

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
    MatSelectModule,
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
            <div class="header-actions">
              @if (canRenameGroups()) {
                <button mat-icon-button class="add-folder-btn" matTooltip="Create folder" (click)="openCreateFolderDialog()">
                  <mat-icon>create_new_folder</mat-icon>
                </button>
              }
              <mat-checkbox [(ngModel)]="showActiveOnly" color="primary" (change)="loadVideoSources()">
                Active Only
              </mat-checkbox>
            </div>
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
                  <div class="node-header"
                       [class.drag-over]="dragOverGroup === group.id"
                       (click)="toggleGroup(group)"
                       (dragover)="onFolderDragOver($event, group)"
                       (dragleave)="onFolderDragLeave($event)"
                       (drop)="onFolderDrop($event, group)">
                    <mat-icon class="expand-icon" [class.expanded]="group.expanded">chevron_right</mat-icon>
                    <mat-icon class="folder-icon">folder</mat-icon>
                    <span class="node-name">{{ group.displayName }}</span>
                    <span class="node-count">({{ group.cameras.length }})</span>
                    @if (canRenameGroups()) {
                      <div class="folder-actions">
                        <button mat-icon-button class="folder-action-btn" matTooltip="Rename folder" (click)="openRenameDialog(group); $event.stopPropagation()">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button class="folder-action-btn delete-btn" matTooltip="Delete folder" (click)="openDeleteDialog(group); $event.stopPropagation()">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                  @if (group.expanded) {
                    <div class="node-children">
                      @for (source of getFilteredCameras(group); track source.id) {
                        <div
                          class="source-item"
                          [class.selected]="isSourceSelected(source)"
                          [class.active]="source.is_active"
                          [class.dragging]="draggingCamera?.id === source.id"
                          draggable="true"
                          (dragstart)="onCameraDragStart($event, source, group)"
                          (dragend)="onCameraDragEnd($event)"
                          (click)="selectSource(source)"
                          (dblclick)="addToGrid(source)"
                        >
                          <mat-icon class="source-icon">videocam</mat-icon>
                          <div class="source-info">
                            <span class="source-name">{{ source.name }}</span>
                            <span class="source-location">{{ source.location || 'No location' }}</span>
                          </div>
                          <span class="status-indicator"
                            [class.online]="getCameraStatus(source) === 'online'"
                            [class.connecting]="getCameraStatus(source) === 'connecting'"
                            [class.error]="getCameraStatus(source) === 'error'"
                            [matTooltip]="getCameraStatus(source)"></span>
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
                        [mediaName]="cell.source.name"
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

      <!-- Delete Folder Dialog -->
      @if (deleteDialogOpen()) {
        <div class="dialog-overlay" (click)="closeDeleteDialog()">
          <div class="delete-dialog glass-card-static" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Delete Folder</h3>
              <button mat-icon-button (click)="closeDeleteDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="delete-warning">
                <mat-icon class="warning-icon">warning</mat-icon>
                <div class="warning-text">
                  @if (deleteTargetCameraCount() === 0) {
                    <p>Are you sure you want to delete folder "<strong>{{ deleteTarget()?.displayName }}</strong>"?</p>
                    <p class="subtext">This folder is empty and can be deleted safely.</p>
                  } @else {
                    <p>Folder "<strong>{{ deleteTarget()?.displayName }}</strong>" contains <strong>{{ deleteTargetCameraCount() }} cameras</strong>.</p>
                    <p class="subtext">Please move the cameras to another folder first, or select a target folder below to move them automatically.</p>
                  }
                </div>
              </div>

              @if (deleteTargetCameraCount() > 0) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Move cameras to folder</mat-label>
                  <mat-select [(ngModel)]="moveToGroupId">
                    <mat-option value="">-- Leave ungrouped --</mat-option>
                    @for (group of getOtherGroups(); track group.id) {
                      <mat-option [value]="group.id">{{ group.displayName }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
            </div>
            <div class="dialog-actions">
              <button mat-button (click)="closeDeleteDialog()">Cancel</button>
              <button mat-flat-button color="warn" (click)="confirmDeleteGroup()" [disabled]="deleting()">
                @if (deleting()) {
                  <mat-spinner diameter="16"></mat-spinner>
                } @else {
                  Delete
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Create Folder Dialog -->
      @if (createFolderDialogOpen()) {
        <div class="dialog-overlay" (click)="closeCreateFolderDialog()">
          <div class="rename-dialog glass-card-static" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Create New Folder</h3>
              <button mat-icon-button (click)="closeCreateFolderDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Folder Name</mat-label>
                <input matInput [(ngModel)]="newFolderName" placeholder="Enter folder name">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Display Name (optional)</mat-label>
                <input matInput [(ngModel)]="newFolderDisplayName" placeholder="Enter display name">
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button mat-button (click)="closeCreateFolderDialog()">Cancel</button>
              <button mat-flat-button color="primary" (click)="createFolder()" [disabled]="!newFolderName || creatingFolder()">
                @if (creatingFolder()) {
                  <mat-spinner diameter="16"></mat-spinner>
                } @else {
                  Create
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

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .add-folder-btn {
        width: 28px;
        height: 28px;
        color: var(--text-secondary);

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          color: var(--accent-primary);
        }
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
      transition: all 0.2s ease;
      min-height: 32px;

      &:hover {
        background: var(--glass-bg-hover);
      }

      &.drag-over {
        background: rgba(0, 212, 255, 0.2);
        border: 2px dashed var(--accent-primary);
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

      &.dragging {
        opacity: 0.4;
        transform: scale(0.95);
      }

      &[draggable="true"] {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
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
      flex-shrink: 0;

      &.online {
        background: var(--success);
        box-shadow: 0 0 8px var(--success);
      }

      &.connecting {
        background: var(--warning);
        box-shadow: 0 0 8px var(--warning);
        animation: pulse-status 1.5s ease-in-out infinite;
      }

      &.error {
        background: var(--error);
        box-shadow: 0 0 8px var(--error);
      }
    }

    @keyframes pulse-status {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
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

    .folder-actions {
      display: inline-flex;
      align-items: center;
      gap: 0;
      margin-left: 4px;
      flex-shrink: 0;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.2s, visibility 0.2s;
      height: 24px;
      vertical-align: middle;
    }

    .folder-action-btn {
      width: 24px !important;
      height: 24px !important;
      min-width: 24px !important;
      padding: 0 !important;
      line-height: 24px !important;
      flex-shrink: 0;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;

      ::ng-deep .mat-mdc-button-touch-target {
        width: 24px !important;
        height: 24px !important;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        line-height: 16px;
      }

      &.delete-btn {
        color: var(--error);
      }
    }

    .node-header:hover .folder-actions {
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

    // Delete Dialog
    .delete-dialog {
      width: 450px;
      max-width: 90vw;
      padding: 0;
      overflow: hidden;
    }

    .delete-warning {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      margin-bottom: 16px;

      .warning-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--error);
        flex-shrink: 0;
      }

      .warning-text {
        flex: 1;

        p {
          margin: 0 0 8px 0;
          color: var(--text-primary);
          font-size: 14px;

          &:last-child {
            margin-bottom: 0;
          }

          strong {
            color: var(--error);
          }
        }

        .subtext {
          font-size: 13px;
          color: var(--text-secondary);
        }
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
  private cameraGroupsService = inject(CameraGroupsService);
  private authService = inject(AuthService);
  private aiTaskService = inject(AITaskService);
  private cameraStatusService = inject(CameraStatusService);

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

  // Delete dialog state
  deleteDialogOpen = signal(false);
  deleteTarget = signal<CameraGroup | null>(null);
  deleteTargetCameraCount = signal(0);
  moveToGroupId = '';
  deleting = signal(false);

  // Create folder dialog state
  createFolderDialogOpen = signal(false);
  newFolderName = '';
  newFolderDisplayName = '';
  creatingFolder = signal(false);

  // Drag and drop state
  draggingCamera: VideoSource | null = null;
  draggingFromGroup: CameraGroup | null = null;
  dragOverGroup: string | null = null;

  // All users can manage their own personal folders
  canRenameGroups = computed(() => !!this.authService.currentUser());

  constructor(private videoSourceService: VideoSourceService) {
    // Re-build camera groups when assignments or groups change (fixes race condition)
    effect(() => {
      const assignments = this.cameraGroupsService.assignments();
      const groups = this.cameraGroupsService.groups();
      const sources = this.videoSources();
      if (sources.length > 0) {
        this.buildCameraGroups(sources);
      }
    });
  }

  ngOnInit() {
    // Load camera groups + assignments from backend first
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

  getCameraStatus(source: VideoSource): CameraStatus {
    if (this.sourceMode() === 'bmapp') {
      // For BM-APP mode, look up by task session
      const tasks = this.aiTasks();
      const task = tasks.find(t =>
        t.MediaName === source.name ||
        t.MediaName?.includes(source.name) ||
        source.name?.includes(t.MediaName)
      );
      if (task?.AlgTaskSession) {
        return this.cameraStatusService.getBmappStatus(task.AlgTaskSession.trim());
      }
    }
    // For local mode, look up by stream_name
    return this.cameraStatusService.getStatus(source.stream_name);
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
    // IMPORTANT: Trim whitespace from AlgTaskSession as BM-APP may include leading tabs/spaces
    if (task && task.AlgTaskSession) {
      const sessionTrimmed = task.AlgTaskSession.trim();
      const streamId = `task/${sessionTrimmed}`;
      console.log('[Monitor.getWsStreamId] Using task/AlgTaskSession:', streamId);
      return streamId;
    }

    // Fallback: use task/<source.name> format (trimmed)
    const nameTrimmed = source.name?.trim() || '';
    const streamId = `task/${nameTrimmed}`;
    console.log('[Monitor.getWsStreamId] Fallback to task/source.name:', streamId);
    return streamId;
  }

  /**
   * Build camera groups from video sources using per-user assignments
   * Uses assignments signal from CameraGroupsService (not source.group_id)
   */
  buildCameraGroups(sources: VideoSource[]) {
    const backendGroups = this.cameraGroupsService.groups();
    const assignments = this.cameraGroupsService.assignments();
    const groupMap = new Map<string, VideoSource[]>();
    const ungroupedCameras: VideoSource[] = [];

    // Group cameras by per-user assignment
    for (const source of sources) {
      const assignedGroupId = assignments[source.id];
      if (assignedGroupId) {
        if (!groupMap.has(assignedGroupId)) {
          groupMap.set(assignedGroupId, []);
        }
        groupMap.get(assignedGroupId)!.push(source);
      } else {
        ungroupedCameras.push(source);
      }
    }

    const groups: CameraGroup[] = [];

    // Add groups that have cameras
    groupMap.forEach((cameras, groupId) => {
      const backendGroup = backendGroups.find(g => g.id === groupId);
      if (backendGroup) {
        groups.push({
          id: backendGroup.id,
          name: backendGroup.name,
          displayName: backendGroup.display_name || backendGroup.name,
          expanded: true,
          cameras: cameras.sort((a, b) => a.name.localeCompare(b.name))
        });
      }
    });

    // Add empty groups from backend (user-created folders without cameras)
    for (const bg of backendGroups) {
      if (!groupMap.has(bg.id)) {
        groups.push({
          id: bg.id,
          name: bg.name,
          displayName: bg.display_name || bg.name,
          expanded: true,
          cameras: []
        });
      }
    }

    // Add ungrouped cameras (only if there are any)
    if (ungroupedCameras.length > 0) {
      groups.push({
        id: 'ungrouped',
        name: 'Ungrouped',
        displayName: 'Ungrouped',
        expanded: true,
        cameras: ungroupedCameras.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    // Sort groups alphabetically, put "Ungrouped" at the end
    groups.sort((a, b) => {
      if (a.id === 'ungrouped') return 1;
      if (b.id === 'ungrouped') return -1;
      return a.displayName.localeCompare(b.displayName);
    });

    this.cameraGroups.set(groups);
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
      await this.cameraGroupsService.renameGroup(group.id, this.newDisplayName);

      // Update local state
      const newName = this.newDisplayName;
      this.cameraGroups.update(groups =>
        groups.map(g => g.id === group.id ? { ...g, displayName: newName } : g)
      );

      this.closeRenameDialog();
    } catch (error: any) {
      console.error('[Monitor] Failed to rename group:', error);
      alert(error?.error?.detail || error?.message || 'Failed to rename folder. Please try again.');
    } finally {
      this.renaming.set(false);
    }
  }

  // Delete group methods
  openDeleteDialog(group: CameraGroup) {
    this.deleteTarget.set(group);
    this.deleteTargetCameraCount.set(group.cameras.length);
    this.moveToGroupId = '';
    this.deleteDialogOpen.set(true);
  }

  closeDeleteDialog() {
    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
    this.deleteTargetCameraCount.set(0);
    this.moveToGroupId = '';
  }

  getOtherGroups(): CameraGroup[] {
    const deleteTarget = this.deleteTarget();
    // Include "ungrouped" as an option for moving cameras, exclude current folder
    return this.cameraGroups().filter(g => g.id !== deleteTarget?.id);
  }

  async confirmDeleteGroup() {
    const group = this.deleteTarget();
    if (!group) return;

    if (group.id === 'ungrouped') {
      alert('Cannot delete the Ungrouped folder');
      return;
    }

    this.deleting.set(true);
    try {
      // If cameras need to be moved to another folder first
      if (this.deleteTargetCameraCount() > 0 && this.moveToGroupId && this.moveToGroupId !== '') {
        const cameraIds = group.cameras.map(c => c.id);
        if (this.moveToGroupId === 'ungrouped') {
          await this.cameraGroupsService.unassignCameras(cameraIds);
        } else {
          await this.cameraGroupsService.assignCamerasToGroup(this.moveToGroupId, cameraIds);
        }
      }

      // Delete the personal folder (backend also removes its assignments)
      await this.cameraGroupsService.deleteGroup(group.id);

      // Reload to refresh
      this.cameraGroupsService.loadGroups();
      this.loadVideoSources();

      this.closeDeleteDialog();
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      alert(error?.error?.detail || 'Failed to delete folder');
    } finally {
      this.deleting.set(false);
    }
  }

  // Create folder methods
  openCreateFolderDialog() {
    this.newFolderName = '';
    this.newFolderDisplayName = '';
    this.createFolderDialogOpen.set(true);
  }

  closeCreateFolderDialog() {
    this.createFolderDialogOpen.set(false);
    this.newFolderName = '';
    this.newFolderDisplayName = '';
  }

  async createFolder() {
    if (!this.newFolderName) return;

    this.creatingFolder.set(true);
    try {
      const result = await this.cameraGroupsService.createGroup(
        this.newFolderName,
        this.newFolderDisplayName || this.newFolderName
      );

      // Add to local state with the backend ID
      this.cameraGroups.update(groups => [...groups, {
        id: result.id,
        name: result.name,
        displayName: result.display_name || result.name,
        expanded: true,
        cameras: []
      }]);

      this.closeCreateFolderDialog();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    } finally {
      this.creatingFolder.set(false);
    }
  }

  // Drag and drop methods for moving cameras between folders
  onCameraDragStart(event: DragEvent, camera: VideoSource, fromGroup: CameraGroup) {
    this.draggingCamera = camera;
    this.draggingFromGroup = fromGroup;
    event.dataTransfer?.setData('text/plain', camera.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onCameraDragEnd(event: DragEvent) {
    this.draggingCamera = null;
    this.draggingFromGroup = null;
    this.dragOverGroup = null;
  }

  onFolderDragOver(event: DragEvent, group: CameraGroup) {
    event.preventDefault();
    // Don't allow dropping on the same folder
    if (this.draggingFromGroup?.id === group.id) return;
    this.dragOverGroup = group.id;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onFolderDragLeave(event: DragEvent) {
    this.dragOverGroup = null;
  }

  async onFolderDrop(event: DragEvent, targetGroup: CameraGroup) {
    event.preventDefault();
    this.dragOverGroup = null;

    if (!this.draggingCamera || !this.draggingFromGroup) return;
    if (this.draggingFromGroup.id === targetGroup.id) return;

    const camera = this.draggingCamera;
    const fromGroup = this.draggingFromGroup;

    try {
      // Per-user assignment: assign or unassign camera
      if (targetGroup.id === 'ungrouped') {
        await this.cameraGroupsService.unassignCameras([camera.id]);
      } else {
        await this.cameraGroupsService.assignCamerasToGroup(targetGroup.id, [camera.id]);
      }

      // Update local state
      this.cameraGroups.update(groups => {
        return groups.map(g => {
          if (g.id === fromGroup.id) {
            return { ...g, cameras: g.cameras.filter(c => c.id !== camera.id) };
          }
          if (g.id === targetGroup.id) {
            return { ...g, cameras: [...g.cameras, camera] };
          }
          return g;
        });
      });

      console.log(`[Monitor] Moved camera ${camera.name} from ${fromGroup.displayName} to ${targetGroup.displayName}`);
    } catch (error) {
      console.error('Failed to move camera:', error);
      alert('Failed to move camera to folder');
    }

    this.draggingCamera = null;
    this.draggingFromGroup = null;
  }
}
