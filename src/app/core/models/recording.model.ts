export interface Recording {
  id: string;
  bmapp_id?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  duration?: number;
  camera_id?: string;
  camera_name?: string;
  task_session?: string;
  start_time: string;
  end_time?: string;
  trigger_type: 'alarm' | 'manual' | 'schedule';
  alarm_id?: string;
  thumbnail_url?: string;
  is_available: boolean;
  created_at: string;
  synced_at?: string;
}

export interface RecordingFilter {
  camera_id?: string;
  task_session?: string;
  trigger_type?: string;
  alarm_id?: string;
  start_date?: string;
  end_date?: string;
  is_available?: boolean;
}

export interface CalendarDay {
  date: string;
  count: number;
  has_recordings: boolean;
}

export interface VideoUrlResponse {
  id: string;
  file_name: string;
  video_url: string;
  duration?: number;
  start_time?: string;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '--:--';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return '--';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get trigger type display label
 */
export function getTriggerTypeLabel(triggerType: string): string {
  switch (triggerType) {
    case 'alarm': return 'Alarm';
    case 'manual': return 'Manual';
    case 'schedule': return 'Scheduled';
    default: return triggerType;
  }
}

/**
 * Get trigger type color class
 */
export function getTriggerTypeColor(triggerType: string): string {
  switch (triggerType) {
    case 'alarm': return 'error';
    case 'manual': return 'info';
    case 'schedule': return 'success';
    default: return 'info';
  }
}
