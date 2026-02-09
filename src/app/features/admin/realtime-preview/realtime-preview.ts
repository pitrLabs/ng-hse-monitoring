import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { WsVideoPlayerComponent } from '../../../shared/components/ws-video-player/ws-video-player.component';
import { WebrtcVideoPlayerComponent } from '../../../shared/components/webrtc-video-player/webrtc-video-player.component';
import { VideoSourceService, VideoSource } from '../../../core/services/video-source.service';
import { AITaskService, AITask, ZLMStream } from '../../../core/services/ai-task.service';
import { CameraGroupsService } from '../../../core/services/camera-groups.service';
import { AuthService } from '../../../core/services/auth.service';
import { CameraStatusService } from '../../../core/services/camera-status.service';
import { AIBoxService, AIBox } from '../../../core/services/aibox.service';
// Local recording - downloads to user's computer (not server)
import { environment } from '../../../../environments/environment';

interface VideoChannel {
  id: string;
  name: string;
  status: 'online' | 'offline';
  statusLabel?: string;
  isConnecting?: boolean;
  stream: string;
  app: string;
  taskIdx?: number; // BM-APP TaskIdx for individual camera view (e.g., 0, 1, 7)
  previewChn?: string; // Channel identifier from app_preview_channel API
  // Backend VideoSource info for folder assignment
  backendId?: string; // Backend VideoSource ID for API calls
  groupId?: string | null; // group_id from backend VideoSource
  // AI Box tracking for multi-box support
  aiboxId?: string; // Which AI Box this channel belongs to
  aiboxWsUrl?: string; // WebSocket URL for this channel's AI Box
}

