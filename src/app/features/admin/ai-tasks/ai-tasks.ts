import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';

interface AIAbility {
  id: number;
  code: number;
  name: string;
  description: string;
}

interface BmappMedia {
  name: string;
  url: string;
  description: string;
  status: string;
  status_type: number;
}

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
          @for (task of aiTasks(); track task.AlgTaskSession) {
            <div class="task-card" [class.running]="isTaskRunning(task)">
              <div class="task-header">
                <div class="task-status" [class.active]="isTaskRunning(task)">
                  <mat-icon>{{ isTaskRunning(task) ? 'play_circle' : 'pause_circle' }}</mat-icon>
                </div>
                <div class="task-info">
                  <h3>{{ task.AlgTaskSession }}</h3>
                  <span class="task-media">{{ task.MediaName }}</span>
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
                  <span class="value" [style.color]="task.AlgTaskStatus?.style">{{ task.AlgTaskStatus?.label || 'Unknown' }}</span>
                </div>
                <div class="task-detail">
                  <span class="label">Algorithms</span>
                  <span class="value">{{ getAlgorithmNames(task) }}</span>
                </div>
                <div class="task-detail">
                  <span class="label">Description</span>
                  <span class="value">{{ task.TaskDesc || '-' }}</span>
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
                  <span>Loading media and abilities...</span>
                </div>
              } @else {
                <div class="form-group">
                  <label>Task Name *</label>
                  <input type="text" [(ngModel)]="newTask.task_name" placeholder="Enter task name">
                </div>

                <div class="form-group">
                  <label>Select Camera/Media *</label>
                  <select [(ngModel)]="newTask.media_name">
                    <option value="">-- Select Media --</option>
                    @for (media of mediaList(); track media.name) {
                      <option [value]="media.name">{{ media.name }} ({{ media.status }})</option>
                    }
                  </select>
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
                      <div class="no-abilities">No algorithms available</div>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label>Description</label>
                  <textarea [(ngModel)]="newTask.description" placeholder="Optional description" rows="2"></textarea>
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
      background: rgba(239, 68, 68, 0.2);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #ef4444; }

      &.active {
        background: rgba(34, 197, 94, 0.2);
        mat-icon { color: #22c55e; }
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
    }

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
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  aiTasks = signal<any[]>([]);
  showCreateDialog = signal(false);
  dialogLoading = signal(false);
  creating = signal(false);

  mediaList = signal<BmappMedia[]>([]);
  abilities = signal<AIAbility[]>([]);

  newTask = {
    task_name: '',
    media_name: '',
    algorithms: [] as number[],
    description: ''
  };

  ngOnInit() { this.loadTasks(); }

  loadTasks() {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/ai-tasks`).subscribe({
      next: (res) => { this.aiTasks.set(res.tasks || []); this.loading.set(false); },
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

  toggleTask(task: any) {
    const action = task.AlgTaskStatus?.type === 2 ? 'stop' : 'start';
    this.http.post(`${this.apiUrl}/ai-tasks/${encodeURIComponent(task.AlgTaskSession)}/control`, { action }).subscribe({
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

  isTaskRunning(task: any): boolean {
    return task.AlgTaskStatus?.type === 2;
  }

  getAlgorithmNames(task: any): string {
    if (task.BaseAlgItem?.length) {
      return task.BaseAlgItem.map((a: any) => a.name).join(', ');
    }
    return `${task.AlgInfo?.length || 0} enabled`;
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
      media_name: '',
      algorithms: [],
      description: ''
    };
  }

  loadDialogData() {
    this.dialogLoading.set(true);
    forkJoin({
      media: this.http.get<any>(`${this.apiUrl}/ai-tasks/media`),
      abilities: this.http.get<any>(`${this.apiUrl}/ai-tasks/abilities`)
    }).subscribe({
      next: ({ media, abilities }) => {
        this.mediaList.set(media.media || []);
        this.abilities.set(abilities.abilities || []);
        this.dialogLoading.set(false);
      },
      error: (err) => {
        console.error('Load dialog data error:', err);
        this.dialogLoading.set(false);
        this.showError('Failed to load media and abilities');
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
      this.newTask.task_name.trim() &&
      this.newTask.media_name &&
      this.newTask.algorithms.length > 0
    );
  }

  createTask() {
    if (!this.canCreateTask()) return;

    this.creating.set(true);
    this.http.post(`${this.apiUrl}/ai-tasks`, this.newTask).subscribe({
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

  deleteTask(task: any) {
    if (confirm(`Delete task "${task.AlgTaskSession}"?`)) {
      this.http.delete(`${this.apiUrl}/ai-tasks/${encodeURIComponent(task.AlgTaskSession)}`).subscribe({
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
