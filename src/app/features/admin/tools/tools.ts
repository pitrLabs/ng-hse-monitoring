import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AIBoxService } from '../../../core/services/aibox.service';
import { ToolsService, PingResult, OnvifDevice, SystemInfo } from '../../../core/services/tools.service';

@Component({
  selector: 'app-admin-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,  MatSelectModule, MatFormFieldModule],
  template: `
    <div class="tools-page">
      <div class="page-header">
        <div class="header-left">
          <h2>System Tools</h2>
          <p class="subtitle">Network diagnostics, ONVIF discovery, and system administration</p>
        </div>
        <mat-form-field appearance="outline" class="aibox-field">
          <mat-select [ngModel]="selectedAiBoxId()" (ngModelChange)="selectedAiBoxId.set($event); onAiBoxChange()">
            <mat-option value="">Select AI Box</mat-option>
            @for (box of aiBoxService.aiBoxes(); track box.id) {
              <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (!selectedAiBoxId()) {
        <div class="empty-state">
          <mat-icon>build</mat-icon>
          <h3>Select an AI Box</h3>
          <p>Choose an AI Box to access system tools</p>
        </div>
      } @else {
        <!-- System Info -->
        <div class="section-card">
          <div class="section-header">
            <mat-icon>monitor_heart</mat-icon>
            <h3>System Information</h3>
            <button class="icon-btn" [disabled]="loadingInfo()" (click)="loadSystemInfo()" title="Refresh">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          @if (loadingInfo()) {
            <div class="loading-row"><mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner> Loading...</div>
          } @else if (systemInfo()) {
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">CPU Usage</span>
                <span class="info-value">{{ systemInfo()!.cpu_usage != null ? systemInfo()!.cpu_usage!.toFixed(1) + '%' : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Memory Usage</span>
                <span class="info-value">{{ systemInfo()!.memory_usage != null ? systemInfo()!.memory_usage!.toFixed(1) + '%' : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Disk Usage</span>
                <span class="info-value">{{ systemInfo()!.disk_usage != null ? systemInfo()!.disk_usage!.toFixed(1) + '%' : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Uptime</span>
                <span class="info-value">{{ systemInfo()!.uptime || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Version</span>
                <span class="info-value">{{ systemInfo()!.version || 'N/A' }}</span>
              </div>
            </div>
          } @else {
            <p class="muted">Click refresh to load system info</p>
          }
        </div>

        <!-- Network Ping -->
        <div class="section-card">
          <div class="section-header">
            <mat-icon>network_ping</mat-icon>
            <h3>Network Ping</h3>
          </div>
          <div class="tool-row">
            <input type="text" [(ngModel)]="pingHost" placeholder="Enter host or IP (e.g. 8.8.8.8)" class="tool-input">
            <input type="number" [(ngModel)]="pingCount" min="1" max="10" placeholder="Count" class="tool-input small">
            <button class="action-btn primary" [disabled]="!pingHost || pinging()" (click)="runPing()">
              @if (pinging()) { <mat-progress-spinner mode="indeterminate" diameter="16"></mat-progress-spinner> }
              @else { <mat-icon>play_arrow</mat-icon> }
              Ping
            </button>
          </div>
          @if (pingResult()) {
            <div class="result-box" [class.success]="pingResult()!.success" [class.error]="!pingResult()!.success">
              <div class="result-header">
                <mat-icon>{{ pingResult()!.success ? 'check_circle' : 'error' }}</mat-icon>
                <strong>{{ pingResult()!.host }}</strong>
                <span class="status-tag" [class.ok]="pingResult()!.success">{{ pingResult()!.success ? 'Reachable' : 'Unreachable' }}</span>
              </div>
              @if (pingResult()!.output) {
                <pre class="output-text">{{ pingResult()!.output }}</pre>
              }
              @if (pingResult()!.error) {
                <p class="error-text">{{ pingResult()!.error }}</p>
              }
            </div>
          }
        </div>

        <!-- ONVIF Discovery -->
        <div class="section-card">
          <div class="section-header">
            <mat-icon>videocam</mat-icon>
            <h3>ONVIF Camera Discovery</h3>
            <button class="action-btn secondary" [disabled]="discoveringOnvif()" (click)="discoverOnvif()">
              @if (discoveringOnvif()) { <mat-progress-spinner mode="indeterminate" diameter="16"></mat-progress-spinner> }
              @else { <mat-icon>search</mat-icon> }
              Scan Network
            </button>
          </div>
          @if (onvifDevices().length > 0) {
            <div class="devices-grid">
              @for (device of onvifDevices(); track device.ip) {
                <div class="device-card">
                  <mat-icon>videocam</mat-icon>
                  <div class="device-info">
                    <strong>{{ device.name || device.model || 'Unknown Camera' }}</strong>
                    <span>{{ device.ip }}:{{ device.port }}</span>
                    @if (device.manufacturer) { <span class="muted">{{ device.manufacturer }}</span> }
                  </div>
                </div>
              }
            </div>
          } @else if (onvifScanned()) {
            <p class="muted">No ONVIF devices found on network</p>
          }
        </div>

        <!-- Danger Zone -->
        <div class="section-card danger-zone">
          <div class="section-header">
            <mat-icon>warning</mat-icon>
            <h3>Danger Zone</h3>
          </div>
          <div class="danger-actions">
            <div class="danger-item">
              <div class="danger-info">
                <strong>Restart Service</strong>
                <p>Restart the BM-APP service on this AI Box</p>
              </div>
              <button class="action-btn warning" [disabled]="restarting()" (click)="restartService()">
                <mat-icon>restart_alt</mat-icon>
                Restart
              </button>
            </div>
            <div class="danger-item">
              <div class="danger-info">
                <strong>Factory Reset</strong>
                <p>Reset AI Box to factory defaults. This cannot be undone!</p>
              </div>
              <button class="action-btn danger" (click)="confirmFactoryReset()">
                <mat-icon>delete_forever</mat-icon>
                Factory Reset
              </button>
            </div>
          </div>
        </div>

        @if (actionMessage()) {
          <div class="action-toast" [class.success]="actionSuccess()">
            <mat-icon>{{ actionSuccess() ? 'check_circle' : 'error' }}</mat-icon>
            {{ actionMessage() }}
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .tools-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .aibox-select { padding: 8px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; min-width: 200px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 16px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; opacity: 0.3; }
    .empty-state h3 { margin: 0; font-size: 20px; color: var(--text-primary); }

    .section-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section-card.danger-zone { border-color: rgba(239, 68, 68, 0.3); }
    .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .section-header mat-icon { color: var(--accent-primary); font-size: 22px; width: 22px; height: 22px; }
    .section-card.danger-zone .section-header mat-icon { color: #ef4444; }
    .section-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); flex: 1; }

    .icon-btn { background: none; border: 1px solid var(--glass-border); border-radius: 6px; padding: 4px 8px; color: var(--text-muted); cursor: pointer; }
    .icon-btn:hover { color: var(--text-primary); }

    .loading-row { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 14px; }
    .muted { color: var(--text-muted); font-size: 14px; margin: 0; }

    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 18px; font-weight: 600; color: var(--text-primary); font-family: monospace; }

    .tool-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
    .tool-input { padding: 10px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; flex: 1; min-width: 200px; }
    .tool-input.small { flex: 0 0 80px; min-width: 60px; }

    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .action-btn.danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .action-btn mat-icon, .action-btn mat-progress-spinner { font-size: 16px; width: 16px; height: 16px; }

    .result-box { padding: 16px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); }
    .result-box.success { border-color: rgba(34, 197, 94, 0.3); }
    .result-box.error { border-color: rgba(239, 68, 68, 0.3); }
    .result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .result-header mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .result-box.success .result-header mat-icon { color: #22c55e; }
    .result-box.error .result-header mat-icon { color: #ef4444; }
    .status-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(107,114,128,0.2); color: var(--text-muted); }
    .status-tag.ok { background: rgba(34,197,94,0.1); color: #22c55e; }
    .output-text { margin: 0; font-size: 12px; font-family: monospace; color: var(--text-secondary); white-space: pre-wrap; overflow-x: auto; }
    .error-text { margin: 0; font-size: 13px; color: #ef4444; }

    .devices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .device-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--glass-border); }
    .device-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .device-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
    .device-info strong { color: var(--text-primary); }
    .device-info span { color: var(--text-muted); font-family: monospace; }

    .danger-actions { display: flex; flex-direction: column; gap: 16px; }
    .danger-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; background: rgba(239, 68, 68, 0.05); border-radius: 8px; }
    .danger-info strong { font-size: 14px; color: var(--text-primary); }
    .danger-info p { margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }

    .action-toast { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 10px; margin-top: 16px; font-size: 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
    .action-toast.success { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #22c55e; }
  `]
})
export class AdminToolsComponent implements OnInit {
  aiBoxService = inject(AIBoxService);
  private toolsService = inject(ToolsService);

