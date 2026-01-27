import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-admin-basic',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="basic-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Basic Settings</h2>
          <p class="subtitle">Configure basic system settings and defaults</p>
        </div>
        <button class="action-btn primary" (click)="saveSettings()">
          <mat-icon>save</mat-icon>
          Save Settings
        </button>
      </div>

      <div class="settings-grid">
        <div class="settings-card">
          <h3><mat-icon>business</mat-icon> Organization Info</h3>
          <div class="form-group">
            <label>Organization Name</label>
            <input type="text" [(ngModel)]="settings.orgName" placeholder="Company Name">
          </div>
          <div class="form-group">
            <label>Site Name</label>
            <input type="text" [(ngModel)]="settings.siteName" placeholder="Site/Location Name">
          </div>
          <div class="form-group">
            <label>Contact Email</label>
            <input type="email" [(ngModel)]="settings.contactEmail" placeholder="admin@company.com">
          </div>
          <div class="form-group">
            <label>Contact Phone</label>
            <input type="tel" [(ngModel)]="settings.contactPhone" placeholder="+62 21 xxx xxxx">
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea [(ngModel)]="settings.address" rows="3" placeholder="Full address"></textarea>
          </div>
        </div>

        <div class="settings-card">
          <h3><mat-icon>language</mat-icon> Regional Settings</h3>
          <div class="form-group">
            <label>Timezone</label>
            <select [(ngModel)]="settings.timezone">
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div class="form-group">
            <label>Language</label>
            <select [(ngModel)]="settings.language">
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date Format</label>
            <select [(ngModel)]="settings.dateFormat">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div class="form-group">
            <label>Time Format</label>
            <select [(ngModel)]="settings.timeFormat">
              <option value="24h">24-hour (14:30)</option>
              <option value="12h">12-hour (2:30 PM)</option>
            </select>
          </div>
        </div>

        <div class="settings-card">
          <h3><mat-icon>tune</mat-icon> System Defaults</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Auto-Start AI Tasks</span>
              <span class="setting-desc">Automatically start AI tasks on system boot</span>
            </div>
            <mat-slide-toggle [(ngModel)]="settings.autoStartTasks" color="primary"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Enable Notifications</span>
              <span class="setting-desc">Show desktop notifications for alerts</span>
            </div>
            <mat-slide-toggle [(ngModel)]="settings.enableNotifications" color="primary"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Auto-Archive Events</span>
              <span class="setting-desc">Archive old events automatically</span>
            </div>
            <mat-slide-toggle [(ngModel)]="settings.autoArchive" color="primary"></mat-slide-toggle>
          </div>
          <div class="form-group" style="margin-top: 16px;">
            <label>Event Retention Days</label>
            <input type="number" [(ngModel)]="settings.retentionDays" min="7" max="365">
          </div>
          <div class="form-group">
            <label>Default Camera Preview Grid</label>
            <select [(ngModel)]="settings.defaultGrid">
              <option value="1x1">1x1 (Single)</option>
              <option value="2x2">2x2 (4 cameras)</option>
              <option value="3x3">3x3 (9 cameras)</option>
              <option value="4x4">4x4 (16 cameras)</option>
            </select>
          </div>
        </div>

        <div class="settings-card">
          <h3><mat-icon>security</mat-icon> Security Settings</h3>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Require Strong Password</span>
              <span class="setting-desc">Minimum 8 chars with uppercase, number, symbol</span>
            </div>
            <mat-slide-toggle [(ngModel)]="settings.strongPassword" color="primary"></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Two-Factor Authentication</span>
              <span class="setting-desc">Enable 2FA for all users</span>
            </div>
            <mat-slide-toggle [(ngModel)]="settings.twoFactorAuth" color="primary"></mat-slide-toggle>
          </div>
          <div class="form-group" style="margin-top: 16px;">
            <label>Session Timeout (minutes)</label>
            <input type="number" [(ngModel)]="settings.sessionTimeout" min="5" max="480">
          </div>
          <div class="form-group">
            <label>Max Login Attempts</label>
            <input type="number" [(ngModel)]="settings.maxLoginAttempts" min="3" max="10">
          </div>
          <div class="form-group">
            <label>Password Expiry Days</label>
            <input type="number" [(ngModel)]="settings.passwordExpiry" min="0" max="365">
            <span class="helper-text">Set to 0 to disable password expiry</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .basic-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .settings-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; }
    .settings-card h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 20px; font-size: 16px; color: var(--text-primary); }
    .settings-card h3 mat-icon { color: var(--accent-primary); }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; resize: vertical; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--accent-primary); }
    .helper-text { display: block; font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--glass-border); }
    .setting-row:last-of-type { border-bottom: none; }
    .setting-info { display: flex; flex-direction: column; gap: 2px; }
    .setting-label { font-size: 14px; color: var(--text-primary); }
    .setting-desc { font-size: 12px; color: var(--text-muted); }

    @media (max-width: 1024px) {
      .settings-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminBasicComponent {
  settings = {
    orgName: 'PT. Example Indonesia',
    siteName: 'Main Site',
    contactEmail: 'admin@example.com',
    contactPhone: '+62 21 1234567',
    address: 'Jl. Example No. 123, Jakarta',
    timezone: 'Asia/Jakarta',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    autoStartTasks: true,
    enableNotifications: true,
    autoArchive: true,
    retentionDays: 90,
    defaultGrid: '2x2',
    strongPassword: true,
    twoFactorAuth: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordExpiry: 90
  };

  saveSettings() {
    console.log('Saving basic settings...', this.settings);
  }
}
