import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AIBoxService } from '../../../core/services/aibox.service';
import { ThresholdsService, AlgorithmThreshold } from '../../../core/services/thresholds.service';

@Component({
  selector: 'app-admin-feature-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="feature-management-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Feature Management</h2>
          <p class="subtitle">Enable or disable AI algorithm features per AI Box</p>
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
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || saving()" (click)="saveChanges()">
            <mat-icon>save</mat-icon>
            Save Changes
          </button>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || saving()" (click)="applyToBmapp()">
            <mat-icon>cloud_upload</mat-icon>
            Apply
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>extension</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to manage its AI algorithm features</p>
        </div>
      } @else if (loading()) {
        <div class="loading-state"><mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner></div>
      } @else {
        @if (syncMessage()) {
          <div class="sync-message" [class.success]="syncSuccess()">
            <mat-icon>{{ syncSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ syncMessage() }}
          </div>
        }

        @if (thresholds().length === 0) {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <h3>No algorithm thresholds found</h3>
            <p>Sync from BM-APP to import algorithm capabilities</p>
            <button class="action-btn primary" (click)="syncFromBmapp()">
              <mat-icon>cloud_download</mat-icon>
              Sync Now
            </button>
          </div>
        } @else {
          <div class="stats-row">
            <div class="stat-card">
              <mat-icon>extension</mat-icon>
              <div class="stat-info">
                <span class="value">{{ thresholds().length }}</span>
                <span class="label">Total Features</span>
              </div>
            </div>
            <div class="stat-card enabled">
              <mat-icon>check_circle</mat-icon>
              <div class="stat-info">
                <span class="value">{{ enabledCount() }}</span>
                <span class="label">Enabled</span>
              </div>
            </div>
            <div class="stat-card disabled">
              <mat-icon>cancel</mat-icon>
              <div class="stat-info">
                <span class="value">{{ disabledCount() }}</span>
                <span class="label">Disabled</span>
              </div>
            </div>
            <div class="stat-card modified">
              <mat-icon>edit</mat-icon>
              <div class="stat-info">
                <span class="value">{{ pendingChanges() }}</span>
                <span class="label">Pending Changes</span>
              </div>
            </div>
          </div>

          <div class="features-table">
            <div class="table-header">
              <span>#</span>
              <span>Algorithm Name</span>
              <span>Threshold</span>
              <span>Status</span>
              <span>Synced</span>
            </div>
            @for (thresh of thresholds(); track thresh.id) {
              <div class="table-row" [class.modified]="hasEdit(thresh.id)" [class.disabled-row]="isDisabled(thresh)">
                <span class="index-cell">{{ thresh.algorithm_index }}</span>
                <span class="name-cell">{{ thresh.algorithm_name }}</span>
                <span class="threshold-cell">
                  <input type="range" min="0" max="1" step="0.01"
                         [value]="getThresholdValue(thresh)"
                         (input)="onSliderInput(thresh.id, $event)"
                         [disabled]="isDisabled(thresh)">
                  <span class="threshold-val">{{ formatThreshold(getThresholdValue(thresh)) }}</span>
                </span>
                <span class="status-cell">
                  <label class="toggle" [title]="isDisabled(thresh) ? 'Enable' : 'Disable'">
                    <input type="checkbox" [checked]="!isDisabled(thresh)" (change)="toggleFeature(thresh, $event)">
                    <span class="toggle-slider"></span>
                  </label>
                </span>
                <span class="sync-dot" [class.synced]="thresh.is_synced_bmapp" [title]="thresh.is_synced_bmapp ? 'Synced' : 'Not synced'"></span>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .feature-management-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .aibox-select { padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; min-width: 180px; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
    .empty-state h3 { margin: 0; font-size: 20px; color: var(--text-primary); }
    .sync-message { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 14px; }
    .sync-message.success { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.enabled mat-icon { color: #22c55e; }
    .stat-card.disabled mat-icon { color: #6b7280; }
    .stat-card.modified mat-icon { color: #f59e0b; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }
    .features-table { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .table-header, .table-row { display: grid; grid-template-columns: 50px 1fr 200px 80px 50px; gap: 12px; padding: 10px 16px; align-items: center; font-size: 13px; }
    .table-header { background: rgba(0,0,0,0.2); font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .table-row { border-top: 1px solid var(--glass-border); transition: background 0.15s; }
    .table-row:hover { background: rgba(0,212,255,0.03); }
    .table-row.modified { background: rgba(245,158,11,0.04); }
    .table-row.disabled-row { opacity: 0.5; }
    .index-cell { font-family: monospace; font-size: 12px; color: var(--text-muted); }
    .name-cell { font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .threshold-cell { display: flex; align-items: center; gap: 8px; }
    .threshold-cell input[type="range"] { flex: 1; accent-color: var(--accent-primary); }
    .threshold-val { font-size: 12px; color: var(--text-muted); font-family: monospace; min-width: 36px; text-align: right; }
    .status-cell { display: flex; align-items: center; }
    .toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: rgba(100,100,100,0.3); border-radius: 22px; transition: 0.2s; }
    .toggle-slider:before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--accent-primary); }
    .toggle input:checked + .toggle-slider:before { transform: translateX(18px); }
    .sync-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; display: inline-block; margin: 0 auto; }
    .sync-dot.synced { background: #22c55e; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    @media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class AdminFeatureManagementComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private thresholdsService = inject(ThresholdsService);

  selectedAiBoxId = signal<string | null>(null);
  thresholds = signal<AlgorithmThreshold[]>([]);
  loading = signal(false);
  saving = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);

  private editValues = new Map<string, number>();
  private disabledIds = new Set<string>();

  enabledCount = computed(() => this.thresholds().filter(t => !this.isDisabled(t)).length);
  disabledCount = computed(() => this.thresholds().filter(t => this.isDisabled(t)).length);
  pendingChanges = computed(() => this.editValues.size + this.disabledIds.size);

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.editValues.clear();
    this.disabledIds.clear();
    this.thresholds.set([]);
    this.loadThresholds();
  }

  loadThresholds() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loading.set(true);
    this.thresholdsService.getThresholds({ aibox_id: id }).subscribe({
      next: (data) => { this.thresholds.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  isDisabled(thresh: AlgorithmThreshold): boolean {
    if (this.disabledIds.has(thresh.id)) return true;
    const editVal = this.editValues.get(thresh.id);
    return editVal !== undefined ? editVal === 0 : thresh.threshold_value === 0;
  }

  hasEdit(id: string): boolean {
    return this.editValues.has(id) || this.disabledIds.has(id);
  }

  getThresholdValue(thresh: AlgorithmThreshold): number {
    return this.editValues.get(thresh.id) ?? thresh.threshold_value;
  }

  formatThreshold(val: number): string {
    return val.toFixed(2);
  }

  onSliderInput(id: string, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.editValues.set(id, val);
    if (val === 0) {
      this.disabledIds.add(id);
    } else {
      this.disabledIds.delete(id);
    }
    this.thresholds.update(t => [...t]);
  }

  toggleFeature(thresh: AlgorithmThreshold, event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled) {
      this.disabledIds.delete(thresh.id);
      if (this.editValues.get(thresh.id) === 0) {
        this.editValues.set(thresh.id, 0.5);
      } else if (!this.editValues.has(thresh.id) && thresh.threshold_value === 0) {
        this.editValues.set(thresh.id, 0.5);
      }
    } else {
      this.disabledIds.add(thresh.id);
      this.editValues.set(thresh.id, 0);
    }
    this.thresholds.update(t => [...t]);
  }

  saveChanges() {
    const id = this.selectedAiBoxId();
    if (!id || this.editValues.size === 0) return;
    this.saving.set(true);
    const updates = Array.from(this.editValues.entries()).map(([threshId, value]) => ({
      id: threshId,
      threshold_value: value
    }));
    this.thresholdsService.bulkUpdate(id, updates).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.editValues.clear();
        this.disabledIds.clear();
        this.loadThresholds();
        this.showMsg(`Saved ${result.updated} features`, true);
      },
      error: (err) => {
        this.saving.set(false);
        this.showMsg(err.error?.detail || 'Save failed', false);
      }
    });
  }

  applyToBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.saving.set(true);
    this.thresholdsService.applyToBmapp(id).subscribe({
      next: (result) => { this.saving.set(false); this.showMsg(result.message, result.success); },
      error: (err) => { this.saving.set(false); this.showMsg(err.error?.detail || 'Apply failed', false); }
    });
  }

  syncFromBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.thresholdsService.syncFromBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.loadThresholds();
        this.showMsg(result.message, result.success);
      },
      error: (err) => { this.syncing.set(false); this.showMsg(err.error?.detail || 'Sync failed', false); }
    });
  }

  private showMsg(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
