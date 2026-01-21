import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  color: 'cyan' | 'violet' | 'green' | 'orange';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="dashboard">
      <!-- Welcome Section -->
      <div class="welcome-section animate-fade-in">
        <div class="welcome-content">
          <h2 class="welcome-title">
            Welcome back, <span class="text-gradient">{{ currentUser()?.full_name || currentUser()?.username }}</span>
          </h2>
          <p class="welcome-subtitle">Here's what's happening with your HSE monitoring system</p>
        </div>
        <div class="welcome-date">
          <mat-icon>calendar_today</mat-icon>
          <span>{{ today }}</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        @for (stat of stats(); track stat.title; let i = $index) {
          <div class="stat-card glass-card" [class]="'stat-' + stat.color" [style.animation-delay]="(i * 0.1) + 's'">
            <div class="stat-icon" [class]="'icon-' + stat.color">
              <mat-icon>{{ stat.icon }}</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-title">{{ stat.title }}</span>
            </div>
            @if (stat.trend) {
              <div class="stat-trend" [class.up]="stat.trendUp" [class.down]="!stat.trendUp">
                <mat-icon>{{ stat.trendUp ? 'trending_up' : 'trending_down' }}</mat-icon>
                <span>{{ stat.trend }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">
        <!-- Quick Actions -->
        <div class="quick-actions glass-card-static animate-fade-in" style="animation-delay: 0.4s">
          <h3 class="section-title">
            <mat-icon>bolt</mat-icon>
            Quick Actions
          </h3>
          <div class="actions-grid">
            <a routerLink="/users" class="action-item">
              <div class="action-icon cyan">
                <mat-icon>person_add</mat-icon>
              </div>
              <span class="action-label">Add User</span>
            </a>
            <a routerLink="/roles" class="action-item">
              <div class="action-icon violet">
                <mat-icon>add_moderator</mat-icon>
              </div>
              <span class="action-label">Add Role</span>
            </a>
            <a routerLink="/profile" class="action-item">
              <div class="action-icon green">
                <mat-icon>settings</mat-icon>
              </div>
              <span class="action-label">Settings</span>
            </a>
            <a routerLink="/users" class="action-item">
              <div class="action-icon orange">
                <mat-icon>group</mat-icon>
              </div>
              <span class="action-label">View Users</span>
            </a>
          </div>
        </div>

        <!-- System Status -->
        <div class="system-status glass-card-static animate-fade-in" style="animation-delay: 0.5s">
          <h3 class="section-title">
            <mat-icon>monitor_heart</mat-icon>
            System Status
          </h3>
          <div class="status-list">
            <div class="status-item">
              <div class="status-indicator online"></div>
              <span class="status-label">API Server</span>
              <span class="status-value">Online</span>
            </div>
            <div class="status-item">
              <div class="status-indicator online"></div>
              <span class="status-label">Database</span>
              <span class="status-value">Connected</span>
            </div>
            <div class="status-item">
              <div class="status-indicator online"></div>
              <span class="status-label">Authentication</span>
              <span class="status-value">Active</span>
            </div>
            <div class="status-item">
              <div class="status-indicator online"></div>
              <span class="status-label">Object Detection</span>
              <span class="status-value">Running</span>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="recent-activity glass-card-static animate-fade-in" style="animation-delay: 0.6s">
          <h3 class="section-title">
            <mat-icon>history</mat-icon>
            Recent Activity
          </h3>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon login">
                <mat-icon>login</mat-icon>
              </div>
              <div class="activity-content">
                <span class="activity-title">User logged in</span>
                <span class="activity-time">Just now</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon system">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div class="activity-content">
                <span class="activity-title">System health check passed</span>
                <span class="activity-time">5 minutes ago</span>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon detection">
                <mat-icon>visibility</mat-icon>
              </div>
              <div class="activity-content">
                <span class="activity-title">Object detection active</span>
                <span class="activity-time">10 minutes ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    // Welcome Section
    .welcome-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .welcome-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .welcome-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }

    .welcome-date {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    // Stats Grid
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .stat-card {
      padding: 24px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      position: relative;
      overflow: hidden;
      animation: fadeIn 0.5s ease forwards;
      opacity: 0;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
      }

      &.stat-cyan::before {
        background: linear-gradient(90deg, var(--accent-primary), transparent);
      }

      &.stat-violet::before {
        background: linear-gradient(90deg, var(--accent-secondary), transparent);
      }

      &.stat-green::before {
        background: linear-gradient(90deg, var(--success), transparent);
      }

      &.stat-orange::before {
        background: linear-gradient(90deg, var(--warning), transparent);
      }
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &.icon-cyan {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.icon-violet {
        background: rgba(124, 58, 237, 0.15);
        mat-icon { color: var(--accent-secondary); }
      }

      &.icon-green {
        background: rgba(16, 185, 129, 0.15);
        mat-icon { color: var(--success); }
      }

      &.icon-orange {
        background: rgba(245, 158, 11, 0.15);
        mat-icon { color: var(--warning); }
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-title {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .stat-trend {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.up {
        color: var(--success);
      }

      &.down {
        color: var(--error);
      }
    }

    // Content Grid
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--glass-border);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--accent-primary);
      }
    }

    // Quick Actions
    .quick-actions {
      padding: 24px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;

      &:hover {
        background: var(--glass-bg-hover);
        border-color: var(--glass-border-hover);
        transform: translateY(-2px);
      }
    }

    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      &.cyan {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.violet {
        background: rgba(124, 58, 237, 0.15);
        mat-icon { color: var(--accent-secondary); }
      }

      &.green {
        background: rgba(16, 185, 129, 0.15);
        mat-icon { color: var(--success); }
      }

      &.orange {
        background: rgba(245, 158, 11, 0.15);
        mat-icon { color: var(--warning); }
      }
    }

    .action-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    // System Status
    .system-status {
      padding: 24px;
    }

    .status-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--glass-bg);
      border-radius: var(--radius-sm);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.online {
        background: var(--success);
        box-shadow: 0 0 8px var(--success);
      }

      &.offline {
        background: var(--error);
        box-shadow: 0 0 8px var(--error);
      }
    }

    .status-label {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
    }

    .status-value {
      font-size: 12px;
      color: var(--success);
      font-weight: 500;
    }

    // Recent Activity
    .recent-activity {
      padding: 24px;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.login {
        background: rgba(0, 212, 255, 0.15);
        mat-icon { color: var(--accent-primary); }
      }

      &.system {
        background: rgba(16, 185, 129, 0.15);
        mat-icon { color: var(--success); }
      }

      &.detection {
        background: rgba(124, 58, 237, 0.15);
        mat-icon { color: var(--accent-secondary); }
      }
    }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .activity-title {
      font-size: 14px;
      color: var(--text-primary);
    }

    .activity-time {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private roleService = inject(RoleService);

  currentUser = this.authService.currentUser;

  stats = signal<StatCard[]>([
    { title: 'Total Users', value: '-', icon: 'people', color: 'cyan' },
    { title: 'Active Roles', value: '-', icon: 'admin_panel_settings', color: 'violet' },
    { title: 'Permissions', value: '-', icon: 'verified_user', color: 'green' },
    { title: 'Active Sessions', value: '1', icon: 'devices', color: 'orange' }
  ]);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.stats.update(stats => {
          stats[0].value = users.length;
          return [...stats];
        });
      }
    });

    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.stats.update(stats => {
          stats[1].value = roles.length;
          return [...stats];
        });
      }
    });

    this.roleService.getPermissions().subscribe({
      next: (permissions) => {
        this.stats.update(stats => {
          stats[2].value = permissions.length;
          return [...stats];
        });
      }
    });
  }
}
