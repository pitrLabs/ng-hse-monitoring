import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Sensor {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'smoke' | 'motion' | 'gas' | 'pressure';
  location: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  threshold: number;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
}

@Component({
  selector: 'app-admin-sensor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="sensor-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Sensor Management</h2>
          <p class="subtitle">Monitor and configure environmental sensors</p>
        </div>
        <button class="action-btn primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Add Sensor
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon>sensors</mat-icon>
          <div class="stat-info">
            <span class="value">{{ sensors().length }}</span>
            <span class="label">Total Sensors</span>
          </div>
        </div>
        <div class="stat-card online">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getOnlineCount() }}</span>
            <span class="label">Online</span>
          </div>
        </div>
        <div class="stat-card offline">
          <mat-icon>cancel</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getOfflineCount() }}</span>
            <span class="label">Offline</span>
          </div>
        </div>
        <div class="stat-card warning">
          <mat-icon>warning</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getWarningCount() }}</span>
            <span class="label">Warning</span>
          </div>
        </div>
      </div>

      <div class="sensors-grid">
        @for (sensor of sensors(); track sensor.id) {
          <div class="sensor-card" [class]="sensor.status">
            <div class="card-header">
              <div class="sensor-icon" [class]="sensor.type">
                <mat-icon>{{ getSensorIcon(sensor.type) }}</mat-icon>
              </div>
              <div class="sensor-info">
                <h4>{{ sensor.name }}</h4>
                <span class="location"><mat-icon>location_on</mat-icon>{{ sensor.location }}</span>
              </div>
              <span class="status-badge" [class]="sensor.status">{{ sensor.status }}</span>
            </div>

            <div class="sensor-value">
              <span class="value">{{ sensor.value }}</span>
              <span class="unit">{{ sensor.unit }}</span>
            </div>

            <div class="sensor-gauge">
              <div class="gauge-bar">
                <div class="gauge-fill" [class.warning]="sensor.value > sensor.threshold" [style.width.%]="getGaugePercent(sensor)"></div>
                <div class="threshold-marker" [style.left.%]="getThresholdPercent(sensor)"></div>
              </div>
              <div class="gauge-labels">
                <span>{{ sensor.min }}{{ sensor.unit }}</span>
                <span>{{ sensor.max }}{{ sensor.unit }}</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="last-update"><mat-icon>schedule</mat-icon>{{ sensor.lastUpdate }}</span>
              <div class="card-actions">
                <button mat-icon-button (click)="configureSensor(sensor)" matTooltip="Configure">
                  <mat-icon>settings</mat-icon>
                </button>
                <button mat-icon-button (click)="viewHistory(sensor)" matTooltip="History">
                  <mat-icon>history</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteSensor(sensor)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sensor-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
    .stat-card.online mat-icon { color: #22c55e; }
    .stat-card.offline mat-icon { color: #6b7280; }
    .stat-card.warning mat-icon { color: #f59e0b; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .sensors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .sensor-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px; transition: all 0.2s; }
    .sensor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .sensor-card.online { border-left: 4px solid #22c55e; }
    .sensor-card.offline { border-left: 4px solid #6b7280; }
    .sensor-card.warning { border-left: 4px solid #f59e0b; }

    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .sensor-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .sensor-icon.temperature { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .sensor-icon.humidity { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .sensor-icon.smoke { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .sensor-icon.motion { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .sensor-icon.gas { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .sensor-icon.pressure { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
    .sensor-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .sensor-info { flex: 1; }
    .sensor-info h4 { margin: 0 0 2px; font-size: 14px; color: var(--text-primary); }
    .location { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
    .location mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .status-badge.online { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.offline { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .status-badge.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

    .sensor-value { text-align: center; margin: 20px 0; }
    .sensor-value .value { font-size: 42px; font-weight: 700; color: var(--text-primary); }
    .sensor-value .unit { font-size: 18px; color: var(--text-muted); margin-left: 4px; }

    .sensor-gauge { margin-bottom: 16px; }
    .gauge-bar { position: relative; height: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: visible; }
    .gauge-fill { height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.3s; }
    .gauge-fill.warning { background: #f59e0b; }
    .threshold-marker { position: absolute; top: -4px; width: 2px; height: 16px; background: #ef4444; transform: translateX(-50%); }
    .gauge-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: var(--text-muted); }

    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--glass-border); }
    .last-update { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
    .last-update mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .card-actions { display: flex; gap: 4px; }
    .card-actions button { color: var(--text-secondary); width: 32px; height: 32px; }
    .card-actions button mat-icon { font-size: 18px; }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminSensorComponent {
  sensors = signal<Sensor[]>([
    { id: '1', name: 'Temperature Sensor 01', type: 'temperature', location: 'Production Floor', value: 28.5, unit: '°C', min: 0, max: 50, threshold: 35, status: 'online', lastUpdate: '2 min ago' },
    { id: '2', name: 'Humidity Sensor 01', type: 'humidity', location: 'Storage Room', value: 65, unit: '%', min: 0, max: 100, threshold: 80, status: 'online', lastUpdate: '1 min ago' },
    { id: '3', name: 'Smoke Detector 01', type: 'smoke', location: 'Main Hall', value: 12, unit: 'ppm', min: 0, max: 100, threshold: 50, status: 'online', lastUpdate: '30 sec ago' },
    { id: '4', name: 'Motion Sensor 01', type: 'motion', location: 'Entrance Gate', value: 1, unit: '', min: 0, max: 1, threshold: 1, status: 'online', lastUpdate: '5 sec ago' },
    { id: '5', name: 'Gas Detector 01', type: 'gas', location: 'Chemical Storage', value: 45, unit: 'ppm', min: 0, max: 100, threshold: 40, status: 'warning', lastUpdate: '1 min ago' },
    { id: '6', name: 'Pressure Sensor 01', type: 'pressure', location: 'Boiler Room', value: 2.5, unit: 'bar', min: 0, max: 10, threshold: 8, status: 'offline', lastUpdate: '1 hour ago' }
  ]);

  getOnlineCount(): number { return this.sensors().filter(s => s.status === 'online').length; }
  getOfflineCount(): number { return this.sensors().filter(s => s.status === 'offline').length; }
  getWarningCount(): number { return this.sensors().filter(s => s.status === 'warning').length; }

  getSensorIcon(type: string): string {
    const icons: Record<string, string> = {
      temperature: 'thermostat',
      humidity: 'water_drop',
      smoke: 'smoke_free',
      motion: 'motion_photos_on',
      gas: 'air',
      pressure: 'speed'
    };
    return icons[type] || 'sensors';
  }

  getGaugePercent(sensor: Sensor): number {
    return ((sensor.value - sensor.min) / (sensor.max - sensor.min)) * 100;
  }

  getThresholdPercent(sensor: Sensor): number {
    return ((sensor.threshold - sensor.min) / (sensor.max - sensor.min)) * 100;
  }

  openAddDialog() { console.log('Opening add sensor dialog...'); }
  configureSensor(sensor: Sensor) { console.log('Configuring sensor:', sensor.name); }
  viewHistory(sensor: Sensor) { console.log('Viewing history for:', sensor.name); }
  deleteSensor(sensor: Sensor) {
    if (confirm(`Delete sensor "${sensor.name}"?`)) {
      this.sensors.update(s => s.filter(x => x.id !== sensor.id));
    }
  }
}
