import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AITaskService, AITask, AIAbility } from '../../../core/services/ai-task.service';
import { VideoSourceService, VideoSource } from '../../../core/services/video-source.service';
import { AIBoxService, AIBox } from '../../../core/services/aibox.service';

@Component({
  standalone: true,
  selector: 'app-admin-ai-tasks',
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatSnackBarModule
  ],
  template: `
    <div class="admin-ai-tasks">
      <div class="page-header">
        <div class="header-left">
          <h2>AI Task Management</h2>
          <span class="count">{{ filteredTasks().length }} / {{ aiTasks().length }} tasks</span>
        </div>
        <div class="header-right">
          <mat-form-field class="aibox-filter" appearance="outline">
            <mat-label>Filter by AI Box</mat-label>
            <mat-select [value]="selectedAiBoxId()" (selectionChange)="onAiBoxFilterChange($event.value)">
              <mat-select-trigger>
                @if (selectedAiBoxId()) {
                  {{ getSelectedBoxName() }}
                } @else {
                  All AI Boxes
                }
              </mat-select-trigger>
              <mat-option value="">All AI Boxes</mat-option>
              @for (box of aiBoxes(); track box.id) {
                <mat-option [value]="box.id">
                  <span class="box-option">
                    <span class="box-code">{{ box.code }}</span>
                    <span class="box-name">{{ box.name }}</span>
                  </span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button (click)="importFromBmapp()" [disabled]="importing()">
            @if (importing()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>cloud_download</mat-icon>
            }
            Import from BM-APP
          </button>
          <button mat-stroked-button (click)="syncToBmapp()" [disabled]="syncing()">
            @if (syncing()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>sync</mat-icon>
            }
            Sync to BM-APP
          </button>
          <button mat-stroked-button (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Task
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="tasks-grid">
          @for (task of filteredTasks(); track task.id) {
            <div class="task-card" [class.running]="isTaskRunning(task)" [class.failed]="task.status === 'failed'">
              <div class="task-header">
                <div class="task-status" [class.active]="isTaskRunning(task)" [class.error]="task.status === 'failed'">
                  <mat-icon>{{ getStatusIcon(task) }}</mat-icon>
                </div>
                <div class="task-info">
                  <div class="task-title-row">
                    <h3>{{ task.task_name }}</h3>
                    @if (task.video_source?.aibox) {
                      <span class="aibox-badge" [matTooltip]="task.video_source?.aibox?.name || ''">
                        {{ task.video_source?.aibox?.code }}
                      </span>
                    }
                  </div>
                  <span class="task-media">{{ task.video_source?.name || task.video_source?.stream_name || 'Unknown Source' }}</span>
                </div>
                <div class="task-actions">
                  <button mat-icon-button [matTooltip]="isTaskRunning(task) ? 'Stop' : 'Start'" (click)="toggleTask(task)">
                    <mat-icon>{{ isTaskRunning(task) ? 'stop' : 'play_arrow' }}</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="deleteTask(task)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="task-body">
                <div class="task-detail">
                  <span class="label">Status</span>
                  <span class="value status-badge" [class]="'status-' + task.status">{{ task.status }}</span>
                </div>
                <div class="task-detail">
                  <span class="label">Algorithms</span>
                  <span class="value">{{ getAlgorithmDisplay(task) }}</span>
                </div>
                <div class="task-detail">
                  <span class="label">BM-APP Sync</span>
                  <span class="value" [class.sync-ok]="task.is_synced_bmapp" [class.sync-error]="!task.is_synced_bmapp">
                    {{ task.is_synced_bmapp ? 'Synced' : 'Not synced' }}
                  </span>
                </div>
                @if (task.bmapp_sync_error) {
                  <div class="task-detail error-detail">
                    <span class="label">Sync Error</span>
                    <span class="value error-text">{{ task.bmapp_sync_error }}</span>
                  </div>
                }
                <div class="task-detail">
                  <span class="label">Description</span>
                  <span class="value">{{ task.description || '-' }}</span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>smart_toy</mat-icon>
              <span>No AI tasks configured</span>
              <button mat-stroked-button (click)="openCreateDialog()">Create First Task</button>
            </div>
          }
        </div>
      }

      <!-- Create Task Dialog -->
      @if (showCreateDialog()) {
        <div class="dialog-backdrop" (click)="closeCreateDialog()">
          <div class="dialog-container" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Create AI Task</h3>
              <button mat-icon-button (click)="closeCreateDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-content">
              @if (dialogLoading()) {
                <div class="dialog-loading">
                  <mat-spinner diameter="32"></mat-spinner>
                  <span>Loading video sources and abilities...</span>
                </div>
              } @else {
                <div class="form-group">
                  <label>Select AI Box *</label>
                  <mat-form-field appearance="outline" class="aibox-select">
                    <mat-select [(ngModel)]="newTask.aibox_id" placeholder="-- Select AI Box --" (selectionChange)="onDialogBoxChange()">
                      @for (box of aiBoxes(); track box.id) {
                        <mat-option [value]="box.id">
                          <span class="box-select-option">
                            <span class="box-code">{{ box.code }}</span>
                            <span class="box-name">{{ box.name }}</span>
                          </span>
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  @if (aiBoxes().length === 0) {
                    <span class="hint warning">No AI Boxes available. Create one first.</span>
                  }
                </div>

                <div class="form-group">
                  <label>Task Name (optional)</label>
                  <input type="text" [(ngModel)]="newTask.task_name" placeholder="Auto-generated if empty">
                  <span class="hint">Leave empty to auto-generate from video source name</span>
                </div>

                <div class="form-group">
                  <label>Select Video Source *</label>
                  <mat-form-field appearance="outline" class="video-source-select">
                    <mat-select [(ngModel)]="newTask.video_source_id" placeholder="-- Select Video Source --" [disabled]="!newTask.aibox_id">
                      @for (source of filteredVideoSources(); track source.id) {
                        <mat-option [value]="source.id">
                          <span class="source-option">
                            <span class="source-name">{{ source.name }}</span>
                            <span class="source-stream">({{ source.stream_name }})</span>
                          </span>
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  @if (!newTask.aibox_id) {
                    <span class="hint">Select an AI Box first</span>
                  } @else if (filteredVideoSources().length === 0) {
                    <span class="hint warning">No video sources available for this box.</span>
                  }
                </div>

                <div class="form-group">
                  <label>AI Algorithms *</label>
                  <div class="algorithm-list">
                    @for (ability of abilities(); track $index) {
                      <label class="algorithm-item">
                        <input type="checkbox"
                          [checked]="isAlgorithmSelected(ability.id)"
                          (change)="toggleAlgorithm(ability.id)">
                        <span class="algo-name">{{ ability.name }}</span>
                        @if (ability.description && ability.description !== ability.name) {
                          <span class="algo-desc">{{ ability.description }}</span>
                        }
                      </label>
                    }
                    @if (abilities().length === 0) {
                      <div class="no-abilities">No algorithms available from BM-APP</div>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <textarea [(ngModel)]="newTask.description" placeholder="Optional description" rows="2"></textarea>
                </div>

                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="newTask.auto_start">
                    <span>Auto-start task after creation</span>
                  </label>
                </div>
              }
            </div>
            <div class="dialog-actions">
              <button mat-stroked-button (click)="closeCreateDialog()">Cancel</button>
              <button mat-raised-button class="btn-primary"
                (click)="createTask()"
                [disabled]="!canCreateTask() || creating()">
                @if (creating()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>add</mat-icon>
                    <span>Create Task</span>
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
    .admin-ai-tasks { display: flex; flex-direction: column; gap: 24px; }

    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

    .header-left {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .header-right { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

    .aibox-filter {
      min-width: 220px;

      ::ng-deep {
        .mat-mdc-form-field-flex {
          background: var(--glass-bg);
          border-radius: 8px;
        }

        .mat-mdc-text-field-wrapper {
          background: transparent;
        }

        .mat-mdc-form-field-infix {
          min-height: 40px;
          padding: 8px 0;
        }

        .mdc-notched-outline__leading,
        .mdc-notched-outline__notch,
        .mdc-notched-outline__trailing {
          border-color: var(--glass-border) !important;
        }

        .mat-mdc-form-field.mat-focused {
          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing {
            border-color: var(--accent-primary) !important;
          }
        }

        .mat-mdc-select-value,
        .mat-mdc-form-field-label {
          color: var(--text-primary) !important;
        }

        .mat-mdc-select-arrow {
          color: var(--text-secondary);
        }
      }

      .box-option {
        display: flex;
        align-items: center;
        gap: 12px;

        .box-code {
          display: inline-block;
          padding: 2px 8px;
          background: var(--accent-gradient);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
          min-width: 50px;
          text-align: center;
        }

        .box-name {
          font-size: 14px;
          color: var(--text-primary);
        }
      }
    }

    .btn-primary { background: var(--accent-gradient) !important; color: white !important; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .task-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: all 0.2s ease;

      &.running { border-color: rgba(34, 197, 94, 0.5); }
      &.failed { border-color: rgba(239, 68, 68, 0.5); }
      &:hover { transform: translateY(-2px); }
    }

    .task-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .task-status {
      width: 40px; height: 40px;
      border-radius: 8px;
      background: rgba(107, 114, 128, 0.2);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #6b7280; }

      &.active {
        background: rgba(34, 197, 94, 0.2);
        mat-icon { color: #22c55e; }
      }

      &.error {
        background: rgba(239, 68, 68, 0.2);
        mat-icon { color: #ef4444; }
      }
    }

    .task-info {
      flex: 1;

      .task-title-row {
        display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
      }

      h3 { margin: 0; font-size: 14px; color: var(--text-primary); }

      .aibox-badge {
        padding: 2px 8px;
        background: var(--accent-gradient);
        color: white;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .task-media { font-size: 12px; color: var(--text-tertiary); }
    }

    .task-actions {
      display: flex; gap: 4px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .task-body { padding: 16px 20px; }

    .task-detail {
      display: flex; justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--glass-border);
      &:last-child { border-bottom: none; }

      .label { font-size: 13px; color: var(--text-tertiary); }
      .value { font-size: 13px; color: var(--text-primary); max-width: 200px; text-align: right; }

      &.error-detail {
        flex-direction: column;
        gap: 4px;
        .error-text { color: #ef4444; font-size: 12px; text-align: left; max-width: 100%; }
      }
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;

      &.status-running { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
      &.status-stopped { background: rgba(107, 114, 128, 0.2); color: #6b7280; }
      &.status-pending { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
      &.status-failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    }

    .sync-ok { color: #22c55e; }
    .sync-error { color: #ef4444; }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
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
      max-width: 520px;
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

    .dialog-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
      color: var(--text-secondary);
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

      input, textarea {
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
      }

      .hint {
        display: block;
        margin-top: 6px;
        font-size: 11px;
        color: var(--text-muted);

        &.warning { color: #f59e0b; }
      }

      .aibox-select,
      .video-source-select {
        width: 100%;

        ::ng-deep {
          .mat-mdc-form-field-flex {
            background: var(--glass-bg);
            border-radius: 8px;
          }

          .mdc-notched-outline__leading,
          .mdc-notched-outline__notch,
          .mdc-notched-outline__trailing {
            border-color: var(--glass-border) !important;
          }

          .mat-mdc-form-field.mat-focused {
            .mdc-notched-outline__leading,
            .mdc-notched-outline__notch,
            .mdc-notched-outline__trailing {
              border-color: var(--accent-primary) !important;
            }
          }

          .mat-mdc-select-value,
          .mat-mdc-select-placeholder {
            color: var(--text-primary) !important;
          }

          .mat-mdc-select-disabled {
            .mat-mdc-select-value {
              color: var(--text-muted) !important;
            }
          }
        }
      }

      .box-select-option {
        display: flex;
        align-items: center;
        gap: 12px;

        .box-code {
          display: inline-block;
          padding: 3px 8px;
          background: var(--accent-gradient);
          color: white;
          font-size: 10px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
          min-width: 50px;
          text-align: center;
        }

        .box-name {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }
      }

      .source-option {
        display: flex;
        align-items: center;
        gap: 8px;

        .source-name {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .source-stream {
          font-size: 12px;
          color: var(--text-tertiary);
        }
      }
    }

    .checkbox-group {
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        span {
          font-size: 14px;
          color: var(--text-primary);
        }
      }
    }

    .algorithm-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      padding: 8px;
    }

    .algorithm-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover { background: var(--glass-bg-hover); }

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        cursor: pointer;
      }

      .algo-name {
        font-size: 14px;
        color: var(--text-primary);
        font-weight: 500;
        min-width: 120px;
      }

      .algo-desc {
        font-size: 12px;
        color: var(--text-tertiary);
        flex: 1;
      }
    }

    .no-abilities {
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--glass-border);

      button {
        ::ng-deep {
          .mat-mdc-button-touch-target {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .mdc-button__label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          mat-icon {
            margin: 0 !important;
            padding: 0;
            font-size: 18px;
            width: 18px;
            height: 18px;
            line-height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          span {
            line-height: 1;
            display: inline-flex;
            align-items: center;
          }
        }
      }
    }
  `]
})
export class AdminAiTasksComponent implements OnInit {
  private aiTaskService = inject(AITaskService);
  private videoSourceService = inject(VideoSourceService);
  private aiBoxService = inject(AIBoxService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  importing = signal(false);
  syncing = signal(false);
  aiTasks = signal<AITask[]>([]);
  showCreateDialog = signal(false);
  dialogLoading = signal(false);
  creating = signal(false);

  videoSources = signal<VideoSource[]>([]);
  abilities = signal<AIAbility[]>([]);
  aiBoxes = signal<AIBox[]>([]);
  selectedAiBoxId = signal<string>('');

  // Computed signal for filtered tasks
  filteredTasks = computed(() => {
    const tasks = this.aiTasks();
    const boxId = this.selectedAiBoxId();

    if (!boxId) return tasks;

    return tasks.filter(task =>
      task.video_source?.aibox_id === boxId
    );
  });

  newTask = {
    aibox_id: '',
    task_name: '',
    video_source_id: '',
    algorithms: [] as number[],
    description: '',
    auto_start: true
  };

  // Filtered video sources based on selected AI Box
  filteredVideoSources = computed(() => {
    const sources = this.videoSources();
    const boxId = this.newTask.aibox_id;

    if (!boxId) return [];

    return sources.filter(s => s.aibox_id === boxId);
  });

  ngOnInit() {
    this.loadTasks();
    this.loadAIBoxes();
  }

  loadTasks() {
    this.loading.set(true);
    this.aiTaskService.getTasks().subscribe({
      next: (tasks) => {
        this.aiTasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Load tasks error:', err);
        this.loading.set(false);
        this.showError('Failed to load tasks');
      }
    });
  }

  loadAIBoxes() {
    this.aiBoxService.loadAiBoxes().subscribe({
      next: (boxes: AIBox[]) => {
        this.aiBoxes.set(boxes);
      },
      error: (err: any) => {
        console.error('Load AI boxes error:', err);
      }
    });
  }

  onAiBoxFilterChange(value: string) {
    this.selectedAiBoxId.set(value);
    // Filtered tasks will update automatically via computed signal
  }

  getSelectedBoxName(): string {
    const boxId = this.selectedAiBoxId();
    if (!boxId) return 'All AI Boxes';

    const box = this.aiBoxes().find(b => b.id === boxId);
    return box ? box.name : 'All AI Boxes';
  }

  refreshData() {
    this.loadTasks();
  }

  importFromBmapp() {
    this.importing.set(true);
    this.aiTaskService.importFromBmapp().subscribe({
      next: (res) => {
        this.importing.set(false);
        const summary = `Imported ${res.imported} tasks, skipped ${res.skipped} (total: ${res.total_from_bmapp} from BM-APP)`;
        this.showSuccess(summary);

        // Show errors if any
        if (res.errors && res.errors.length > 0) {
          console.warn('Import errors:', res.errors);
          this.showError(`Import completed with ${res.errors.length} errors. Check console for details.`);
        }

        // Refresh to see new tasks
        setTimeout(() => this.loadTasks(), 1000);
      },
      error: (err) => {
        console.error('Import error:', err);
        this.importing.set(false);
        this.showError(err.error?.detail || 'Failed to import tasks from BM-APP');
      }
    });
  }

  syncToBmapp() {
    this.syncing.set(true);
    this.aiTaskService.syncToBmapp().subscribe({
      next: (res) => {
        this.syncing.set(false);
        this.showSuccess(res.message);
        // Refresh to see updated sync status
        setTimeout(() => this.loadTasks(), 2000);
      },
      error: (err) => {
        console.error('Sync error:', err);
        this.syncing.set(false);
        this.showError('Failed to sync to BM-APP');
      }
    });
  }

  toggleTask(task: AITask) {
    const action = task.status === 'running' ? 'stop' : 'start';
    this.aiTaskService.controlTask(task.id, action).subscribe({
      next: () => {
        this.loadTasks();
        this.showSuccess(`Task ${action}ed successfully`);
      },
      error: (err) => {
        console.error('Toggle task error:', err);
        this.showError(`Failed to ${action} task`);
      }
    });
  }

  isTaskRunning(task: AITask): boolean {
    return task.status === 'running';
  }

  getStatusIcon(task: AITask): string {
    switch (task.status) {
      case 'running': return 'play_circle';
      case 'stopped': return 'pause_circle';
      case 'pending': return 'hourglass_empty';
      case 'failed': return 'error';
      default: return 'help_outline';
    }
  }

  getAlgorithmDisplay(task: AITask): string {
    if (!task.algorithms || task.algorithms.length === 0) {
      return 'None configured';
    }
    // Try to find algorithm names from abilities
    const abilityNames = task.algorithms.map(id => {
      const ability = this.abilities().find(a => a.id === id);
      return ability?.name || `ID: ${id}`;
    });
    return abilityNames.join(', ');
  }

  openCreateDialog() {
    this.showCreateDialog.set(true);
    this.resetNewTask();
    this.loadDialogData();
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
  }

  resetNewTask() {
    this.newTask = {
      aibox_id: '',
      task_name: '',
      video_source_id: '',
      algorithms: [],
      description: '',
      auto_start: true
    };
  }

  onDialogBoxChange() {
    // Reset video source selection when box changes
    this.newTask.video_source_id = '';
  }

  loadDialogData() {
    this.dialogLoading.set(true);
    forkJoin({
      sources: this.videoSourceService.getVideoSources(),
      abilities: this.aiTaskService.getAbilities()
    }).subscribe({
      next: ({ sources, abilities }) => {
        this.videoSources.set(sources);
        // Deduplicate abilities by ID (BM-APP can return duplicates)
        const uniqueAbilities = abilities.filter((ability, index, self) =>
          index === self.findIndex(a => a.id === ability.id)
        );
        this.abilities.set(uniqueAbilities);
        this.dialogLoading.set(false);
      },
      error: (err: any) => {
        console.error('Load dialog data error:', err);
        this.dialogLoading.set(false);
        this.showError('Failed to load video sources and abilities');
      }
    });
  }

  isAlgorithmSelected(id: number): boolean {
    return this.newTask.algorithms.includes(id);
  }

  toggleAlgorithm(id: number) {
    const idx = this.newTask.algorithms.indexOf(id);
    if (idx > -1) {
      this.newTask.algorithms.splice(idx, 1);
    } else {
      this.newTask.algorithms.push(id);
    }
  }

  canCreateTask(): boolean {
    return !!(
      this.newTask.aibox_id &&
      this.newTask.video_source_id &&
      this.newTask.algorithms.length > 0
    );
  }

  createTask() {
    if (!this.canCreateTask()) return;

    this.creating.set(true);
    this.aiTaskService.createTask({
      video_source_id: this.newTask.video_source_id,
      task_name: this.newTask.task_name || undefined,
      algorithms: this.newTask.algorithms,
      description: this.newTask.description || undefined,
      auto_start: this.newTask.auto_start
    }).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeCreateDialog();
        this.loadTasks();
        this.showSuccess('Task created successfully');
      },
      error: (err) => {
        console.error('Create task error:', err);
        this.creating.set(false);
        this.showError(err.error?.detail || 'Failed to create task');
      }
    });
  }

  deleteTask(task: AITask) {
    if (confirm(`Delete task "${task.task_name}"?`)) {
      this.aiTaskService.deleteTask(task.id).subscribe({
        next: () => {
          this.loadTasks();
          this.showSuccess('Task deleted successfully');
        },
        error: (err) => {
          console.error('Delete task error:', err);
          this.showError('Failed to delete task');
        }
      });
    }
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: 'snack-success' });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', { duration: 5000, panelClass: 'snack-error' });
  }
}
