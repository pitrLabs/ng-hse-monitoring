import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { filter, interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  prefix?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatBadgeModule
  ],
  template: `
    <div class="layout-container">
      <!-- Sidebar -->
      <aside class="sidebar glass-card-static" [class.collapsed]="sidebarCollapsed()">
        <!-- Logo -->
        <div class="sidebar-header">
          <div class="logo-wrapper">
            <div class="logo-icon">
              <mat-icon>visibility</mat-icon>
            </div>
            @if (!sidebarCollapsed()) {
              <div class="logo-text">
                <span class="logo-title">SartEye</span>
                <span class="logo-subtitle">VMS</span>
              </div>
            }
          </div>
          <button mat-icon-button class="collapse-btn" (click)="toggleSidebar()">
            <mat-icon>{{ sidebarCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route; let i = $index) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/home' }"
              [matTooltip]="sidebarCollapsed() ? item.label : ''"
              matTooltipPosition="right"
            >
              <span class="nav-prefix">{{ getPrefix(i) }}</span>
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!sidebarCollapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
              <div class="nav-indicator"></div>
            </a>
          }
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <mat-divider></mat-divider>
          <a
            class="nav-item"
            routerLink="/profile"
            routerLinkActive="active"
            [matTooltip]="sidebarCollapsed() ? 'Settings' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>settings</mat-icon>
            @if (!sidebarCollapsed()) {
              <span class="nav-label">Settings</span>
            }
            <div class="nav-indicator"></div>
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="main-wrapper" [class.sidebar-collapsed]="sidebarCollapsed()">
        <!-- Header -->
        <header class="header glass-card-static">
          <div class="header-left">
            <h1 class="page-title">{{ pageTitle() }}</h1>
          </div>

          <div class="header-right">
            <!-- Zoom Icon -->
            <button mat-icon-button class="header-icon-btn" matTooltip="Zoom">
              <mat-icon>zoom_in</mat-icon>
            </button>

            <!-- Date Time -->
            <div class="datetime-display">
              <mat-icon>schedule</mat-icon>
              <span>{{ currentDateTime() }}</span>
            </div>

            <!-- Grid Menu -->
            <button mat-icon-button class="header-icon-btn" [matMenuTriggerFor]="gridMenu" matTooltip="Applications">
              <mat-icon>apps</mat-icon>
            </button>
            <mat-menu #gridMenu="matMenu" class="grid-dropdown">
              <button mat-menu-item>
                <mat-icon>dns</mat-icon>
                <span>Backend Management</span>
              </button>
              <button mat-menu-item>
                <mat-icon>smart_toy</mat-icon>
                <span>BVAlgUI</span>
              </button>
            </mat-menu>

            <!-- Notifications -->
            <button mat-icon-button class="header-icon-btn" [matMenuTriggerFor]="notifMenu" matTooltip="Notifications">
              <mat-icon [matBadge]="alarmCount()" matBadgeColor="warn" [matBadgeHidden]="alarmCount() === 0">notifications</mat-icon>
            </button>
            <mat-menu #notifMenu="matMenu" class="notification-dropdown">
              <div class="notif-header">
                <span>Alarm Notifications</span>
                <span class="notif-count">{{ alarmCount() }} new</span>
              </div>
              <mat-divider></mat-divider>
              @for (alarm of alarms(); track alarm.id) {
                <button mat-menu-item class="notif-item">
                  <mat-icon [class]="'notif-icon ' + alarm.type">{{ alarm.icon }}</mat-icon>
                  <div class="notif-content">
                    <span class="notif-title">{{ alarm.title }}</span>
                    <span class="notif-time">{{ alarm.time }}</span>
                  </div>
                </button>
              }
              @if (alarms().length === 0) {
                <div class="notif-empty">
                  <mat-icon>notifications_off</mat-icon>
                  <span>No new notifications</span>
                </div>
              }
            </mat-menu>

            <!-- User Menu -->
            <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
              <div class="user-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="user-info">
                <span class="user-name">{{ currentUser()?.full_name || currentUser()?.username }}</span>
                <span class="user-role">{{ currentUser()?.is_superuser ? 'Administrator' : 'User' }}</span>
              </div>
              <mat-icon class="dropdown-icon">expand_more</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu" class="user-dropdown">
              <button mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon>
                <span>Profile</span>
              </button>
              <button mat-menu-item>
                <mat-icon>lock</mat-icon>
                <span>Change Password</span>
              </button>
              <button mat-menu-item>
                <mat-icon>tune</mat-icon>
                <span>Local Configuration</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item>
                <mat-icon>info</mat-icon>
                <span>About</span>
              </button>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- Content -->
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      min-height: 100vh;
    }

    // Sidebar
    .sidebar {
      width: 260px;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      display: flex;
      flex-direction: column;
      z-index: 100;
      transition: width 0.3s ease;
      border-radius: 0;
      border-right: 1px solid var(--glass-border);
      border-left: none;
      border-top: none;
      border-bottom: none;

      &.collapsed {
        width: 72px;
      }
    }

    .sidebar-header {
      padding: 20px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--glass-border);
    }

    .logo-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-gradient);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: white;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .logo-title {
      font-size: 18px;
      font-weight: 700;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo-subtitle {
      font-size: 11px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .collapse-btn {
      width: 32px;
      height: 32px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .sidebar.collapsed .sidebar-header {
      justify-content: center;
      padding: 16px 12px;
    }

    .sidebar.collapsed .logo-wrapper {
      display: none;
    }

    // Navigation
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;

      .nav-prefix {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-tertiary);
        min-width: 16px;
      }

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      .nav-label {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
      }

      .nav-indicator {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 0;
        background: var(--accent-gradient);
        border-radius: 0 3px 3px 0;
        transition: height 0.2s ease;
      }

      &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
      }

      &.active {
        background: rgba(0, 212, 255, 0.1);
        color: var(--accent-primary);

        .nav-indicator {
          height: 24px;
        }

        .nav-prefix {
          color: var(--accent-primary);
        }

        mat-icon {
          color: var(--accent-primary);
        }
      }
    }

    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 12px;

      .nav-prefix {
        display: none;
      }
    }

    // Sidebar Footer
    .sidebar-footer {
      padding: 12px;

      mat-divider {
        margin-bottom: 12px;
        border-color: var(--glass-border);
      }

      .nav-item .nav-prefix {
        display: none;
      }
    }

    // Main Wrapper
    .main-wrapper {
      flex: 1;
      margin-left: 260px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.3s ease;

      &.sidebar-collapsed {
        margin-left: 72px;
      }
    }

    // Header
    .header {
      height: 70px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      border-radius: 0;
      border-bottom: 1px solid var(--glass-border);
      border-top: none;
      border-left: none;
      border-right: none;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon-btn {
      width: 40px;
      height: 40px;
      color: var(--text-secondary);
      transition: all 0.2s ease;

      &:hover {
        color: var(--accent-primary);
        background: var(--glass-bg-hover);
      }
    }

    .datetime-display {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .user-menu-btn {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 12px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      margin-left: 8px;
      height: auto !important;
      line-height: normal !important;

      &:hover {
        background: var(--glass-bg-hover);
        border-color: var(--glass-border-hover);
      }

      ::ng-deep .mdc-button__label {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 12px;
      }
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: white;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.3;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .user-role {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .dropdown-icon {
      color: var(--text-secondary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    // Notification dropdown
    .notification-dropdown {
      min-width: 320px;
    }

    .notif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-weight: 600;
      color: var(--text-primary);

      .notif-count {
        font-size: 12px;
        color: var(--accent-primary);
        font-weight: 500;
      }
    }

    .notif-item {
      padding: 12px 16px !important;
      height: auto !important;

      .notif-icon {
        margin-right: 12px;

        &.warning {
          color: var(--warning);
        }
        &.error {
          color: var(--error);
        }
        &.info {
          color: var(--info);
        }
      }

      .notif-content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .notif-title {
          font-size: 14px;
          color: var(--text-primary);
        }

        .notif-time {
          font-size: 12px;
          color: var(--text-tertiary);
        }
      }
    }

    .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      color: var(--text-tertiary);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    // Content
    .content {
      flex: 1;
      padding: 24px;
    }

    // Responsive
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);

        &.collapsed {
          transform: translateX(0);
          width: 72px;
        }
      }

      .main-wrapper {
        margin-left: 0;

        &.sidebar-collapsed {
          margin-left: 72px;
        }
      }

      .user-info {
        display: none;
      }

      .datetime-display {
        display: none;
      }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private timeSubscription?: Subscription;

  sidebarCollapsed = signal(false);
  pageTitle = signal('Home');
  currentDateTime = signal('');
  alarmCount = signal(3);

  currentUser = this.authService.currentUser;

  alarms = signal([
    { id: 1, title: 'Motion detected - Camera 01', time: '2 min ago', type: 'warning', icon: 'warning' },
    { id: 2, title: 'Device offline - Sensor 05', time: '10 min ago', type: 'error', icon: 'error' },
    { id: 3, title: 'New device connected', time: '1 hour ago', type: 'info', icon: 'info' }
  ]);

  navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/home' },
    { label: 'E-Map', icon: 'map', route: '/e-map' },
    { label: 'Monitor', icon: 'videocam', route: '/monitor' },
    { label: 'PTT', icon: 'mic', route: '/ptt' },
    { label: 'GeoFence', icon: 'fence', route: '/geofence' },
    { label: 'Track', icon: 'route', route: '/track' },
    { label: 'Picture', icon: 'photo_library', route: '/picture' },
    { label: 'Playback', icon: 'play_circle', route: '/playback' },
    { label: 'Event', icon: 'event', route: '/event' },
    { label: 'Attend', icon: 'how_to_reg', route: '/attend' },
    { label: 'Smart AI', icon: 'psychology', route: '/smart-ai' },
    { label: 'Task List', icon: 'assignment', route: '/task-list' },
  ];

  getPrefix(index: number): string {
    return String.fromCharCode(65 + index) + '.';
  }

  ngOnInit(): void {
    this.updateDateTime();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateDateTime();
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
    });

    this.updatePageTitle();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  private updateDateTime(): void {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.currentDateTime.set(`${date} ${time}`);
  }

  private updatePageTitle(): void {
    const url = this.router.url;
    const titles: Record<string, string> = {
      '/home': 'Home',
      '/e-map': 'E-Map',
      '/monitor': 'Monitor',
      '/ptt': 'PTT',
      '/geofence': 'GeoFence',
      '/track': 'Track',
      '/picture': 'Picture',
      '/playback': 'Playback',
      '/event': 'Event',
      '/attend': 'Attend',
      '/smart-ai': 'Smart AI',
      '/task-list': 'Task List',
      '/profile': 'Profile Settings'
    };

    for (const [path, title] of Object.entries(titles)) {
      if (url.startsWith(path)) {
        this.pageTitle.set(title);
        return;
      }
    }
    this.pageTitle.set('Home');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
