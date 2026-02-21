import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AIBoxService } from '../../../core/services/aibox.service';

@Component({
  standalone: true,
  selector: 'app-admin-ai-model',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-ai-model">
      <div class="page-header">
        <div class="header-left">
          <h2>AI Model Information</h2>
          <p class="subtitle">View AI algorithm capabilities per AI Box</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
            <mat-label>AI Box</mat-label>
            <mat-select [(ngModel)]="selectedAiBoxId" (ngModelChange)="onAiBoxChange()">
              <mat-option value="">Default BM-APP</mat-option>
              @for (box of aiBoxService.aiBoxes(); track box.id) {
                <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button class="action-btn secondary" (click)="loadAbilities()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button class="action-btn secondary" [class.active]="showOnlyPermitted" (click)="showOnlyPermitted = !showOnlyPermitted">
            <mat-icon>{{ showOnlyPermitted ? 'check_circle' : 'filter_list' }}</mat-icon>
            {{ showOnlyPermitted ? 'Permitted Only' : 'Show All' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="stats-bar">
          <div class="stat-card">
            <span class="stat-value">{{ filteredAbilities().length }}</span>
            <span class="stat-label">{{ showOnlyPermitted ? 'Permitted' : 'Total' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ permittedCount() }} / {{ abilities().length }}</span>
            <span class="stat-label">Licensed / Total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ selectedAiBoxId ? 'Per Box' : 'Default' }}</span>
            <span class="stat-label">Source</span>
          </div>
        </div>

        <div class="abilities-grid">
          @for (ability of filteredAbilities(); track $index) {
            <div class="ability-card" [class.sub-algorithm]="isSubAlgorithm(ability)" [class.not-permitted]="!isPermitted(ability)">
              <div class="ability-header">
                <div class="ability-icon">
                  <mat-icon>{{ getAbilityIcon(getAlgCode(ability)) }}</mat-icon>
                </div>
                <div class="ability-info">
                  <h3>{{ getAlgName(ability) }}</h3>
                  <div class="meta">
                    <span class="type-badge">Code: {{ getAlgCode(ability) }}</span>
                    @if (getAlgItem(ability)) {
                      <span class="item-badge">Item: {{ getAlgItem(ability) }}</span>
                    }
                    @if (isSubAlgorithm(ability)) {
                      <span class="sub-badge">Sub-Algorithm</span>
                    }
                    @if (!isPermitted(ability)) {
                      <span class="license-badge">Unlicensed</span>
                    }
                  </div>
                </div>
              </div>
              <div class="ability-body">
                @if (getAlgDesc(ability)) {
                  <p class="description">{{ getAlgDesc(ability) }}</p>
                }

                @if (getParameters(ability).length > 0) {
                  <div class="section">
                    <h4>Parameters ({{ getParameters(ability).length }})</h4>
                    <div class="params-list">
                      @for (param of getParameters(ability); track $index) {
                        <div class="param-item">
                          <span class="param-name">{{ param.name || param.key }}</span>
                          <span class="param-type">{{ param.class || param.type }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (getPolicy(ability).length > 0) {
                  <div class="section">
                    <h4>Alarm Types ({{ getPolicy(ability).length }})</h4>
                    <div class="policy-list">
                      @for (policy of getPolicy(ability); track $index) {
                        <div class="policy-item">
                          <mat-icon>notifications</mat-icon>
                          <span>{{ policy.name || policy.property }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>model_training</mat-icon>
              <span>No AI abilities found</span>
              <p>Select an AI Box or make sure BM-APP is connected and running</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-ai-model { display: flex; flex-direction: column; gap: 24px; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .aibox-field { min-width: 200px; }
    .action-btn {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      border: none; border-radius: 8px; font-size: 13px; cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn.secondary {
      background: var(--glass-bg); color: var(--text-primary);
      border: 1px solid var(--glass-border);
      &.active {
        background: rgba(99, 102, 241, 0.2);
        border-color: #6366f1;
        color: #6366f1;
      }
    }
    .action-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .stats-bar {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;
    }

    .stat-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      .stat-value { font-size: 28px; font-weight: 700; color: var(--accent-primary); }
      .stat-label { font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; }
    }

    .abilities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .ability-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: all 0.2s;

      &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      &.sub-algorithm { border-left: 3px solid #3b82f6; }
      &.not-permitted { opacity: 0.6; border-left: 3px solid #ef4444; }
    }

    .ability-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .ability-icon {
      width: 48px; height: 48px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: white; }
    }

    .ability-info {
      flex: 1;
      h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
      .meta { display: flex; gap: 6px; flex-wrap: wrap; }
      .type-badge {
        padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
        background: rgba(99, 102, 241, 0.15); color: #6366f1;
      }
      .item-badge {
        padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
        background: rgba(168, 85, 247, 0.15); color: #a855f7;
      }
      .sub-badge {
        padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
        background: rgba(59, 130, 246, 0.15); color: #3b82f6;
      }
      .license-badge {
        padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
        background: rgba(239, 68, 68, 0.15); color: #ef4444;
      }
    }

    .ability-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }

    .description {
      margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary);
      padding: 10px 12px; background: var(--glass-bg-hover); border-radius: 6px;
    }

    .section {
      h4 {
        margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--text-tertiary);
        text-transform: uppercase; letter-spacing: 0.5px;
      }
    }

    .params-list { display: flex; flex-direction: column; gap: 6px; }

    .param-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: var(--glass-bg-hover); border-radius: 4px;

      .param-name { font-size: 12px; color: var(--text-primary); }
      .param-type {
        font-size: 10px; padding: 2px 6px; border-radius: 3px;
        background: rgba(34, 197, 94, 0.15); color: #22c55e;
        text-transform: uppercase; font-weight: 500;
      }
    }

    .policy-list { display: flex; flex-direction: column; gap: 6px; }

    .policy-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; background: var(--glass-bg-hover); border-radius: 4px;

      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }
      span { font-size: 12px; color: var(--text-primary); }
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 20px; color: var(--text-tertiary); text-align: center;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin: 0; font-size: 14px; }
    }
  `]
})
export class AdminAiModelComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  aiBoxService = inject(AIBoxService);

  // Component state
  selectedAiBoxId = '';
  loading = signal(true);
  abilities = signal<any[]>([]);
  showOnlyPermitted = true; // Filter to show only permitted/licensed algorithms (like BM-APP)

  // Computed: filtered abilities based on permitted filter
  filteredAbilities = () => {
    const all = this.abilities();
    if (this.showOnlyPermitted) {
      return all.filter(ability => this.isPermitted(ability));
    }
    return all;
  };

  // Computed: count of licensed/permitted algorithms
  permittedCount = () => {
    return this.abilities().filter(ability => this.isPermitted(ability)).length;
  };

  // Helper methods to extract BM-APP ability fields
  // Based on /alg_ability_fetch response structure from BM-APP documentation
  getAlgName(ability: any): string {
    return ability.name || ability.Name || ability.AlgName || `Algorithm ${this.getAlgCode(ability)}`;
  }

  getAlgCode(ability: any): number | string {
    return ability.code ?? ability.Code ?? ability.AlgType ?? 'Unknown';
  }

  getAlgItem(ability: any): number | string {
    return ability.item ?? ability.Item ?? '';
  }

  getAlgDesc(ability: any): string {
    return ability.desc || ability.description || ability.Desc || '';
  }

  isSubAlgorithm(ability: any): boolean {
    return ability.sub === true || ability.Sub === true;
  }

  isPermitted(ability: any): boolean {
    return ability.permitted !== false; // Default to true if not specified
  }

  getParameters(ability: any): any[] {
    return ability.parameters || ability.Parameters || [];
  }

  getPolicy(ability: any): any[] {
    return ability.policy || ability.Policy || [];
  }

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
    this.loadAbilities();
  }

  onAiBoxChange() {
    this.loadAbilities();
  }

  loadAbilities() {
    this.loading.set(true);
    let params = new HttpParams();
    if (this.selectedAiBoxId) {
      params = params.set('aibox_id', this.selectedAiBoxId);
    }
    this.http.get<any>(`${this.apiUrl}/video-sources/bmapp/abilities`, { params }).subscribe({
      next: (res) => {
        const abilities = res.abilities || [];
        console.log('[AI Model Info] Loaded abilities:', abilities);
        if (abilities.length > 0) {
          console.log('[AI Model Info] Sample ability structure:', abilities[0]);
        }
        this.abilities.set(abilities);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[AI Model Info] Failed to load abilities:', err);
        this.loading.set(false);
      }
    });
  }

  getAbilityIcon(type: number | string): string {
    // Map algorithm types to Material icons
    // Based on common BM-APP algorithm type IDs
    const typeNum = typeof type === 'number' ? type : parseInt(String(type), 10);
    const icons: Record<number, string> = {
      1: 'person',                    // Person detection
      2: 'directions_car',            // Vehicle detection
      3: 'local_fire_department',     // Fire/smoke detection
      4: 'warning',                   // Safety violations
      5: 'face',                      // Face recognition
      6: 'security',                  // Security/intrusion
      7: 'engineering',               // PPE detection
      8: 'groups',                    // Crowd detection
      9: 'speed',                     // Speed detection
      10: 'visibility',               // Object detection
      11: 'psychology',               // Behavior analysis
      12: 'analytics'                 // Analytics
    };
    return icons[typeNum] || 'model_training'; // Default AI icon
  }
}