interface ChannelGroup {
  id: string;
  name: string;          // Original name for grouping
  displayName: string;   // Custom display name (can be renamed)
  expanded: boolean;
  channels: VideoChannel[];
  // AI Box info for grouping (which AI Box this folder belongs to)
  aiboxId?: string;
  aiboxName?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-realtime-preview',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatSelectModule, WsVideoPlayerComponent, WebrtcVideoPlayerComponent],
  template: `
    <div class="realtime-preview" #previewContainer>
      <!-- Toolbar -->
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <!-- AI Box Multi-Select (like Monitor page) -->
          <div class="aibox-tabs">
            @for (box of aiBoxes(); track box.id) {
              <label class="aibox-tab" [class.checked]="isAiBoxSelected(box.id)">
                <input type="checkbox"
                  [checked]="isAiBoxSelected(box.id)"
                  (change)="toggleAiBox(box.id)">
                <span class="aibox-status" [class.online]="box.is_online" [class.offline]="!box.is_online"></span>
                <span class="aibox-name">{{ box.name }}</span>
                <span class="aibox-code">({{ box.code }})</span>
              </label>
            }
            @if (aiBoxes().length === 0) {
              <span class="no-aibox">No AI Boxes configured</span>
            }
          </div>
          <button class="action-btn refresh-btn" (click)="loadVideoSources()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <div class="toolbar-right">
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
            <mat-icon>cast_connected</mat-icon>
            <span>AI Streams</span>
            @if (canRenameGroups()) {
              <button mat-icon-button class="add-folder-btn" matTooltip="Create folder" (click)="openCreateFolderDialog()">
                <mat-icon>create_new_folder</mat-icon>
              </button>
            }
          </div>
          <div class="device-list">
            @if (loading) {
              <div class="loading-devices">
                <mat-spinner diameter="24"></mat-spinner>
                <span>Loading...</span>
              </div>
            } @else if (channelGroups.length === 0) {
              <div class="no-devices">
                <mat-icon>videocam_off</mat-icon>
                <span>No video sources found</span>
              </div>
            } @else {
              @for (group of channelGroups; track group.id; let i = $index) {
                <!-- User Folder (no aiboxId) -->
                @if (!group.aiboxId) {
                  <div class="tree-node user-folder">
                    <div class="node-header"
                         [class.drag-over]="dragOverGroup === group.id"
                         (click)="toggleGroup(group)"
                         (dragover)="onFolderDragOver($event, group)"
                         (dragleave)="onFolderDragLeave($event)"
                         (drop)="onFolderDrop($event, group)">
                      <mat-icon class="expand-icon" [class.expanded]="group.expanded">chevron_right</mat-icon>
                      <mat-icon class="folder-icon">folder</mat-icon>
                      <span class="node-name">{{ group.displayName }}</span>
                      <span class="node-count">({{ group.channels.length }})</span>
                      @if (canRenameGroups()) {
                        <div class="folder-actions">
                          <button mat-icon-button class="folder-action-btn" matTooltip="Rename" (click)="openRenameDialog(group); $event.stopPropagation()">
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button mat-icon-button class="folder-action-btn delete-btn" matTooltip="Delete" (click)="openDeleteDialog(group); $event.stopPropagation()">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>
                    @if (group.expanded) {
                      <div class="node-children">
                        @for (channel of group.channels; track channel.id) {
                          <div class="device-item"
                               [class.online]="channel.status === 'online'"
                               [class.connecting]="channel.isConnecting"
                               [class.dragging]="draggingChannel?.id === channel.id"
                               draggable="true"
                               (dragstart)="onChannelDragStart($event, channel, group)"
                               (dragend)="onChannelDragEnd($event)"
                               (click)="selectChannel(channel)"
                               [matTooltip]="channel.statusLabel || ''">
                            <mat-icon>{{ channel.status === 'online' ? 'videocam' : channel.isConnecting ? 'sync' : 'videocam_off' }}</mat-icon>
                            <span class="device-name">{{ channel.name }}</span>
                            <span class="status-dot"
                                  [class.online]="channel.status === 'online'"
                                  [class.connecting]="channel.isConnecting"></span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <!-- AI Box Section -->
                  <div class="aibox-section">
                    <div class="aibox-separator">
                      <mat-icon class="aibox-icon">dns</mat-icon>
                      <span class="aibox-name">{{ group.aiboxName }}</span>
                      <span class="node-count">({{ group.channels.length }})</span>
                    </div>
                    <div class="aibox-cameras">
                      @for (channel of group.channels; track channel.id) {
                        <div class="device-item"
                             [class.online]="channel.status === 'online'"
                             [class.connecting]="channel.isConnecting"
                             [class.dragging]="draggingChannel?.id === channel.id"
                             draggable="true"
                             (dragstart)="onChannelDragStart($event, channel, group)"
                             (dragend)="onChannelDragEnd($event)"
                             (click)="selectChannel(channel)"
                             [matTooltip]="channel.statusLabel || ''">
                          <mat-icon>{{ channel.status === 'online' ? 'videocam' : channel.isConnecting ? 'sync' : 'videocam_off' }}</mat-icon>
                          <span class="device-name">{{ channel.name }}</span>
                          <span class="status-dot"
                                [class.online]="channel.status === 'online'"
                                [class.connecting]="channel.isConnecting"></span>
                        </div>
                      }
                    </div>
                  </div>
                }
              }
            }
          </div>
        </div>

        <!-- Video Grid -->
        <div class="video-grid-wrapper">
          <div class="video-grid" [class]="'grid-' + gridLayout">
            @for (slot of getGridSlots(); track slot; let i = $index) {
              <div class="video-slot">
                @if (getChannelForSlot(i); as channel) {
                  <div class="video-container">
                    <app-ws-video-player
                      [stream]="getWsStreamId(channel)"
                      [mediaName]="channel.name"
                      [wsBaseUrl]="getChannelWsUrl(channel)"
                      [showControls]="true"
                      [showFps]="false"
                      [useSharedService]="false">
                    </app-ws-video-player>
                    <div class="video-overlay-controls">
                      <!-- Recording button -->
                      <button mat-icon-button
                              [matTooltip]="isRecording(channel) ? 'Stop Recording' : 'Start Recording'"
                              [class.recording]="isRecording(channel)"
                              (click)="toggleRecording(channel); $event.stopPropagation()">
                        <mat-icon>{{ isRecording(channel) ? 'stop_circle' : 'fiber_manual_record' }}</mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Close" (click)="removeFromSlot(i)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                    <!-- Recording indicator -->
                    @if (isRecording(channel)) {
                      <div class="recording-indicator">
                        <span class="rec-dot"></span>
                        <span class="rec-text">REC</span>
                        <span class="rec-time">{{ getRecordingTime(channel) }}</span>
                      </div>
                    }
                    <div class="video-info">
                      <span class="status-indicator" [class.online]="channel.status === 'online'"></span>
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

          <!-- Pagination for 4x4 grid -->
          @if (showPagination) {
            <div class="pagination-bar">
              <button mat-icon-button [disabled]="currentPage === 1" (click)="previousPage()" matTooltip="Previous Page">
                <mat-icon>chevron_left</mat-icon>
              </button>
              @for (page of pageNumbers; track page) {
                <button mat-button
                  class="page-btn"
                  [class.active]="page === currentPage"
                  (click)="goToPage(page)">
                  {{ page }}
                </button>
              }
              <button mat-icon-button [disabled]="currentPage === totalPages" (click)="nextPage()" matTooltip="Next Page">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Rename Dialog -->
      @if (renameDialogOpen) {
        <div class="dialog-overlay" (click)="closeRenameDialog()">
          <div class="rename-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Rename Folder</h3>
              <button mat-icon-button (click)="closeRenameDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <div class="current-name">
                <label>Original Name</label>
                <span>{{ renameTarget?.name }}</span>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Display Name</mat-label>
                <input matInput [(ngModel)]="newDisplayName" placeholder="Enter new display name">
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button mat-button (click)="closeRenameDialog()">Cancel</button>
              <button mat-flat-button color="primary" (click)="saveGroupRename()" [disabled]="!newDisplayName || renaming">
                @if (renaming) {
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
      @if (deleteDialogOpen) {
        <div class="dialog-overlay" (click)="closeDeleteDialog()">
          <div class="delete-dialog" (click)="$event.stopPropagation()">
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
                  @if (deleteTargetCameraCount === 0) {
                    <p>Are you sure you want to delete folder "<strong>{{ deleteTarget?.displayName }}</strong>"?</p>
                    <p class="subtext">This folder is empty and can be deleted safely.</p>
                  } @else {
                    <p>Folder "<strong>{{ deleteTarget?.displayName }}</strong>" contains <strong>{{ deleteTargetCameraCount }} cameras</strong>.</p>
                    <p class="subtext">Please move the cameras to another folder first, or select a target folder below.</p>
                  }
                </div>
              </div>

              @if (deleteTargetCameraCount > 0) {
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
              <button mat-flat-button color="warn" (click)="confirmDeleteGroup()" [disabled]="deleting">
                @if (deleting) {
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
      @if (createFolderDialogOpen) {
        <div class="dialog-overlay" (click)="closeCreateFolderDialog()">
          <div class="rename-dialog" (click)="$event.stopPropagation()">
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
              <button mat-flat-button color="primary" (click)="createFolder()" [disabled]="!newFolderName || creatingFolder">
                @if (creatingFolder) {
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

    .aibox-tabs {
      display: flex;
      align-items: center;
      gap: 8px;

      .aibox-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm, 6px);
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;

        input[type="checkbox"] {
          display: none;
        }

        &:hover {
          background: var(--glass-bg-hover);
          border-color: var(--accent-primary);
        }

        &.checked {
          background: rgba(0, 212, 255, 0.15);
          border-color: var(--accent-primary);
        }

        .aibox-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--status-offline, #ef4444);

          &.online {
            background: var(--status-online, #22c55e);
          }

          &.offline {
            background: var(--status-offline, #ef4444);
          }
        }

        .aibox-name {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .aibox-code {
          font-size: 11px;
          color: var(--text-tertiary);
        }
      }

      .no-aibox {
        font-size: 13px;
        color: var(--text-muted);
        padding: 6px 12px;
      }
    }

    .source-label, .mode-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--accent-primary);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 500;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--accent-primary);
      }
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
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
      background: rgba(0, 0, 0, 0.1);

      mat-icon {
        color: var(--accent-primary);
      }

      span {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
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
    }

    .device-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .tree-node {
      margin-bottom: 2px;
    }

    .aibox-section {
      margin-bottom: 8px;
    }

    .aibox-separator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      margin: 8px 0 4px 0;
      background: rgba(0, 212, 255, 0.08);
      border-left: 3px solid var(--accent-primary, #00d4ff);
      border-radius: 0 6px 6px 0;

      .aibox-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary, #00d4ff);
      }

      .aibox-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: 0.3px;
        flex: 1;
      }

      .node-count {
        font-size: 11px;
        color: var(--text-muted);
      }

      &:first-child {
        margin-top: 0;
      }
    }

    .aibox-cameras {
      padding-left: 8px;
    }

    .user-folder {
      margin-bottom: 4px;
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      min-height: 32px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 212, 255, 0.1);
      }

      &.drag-over {
        background: rgba(0, 212, 255, 0.2);
        border: 2px dashed var(--accent-primary, #00d4ff);
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
      color: #f59e0b;
      flex-shrink: 0;
    }

    .aibox-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      min-width: 16px;
      color: var(--accent-primary, #00d4ff);
      flex-shrink: 0;
    }

    .aibox-header {
      background: rgba(0, 212, 255, 0.05);
      border-left: 2px solid var(--accent-primary, #00d4ff);
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
      cursor: grab;
      transition: all 0.2s ease;

      &:active {
        cursor: grabbing;
      }

      &.dragging {
        opacity: 0.4;
        transform: scale(0.95);
      }

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
        background: #6b7280; /* Gray - offline */

        &.online {
          background: #22c55e; /* Green - healthy/streaming */
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        &.connecting {
          background: #3b82f6; /* Blue - connecting */
          box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
          animation: pulse-connecting 1.5s infinite;
        }

        &.error {
          background: #f59e0b; /* Orange - connection error */
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
        }
      }

      @keyframes pulse-connecting {
        0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
        50% { opacity: 0.5; box-shadow: none; }
      }

      .device-item.connecting mat-icon {
        color: #3b82f6; /* Blue - connecting */
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

    .video-overlay-controls button.recording {
      background: rgba(239, 68, 68, 0.9);
      mat-icon {
        color: white;
        animation: pulse-recording 1s infinite;
      }
    }

    @keyframes pulse-recording {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .recording-indicator {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.9);
      border-radius: 4px;
      z-index: 20;

      .rec-dot {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: pulse-recording 1s infinite;
      }

      .rec-text {
        font-size: 11px;
        font-weight: 700;
        color: white;
        letter-spacing: 1px;
      }

      .rec-time {
        font-size: 11px;
        font-weight: 600;
        color: white;
        font-family: monospace;
      }
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

    .video-grid-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 12px 16px;
      background: var(--glass-bg);
      border-radius: 0 0 12px 12px;
      border: 1px solid var(--glass-border);
      border-top: none;
      margin-top: -1px;
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
        color: var(--error, #ef4444);
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
      background: var(--glass-bg, rgba(20, 20, 35, 0.95));
      border: 1px solid var(--glass-border);
      border-radius: 12px;
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

    .delete-dialog {
      width: 450px;
      max-width: 90vw;
      background: var(--glass-bg, rgba(20, 20, 35, 0.95));
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .delete-warning {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      margin-bottom: 16px;

      .warning-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--error, #ef4444);
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
            color: var(--error, #ef4444);
          }
        }

        .subtext {
          font-size: 13px;
          color: var(--text-secondary);
        }
      }
    }
  `]
})
export class AdminRealtimePreviewComponent implements OnInit, OnDestroy {
  private cameraGroupsService = inject(CameraGroupsService);
  private authService = inject(AuthService);
  private cameraStatusService = inject(CameraStatusService);
  private aiBoxService = inject(AIBoxService);
  // Local recording state (client-side, downloads to user's computer)
  private localRecordings = new Map<string, {
    mediaRecorder: MediaRecorder;
    chunks: Blob[];
    startTime: Date;
    channelName: string;
    autoStopTimer: any;
    frameInterval?: any;  // Interval for capturing img frames to canvas
  }>();
  private readonly MAX_RECORDING_SECONDS = 600; // 10 minutes auto-stop

