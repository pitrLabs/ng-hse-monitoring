import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface NetworkInterface {
  id: string;
  name: string;
  type: 'ethernet' | 'wifi' | 'loopback';
  status: 'connected' | 'disconnected' | 'error';
  ip: string;
  subnet: string;
  gateway: string;
  dns: string;
  mac: string;
  speed?: string;
  ssid?: string;
}

@Component({
  selector: 'app-admin-network',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <div class="network-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Network Configuration</h2>
          <p class="subtitle">Manage network interfaces and connectivity</p>
        </div>
        <button class="action-btn primary" (click)="refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <div class="status-cards">
        <div class="status-card">
          <mat-icon>wifi</mat-icon>
          <div class="info">
            <span class="label">Network Status</span>
            <span class="value online">Online</span>
          </div>
        </div>
        <div class="status-card">
          <mat-icon>settings_ethernet</mat-icon>
          <div class="info">
            <span class="label">Active Interfaces</span>
            <span class="value">{{ getConnectedCount() }}</span>
          </div>
        </div>
        <div class="status-card">
          <mat-icon>speed</mat-icon>
          <div class="info">
            <span class="label">Network Speed</span>
            <span class="value">{{ getPrimarySpeed() }}</span>
          </div>
        </div>
        <div class="status-card">
          <mat-icon>public</mat-icon>
          <div class="info">
            <span class="label">External IP</span>
            <span class="value">203.0.113.45</span>
          </div>
        </div>
      </div>

      <h3 class="section-title">Network Interfaces</h3>
      <div class="interfaces-grid">
        @for (iface of interfaces(); track iface.id) {
          <div class="interface-card" [class]="iface.status">
            <div class="card-header">
              <mat-icon>{{ getInterfaceIcon(iface.type) }}</mat-icon>
              <div class="iface-info">
                <h4>{{ iface.name }}</h4>
                <span class="status-badge" [class]="iface.status">{{ iface.status }}</span>
              </div>
            </div>
            <div class="card-body">
              <div class="info-row"><span>IP Address:</span><span>{{ iface.ip }}</span></div>
              <div class="info-row"><span>Subnet:</span><span>{{ iface.subnet }}</span></div>
              <div class="info-row"><span>Gateway:</span><span>{{ iface.gateway }}</span></div>
              <div class="info-row"><span>DNS:</span><span>{{ iface.dns }}</span></div>
              <div class="info-row"><span>MAC:</span><span>{{ iface.mac }}</span></div>
              @if (iface.speed) {
                <div class="info-row"><span>Speed:</span><span>{{ iface.speed }}</span></div>
              }
              @if (iface.ssid) {
                <div class="info-row"><span>SSID:</span><span>{{ iface.ssid }}</span></div>
              }
            </div>
          </div>
        }
      </div>

      <h3 class="section-title">Ethernet Configuration</h3>
      <div class="config-card">
        <div class="config-row">
          <span>Use DHCP</span>
          <mat-slide-toggle [(ngModel)]="useDhcp" color="primary"></mat-slide-toggle>
        </div>
        @if (!useDhcp) {
          <div class="static-config">
            <div class="form-row">
              <label>IP Address</label>
              <input type="text" [(ngModel)]="staticIp" placeholder="192.168.1.100">
            </div>
            <div class="form-row">
              <label>Subnet Mask</label>
              <input type="text" [(ngModel)]="staticSubnet" placeholder="255.255.255.0">
            </div>
            <div class="form-row">
              <label>Gateway</label>
              <input type="text" [(ngModel)]="staticGateway" placeholder="192.168.1.1">
            </div>
          </div>
        }
        <button class="action-btn primary" (click)="saveConfig()">Save Configuration</button>
      </div>
    </div>
  `,
  styles: [`
    .network-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .status-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .status-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; }
    .status-card mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--accent-primary); }
    .status-card .info { display: flex; flex-direction: column; }
    .status-card .label { font-size: 12px; color: var(--text-muted); }
    .status-card .value { font-size: 18px; font-weight: 600; color: var(--text-primary); }
    .status-card .value.online { color: #22c55e; }

    .section-title { font-size: 18px; color: var(--text-primary); margin: 32px 0 16px; }

    .interfaces-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .interface-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; }
    .interface-card.connected { border-left: 4px solid #22c55e; }
    .interface-card.disconnected { border-left: 4px solid #6b7280; }
    .interface-card.error { border-left: 4px solid #ef4444; }

    .card-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(0,0,0,0.1); }
    .card-header mat-icon { font-size: 24px; width: 24px; height: 24px; color: var(--accent-primary); }
    .iface-info h4 { margin: 0; font-size: 14px; color: var(--text-primary); }
    .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .status-badge.connected { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .status-badge.disconnected { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
    .status-badge.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .card-body { padding: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--glass-border); }
    .info-row:last-child { border-bottom: none; }
    .info-row span:first-child { color: var(--text-muted); }
    .info-row span:last-child { color: var(--text-primary); font-family: monospace; }

    .config-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px; }
    .config-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 14px; color: var(--text-primary); }
    .static-config { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.1); border-radius: 8px; }
    .form-row { display: flex; flex-direction: column; gap: 4px; }
    .form-row label { font-size: 12px; color: var(--text-muted); }
    .form-row input { padding: 10px 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary); font-size: 14px; font-family: monospace; }
  `]
})
export class AdminNetworkComponent {
  useDhcp = true;
  staticIp = '';
  staticSubnet = '';
  staticGateway = '';

  interfaces = signal<NetworkInterface[]>([
    { id: '1', name: 'eth0', type: 'ethernet', status: 'connected', ip: '192.168.1.100', subnet: '255.255.255.0', gateway: '192.168.1.1', dns: '8.8.8.8', mac: '00:1A:2B:3C:4D:5E', speed: '1 Gbps' },
    { id: '2', name: 'eth1', type: 'ethernet', status: 'disconnected', ip: '-', subnet: '-', gateway: '-', dns: '-', mac: '00:1A:2B:3C:4D:5F' },
    { id: '3', name: 'wlan0', type: 'wifi', status: 'connected', ip: '192.168.1.101', subnet: '255.255.255.0', gateway: '192.168.1.1', dns: '8.8.8.8', mac: '00:1A:2B:3C:4D:60', ssid: 'HSE-Network' },
    { id: '4', name: 'lo', type: 'loopback', status: 'connected', ip: '127.0.0.1', subnet: '255.0.0.0', gateway: '-', dns: '-', mac: '00:00:00:00:00:00' }
  ]);

  getConnectedCount(): number {
    return this.interfaces().filter(i => i.status === 'connected').length;
  }

  getPrimarySpeed(): string {
    const eth = this.interfaces().find(i => i.type === 'ethernet' && i.status === 'connected');
    return eth?.speed || 'N/A';
  }

  getInterfaceIcon(type: string): string {
    switch (type) {
      case 'ethernet': return 'settings_ethernet';
      case 'wifi': return 'wifi';
      case 'loopback': return 'loop';
      default: return 'device_hub';
    }
  }

  refresh() {
    console.log('Refreshing network info...');
  }

  saveConfig() {
    console.log('Saving network config...', { useDhcp: this.useDhcp, staticIp: this.staticIp });
  }
}
