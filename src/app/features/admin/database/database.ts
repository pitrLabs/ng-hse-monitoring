import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface DatabaseInfo {
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  status: 'connected' | 'disconnected' | 'error';
  size: string;
  tables: number;
  lastBackup: string;
}

@Component({
  selector: 'app-admin-database',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="database-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Database Configuration</h2>
          <p class="subtitle">Manage database connections and backups</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="testConnection()">
            <mat-icon>sync</mat-icon>
            Test Connection
          </button>
          <button class="action-btn primary" (click)="createBackup()">
            <mat-icon>backup</mat-icon>
            Create Backup
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon>storage</mat-icon>
          <div class="stat-info">
            <span class="value">{{ dbInfo().size }}</span>
            <span class="label">Database Size</span>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon>table_chart</mat-icon>
          <div class="stat-info">
            <span class="value">{{ dbInfo().tables }}</span>
            <span class="label">Tables</span>
          </div>
        </div>
        <div class="stat-card" [class]="dbInfo().status">
          <mat-icon>{{ dbInfo().status === 'connected' ? 'check_circle' : 'error' }}</mat-icon>
          <div class="stat-info">
            <span class="value status-text">{{ dbInfo().status | titlecase }}</span>
            <span class="label">Connection Status</span>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon>schedule</mat-icon>
          <div class="stat-info">
            <span class="value">{{ dbInfo().lastBackup }}</span>
            <span class="label">Last Backup</span>
          </div>
        </div>
      </div>

      <div class="config-grid">
        <div class="config-card">
          <h3><mat-icon>settings</mat-icon> Connection Settings</h3>
          <div class="form-group">
            <label>Database Type</label>
            <select [(ngModel)]="dbInfo().type">
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
          <div class="form-group">
            <label>Host</label>
            <input type="text" [(ngModel)]="dbInfo().host" placeholder="localhost">
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="number" [(ngModel)]="dbInfo().port" placeholder="5432">
          </div>
          <div class="form-group">
            <label>Database Name</label>
            <input type="text" [(ngModel)]="dbInfo().database" placeholder="hse_monitoring">
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" [(ngModel)]="username" placeholder="admin">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" placeholder="••••••••">
          </div>
          <button class="action-btn primary full-width" (click)="saveConnection()">
            <mat-icon>save</mat-icon>
            Save Connection
          </button>
        </div>

        <div class="config-card">
          <h3><mat-icon>backup</mat-icon> Backup Settings</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Auto Backup</span>
              <span class="setting-desc">Enable automatic database backups</span>
            </div>
            <mat-slide-toggle [(ngModel)]="autoBackup" color="primary"></mat-slide-toggle>
          </div>
          @if (autoBackup) {
            <div class="form-group">
              <label>Backup Schedule</label>
              <select [(ngModel)]="backupSchedule">
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div class="form-group">
              <label>Retention Period</label>
              <select [(ngModel)]="retentionPeriod">
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          }
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Compress Backups</span>
              <span class="setting-desc">Compress backup files to save space</span>
            </div>
            <mat-slide-toggle [(ngModel)]="compressBackups" color="primary"></mat-slide-toggle>
          </div>
          <div class="backup-list">
            <h4>Recent Backups</h4>
            @for (backup of recentBackups(); track backup.id) {
              <div class="backup-item">
                <mat-icon>archive</mat-icon>
                <div class="backup-info">
                  <span class="backup-name">{{ backup.name }}</span>
                  <span class="backup-date">{{ backup.date }} - {{ backup.size }}</span>
                </div>
                <button mat-icon-button (click)="restoreBackup(backup)">
                  <mat-icon>restore</mat-icon>
                </button>
                <button mat-icon-button (click)="downloadBackup(backup)">
                  <mat-icon>download</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .database-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn.full-width { width: 100%; justify-content: center; margin-top: 16px; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
    .stat-card.connected mat-icon { color: #22c55e; }
    .stat-card.disconnected mat-icon, .stat-card.error mat-icon { color: #ef4444; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 20px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .config-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; }
    .config-card h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 20px; font-size: 16px; color: var(--text-primary); }
    .config-card h3 mat-icon { color: var(--accent-primary); }
    .config-card h4 { margin: 20px 0 12px; font-size: 14px; color: var(--text-secondary); }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
    .form-group input, .form-group select { width: 100%; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-primary); }

    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--glass-border); }
    .setting-row:last-of-type { border-bottom: none; }
    .setting-info { display: flex; flex-direction: column; gap: 2px; }
    .setting-label { font-size: 14px; color: var(--text-primary); }
    .setting-desc { font-size: 12px; color: var(--text-muted); }

    .backup-list { margin-top: 16px; }
    .backup-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 8px; }
    .backup-item mat-icon { color: var(--accent-primary); }
    .backup-info { flex: 1; display: flex; flex-direction: column; }
    .backup-name { font-size: 13px; color: var(--text-primary); }
    .backup-date { font-size: 11px; color: var(--text-muted); }
    .backup-item button { color: var(--text-secondary); }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .config-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDatabaseComponent {
  username = 'admin';
  password = '';
  autoBackup = true;
  backupSchedule = 'daily';
  retentionPeriod = '30';
  compressBackups = true;

  dbInfo = signal<DatabaseInfo>({
    name: 'Primary Database',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'hse_monitoring',
    status: 'connected',
    size: '2.4 GB',
    tables: 45,
    lastBackup: '2 hours ago'
  });

  recentBackups = signal([
    { id: 1, name: 'backup_2024_01_15.sql.gz', date: 'Jan 15, 2024 08:00', size: '256 MB' },
    { id: 2, name: 'backup_2024_01_14.sql.gz', date: 'Jan 14, 2024 08:00', size: '254 MB' },
    { id: 3, name: 'backup_2024_01_13.sql.gz', date: 'Jan 13, 2024 08:00', size: '252 MB' }
  ]);

  testConnection() { console.log('Testing database connection...'); }
  createBackup() { console.log('Creating backup...'); }
  saveConnection() { console.log('Saving connection settings...'); }
  restoreBackup(backup: any) { console.log('Restoring backup:', backup.name); }
  downloadBackup(backup: any) { console.log('Downloading backup:', backup.name); }
}
