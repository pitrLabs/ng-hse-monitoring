import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-admin-schedule',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="admin-schedule">
      <div class="page-header">
        <h2>Schedule Management</h2>
        <button mat-raised-button class="btn-primary" (click)="createSchedule()">
          <mat-icon>add</mat-icon>
          Add Schedule
        </button>
      </div>

      <div class="schedule-grid">
        @for (schedule of schedules(); track schedule.id) {
          <div class="schedule-card">
            <div class="schedule-header">
              <div class="schedule-icon" [class]="schedule.type">
                <mat-icon>{{ schedule.icon }}</mat-icon>
              </div>
              <div class="schedule-info">
                <h3>{{ schedule.name }}</h3>
                <span class="schedule-time">{{ schedule.time }}</span>
              </div>
              <div class="schedule-toggle">
                <button mat-icon-button (click)="toggleSchedule(schedule)">
                  <mat-icon>{{ schedule.enabled ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                </button>
              </div>
            </div>
            <div class="schedule-body">
              <div class="schedule-days">
                @for (day of days; track day) {
                  <span class="day-badge" [class.active]="schedule.days.includes(day)">{{ day }}</span>
                }
              </div>
              <p class="schedule-desc">{{ schedule.description }}</p>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>schedule</mat-icon>
            <span>No schedules configured</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-schedule { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
    }

    .btn-primary { background: var(--accent-gradient) !important; color: white !important; }

    .schedule-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .schedule-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .schedule-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .schedule-icon {
      width: 48px; height: 48px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; }

      &.task { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      &.backup { background: linear-gradient(135deg, #22c55e, #15803d); }
      &.cleanup { background: linear-gradient(135deg, #f59e0b, #d97706); }
    }

    .schedule-info {
      flex: 1;
      h3 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); }
      .schedule-time { font-size: 12px; color: var(--accent-primary); }
    }

    .schedule-toggle button {
      color: var(--text-secondary);
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }

    .schedule-body { padding: 16px 20px; }

    .schedule-days {
      display: flex; gap: 6px; margin-bottom: 12px;
    }

    .day-badge {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600;
      background: var(--glass-bg-hover);
      color: var(--text-tertiary);

      &.active { background: var(--accent-gradient); color: white; }
    }

    .schedule-desc { margin: 0; font-size: 13px; color: var(--text-secondary); }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
  `]
})
export class AdminScheduleComponent {
  days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  schedules = signal([
    { id: 1, name: 'Daily Backup', time: '02:00 AM', type: 'backup', icon: 'backup', enabled: true, days: ['M', 'T', 'W', 'T', 'F'], description: 'Automatic database backup' },
    { id: 2, name: 'Cleanup Old Alarms', time: '03:00 AM', type: 'cleanup', icon: 'delete_sweep', enabled: true, days: ['S'], description: 'Remove alarms older than 30 days' },
    { id: 3, name: 'AI Task Restart', time: '06:00 AM', type: 'task', icon: 'restart_alt', enabled: false, days: ['M'], description: 'Weekly restart of all AI tasks' }
  ]);

  createSchedule() { console.log('Create schedule'); }
  toggleSchedule(schedule: any) {
    const idx = this.schedules().findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      const updated = [...this.schedules()];
      updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
      this.schedules.set(updated);
    }
  }
}
