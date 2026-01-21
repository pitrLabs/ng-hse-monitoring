import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface Task {
  id: number;
  name: string;
  order: number;
  startTime: string;
  endTime: string;
  executiveStaff: string;
  assistanceStaff: string;
  status: 'not_started' | 'executing' | 'incomplete' | 'complete';
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="task-list-container">
      <!-- Filter Bar -->
      <div class="filter-bar glass-card-static">
        <div class="filter-group">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Task Name</mat-label>
            <input matInput [(ngModel)]="taskNameFilter" placeholder="Search task name...">
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field date-field">
            <mat-label>Time Range</mat-label>
            <input matInput [(ngModel)]="timeRange" placeholder="Select date range">
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field status-field">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter">
              <mat-option value="all">All</mat-option>
              <mat-option value="not_started">Not Started</mat-option>
              <mat-option value="executing">Executing</mat-option>
              <mat-option value="incomplete">Incomplete</mat-option>
              <mat-option value="complete">Complete</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="action-group">
          <button mat-button class="create-btn" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Task
          </button>
          <button mat-button class="query-btn" (click)="queryTasks()">
            <mat-icon>search</mat-icon>
            Query
          </button>
          <button mat-button class="post-btn" (click)="postTask()">
            <mat-icon>send</mat-icon>
            Post
          </button>
        </div>
      </div>

      <!-- Task Table -->
      <div class="task-table glass-card-static">
        <div class="table-header">
          <span class="col-name">Name</span>
          <span class="col-order">Order</span>
          <span class="col-start">Start Time</span>
          <span class="col-end">End Time</span>
          <span class="col-executive">Executive Staff</span>
          <span class="col-assistance">Assistance Staff</span>
          <span class="col-status">Status</span>
          <span class="col-operate">Operate</span>
        </div>

        <div class="table-body">
          @for (task of filteredTasks(); track task.id) {
            <div class="table-row" [class.selected]="selectedTask()?.id === task.id" (click)="selectTask(task)">
              <span class="col-name">{{ task.name }}</span>
              <span class="col-order">{{ task.order }}</span>
              <span class="col-start">{{ task.startTime }}</span>
              <span class="col-end">{{ task.endTime }}</span>
              <span class="col-executive">{{ task.executiveStaff }}</span>
              <span class="col-assistance">{{ task.assistanceStaff }}</span>
              <span class="col-status">
                <span class="status-badge" [class]="task.status">
                  {{ getStatusLabel(task.status) }}
                </span>
              </span>
              <span class="col-operate">
                <button mat-icon-button [matMenuTriggerFor]="taskMenu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #taskMenu="matMenu">
                  <button mat-menu-item (click)="viewTask(task)">
                    <mat-icon>visibility</mat-icon>
                    <span>View</span>
                  </button>
                  <button mat-menu-item (click)="editTask(task)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  @if (task.status === 'not_started') {
                    <button mat-menu-item (click)="startTask(task)">
                      <mat-icon>play_arrow</mat-icon>
                      <span>Start</span>
                    </button>
                  }
                  @if (task.status === 'executing') {
                    <button mat-menu-item (click)="completeTask(task)">
                      <mat-icon>check</mat-icon>
                      <span>Complete</span>
                    </button>
                  }
                  <button mat-menu-item class="delete-item" (click)="deleteTask(task)">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </span>
            </div>
          }

          @if (filteredTasks().length === 0) {
            <div class="empty-state">
              <mat-icon>assignment</mat-icon>
              <span>No tasks found</span>
              <button mat-button class="create-task-btn" (click)="openCreateDialog()">
                Create New Task
              </button>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div class="table-footer">
          <span class="total-info">Total: {{ filteredTasks().length }} tasks</span>
          <div class="pagination">
            <button mat-icon-button [disabled]="currentPage() === 1" (click)="prevPage()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
            <button mat-icon-button [disabled]="currentPage() === totalPages()" (click)="nextPage()">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Task Summary -->
      <div class="task-summary">
        <div class="summary-card glass-card-static">
          <div class="summary-icon not-started">
            <mat-icon>hourglass_empty</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ getStatusCount('not_started') }}</span>
            <span class="summary-label">Not Started</span>
          </div>
        </div>
        <div class="summary-card glass-card-static">
          <div class="summary-icon executing">
            <mat-icon>sync</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ getStatusCount('executing') }}</span>
            <span class="summary-label">Executing</span>
          </div>
        </div>
        <div class="summary-card glass-card-static">
          <div class="summary-icon incomplete">
            <mat-icon>warning</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ getStatusCount('incomplete') }}</span>
            <span class="summary-label">Incomplete</span>
          </div>
        </div>
        <div class="summary-card glass-card-static">
          <div class="summary-icon complete">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ getStatusCount('complete') }}</span>
            <span class="summary-label">Complete</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-list-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: calc(100vh - 118px);
    }

    // Filter Bar
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-field {
      width: 180px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    .date-field {
      width: 220px;
    }

    .status-field {
      width: 140px;
    }

    .action-group {
      display: flex;
      gap: 8px;
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

    .query-btn {
      background: var(--accent-primary);
      color: white;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .post-btn {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    // Task Table
    .task-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      padding: 14px 16px;
      background: var(--glass-bg);
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
      padding: 14px 16px;
      border-bottom: 1px solid var(--glass-border);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--glass-bg);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .col-name { flex: 1; min-width: 150px; font-size: 13px; color: var(--text-primary); font-weight: 500; }
    .col-order { width: 60px; font-size: 13px; color: var(--text-secondary); text-align: center; }
    .col-start, .col-end { width: 150px; font-size: 12px; color: var(--text-secondary); }
    .col-executive, .col-assistance { width: 120px; font-size: 12px; color: var(--text-secondary); }
    .col-status { width: 100px; }
    .col-operate { width: 60px; text-align: center; }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;

      &.not_started {
        background: rgba(107, 114, 128, 0.15);
        color: var(--text-secondary);
      }

      &.executing {
        background: rgba(0, 212, 255, 0.15);
        color: var(--accent-primary);
      }

      &.incomplete {
        background: rgba(245, 158, 11, 0.15);
        color: var(--warning);
      }

      &.complete {
        background: rgba(16, 185, 129, 0.15);
        color: var(--success);
      }
    }

    .delete-item {
      color: var(--error);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
      color: var(--text-muted);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      span {
        font-size: 14px;
      }

      .create-task-btn {
        margin-top: 8px;
        background: var(--accent-primary);
        color: white;
      }
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--glass-border);
    }

    .total-info {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: 8px;

      .page-info {
        font-size: 12px;
        color: var(--text-secondary);
        min-width: 60px;
        text-align: center;
      }
    }

    // Task Summary
    .task-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &.not-started {
        background: rgba(107, 114, 128, 0.15);
        mat-icon { color: var(--text-secondary); }
      }

      &.executing {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.incomplete {
        background: rgba(245, 158, 11, 0.15);
        mat-icon { color: var(--warning); }
      }

      &.complete {
        background: rgba(16, 185, 129, 0.15);
        mat-icon { color: var(--success); }
      }
    }

    .summary-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .summary-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-primary);
      }

      .summary-label {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    @media (max-width: 1200px) {
      .filter-bar {
        flex-direction: column;
      }

      .task-summary {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 800px) {
      .task-summary {
        grid-template-columns: 1fr;
      }

      .table-header, .table-row {
        .col-assistance, .col-executive {
          display: none;
        }
      }
    }
  `]
})
export class TaskListComponent {
  taskNameFilter = '';
  timeRange = '';
  statusFilter = 'all';

  selectedTask = signal<Task | null>(null);
  currentPage = signal(1);
  totalPages = signal(3);

  tasks = signal<Task[]>([
    { id: 1, name: 'Morning Patrol', order: 1, startTime: '2024-01-21 08:00', endTime: '2024-01-21 10:00', executiveStaff: 'John Doe', assistanceStaff: 'Jane Smith', status: 'complete' },
    { id: 2, name: 'Equipment Check', order: 2, startTime: '2024-01-21 10:00', endTime: '2024-01-21 12:00', executiveStaff: 'Bob Wilson', assistanceStaff: '-', status: 'executing' },
    { id: 3, name: 'Security Audit', order: 3, startTime: '2024-01-21 14:00', endTime: '2024-01-21 16:00', executiveStaff: 'Alice Brown', assistanceStaff: 'Tom Davis', status: 'not_started' },
    { id: 4, name: 'Fence Inspection', order: 4, startTime: '2024-01-21 16:00', endTime: '2024-01-21 18:00', executiveStaff: 'Chris Lee', assistanceStaff: '-', status: 'not_started' },
    { id: 5, name: 'Camera Maintenance', order: 5, startTime: '2024-01-20 09:00', endTime: '2024-01-20 11:00', executiveStaff: 'Mike Johnson', assistanceStaff: 'Sara White', status: 'incomplete' }
  ]);

  filteredTasks(): Task[] {
    let tasks = this.tasks();

    if (this.taskNameFilter) {
      tasks = tasks.filter(t =>
        t.name.toLowerCase().includes(this.taskNameFilter.toLowerCase())
      );
    }

    if (this.statusFilter !== 'all') {
      tasks = tasks.filter(t => t.status === this.statusFilter);
    }

    return tasks;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'not_started': 'Not Started',
      'executing': 'Executing',
      'incomplete': 'Incomplete',
      'complete': 'Complete'
    };
    return labels[status] || status;
  }

  getStatusCount(status: string): number {
    return this.tasks().filter(t => t.status === status).length;
  }

  selectTask(task: Task): void {
    this.selectedTask.set(task);
  }

  openCreateDialog(): void {
    console.log('Opening create dialog');
  }

  queryTasks(): void {
    console.log('Querying tasks');
  }

  postTask(): void {
    console.log('Posting task');
  }

  viewTask(task: Task): void {
    console.log('Viewing task:', task);
  }

  editTask(task: Task): void {
    console.log('Editing task:', task);
  }

  startTask(task: Task): void {
    const tasks = this.tasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index].status = 'executing';
      this.tasks.set([...tasks]);
    }
  }

  completeTask(task: Task): void {
    const tasks = this.tasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index].status = 'complete';
      this.tasks.set([...tasks]);
    }
  }

  deleteTask(task: Task): void {
    console.log('Deleting task:', task);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }
}
