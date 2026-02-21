import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AIBoxService } from '../../../core/services/aibox.service';
import { PreferencesService, SystemPreference } from '../../../core/services/preferences.service';

@Component({
  selector: 'app-admin-basic',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="basic-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Basic Settings</h2>
          <p class="subtitle">Configure core system preferences per AI Box</p>
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
          <button class="action-btn primary" [disabled]="!selectedAiBoxId() || saving()" (click)="saveAndApply()">
            <mat-icon>save</mat-icon>
            Save & Apply
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>tune</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to configure its basic settings</p>
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

        @if (basicPrefs().length === 0) {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <h3>No basic settings found</h3>
            <p>Sync from BM-APP to import settings for this box</p>
            <button class="action-btn primary" (click)="syncFromBmapp()">
              <mat-icon>cloud_download</mat-icon>
              Sync Now
            </button>
          </div>
        } @else {
          <div class="settings-grid">
            @for (pref of basicPrefs(); track pref.id) {
              <div class="setting-item" [class.toggle-item]="pref.value_type === 'bool'">
                <div class="setting-info">
                  <label class="setting-label">{{ formatKey(pref.key) }}</label>
                  @if (pref.description) {
                    <span class="setting-desc">{{ pref.description }}</span>
                  }
                </div>
                @if (pref.value_type === 'bool') {
                  <label class="toggle">
                    <input type="checkbox" [checked]="getBoolValue(pref)" (change)="onBoolChange(pref.id, $event)">
                    <span class="toggle-slider"></span>
                  </label>
                } @else if (pref.value_type === 'int' || pref.value_type === 'float') {
                  <input class="field-input number" type="number"
                         [value]="getEditValue(pref)"
                         (change)="onValueChange(pref.id, $event)"
                         [placeholder]="pref.key">
                } @else {
                  <input class="field-input" type="text"
                         [value]="getEditValue(pref)"
                         (change)="onValueChange(pref.id, $event)"
                         [placeholder]="pref.key">
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .basic-page { padding: 0; }
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
    .settings-grid { display: flex; flex-direction: column; gap: 2px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--glass-border); gap: 16px; }
    .setting-item:last-child { border-bottom: none; }
    .setting-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .setting-label { font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .setting-desc { font-size: 12px; color: var(--text-muted); }
    .field-input { padding: 8px 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 14px; font-family: monospace; min-width: 200px; }
    .field-input.number { min-width: 100px; }
    .field-input:focus { outline: none; border-color: var(--accent-primary); }
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: rgba(100,100,100,0.3); border-radius: 24px; transition: 0.2s; }
    .toggle-slider:before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--accent-primary); }
    .toggle input:checked + .toggle-slider:before { transform: translateX(20px); }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
  `]
})
export class AdminBasicComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private prefsService = inject(PreferencesService);

  selectedAiBoxId = signal<string | null>(null);
  preferences = signal<SystemPreference[]>([]);
  loading = signal(false);
  saving = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);

  private editValues = new Map<string, string>();

  basicPrefs = computed(() => this.preferences().filter(p => p.category === 'basic'));

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.editValues.clear();
    this.preferences.set([]);
    this.loadPreferences();
  }

  loadPreferences() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loading.set(true);
    this.prefsService.getPreferences({ aibox_id: id, category: 'basic' }).subscribe({
      next: (data) => { this.preferences.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getEditValue(pref: SystemPreference): string {
    return this.editValues.get(pref.id) ?? pref.value;
  }

  getBoolValue(pref: SystemPreference): boolean {
    const val = this.editValues.get(pref.id) ?? pref.value;
    return val === 'true' || val === '1';
  }

  onValueChange(id: string, event: Event) {
    this.editValues.set(id, (event.target as HTMLInputElement).value);
  }

  onBoolChange(id: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.editValues.set(id, checked ? 'true' : 'false');
  }

  formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  saveAndApply() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.saving.set(true);
    const updates = Array.from(this.editValues.entries()).map(([prefId, value]) => {
      const pref = this.preferences().find(p => p.id === prefId);
      return { key: pref?.key || '', value };
    }).filter(u => u.key);

    if (updates.length === 0) {
      this.prefsService.applyToBmapp(id).subscribe({
        next: (r) => { this.saving.set(false); this.showMsg(r.message, r.success); },
        error: (err) => { this.saving.set(false); this.showMsg(err.error?.detail, false); }
      });
      return;
    }

    this.prefsService.bulkUpdate(id, updates).subscribe({
      next: () => {
        this.editValues.clear();
        this.prefsService.applyToBmapp(id).subscribe({
          next: (r) => { this.saving.set(false); this.showMsg(r.message, r.success); },
          error: (err) => { this.saving.set(false); this.showMsg(err.error?.detail, false); }
        });
      },
      error: (err) => { this.saving.set(false); this.showMsg(err.error?.detail, false); }
    });
  }

  syncFromBmapp() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.syncing.set(true);
    this.prefsService.syncFromBmapp(id).subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.loadPreferences();
        this.showMsg(result.message, result.success);
      },
      error: (err) => { this.syncing.set(false); this.showMsg(err.error?.detail, false); }
    });
  }

  private showMsg(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
