import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  premium: boolean;
  icon: string;
}

@Component({
  selector: 'app-admin-feature-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="feature-management-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Feature Management</h2>
          <p class="subtitle">Enable or disable system features and modules</p>
        </div>
        <button class="action-btn primary" (click)="saveChanges()">
          <mat-icon>save</mat-icon>
          Save Changes
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <mat-icon>extension</mat-icon>
          <div class="stat-info">
            <span class="value">{{ features().length }}</span>
            <span class="label">Total Features</span>
          </div>
        </div>
        <div class="stat-card enabled">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getEnabledCount() }}</span>
            <span class="label">Enabled</span>
          </div>
        </div>
        <div class="stat-card disabled">
          <mat-icon>cancel</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getDisabledCount() }}</span>
            <span class="label">Disabled</span>
          </div>
        </div>
        <div class="stat-card premium">
          <mat-icon>star</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getPremiumCount() }}</span>
            <span class="label">Premium</span>
          </div>
        </div>
      </div>

      @for (category of categories; track category) {
        <div class="category-section">
          <h3 class="category-title">{{ category }}</h3>
          <div class="features-grid">
            @for (feature of getFeaturesByCategory(category); track feature.id) {
              <div class="feature-card" [class.enabled]="feature.enabled" [class.disabled]="!feature.enabled">
                <div class="feature-header">
                  <div class="feature-icon">
                    <mat-icon>{{ feature.icon }}</mat-icon>
                  </div>
                  <mat-slide-toggle [(ngModel)]="feature.enabled" color="primary"></mat-slide-toggle>
                </div>
                <div class="feature-body">
                  <div class="feature-title">
                    <h4>{{ feature.name }}</h4>
                    @if (feature.premium) {
                      <span class="premium-badge"><mat-icon>star</mat-icon>Premium</span>
                    }
                  </div>
                  <p class="feature-desc">{{ feature.description }}</p>
                </div>
                <div class="feature-footer">
                  <span class="status-text">{{ feature.enabled ? 'Enabled' : 'Disabled' }}</span>
                  <button mat-icon-button (click)="configureFeature(feature)">
                    <mat-icon>settings</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .feature-management-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.enabled mat-icon { color: #22c55e; }
    .stat-card.disabled mat-icon { color: #6b7280; }
    .stat-card.premium mat-icon { color: #f59e0b; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .category-section { margin-bottom: 32px; }
    .category-title { font-size: 16px; color: var(--text-primary); margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border); }

    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .feature-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; transition: all 0.2s; }
    .feature-card.enabled { border-color: rgba(34, 197, 94, 0.3); }
    .feature-card.disabled { opacity: 0.7; }
    .feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

    .feature-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .feature-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(0, 212, 255, 0.1); display: flex; align-items: center; justify-content: center; }
    .feature-icon mat-icon { font-size: 24px; width: 24px; height: 24px; color: var(--accent-primary); }
    .feature-card.disabled .feature-icon { background: rgba(100,100,100,0.1); }
    .feature-card.disabled .feature-icon mat-icon { color: var(--text-muted); }

    .feature-body { margin-bottom: 16px; }
    .feature-title { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .feature-title h4 { margin: 0; font-size: 15px; color: var(--text-primary); }
    .premium-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-size: 10px; font-weight: 600; border-radius: 4px; }
    .premium-badge mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .feature-desc { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }

    .feature-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--glass-border); }
    .status-text { font-size: 12px; color: var(--text-secondary); }
    .feature-card.enabled .status-text { color: #22c55e; }
    .feature-footer button { color: var(--text-secondary); }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminFeatureManagementComponent {
  categories = ['AI Detection', 'Safety Monitoring', 'Communication', 'Reporting', 'Integration'];

  features = signal<Feature[]>([
    { id: '1', name: 'Object Detection', description: 'Detect and track objects in video streams using AI models', category: 'AI Detection', enabled: true, premium: false, icon: 'track_changes' },
    { id: '2', name: 'Face Recognition', description: 'Identify and verify individuals using facial recognition', category: 'AI Detection', enabled: true, premium: true, icon: 'face' },
    { id: '3', name: 'License Plate Recognition', description: 'Automatically read and record vehicle license plates', category: 'AI Detection', enabled: false, premium: true, icon: 'directions_car' },
    { id: '4', name: 'PPE Detection', description: 'Monitor compliance with personal protective equipment requirements', category: 'Safety Monitoring', enabled: true, premium: false, icon: 'checkroom' },
    { id: '5', name: 'Zone Intrusion', description: 'Alert when unauthorized access to restricted zones is detected', category: 'Safety Monitoring', enabled: true, premium: false, icon: 'security' },
    { id: '6', name: 'Fire Detection', description: 'Real-time fire and smoke detection with instant alerts', category: 'Safety Monitoring', enabled: true, premium: false, icon: 'local_fire_department' },
    { id: '7', name: 'Push Notifications', description: 'Send real-time notifications to mobile devices', category: 'Communication', enabled: true, premium: false, icon: 'notifications' },
    { id: '8', name: 'Email Alerts', description: 'Send automated email alerts for critical events', category: 'Communication', enabled: true, premium: false, icon: 'email' },
    { id: '9', name: 'PTT Radio', description: 'Push-to-talk radio communication integration', category: 'Communication', enabled: false, premium: true, icon: 'mic' },
    { id: '10', name: 'Analytics Dashboard', description: 'Comprehensive analytics and data visualization', category: 'Reporting', enabled: true, premium: false, icon: 'bar_chart' },
    { id: '11', name: 'Custom Reports', description: 'Generate custom reports with advanced filtering', category: 'Reporting', enabled: true, premium: true, icon: 'description' },
    { id: '12', name: 'API Access', description: 'RESTful API for third-party integrations', category: 'Integration', enabled: true, premium: true, icon: 'api' },
    { id: '13', name: 'Modbus Integration', description: 'Connect with industrial Modbus devices', category: 'Integration', enabled: false, premium: true, icon: 'electrical_services' },
    { id: '14', name: 'Webhook Support', description: 'Send event data to external systems via webhooks', category: 'Integration', enabled: true, premium: false, icon: 'webhook' }
  ]);

  getEnabledCount(): number { return this.features().filter(f => f.enabled).length; }
  getDisabledCount(): number { return this.features().filter(f => !f.enabled).length; }
  getPremiumCount(): number { return this.features().filter(f => f.premium).length; }

  getFeaturesByCategory(category: string): Feature[] {
    return this.features().filter(f => f.category === category);
  }

  saveChanges() {
    console.log('Saving feature settings...', this.features());
  }

  configureFeature(feature: Feature) {
    console.log('Configuring feature:', feature.name);
  }
}
