import { Component, OnInit, signal, inject } from '@angular/core';
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
          <span class="count">{{ aiTasks().length }} tasks</span>
        </div>
        <div class="header-right">
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
          @for (task of aiTasks(); track task.id) {
            <div class="task-card" [class.running]="isTaskRunning(task)" [class.failed]="task.status === 'failed'">
              <div class="task-header">
                <div class="task-status" [class.active]="isTaskRunning(task)" [class.error]="task.status === 'failed'">
                  <mat-icon>{{ getStatusIcon(task) }}</mat-icon>
                </div>
                <div class="task-info">
                  <h3>{{ task.task_name }}</h3>
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
                  <label>Task Name (optional)</label>
                  <input type="text" [(ngModel)]="newTask.task_name" placeholder="Auto-generated if empty">
                  <span class="hint">Leave empty to auto-generate from video source name</span>
                </div>

                <div class="form-group">
                  <label>Select Video Source *</label>
                  <select [(ngModel)]="newTask.video_source_id">
                    <option value="">-- Select Video Source --</option>
                    @for (source of videoSources(); track source.id) {
                      <option [value]="source.id">{{ source.name }} ({{ source.stream_name }})</option>
                    }
                  </select>
                  @if (videoSources().length === 0) {
                    <span class="hint warning">No video sources available. Create one first in Video Sources.</span>
                  }
                </div>

                <div class="form-group">
                  <label>AI Algorithms *</label>
                  <div class="algorithm-list">
                    @for (ability of abilities(); track ability.id) {
                      <label class="algorithm-item">
                        <input type="checkbox"
                          [checked]="isAlgorithmSelected(ability.id)"
                          (change)="toggleAlgorithm(ability.id)">
                        <span class="algo-name">{{ ability.name }}</span>
                        <span class="algo-desc">{{ ability.description }}</span>
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
                    Create Task
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

    .header-right { display: flex; gap: 12px; }
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
      h3 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); }
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

        &.warning { color: #f59e0b; }
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
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class AdminAiTasksComponent implements OnInit {
  private aiTaskService = inject(AITaskService);
  private videoSourceService = inject(VideoSourceService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  syncing = signal(false);
  aiTasks = signal<AITask[]>([]);
  showCreateDialog = signal(false);
  dialogLoading = signal(false);
  creating = signal(false);

  videoSources = signal<VideoSource[]>([]);
  abilities = signal<AIAbility[]>([]);

  newTask = {
    task_name: '',
    video_source_id: '',
    algorithms: [] as number[],
    description: '',
    auto_start: true
  };

  ngOnInit() { this.loadTasks(); }

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

  refreshData() {
    this.loadTasks();
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
      task_name: '',
      video_source_id: '',
      algorithms: [],
      description: '',
      auto_start: true
    };
  }

  loadDialogData() {
    this.dialogLoading.set(true);
    forkJoin({
      sources: this.videoSourceService.getVideoSources(),
      abilities: this.aiTaskService.getAbilities()
    }).subscribe({
      next: ({ sources, abilities }) => {
        this.videoSources.set(sources);
        this.abilities.set(abilities);
        this.dialogLoading.set(false);
      },
      error: (err) => {
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
