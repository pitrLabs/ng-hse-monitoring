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
  media_url?: string;  // RTSP URL for video source
  description?: string;
  alarm_time: string;
  status: 'new' | 'acknowledged' | 'resolved';
  raw_data?: any;
  created_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  // MinIO storage fields
  minio_image_path?: string;
  minio_labeled_image_path?: string;
  minio_video_path?: string;
  minio_synced_at?: string;
  minio_image_url?: string;  // Presigned URL for raw image
  minio_labeled_image_url?: string;  // Presigned URL for labeled image (with detection boxes)
  minio_video_url?: string;  // Presigned URL for video
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

export type AlarmSeverity = 'low' | 'medium' | 'high' | 'critical' | 'info';

/**
 * Get severity for an alarm type by deriving from keywords in type name.
 * BM-APP doesn't send severity info, so we derive it from the type name.
 * For cached API data, use AlarmTypesService.getSeverity() instead.
 */
export function getAlarmSeverity(alarmType: string): AlarmSeverity {
  if (!alarmType) return 'info';
  const t = alarmType.toLowerCase();

  // Critical - immediate danger
  if (['fire', 'smoke', 'fall', 'falling'].some(k => t.includes(k))) return 'critical';
  // High - safety violations
  if (['helmet', 'vest', 'intrusion', 'smoking', 'climb', 'goggle', 'glove'].some(k => t.includes(k))) return 'high';
  // Medium - minor violations
  if (['mask', 'crowd'].some(k => t.includes(k))) return 'medium';
  // Low - informational
  if (['loiter', 'person', 'vehicle'].some(k => t.includes(k))) return 'low';

  return 'info';  // Green for unknown types
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
 * Get the best available image URL for an alarm
 * Priority: 1) MinIO labeled image (with detection boxes)
 *           2) MinIO raw image
 *           3) BM-APP image_url (fallback)
 */
export function getBestAlarmImageUrl(alarm: Alarm | undefined | null): string | null {
  if (!alarm) return null;

  // Priority 1: MinIO labeled image (with detection boxes) - this is what we want!
  if (alarm.minio_labeled_image_url) {
    return alarm.minio_labeled_image_url;
  }

  // Priority 2: MinIO raw image
  if (alarm.minio_image_url) {
    return alarm.minio_image_url;
  }

  // Priority 3: Fallback to BM-APP image_url
  return getAlarmImageUrl(alarm.image_url);
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
