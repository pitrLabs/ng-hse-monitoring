import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface AlarmType {
  id: string;
  name: string;
  code: string;
  severity: Severity;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
}

@Component({
  selector: 'app-admin-alarm-type',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="alarm-type-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Alarm Type Configuration</h2>
          <p class="subtitle">Configure alarm types and notification settings</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="enableAll()">
            <mat-icon>check_circle</mat-icon>
            Enable All
          </button>
          <button class="action-btn secondary" (click)="disableAll()">
            <mat-icon>cancel</mat-icon>
            Disable All
          </button>
          <button class="action-btn primary" (click)="openDialog()">
            <mat-icon>add</mat-icon>
            Add Alarm Type
          </button>
        </div>
      </div>

      <div class="severity-legend">
        <div class="legend-item critical"><span class="dot"></span> Critical</div>
        <div class="legend-item high"><span class="dot"></span> High</div>
        <div class="legend-item medium"><span class="dot"></span> Medium</div>
        <div class="legend-item low"><span class="dot"></span> Low</div>
      </div>

      <div class="alarm-grid">
        @for (alarm of alarmTypes(); track alarm.id) {
          <div class="alarm-card" [class]="alarm.severity">
            <div class="card-header">
              <div class="alarm-icon" [style.background]="alarm.color">
                <mat-icon>{{ alarm.icon }}</mat-icon>
              </div>
              <div class="alarm-info">
                <h3>{{ alarm.name }}</h3>
                <span class="code">{{ alarm.code }}</span>
              </div>
              <div class="card-actions">
                <button mat-icon-button (click)="editAlarm(alarm)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteAlarm(alarm)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <p class="description">{{ alarm.description }}</p>
            <div class="toggle-group">
              <div class="toggle-item">
                <span>Enabled</span>
                <mat-slide-toggle [(ngModel)]="alarm.enabled" color="primary"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Sound</span>
                <mat-slide-toggle [(ngModel)]="alarm.soundEnabled" color="primary"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Push</span>
                <mat-slide-toggle [(ngModel)]="alarm.pushEnabled" color="primary"></mat-slide-toggle>
              </div>
            </div>
          </div>
        }
      </div>

      @if (showDialog()) {
        <div class="dialog-overlay" (click)="closeDialog()">
          <div class="dialog-content" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>{{ editMode() ? 'Edit' : 'Add' }} Alarm Type</h3>
              <button mat-icon-button (click)="closeDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="formData.name">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Code</mat-label>
                <input matInput [(ngModel)]="formData.code">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Severity</mat-label>
                <mat-select [(ngModel)]="formData.severity">
                  <mat-option value="critical">Critical</mat-option>
                  <mat-option value="high">High</mat-option>
                  <mat-option value="medium">Medium</mat-option>
                  <mat-option value="low">Low</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Icon</mat-label>
                <input matInput [(ngModel)]="formData.icon">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Color</mat-label>
                <input matInput type="color" [(ngModel)]="formData.color">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <textarea matInput [(ngModel)]="formData.description" rows="3"></textarea>
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button class="action-btn secondary" (click)="closeDialog()">Cancel</button>
              <button class="action-btn primary" (click)="saveAlarm()">Save</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .alarm-type-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .severity-legend { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border); }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
    .legend-item .dot { width: 12px; height: 12px; border-radius: 50%; }
    .legend-item.critical .dot { background: #ef4444; }
    .legend-item.high .dot { background: #f97316; }
    .legend-item.medium .dot { background: #eab308; }
    .legend-item.low .dot { background: #22c55e; }

    .alarm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .alarm-card { background: var(--glass-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--glass-border); transition: all 0.2s; }
    .alarm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .alarm-card.critical { border-left: 4px solid #ef4444; }
    .alarm-card.high { border-left: 4px solid #f97316; }
    .alarm-card.medium { border-left: 4px solid #eab308; }
    .alarm-card.low { border-left: 4px solid #22c55e; }

    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .alarm-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .alarm-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .alarm-info { flex: 1; }
    .alarm-info h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
    .alarm-info .code { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .card-actions { display: flex; gap: 4px; }
    .card-actions button { color: var(--text-secondary); }
    .description { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; line-height: 1.5; }

    .toggle-group { display: flex; gap: 16px; padding-top: 16px; border-top: 1px solid var(--glass-border); }
    .toggle-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }

    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog-content { background: var(--glass-bg); border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow: auto; }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--glass-border); }
    .dialog-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    .dialog-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .dialog-body mat-form-field { width: 100%; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid var(--glass-border); }
  `]
})
export class AdminAlarmTypeComponent {
  showDialog = signal(false);
  editMode = signal(false);

  formData: Omit<AlarmType, 'enabled' | 'soundEnabled' | 'pushEnabled'> = {
    id: '',
    name: '',
    code: '',
    severity: 'medium',
    icon: 'warning',
    color: '#f59e0b',
    description: ''
  };

  alarmTypes = signal<AlarmType[]>([
    { id: '1', name: 'No Helmet', code: 'ALM_HELMET', severity: 'critical', icon: 'engineering', color: '#ef4444', description: 'Worker detected without safety helmet', enabled: true, soundEnabled: true, pushEnabled: true },
    { id: '2', name: 'Fire Detection', code: 'ALM_FIRE', severity: 'critical', icon: 'local_fire_department', color: '#dc2626', description: 'Fire or flames detected in monitored area', enabled: true, soundEnabled: true, pushEnabled: true },
    { id: '3', name: 'Smoke Detection', code: 'ALM_SMOKE', severity: 'high', icon: 'cloud', color: '#f97316', description: 'Smoke detected in monitored area', enabled: true, soundEnabled: true, pushEnabled: false },
    { id: '4', name: 'No Safety Vest', code: 'ALM_VEST', severity: 'high', icon: 'checkroom', color: '#ea580c', description: 'Worker detected without high-visibility vest', enabled: true, soundEnabled: false, pushEnabled: true },
    { id: '5', name: 'Restricted Area', code: 'ALM_ZONE', severity: 'medium', icon: 'block', color: '#eab308', description: 'Unauthorized access to restricted zone', enabled: true, soundEnabled: true, pushEnabled: true },
    { id: '6', name: 'Speed Violation', code: 'ALM_SPEED', severity: 'low', icon: 'speed', color: '#22c55e', description: 'Vehicle exceeding speed limit', enabled: false, soundEnabled: false, pushEnabled: false }
  ]);

  openDialog() {
    this.editMode.set(false);
    this.formData = { id: '', name: '', code: '', severity: 'medium', icon: 'warning', color: '#f59e0b', description: '' };
    this.showDialog.set(true);
  }

  editAlarm(alarm: AlarmType) {
    this.editMode.set(true);
    this.formData = { ...alarm };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  saveAlarm() {
    if (this.editMode()) {
      this.alarmTypes.update(types =>
        types.map(t =>
          t.id === this.formData.id
            ? { ...t, ...this.formData }
            : t
        )
      );
    } else {
      const newAlarm: AlarmType = {
        ...this.formData,
        id: Date.now().toString(),
        enabled: true,
        soundEnabled: true,
        pushEnabled: true
      };

      this.alarmTypes.update(types => [...types, newAlarm]);
    }

    this.closeDialog();
  }

  deleteAlarm(alarm: AlarmType) {
    if (confirm(`Delete alarm type "${alarm.name}"?`)) {
      this.alarmTypes.update(types => types.filter(t => t.id !== alarm.id));
    }
  }

  enableAll() {
    this.alarmTypes.update(types => types.map(t => ({ ...t, enabled: true })));
  }

  disableAll() {
    this.alarmTypes.update(types => types.map(t => ({ ...t, enabled: false })));
  }
}
