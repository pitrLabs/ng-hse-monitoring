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
  selector: 'app-admin-alarms',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="admin-alarms">
      <div class="page-header">
        <div class="header-left">
          <h2>Alarm Management</h2>
          <span class="count">{{ alarms().length }} alarms</span>
        </div>
        <div class="header-right">
          <select [(ngModel)]="filterStatus" (change)="filterAlarms()">
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <button mat-stroked-button (click)="exportAlarms()">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="alarms-table">
          <div class="table-header">
            <div class="col-time">Time</div>
            <div class="col-type">Type</div>
            <div class="col-camera">Camera</div>
            <div class="col-status">Status</div>
            <div class="col-actions">Actions</div>
          </div>
          @for (alarm of filteredAlarms(); track alarm.id) {
            <div class="table-row" [class]="alarm.status">
              <div class="col-time">
                <span class="time-date">{{ alarm.alarm_time | date:'MMM d, yyyy' }}</span>
                <span class="time-hour">{{ alarm.alarm_time | date:'HH:mm:ss' }}</span>
              </div>
              <div class="col-type">
                <span class="type-badge" [class]="alarm.alarm_type">
                  {{ alarm.alarm_name || alarm.alarm_type }}
                </span>
              </div>
              <div class="col-camera">{{ alarm.camera_name || '-' }}</div>
              <div class="col-status">
                <span class="status-badge" [class]="alarm.status">{{ alarm.status }}</span>
              </div>
              <div class="col-actions">
                <button mat-icon-button matTooltip="View" (click)="viewAlarm(alarm)">
                  <mat-icon>visibility</mat-icon>
                </button>
                @if (alarm.status === 'new') {
                  <button mat-icon-button matTooltip="Acknowledge" (click)="acknowledgeAlarm(alarm)">
                    <mat-icon>check</mat-icon>
                  </button>
                }
                <button mat-icon-button matTooltip="Delete" (click)="deleteAlarm(alarm)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>notifications_off</mat-icon>
              <span>No alarms found</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-alarms { display: flex; flex-direction: column; gap: 24px; }

    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }

    .header-left {
      display: flex; align-items: center; gap: 12px;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
      .count { font-size: 14px; color: var(--text-tertiary); padding: 4px 12px; background: var(--glass-bg); border-radius: 20px; }
    }

    .header-right {
      display: flex; gap: 12px;
      select {
        padding: 8px 16px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
      }
    }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .alarms-table {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 150px 1fr 1fr 120px 120px;
      gap: 16px; padding: 16px 20px; align-items: center;
    }

    .table-header {
      background: var(--glass-bg-hover);
      font-weight: 600; font-size: 13px;
      color: var(--text-tertiary); text-transform: uppercase;
    }

    .table-row {
      border-top: 1px solid var(--glass-border);
      &:hover { background: var(--glass-bg-hover); }
      &.new { border-left: 3px solid #ef4444; }
      &.acknowledged { border-left: 3px solid #f59e0b; }
      &.resolved { border-left: 3px solid #22c55e; }
    }

    .col-time {
      display: flex; flex-direction: column;
      .time-date { font-size: 13px; color: var(--text-primary); }
      .time-hour { font-size: 12px; color: var(--text-tertiary); }
    }

    .type-badge {
      padding: 4px 10px; border-radius: 4px;
      font-size: 12px; font-weight: 500;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);

      &.NoHelmet, &.safety { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.Intrusion { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.Fire, &.Smoke { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
    }

    .status-badge {
      padding: 4px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 500; text-transform: capitalize;

      &.new { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
      &.acknowledged { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
      &.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    }

    .col-actions {
      display: flex; gap: 4px;
      button { color: var(--text-secondary); &:hover { color: var(--accent-primary); } }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
    }
  `]
})
export class AdminAlarmsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  alarms = signal<any[]>([]);
  filteredAlarms = signal<any[]>([]);
  filterStatus = '';

  ngOnInit() { this.loadAlarms(); }

  loadAlarms() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/alarms`).subscribe({
      next: (res) => {
        this.alarms.set(res);
        this.filteredAlarms.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filterAlarms() {
    if (!this.filterStatus) {
      this.filteredAlarms.set(this.alarms());
    } else {
      this.filteredAlarms.set(this.alarms().filter(a => a.status === this.filterStatus));
    }
  }

  viewAlarm(alarm: any) { console.log('View alarm', alarm); }
  acknowledgeAlarm(alarm: any) {
    this.http.patch(`${this.apiUrl}/alarms/${alarm.id}`, { status: 'acknowledged' }).subscribe(() => this.loadAlarms());
  }
  deleteAlarm(alarm: any) {
    if (confirm('Delete this alarm?')) {
      this.http.delete(`${this.apiUrl}/alarms/${alarm.id}`).subscribe(() => this.loadAlarms());
    }
  }
  exportAlarms() { console.log('Export alarms'); }
}
