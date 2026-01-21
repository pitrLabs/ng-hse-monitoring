import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';

interface PTTGroup {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  memberCount: number;
}

@Component({
  selector: 'app-ptt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatTableModule,
    MatDialogModule
  ],
  template: `
    <div class="ptt-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <div class="panel-header">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search group name..." [(ngModel)]="searchQuery" class="search-input">
          </div>
          <button mat-button class="create-btn" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create
          </button>
        </div>

        <!-- PTT Groups Table -->
        <div class="groups-table">
          <div class="table-header">
            <span class="col-status">Status</span>
            <span class="col-name">Group Name</span>
            <span class="col-action">Operation</span>
          </div>
          <div class="table-body">
            @for (group of filteredGroups(); track group.id) {
              <div class="table-row" [class.active]="selectedGroup()?.id === group.id" (click)="selectGroup(group)">
                <span class="col-status">
                  <mat-icon [class]="group.status">{{ group.status === 'active' ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                </span>
                <span class="col-name">{{ group.name }}</span>
                <span class="col-action">
                  <button mat-icon-button [matMenuTriggerFor]="groupMenu" (click)="$event.stopPropagation()">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #groupMenu="matMenu">
                    <button mat-menu-item>
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item>
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Communication Bar -->
        <div class="comm-bar">
          <button mat-fab class="mic-btn" [class.active]="isTalking()" (mousedown)="startTalking()" (mouseup)="stopTalking()" (mouseleave)="stopTalking()">
            <mat-icon>{{ isTalking() ? 'mic' : 'mic_none' }}</mat-icon>
          </button>
          <span class="comm-hint">Hold to talk</span>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <!-- Mic Status Bar -->
        <div class="status-bar glass-card-static">
          <div class="mic-status" [class.active]="isTalking()">
            <mat-icon>{{ isTalking() ? 'mic' : 'mic_off' }}</mat-icon>
            <span>{{ isTalking() ? 'Microphone Active' : 'Microphone Inactive' }}</span>
          </div>
          <div class="mode-tabs">
            <button mat-button [class.active]="mode() === 'conference'" (click)="setMode('conference')">
              <mat-icon>groups</mat-icon>
              Conference
            </button>
            <button mat-button [class.active]="mode() === 'video'" (click)="setMode('video')">
              <mat-icon>videocam</mat-icon>
              Video
            </button>
            <button mat-button [class.active]="mode() === 'map'" (click)="setMode('map')">
              <mat-icon>map</mat-icon>
              Map
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-area glass-card-static">
          @switch (mode()) {
            @case ('conference') {
              <div class="conference-view">
                <div class="participants-grid">
                  @if (selectedGroup()) {
                    @for (i of [1,2,3,4,5,6]; track i) {
                      <div class="participant-card">
                        <div class="avatar">
                          <mat-icon>person</mat-icon>
                        </div>
                        <span class="name">User {{ i }}</span>
                        <span class="status" [class.speaking]="i === 1 && isTalking()">
                          {{ i === 1 && isTalking() ? 'Speaking...' : 'Listening' }}
                        </span>
                      </div>
                    }
                  } @else {
                    <div class="empty-state">
                      <mat-icon>group</mat-icon>
                      <span>Select a group to start conference</span>
                    </div>
                  }
                </div>
              </div>
            }
            @case ('video') {
              <div class="video-view">
                <div class="video-grid">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="video-cell">
                      <mat-icon>videocam</mat-icon>
                      <span>Camera {{ i }}</span>
                    </div>
                  }
                </div>
              </div>
            }
            @case ('map') {
              <div class="map-view">
                <div class="map-placeholder">
                  <mat-icon>map</mat-icon>
                  <span>Group Members Location</span>
                  <span class="hint">View participant locations on map</span>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ptt-container {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
    }

    .panel-header {
      display: flex;
      gap: 12px;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);

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

    .create-btn {
      background: var(--accent-gradient);
      color: white;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    // Groups Table
    .groups-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      padding: 12px 16px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .table-body {
      flex: 1;
      overflow-y: auto;
    }

    .table-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--glass-border);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--glass-bg);
      }

      &.active {
        background: rgba(0, 212, 255, 0.1);
        border-left: 3px solid var(--accent-primary);
      }
    }

    .col-status {
      width: 60px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;

        &.active {
          color: var(--success);
        }

        &.inactive {
          color: var(--text-muted);
        }
      }
    }

    .col-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
    }

    .col-action {
      width: 50px;
      text-align: right;
    }

    // Communication Bar
    .comm-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      background: var(--glass-bg);
      border-radius: var(--radius-md);
    }

    .mic-btn {
      width: 72px;
      height: 72px;
      background: var(--glass-bg-hover);
      border: 2px solid var(--glass-border);
      color: var(--text-secondary);
      transition: all 0.2s;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      &.active {
        background: var(--accent-gradient);
        border-color: var(--accent-primary);
        color: white;
        transform: scale(1.1);
        box-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
      }
    }

    .comm-hint {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    // Right Panel
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
    }

    .mic-status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      span {
        font-size: 13px;
      }

      &.active {
        color: var(--success);
      }
    }

    .mode-tabs {
      display: flex;
      gap: 8px;

      button {
        color: var(--text-secondary);

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }

        &.active {
          background: var(--accent-primary);
          color: white;
        }
      }
    }

    // Content Area
    .content-area {
      flex: 1;
      overflow: hidden;
    }

    // Conference View
    .conference-view {
      height: 100%;
      padding: 20px;
    }

    .participants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    .participant-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: var(--glass-bg);
      border-radius: var(--radius-md);
      text-align: center;

      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--accent-gradient);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 30px;
          width: 30px;
          height: 30px;
          color: white;
        }
      }

      .name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .status {
        font-size: 11px;
        color: var(--text-tertiary);

        &.speaking {
          color: var(--success);
          animation: pulse 1s ease infinite;
        }
      }
    }

    // Video View
    .video-view {
      height: 100%;
      padding: 20px;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      height: 100%;
    }

    .video-cell {
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-muted);

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      span {
        font-size: 12px;
      }
    }

    // Map View
    .map-view {
      height: 100%;
    }

    .map-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-tertiary);
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(124, 58, 237, 0.05));

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      span {
        font-size: 14px;
      }

      .hint {
        font-size: 12px;
        opacity: 0.7;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: var(--text-muted);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 900px) {
      .ptt-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .left-panel {
        max-height: 400px;
      }
    }
  `]
})
export class PTTComponent {
  searchQuery = '';
  isTalking = signal(false);
  mode = signal<'conference' | 'video' | 'map'>('conference');
  selectedGroup = signal<PTTGroup | null>(null);

  groups = signal<PTTGroup[]>([
    { id: 1, name: 'Security Team', status: 'active', memberCount: 8 },
    { id: 2, name: 'Maintenance', status: 'active', memberCount: 5 },
    { id: 3, name: 'Operations', status: 'inactive', memberCount: 12 },
    { id: 4, name: 'Emergency Response', status: 'active', memberCount: 6 },
    { id: 5, name: 'Management', status: 'inactive', memberCount: 4 }
  ]);

  filteredGroups(): PTTGroup[] {
    if (!this.searchQuery) return this.groups();
    return this.groups().filter(g =>
      g.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectGroup(group: PTTGroup): void {
    this.selectedGroup.set(group);
  }

  startTalking(): void {
    if (this.selectedGroup()) {
      this.isTalking.set(true);
    }
  }

  stopTalking(): void {
    this.isTalking.set(false);
  }

  setMode(mode: 'conference' | 'video' | 'map'): void {
    this.mode.set(mode);
  }

  openCreateDialog(): void {
    console.log('Opening create group dialog');
  }
}
