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

interface PPEItem {
  id: string;
  name: string;
  category: 'head' | 'body' | 'hand' | 'foot' | 'face';
  icon: string;
  enabled: boolean;
  confidence: number;
  required: boolean;
}

@Component({
  selector: 'app-admin-suit-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="suit-config-page">
      <div class="page-header">
        <div class="header-left">
          <h2>PPE Detection Configuration</h2>
          <p class="subtitle">Configure Personal Protective Equipment detection per AI Box</p>
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
          <button class="action-btn primary" [disabled]="!selectedAiBoxId() || saving()" (click)="saveConfig()">
            <mat-icon>save</mat-icon>
            Save & Apply
          </button>
        </div>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>checkroom</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to configure PPE detection settings</p>
        </div>
      } @else {
        @if (syncMessage()) {
          <div class="sync-message" [class.success]="syncSuccess()">
            <mat-icon>{{ syncSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ syncMessage() }}
          </div>
        }

        <div class="config-layout">
          <div class="body-diagram">
            <div class="diagram-container">
              <svg viewBox="0 0 200 400" class="human-figure">
                <circle cx="100" cy="40" r="30" [class.active]="hasActiveInCategory('head')" class="body-part head"/>
                <rect x="60" y="75" width="80" height="120" rx="10" [class.active]="hasActiveInCategory('body')" class="body-part body"/>
                <rect x="20" y="85" width="35" height="80" rx="8" [class.active]="hasActiveInCategory('hand')" class="body-part hand"/>
                <rect x="145" y="85" width="35" height="80" rx="8" [class.active]="hasActiveInCategory('hand')" class="body-part hand"/>
                <rect x="65" y="200" width="30" height="120" rx="8" [class.active]="hasActiveInCategory('foot')" class="body-part foot"/>
                <rect x="105" y="200" width="30" height="120" rx="8" [class.active]="hasActiveInCategory('foot')" class="body-part foot"/>
                <circle cx="100" cy="40" r="18" [class.active]="hasActiveInCategory('face')" class="body-part face" fill="none" stroke-width="3"/>
              </svg>
              <div class="diagram-legend">
                <div class="legend-item"><span class="dot head"></span>Head Protection</div>
                <div class="legend-item"><span class="dot body"></span>Body Protection</div>
                <div class="legend-item"><span class="dot hand"></span>Hand Protection</div>
                <div class="legend-item"><span class="dot foot"></span>Foot Protection</div>
                <div class="legend-item"><span class="dot face"></span>Face Protection</div>
              </div>
            </div>
          </div>

          <div class="ppe-settings">
            @if (loading()) {
              <div class="loading-state"><mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner></div>
            } @else if (ppePrefs().length > 0) {
              <div class="prefs-section">
                <h3>PPE Preferences (from BM-APP)</h3>
                @for (pref of ppePrefs(); track pref.id) {
                  <div class="pref-row">
                    <span class="pref-key">{{ formatKey(pref.key) }}</span>
                    <input class="pref-input" type="text"
                           [value]="getEditValue(pref)"
                           (change)="onValueChange(pref.id, $event)"
                           [placeholder]="pref.key">
                  </div>
                }
              </div>
            } @else {
              @for (category of categories; track category.key) {
                <div class="category-section">
                  <h3 class="category-title">
                    <mat-icon>{{ category.icon }}</mat-icon>
                    {{ category.label }}
                  </h3>
                  <div class="ppe-items">
                    @for (item of getItemsByCategory(category.key); track item.id) {
                      <div class="ppe-item" [class.enabled]="item.enabled">
                        <div class="item-header">
                          <label class="toggle">
                            <input type="checkbox" [(ngModel)]="item.enabled">
                            <span class="toggle-slider"></span>
                          </label>
                          <div class="item-info">
                            <span class="item-name">{{ item.name }}</span>
                            @if (item.required) {
                              <span class="required-badge">Required</span>
                            }
                          </div>
                        </div>
                        @if (item.enabled) {
                          <div class="item-config">
                            <label>Confidence: {{ item.confidence }}%</label>
                            <input type="range" min="50" max="99" [(ngModel)]="item.confidence">
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .suit-config-page { padding: 0; }
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
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .config-layout { display: grid; grid-template-columns: 260px 1fr; gap: 32px; }
    .body-diagram { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; }
    .diagram-container { text-align: center; }
    .human-figure { width: 160px; height: 320px; margin-bottom: 20px; }
    .body-part { fill: rgba(100, 100, 100, 0.3); stroke: rgba(150, 150, 150, 0.5); stroke-width: 2; transition: all 0.3s; }
    .body-part.active { stroke-width: 3; }
    .body-part.head.active { fill: rgba(239, 68, 68, 0.3); stroke: #ef4444; }
    .body-part.body.active { fill: rgba(59, 130, 246, 0.3); stroke: #3b82f6; }
    .body-part.hand.active { fill: rgba(245, 158, 11, 0.3); stroke: #f59e0b; }
    .body-part.foot.active { fill: rgba(34, 197, 94, 0.3); stroke: #22c55e; }
    .body-part.face.active { stroke: #8b5cf6; }
    .diagram-legend { display: flex; flex-direction: column; gap: 8px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
    .legend-item .dot { width: 12px; height: 12px; border-radius: 50%; }
    .legend-item .dot.head { background: #ef4444; }
    .legend-item .dot.body { background: #3b82f6; }
    .legend-item .dot.hand { background: #f59e0b; }
    .legend-item .dot.foot { background: #22c55e; }
    .legend-item .dot.face { background: #8b5cf6; }
    .ppe-settings { display: flex; flex-direction: column; gap: 16px; }
    .prefs-section h3 { margin: 0 0 16px; font-size: 16px; color: var(--text-primary); }
    .pref-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); gap: 16px; }
    .pref-row:last-child { border-bottom: none; }
    .pref-key { font-size: 13px; color: var(--text-secondary); }
    .pref-input { padding: 6px 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 13px; font-family: monospace; min-width: 180px; }
    .pref-input:focus { outline: none; border-color: var(--accent-primary); }
    .category-section { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; }
    .category-title { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 14px; color: var(--text-primary); }
    .category-title mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--accent-primary); }
    .ppe-items { display: flex; flex-direction: column; gap: 12px; }
    .ppe-item { padding: 12px 16px; background: rgba(0,0,0,0.1); border-radius: 8px; border: 1px solid transparent; transition: all 0.2s; }
    .ppe-item.enabled { border-color: var(--accent-primary); background: rgba(0, 212, 255, 0.05); }
    .item-header { display: flex; align-items: center; gap: 12px; }
    .item-info { display: flex; align-items: center; gap: 8px; flex: 1; }
    .item-name { font-size: 13px; color: var(--text-primary); }
    .required-badge { padding: 2px 8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 10px; border-radius: 4px; font-weight: 600; }
    .item-config { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border); }
    .item-config label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
    .item-config input[type="range"] { width: 100%; accent-color: var(--accent-primary); }
    .toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: rgba(100,100,100,0.3); border-radius: 22px; transition: 0.2s; }
    .toggle-slider:before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--accent-primary); }
    .toggle input:checked + .toggle-slider:before { transform: translateX(18px); }
    @media (max-width: 900px) { .config-layout { grid-template-columns: 1fr; } }
  `]
})
export class AdminSuitConfigComponent implements OnInit {
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

  ppePrefs = computed(() => this.preferences().filter(p => p.category === 'ppe' || p.category === 'suit'));

  categories = [
    { key: 'head', label: 'Head Protection', icon: 'engineering' },
    { key: 'body', label: 'Body Protection', icon: 'checkroom' },
    { key: 'hand', label: 'Hand Protection', icon: 'pan_tool' },
    { key: 'foot', label: 'Foot Protection', icon: 'do_not_step' },
    { key: 'face', label: 'Face Protection', icon: 'face' }
  ];

  ppeItems = signal<PPEItem[]>([
    { id: '1', name: 'Safety Helmet', category: 'head', icon: 'engineering', enabled: true, confidence: 80, required: true },
    { id: '2', name: 'Hard Hat', category: 'head', icon: 'engineering', enabled: false, confidence: 80, required: false },
    { id: '3', name: 'Safety Vest', category: 'body', icon: 'checkroom', enabled: true, confidence: 80, required: true },
    { id: '4', name: 'Work Jacket', category: 'body', icon: 'checkroom', enabled: false, confidence: 75, required: false },
    { id: '5', name: 'Safety Harness', category: 'body', icon: 'cable', enabled: true, confidence: 85, required: true },
    { id: '6', name: 'Work Gloves', category: 'hand', icon: 'pan_tool', enabled: true, confidence: 70, required: false },
    { id: '7', name: 'Safety Boots', category: 'foot', icon: 'do_not_step', enabled: true, confidence: 75, required: true },
    { id: '8', name: 'Work Shoes', category: 'foot', icon: 'do_not_step', enabled: false, confidence: 75, required: false },
    { id: '9', name: 'Safety Goggles', category: 'face', icon: 'visibility', enabled: true, confidence: 80, required: false },
    { id: '10', name: 'Face Shield', category: 'face', icon: 'face', enabled: false, confidence: 80, required: false },
    { id: '11', name: 'Dust Mask', category: 'face', icon: 'masks', enabled: true, confidence: 75, required: false }
  ]);

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
    this.prefsService.getPreferences({ aibox_id: id, category: 'ppe' }).subscribe({
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

  formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getItemsByCategory(category: string): PPEItem[] {
    return this.ppeItems().filter(item => item.category === category);
  }

  hasActiveInCategory(category: string): boolean {
    return this.ppeItems().some(item => item.category === category && item.enabled);
  }

  saveConfig() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.saving.set(true);

    if (this.ppePrefs().length > 0 && this.editValues.size > 0) {
      const updates = Array.from(this.editValues.entries()).map(([prefId, value]) => {
        const pref = this.preferences().find(p => p.id === prefId);
        return { key: pref?.key || '', value };
      }).filter(u => u.key);

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
    } else {
      this.saving.set(false);
      this.showMsg('PPE configuration saved locally', true);
    }
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
