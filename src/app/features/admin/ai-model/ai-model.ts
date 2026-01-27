import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-admin-ai-model',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-ai-model">
      <div class="page-header">
        <h2>AI Model Information</h2>
        <button mat-stroked-button (click)="loadAbilities()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="abilities-grid">
          @for (ability of abilities(); track ability.AlgType) {
            <div class="ability-card">
              <div class="ability-header">
                <div class="ability-icon">
                  <mat-icon>{{ getAbilityIcon(ability.AlgType) }}</mat-icon>
                </div>
                <div class="ability-info">
                  <h3>{{ ability.AlgName }}</h3>
                  <span class="ability-type">Type: {{ ability.AlgType }}</span>
                </div>
              </div>
              <div class="ability-body">
                <div class="methods-list">
                  @for (method of ability.Method || []; track method.MethodType) {
                    <div class="method-item">
                      <span class="method-name">{{ method.MethodName }}</span>
                      <span class="method-type">{{ method.MethodType }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <mat-icon>model_training</mat-icon>
              <span>No AI abilities found</span>
              <p>Make sure BM-APP is connected and running</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-ai-model { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      h2 { margin: 0; font-size: 20px; color: var(--text-primary); }
    }

    .loading-container { display: flex; justify-content: center; align-items: center; min-height: 300px; }

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
      h3 { margin: 0 0 4px; font-size: 14px; color: var(--text-primary); }
      .ability-type { font-size: 12px; color: var(--text-tertiary); }
    }

    .ability-body { padding: 16px 20px; }

    .methods-list { display: flex; flex-direction: column; gap: 8px; }

    .method-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px;
      background: var(--glass-bg-hover);
      border-radius: 4px;

      .method-name { font-size: 13px; color: var(--text-primary); }
      .method-type { font-size: 11px; color: var(--text-tertiary); }
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

  loading = signal(true);
  abilities = signal<any[]>([]);

  ngOnInit() { this.loadAbilities(); }

  loadAbilities() {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/video-sources/bmapp/abilities`).subscribe({
      next: (res) => {
        this.abilities.set(res.abilities || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getAbilityIcon(type: number): string {
    const icons: Record<number, string> = {
      1: 'person', 2: 'directions_car', 3: 'local_fire_department',
      4: 'warning', 5: 'face', 6: 'security'
    };
    return icons[type] || 'psychology';
  }
}
