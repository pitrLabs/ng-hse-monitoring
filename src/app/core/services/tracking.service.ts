import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;
  private lastTrackedPath = '';

  // Page title mapping
  private pageTitles: { [key: string]: string } = {
    '/home': 'Home',
    '/e-map': 'Lokasi Koper',
    '/monitor': 'Monitor',
    '/ptt': 'PTT',
    '/track': 'Track',
    '/picture': 'Bukti Foto',
    '/playback': 'Rekaman',
    '/event': 'Catatan Pelanggaran',
    '/profile': 'Profile Settings',
    '/admin/dashboard': 'Admin Dashboard',
    '/admin/realtime-preview': 'Monitoring AI',
    '/admin/users': 'User Management',
    '/admin/roles': 'Role Management',
    '/admin/permissions': 'Permissions',
    '/admin/logging': 'Audit Logging',
    '/admin/video-sources': 'Video Sources',
    '/admin/ai-boxes': 'AI Boxes',
    '/admin/local-video': 'Local Video Library',
    '/admin/ai-tasks': 'AI Task Management',
    '/admin/alarms': 'Alarm Management',
    '/admin/alarm-type': 'Alarm Types',
    '/admin/ai-model': 'AI Model Info',
    '/admin/schedule': 'Schedule',
    '/admin/statistics': 'Statistics',
    '/admin/sensor': 'Sensor Management',
    '/admin/threshold-config': 'Threshold Configuration',
    '/admin/suit-config': 'PPE Detection Configuration',
    '/admin/network': 'Network Settings',
    '/admin/database': 'Database Configuration',
    '/admin/basic': 'Basic Settings',
    '/admin/preference': 'Preferences',
    '/admin/tools': 'System Tools',
    '/admin/feature-management': 'Feature Management',
    '/admin/face-database': 'Face Database',
    '/admin/modbus-output': 'Modbus Output'
  };

  initialize() {
    // Listen to router navigation events
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.trackPageView(event.urlAfterRedirects);
    });
  }

  private trackPageView(url: string) {
    // Extract path without query params
    const path = url.split('?')[0];

    // Avoid duplicate tracking (same page refresh)
    if (path === this.lastTrackedPath) {
      return;
    }

    this.lastTrackedPath = path;

    // Get page title
    const pageTitle = this.getPageTitle(path);

    // Send to backend
    this.http.post(`${this.apiUrl}/audit-logs/track/page-view`, {
      page_path: path,
      page_title: pageTitle
    }).subscribe({
      next: () => {
        // Silently track - no user feedback needed
      },
      error: (err) => {
        // Silently fail - don't interrupt user experience
        console.warn('Failed to track page view:', err);
      }
    });
  }

  private getPageTitle(path: string): string {
    // Try exact match first
    if (this.pageTitles[path]) {
      return this.pageTitles[path];
    }

    // Try partial match for dynamic routes (e.g., /admin/users/123)
    for (const [key, value] of Object.entries(this.pageTitles)) {
      if (path.startsWith(key)) {
        return value;
      }
    }

    // Fallback to path
    return path;
  }
}
