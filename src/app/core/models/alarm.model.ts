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
  by_camera?: Record<string, number>;
  daily_counts?: { date: string; count: number }[];
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

/**
 * Get the full image URL for alarm images
 * BM-APP returns relative paths like "Images/DAY_20260131/IMAGE_xxx.jpg"
 * We need to prepend the BM-APP base URL
 */
export function getAlarmImageUrl(imageUrl: string | undefined | null): string | null {
  if (!imageUrl) return null;

  // If already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Get BM-APP URL from environment
  const bmappUrl = (window as any).__env?.BMAPP_URL || 'http://103.75.84.183:2323';

  // Handle relative paths
  if (imageUrl.startsWith('/')) {
    return `${bmappUrl}${imageUrl}`;
  }

  // Handle paths without leading slash (e.g., "Images/...")
  return `${bmappUrl}/${imageUrl}`;
}
