import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="suit-config-page">
      <div class="page-header">
        <div class="header-left">
          <h2>PPE Detection Configuration</h2>
          <p class="subtitle">Configure Personal Protective Equipment detection settings</p>
        </div>
        <button class="action-btn primary" (click)="saveConfig()">
          <mat-icon>save</mat-icon>
          Save Configuration
        </button>
      </div>

      <div class="config-layout">
        <div class="body-diagram">
          <div class="diagram-container">
            <svg viewBox="0 0 200 400" class="human-figure">
              <!-- Head -->
              <circle cx="100" cy="40" r="30" [class.active]="hasActiveInCategory('head')" class="body-part head"/>
              <!-- Body -->
              <rect x="60" y="75" width="80" height="120" rx="10" [class.active]="hasActiveInCategory('body')" class="body-part body"/>
              <!-- Arms -->
              <rect x="20" y="85" width="35" height="80" rx="8" [class.active]="hasActiveInCategory('hand')" class="body-part hand"/>
              <rect x="145" y="85" width="35" height="80" rx="8" [class.active]="hasActiveInCategory('hand')" class="body-part hand"/>
              <!-- Legs -->
              <rect x="65" y="200" width="30" height="120" rx="8" [class.active]="hasActiveInCategory('foot')" class="body-part foot"/>
              <rect x="105" y="200" width="30" height="120" rx="8" [class.active]="hasActiveInCategory('foot')" class="body-part foot"/>
              <!-- Face indicator -->
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
                      <mat-slide-toggle [(ngModel)]="item.enabled" color="primary"></mat-slide-toggle>
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
        </div>
      </div>

      <div class="global-settings">
        <h3>Global Detection Settings</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Detection Interval</label>
            <div class="setting-control">
              <input type="number" [(ngModel)]="globalSettings.detectionInterval" min="100" max="5000">
              <span class="unit">ms</span>
            </div>
          </div>
          <div class="setting-item">
            <label>Alarm Delay</label>
            <div class="setting-control">
              <input type="number" [(ngModel)]="globalSettings.alarmDelay" min="0" max="30">
              <span class="unit">sec</span>
            </div>
          </div>
          <div class="setting-item toggle">
            <label>Capture Image on Violation</label>
            <mat-slide-toggle [(ngModel)]="globalSettings.captureImage" color="primary"></mat-slide-toggle>
          </div>
          <div class="setting-item toggle">
            <label>Record Video on Violation</label>
            <mat-slide-toggle [(ngModel)]="globalSettings.recordVideo" color="primary"></mat-slide-toggle>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .suit-config-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .config-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; margin-bottom: 32px; }

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

    .ppe-settings { display: flex; flex-direction: column; gap: 24px; }
    .category-section { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; }
    .category-title { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 14px; color: var(--text-primary); }
    .category-title mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--accent-primary); }

    .ppe-items { display: flex; flex-direction: column; gap: 12px; }
    .ppe-item { padding: 12px 16px; background: rgba(0,0,0,0.1); border-radius: 8px; border: 1px solid transparent; transition: all 0.2s; }
    .ppe-item.enabled { border-color: var(--accent-primary); background: rgba(0, 212, 255, 0.05); }

    .item-header { display: flex; align-items: center; gap: 12px; }
    .item-info { display: flex; align-items: center; gap: 8px; flex: 1; }
    .item-name { font-size: 13px; color: var(--text-primary); }
    .required-badge { padding: 2px 8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 10px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }

    .item-config { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border); }
    .item-config label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
    .item-config input[type="range"] { width: 100%; }

    .global-settings { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; }
    .global-settings h3 { margin: 0 0 20px; font-size: 16px; color: var(--text-primary); }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
    .setting-item { display: flex; flex-direction: column; gap: 8px; }
    .setting-item.toggle { flex-direction: row; justify-content: space-between; align-items: center; }
    .setting-item label { font-size: 13px; color: var(--text-secondary); }
    .setting-control { display: flex; align-items: center; gap: 8px; }
    .setting-control input { width: 100px; padding: 8px 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 14px; }
    .setting-control .unit { font-size: 12px; color: var(--text-muted); }

    @media (max-width: 900px) {
      .config-layout { grid-template-columns: 1fr; }
      .body-diagram { order: 2; }
    }
  `]
})
export class AdminSuitConfigComponent {
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

  globalSettings = {
    detectionInterval: 500,
    alarmDelay: 3,
    captureImage: true,
    recordVideo: false
  };

  getItemsByCategory(category: string): PPEItem[] {
    return this.ppeItems().filter(item => item.category === category);
  }

  hasActiveInCategory(category: string): boolean {
    return this.ppeItems().some(item => item.category === category && item.enabled);
  }

  saveConfig() {
    console.log('Saving PPE configuration...', {
      items: this.ppeItems(),
      globalSettings: this.globalSettings
    });
  }
}
