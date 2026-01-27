import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface ImageTask {
  id: string;
  name: string;
  description: string;
  sourceType: 'camera' | 'folder' | 'url';
  sourceName: string;
  schedule: string;
  detectionTypes: string[];
  status: 'running' | 'paused' | 'stopped' | 'error';
  lastRun: string;
  totalImages: number;
  alarmsToday: number;
}

@Component({
  selector: 'app-admin-image-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="image-task-management-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Image Task Management</h2>
          <p class="subtitle">Configure and manage image analysis tasks</p>
        </div>
        <button class="action-btn primary" (click)="createTask()">
          <mat-icon>add</mat-icon>
          Create Task
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <mat-icon>burst_mode</mat-icon>
          <div class="stat-info">
            <span class="value">{{ tasks().length }}</span>
            <span class="label">Total Tasks</span>
          </div>
        </div>
        <div class="stat-card running">
          <mat-icon>play_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('running') }}</span>
            <span class="label">Running</span>
          </div>
        </div>
        <div class="stat-card paused">
          <mat-icon>pause_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('paused') }}</span>
            <span class="label">Paused</span>
          </div>
        </div>
        <div class="stat-card error">
          <mat-icon>error</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getCountByStatus('error') }}</span>
            <span class="label">Error</span>
          </div>
        </div>
      </div>

      <div class="tasks-list">
        @for (task of tasks(); track task.id) {
          <div class="task-card" [class]="task.status">
            <div class="task-status-indicator"></div>
            <div class="task-icon">
              <mat-icon>{{ getSourceIcon(task.sourceType) }}</mat-icon>
            </div>
            <div class="task-info">
              <div class="task-header">
                <h4>{{ task.name }}</h4>
                <span class="status-badge" [class]="task.status">{{ task.status }}</span>
              </div>
              <p class="task-desc">{{ task.description }}</p>
              <div class="task-meta">
                <div class="meta-item">
                  <mat-icon>source</mat-icon>
                  <span>{{ task.sourceName }}</span>
                </div>
                <div class="meta-item">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ task.schedule }}</span>
                </div>
                <div class="meta-item">
                  <mat-icon>update</mat-icon>
                  <span>{{ task.lastRun }}</span>
                </div>
              </div>
              <div class="detection-tags">
                @for (type of task.detectionTypes; track type) {
                  <span class="tag">{{ type }}</span>
                }
              </div>
            </div>
            <div class="task-stats">
              <div class="stat">
                <span class="stat-value">{{ task.totalImages }}</span>
                <span class="stat-label">Images</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ task.alarmsToday }}</span>
                <span class="stat-label">Alarms Today</span>
              </div>
            </div>
            <div class="task-actions">
              @if (task.status === 'running') {
                <button mat-icon-button (click)="pauseTask(task)" matTooltip="Pause">
                  <mat-icon>pause</mat-icon>
                </button>
              } @else if (task.status !== 'error') {
                <button mat-icon-button (click)="startTask(task)" matTooltip="Start">
                  <mat-icon>play_arrow</mat-icon>
                </button>
              }
              <button mat-icon-button (click)="stopTask(task)" matTooltip="Stop" [disabled]="task.status === 'stopped'">
                <mat-icon>stop</mat-icon>
              </button>
              <button mat-icon-button (click)="editTask(task)" matTooltip="Edit">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="viewLogs(task)" matTooltip="Logs">
                <mat-icon>description</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteTask(task)" matTooltip="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>

      @if (tasks().length === 0) {
        <div class="empty-state">
          <mat-icon>burst_mode</mat-icon>
          <h3>No image tasks configured</h3>
          <p>Create your first image analysis task to get started</p>
          <button class="action-btn primary" (click)="createTask()">
            <mat-icon>add</mat-icon>
            Create Task
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-task-management-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.running mat-icon { color: #22c55e; }
    .stat-card.paused mat-icon { color: #f59e0b; }
    .stat-card.error mat-icon { color: #ef4444; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .tasks-list { display: flex; flex-direction: column; gap: 16px; }
    .task-card { display: flex; align-items: center; gap: 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: all 0.2s; }
    .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

    .task-status-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .task-card.running .task-status-indicator { background: #22c55e; }
    .task-card.paused .task-status-indicator { background: #f59e0b; }
    .task-card.stopped .task-status-indicator { background: #6b7280; }
    .task-card.error .task-status-indicator { background: #ef4444; }

    .task-icon { width: 56px; height: 56px; border-radius: 12px; background: rgba(0, 212, 255, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .task-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }

    .task-info { flex: 1; min-width: 0; }
    .task-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .task-header h4 { margin: 0; font-size: 16px; color: var(--text-primary); }
    .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .status-badge.running { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.paused { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .status-badge.stopped { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .task-desc { margin: 0 0 8px; font-size: 13px; color: var(--text-muted); }
    .task-meta { display: flex; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
    .meta-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .meta-item mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .detection-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 11px; color: var(--text-secondary); }

    .task-stats { display: flex; gap: 24px; padding: 0 24px; border-left: 1px solid var(--glass-border); }
    .stat { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .stat-value { font-size: 20px; font-weight: 600; color: var(--text-primary); }
    .stat-label { font-size: 11px; color: var(--text-muted); }

    .task-actions { display: flex; gap: 4px; padding-left: 16px; border-left: 1px solid var(--glass-border); }
    .task-actions button { color: var(--text-secondary); width: 36px; height: 36px; }
    .task-actions button mat-icon { font-size: 20px; }

    .empty-state { text-align: center; padding: 60px 20px; background: var(--glass-bg); border-radius: 16px; border: 1px solid var(--glass-border); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 16px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty-state p { margin: 0 0 20px; color: var(--text-muted); }

    @media (max-width: 1024px) {
      .task-card { flex-wrap: wrap; }
      .task-stats { border-left: none; padding: 16px 0 0; width: 100%; justify-content: center; border-top: 1px solid var(--glass-border); }
      .task-actions { border-left: none; padding-left: 0; }
    }
    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminImageTaskManagementComponent {
  tasks = signal<ImageTask[]>([
    { id: '1', name: 'PPE Compliance Check', description: 'Monitor PPE compliance in production area', sourceType: 'camera', sourceName: 'Camera 01 - Production Floor', schedule: 'Every 5 minutes', detectionTypes: ['Helmet', 'Vest', 'Gloves'], status: 'running', lastRun: '2 min ago', totalImages: 1250, alarmsToday: 12 },
    { id: '2', name: 'Zone Intrusion Detection', description: 'Detect unauthorized access to restricted zones', sourceType: 'camera', sourceName: 'Camera 05 - Restricted Area', schedule: 'Continuous', detectionTypes: ['Person', 'Vehicle'], status: 'running', lastRun: '30 sec ago', totalImages: 5420, alarmsToday: 3 },
    { id: '3', name: 'Fire & Smoke Detection', description: 'Monitor for fire and smoke in warehouse', sourceType: 'camera', sourceName: 'Camera 08 - Warehouse', schedule: 'Continuous', detectionTypes: ['Fire', 'Smoke'], status: 'paused', lastRun: '1 hour ago', totalImages: 890, alarmsToday: 0 },
    { id: '4', name: 'Batch Image Analysis', description: 'Analyze uploaded images from inspection folder', sourceType: 'folder', sourceName: '/uploads/inspections', schedule: 'Daily at 06:00', detectionTypes: ['Defect', 'Quality'], status: 'stopped', lastRun: 'Yesterday', totalImages: 450, alarmsToday: 0 },
    { id: '5', name: 'Remote Camera Feed', description: 'Analyze external camera feed', sourceType: 'url', sourceName: 'rtsp://remote-cam.example.com', schedule: 'Every 10 minutes', detectionTypes: ['Person', 'Vehicle'], status: 'error', lastRun: '3 hours ago', totalImages: 120, alarmsToday: 0 }
  ]);

  getCountByStatus(status: string): number { return this.tasks().filter(t => t.status === status).length; }

  getSourceIcon(type: string): string {
    const icons: Record<string, string> = { camera: 'videocam', folder: 'folder', url: 'link' };
    return icons[type] || 'source';
  }

  createTask() { console.log('Creating new task...'); }
  startTask(task: ImageTask) { task.status = 'running'; }
  pauseTask(task: ImageTask) { task.status = 'paused'; }
  stopTask(task: ImageTask) { task.status = 'stopped'; }
  editTask(task: ImageTask) { console.log('Editing task:', task.name); }
  viewLogs(task: ImageTask) { console.log('Viewing logs for:', task.name); }
  deleteTask(task: ImageTask) {
    if (confirm(`Delete task "${task.name}"?`)) {
      this.tasks.update(t => t.filter(x => x.id !== task.id));
    }
  }
}
