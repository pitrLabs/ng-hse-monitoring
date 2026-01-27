import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface SystemTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  danger?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

@Component({
  selector: 'app-admin-tools',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="tools-page">
      <div class="page-header">
        <div class="header-left">
          <h2>System Tools</h2>
          <p class="subtitle">System administration and maintenance utilities</p>
        </div>
      </div>

      <div class="status-section">
        <h3 class="section-title">System Status</h3>
        <div class="status-grid">
          <div class="status-card">
            <div class="gauge">
              <svg viewBox="0 0 100 50">
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--glass-border)" stroke-width="8" stroke-linecap="round"/>
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" [attr.stroke-dasharray]="'126'" [attr.stroke-dashoffset]="126 - (systemStatus().cpu * 1.26)"/>
              </svg>
              <span class="value">{{ systemStatus().cpu }}%</span>
            </div>
            <span class="label">CPU Usage</span>
          </div>
          <div class="status-card">
            <div class="gauge">
              <svg viewBox="0 0 100 50">
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--glass-border)" stroke-width="8" stroke-linecap="round"/>
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" [attr.stroke-dasharray]="'126'" [attr.stroke-dashoffset]="126 - (systemStatus().memory * 1.26)"/>
              </svg>
              <span class="value">{{ systemStatus().memory }}%</span>
            </div>
            <span class="label">Memory</span>
          </div>
          <div class="status-card">
            <div class="gauge">
              <svg viewBox="0 0 100 50">
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--glass-border)" stroke-width="8" stroke-linecap="round"/>
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" [attr.stroke-dasharray]="'126'" [attr.stroke-dashoffset]="126 - (systemStatus().disk * 1.26)"/>
              </svg>
              <span class="value">{{ systemStatus().disk }}%</span>
            </div>
            <span class="label">Disk Usage</span>
          </div>
          <div class="status-card">
            <div class="gauge">
              <svg viewBox="0 0 100 50">
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--glass-border)" stroke-width="8" stroke-linecap="round"/>
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round" [attr.stroke-dasharray]="'126'" [attr.stroke-dashoffset]="126 - (systemStatus().temp * 1.26)"/>
              </svg>
              <span class="value">{{ systemStatus().temp }}°C</span>
            </div>
            <span class="label">Temperature</span>
          </div>
        </div>
        <div class="system-info">
          <div class="info-item"><mat-icon>dns</mat-icon><span>Hostname:</span><span>{{ systemStatus().hostname }}</span></div>
          <div class="info-item"><mat-icon>info</mat-icon><span>Version:</span><span>{{ systemStatus().version }}</span></div>
          <div class="info-item"><mat-icon>schedule</mat-icon><span>Uptime:</span><span>{{ systemStatus().uptime }}</span></div>
        </div>
      </div>

      <h3 class="section-title">Maintenance Tools</h3>
      <div class="tools-grid">
        @for (tool of tools; track tool.id) {
          <div class="tool-card" [class.danger]="tool.danger" (click)="executeTool(tool)">
            <div class="tool-icon" [style.background]="tool.color">
              <mat-icon>{{ tool.icon }}</mat-icon>
            </div>
            <div class="tool-info">
              <h4>{{ tool.name }}</h4>
              <p>{{ tool.description }}</p>
            </div>
          </div>
        }
      </div>

      <h3 class="section-title">Quick Actions</h3>
      <div class="quick-actions">
        <button class="quick-btn" (click)="clearCache()"><mat-icon>delete_sweep</mat-icon>Clear Cache</button>
        <button class="quick-btn" (click)="syncTime()"><mat-icon>sync</mat-icon>Sync Time</button>
        <button class="quick-btn" (click)="testNetwork()"><mat-icon>network_check</mat-icon>Test Network</button>
        <button class="quick-btn" (click)="checkUpdates()"><mat-icon>system_update</mat-icon>Check Updates</button>
      </div>

      <h3 class="section-title">System Logs</h3>
      <div class="logs-section">
        <div class="logs-header">
          <div class="log-filters">
            <button class="filter-btn" [class.active]="logFilter() === 'all'" (click)="logFilter.set('all')">All</button>
            <button class="filter-btn" [class.active]="logFilter() === 'info'" (click)="logFilter.set('info')">Info</button>
            <button class="filter-btn" [class.active]="logFilter() === 'warning'" (click)="logFilter.set('warning')">Warning</button>
            <button class="filter-btn" [class.active]="logFilter() === 'error'" (click)="logFilter.set('error')">Error</button>
          </div>
          <button class="action-btn secondary" (click)="refreshLogs()"><mat-icon>refresh</mat-icon>Refresh</button>
        </div>
        <div class="logs-list">
          @for (log of filteredLogs(); track log.id) {
            <div class="log-entry" [class]="log.level">
              <span class="log-time">{{ log.timestamp }}</span>
              <span class="log-level">{{ log.level }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          }
        </div>
      </div>

      @if (showProgress()) {
        <div class="progress-overlay">
          <div class="progress-dialog">
            <h4>{{ progressTitle() }}</h4>
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <p>Please wait...</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tools-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .section-title { font-size: 16px; color: var(--text-primary); margin: 32px 0 16px; }

    .status-section { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px; }
    .status-card { text-align: center; }
    .gauge { position: relative; width: 100px; height: 60px; margin: 0 auto 8px; }
    .gauge svg { width: 100%; height: 100%; }
    .gauge .value { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-size: 18px; font-weight: 600; color: var(--text-primary); }
    .status-card .label { font-size: 13px; color: var(--text-muted); }

    .system-info { display: flex; gap: 32px; padding-top: 16px; border-top: 1px solid var(--glass-border); }
    .info-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .info-item mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent-primary); }
    .info-item span:first-of-type { color: var(--text-muted); }
    .info-item span:last-child { color: var(--text-primary); }

    .tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .tool-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
    .tool-card:hover { transform: translateY(-2px); border-color: var(--accent-primary); }
    .tool-card.danger:hover { border-color: #ef4444; }
    .tool-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .tool-icon mat-icon { font-size: 24px; width: 24px; height: 24px; color: white; }
    .tool-info h4 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); }
    .tool-info p { margin: 0; font-size: 12px; color: var(--text-muted); }

    .quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .quick-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .quick-btn:hover { background: var(--glass-bg-hover); border-color: var(--accent-primary); }
    .quick-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .logs-section { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; }
    .logs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--glass-border); }
    .log-filters { display: flex; gap: 8px; }
    .filter-btn { padding: 6px 14px; background: transparent; border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
    .filter-btn.active { background: var(--accent-primary); border-color: var(--accent-primary); color: white; }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--glass-border); border-radius: 6px; background: transparent; color: var(--text-primary); font-size: 12px; cursor: pointer; }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .logs-list { max-height: 300px; overflow-y: auto; }
    .log-entry { display: grid; grid-template-columns: 140px 80px 1fr; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--glass-border); font-size: 12px; font-family: monospace; }
    .log-time { color: var(--text-muted); }
    .log-level { text-transform: uppercase; font-weight: 600; }
    .log-entry.info .log-level { color: #3b82f6; }
    .log-entry.warning .log-level { color: #f59e0b; }
    .log-entry.error .log-level { color: #ef4444; }
    .log-message { color: var(--text-primary); }

    .progress-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .progress-dialog { background: var(--glass-bg); border-radius: 16px; padding: 32px; text-align: center; min-width: 300px; }
    .progress-dialog h4 { margin: 0 0 20px; color: var(--text-primary); }
    .progress-dialog p { margin: 16px 0 0; color: var(--text-muted); font-size: 13px; }

    @media (max-width: 768px) {
      .status-grid { grid-template-columns: repeat(2, 1fr); }
      .system-info { flex-direction: column; gap: 12px; }
    }
  `]
})
export class AdminToolsComponent {
  logFilter = signal<'all' | 'info' | 'warning' | 'error'>('all');
  showProgress = signal(false);
  progressTitle = signal('');

  systemStatus = signal({
    cpu: 45,
    memory: 62,
    disk: 58,
    temp: 52,
    hostname: 'hse-monitor-01',
    version: 'v1.0.67',
    uptime: '15 days, 4 hours'
  });

  tools: SystemTool[] = [
    { id: '1', name: 'Backup System', description: 'Create full system backup', icon: 'backup', color: '#3b82f6' },
    { id: '2', name: 'Restore Backup', description: 'Restore from backup file', icon: 'restore', color: '#22c55e' },
    { id: '3', name: 'Export Config', description: 'Export system configuration', icon: 'file_download', color: '#8b5cf6' },
    { id: '4', name: 'Import Config', description: 'Import configuration file', icon: 'file_upload', color: '#f59e0b' },
    { id: '5', name: 'Clear Logs', description: 'Clear all system logs', icon: 'delete_sweep', color: '#6b7280' },
    { id: '6', name: 'Restart Services', description: 'Restart all services', icon: 'restart_alt', color: '#06b6d4' },
    { id: '7', name: 'Reboot System', description: 'Reboot the device', icon: 'power_settings_new', color: '#f97316', danger: true },
    { id: '8', name: 'Factory Reset', description: 'Reset to factory defaults', icon: 'settings_backup_restore', color: '#ef4444', danger: true }
  ];

  logs = signal<LogEntry[]>([
    { id: '1', timestamp: '2024-01-28 10:30:15', level: 'info', message: 'System started successfully' },
    { id: '2', timestamp: '2024-01-28 10:31:22', level: 'info', message: 'AI detection service initialized' },
    { id: '3', timestamp: '2024-01-28 10:35:45', level: 'warning', message: 'High CPU usage detected (85%)' },
    { id: '4', timestamp: '2024-01-28 10:40:18', level: 'error', message: 'Failed to connect to camera RTSP stream' },
    { id: '5', timestamp: '2024-01-28 10:42:33', level: 'info', message: 'Camera reconnected successfully' },
    { id: '6', timestamp: '2024-01-28 10:45:00', level: 'info', message: 'Alarm triggered: No helmet detected' }
  ]);

  filteredLogs = signal<LogEntry[]>([]);

  constructor() {
    this.updateFilteredLogs();
  }

  updateFilteredLogs() {
    const filter = this.logFilter();
    if (filter === 'all') {
      this.filteredLogs.set(this.logs());
    } else {
      this.filteredLogs.set(this.logs().filter(l => l.level === filter));
    }
  }

  executeTool(tool: SystemTool) {
    if (tool.danger && !confirm(`Are you sure you want to ${tool.name.toLowerCase()}? This action cannot be undone.`)) {
      return;
    }
    this.progressTitle.set(tool.name);
    this.showProgress.set(true);
    setTimeout(() => this.showProgress.set(false), 2000);
  }

  clearCache() { console.log('Clearing cache...'); }
  syncTime() { console.log('Syncing time...'); }
  testNetwork() { console.log('Testing network...'); }
  checkUpdates() { console.log('Checking updates...'); }
  refreshLogs() { this.updateFilteredLogs(); }
}
