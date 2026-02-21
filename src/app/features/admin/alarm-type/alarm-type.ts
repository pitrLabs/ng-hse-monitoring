import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AIBoxService } from '../../../core/services/aibox.service';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface AlarmTypePolicy {
  property: string;
  name: string;
  algorithmName: string;
  algorithmCode: number;
  severity: Severity;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-admin-alarm-type',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="alarm-type-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Alarm Types</h2>
          <p class="subtitle">Algorithm alarm type definitions from AI Box ({{ alarmTypes().length }} types)</p>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
            <mat-label>AI Box</mat-label>
            <mat-select [(ngModel)]="selectedAiBoxId" (ngModelChange)="loadAlarmTypes()">
              <mat-option value="">Default BM-APP</mat-option>
              @for (box of aiBoxService.aiBoxes(); track box.id) {
                <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button class="action-btn secondary" (click)="loadAlarmTypes()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <div class="severity-legend">
        <div class="legend-item critical"><span class="dot"></span> Critical</div>
        <div class="legend-item high"><span class="dot"></span> High</div>
        <div class="legend-item medium"><span class="dot"></span> Medium</div>
        <div class="legend-item low"><span class="dot"></span> Low</div>
        <div class="legend-item info"><span class="dot"></span> Info</div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="alarm-grid">
          @for (alarm of alarmTypes(); track alarm.property) {
            <div class="alarm-card" [class]="alarm.severity">
              <div class="card-header">
                <div class="alarm-icon" [style.background]="alarm.color">
                  <mat-icon>{{ alarm.icon }}</mat-icon>
                </div>
                <div class="alarm-info">
                  <h3>{{ alarm.name }}</h3>
                  <span class="code">{{ alarm.property }}</span>
                </div>
              </div>
              <div class="alarm-stats">
                <div class="stat-item">
                  <span class="stat-label">Algorithm</span>
                  <span class="alg-badge">{{ alarm.algorithmName }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Severity</span>
                  <span class="severity-badge" [class]="alarm.severity">{{ alarm.severity }}</span>
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>info</mat-icon>
              <span>No alarm types found</span>
              <p>Select an AI Box to view available alarm types</p>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .alarm-type-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .aibox-field { min-width: 200px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .severity-legend { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border); }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
    .legend-item .dot { width: 12px; height: 12px; border-radius: 50%; }
    .legend-item.critical .dot { background: #dc2626; }
    .legend-item.high .dot { background: #ea580c; }
    .legend-item.medium .dot { background: #ca8a04; }
    .legend-item.low .dot { background: #2563eb; }
    .legend-item.info .dot { background: #22c55e; }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

    .alarm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .alarm-card { background: var(--glass-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--glass-border); transition: all 0.2s; }
    .alarm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .alarm-card.critical { border-left: 4px solid #dc2626; }
    .alarm-card.high { border-left: 4px solid #ea580c; }
    .alarm-card.medium { border-left: 4px solid #ca8a04; }
    .alarm-card.low { border-left: 4px solid #2563eb; }
    .alarm-card.info { border-left: 4px solid #22c55e; }

    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .alarm-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .alarm-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .alarm-info { flex: 1; }
    .alarm-info h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
    .alarm-info .code { font-size: 12px; color: var(--text-muted); font-family: monospace; }

    .alarm-count { display: flex; flex-direction: column; align-items: flex-end; }
    .count-badge { font-size: 24px; font-weight: 700; color: var(--accent-primary); }
    .count-label { font-size: 11px; color: var(--text-tertiary); }

    .alarm-stats { display: flex; gap: 16px; padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--glass-border); }
    .stat-item { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; }

    .alg-badge {
      padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 500;
      background: rgba(99, 102, 241, 0.15); color: #6366f1;
    }

    .severity-badge {
      padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; text-transform: capitalize;
      &.critical { background: rgba(220, 38, 38, 0.2); color: #dc2626; }
      &.high { background: rgba(234, 88, 12, 0.2); color: #ea580c; }
      &.medium { background: rgba(202, 138, 4, 0.2); color: #ca8a04; }
      &.low { background: rgba(37, 99, 235, 0.2); color: #2563eb; }
      &.info { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
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
export class AdminAlarmTypeComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  aiBoxService = inject(AIBoxService);

  selectedAiBoxId = '';
  loading = signal(true);
  private _alarmTypes = signal<AlarmTypePolicy[]>([]);
  alarmTypes = this._alarmTypes.asReadonly();

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
    this.loadAlarmTypes();
  }

  loadAlarmTypes() {
    this.loading.set(true);
    let params = new HttpParams();
    if (this.selectedAiBoxId) {
      params = params.set('aibox_id', this.selectedAiBoxId);
    }

    this.http.get<any>(`${this.apiUrl}/video-sources/bmapp/abilities`, { params }).subscribe({
      next: (res) => {
        const abilities = res.abilities || [];
        const alarmTypes: AlarmTypePolicy[] = [];

        // Extract all policy items from all algorithms
        abilities.forEach((ability: any) => {
          const algName = ability.name || ability.Name || `Algorithm ${ability.code}`;
          const algCode = ability.code ?? 0;
          const policies = ability.policy || ability.Policy || [];

          policies.forEach((policy: any) => {
            const property = policy.property || policy.Property || '';
            const name = policy.name || policy.Name || property;

            alarmTypes.push({
              property,
              name,
              algorithmName: algName,
              algorithmCode: algCode,
              severity: this.getSeverity(name),
              color: this.getColor(name),
              icon: this.getIcon(name)
            });
          });
        });

        this._alarmTypes.set(alarmTypes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getSeverity(alarmName: string): Severity {
    const t = alarmName.toLowerCase();
    if (['fire', 'smoke', 'fall'].some(k => t.includes(k))) return 'critical';
    if (['helmet', 'vest', 'intrusion'].some(k => t.includes(k))) return 'high';
    if (['mask', 'crowd'].some(k => t.includes(k))) return 'medium';
    if (['loiter', 'person'].some(k => t.includes(k))) return 'low';
    return 'info';
  }

  getColor(alarmName: string): string {
    const severity = this.getSeverity(alarmName);
    const colors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#2563eb', info: '#22c55e' };
    return colors[severity];
  }

  getIcon(alarmName: string): string {
    const t = alarmName.toLowerCase();
    if (t.includes('helmet')) return 'engineering';
    if (t.includes('fire')) return 'local_fire_department';
    if (t.includes('smoke')) return 'cloud';
    if (t.includes('vest')) return 'checkroom';
    if (t.includes('intrusion') || t.includes('zone')) return 'block';
    if (t.includes('fall')) return 'arrow_downward';
    if (t.includes('mask')) return 'masks';
    if (t.includes('crowd')) return 'groups';
    if (t.includes('face')) return 'face';
    if (t.includes('stranger')) return 'person_off';
    return 'warning';
  }
}
