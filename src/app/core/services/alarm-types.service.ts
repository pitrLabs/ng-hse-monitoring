import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AlarmTypeInfo {
  type: string;
  description: string;
  count: number;
  color: string;
  severity: string;
}

export type AlarmTypesMap = Record<string, AlarmTypeInfo>;

// Colors for different severity levels
const COLOR_CRITICAL = '#dc2626';  // Red
const COLOR_HIGH = '#ea580c';      // Orange
const COLOR_MEDIUM = '#ca8a04';    // Yellow
const COLOR_LOW = '#2563eb';       // Blue
const COLOR_INFO = '#22c55e';      // Green (for unknown types)

/**
 * Derive color from alarm type keywords.
 * Used as fallback when API data not available.
 */
function deriveColor(alarmType: string): string {
  if (!alarmType) return COLOR_INFO;
  const t = alarmType.toLowerCase();

  if (['fire', 'smoke', 'fall', 'falling'].some(k => t.includes(k))) return COLOR_CRITICAL;
  if (['helmet', 'vest', 'intrusion', 'smoking', 'climb', 'goggle', 'glove'].some(k => t.includes(k))) return COLOR_HIGH;
  if (['mask', 'crowd'].some(k => t.includes(k))) return COLOR_MEDIUM;
  if (['loiter', 'person', 'vehicle'].some(k => t.includes(k))) return COLOR_LOW;

  return COLOR_INFO;  // Green for unknown types
}

/**
 * Derive severity from alarm type keywords.
 * Used as fallback when API data not available.
 */
function deriveSeverity(alarmType: string): string {
  if (!alarmType) return 'info';
  const t = alarmType.toLowerCase();

  if (['fire', 'smoke', 'fall', 'falling'].some(k => t.includes(k))) return 'critical';
  if (['helmet', 'vest', 'intrusion', 'smoking', 'climb', 'goggle', 'glove'].some(k => t.includes(k))) return 'high';
  if (['mask', 'crowd'].some(k => t.includes(k))) return 'medium';
  if (['loiter', 'person', 'vehicle'].some(k => t.includes(k))) return 'low';

  return 'info';  // Green for unknown types
}

@Injectable({
  providedIn: 'root'
})
export class AlarmTypesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Cached alarm types from API (fetched from actual database data)
  private _alarmTypes = signal<AlarmTypesMap>({});
  private _loaded = signal(false);

  readonly alarmTypes = this._alarmTypes.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  constructor() {
    this.loadAlarmTypes();
  }

  /**
   * Load alarm types from API.
   * Types are fetched dynamically from alarms table (actual BM-APP data).
   */
  loadAlarmTypes(): void {
    this.http.get<AlarmTypesMap>(`${this.apiUrl}/alarm-types`).subscribe({
      next: (types) => {
        this._alarmTypes.set(types);
        this._loaded.set(true);
        console.log('[AlarmTypesService] Loaded', Object.keys(types).length, 'alarm types from database');
      },
      error: (err) => {
        console.warn('[AlarmTypesService] Failed to load alarm types:', err);
        this._loaded.set(true);
      }
    });
  }

  /**
   * Get info for a specific alarm type.
   * Returns derived values if type not found in API cache.
   */
  getInfo(alarmType: string): AlarmTypeInfo {
    const types = this._alarmTypes();
    return types[alarmType] || {
      type: alarmType,
      description: alarmType,
      count: 0,
      color: deriveColor(alarmType),
      severity: deriveSeverity(alarmType)
    };
  }

  /**
   * Get color for an alarm type.
   * Currently same for all types (BM-APP doesn't send color).
   */
  getColor(alarmType: string): string {
    return this.getInfo(alarmType).color;
  }

  /**
   * Get severity for an alarm type.
   * Currently same for all types (BM-APP doesn't send severity).
   */
  getSeverity(alarmType: string): string {
    return this.getInfo(alarmType).severity;
  }

  /**
   * Get description for an alarm type (from BM-APP raw_data).
   */
  getDescription(alarmType: string): string {
    return this.getInfo(alarmType).description;
  }

  /**
   * Get CSS class for severity badge.
   * Since all alarms have same severity, returns same class.
   */
  getSeverityClass(alarmType: string): string {
    return this.getSeverity(alarmType);
  }
}
