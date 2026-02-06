import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { BmappSchedule } from '../../../core/models/analytics.model';

@Component({
  standalone: true,
  selector: 'app-admin-schedule',
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="admin-schedule">
      <div class="page-header">
        <div class="header-left">
          <h2>Schedule Management</h2>
          <p class="subtitle">Manage AI task schedules on BM-APP</p>
        </div>
        <div class="header-actions">
          <button class="action-btn primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add Schedule
          </button>
          <button class="action-btn" (click)="loadSchedules()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Loading schedules from BM-APP...</span>
        </div>
      } @else {
        <div class="schedule-grid">
          @for (schedule of schedules(); track schedule.Id) {
            <div class="schedule-card" [class.default]="schedule.Id === -1">
              <div class="schedule-header">
                <div class="schedule-icon" [class]="getScheduleClass(schedule)">
                  <mat-icon>{{ getScheduleIcon(schedule) }}</mat-icon>
                </div>
                <div class="schedule-info">
                  <h3>{{ schedule.Name }}</h3>
                  <span class="schedule-summary">{{ schedule.Summary || 'No description' }}</span>
                </div>
                @if (schedule.Id !== -1) {
                  <button class="delete-btn" (click)="confirmDelete(schedule)" [disabled]="deleting()">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </div>
              <div class="schedule-body">
                <div class="schedule-value">
                  <mat-icon>access_time</mat-icon>
                  <span>{{ schedule.Value || 'All time (24/7)' }}</span>
                </div>
                @if (schedule.Id === -1) {
                  <span class="default-badge">Default Schedule</span>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>schedule</mat-icon>
              <span>No schedules found</span>
              <button class="action-btn primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Create First Schedule
              </button>
            </div>
          }
        </div>
      }

      <!-- Create Dialog -->
      @if (showCreateDialog()) {
        <div class="dialog-overlay" (click)="closeCreateDialog()">
          <div class="dialog-content" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Create New Schedule</h3>
              <button class="close-btn" (click)="closeCreateDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <mat-form-field appearance="outline">
                <mat-label>Schedule Name</mat-label>
                <input matInput [(ngModel)]="newSchedule.name" placeholder="e.g., Work Hours">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <input matInput [(ngModel)]="newSchedule.summary" placeholder="e.g., Monday to Friday working hours">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Time Range</mat-label>
                <input matInput [(ngModel)]="newSchedule.value" placeholder="e.g., 08:00-17:00">
                <mat-hint>Format: HH:MM-HH:MM (leave empty for all time)</mat-hint>
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button class="action-btn" (click)="closeCreateDialog()">Cancel</button>
              <button class="action-btn primary" (click)="createSchedule()" [disabled]="creating() || !newSchedule.name">
                @if (creating()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>add</mat-icon>
                }
                Create
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Dialog -->
      @if (scheduleToDelete()) {
        <div class="dialog-overlay" (click)="cancelDelete()">
          <div class="dialog-content small" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Delete Schedule</h3>
            </div>
            <div class="dialog-body">
              <p>Are you sure you want to delete <strong>{{ scheduleToDelete()?.Name }}</strong>?</p>
              <p class="warning">This action cannot be undone.</p>
            </div>
            <div class="dialog-actions">
              <button class="action-btn" (click)="cancelDelete()">Cancel</button>
              <button class="action-btn danger" (click)="deleteSchedule()" [disabled]="deleting()">
                @if (deleting()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>delete</mat-icon>
                }
                Delete
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-schedule { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;
    }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

    .header-actions { display: flex; gap: 8px; align-items: center; }

    .action-btn {
      display: flex; align-items: center; gap: 8px; padding: 10px 20px;
      border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
      background: var(--glass-bg); color: var(--text-primary);
      border: 1px solid var(--glass-border); transition: all 0.2s;
    }
    .action-btn:hover { background: var(--glass-bg-hover); }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; border: none; }
    .action-btn.primary:hover { filter: brightness(1.1); }
    .action-btn.danger { background: #ef4444; color: white; border: none; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .action-btn mat-spinner { display: inline-block; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
    }

    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .schedule-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s;
    }
    .schedule-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .schedule-card.default { border-left: 4px solid var(--accent-primary); }

    .schedule-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .schedule-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }

      &.default { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
      &.custom { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    }

    .schedule-info {
      flex: 1;
      h3 { margin: 0 0 4px; font-size: 16px; color: var(--text-primary); }
      .schedule-summary { font-size: 13px; color: var(--text-secondary); }
    }

    .delete-btn {
      width: 36px; height: 36px;
      border: none; border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .delete-btn:hover { background: rgba(239, 68, 68, 0.2); }
    .delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .delete-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .schedule-body { padding: 16px 20px; }

    .schedule-value {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; color: var(--text-secondary);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent-primary); }
    }

    .default-badge {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; }
    }

    // Dialog styles
    .dialog-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }

    .dialog-content {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto;
    }
    .dialog-content.small { max-width: 400px; }

    .dialog-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    }

    .close-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 8px;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }

    .dialog-body {
      padding: 24px;
      display: flex; flex-direction: column; gap: 16px;
      p { margin: 0; color: var(--text-secondary); }
      .warning { color: #ef4444; font-size: 13px; }
    }

    .dialog-body mat-form-field { width: 100%; }

    .dialog-actions {
      display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--glass-border);
    }
  `]
})
export class AdminScheduleComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private snackBar = inject(MatSnackBar);

  schedules = signal<BmappSchedule[]>([]);
  loading = signal(true);
  creating = signal(false);
  deleting = signal(false);
  showCreateDialog = signal(false);
  scheduleToDelete = signal<BmappSchedule | null>(null);

  newSchedule = { name: '', summary: '', value: '' };

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.analyticsService.getSchedulesBmapp().subscribe({
      next: (data) => {
        this.schedules.set(data.schedules || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load schedules:', err);
        this.snackBar.open('Failed to load schedules from BM-APP', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    this.newSchedule = { name: '', summary: '', value: '' };
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  createSchedule(): void {
    if (!this.newSchedule.name) return;

    this.creating.set(true);
    this.analyticsService.createSchedule(
      this.newSchedule.name,
      this.newSchedule.summary,
      this.newSchedule.value
    ).subscribe({
      next: () => {
        this.snackBar.open('Schedule created successfully', 'Close', { duration: 3000 });
        this.creating.set(false);
        this.closeCreateDialog();
        this.loadSchedules();
      },
      error: (err) => {
        console.error('Failed to create schedule:', err);
        this.snackBar.open('Failed to create schedule', 'Close', { duration: 3000 });
        this.creating.set(false);
      }
    });
  }

  confirmDelete(schedule: BmappSchedule): void {
    this.scheduleToDelete.set(schedule);
  }

  cancelDelete(): void {
    this.scheduleToDelete.set(null);
  }

  deleteSchedule(): void {
    const schedule = this.scheduleToDelete();
    if (!schedule) return;

    this.deleting.set(true);
    this.analyticsService.deleteSchedule(schedule.Id).subscribe({
      next: () => {
        this.snackBar.open('Schedule deleted successfully', 'Close', { duration: 3000 });
        this.deleting.set(false);
        this.scheduleToDelete.set(null);
        this.loadSchedules();
      },
      error: (err) => {
        console.error('Failed to delete schedule:', err);
        this.snackBar.open('Failed to delete schedule', 'Close', { duration: 3000 });
        this.deleting.set(false);
      }
    });
  }

  getScheduleIcon(schedule: BmappSchedule): string {
    return schedule.Id === -1 ? 'all_inclusive' : 'schedule';
  }

  getScheduleClass(schedule: BmappSchedule): string {
    return schedule.Id === -1 ? 'default' : 'custom';
  }
}
