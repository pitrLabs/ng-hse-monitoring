import { Routes } from '@angular/router';
import { authGuard, guestGuard, superuserGuard, p3Guard, operatorGuard, managerGuard } from './core/guards/auth.guard';

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
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent)
      },
      // Admin Routes
      {
        path: 'admin/dashboard',
        loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.AdminDashboardComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./features/admin/users/users').then(m => m.AdminUsersComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/roles',
        loadComponent: () => import('./features/admin/roles/roles').then(m => m.AdminRolesComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/video-sources',
        loadComponent: () => import('./features/admin/video-sources/video-sources').then(m => m.AdminVideoSourcesComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/ai-boxes',
        loadComponent: () => import('./features/admin/ai-boxes/ai-boxes').then(m => m.AdminAiBoxesComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/ai-tasks',
        loadComponent: () => import('./features/admin/ai-tasks/ai-tasks').then(m => m.AdminAiTasksComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/alarms',
        loadComponent: () => import('./features/admin/alarms/alarms').then(m => m.AdminAlarmsComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/ai-model',
        loadComponent: () => import('./features/admin/ai-model/ai-model').then(m => m.AdminAiModelComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/schedule',
        loadComponent: () => import('./features/admin/schedule/schedule').then(m => m.AdminScheduleComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/statistics',
        loadComponent: () => import('./features/admin/statistics/statistics').then(m => m.AdminStatisticsComponent),
        canActivate: [p3Guard]
      },
      {
        path: 'admin/realtime-preview',
        loadComponent: () => import('./features/admin/realtime-preview/realtime-preview').then(m => m.AdminRealtimePreviewComponent),
        canActivate: [p3Guard]
      },
      {
        path: 'admin/alarm-type',
        loadComponent: () => import('./features/admin/alarm-type/alarm-type').then(m => m.AdminAlarmTypeComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/database',
        loadComponent: () => import('./features/admin/database/database').then(m => m.AdminDatabaseComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/basic',
        loadComponent: () => import('./features/admin/basic/basic').then(m => m.AdminBasicComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/face-database',
        loadComponent: () => import('./features/admin/face-database/face-database').then(m => m.AdminFaceDatabaseComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/feature-management',
        loadComponent: () => import('./features/admin/feature-management/feature-management').then(m => m.AdminFeatureManagementComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/modbus-output',
        loadComponent: () => import('./features/admin/modbus-output/modbus-output').then(m => m.AdminModbusOutputComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/image-task-alarm',
        loadComponent: () => import('./features/admin/image-task-alarm/image-task-alarm').then(m => m.AdminImageTaskAlarmComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/image-task-management',
        loadComponent: () => import('./features/admin/image-task-management/image-task-management').then(m => m.AdminImageTaskManagementComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/image-task-source',
        loadComponent: () => import('./features/admin/image-task-source/image-task-source').then(m => m.AdminImageTaskSourceComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/permissions',
        loadComponent: () => import('./features/admin/permissions/permissions').then(m => m.AdminPermissionsComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/network',
        loadComponent: () => import('./features/admin/network/network').then(m => m.AdminNetworkComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/preference',
        loadComponent: () => import('./features/admin/preference/preference').then(m => m.AdminPreferenceComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/tools',
        loadComponent: () => import('./features/admin/tools/tools').then(m => m.AdminToolsComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/sensor',
        loadComponent: () => import('./features/admin/sensor/sensor').then(m => m.AdminSensorComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/local-video',
        loadComponent: () => import('./features/admin/local-video/local-video').then(m => m.AdminLocalVideoComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/threshold-config',
        loadComponent: () => import('./features/admin/threshold-config/threshold-config').then(m => m.AdminThresholdConfigComponent),
        canActivate: [superuserGuard]
      },
      {
        path: 'admin/suit-config',
        loadComponent: () => import('./features/admin/suit-config/suit-config').then(m => m.AdminSuitConfigComponent),
        canActivate: [superuserGuard]
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