  @ViewChild('previewContainer') previewContainer!: ElementRef<HTMLElement>;

  gridLayout: '1x1' | '2x2' | '3x3' | '4x4' = '2x2';
  loading = false;
  sourceMode = 'direct'; // Always use Direct AI mode
  playerMode = 'ws'; // Always use WebSocket JPEG
  isFullscreen = false;

  // Pagination for 4x4 grid
  currentPage = 1;
  itemsPerPage = 16;

  // Rename dialog state
  renameDialogOpen = false;
  renameTarget: ChannelGroup | null = null;
  newDisplayName = '';
  renaming = false;

  // Delete dialog state
  deleteDialogOpen = false;
  deleteTarget: ChannelGroup | null = null;
  deleteTargetCameraCount = 0;
  moveToGroupId = '';
  deleting = false;

  // Create folder dialog state
  createFolderDialogOpen = false;
  newFolderName = '';
  newFolderDisplayName = '';
  creatingFolder = false;

  // Drag and drop state
  draggingChannel: VideoChannel | null = null;
  draggingFromGroup: ChannelGroup | null = null;
  dragOverGroup: string | null = null;

  // All users can manage their own personal folders
  canRenameGroups = computed(() => !!this.authService.currentUser());

  // AI Box multi-selection (like Monitor page)
  aiBoxes = this.aiBoxService.aiBoxes;
  selectedAiBoxIds = signal<Set<string>>(new Set());

  private fullscreenChangeHandler = () => this.onFullscreenChange();
  private recordingTimerInterval: any = null;

  videoChannels: VideoChannel[] = [];
  channelGroups: ChannelGroup[] = [];
  gridSlots: (VideoChannel | null)[] = [];

  // Shared service mode for multi-grid view
  // BM-APP limitation: only 1 stream active at a time on video WebSocket
  // We use time-division cycling to show multiple streams
  useSharedServiceMode = signal(false);

  private bmappUrl = environment.bmappUrl;
  // Use proxy in development to bypass CORS (fallback)
  private bmappProxyUrl = '/bmapp-api';

  // Get API base URL for a specific AI Box
  private getApiBaseUrlForBox(boxId: string): string {
    const box = this.aiBoxes().find(b => b.id === boxId);
    if (box?.api_url) {
      // Return the AI Box API URL (e.g., "http://192.168.1.100:2323/api")
      // Strip trailing /api if present since we add it in the calls
      let url = box.api_url;
      if (url.endsWith('/api')) {
        url = url.slice(0, -4);
      }
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      return url;
    }
    // Fallback to proxy
    return this.bmappProxyUrl;
  }

  // Get WebSocket URL for a specific AI Box
  getWsUrlForBox(boxId: string): string {
    const box = this.aiBoxes().find(b => b.id === boxId);
    return box?.stream_ws_url || '';
  }

  // Get WebSocket URL for a channel (uses channel's aiboxWsUrl)
  getChannelWsUrl(channel: VideoChannel): string {
    return channel.aiboxWsUrl || '';
  }

  // Check if AI Box is selected
  isAiBoxSelected(id: string): boolean {
    return this.selectedAiBoxIds().has(id);
  }

  // Toggle AI Box selection
  toggleAiBox(id: string) {
    const current = this.selectedAiBoxIds();
    const newSet = new Set(current);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this.selectedAiBoxIds.set(newSet);
    // Reload video sources from selected AI Boxes
    this.loadVideoSources();
  }

  constructor(
    private http: HttpClient,
    private videoSourceService: VideoSourceService,
    private aiTaskService: AITaskService
  ) {
    // Re-build channel groups when assignments or groups change (fixes race condition)
    // Re-build channel groups when assignments, groups, or aiBoxes change
    effect(() => {
      const assignments = this.cameraGroupsService.assignments();
      const groups = this.cameraGroupsService.groups();
      const boxes = this.aiBoxes(); // Trigger rebuild when aiBoxes load
      if (this.videoChannels.length > 0) {
        this.buildChannelGroups();
      }
    });
  }

  ngOnInit() {
    // Load camera groups + assignments from backend first
    this.cameraGroupsService.loadGroups();
    // Load AI boxes and auto-select ALL by default
    this.aiBoxService.loadAiBoxes().subscribe({
      next: (boxes) => {
        if (boxes.length > 0) {
          // Auto-select ALL AI Boxes by default
          const allIds = new Set(boxes.map(b => b.id));
          this.selectedAiBoxIds.set(allIds);
        }
        // Fetch real-time health status for accurate online/offline coloring
        this.aiBoxService.getHealth().subscribe({
          next: () => this.loadVideoSources(),
          error: () => this.loadVideoSources()
        });
      },
      error: () => {
        // Fallback - load with proxy
        this.loadVideoSources();
      }
    });
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);

