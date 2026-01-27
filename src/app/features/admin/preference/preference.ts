import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-admin-preference',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule, MatSelectModule, MatFormFieldModule],
  template: `
    <div class="preference-page">
      <div class="sidebar">
        <button class="tab-btn" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">
          <mat-icon>settings</mat-icon><span>General</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'appearance'" (click)="activeTab.set('appearance')">
          <mat-icon>palette</mat-icon><span>Appearance</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'notifications'" (click)="activeTab.set('notifications')">
          <mat-icon>notifications</mat-icon><span>Notifications</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'storage'" (click)="activeTab.set('storage')">
          <mat-icon>storage</mat-icon><span>Storage</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'security'" (click)="activeTab.set('security')">
          <mat-icon>security</mat-icon><span>Security</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'about'" (click)="activeTab.set('about')">
          <mat-icon>info</mat-icon><span>About</span>
        </button>
      </div>

      <div class="content">
        @if (activeTab() === 'general') {
          <div class="tab-content">
            <h3>General Settings</h3>
            <div class="form-group">
              <label>Device Name</label>
              <input type="text" [(ngModel)]="settings.deviceName" placeholder="Enter device name">
            </div>
            <div class="form-group">
              <label>Language</label>
              <select [(ngModel)]="settings.language">
                <option value="en">English</option>
                <option value="id">Indonesia</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <div class="form-group">
              <label>Timezone</label>
              <select [(ngModel)]="settings.timezone">
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div class="form-group toggle-group">
              <span>Auto-start on boot</span>
              <mat-slide-toggle [(ngModel)]="settings.autoStart" color="primary"></mat-slide-toggle>
            </div>
          </div>
        }

        @if (activeTab() === 'appearance') {
          <div class="tab-content">
            <h3>Appearance</h3>
            <div class="form-group">
              <label>Theme</label>
              <div class="theme-options">
                <button class="theme-btn" [class.active]="settings.theme === 'dark'" (click)="settings.theme = 'dark'">
                  <mat-icon>dark_mode</mat-icon> Dark
                </button>
                <button class="theme-btn" [class.active]="settings.theme === 'light'" (click)="settings.theme = 'light'">
                  <mat-icon>light_mode</mat-icon> Light
                </button>
                <button class="theme-btn" [class.active]="settings.theme === 'system'" (click)="settings.theme = 'system'">
                  <mat-icon>settings_brightness</mat-icon> System
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Accent Color</label>
              <input type="color" [(ngModel)]="settings.accentColor">
            </div>
            <div class="form-group toggle-group">
              <span>Enable animations</span>
              <mat-slide-toggle [(ngModel)]="settings.animations" color="primary"></mat-slide-toggle>
            </div>
          </div>
        }

        @if (activeTab() === 'notifications') {
          <div class="tab-content">
            <h3>Notifications</h3>
            <div class="form-group toggle-group">
              <span>Enable notifications</span>
              <mat-slide-toggle [(ngModel)]="settings.notifications" color="primary"></mat-slide-toggle>
            </div>
            <div class="form-group toggle-group">
              <span>Sound alerts</span>
              <mat-slide-toggle [(ngModel)]="settings.soundAlerts" color="primary"></mat-slide-toggle>
            </div>
            <div class="form-group">
              <label>Volume: {{ settings.volume }}%</label>
              <input type="range" min="0" max="100" [(ngModel)]="settings.volume">
            </div>
            <div class="form-group toggle-group">
              <span>Desktop notifications</span>
              <mat-slide-toggle [(ngModel)]="settings.desktopNotifications" color="primary"></mat-slide-toggle>
            </div>
          </div>
        }

        @if (activeTab() === 'storage') {
          <div class="tab-content">
            <h3>Storage</h3>
            <div class="storage-info">
              <div class="storage-chart">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--glass-border)" stroke-width="8"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-primary)" stroke-width="8" stroke-dasharray="188" stroke-dashoffset="75" transform="rotate(-90 50 50)"/>
                </svg>
                <span class="usage">60%</span>
              </div>
              <div class="storage-details">
                <div class="detail-row"><span>Used:</span><span>120 GB</span></div>
                <div class="detail-row"><span>Available:</span><span>80 GB</span></div>
                <div class="detail-row"><span>Total:</span><span>200 GB</span></div>
              </div>
            </div>
            <div class="form-group">
              <label>Recording retention: {{ settings.recordingRetention }} days</label>
              <input type="range" min="7" max="90" [(ngModel)]="settings.recordingRetention">
            </div>
            <div class="form-group">
              <label>Alarm retention: {{ settings.alarmRetention }} days</label>
              <input type="range" min="30" max="180" [(ngModel)]="settings.alarmRetention">
            </div>
            <button class="action-btn secondary" (click)="clearCache()">
              <mat-icon>delete_sweep</mat-icon> Clear Cache
            </button>
          </div>
        }

        @if (activeTab() === 'security') {
          <div class="tab-content">
            <h3>Security</h3>
            <div class="form-group toggle-group">
              <span>Require password on startup</span>
              <mat-slide-toggle [(ngModel)]="settings.requirePassword" color="primary"></mat-slide-toggle>
            </div>
            <div class="form-group">
              <label>Session timeout: {{ settings.sessionTimeout }} minutes</label>
              <input type="range" min="5" max="60" [(ngModel)]="settings.sessionTimeout">
            </div>
            <div class="form-group toggle-group">
              <span>Two-factor authentication</span>
              <mat-slide-toggle [(ngModel)]="settings.twoFactor" color="primary"></mat-slide-toggle>
            </div>
            <button class="action-btn secondary" (click)="changePassword()">
              <mat-icon>lock</mat-icon> Change Password
            </button>
          </div>
        }

        @if (activeTab() === 'about') {
          <div class="tab-content">
            <h3>About</h3>
            <div class="about-info">
              <div class="logo-section">
                <mat-icon class="app-logo">security</mat-icon>
                <h4>HSE Monitoring System</h4>
              </div>
              <div class="info-grid">
                <div class="info-item"><span>Version:</span><span>1.0.67</span></div>
                <div class="info-item"><span>Device ID:</span><span>BM-1688-001</span></div>
                <div class="info-item"><span>Serial:</span><span>SN-2024-001234</span></div>
                <div class="info-item"><span>License:</span><span class="valid">Valid</span></div>
                <div class="info-item"><span>Expires:</span><span>2025-12-31</span></div>
              </div>
              <button class="action-btn primary" (click)="checkUpdates()">
                <mat-icon>system_update</mat-icon> Check for Updates
              </button>
            </div>
          </div>
        }

        <div class="content-footer">
          <button class="action-btn secondary" (click)="resetSettings()">Reset to Defaults</button>
          <button class="action-btn primary" (click)="saveSettings()">Save Changes</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preference-page { display: flex; gap: 24px; min-height: calc(100vh - 150px); }
    .sidebar { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; }
    .tab-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: transparent; border: none; border-radius: 8px; color: var(--text-secondary); font-size: 14px; cursor: pointer; text-align: left; transition: all 0.2s; }
    .tab-btn:hover { background: var(--glass-bg); color: var(--text-primary); }
    .tab-btn.active { background: rgba(0, 212, 255, 0.1); color: var(--accent-primary); }
    .tab-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .content { flex: 1; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; }
    .tab-content { flex: 1; }
    .tab-content h3 { margin: 0 0 24px; font-size: 18px; color: var(--text-primary); }

    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
    .form-group input[type="text"], .form-group select { width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; }
    .form-group input[type="range"] { width: 100%; }
    .form-group input[type="color"] { width: 60px; height: 36px; border: none; border-radius: 8px; cursor: pointer; }
    .toggle-group { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-primary); }

    .theme-options { display: flex; gap: 12px; }
    .theme-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
    .theme-btn:hover, .theme-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); }

    .storage-info { display: flex; gap: 32px; margin-bottom: 24px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 12px; }
    .storage-chart { position: relative; width: 100px; height: 100px; }
    .storage-chart svg { width: 100%; height: 100%; }
    .storage-chart .usage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: var(--text-primary); }
    .storage-details { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
    .detail-row { display: flex; gap: 16px; font-size: 14px; }
    .detail-row span:first-child { color: var(--text-muted); }
    .detail-row span:last-child { color: var(--text-primary); }

    .about-info { text-align: center; }
    .logo-section { margin-bottom: 32px; }
    .app-logo { font-size: 64px; width: 64px; height: 64px; color: var(--accent-primary); margin-bottom: 16px; }
    .logo-section h4 { margin: 0; font-size: 20px; color: var(--text-primary); }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; text-align: left; }
    .info-item { display: flex; justify-content: space-between; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 13px; }
    .info-item span:first-child { color: var(--text-muted); }
    .info-item span:last-child { color: var(--text-primary); }
    .info-item .valid { color: #22c55e; }

    .content-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 24px; border-top: 1px solid var(--glass-border); margin-top: auto; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: rgba(0,0,0,0.2); color: var(--text-primary); border: 1px solid var(--glass-border); }
  `]
})
export class AdminPreferenceComponent {
  activeTab = signal('general');

  settings = {
    deviceName: 'HSE-Monitor-01',
    language: 'en',
    timezone: 'Asia/Jakarta',
    autoStart: true,
    theme: 'dark',
    accentColor: '#00d4ff',
    animations: true,
    notifications: true,
    soundAlerts: true,
    volume: 70,
    desktopNotifications: true,
    recordingRetention: 30,
    alarmRetention: 90,
    requirePassword: true,
    sessionTimeout: 30,
    twoFactor: false
  };

  saveSettings() { console.log('Saving settings...', this.settings); }
  resetSettings() { console.log('Resetting settings...'); }
  clearCache() { console.log('Clearing cache...'); }
  changePassword() { console.log('Opening password change dialog...'); }
  checkUpdates() { console.log('Checking for updates...'); }
}
