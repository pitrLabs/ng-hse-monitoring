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
  selector: 'app-admin-preference',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="preference-page">
      <div class="page-header">
        <div class="header-left">
          <h2>System Preferences</h2>
          <p class="subtitle">Manage all system configuration key-value pairs per AI Box</p>
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
            Save All
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>settings</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to manage its system preferences</p>
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

        <!-- Category Tabs -->
        <div class="tabs">
          <button class="tab" [class.active]="selectedCategory() === 'all'" (click)="selectedCategory.set('all')">All</button>
          @for (cat of categories(); track cat) {
            <button class="tab" [class.active]="selectedCategory() === cat" (click)="selectedCategory.set(cat)">
              {{ cat | titlecase }}
              <span class="count">{{ getCountByCategory(cat) }}</span>
            </button>
          }
        </div>

        @if (filteredPreferences().length === 0) {
          <div class="empty-state">
            <mat-icon>info</mat-icon>
            <h3>No preferences found</h3>
            <p>Sync from BM-APP to import preferences for this box</p>
            <button class="action-btn primary" (click)="syncFromBmapp()">
              <mat-icon>cloud_download</mat-icon>
              Sync Now
            </button>
          </div>
        } @else {
          <div class="prefs-table">
            <div class="table-header">
              <span>Key</span>
              <span>Value</span>
              <span>Category</span>
              <span>Type</span>
              <span>Synced</span>
            </div>
            @for (pref of filteredPreferences(); track pref.id) {
              <div class="table-row" [class.modified]="hasEdit(pref.id)">
                <span class="key-cell" [title]="pref.description || ''">{{ pref.key }}</span>
                <input class="value-input" [type]="pref.value_type === 'int' || pref.value_type === 'float' ? 'number' : 'text'"
                       [value]="getEditValue(pref)"
                       (change)="onValueChange(pref.id, $event)">
                <span class="cat-badge cat-{{ pref.category }}">{{ pref.category }}</span>
                <span class="type-tag">{{ pref.value_type }}</span>
                <span class="sync-dot" [class.synced]="pref.is_synced_bmapp" [title]="pref.is_synced_bmapp ? 'Synced' : 'Not synced'"></span>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .preference-page { padding: 0; }
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

    .tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { padding: 7px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 20px; color: var(--text-muted); font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .tab.active { background: var(--accent-primary); color: white; border-color: transparent; }
    .count { font-size: 11px; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }

    .prefs-table { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 3fr 100px 70px 50px; gap: 12px; padding: 10px 16px; align-items: center; font-size: 13px; }
    .table-header { background: rgba(0,0,0,0.2); font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .table-row { border-top: 1px solid var(--glass-border); }
    .table-row.modified { background: rgba(0,212,255,0.03); }
    .key-cell { font-family: monospace; font-size: 12px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: help; }
    .value-input { padding: 6px 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 13px; font-family: monospace; width: 100%; box-sizing: border-box; }
    .value-input:focus { outline: none; border-color: var(--accent-primary); }
    .cat-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; text-align: center; }
    .cat-basic { background: rgba(34,197,94,0.1); color: #22c55e; }
    .cat-network { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .cat-alarm { background: rgba(239,68,68,0.1); color: #ef4444; }
    .cat-encoding { background: rgba(168,85,247,0.1); color: #a855f7; }
    .cat-database { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .cat-system { background: rgba(107,114,128,0.1); color: #6b7280; }
    .type-tag { font-size: 11px; color: var(--text-muted); font-family: monospace; }
    .sync-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; display: inline-block; margin: 0 auto; }
    .sync-dot.synced { background: #22c55e; }

    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
  `]
})
export class AdminPreferenceComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private prefsService = inject(PreferencesService);

  selectedAiBoxId = signal<string | null>(null);
  preferences = signal<SystemPreference[]>([]);
  selectedCategory = signal<string>('all');
  loading = signal(false);
  saving = signal(false);
  syncing = signal(false);
  syncMessage = signal('');
  syncSuccess = signal(false);

  private editValues = new Map<string, string>();

  categories = computed(() => [...new Set(this.preferences().map(p => p.category))].sort());

  filteredPreferences = computed(() => {
    const cat = this.selectedCategory();
    const prefs = this.preferences();
    return cat === 'all' ? prefs : prefs.filter(p => p.category === cat);
  });

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.editValues.clear();
    this.selectedCategory.set('all');
    this.loadPreferences();
  }

  loadPreferences() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loading.set(true);
    this.prefsService.getPreferences({ aibox_id: id }).subscribe({
      next: (data) => { this.preferences.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getCountByCategory(cat: string): number {
    return this.preferences().filter(p => p.category === cat).length;
  }

  getEditValue(pref: SystemPreference): string {
    return this.editValues.get(pref.id) ?? pref.value;
  }

  hasEdit(id: string): boolean {
    return this.editValues.has(id);
  }

  onValueChange(id: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.editValues.set(id, value);
    this.preferences.update(p => [...p]);
  }

  saveAll() {
    const id = this.selectedAiBoxId();
    if (!id || this.editValues.size === 0) return;
    this.saving.set(true);
    const updates = Array.from(this.editValues.entries()).map(([prefId, value]) => {
      const pref = this.preferences().find(p => p.id === prefId);
      return { key: pref?.key || prefId, value };
    }).filter(u => u.key);

    this.prefsService.bulkUpdate(id, updates).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.editValues.clear();
        this.loadPreferences();
        this.showMsg(`Saved ${result.updated} preferences`, true);
      },
      error: (err) => {
        this.saving.set(false);
        this.showMsg(`Save failed: ${err.error?.detail || err.message}`, false);
      }
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
    this.prefsService.applyToBmapp(id).subscribe({
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

  private showMsg(msg: string, success: boolean) {
    this.syncMessage.set(msg);
    this.syncSuccess.set(success);
    setTimeout(() => this.syncMessage.set(''), 5000);
  }
}
