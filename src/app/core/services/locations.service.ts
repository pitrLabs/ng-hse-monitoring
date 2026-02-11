import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CameraLocation {
  id: string;
  external_id: string | null;
  source: string;
  name: string;
  latitude: number;
  longitude: number;
  location_type: string | null;
  description: string | null;
  address: string | null;
  is_active: boolean;
  extra_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface LocationStats {
  total: number;
  by_source: Record<string, number>;
  by_type: Record<string, number>;
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export interface LiveKoperItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  is_online: boolean;
  has_gps?: boolean;
  keypoint_name?: string;
  jenis_har?: string;
  extra_data?: Record<string, unknown>;
}

export interface LiveKoperResponse {
  count: number;
  online: number;
  with_gps?: number;
  data: LiveKoperItem[];
}

export interface TrackPoint {
  lat: number;
  lng: number;
  status: string;
  is_online: boolean;
  recorded_at: string;
}

export interface DeviceHistoryResponse {
  device_id: string;
  from_time: string;
  to_time: string;
  count: number;
  track: TrackPoint[];
  latest: TrackPoint | null;
}

@Injectable({
  providedIn: 'root'
})
export class LocationsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/locations`;

  locations = signal<CameraLocation[]>([]);
  stats = signal<LocationStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  async loadLocations(options?: {
    source?: string;
    location_type?: string;
    search?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<CameraLocation[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      let params = new HttpParams();
      if (options?.source) params = params.set('source', options.source);
      if (options?.location_type) params = params.set('location_type', options.location_type);
      if (options?.search) params = params.set('search', options.search);
      if (options?.is_active !== undefined) params = params.set('is_active', options.is_active.toString());
      if (options?.skip) params = params.set('skip', options.skip.toString());
      if (options?.limit) params = params.set('limit', options.limit.toString());

      const locations = await firstValueFrom(
        this.http.get<CameraLocation[]>(this.baseUrl, { params })
      );
      this.locations.set(locations);
      return locations;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load locations';
      this.error.set(message);
      console.error('Failed to load locations:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async loadStats(): Promise<LocationStats | null> {
    try {
      const stats = await firstValueFrom(
        this.http.get<LocationStats>(`${this.baseUrl}/stats`)
      );
      this.stats.set(stats);
      return stats;
    } catch (err) {
      console.error('Failed to load location stats:', err);
      return null;
    }
  }

  async syncLocations(source: string = 'gps_tim_har'): Promise<SyncResult | null> {
    try {
      const result = await firstValueFrom(
        this.http.post<SyncResult>(`${this.baseUrl}/sync`, null, {
          params: { source }
        })
      );
      // Reload locations after sync
      await this.loadLocations();
      return result;
    } catch (err) {
      console.error('Failed to sync locations:', err);
      return null;
    }
  }

  async getLocation(id: string): Promise<CameraLocation | null> {
    try {
      return await firstValueFrom(
        this.http.get<CameraLocation>(`${this.baseUrl}/${id}`)
      );
    } catch (err) {
      console.error('Failed to get location:', err);
      return null;
    }
  }

  /**
   * Get live tim koper data directly from RTU API (real-time, not from DB)
   * Returns all koper CCTV with status ON/OFF
   */
  async getLiveTimKoper(): Promise<LiveKoperResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<LiveKoperResponse>(`${this.baseUrl}/live/tim-koper`)
      );
    } catch (err) {
      console.error('Failed to get live tim koper:', err);
      return null;
    }
  }

  /**
   * Get live GPS tim har data directly from RTU API (real-time, not from DB)
   * Returns koper CCTV that are at scheduled Har locations with GPS
   */
  async getLiveGpsTimHar(): Promise<LiveKoperResponse | null> {
    try {
      return await firstValueFrom(
        this.http.get<LiveKoperResponse>(`${this.baseUrl}/live/gps-tim-har`)
      );
    } catch (err) {
      console.error('Failed to get live gps tim har:', err);
      return null;
    }
  }

  /**
   * Get historical GPS track for a device
   * @param deviceId - The device ID (id_alat)
   * @param hours - Number of hours of history to retrieve (default 24)
   * @param limit - Maximum number of data points (default 1000)
   */
  async getDeviceHistory(deviceId: string, hours: number = 24, limit: number = 1000): Promise<DeviceHistoryResponse | null> {
    try {
      const params = new HttpParams()
        .set('hours', hours.toString())
        .set('limit', limit.toString());

      return await firstValueFrom(
        this.http.get<DeviceHistoryResponse>(`${this.baseUrl}/history/${deviceId}`, { params })
      );
    } catch (err) {
      console.error('Failed to get device history:', err);
      return null;
    }
  }
}
