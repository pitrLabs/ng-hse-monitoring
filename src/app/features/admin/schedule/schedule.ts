import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { BmappSchedule } from '../../../core/models/analytics.model';
import { AIBoxService } from '../../../core/services/aibox.service';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

@Component({
  standalone: true,
  selector: 'app-admin-schedule',
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule, MatInputModule,
    MatTooltipModule
  ],
  template: `
    <div class="admin-schedule">
      <div class="page-header">
        <div class="header-left">
          <h2>Schedule Management</h2>
          <p class="subtitle">Manage AI task schedules on BM-APP</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
            <mat-select [(ngModel)]="selectedAiBoxId" (ngModelChange)="onAiBoxChange()">
              <mat-option value="">Default Box</mat-option>
              @for (box of aiBoxService.aiBoxes(); track box.id) {
                <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
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
                  <span>{{ parseScheduleLabel(schedule.Value) }}</span>
                </div>
                @if (schedule.Id === -1) {
                  <span class="default-badge">Default Schedule</span>
                }
                @if (schedule.Value && schedule.Value.length === 336) {
                  <div class="mini-grid">
                    @for (day of daysArray; track day; let d = $index) {
                      <div class="mini-row">
                        <span class="mini-day">{{ day }}</span>
                        <div class="mini-slots">
                          @for (hour of hoursArray; track hour) {
                            <div class="mini-slot"
                              [class.active]="isHourActive(schedule.Value, d, hour)"
                              [matTooltip]="hour + ':00'">
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
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
          <div class="dialog-content wide" (click)="$event.stopPropagation()">
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

              <!-- Quick Presets -->
              <div class="preset-section">
                <span class="preset-label">Quick Presets:</span>
                <div class="preset-btns">
                  <button class="preset-btn" (click)="applyPreset('247')">24/7 (Always On)</button>
                  <button class="preset-btn" (click)="applyPreset('workdays')">Mon–Fri 08:00–17:00</button>
                  <button class="preset-btn" (click)="applyPreset('alldays')">All Days 08:00–17:00</button>
                  <button class="preset-btn danger" (click)="applyPreset('clear')">Clear All</button>
                </div>
              </div>

              <!-- Weekly Grid -->
              <div class="grid-section">
                <div class="grid-legend">
                  <div class="legend-item active-sample"></div><span>Active</span>
                  <div class="legend-item inactive-sample"></div><span>Inactive</span>
                  <span class="legend-hint">Click to toggle hours</span>
                </div>
                <div class="week-grid">
                  <!-- Hour headers -->
                  <div class="grid-row header-row">
                    <div class="day-label"></div>
                    @for (h of hoursArray; track h) {
                      <div class="hour-header">{{ h | number:'2.0-0' }}</div>
                    }
                    <div class="row-actions-placeholder"></div>
                  </div>
                  <!-- Day rows -->
                  @for (day of daysArray; track day; let d = $index) {
                    <div class="grid-row">
                      <div class="day-label">{{ day }}</div>
                      @for (h of hoursArray; track h) {
                        <div class="hour-cell"
                          [class.active]="grid[d][h]"
                          (click)="toggleHour(d, h)"
                          [matTooltip]="day + ' ' + (h | number:'2.0-0') + ':00'">
                        </div>
                      }
                      <div class="row-actions">
                        <button class="row-btn" (click)="setDayAll(d, true)" matTooltip="Select all hours">All</button>
                        <button class="row-btn" (click)="setDayAll(d, false)" matTooltip="Clear all hours">Off</button>
                      </div>
                    </div>
                  }
                </div>
                <div class="grid-summary">
                  <mat-icon>info_outline</mat-icon>
                  <span>{{ getGridSummary() }}</span>
                </div>
              </div>
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

    .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

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
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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
      color: #ef4444; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .delete-btn:hover { background: rgba(239, 68, 68, 0.2); }
    .delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .delete-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .schedule-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

    .schedule-value {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; color: var(--text-secondary);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent-primary); }
    }

    .default-badge {
      display: inline-block;
      padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
      background: rgba(139, 92, 246, 0.1); color: #8b5cf6;
    }

    /* Mini grid in schedule card */
    .mini-grid { display: flex; flex-direction: column; gap: 2px; }
    .mini-row { display: flex; align-items: center; gap: 4px; }
    .mini-day { font-size: 10px; color: var(--text-tertiary); width: 24px; text-align: right; }
    .mini-slots { display: flex; gap: 1px; }
    .mini-slot {
      width: 8px; height: 8px; border-radius: 1px;
      background: var(--glass-border);
      &.active { background: var(--accent-primary); }
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; }
    }

    /* Dialog */
    .dialog-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }

    .dialog-content {
      background: var(--bg-secondary);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto;
    }
    .dialog-content.wide { max-width: 740px; }
    .dialog-content.small { max-width: 400px; }

    .dialog-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    }

    .close-btn {
      width: 32px; height: 32px; border: none; border-radius: 8px;
      background: var(--glass-bg-hover); color: var(--text-secondary); cursor: pointer;
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

    /* Presets */
    .preset-section { display: flex; flex-direction: column; gap: 8px; }
    .preset-label { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
    .preset-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .preset-btn {
      padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
      background: var(--glass-bg); color: var(--text-secondary);
      border: 1px solid var(--glass-border); transition: all 0.2s;
      &:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
      &.danger { color: #ef4444; border-color: rgba(239,68,68,0.3); }
    }

    /* Weekly grid */
    .grid-section { display: flex; flex-direction: column; gap: 8px; }

    .grid-legend {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: var(--text-tertiary);
    }
    .legend-item {
      width: 14px; height: 14px; border-radius: 2px;
      &.active-sample { background: var(--accent-primary); }
      &.inactive-sample { background: var(--glass-border); }
    }
    .legend-hint { margin-left: auto; font-style: italic; }

    .week-grid { display: flex; flex-direction: column; gap: 2px; }

    .grid-row { display: flex; align-items: center; gap: 2px; }

    .header-row { margin-bottom: 4px; }

    .day-label {
      width: 32px; font-size: 11px; color: var(--text-tertiary);
      text-align: right; flex-shrink: 0; padding-right: 4px;
    }

    .hour-header {
      flex: 1; font-size: 9px; color: var(--text-tertiary);
      text-align: center; min-width: 20px;
    }

    .hour-cell {
      flex: 1; height: 24px; min-width: 20px;
      border-radius: 2px; cursor: pointer;
      background: var(--glass-border); transition: background 0.1s;
      &:hover { background: rgba(0, 212, 255, 0.3); }
      &.active { background: var(--accent-primary); }
    }

    .row-actions-placeholder { width: 60px; flex-shrink: 0; }
    .row-actions {
      display: flex; gap: 2px; width: 60px; flex-shrink: 0;
    }
    .row-btn {
      padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;
      background: var(--glass-bg); color: var(--text-tertiary);
      border: 1px solid var(--glass-border);
      &:hover { color: var(--text-primary); }
    }

    .grid-summary {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--text-secondary); padding-top: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--accent-primary); }
    }
  `]
})
export class AdminScheduleComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private snackBar = inject(MatSnackBar);
  aiBoxService = inject(AIBoxService);

  readonly daysArray = DAYS;
  readonly hoursArray = HOURS;

  selectedAiBoxId = '';

  schedules = signal<BmappSchedule[]>([]);
  loading = signal(true);
  creating = signal(false);
  deleting = signal(false);
  showCreateDialog = signal(false);
  scheduleToDelete = signal<BmappSchedule | null>(null);

  newSchedule = { name: '', summary: '' };

  // 7 days × 24 hours grid (Mon=0 ... Sun=6)
  grid: boolean[][] = Array.from({ length: 7 }, () => Array(24).fill(false));

  ngOnInit(): void {
    this.aiBoxService.loadAiBoxes().subscribe();
    this.loadSchedules();
  }

  onAiBoxChange(): void {
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.analyticsService.getSchedulesBmapp(this.selectedAiBoxId || undefined).subscribe({
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
    this.newSchedule = { name: '', summary: '' };
    this.grid = Array.from({ length: 7 }, () => Array(24).fill(false));
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  toggleHour(day: number, hour: number): void {
    this.grid[day][hour] = !this.grid[day][hour];
    // Trigger change detection
    this.grid = this.grid.map(row => [...row]);
  }

  setDayAll(day: number, value: boolean): void {
    this.grid[day] = Array(24).fill(value);
    this.grid = [...this.grid];
  }

  applyPreset(preset: string): void {
    switch (preset) {
      case '247':
        this.grid = Array.from({ length: 7 }, () => Array(24).fill(true));
        break;
      case 'workdays':
        // Mon–Fri (0–4) 08:00–17:00
        this.grid = Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: 24 }, (_, h) => d < 5 && h >= 8 && h < 17)
        );
        break;
      case 'alldays':
        // All days 08:00–17:00
        this.grid = Array.from({ length: 7 }, () =>
          Array.from({ length: 24 }, (_, h) => h >= 8 && h < 17)
        );
        break;
      case 'clear':
        this.grid = Array.from({ length: 7 }, () => Array(24).fill(false));
        break;
    }
  }

  /** Convert grid (7×24 bool) to BM-APP 336-bit binary string (7 days × 48 half-hour slots) */
  buildScheduleValue(): string {
    let bits = '';
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Each hour = 2 half-hour slots
        const active = this.grid[day][hour] ? '1' : '0';
        bits += active + active;
      }
    }
    return bits; // 336 characters
  }

  getGridSummary(): string {
    const totalActive = this.grid.reduce((sum, day) => sum + day.filter(Boolean).length, 0);
    if (totalActive === 0) return 'No active hours selected (all off)';
    if (totalActive === 168) return '24/7 — always active';
    const hours = totalActive;
    const days = this.grid.filter(day => day.some(Boolean)).length;
    return `${hours} hour${hours !== 1 ? 's' : ''} active across ${days} day${days !== 1 ? 's' : ''}`;
  }

  createSchedule(): void {
    if (!this.newSchedule.name) return;

    const value = this.buildScheduleValue();
    this.creating.set(true);
    this.analyticsService.createSchedule(
      this.newSchedule.name,
      this.newSchedule.summary,
      value
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

  /** Parse 336-bit binary string to human-readable label */
  parseScheduleLabel(value: string): string {
    if (!value || value.length !== 336) return 'All time (24/7)';
    if (value === '1'.repeat(336)) return '24/7 — Always active';
    if (value === '0'.repeat(336)) return 'Inactive (all off)';

    // Build active hour ranges per day
    const dayRanges: string[] = [];
    for (let d = 0; d < 7; d++) {
      const activeHours: number[] = [];
      for (let h = 0; h < 24; h++) {
        // Each hour = 2 half-hour slots at positions [d*48 + h*2] and [d*48+h*2+1]
        const pos = d * 48 + h * 2;
        if (value[pos] === '1') activeHours.push(h);
      }
      if (activeHours.length === 0) continue;
      if (activeHours.length === 24) {
        dayRanges.push(`${DAYS[d]}: all day`);
        continue;
      }
      // Compress consecutive hours into ranges
      let rangeStr = '';
      let start = activeHours[0];
      let prev = activeHours[0];
      for (let i = 1; i <= activeHours.length; i++) {
        if (i < activeHours.length && activeHours[i] === prev + 1) {
          prev = activeHours[i];
        } else {
          rangeStr += (rangeStr ? ', ' : '') + `${String(start).padStart(2, '0')}:00–${String(prev + 1).padStart(2, '0')}:00`;
          if (i < activeHours.length) { start = activeHours[i]; prev = activeHours[i]; }
        }
      }
      dayRanges.push(`${DAYS[d]}: ${rangeStr}`);
    }

    if (dayRanges.length === 0) return 'Inactive (all off)';
    // If all 7 days have same pattern, simplify
    if (dayRanges.length <= 3) return dayRanges.join(' | ');
    return `${dayRanges.length} days active`;
  }

  /** Check if a specific hour is active in a 336-bit string (for mini-grid display) */
  isHourActive(value: string, day: number, hour: number): boolean {
    if (!value || value.length !== 336) return true; // default schedule = all active
    const pos = day * 48 + hour * 2;
    return value[pos] === '1';
  }
}
