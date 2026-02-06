import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { BmappSensor, SensorDeviceType } from '../../../core/models/analytics.model';

@Component({
  selector: 'app-admin-sensor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule,
    MatInputModule, MatSelectModule
  ],
  template: `
    <div class="sensor-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Sensor Management</h2>
          <p class="subtitle">Manage sensor devices on BM-APP</p>
        </div>
        <div class="header-actions">
          <button class="action-btn primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add Sensor
          </button>
          <button class="action-btn" (click)="loadSensors()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon>sensors</mat-icon>
          <div class="stat-info">
            <span class="value">{{ sensors().length }}</span>
            <span class="label">Total Sensors</span>
          </div>
        </div>
        <div class="stat-card types">
          <mat-icon>category</mat-icon>
          <div class="stat-info">
            <span class="value">{{ sensorTypes().length }}</span>
            <span class="label">Available Types</span>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Loading sensors from BM-APP...</span>
        </div>
      } @else {
        <div class="sensors-grid">
          @for (sensor of sensors(); track sensor.name) {
            <div class="sensor-card">
              <div class="card-header">
                <div class="sensor-icon" [class]="getSensorTypeClass(sensor.type)">
                  <mat-icon>{{ getSensorIcon(sensor.type) }}</mat-icon>
                </div>
                <div class="sensor-info">
                  <h4>{{ sensor.name }}</h4>
                  <span class="sensor-type">{{ getSensorTypeName(sensor.type) }}</span>
                </div>
                <div class="sensor-actions">
                  <button class="icon-btn" (click)="confirmCleanData(sensor)" title="Clean Data">
                    <mat-icon>delete_sweep</mat-icon>
                  </button>
                  <button class="icon-btn danger" (click)="confirmDelete(sensor)" title="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="sensor-detail">
                  <span class="label">Protocol:</span>
                  <span class="value">{{ sensor.protocol || 'N/A' }}</span>
                </div>
                <div class="sensor-detail">
                  <span class="label">Unique ID:</span>
                  <span class="value">{{ sensor.unique || sensor.name }}</span>
                </div>
                @if (sensor.create_ms) {
                  <div class="sensor-detail">
                    <span class="label">Created:</span>
                    <span class="value">{{ formatDate(sensor.create_ms) }}</span>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>sensors</mat-icon>
              <span>No sensors configured</span>
              <button class="action-btn primary" (click)="openCreateDialog()">
                <mat-icon>add</mat-icon>
                Add First Sensor
              </button>
            </div>
          }
        </div>
      }

      <!-- Create Dialog -->
      @if (showCreateDialog()) {
        <div class="dialog-overlay" (click)="closeCreateDialog()">
          <div class="dialog-content" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Add New Sensor</h3>
              <button class="close-btn" (click)="closeCreateDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <mat-form-field appearance="outline">
                <mat-label>Sensor Name</mat-label>
                <input matInput [(ngModel)]="newSensor.name" placeholder="e.g., Temperature Sensor 1">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Sensor Type</mat-label>
                <mat-select [(ngModel)]="newSensor.type" (selectionChange)="onTypeChange()">
                  @for (type of sensorTypes(); track type.type) {
                    <mat-option [value]="type.type">{{ type.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (selectedType()) {
                <mat-form-field appearance="outline">
                  <mat-label>Protocol</mat-label>
                  <input matInput [value]="selectedType()?.protocol" disabled>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Unique ID (optional)</mat-label>
                  <input matInput [(ngModel)]="newSensor.unique" [placeholder]="newSensor.name || 'Auto-generated from name'">
                </mat-form-field>
              }
            </div>
            <div class="dialog-actions">
              <button class="action-btn" (click)="closeCreateDialog()">Cancel</button>
              <button class="action-btn primary" (click)="createSensor()" [disabled]="creating() || !newSensor.name || !newSensor.type">
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
      @if (sensorToDelete()) {
        <div class="dialog-overlay" (click)="cancelDelete()">
          <div class="dialog-content small" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Delete Sensor</h3>
            </div>
            <div class="dialog-body">
              <p>Are you sure you want to delete <strong>{{ sensorToDelete()?.name }}</strong>?</p>
              <p class="warning">This will also delete all sensor data. This action cannot be undone.</p>
            </div>
            <div class="dialog-actions">
              <button class="action-btn" (click)="cancelDelete()">Cancel</button>
              <button class="action-btn danger" (click)="deleteSensor()" [disabled]="deleting()">
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

      <!-- Clean Data Confirmation Dialog -->
      @if (sensorToClean()) {
        <div class="dialog-overlay" (click)="cancelClean()">
          <div class="dialog-content small" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Clean Sensor Data</h3>
            </div>
            <div class="dialog-body">
              <p>Are you sure you want to clean all data for <strong>{{ sensorToClean()?.name }}</strong>?</p>
              <p class="warning">This will delete all historical readings. The sensor will remain configured.</p>
            </div>
            <div class="dialog-actions">
              <button class="action-btn" (click)="cancelClean()">Cancel</button>
              <button class="action-btn danger" (click)="cleanSensorData()" [disabled]="cleaning()">
                @if (cleaning()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>delete_sweep</mat-icon>
                }
                Clean Data
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sensor-page { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;
    }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

    .header-actions { display: flex; gap: 8px; align-items: center; }

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

    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      display: flex; align-items: center; gap: 16px; padding: 20px;
      background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px;
    }
    .stat-card mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
    .stat-card.types mat-icon { color: #8b5cf6; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 28px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 13px; color: var(--text-muted); }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
    }

    .sensors-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .sensor-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s;
    }
    .sensor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    .card-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .sensor-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    }
    .sensor-icon.http { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .sensor-icon.io { background: linear-gradient(135deg, #22c55e, #15803d); }
    .sensor-icon.modbus { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .sensor-icon.lora { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
    .sensor-icon.default { background: linear-gradient(135deg, #6b7280, #4b5563); }

    .sensor-info { flex: 1; }
    .sensor-info h4 { margin: 0 0 2px; font-size: 15px; color: var(--text-primary); }
    .sensor-type { font-size: 12px; color: var(--text-muted); }

    .sensor-actions { display: flex; gap: 4px; }

    .icon-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 6px;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .icon-btn:hover { background: var(--glass-border); }
    .icon-btn.danger { color: #ef4444; }
    .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.1); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .card-body { padding: 16px 20px; }

    .sensor-detail {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--glass-border);
      font-size: 13px;
    }
    .sensor-detail:last-child { border-bottom: none; }
    .sensor-detail .label { color: var(--text-muted); }
    .sensor-detail .value { color: var(--text-primary); font-weight: 500; }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 60px 20px; color: var(--text-tertiary);
      mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.5; }
    }

    // Dialog styles
    .dialog-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }

    .dialog-content {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto;
    }
    .dialog-content.small { max-width: 400px; }

    .dialog-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
    }

    .close-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 8px;
      background: var(--glass-bg-hover);
      color: var(--text-secondary);
      cursor: pointer;
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
  `]
})
export class AdminSensorComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private snackBar = inject(MatSnackBar);

  sensors = signal<BmappSensor[]>([]);
  sensorTypes = signal<SensorDeviceType[]>([]);
  loading = signal(true);
  creating = signal(false);
  deleting = signal(false);
  cleaning = signal(false);
  showCreateDialog = signal(false);
  sensorToDelete = signal<BmappSensor | null>(null);
  sensorToClean = signal<BmappSensor | null>(null);

  newSensor = { name: '', type: 0, unique: '', protocol: 'HTTP' };

  selectedType = computed(() => {
    return this.sensorTypes().find(t => t.type === this.newSensor.type) || null;
  });

  ngOnInit(): void {
    this.loadSensorTypes();
    this.loadSensors();
  }

  loadSensorTypes(): void {
    this.analyticsService.getSensorDeviceTypes().subscribe({
      next: (data) => {
        this.sensorTypes.set(data.types || []);
      },
      error: (err) => {
        console.error('Failed to load sensor types:', err);
      }
    });
  }

  loadSensors(): void {
    this.loading.set(true);
    this.analyticsService.getSensorsBmapp().subscribe({
      next: (data) => {
        this.sensors.set(data.sensors || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load sensors:', err);
        this.snackBar.open('Failed to load sensors from BM-APP', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    this.newSensor = { name: '', type: 0, unique: '', protocol: 'HTTP' };
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  onTypeChange(): void {
    const type = this.selectedType();
    if (type) {
      this.newSensor.protocol = type.protocol;
    }
  }

  createSensor(): void {
    if (!this.newSensor.name || !this.newSensor.type) return;

    const type = this.selectedType();
    this.creating.set(true);
    this.analyticsService.createSensor({
      name: this.newSensor.name,
      sensor_type: this.newSensor.type,
      unique: this.newSensor.unique || this.newSensor.name,
      protocol: type?.protocol || 'HTTP',
      extra_params: []
    }).subscribe({
      next: () => {
        this.snackBar.open('Sensor created successfully', 'Close', { duration: 3000 });
        this.creating.set(false);
        this.closeCreateDialog();
        this.loadSensors();
      },
      error: (err) => {
        console.error('Failed to create sensor:', err);
        this.snackBar.open('Failed to create sensor', 'Close', { duration: 3000 });
        this.creating.set(false);
      }
    });
  }

  confirmDelete(sensor: BmappSensor): void {
    this.sensorToDelete.set(sensor);
  }

  cancelDelete(): void {
    this.sensorToDelete.set(null);
  }

  deleteSensor(): void {
    const sensor = this.sensorToDelete();
    if (!sensor) return;

    this.deleting.set(true);
    this.analyticsService.deleteSensor(sensor.name).subscribe({
      next: () => {
        this.snackBar.open('Sensor deleted successfully', 'Close', { duration: 3000 });
        this.deleting.set(false);
        this.sensorToDelete.set(null);
        this.loadSensors();
      },
      error: (err) => {
        console.error('Failed to delete sensor:', err);
        this.snackBar.open('Failed to delete sensor', 'Close', { duration: 3000 });
        this.deleting.set(false);
      }
    });
  }

  confirmCleanData(sensor: BmappSensor): void {
    this.sensorToClean.set(sensor);
  }

  cancelClean(): void {
    this.sensorToClean.set(null);
  }

  cleanSensorData(): void {
    const sensor = this.sensorToClean();
    if (!sensor) return;

    this.cleaning.set(true);
    this.analyticsService.cleanSensorData(sensor.name).subscribe({
      next: () => {
        this.snackBar.open('Sensor data cleaned successfully', 'Close', { duration: 3000 });
        this.cleaning.set(false);
        this.sensorToClean.set(null);
      },
      error: (err) => {
        console.error('Failed to clean sensor data:', err);
        this.snackBar.open('Failed to clean sensor data', 'Close', { duration: 3000 });
        this.cleaning.set(false);
      }
    });
  }

  getSensorIcon(type: number): string {
    const icons: Record<number, string> = {
      0: 'accessibility', // Depth sensor
      1: 'http', // Custom HTTP
      3: 'input', // GPIO
      4: 'memory', // Modbus
      5: 'usb', // RS232
      6: 'wifi' // LORA
    };
    return icons[type] || 'sensors';
  }

  getSensorTypeClass(type: number): string {
    if (type === 1 || type === 0) return 'http';
    if (type === 3) return 'io';
    if (type === 4) return 'modbus';
    if (type === 5 || type === 6) return 'lora';
    return 'default';
  }

  getSensorTypeName(type: number): string {
    const sensorType = this.sensorTypes().find(t => t.type === type);
    if (sensorType) return sensorType.name;

    const names: Record<number, string> = {
      0: 'Depth Sensor',
      1: 'Custom HTTP',
      3: 'GPIO Input',
      4: 'Modbus Sensor',
      5: 'RS232 Transfer',
      6: 'LORA Data'
    };
    return names[type] || `Type ${type}`;
  }

  formatDate(ms: number): string {
    return new Date(ms).toLocaleString();
  }
}
