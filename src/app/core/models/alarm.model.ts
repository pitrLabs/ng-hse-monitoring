export interface Alarm {
  id: string;
  bmapp_id?: string;
  alarm_type: string;
  alarm_name: string;
  camera_id?: string;
  camera_name?: string;
  location?: string;
  confidence?: number;
  image_url?: string;
  video_url?: string;
  description?: string;
  alarm_time: string;
  status: 'new' | 'acknowledged' | 'resolved';
  raw_data?: any;
  created_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface AlarmStats {
  total: number;
  new: number;
  acknowledged: number;
  resolved: number;
  by_type: Record<string, number>;
}

export interface AlarmNotification {
  id: string;
  message: string;
  location: string;
  time: string;
  type: 'warning' | 'error' | 'info';
  alarm?: Alarm;
}

export type AlarmSeverity = 'low' | 'medium' | 'high' | 'critical';

export const ALARM_TYPE_SEVERITY: Record<string, AlarmSeverity> = {
  'NoHelmet': 'high',
  'NoMask': 'medium',
  'NoVest': 'high',
  'Smoking': 'high',
  'Fire': 'critical',
  'Smoke': 'critical',
  'Intrusion': 'high',
  'Climbing': 'high',
  'Falling': 'critical',
  'Crowd': 'medium',
  'Loitering': 'low',
  'default': 'medium'
};

export function getAlarmSeverity(alarmType: string): AlarmSeverity {
  return ALARM_TYPE_SEVERITY[alarmType] || ALARM_TYPE_SEVERITY['default'];
}

export function getAlarmNotificationType(alarmType: string): 'warning' | 'error' | 'info' {
  const severity = getAlarmSeverity(alarmType);
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    default:
      return 'info';
  }
}
