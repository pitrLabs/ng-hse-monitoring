import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AIBoxService } from '../../../core/services/aibox.service';
import { ModbusService, ModbusDevice, ModbusDeviceCreate } from '../../../core/services/modbus.service';

@Component({
  selector: 'app-admin-modbus-output',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="modbus-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Modbus Output</h2>
          <p class="subtitle">Configure Modbus device connections per AI Box</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
          <mat-select [ngModel]="selectedAiBoxId()" (ngModelChange)="selectedAiBoxId.set($event); onAiBoxChange()">
            <mat-option value="">Select AI Box</mat-option>
            @for (box of aiBoxService.aiBoxes(); track box.id) {
              <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || syncing()" (click)="syncFromBmapp()">
            <mat-icon>cloud_download</mat-icon>
            Sync
          </button>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || syncing()" (click)="applyToBmapp()">
            <mat-icon>cloud_upload</mat-icon>
            Apply
          </button>
          <button class="action-btn primary" [disabled]="!selectedAiBoxId()" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add Device
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>cable</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to manage its Modbus devices</p>
        </div>
      } @else {
        @if (syncMessage()) {
          <div class="sync-message" [class.success]="syncSuccess()">
            <mat-icon>{{ syncSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ syncMessage() }}
          </div>
        }

        @if (loading()) {
          <div class="loading-state"><mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner></div>
        } @else if (devices().length === 0) {
          <div class="empty-state">
            <mat-icon>cable</mat-icon>
            <h3>No Modbus Devices</h3>
            <p>Sync from BM-APP or add a new device</p>
          </div>
        } @else {
          <div class="devices-table">
            <div class="table-header">
              <span>Description</span>
              <span>Port</span>
              <span>Slave</span>
              <span>Type</span>
              <span>Registers</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            @for (device of devices(); track device.id) {
              <div class="table-row" [class.inactive]="!device.is_active">
                <span class="device-desc">{{ device.description }}</span>
                <span class="mono">{{ device.port }}</span>
                <span class="mono">{{ device.slave_addr }}</span>
                <span>
                  <span class="type-badge" [class.output]="device.device_type === 1">
                    {{ device.device_type === 1 ? 'Output' : 'Input' }}
                  </span>
                </span>
                <span class="mono">{{ device.start_reg_addr }}-{{ device.end_reg_addr }}</span>
                <span>
                  <span class="status-dot" [class.active]="device.is_active"></span>
                  {{ device.is_active ? 'Active' : 'Inactive' }}
                </span>
                <div class="row-actions">
                  <button class="icon-btn" (click)="toggleDevice(device)" [title]="device.is_active ? 'Disable' : 'Enable'">
                    <mat-icon>{{ device.is_active ? 'pause' : 'play_arrow' }}</mat-icon>
                  </button>
                  <button class="icon-btn" (click)="openEditDialog(device)" title="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-btn danger" (click)="deleteDevice(device)" title="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Create/Edit Dialog -->
      @if (showDialog()) {
        <div class="dialog-overlay" (click)="closeDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>{{ editingDevice() ? 'Edit Device' : 'Add Modbus Device' }}</h3>
              <button class="icon-btn" (click)="closeDialog()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="dialog-body">
              <div class="form-grid">
                <div class="form-group full">
                  <label>Description</label>
                  <input type="text" [(ngModel)]="form.description" placeholder="Device description" class="form-input">
                </div>
                <div class="form-group">
                  <label>Port</label>
                  <input type="number" [(ngModel)]="form.port" class="form-input">
                </div>
                <div class="form-group">
                  <label>Slave Address</label>
                  <input type="number" [(ngModel)]="form.slave_addr" class="form-input">
                </div>
                <div class="form-group">
                  <label>Start Reg Addr</label>
                  <input type="number" [(ngModel)]="form.start_reg_addr" class="form-input">
                </div>
                <div class="form-group">
                  <label>End Reg Addr</label>
                  <input type="number" [(ngModel)]="form.end_reg_addr" class="form-input">
                </div>
                <div class="form-group">
                  <label>Start Data</label>
                  <input type="number" [(ngModel)]="form.start_data" class="form-input">
                </div>
                <div class="form-group">
                  <label>End Data</label>
                  <input type="number" [(ngModel)]="form.end_data" class="form-input">
                </div>
                <div class="form-group">
                  <label>Device Type</label>
                  <select [(ngModel)]="form.device_type" class="form-input">
                    <option [value]="0">Input</option>
                    <option [value]="1">Output</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Poll Interval (s)</label>
                  <input type="number" [(ngModel)]="form.poll_interval" step="0.1" class="form-input">
                </div>
                <div class="form-group full">
                  <label>Alarm URL</label>
                  <input type="text" [(ngModel)]="form.alarm_url" placeholder="http://..." class="form-input">
                </div>
                <div class="form-group full">
                  <label>Device Path</label>
                  <input type="text" [(ngModel)]="form.device_path" placeholder="/dev/ttyUSB0" class="form-input">
                </div>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="action-btn secondary" (click)="closeDialog()">Cancel</button>
              <button class="action-btn primary" [disabled]="!form.description" (click)="saveDevice()">
                {{ editingDevice() ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .modbus-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .aibox-select { padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; min-width: 180px; }

    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
    .empty-state h3 { margin: 0; font-size: 20px; color: var(--text-primary); }

    .sync-message { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 14px; }
    .sync-message.success { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e; }

    .devices-table { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 80px 60px 80px 120px 100px 100px; gap: 12px; padding: 12px 16px; align-items: center; font-size: 13px; }
    .table-header { background: rgba(0,0,0,0.2); font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .table-row { border-top: 1px solid var(--glass-border); color: var(--text-primary); }
    .table-row.inactive { opacity: 0.5; }
    .device-desc { font-weight: 500; }
    .mono { font-family: monospace; }
    .type-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(0,212,255,0.1); color: var(--accent-primary); }
    .type-badge.output { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #6b7280; margin-right: 6px; }
    .status-dot.active { background: #22c55e; }
    .row-actions { display: flex; gap: 4px; }

    .action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .icon-btn { background: none; border: none; cursor: pointer; padding: 5px; border-radius: 5px; color: var(--text-muted); display: flex; align-items: center; }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; width: 560px; max-width: 90vw; max-height: 85vh; overflow-y: auto; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 0; }
    .dialog-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    .dialog-body { padding: 20px; }
    .dialog-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: span 2; }
    .form-group label { font-size: 12px; color: var(--text-muted); }
    .form-input { padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; width: 100%; box-sizing: border-box; }
    .form-input:focus { outline: none; border-color: var(--accent-primary); }
  `]
})
export class AdminModbusOutputComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private modbusService = inject(ModbusService);

  selectedAiBoxId = signal<string | null>(null);
  devices = signal<ModbusDevice[]>([]);
  loading = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);
  showDialog = signal(false);
  editingDevice = signal<ModbusDevice | null>(null);

  form: ModbusDeviceCreate = this.getDefaultForm();

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.devices.set([]);
    this.loadDevices();
  }

  loadDevices() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loading.set(true);
    this.modbusService.getDevices({ aibox_id: id }).subscribe({
      next: (data) => { this.devices.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openCreateDialog() {
    this.editingDevice.set(null);
    this.form = this.getDefaultForm();
    this.showDialog.set(true);
  }

  openEditDialog(device: ModbusDevice) {
    this.editingDevice.set(device);
    this.form = {
      aibox_id: device.aibox_id,
      description: device.description,
      alarm_url: device.alarm_url,
      port: device.port,
      poll_interval: device.poll_interval,
      device_path: device.device_path,
      slave_addr: device.slave_addr,
      start_reg_addr: device.start_reg_addr,
      end_reg_addr: device.end_reg_addr,
      start_data: device.start_data,
      end_data: device.end_data,
      device_type: device.device_type,
      is_active: device.is_active,
    };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  saveDevice() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    const editing = this.editingDevice();
    if (editing) {
      this.modbusService.updateDevice(editing.id, this.form).subscribe({
        next: (updated) => {
          this.devices.update(d => d.map(x => x.id === updated.id ? updated : x));
          this.closeDialog();
        }
      });
    } else {
      this.modbusService.createDevice({ ...this.form, aibox_id: id }).subscribe({
        next: (device) => {
          this.devices.update(d => [...d, device]);
          this.closeDialog();
        }
      });
    }
  }

  deleteDevice(device: ModbusDevice) {
    if (!confirm(`Delete device "${device.description}"?`)) return;
    this.modbusService.deleteDevice(device.id).subscribe({
      next: () => this.devices.update(d => d.filter(x => x.id !== device.id))
    });
  }

  toggleDevice(device: ModbusDevice) {
    this.modbusService.toggleDevice(device.id).subscribe({
      next: (updated) => this.devices.update(d => d.map(x => x.id === updated.id ? updated : x))
    });
  }

  syncFromBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.modbusService.syncFromBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.loadDevices();
        this.showMsg(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMsg(`Sync failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  applyToBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.modbusService.applyToBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.showMsg(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMsg(`Apply failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  private getDefaultForm(): ModbusDeviceCreate {
    return { description: '', port: 502, slave_addr: 1, start_reg_addr: 0, end_reg_addr: 0, start_data: 0, end_data: 0, device_type: 0, poll_interval: 1.0, is_active: true };
  }

  private showMsg(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