    // Start timer to update recording elapsed time display
    this.recordingTimerInterval = setInterval(() => {
      // Force change detection for recording time updates
      // This is needed because getRecordingTime() returns a new value each second
    }, 1000);
  }

  ngOnDestroy() {
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
    }
    // Stop all active recordings
    this.localRecordings.forEach((recording, streamId) => {
      if (recording.autoStopTimer) {
        clearTimeout(recording.autoStopTimer);
      }
      if (recording.mediaRecorder.state !== 'inactive') {
        recording.mediaRecorder.stop();
      }
    });
    this.localRecordings.clear();
  }

  loadVideoSources() {
    this.loading = true;
    this.loadDirectFromBmapp();
  }

  // Store preview channel mapping per AI Box (aiboxId -> (task name -> url))
  private previewChannelMaps = new Map<string, Map<string, string>>();

  // Store allowed camera names for filtering (based on user assignment)
  private allowedCameraNames = new Set<string>();
  // Track if we successfully got camera assignments from backend
  // If true + empty allowedCameraNames = user has no cameras assigned (show nothing)
  // If false = backend failed, don't filter (superuser/admin sees all)
  private hasAssignmentData = false;

  // Store backend VideoSource records for group_id mapping
  // Key: camera name (stream_name or name), Value: VideoSource with group_id
  private backendVideoSourceMap = new Map<string, VideoSource>();

  // Pending load count for multi-AI Box loading
  private pendingLoads = 0;
  private allChannels: VideoChannel[] = [];

  // Direct query to BM-APP API via proxy
  // Now supports loading from MULTIPLE AI Boxes
  loadDirectFromBmapp() {
    console.log('Loading from BM-APP (multi-AI Box mode)...');

    // First, load user's assigned cameras from backend to filter BM-APP results
    // Also store full VideoSource records to get group_id for folder assignment
    this.videoSourceService.getAll(true).subscribe({
      next: (sources) => {
        // Build set of allowed camera names (stream_name matches MediaName in BM-APP)
        this.allowedCameraNames.clear();
        this.backendVideoSourceMap.clear();
        this.hasAssignmentData = true; // Backend responded successfully
        sources.forEach(s => {
          this.allowedCameraNames.add(s.stream_name);
          this.allowedCameraNames.add(s.name);
          // Store VideoSource by both stream_name and name for matching
          this.backendVideoSourceMap.set(s.stream_name, s);
          this.backendVideoSourceMap.set(s.name, s);
        });
        console.log('Allowed cameras for user:', Array.from(this.allowedCameraNames));
        console.log('Has assignment data:', this.hasAssignmentData, 'Count:', this.allowedCameraNames.size);

        // Now fetch from ALL selected AI Boxes
        this.fetchFromAllAiBoxes();
      },
      error: (err) => {
        console.error('Failed to load assigned cameras:', err);
        // If backend fails, proceed without filtering (for superusers/admins)
        this.allowedCameraNames.clear();
        this.backendVideoSourceMap.clear();
        this.hasAssignmentData = false;
        this.fetchFromAllAiBoxes();
      }
    });
  }

  // Fetch channels from ALL selected AI Boxes
  private fetchFromAllAiBoxes() {
    const selectedIds = Array.from(this.selectedAiBoxIds());

    if (selectedIds.length === 0) {
      console.log('No AI Boxes selected');
      this.videoChannels = [];
      this.initializeGrid();
      this.loading = false;
      return;
    }

    console.log(`Fetching from ${selectedIds.length} AI Boxes:`, selectedIds);

    // Reset state
    this.previewChannelMaps.clear();
    this.allChannels = [];
    this.pendingLoads = selectedIds.length;

    // Fetch from each AI Box
    selectedIds.forEach(boxId => {
      this.fetchPreviewChannelsForBox(boxId);
    });
  }

  // Fetch preview channels for a specific AI Box
  private fetchPreviewChannelsForBox(boxId: string) {
    const apiUrl = this.getApiBaseUrlForBox(boxId);
    const wsUrl = this.getWsUrlForBox(boxId);
    const previewUrl = `${apiUrl}/api/app_preview_channel`;

    console.log(`[${boxId}] Fetching preview channels from ${previewUrl}`);

    this.http.post<any>(previewUrl, {}).subscribe({
      next: (res) => {
        // Build a map of task name -> url from preview channels for this AI Box
        const channelMap = new Map<string, string>();

        if (res.Content && Array.isArray(res.Content)) {
          res.Content.forEach((group: any) => {
            if (group.chn && Array.isArray(group.chn)) {
              group.chn.forEach((chn: any) => {
                if (chn.task && chn.url) {
                  channelMap.set(chn.task.trim(), chn.url);
                }
                if (chn.name && chn.url && chn.name !== chn.task) {
                  channelMap.set(chn.name.trim(), chn.url);
                }
              });
            }
          });
        }

        this.previewChannelMaps.set(boxId, channelMap);
        console.log(`[${boxId}] Preview channel map size:`, channelMap.size);

        // Now load tasks for this AI Box
        this.loadTasksForBox(boxId, wsUrl);
      },
      error: (err) => {
        console.log(`[${boxId}] Preview channels fetch failed:`, err.message);
        // Still try to load tasks without preview channel mapping
        this.previewChannelMaps.set(boxId, new Map());
        this.loadTasksForBox(boxId, wsUrl);
      }
    });
  }

  // Load tasks for a specific AI Box
  private loadTasksForBox(boxId: string, wsUrl: string) {
    const apiUrl = this.getApiBaseUrlForBox(boxId);
    const taskUrl = `${apiUrl}/api/alg_task_fetch`;
    const previewChannelMap = this.previewChannelMaps.get(boxId) || new Map();
    const boxName = this.aiBoxes().find(b => b.id === boxId)?.name || boxId;

    console.log(`[${boxId}] Fetching tasks from ${taskUrl}`);

    this.http.post<any>(taskUrl, {}).subscribe({
      next: (res) => {
        console.log(`[${boxId}] Task fetch response:`, res);
        if (res.Result?.Code === 0 && res.Content) {
          let tasks = res.Content;

          // Filter tasks based on user's assigned cameras
          if (this.hasAssignmentData) {
            if (this.allowedCameraNames.size === 0) {
              tasks = [];
            } else {
              tasks = tasks.filter((t: any) => {
                const mediaName = t.MediaName?.trim();
                const session = t.AlgTaskSession?.trim();
                return this.allowedCameraNames.has(mediaName) ||
                       this.allowedCameraNames.has(session);
              });
            }
          }

          const channels: VideoChannel[] = tasks.map((t: any, index: number) => {
            const statusType = t.AlgTaskStatus?.type;
            const isOnline = statusType === 4;
            const isConnecting = statusType === 1;

            const sessionTrimmed = t.AlgTaskSession?.trim();
            let previewChn = previewChannelMap.get(sessionTrimmed);

            if (!previewChn && t.MediaName) {
              previewChn = previewChannelMap.get(t.MediaName.trim());
            }

            if (!previewChn && sessionTrimmed) {
              previewChn = `task/${sessionTrimmed}`;
            }

            const mediaName = t.MediaName?.trim();
            const backendSource = this.backendVideoSourceMap.get(mediaName) ||
                                  this.backendVideoSourceMap.get(sessionTrimmed);

            return {
              id: `${boxId}_${sessionTrimmed || t.AlgTaskSession}`, // Unique ID per AI Box
              name: mediaName || sessionTrimmed || t.AlgTaskSession,
              status: isOnline ? 'online' : 'offline',
              statusLabel: t.AlgTaskStatus?.label || 'Unknown',
              isConnecting,
              stream: sessionTrimmed || t.AlgTaskSession?.trim(),
              app: 'live',
              taskIdx: t.TaskIdx,
              previewChn: previewChn,
              backendId: backendSource?.id || undefined,
              groupId: backendSource?.group_id || null,
              // AI Box tracking
              aiboxId: boxId,
              aiboxWsUrl: wsUrl
            } as VideoChannel;
          });

          console.log(`[${boxId}] Loaded ${channels.length} channels`);
          this.allChannels.push(...channels);
        }

        this.onBoxLoadComplete(boxId);
      },
      error: (err) => {
        console.error(`[${boxId}] Task fetch failed:`, err);
        // Try fallback to media fetch for this box
        this.loadMediaForBox(boxId, wsUrl);
      }
    });
  }

  // Called when one AI Box finishes loading
  private onBoxLoadComplete(boxId: string) {
    this.pendingLoads--;
    console.log(`[${boxId}] Load complete. Pending: ${this.pendingLoads}`);

    if (this.pendingLoads <= 0) {
      // All boxes loaded - merge results
      this.videoChannels = this.allChannels;
      console.log(`All AI Boxes loaded. Total channels: ${this.videoChannels.length}`);
      this.initializeGrid();
      this.loading = false;
    }
  }

  // Fallback: Get media/cameras from a specific AI Box
  private loadMediaForBox(boxId: string, wsUrl: string) {
    const apiUrl = this.getApiBaseUrlForBox(boxId);
    console.log(`[${boxId}] Trying BM-APP media fetch...`);
    const mediaUrl = `${apiUrl}/api/alg_media_fetch`;

    this.http.post<any>(mediaUrl, {}).subscribe({
      next: (res) => {
        console.log(`[${boxId}] Media fetch response:`, res);
        if (res.Result?.Code === 0 && res.Content) {
          let mediaList = res.Content;

          // Filter media based on user's assigned cameras
          if (this.hasAssignmentData) {
            if (this.allowedCameraNames.size === 0) {
              mediaList = [];
            } else {
              mediaList = mediaList.filter((m: any) => {
                const mediaName = m.MediaName?.trim();
                return this.allowedCameraNames.has(mediaName);
              });
              console.log(`[${boxId}] Filtered to ${mediaList.length} media`);
            }
          }

          const channels: VideoChannel[] = mediaList.map((m: any) => {
            // MediaStatus types: 0=Offline, 2=Online
            const statusType = m.MediaStatus?.type;
            const isOnline = statusType === 2;
            const mediaName = m.MediaName?.trim();
            const backendSource = this.backendVideoSourceMap.get(mediaName);

            return {
              id: `${boxId}_${m.MediaName}`,
              name: mediaName || m.MediaName,
              status: isOnline ? 'online' : 'offline',
              statusLabel: m.MediaStatus?.label || 'Unknown',
              stream: m.MediaName,
              app: 'live',
              backendId: backendSource?.id || undefined,
              groupId: backendSource?.group_id || null,
              // AI Box tracking
              aiboxId: boxId,
              aiboxWsUrl: wsUrl
            } as VideoChannel;
          });

          console.log(`[${boxId}] Loaded ${channels.length} media channels`);
          this.allChannels.push(...channels);
        }

        this.onBoxLoadComplete(boxId);
      },
      error: (err) => {
        console.error(`[${boxId}] Media fetch failed:`, err);
        // Mark this box as complete even if failed
        this.onBoxLoadComplete(boxId);
      }
    });
  }

  loadFromBackend() {
    // First load backend video sources for group_id mapping
    this.videoSourceService.getAll(true).subscribe({
      next: (sources) => {
        this.backendVideoSourceMap.clear();
        sources.forEach(s => {
          this.backendVideoSourceMap.set(s.stream_name, s);
          this.backendVideoSourceMap.set(s.name, s);
        });

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
            this.loading = false;
          }
        });
      },
      error: () => {
        // Proceed without group mapping
        this.aiTaskService.getTasks().subscribe({
          next: (tasks) => {
            this.processBmappData(tasks, []);
          },
          error: (err) => {
            console.error('Failed to load from backend:', err);
            this.loading = false;
          }
        });
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

      // Try to match with backend VideoSource for group_id
      const mediaName = t.MediaName?.trim();
      const backendSource = this.backendVideoSourceMap.get(mediaName) ||
                            this.backendVideoSourceMap.get(t.AlgTaskSession?.trim());

      return {
        id: t.AlgTaskSession,
        name: t.MediaName,
        status: (isHealthy && streamAvailable) ? 'online' : 'offline',
        statusLabel: t.AlgTaskStatus?.label || 'Unknown',
        isConnecting,
        stream: streamName,
        app: 'live',
        taskIdx: t.TaskIdx,
        backendId: backendSource?.id || undefined,
        groupId: backendSource?.group_id || null
      };
    });

    streams.forEach(s => {
      const hasTask = tasks.some(t => t.MediaName === s.stream || t.AlgTaskSession === s.stream);
      if (!hasTask && s.app === 'live') {
        const backendSource = this.backendVideoSourceMap.get(s.stream);
        this.videoChannels.push({
          id: s.stream,
          name: `${s.stream} (raw)`,
          status: 'online',
          stream: s.stream,
          app: s.app,
          backendId: backendSource?.id || undefined,
          groupId: backendSource?.group_id || null
        });
      }
    });

    this.initializeGrid();
    this.loading = false;
  }

  loadFromLocal() {
    this.videoSourceService.getAll(true).subscribe({
      next: (sources) => {
        this.videoChannels = sources.map(s => {
          // Use real-time status from CameraStatusService if available, fallback to is_active
          const realStatus = this.cameraStatusService.getStatus(s.stream_name);
          return {
            id: s.id,
            name: s.name,
            status: realStatus === 'online' ? 'online' : (s.is_active ? 'online' : 'offline'),
            isConnecting: realStatus === 'connecting',
            stream: s.stream_name,
            app: 'live',
            backendId: s.id,
            groupId: s.group_id || null
          };
        });
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
    // Start with empty grid - user manually selects which cameras to display
    this.gridSlots = Array(totalSlots).fill(null);

    // Update shared service mode based on active streams
    this.updateSharedServiceMode();

    // Build channel groups for folder structure
    this.buildChannelGroups();
  }

  /**
   * Build channel groups with structure:
   * 1. User-created folders (at top, outside AI Boxes)
   * 2. AI Box sections with cameras directly (no "Ungrouped" folder)
   */
  buildChannelGroups() {
    const groups: ChannelGroup[] = [];
    const backendGroups = this.cameraGroupsService.groups();
    const assignments = this.cameraGroupsService.assignments();

    // Build group lookup map
    const groupLookup = new Map<string, { name: string; displayName: string }>();
    for (const g of backendGroups) {
      groupLookup.set(g.id, { name: g.name, displayName: g.display_name || g.name });
    }

    // Separate channels into: assigned to folders vs unassigned (per AI Box)
    const folderChannelsMap = new Map<string, VideoChannel[]>(); // folderId -> channels
    const aiboxChannelsMap = new Map<string, VideoChannel[]>(); // aiboxId -> unassigned channels

    for (const channel of this.videoChannels) {
      const aiboxId = channel.aiboxId || 'unknown';

      // Check if this channel has a folder assignment
      let assignedFolderId: string | null = null;

      if (channel.backendId) {
        const groupId = assignments[channel.backendId];
        if (groupId && groupLookup.has(groupId)) {
          assignedFolderId = groupId;
        }
      }

      // Fallback to channel.groupId
      if (!assignedFolderId && channel.groupId && groupLookup.has(channel.groupId)) {
        assignedFolderId = channel.groupId;
      }

      if (assignedFolderId) {
        // Channel is assigned to a user folder
        if (!folderChannelsMap.has(assignedFolderId)) {
          folderChannelsMap.set(assignedFolderId, []);
        }
        folderChannelsMap.get(assignedFolderId)!.push({
          ...channel,
          aiboxId,
          aiboxWsUrl: channel.aiboxWsUrl
        });
      } else {
        // Channel is not assigned - goes under AI Box directly
        if (!aiboxChannelsMap.has(aiboxId)) {
          aiboxChannelsMap.set(aiboxId, []);
        }
        aiboxChannelsMap.get(aiboxId)!.push({
          ...channel,
          aiboxId,
          aiboxWsUrl: channel.aiboxWsUrl
        });
      }
    }

    // 1. Add user-created folders at top (aiboxId = null to show without AI Box header)
    folderChannelsMap.forEach((channels, folderId) => {
      const groupInfo = groupLookup.get(folderId);
      if (groupInfo) {
        groups.push({
          id: folderId,
          name: groupInfo.name,
          displayName: groupInfo.displayName,
          expanded: true,
          channels: channels.sort((a, b) => a.name.localeCompare(b.name)),
          aiboxId: undefined, // No AI Box - these are user folders
          aiboxName: undefined
        });
      }
    });

    // Also add empty user-created folders (so they appear in the list)
    for (const g of backendGroups) {
      if (!folderChannelsMap.has(g.id)) {
        groups.push({
          id: g.id,
          name: g.name,
          displayName: g.display_name || g.name,
          expanded: true,
          channels: [],
          aiboxId: undefined,
          aiboxName: undefined
        });
      }
    }

    // 2. Add AI Box sections with unassigned cameras
    aiboxChannelsMap.forEach((channels, aiboxId) => {
      const aibox = this.aiBoxes().find(b => b.id === aiboxId);
      const aiboxName = aibox ? `${aibox.name} (${aibox.code})` : 'Unknown AI Box';

      groups.push({
        id: `aibox_${aiboxId}`, // Special ID for AI Box direct cameras
        name: aiboxName,
        displayName: aiboxName,
        expanded: true,
        channels: channels.sort((a, b) => a.name.localeCompare(b.name)),
        aiboxId,
        aiboxName
      });
    });

    // Sort: user folders first (alphabetically), then AI Box groups (alphabetically)
    groups.sort((a, b) => {
      const aIsUserFolder = !a.aiboxId;
      const bIsUserFolder = !b.aiboxId;

      // User folders come first
      if (aIsUserFolder && !bIsUserFolder) return -1;
      if (!aIsUserFolder && bIsUserFolder) return 1;

      // Within same category, sort alphabetically
      return a.displayName.localeCompare(b.displayName);
    });

    this.channelGroups = groups;
  }

  toggleGroup(group: ChannelGroup) {
    group.expanded = !group.expanded;
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
    this.currentPage = 1; // Reset to first page when changing layout
    this.initializeGrid();
  }

  selectChannel(channel: VideoChannel) {
    const emptyIndex = this.gridSlots.findIndex(slot => slot === null);
    if (emptyIndex !== -1) {
      this.gridSlots[emptyIndex] = channel;
      this.updateSharedServiceMode();
    }
  }

  getChannelForSlot(index: number): VideoChannel | null {
    return this.gridSlots[index] || null;
  }

  removeFromSlot(index: number) {
    this.gridSlots[index] = null;
    this.updateSharedServiceMode();
  }

  // Get WebSocket stream ID for BM-APP video WebSocket
  // Correct format from app_preview_channel API:
  // - Individual camera: "task/<AlgTaskSession>" (e.g., "task/DCC1-HARKP3_KOPER03")
  // - Mosaic view: "group/<number>" (e.g., "group/1")
  getWsStreamId(channel: VideoChannel): string {
    // DEBUG: Log channel info
    console.log('[getWsStreamId] Channel:', {
      name: channel.name,
      stream: channel.stream,
      taskIdx: channel.taskIdx,
      previewChn: channel.previewChn,
      app: channel.app
    });

    // Priority 1: Use previewChn which contains the correct "task/XXX" format
    // IMPORTANT: Trim whitespace as BM-APP may include leading tabs/spaces in AlgTaskSession
    if (channel.previewChn) {
      const trimmed = channel.previewChn.trim();
      console.log('[getWsStreamId] Using previewChn:', trimmed);
      return trimmed;
    }

    // Priority 2: Construct "task/<AlgTaskSession>" format if stream available
    if (channel.stream) {
      const streamTrimmed = channel.stream.trim();
      const streamId = `task/${streamTrimmed}`;
      console.log('[getWsStreamId] Constructed task/stream:', streamId);
      return streamId;
    }

    // Priority 3: Use MediaName with task/ prefix
    if (channel.name) {
      const nameTrimmed = channel.name.trim();
      const streamId = `task/${nameTrimmed}`;
      console.log('[getWsStreamId] Constructed task/name:', streamId);
      return streamId;
    }

    return '';
  }

  /**
   * Get WebRTC URL for a channel.
   * Uses the AI Box's stream_ws_url as base and constructs the WebRTC endpoint.
   * Format: http://host:port/webrtc
   */
  getWebrtcUrl(channel: VideoChannel): string {
    // Get WebRTC URL from AI Box configuration
    if (channel.aiboxWsUrl) {
      // Convert ws:// to http:// and append /webrtc path
      let baseUrl = channel.aiboxWsUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://');

      // Remove any trailing paths like /video/
      const urlParts = baseUrl.split('/');
      if (urlParts.length > 3) {
        baseUrl = urlParts.slice(0, 3).join('/');
      }

      return `${baseUrl}/webrtc`;
    }

    // Fallback to environment bmappUrl
    return `${this.bmappUrl}/webrtc`;
  }

  // ========== Local Recording Methods (Download to User's Computer) ==========

  /**
   * Check if a channel is currently being recorded locally
   */
  isRecording(channel: VideoChannel): boolean {
    const streamId = this.getWsStreamId(channel);
    return this.localRecordings.has(streamId);
  }

  /**
   * Toggle local recording for a channel
   * Recording is saved to user's local computer when stopped
   */
  async toggleRecording(channel: VideoChannel): Promise<void> {
    const streamId = this.getWsStreamId(channel);
    if (!streamId) {
      console.error('Cannot record: no stream ID');
      return;
    }

    if (this.isRecording(channel)) {
      this.stopLocalRecording(streamId);
    } else {
      this.startLocalRecording(channel, streamId);
    }
  }

  /**
   * Start local recording - captures video frames and records to blob
   * Uses canvas to capture img element frames from ws-video-player
   */
  private startLocalRecording(channel: VideoChannel, streamId: string): void {
    // Find the video element for this channel
    const slotIndex = this.gridSlots.findIndex(s => s?.id === channel.id);
    if (slotIndex === -1) {
      alert('Please add the camera to a video slot first before recording');
      return;
    }

    // Get the video element from webrtc-video-player or ws-video-player
    const videoSlots = document.querySelectorAll('.video-slot');
    const slot = videoSlots[slotIndex];
    // Try WebRTC video element first, fallback to WS player img
    const videoElement = slot?.querySelector('app-webrtc-video-player video.stream-video') as HTMLVideoElement;
    const imgElement = slot?.querySelector('app-ws-video-player img.stream-frame') as HTMLImageElement;

    // Check if we have a valid source
    const hasVideoSource = videoElement && videoElement.srcObject;
    const hasImgSource = imgElement && imgElement.src && imgElement.style.display !== 'none';

    if (!hasVideoSource && !hasImgSource) {
      alert('Cannot start recording: video not loaded or not playing');
      return;
    }

    try {
      let stream: MediaStream;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        alert('Cannot start recording: canvas not supported');
        return;
      }

      if (hasVideoSource && videoElement) {
        // WebRTC: Get stream directly from video element
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        stream = canvas.captureStream(24);

        // Draw video frames to canvas
        const drawVideoFrame = () => {
          if (videoElement.readyState >= 2) {
            if (canvas.width !== videoElement.videoWidth && videoElement.videoWidth > 0) {
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
            }
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          }
        };

        // Start drawing frames
        const videoFrameInterval = setInterval(drawVideoFrame, 1000 / 24);

        // Store interval for cleanup
        (stream as any)._videoFrameInterval = videoFrameInterval;
      } else if (hasImgSource && imgElement) {
        // WS Player: Capture from img element
        canvas.width = imgElement.naturalWidth || 1280;
        canvas.height = imgElement.naturalHeight || 720;
        stream = canvas.captureStream(24);
      } else {
        alert('Cannot start recording: no valid video source');
        return;
      }

      // Try to use best available codec - prefer MP4/H.264 for better quality
      let mimeType = 'video/webm;codecs=vp9';
      let fileExtension = 'webm';

      // Check codec support - prefer MP4 for better compatibility and quality
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        mimeType = 'video/mp4;codecs=h264';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
        fileExtension = 'webm';
      }

      console.log(`[Recording] Using codec: ${mimeType}`);

      // Create MediaRecorder with higher bitrate for better quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000  // 5 Mbps for good quality
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Frame capture interval - only needed for WS player (img element)
      // WebRTC already has its own interval set up above
      let frameInterval: any = null;
      if (hasImgSource && imgElement) {
        frameInterval = setInterval(() => {
          if (imgElement && imgElement.src && imgElement.complete) {
            // Update canvas size if img dimensions changed
            if (canvas.width !== imgElement.naturalWidth && imgElement.naturalWidth > 0) {
              canvas.width = imgElement.naturalWidth;
              canvas.height = imgElement.naturalHeight;
            }
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
          }
        }, 1000 / 24); // 24 fps
      } else if ((stream as any)._videoFrameInterval) {
        // For WebRTC, use the interval we created earlier
        frameInterval = (stream as any)._videoFrameInterval;
      }

      mediaRecorder.onstop = () => {
        // Stop frame capture
        if (frameInterval) clearInterval(frameInterval);

        // Create blob and download with correct mime type
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        this.downloadRecording(blob, channel.name, fileExtension);

        // Clean up
        this.localRecordings.delete(streamId);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every 1 second

      // Set up auto-stop after 10 minutes
      const autoStopTimer = setTimeout(() => {
        if (this.localRecordings.has(streamId)) {
          console.log(`[Recording] Auto-stopping after ${this.MAX_RECORDING_SECONDS / 60} minutes: ${channel.name}`);
          this.stopLocalRecording(streamId);
        }
      }, this.MAX_RECORDING_SECONDS * 1000);

      // Store recording state (include frameInterval for cleanup)
      this.localRecordings.set(streamId, {
        mediaRecorder,
        chunks,
        startTime: new Date(),
        channelName: channel.name,
        autoStopTimer,
        frameInterval // Store for cleanup
      });

      console.log(`[Recording] Started local recording: ${channel.name} (${canvas.width}x${canvas.height})`);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Your browser may not support this feature.');
    }
  }

  /**
   * Stop local recording and trigger download
   */
  private stopLocalRecording(streamId: string): void {
    const recording = this.localRecordings.get(streamId);
    if (!recording) return;

    // Clear auto-stop timer
    if (recording.autoStopTimer) {
      clearTimeout(recording.autoStopTimer);
    }

    // Clear frame capture interval
    if (recording.frameInterval) {
      clearInterval(recording.frameInterval);
    }

    // Stop the media recorder (will trigger onstop and download)
    if (recording.mediaRecorder.state !== 'inactive') {
      recording.mediaRecorder.stop();
    }

    console.log(`[Recording] Stopped local recording: ${recording.channelName}`);
  }

  /**
   * Download recording as file to user's computer
   */
  private downloadRecording(blob: Blob, channelName: string, extension: string = 'mp4'): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeName = channelName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const filename = `recording_${safeName}_${timestamp}.${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[Recording] Downloaded: ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * Get elapsed recording time for a channel
   */
  getRecordingTime(channel: VideoChannel): string {
    const streamId = this.getWsStreamId(channel);
    const recording = this.localRecordings.get(streamId);
    if (!recording) return '00:00';

    const elapsed = Math.floor((Date.now() - recording.startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Each ws-video-player now uses independent WebSocket with media parameter in URL
  // No need for shared service mode anymore - each stream gets dedicated connection
  // Format: ws://host/video/stream?media=<media_name>
  private updateSharedServiceMode(): void {
    // Always use dedicated WebSocket per stream (not shared service)
    this.useSharedServiceMode.set(false);
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

  // Pagination methods
  get totalPages(): number {
    const onlineChannels = this.videoChannels.filter(c => c.status === 'online');
    return Math.ceil(onlineChannels.length / this.itemsPerPage);
  }

  get showPagination(): boolean {
    return this.gridLayout === '4x4' && this.totalPages > 1;
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    // Show max 5 page numbers
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateGridForPage();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateGridForPage();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateGridForPage();
    }
  }

  updateGridForPage() {
    const totalSlots = this.getGridSlotCount();
    // Keep grid empty - user manually selects which cameras to display
    this.gridSlots = Array(totalSlots).fill(null);
    this.updateSharedServiceMode();
  }

  // Rename group methods
  openRenameDialog(group: ChannelGroup) {
    this.renameTarget = group;
    this.newDisplayName = group.displayName;
    this.renameDialogOpen = true;
  }

  closeRenameDialog() {
    this.renameDialogOpen = false;
    this.renameTarget = null;
    this.newDisplayName = '';
  }

  async saveGroupRename() {
    if (!this.renameTarget || !this.newDisplayName) return;

    this.renaming = true;
    try {
      await this.cameraGroupsService.renameGroup(this.renameTarget.id, this.newDisplayName);

      // Update local state
      const newName = this.newDisplayName;
      const group = this.channelGroups.find(g => g.id === this.renameTarget!.id);
      if (group) {
        group.displayName = newName;
      }

      this.closeRenameDialog();
    } catch (error: any) {
      console.error('[RealtimePreview] Failed to rename group:', error);
      alert(error?.error?.detail || error?.message || 'Failed to rename folder. Please try again.');
    } finally {
      this.renaming = false;
    }
  }

  // Delete group methods
  openDeleteDialog(group: ChannelGroup) {
    this.deleteTarget = group;
    this.deleteTargetCameraCount = group.channels.length;
    this.moveToGroupId = '';
    this.deleteDialogOpen = true;
  }

  closeDeleteDialog() {
    this.deleteDialogOpen = false;
    this.deleteTarget = null;
    this.deleteTargetCameraCount = 0;
    this.moveToGroupId = '';
  }

  getOtherGroups(): ChannelGroup[] {
    return this.channelGroups.filter(g => g.id !== this.deleteTarget?.id);
  }

  async confirmDeleteGroup() {
    if (!this.deleteTarget) return;

    if (this.deleteTarget.id === 'ungrouped') {
      alert('Cannot delete the Ungrouped folder');
      return;
    }

    this.deleting = true;
    try {
      // If cameras need to be moved to another folder first
      if (this.deleteTargetCameraCount > 0 && this.moveToGroupId && this.moveToGroupId !== '') {
        const cameraIds = this.deleteTarget.channels
          .filter(c => c.backendId)
          .map(c => c.backendId!);
        if (cameraIds.length > 0) {
          if (this.moveToGroupId === 'ungrouped') {
            await this.cameraGroupsService.unassignCameras(cameraIds);
          } else {
            await this.cameraGroupsService.assignCamerasToGroup(this.moveToGroupId, cameraIds);
          }
        }
      }

      // Delete personal folder (backend also removes its assignments)
      await this.cameraGroupsService.deleteGroup(this.deleteTarget.id);

      // Reload groups and refresh
      this.cameraGroupsService.loadGroups();
      this.channelGroups = this.channelGroups.filter(g => g.id !== this.deleteTarget!.id);

      this.closeDeleteDialog();
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      alert(error?.error?.detail || 'Failed to delete folder');
    } finally {
      this.deleting = false;
    }
  }

  // Create folder methods
  openCreateFolderDialog() {
    this.newFolderName = '';
    this.newFolderDisplayName = '';
    this.createFolderDialogOpen = true;
  }

  closeCreateFolderDialog() {
    this.createFolderDialogOpen = false;
    this.newFolderName = '';
    this.newFolderDisplayName = '';
  }

  async createFolder() {
    if (!this.newFolderName) return;

    this.creatingFolder = true;
    try {
      const result = await this.cameraGroupsService.createGroup(
        this.newFolderName,
        this.newFolderDisplayName || this.newFolderName
      );

      // Add to local state - user folders have no aiboxId
      this.channelGroups.push({
        id: result.id,
        name: result.name,
        displayName: result.display_name || result.name,
        expanded: true,
        channels: [],
        aiboxId: undefined, // User folders are not tied to AI Boxes
        aiboxName: undefined
      });

      // Re-sort: user folders first, then AI Box sections
      this.channelGroups.sort((a, b) => {
        const aIsUserFolder = !a.aiboxId;
        const bIsUserFolder = !b.aiboxId;
        if (aIsUserFolder && !bIsUserFolder) return -1;
        if (!aIsUserFolder && bIsUserFolder) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      this.closeCreateFolderDialog();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    } finally {
      this.creatingFolder = false;
    }
  }

  // Drag and drop methods for moving channels between folders
  onChannelDragStart(event: DragEvent, channel: VideoChannel, fromGroup: ChannelGroup) {
    this.draggingChannel = channel;
    this.draggingFromGroup = fromGroup;
    event.dataTransfer?.setData('text/plain', channel.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onChannelDragEnd(event: DragEvent) {
    this.draggingChannel = null;
    this.draggingFromGroup = null;
    this.dragOverGroup = null;
  }

  onFolderDragOver(event: DragEvent, group: ChannelGroup) {
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

  async onFolderDrop(event: DragEvent, targetGroup: ChannelGroup) {
    event.preventDefault();
    this.dragOverGroup = null;

    if (!this.draggingChannel || !this.draggingFromGroup) return;
    if (this.draggingFromGroup.id === targetGroup.id) return;

    const channel = this.draggingChannel;
    const fromGroup = this.draggingFromGroup;

    try {
      // Per-user assignment via backendId
      if (channel.backendId) {
        if (targetGroup.id === 'ungrouped') {
          await this.cameraGroupsService.unassignCameras([channel.backendId]);
        } else {
          await this.cameraGroupsService.assignCamerasToGroup(targetGroup.id, [channel.backendId]);
        }
      }

      // Update local state
      const fromIdx = this.channelGroups.findIndex(g => g.id === fromGroup.id);
      const toIdx = this.channelGroups.findIndex(g => g.id === targetGroup.id);

      if (fromIdx >= 0 && toIdx >= 0) {
        this.channelGroups[fromIdx].channels = this.channelGroups[fromIdx].channels.filter(c => c.id !== channel.id);
        this.channelGroups[toIdx].channels = [...this.channelGroups[toIdx].channels, channel];
        console.log(`[RealtimePreview] Moved channel ${channel.name} from ${fromGroup.displayName} to ${targetGroup.displayName}`);
      }
    } catch (error) {
      console.error('Failed to move channel:', error);
      alert('Failed to move camera to folder');
    }

    this.draggingChannel = null;
    this.draggingFromGroup = null;
  }
}
