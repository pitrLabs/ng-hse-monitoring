import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlarmService } from '../../../core/services/alarm.service';
import { VideoSourceService } from '../../../core/services/video-source.service';
import { AITaskService } from '../../../core/services/ai-task.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AIBoxService } from '../../../core/services/aibox.service';
import { PeopleCount, ZoneOccupancy, StoreCount } from '../../../core/models/analytics.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-admin-statistics',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="admin-statistics">
      <div class="page-header">
        <div class="header-left">
          <h2>
            Statistics & Reports
            @if (selectedBoxName()) {
              <span class="box-label">untuk {{ selectedBoxName() }}</span>
            }
          </h2>
        </div>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="aibox-field">
            <mat-select [ngModel]="selectedAiBoxId()" (ngModelChange)="selectedAiBoxId.set($event); onAiBoxChange()">
              <mat-option value="">All Boxes</mat-option>
              @for (box of aiBoxService.aiBoxes(); track box.id) {
                <mat-option [value]="box.id">{{ box.name }} ({{ box.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="period-field">
            <mat-select [(ngModel)]="selectedPeriod" (ngModelChange)="loadStats()">
              <mat-option value="today">Today</mat-option>
              <mat-option value="week">This Week</mat-option>
              <mat-option value="month">This Month</mat-option>
              <mat-option value="year">This Year</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button (click)="runBackfill()" matTooltip="Fix alarms with missing AI Box association">
            <mat-icon>build</mat-icon>
            Fix Data
          </button>
          <button mat-stroked-button (click)="exportReport()">
            <mat-icon>download</mat-icon>
            Export Report
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon alarms">
            <mat-icon>notifications</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().totalAlarms }}</span>
            <span class="summary-label">Total Alarms</span>
            <span class="summary-trend up">+{{ stats().alarmsTrend }}%</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon resolved">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().resolvedAlarms }}</span>
            <span class="summary-label">Resolved</span>
            <span class="summary-trend up">{{ stats().resolvedRate }}%</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon cameras">
            <mat-icon>videocam</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().activeCameras }}/{{ stats().totalCameras }}</span>
            <span class="summary-label">Active Cameras</span>
            <span class="summary-trend">{{ stats().cameraUptime }}% uptime</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon tasks">
            <mat-icon>smart_toy</mat-icon>
          </div>
          <div class="summary-info">
            <span class="summary-value">{{ stats().runningTasks }}</span>
            <span class="summary-label">Running AI Tasks</span>
            <span class="summary-trend">{{ stats().taskEfficiency }}% efficiency</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Alarms by Type</h3>
          </div>
          <div class="chart-body">
            @for (item of alarmsByType(); track item.type) {
              <div class="bar-item">
                <span class="bar-label">{{ item.type }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="item.percentage" [style.background]="item.color"></div>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>Alarms by Camera</h3>
          </div>
          <div class="chart-body">
            @for (item of alarmsByCamera(); track item.camera) {
              <div class="bar-item">
                <span class="bar-label">{{ item.camera }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="item.percentage" style="background: var(--accent-gradient)"></div>
                </div>
                <span class="bar-value">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Analytics Section -->
      <div class="charts-grid">
        <!-- People Count -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>People Count</h3>
            <span class="chart-subtitle">Entry/exit counting</span>
          </div>
          <div class="chart-body">
            @if (peopleCountData().length === 0) {
              <div class="no-data">
                <mat-icon>people_outline</mat-icon>
                <span>No people count data yet</span>
              </div>
            }
            @for (item of peopleCountData().slice(0, 8); track item.id) {
              <div class="bar-item">
                <span class="bar-label">{{ item.camera_name || 'Unknown' }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="getPeopleCountPercent(item)" style="background: linear-gradient(90deg, #3b82f6, #06b6d4)"></div>
                </div>
                <span class="bar-value">
                  <span class="count-in">{{ item.count_in }}↑</span>
                  <span class="count-out">{{ item.count_out }}↓</span>
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Zone Occupancy -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Zone Occupancy</h3>
            <span class="chart-subtitle">People in zones (current)</span>
          </div>
          <div class="chart-body">
            @if (zoneOccupancyData().length === 0) {
              <div class="no-data">
                <mat-icon>location_on</mat-icon>
                <span>No zone occupancy data yet</span>
              </div>
            }
            @for (item of zoneOccupancyData().slice(0, 8); track item.id) {
              <div class="bar-item">
                <span class="bar-label">{{ item.zone_name || item.camera_name || 'Zone' }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="getZonePercent(item)" style="background: linear-gradient(90deg, #a855f7, #ec4899)"></div>
                </div>
                <span class="bar-value">{{ item.people_count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Store Count -->
      @if (storeCountData().length > 0) {
        <div class="chart-card full-width">
          <div class="chart-header">
            <h3>Store Traffic</h3>
            <span class="chart-subtitle">Daily entry/exit counts</span>
          </div>
          <div class="chart-body">
            @for (item of storeCountData().slice(0, 10); track item.id) {
              <div class="bar-item">
                <span class="bar-label">{{ item.record_date | date:'shortDate' }}</span>
                <div class="bar-container">
                  <div class="bar-fill" [style.width.%]="getStorePercent(item)" style="background: linear-gradient(90deg, #22c55e, #10b981)"></div>
                </div>
                <span class="bar-value">
                  <span class="count-in">{{ item.entry_count }}↑</span>
                  <span class="count-out">{{ item.exit_count }}↓</span>
                </span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Recent Activity -->
      <div class="activity-card">
        <div class="activity-header">
          <h3>Recent Activity</h3>
        </div>
        <div class="activity-list">
          @for (activity of recentActivity(); track activity.id) {
            <div class="activity-item">
              <div class="activity-icon" [class]="activity.type">
                <mat-icon>{{ activity.icon }}</mat-icon>
              </div>
              <div class="activity-info">
                <span class="activity-title">{{ activity.title }}</span>
                <span class="activity-desc">{{ activity.description }}</span>
              </div>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-statistics { display: flex; flex-direction: column; gap: 24px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
    }

    .header-left h2 {
      margin: 0; font-size: 20px; color: var(--text-primary);
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }

    .box-label {
      font-size: 14px; font-weight: 400;
      color: var(--accent-primary);
      background: rgba(0, 212, 255, 0.08);
      border: 1px solid rgba(0, 212, 255, 0.2);
      padding: 3px 10px; border-radius: 20px;
    }

    .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .summary-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex; align-items: center; gap: 16px;
    }

    .summary-icon {
      width: 56px; height: 56px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: white; }

      &.alarms { background: linear-gradient(135deg, #ef4444, #b91c1c); }
      &.resolved { background: linear-gradient(135deg, #22c55e, #15803d); }
      &.cameras { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
      &.tasks { background: linear-gradient(135deg, #a855f7, #7e22ce); }
    }

    .summary-info { display: flex; flex-direction: column; }

    .summary-value { font-size: 28px; font-weight: 700; color: var(--text-primary); }
    .summary-label { font-size: 13px; color: var(--text-tertiary); }
    .summary-trend { font-size: 12px; color: var(--text-secondary); &.up { color: #22c55e; } }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .chart-card, .activity-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
    }

    .chart-header, .activity-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--glass-border);
      h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
    }

    .chart-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

    .bar-item { display: flex; align-items: center; gap: 12px; }
    .bar-label { width: 100px; font-size: 13px; color: var(--text-secondary); }
    .bar-container { flex: 1; height: 8px; background: var(--glass-border); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { width: 40px; text-align: right; font-weight: 600; color: var(--text-primary); }

    .activity-list { padding: 8px 0; }

    .activity-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      &:hover { background: var(--glass-bg-hover); }
    }

    .activity-icon {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: white; }

      &.alarm { background: #ef4444; }
      &.user { background: #3b82f6; }
      &.task { background: #a855f7; }
    }

    .activity-info { flex: 1; display: flex; flex-direction: column; }
    .activity-title { font-size: 14px; color: var(--text-primary); }
    .activity-desc { font-size: 12px; color: var(--text-tertiary); }
    .activity-time { font-size: 12px; color: var(--text-tertiary); }

    .chart-subtitle { font-size: 12px; color: var(--text-tertiary); }
    .chart-header { display: flex; align-items: baseline; gap: 8px; }
    .full-width { grid-column: 1 / -1; }

    .no-data {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px; color: var(--text-tertiary);
      mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.5; }
      span { font-size: 13px; }
    }

    .count-in { color: #22c55e; font-size: 12px; margin-right: 4px; }
    .count-out { color: #ef4444; font-size: 12px; }
  `]
})
export class AdminStatisticsComponent implements OnInit {
  private alarmService = inject(AlarmService);
  private videoSourceService = inject(VideoSourceService);
  private aiTaskService = inject(AITaskService);
  private analyticsService = inject(AnalyticsService);
  aiBoxService = inject(AIBoxService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  selectedPeriod = 'today';
  selectedAiBoxId = signal<string | null>(null);
  loading = signal(false);

  // Computed name of the selected box for the title
  selectedBoxName = computed(() => {
    const id = this.selectedAiBoxId();
    if (!id) return null;
    const box = this.aiBoxService.aiBoxes().find(b => b.id === id);
    return box ? box.name : null;
  });

  // Real stats from services
  alarmStats = this.alarmService.stats;

  // Computed stats — filter cameras by selected aibox
  stats = computed(() => {
    const alarmStats = this.alarmStats();
    const aiboxId = this.selectedAiBoxId();
    const allCameras = this.videoSourceService.videoSources();
    const cameras = aiboxId
      ? allCameras.filter(c => c.aibox_id === aiboxId)
      : allCameras;
    const tasks = this.aiTasks();

    const activeCameras = cameras.filter(c => c.is_active).length;
    const totalCameras = cameras.length;

    return {
      totalAlarms: alarmStats?.total || 0,
      alarmsTrend: 0, // Would need historical data to calculate
      resolvedAlarms: alarmStats?.resolved || 0,
      resolvedRate: alarmStats?.total ? Math.round((alarmStats.resolved / alarmStats.total) * 100) : 0,
      activeCameras,
      totalCameras,
      cameraUptime: totalCameras > 0 ? Math.round((activeCameras / totalCameras) * 100) : 0,
      runningTasks: tasks.filter(t => t.AlgTaskStatus?.type === 4).length, // type 4 = Healthy/Running
      taskEfficiency: 95 // Would need actual metrics
    };
  });

  // AI Tasks
  aiTasks = signal<any[]>([]);

  // Alarms by type from real data
  alarmsByType = computed(() => {
    const stats = this.alarmStats();
    if (!stats?.by_type) return [];

    const entries = Object.entries(stats.by_type);
    const maxCount = Math.max(...entries.map(([, count]) => count as number), 1);

    const typeColors: Record<string, string> = {
      'NoHelmet': '#ef4444',
      'NoVest': '#f59e0b',
      'Intrusion': '#3b82f6',
      'Fire': '#dc2626',
      'Smoke': '#dc2626',
      'NoSafetyGlasses': '#a855f7',
      'NoGloves': '#10b981',
      'NoMask': '#ec4899',
      'Fall': '#f97316'
    };

    return entries.map(([type, count]) => ({
      type: this.formatAlarmType(type),
      count: count as number,
      percentage: Math.round(((count as number) / maxCount) * 100),
      color: typeColors[type] || '#6b7280'
    })).sort((a, b) => b.count - a.count);
  });

  // Alarms by camera from real data
  alarmsByCamera = signal<{ camera: string; count: number; percentage: number }[]>([]);

  // Analytics data
  peopleCountData = signal<PeopleCount[]>([]);
  zoneOccupancyData = signal<ZoneOccupancy[]>([]);
  storeCountData = signal<StoreCount[]>([]);

  // Recent activity from real alarms
  recentActivity = computed(() => {
    return this.alarmService.notifications().slice(0, 5).map((notif, idx) => ({
      id: idx + 1,
      type: 'alarm',
      icon: notif.type === 'error' ? 'error' : notif.type === 'warning' ? 'warning' : 'info',
      title: notif.message,
      description: notif.location,
      time: notif.time
    }));
  });

  ngOnInit(): void {
    this.aiBoxService.loadAiBoxes().subscribe();
    this.loadStats();
    this.loadAiTasks();

    // Load video sources for camera stats
    this.videoSourceService.loadVideoSources();
  }

  onAiBoxChange(): void {
    this.loadStats();
  }

  private getStartDate(): string | undefined {
    const now = new Date();
    switch (this.selectedPeriod) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        return weekStart.toISOString();
      case 'month':
        const monthStart = new Date(now);
        monthStart.setMonth(monthStart.getMonth() - 1);
        return monthStart.toISOString();
      case 'year':
        const yearStart = new Date(now);
        yearStart.setFullYear(yearStart.getFullYear() - 1);
        return yearStart.toISOString();
      default:
        return undefined;
    }
  }

  loadStats(): void {
    this.loading.set(true);

    const startDate = this.getStartDate();
    const aiboxId = this.selectedAiBoxId() || undefined;

    this.alarmService.loadStats(startDate, undefined, aiboxId);
    this.alarmService.loadAlarms({ limit: 100 });
    this.loadAlarmsByCamera(startDate);
    this.loadAnalyticsData();
    this.loading.set(false);
  }

  loadAiTasks(): void {
    this.aiTaskService.getTasks().subscribe({
      next: (tasks) => this.aiTasks.set(tasks),
      error: () => this.aiTasks.set([])
    });
  }

  loadAlarmsByCamera(startDate?: string): void {
    const aiboxId = this.selectedAiBoxId();
    const params: string[] = [];
    if (aiboxId) params.push(`aibox_id=${aiboxId}`);
    if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    const url = `${this.apiUrl}/alarms/stats/by-camera${query}`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (data?.by_camera) {
          const entries = Object.entries(data.by_camera) as [string, number][];
          const maxCount = Math.max(...entries.map(([, count]) => count), 1);

          this.alarmsByCamera.set(
            entries.map(([camera, count]) => ({
              camera,
              count,
              percentage: Math.round((count / maxCount) * 100)
            })).sort((a, b) => b.count - a.count).slice(0, 8)
          );
        }
      },
      error: () => {
        // Fallback: use video sources as camera list with zero counts
        const cameras = this.videoSourceService.videoSources();
        this.alarmsByCamera.set(
          cameras.slice(0, 8).map(cam => ({
            camera: cam.name,
            count: 0,
            percentage: 0
          }))
        );
      }
    });
  }

  loadAnalyticsData(): void {
    const aiboxId = this.selectedAiBoxId() || undefined;

    this.analyticsService.getPeopleCount({ limit: 50, aibox_id: aiboxId }).subscribe({
      next: (data) => this.peopleCountData.set(data),
      error: () => {}
    });
    this.analyticsService.getZoneOccupancy({ limit: 50, aibox_id: aiboxId }).subscribe({
      next: (data) => this.zoneOccupancyData.set(data),
      error: () => {}
    });
    this.analyticsService.getStoreCount({ limit: 50, aibox_id: aiboxId }).subscribe({
      next: (data) => this.storeCountData.set(data),
      error: () => {}
    });
  }

  getPeopleCountPercent(item: PeopleCount): number {
    const max = Math.max(...this.peopleCountData().map(d => d.total), 1);
    return Math.round((item.total / max) * 100);
  }

  getZonePercent(item: ZoneOccupancy): number {
    const max = Math.max(...this.zoneOccupancyData().map(d => d.people_count), 1);
    return Math.round((item.people_count / max) * 100);
  }

  getStorePercent(item: StoreCount): number {
    const max = Math.max(...this.storeCountData().map(d => d.entry_count + d.exit_count), 1);
    return Math.round(((item.entry_count + item.exit_count) / max) * 100);
  }

  private formatAlarmType(type: string): string {
    // Convert camelCase/PascalCase to readable format
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  runBackfill(): void {
    this.http.post<{ updated: number; message: string }>(`${this.apiUrl}/alarms/backfill-aibox`, {}).subscribe({
      next: (result) => {
        console.log('[Statistics] Backfill result:', result.message);
        if (result.updated > 0) {
          this.loadStats();
          this.loadAlarmsByCamera();
        }
        // Also fetch debug info to help diagnose
        this.http.get<any>(`${this.apiUrl}/alarms/debug/aibox-distribution`).subscribe({
          next: (debug) => console.log('[Statistics] Alarm distribution:', JSON.stringify(debug, null, 2)),
          error: () => {}
        });
      },
      error: (err) => console.error('[Statistics] Backfill failed:', err)
    });
  }

  exportReport(): void {
    // Generate CSV report
    const stats = this.stats();
    const alarmTypes = this.alarmsByType();
    const cameras = this.alarmsByCamera();

    let csv = 'HSE Monitoring Statistics Report\n\n';
    csv += `Period,${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\n\n`;

    csv += 'Summary\n';
    csv += `Total Alarms,${stats.totalAlarms}\n`;
    csv += `Resolved,${stats.resolvedAlarms}\n`;
    csv += `Resolution Rate,${stats.resolvedRate}%\n`;
    csv += `Active Cameras,${stats.activeCameras}/${stats.totalCameras}\n`;
    csv += `Running AI Tasks,${stats.runningTasks}\n\n`;

    csv += 'Alarms by Type\n';
    csv += 'Type,Count\n';
    alarmTypes.forEach(a => csv += `${a.type},${a.count}\n`);
    csv += '\n';

    csv += 'Alarms by Camera\n';
    csv += 'Camera,Count\n';
    cameras.forEach(c => csv += `${c.camera},${c.count}\n`);
    csv += '\n';

    const peopleCounts = this.peopleCountData();
    if (peopleCounts.length > 0) {
      csv += 'People Count\n';
      csv += 'Camera,In,Out,Total,Time\n';
      peopleCounts.forEach(p => csv += `${p.camera_name},${p.count_in},${p.count_out},${p.total},${p.record_time}\n`);
      csv += '\n';
    }

    const storeData = this.storeCountData();
    if (storeData.length > 0) {
      csv += 'Store Traffic\n';
      csv += 'Camera,Entry,Exit,Date\n';
      storeData.forEach(s => csv += `${s.camera_name},${s.entry_count},${s.exit_count},${s.record_date}\n`);
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hse-statistics-${this.selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
