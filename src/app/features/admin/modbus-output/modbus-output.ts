import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface ModbusDevice {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: 'tcp' | 'rtu';
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
}

interface ModbusMapping {
  id: string;
  name: string;
  register: number;
  type: 'coil' | 'input' | 'holding' | 'discrete';
  dataType: 'bool' | 'int16' | 'int32' | 'float';
  event: string;
  enabled: boolean;
}

@Component({
  selector: 'app-admin-modbus-output',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="modbus-output-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Modbus Output Configuration</h2>
          <p class="subtitle">Configure Modbus protocol outputs for industrial integration</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="testConnection()">
            <mat-icon>sync</mat-icon>
            Test All
          </button>
          <button class="action-btn primary" (click)="addDevice()">
            <mat-icon>add</mat-icon>
            Add Device
          </button>
        </div>
      </div>

      <div class="section">
        <h3><mat-icon>devices</mat-icon> Modbus Devices</h3>
        <div class="devices-grid">
          @for (device of devices(); track device.id) {
            <div class="device-card" [class]="device.status">
              <div class="device-header">
                <div class="device-icon">
                  <mat-icon>{{ device.protocol === 'tcp' ? 'lan' : 'usb' }}</mat-icon>
                </div>
                <span class="status-badge" [class]="device.status">{{ device.status }}</span>
              </div>
              <div class="device-info">
                <h4>{{ device.name }}</h4>
                <p class="address">{{ device.address }}:{{ device.port }}</p>
                <p class="protocol">Protocol: {{ device.protocol | uppercase }}</p>
              </div>
              <div class="device-footer">
                <span class="last-sync"><mat-icon>schedule</mat-icon>{{ device.lastSync }}</span>
                <div class="device-actions">
                  <button mat-icon-button (click)="editDevice(device)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button (click)="deleteDevice(device)"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3><mat-icon>swap_horiz</mat-icon> Output Mappings</h3>
          <button class="action-btn secondary" (click)="addMapping()">
            <mat-icon>add</mat-icon>
            Add Mapping
          </button>
        </div>
        <div class="mappings-table">
          <div class="table-header">
            <span>Name</span>
            <span>Register</span>
            <span>Type</span>
            <span>Data Type</span>
            <span>Trigger Event</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          @for (mapping of mappings(); track mapping.id) {
            <div class="table-row" [class.disabled]="!mapping.enabled">
              <span class="cell name">{{ mapping.name }}</span>
              <span class="cell register">{{ mapping.register }}</span>
              <span class="cell type">{{ mapping.type }}</span>
              <span class="cell datatype">{{ mapping.dataType }}</span>
              <span class="cell event">{{ mapping.event }}</span>
              <span class="cell status">
                <mat-slide-toggle [(ngModel)]="mapping.enabled" color="primary"></mat-slide-toggle>
              </span>
              <span class="cell actions">
                <button mat-icon-button (click)="editMapping(mapping)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="testMapping(mapping)"><mat-icon>play_arrow</mat-icon></button>
                <button mat-icon-button (click)="deleteMapping(mapping)"><mat-icon>delete</mat-icon></button>
              </span>
            </div>
          }
        </div>
      </div>

      <div class="section">
        <h3><mat-icon>history</mat-icon> Recent Activity</h3>
        <div class="activity-log">
          @for (log of activityLogs(); track log.id) {
            <div class="log-item" [class]="log.type">
              <mat-icon>{{ log.type === 'success' ? 'check_circle' : log.type === 'error' ? 'error' : 'info' }}</mat-icon>
              <div class="log-content">
                <span class="log-message">{{ log.message }}</span>
                <span class="log-time">{{ log.time }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modbus-output-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .section { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 20px; font-size: 16px; color: var(--text-primary); }
    .section h3 mat-icon { color: var(--accent-primary); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .section-header h3 { margin: 0; }

    .devices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .device-card { background: rgba(0,0,0,0.1); border-radius: 12px; padding: 20px; border-left: 4px solid var(--glass-border); }
    .device-card.connected { border-left-color: #22c55e; }
    .device-card.disconnected { border-left-color: #6b7280; }
    .device-card.error { border-left-color: #ef4444; }

    .device-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .device-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--glass-bg); display: flex; align-items: center; justify-content: center; }
    .device-icon mat-icon { color: var(--accent-primary); }
    .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
    .status-badge.connected { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.disconnected { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .device-info h4 { margin: 0 0 4px; font-size: 15px; color: var(--text-primary); }
    .device-info p { margin: 0; font-size: 12px; color: var(--text-muted); }
    .device-info .address { color: var(--text-secondary); }

    .device-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--glass-border); }
    .last-sync { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
    .last-sync mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .device-actions button { color: var(--text-secondary); width: 32px; height: 32px; }

    .mappings-table { border: 1px solid var(--glass-border); border-radius: 8px; overflow: hidden; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 2fr 80px 100px; gap: 12px; padding: 12px 16px; align-items: center; }
    .table-header { background: rgba(0,0,0,0.2); font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .table-row { border-top: 1px solid var(--glass-border); font-size: 13px; }
    .table-row.disabled { opacity: 0.5; }
    .cell { color: var(--text-primary); }
    .cell.name { font-weight: 500; }
    .cell.register { font-family: monospace; color: var(--accent-primary); }
    .cell.event { font-size: 12px; color: var(--text-secondary); }
    .cell.actions { display: flex; gap: 4px; }
    .cell.actions button { color: var(--text-secondary); width: 28px; height: 28px; }
    .cell.actions button mat-icon { font-size: 16px; }

    .activity-log { max-height: 200px; overflow-y: auto; }
    .log-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; background: rgba(0,0,0,0.1); }
    .log-item.success mat-icon { color: #22c55e; }
    .log-item.error mat-icon { color: #ef4444; }
    .log-item.info mat-icon { color: var(--accent-primary); }
    .log-content { display: flex; flex-direction: column; gap: 2px; }
    .log-message { font-size: 13px; color: var(--text-primary); }
    .log-time { font-size: 11px; color: var(--text-muted); }
  `]
})
export class AdminModbusOutputComponent {
  devices = signal<ModbusDevice[]>([
    { id: '1', name: 'PLC Main Controller', address: '192.168.1.100', port: 502, protocol: 'tcp', status: 'connected', lastSync: '2 min ago' },
    { id: '2', name: 'Alarm Panel', address: '192.168.1.101', port: 502, protocol: 'tcp', status: 'connected', lastSync: '5 min ago' },
    { id: '3', name: 'Gate Controller', address: '/dev/ttyUSB0', port: 9600, protocol: 'rtu', status: 'disconnected', lastSync: '1 hour ago' }
  ]);

  mappings = signal<ModbusMapping[]>([
    { id: '1', name: 'Fire Alarm Output', register: 100, type: 'coil', dataType: 'bool', event: 'Fire Detection', enabled: true },
    { id: '2', name: 'Intrusion Alert', register: 101, type: 'coil', dataType: 'bool', event: 'Zone Intrusion', enabled: true },
    { id: '3', name: 'PPE Violation', register: 102, type: 'coil', dataType: 'bool', event: 'PPE Non-Compliance', enabled: true },
    { id: '4', name: 'People Count', register: 200, type: 'holding', dataType: 'int16', event: 'Crowd Density', enabled: false },
    { id: '5', name: 'Temperature Alert', register: 103, type: 'coil', dataType: 'bool', event: 'High Temperature', enabled: true }
  ]);

  activityLogs = signal([
    { id: 1, type: 'success', message: 'Fire Alarm Output written to register 100', time: '2 min ago' },
    { id: 2, type: 'success', message: 'Connection established to PLC Main Controller', time: '5 min ago' },
    { id: 3, type: 'error', message: 'Failed to connect to Gate Controller', time: '1 hour ago' },
    { id: 4, type: 'info', message: 'Modbus service started', time: '2 hours ago' }
  ]);

  testConnection() { console.log('Testing all connections...'); }
  addDevice() { console.log('Adding new device...'); }
  editDevice(device: ModbusDevice) { console.log('Editing device:', device.name); }
  deleteDevice(device: ModbusDevice) { console.log('Deleting device:', device.name); }
  addMapping() { console.log('Adding new mapping...'); }
  editMapping(mapping: ModbusMapping) { console.log('Editing mapping:', mapping.name); }
  testMapping(mapping: ModbusMapping) { console.log('Testing mapping:', mapping.name); }
  deleteMapping(mapping: ModbusMapping) { console.log('Deleting mapping:', mapping.name); }
}
