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
  selector: 'app-admin-database',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="database-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Database Configuration</h2>
          <p class="subtitle">Manage external database connection settings per AI Box</p>
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
          <button class="action-btn secondary" [disabled]="!selectedAiBoxId() || saving()" (click)="saveAndApply()">
            <mat-icon>cloud_upload</mat-icon>
            Save & Apply
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>storage</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to configure its database settings</p>
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

        @if (dbPrefs().length === 0) {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <h3>No database settings</h3>
            <p>Sync from BM-APP to import database configuration</p>
            <button class="action-btn primary" (click)="syncFromBmapp()">
              <mat-icon>cloud_download</mat-icon>
              Sync Now
            </button>
          </div>
        } @else {
          <div class="config-grid">
            @for (pref of dbPrefs(); track pref.id) {
              <div class="config-field">
                <label>{{ formatKey(pref.key) }}</label>
                <input
                  class="field-input"
                  [type]="isPasswordField(pref.key) ? 'password' : (pref.value_type === 'int' || pref.value_type === 'float' ? 'number' : 'text')"
                  [value]="getEditValue(pref)"
                  (change)="onValueChange(pref.id, $event)"
                  [placeholder]="pref.key">
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .database-page { padding: 0; }
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
    .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .config-field { display: flex; flex-direction: column; gap: 6px; }
    .config-field label { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    .field-input { padding: 10px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; font-family: monospace; }
    .field-input:focus { outline: none; border-color: var(--accent-primary); }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
  `]
})
export class AdminDatabaseComponent implements OnInit {
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

  dbPrefs = computed(() => this.preferences().filter(p => p.category === 'database'));

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
    this.prefsService.getPreferences({ aibox_id: id, category: 'database' }).subscribe({
      next: (data) => { this.preferences.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getEditValue(pref: SystemPreference): string {
    return this.editValues.get(pref.id) ?? pref.value;
  }

  onValueChange(id: string, event: Event) {
    this.editValues.set(id, (event.target as HTMLInputElement).value);
  }

  isPasswordField(key: string): boolean {
    return key.toLowerCase().includes('password') || key.toLowerCase().includes('passwd');
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