  selectedAiBoxId = signal<string | null>(null);
  systemInfo = signal<SystemInfo | null>(null);
  loadingInfo = signal(false);

  pingHost = '';
  pingCount = 4;
  pinging = signal(false);
  pingResult = signal<PingResult | null>(null);

  discoveringOnvif = signal(false);
  onvifDevices = signal<OnvifDevice[]>([]);
  onvifScanned = signal(false);

  restarting = signal(false);
  actionMessage = signal('');
  actionSuccess = signal(false);

  ngOnInit() {
    this.aiBoxService.loadAiBoxes().subscribe();
  }

  onAiBoxChange() {
    this.systemInfo.set(null);
    this.pingResult.set(null);
    this.onvifDevices.set([]);
    this.onvifScanned.set(false);
  }

  loadSystemInfo() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.loadingInfo.set(true);
    this.toolsService.getSystemInfo(id).subscribe({
      next: (info) => { this.systemInfo.set(info); this.loadingInfo.set(false); },
      error: (err) => {
        this.loadingInfo.set(false);
        this.showToast(`Failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  runPing() {
    const id = this.selectedAiBoxId();
    if (!id || !this.pingHost) return;
    this.pinging.set(true);
    this.pingResult.set(null);
    this.toolsService.ping(id, this.pingHost, this.pingCount).subscribe({
      next: (result) => { this.pingResult.set(result); this.pinging.set(false); },
      error: (err) => {
        this.pinging.set(false);
        this.pingResult.set({ host: this.pingHost, success: false, error: err.error?.detail || err.message });
      }
    });
  }

  discoverOnvif() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    this.discoveringOnvif.set(true);
    this.onvifDevices.set([]);
    this.toolsService.discoverOnvif(id).subscribe({
      next: (devices) => {
        this.onvifDevices.set(devices);
        this.onvifScanned.set(true);
        this.discoveringOnvif.set(false);
      },
      error: (err) => {
        this.discoveringOnvif.set(false);
        this.onvifScanned.set(true);
        this.showToast(`Discovery failed: ${err.error?.detail || err.message}`, false);
      }
    });
  }

  restartService() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    if (!confirm('Are you sure you want to restart the BM-APP service?')) return;
    this.restarting.set(true);
    this.toolsService.restartService(id).subscribe({
      next: () => { this.restarting.set(false); this.showToast('Service restart initiated', true); },
      error: (err) => { this.restarting.set(false); this.showToast(`Restart failed: ${err.error?.detail || err.message}`, false); }
    });
  }

  confirmFactoryReset() {
    const id = this.selectedAiBoxId();
    if (!id) return;
    const box = this.aiBoxService.aiBoxes().find(b => b.id === id);
    if (!confirm(`WARNING: This will factory reset "${box?.name}". All data will be lost. Are you absolutely sure?`)) return;
    if (!confirm('This action cannot be undone. Confirm factory reset?')) return;
    this.toolsService.factoryReset(id).subscribe({
      next: () => this.showToast('Factory reset initiated', true),
      error: (err) => this.showToast(`Reset failed: ${err.error?.detail || err.message}`, false)
    });
  }

  private showToast(msg: string, success: boolean) {
    this.actionMessage.set(msg);
    this.actionSuccess.set(success);
    setTimeout(() => this.actionMessage.set(''), 5000);
  }
}
