import { Component, signal, inject, OnInit } from '@angular/core';
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
  selector: 'app-admin-threshold-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="threshold-config-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Threshold Configuration</h2>
          <p class="subtitle">Manage AI algorithm confidence thresholds per AI Box</p>
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
            Sync from BM-APP
          </button>
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || syncing()" (click)="applyToBmapp()">
            <mat-icon>cloud_upload</mat-icon>
            Apply to BM-APP
          </button>
          <button class="action-btn primary" [disabled]="!selectedAiBoxId() || saving()" (click)="saveAll()">
            <mat-icon>save</mat-icon>
            Save Changes
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>tune</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to manage its algorithm thresholds</p>
        </div>
      } @else if (loading()) {
        <div class="loading-state">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          <p>Loading thresholds...</p>
        </div>
      } @else if (thresholds().length === 0) {
        <div class="empty-state">
          <mat-icon>info</mat-icon>
          <h3>No thresholds found</h3>
          <p>Sync from BM-APP to import algorithm thresholds for this box</p>
          <button class="action-btn primary" (click)="syncFromBmapp()">
            <mat-icon>cloud_download</mat-icon>
            Sync Now
          </button>
        </div>
      } @else {
        @if (syncMessage()) {
          <div class="sync-message" [class.success]="syncSuccess()">
            <mat-icon>{{ syncSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ syncMessage() }}
          </div>
        }

        <div class="thresholds-grid">
          @for (threshold of thresholds(); track threshold.id) {
            <div class="threshold-card" [class.modified]="isModified(threshold)">
              <div class="card-header">
                <span class="algo-index">#{{ threshold.algorithm_index }}</span>
                <div class="item-info">
                  <h4>{{ threshold.algorithm_name }}</h4>
                  <span class="sync-badge" [class.synced]="threshold.is_synced_bmapp">
                    {{ threshold.is_synced_bmapp ? 'Synced' : 'Modified' }}
                  </span>
                </div>
              </div>
              <div class="slider-container">
                <div class="slider-header">
                  <span class="current-value">{{ (getEditValue(threshold) * 100).toFixed(0) }}%</span>
                  <span class="range-info">0% - 100%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01"
                       [value]="getEditValue(threshold)"
                       (input)="onSliderChange(threshold.id, $event)">
                <div class="slider-track">
                  <div class="slider-fill" [style.width.%]="getEditValue(threshold) * 100"></div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .threshold-config-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .aibox-select { padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; min-width: 180px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
    .empty-state h3 { margin: 0; font-size: 20px; color: var(--text-primary); }
    .empty-state p { margin: 0; font-size: 14px; }

    .sync-message { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 14px; }
    .sync-message.success { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #22c55e; }

    .thresholds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .threshold-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px; }
    .threshold-card.modified { border-color: var(--accent-primary); }

    .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
    .algo-index { font-size: 11px; background: rgba(0,212,255,0.1); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-family: monospace; white-space: nowrap; }
    .item-info { flex: 1; }
    .item-info h4 { margin: 0 0 4px; font-size: 13px; color: var(--text-primary); line-height: 1.3; }
    .sync-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: rgba(107,114,128,0.2); color: var(--text-muted); }
    .sync-badge.synced { background: rgba(34,197,94,0.1); color: #22c55e; }

    .slider-container { position: relative; }
    .slider-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .current-value { font-size: 18px; font-weight: 600; color: var(--accent-primary); }
    .range-info { font-size: 11px; color: var(--text-muted); }

    .slider-container input[type="range"] { width: 100%; height: 8px; -webkit-appearance: none; background: transparent; position: relative; z-index: 2; cursor: pointer; }
    .slider-container input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent-primary); cursor: pointer; margin-top: -5px; }
    .slider-container input[type="range"]::-webkit-slider-runnable-track { height: 8px; background: transparent; border-radius: 4px; }

    .slider-track { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; pointer-events: none; }
    .slider-fill { height: 100%; background: linear-gradient(90deg, var(--accent-primary), #00f2ff); border-radius: 4px; transition: width 0.1s; }
  `]
})
export class AdminThresholdConfigComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private thresholdsService = inject(ThresholdsService);

  selectedAiBoxId = signal<string | null>(null);
  thresholds = signal<AlgorithmThreshold[]>([]);
  loading = signal(false);
  saving = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);

  // Track edited values separately to avoid modifying source data
  private editValues = new Map<string, number>();

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.editValues.clear();
    this.loadThresholds();
  }

  loadThresholds() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loading.set(true);
    this.thresholdsService.getThresholds({ aibox_id: id }).subscribe({
      next: (data) => {
        this.thresholds.set(data);
        this.editValues.clear();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getEditValue(threshold: AlgorithmThreshold): number {
    return this.editValues.get(threshold.id) ?? threshold.threshold_value;
  }

  isModified(threshold: AlgorithmThreshold): boolean {
    return this.editValues.has(threshold.id) && this.editValues.get(threshold.id) !== threshold.threshold_value;
  }

  onSliderChange(id: string, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.editValues.set(id, value);
    // Trigger change detection
    this.thresholds.update(t => [...t]);
  }

  saveAll() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.saving.set(true);
    const updates = Array.from(this.editValues.entries()).map(([tid, value]) => ({
      id: tid,
      threshold_value: value
    }));
    if (updates.length === 0) {
      this.saving.set(false);
      return;
    }
    this.thresholdsService.bulkUpdate(id, updates).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.editValues.clear();
        this.loadThresholds();
        this.showMessage(`Saved ${result.updated} thresholds`, true);
      },
      error: (err) => {
        this.saving.set(false);
        this.showMessage(`Save failed: ${err.error?.detail || err.message}`, false);
      }
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
        this.showMessage(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMessage(`Sync failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  applyToBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.thresholdsService.applyToBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.showMessage(result.message, result.success);
      },
      error: (err) => {
        this.syncing.set(false);
        this.showMessage(`Apply failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  private showMessage(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
