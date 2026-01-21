import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'e-map',
        loadComponent: () => import('./features/e-map/e-map').then(m => m.EMapComponent)
      },
      {
        path: 'monitor',
        loadComponent: () => import('./features/monitor/monitor').then(m => m.MonitorComponent)
      },
      {
        path: 'ptt',
        loadComponent: () => import('./features/ptt/ptt').then(m => m.PTTComponent)
      },
      {
        path: 'geofence',
        loadComponent: () => import('./features/geofence/geofence').then(m => m.GeoFenceComponent)
      },
      {
        path: 'track',
        loadComponent: () => import('./features/track/track').then(m => m.TrackComponent)
      },
      {
        path: 'picture',
        loadComponent: () => import('./features/picture/picture').then(m => m.PictureComponent)
      },
      {
        path: 'playback',
        loadComponent: () => import('./features/playback/playback').then(m => m.PlaybackComponent)
      },
      {
        path: 'event',
        loadComponent: () => import('./features/event/event').then(m => m.EventComponent)
      },
      {
        path: 'attend',
        loadComponent: () => import('./features/attend/attend').then(m => m.AttendComponent)
      },
      {
        path: 'smart-ai',
        loadComponent: () => import('./features/smart-ai/smart-ai').then(m => m.SmartAIComponent)
      },
      {
        path: 'task-list',
        loadComponent: () => import('./features/task-list/task-list').then(m => m.TaskListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
