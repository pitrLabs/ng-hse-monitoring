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
  selector: 'app-admin-ai-tasks',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="admin-ai-tasks">
      <div class="page-header">
        <div class="header-left">
          <h2>AI Task Management</h2>
          <span class="count">{{ aiTasks().length }} tasks</span>
        </div>
        <div class="header-right">
          <button mat-stroked-button (click)="loadAbilities()">
            <mat-icon>psychology</mat-icon>
            Load Abilities
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
                  <button mat-icon-button matTooltip="Toggle" (click)="toggleTask(task)">
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
      .value { font-size: 13px; color: var(--text-primary); }
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
  `]
})
export class AdminAiTasksComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  aiTasks = signal<any[]>([]);

  ngOnInit() { this.loadTasks(); }

  loadTasks() {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/ai-tasks`).subscribe({
      next: (res) => { this.aiTasks.set(res.tasks || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadAbilities() {
    this.http.get(`${this.apiUrl}/ai-tasks/abilities`).subscribe({
      next: (res) => console.log('Abilities:', res),
      error: (err) => console.error(err)
    });
  }

  toggleTask(task: any) {
    const action = task.AlgTaskStatus?.type === 2 ? 'stop' : 'start';
    this.http.post(`${this.apiUrl}/ai-tasks/${encodeURIComponent(task.AlgTaskSession)}/control`, { action }).subscribe({
      next: () => this.loadTasks(),
      error: (err) => console.error('Toggle task error:', err)
    });
  }

  isTaskRunning(task: any): boolean {
    // AlgTaskStatus.type: 0 = stopped, 2 = running
    return task.AlgTaskStatus?.type === 2;
  }

  getAlgorithmNames(task: any): string {
    if (task.BaseAlgItem?.length) {
      return task.BaseAlgItem.map((a: any) => a.name).join(', ');
    }
    return `${task.AlgInfo?.length || 0} enabled`;
  }

  openCreateDialog() { console.log('Create task'); }

  deleteTask(task: any) {
    if (confirm(`Delete task "${task.AlgTaskSession}"?`)) {
      this.http.delete(`${this.apiUrl}/ai-tasks/${encodeURIComponent(task.AlgTaskSession)}`).subscribe({
        next: () => this.loadTasks(),
        error: (err) => console.error('Delete task error:', err)
      });
    }
  }
}
