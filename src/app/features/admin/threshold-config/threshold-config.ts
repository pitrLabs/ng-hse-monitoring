import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface ThresholdItem {
  id: string;
  name: string;
  description: string;
  category: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  icon: string;
}

@Component({
  selector: 'app-admin-threshold-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="threshold-config-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Threshold Configuration</h2>
          <p class="subtitle">Fine-tune detection sensitivity and alert thresholds</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="resetAll()">
            <mat-icon>restart_alt</mat-icon>
            Reset All
          </button>
          <button class="action-btn primary" (click)="saveAll()">
            <mat-icon>save</mat-icon>
            Save Changes
          </button>
        </div>
      </div>

      <div class="presets-bar">
        <span class="presets-label">Quick Presets:</span>
        <button class="preset-btn" (click)="applyPreset('low')">Low Sensitivity</button>
        <button class="preset-btn" (click)="applyPreset('balanced')">Balanced</button>
        <button class="preset-btn" (click)="applyPreset('high')">High Sensitivity</button>
        <button class="preset-btn" (click)="applyPreset('custom')">Custom</button>
      </div>

      @for (category of categories; track category) {
        <div class="category-section">
          <h3 class="category-title">{{ category }}</h3>
          <div class="thresholds-grid">
            @for (item of getItemsByCategory(category); track item.id) {
              <div class="threshold-card">
                <div class="card-header">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <div class="item-info">
                    <h4>{{ item.name }}</h4>
                    <p>{{ item.description }}</p>
                  </div>
                </div>
                <div class="slider-container">
                  <div class="slider-header">
                    <span class="current-value">{{ item.value }}{{ item.unit }}</span>
                    <span class="range-info">{{ item.min }} - {{ item.max }}{{ item.unit }}</span>
                  </div>
                  <input type="range" [min]="item.min" [max]="item.max" [(ngModel)]="item.value">
                  <div class="slider-track">
                    <div class="slider-fill" [style.width.%]="getSliderPercent(item)"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .threshold-config-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .presets-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; padding: 16px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; flex-wrap: wrap; }
    .presets-label { font-size: 13px; color: var(--text-muted); }
    .preset-btn { padding: 8px 16px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .preset-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }

    .category-section { margin-bottom: 32px; }
    .category-title { font-size: 16px; color: var(--text-primary); margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border); }

    .thresholds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .threshold-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; }

    .card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
    .card-header mat-icon { font-size: 24px; width: 24px; height: 24px; color: var(--accent-primary); margin-top: 2px; }
    .item-info h4 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); }
    .item-info p { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.4; }

    .slider-container { position: relative; }
    .slider-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .current-value { font-size: 20px; font-weight: 600; color: var(--accent-primary); }
    .range-info { font-size: 11px; color: var(--text-muted); }

    .slider-container input[type="range"] { width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: transparent; position: relative; z-index: 2; cursor: pointer; }
    .slider-container input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent-primary); cursor: pointer; margin-top: -6px; box-shadow: 0 2px 8px rgba(0, 212, 255, 0.4); }
    .slider-container input[type="range"]::-webkit-slider-runnable-track { height: 8px; background: transparent; border-radius: 4px; }

    .slider-track { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; pointer-events: none; }
    .slider-fill { height: 100%; background: linear-gradient(90deg, var(--accent-primary), #00f2ff); border-radius: 4px; transition: width 0.1s; }
  `]
})
export class AdminThresholdConfigComponent {
  categories = ['Object Detection', 'Safety Compliance', 'Environmental', 'Behavioral'];

  thresholds = signal<ThresholdItem[]>([
    { id: '1', name: 'Person Detection', description: 'Confidence threshold for detecting persons', category: 'Object Detection', value: 75, min: 50, max: 99, unit: '%', icon: 'person' },
    { id: '2', name: 'Vehicle Detection', description: 'Confidence threshold for detecting vehicles', category: 'Object Detection', value: 70, min: 50, max: 99, unit: '%', icon: 'directions_car' },
    { id: '3', name: 'Object Tracking', description: 'Minimum frames for object tracking', category: 'Object Detection', value: 5, min: 1, max: 30, unit: ' frames', icon: 'track_changes' },
    { id: '4', name: 'Helmet Detection', description: 'Confidence for helmet compliance', category: 'Safety Compliance', value: 80, min: 50, max: 99, unit: '%', icon: 'engineering' },
    { id: '5', name: 'Vest Detection', description: 'Confidence for vest compliance', category: 'Safety Compliance', value: 80, min: 50, max: 99, unit: '%', icon: 'checkroom' },
    { id: '6', name: 'Face Recognition', description: 'Face matching threshold', category: 'Safety Compliance', value: 85, min: 60, max: 99, unit: '%', icon: 'face' },
    { id: '7', name: 'Fire Detection', description: 'Fire/flame detection sensitivity', category: 'Environmental', value: 70, min: 40, max: 99, unit: '%', icon: 'local_fire_department' },
    { id: '8', name: 'Smoke Detection', description: 'Smoke detection sensitivity', category: 'Environmental', value: 65, min: 40, max: 99, unit: '%', icon: 'cloud' },
    { id: '9', name: 'Intrusion Detection', description: 'Zone violation sensitivity', category: 'Behavioral', value: 75, min: 50, max: 99, unit: '%', icon: 'security' },
    { id: '10', name: 'Loitering Detection', description: 'Time before loitering alert', category: 'Behavioral', value: 30, min: 10, max: 120, unit: 's', icon: 'timer' },
    { id: '11', name: 'Crowd Density', description: 'People count threshold for alert', category: 'Behavioral', value: 10, min: 3, max: 50, unit: ' people', icon: 'groups' },
    { id: '12', name: 'Speed Violation', description: 'Speed limit for vehicles', category: 'Behavioral', value: 20, min: 5, max: 100, unit: ' km/h', icon: 'speed' }
  ]);

  getItemsByCategory(category: string): ThresholdItem[] {
    return this.thresholds().filter(t => t.category === category);
  }

  getSliderPercent(item: ThresholdItem): number {
    return ((item.value - item.min) / (item.max - item.min)) * 100;
  }

  applyPreset(preset: string) {
    const multipliers: Record<string, number> = { low: 0.6, balanced: 0.75, high: 0.9, custom: 0.8 };
    const mult = multipliers[preset] || 0.75;
    this.thresholds.update(items => items.map(item => ({
      ...item,
      value: Math.round(item.min + (item.max - item.min) * mult)
    })));
  }

  resetAll() {
    this.applyPreset('balanced');
  }

  saveAll() {
    console.log('Saving thresholds...', this.thresholds());
  }
}
