import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PeopleCount,
  ZoneOccupancy,
  ZoneOccupancyAvg,
  StoreCount,
  StayDuration,
  Schedule,
  SensorDevice,
  SensorData,
  AnalyticsSyncResult,
  BmappSchedule,
  BmappSensor,
  SensorDeviceType
} from '../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/analytics`;

  // ============ People Count ============

  getPeopleCount(params?: {
    camera_name?: string;
    task_session?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
    aibox_id?: string;
  }): Observable<PeopleCount[]> {
    return this.http.get<PeopleCount[]>(`${this.apiUrl}/people-count`, {
      params: this.buildParams(params)
    });
  }

  syncPeopleCount(session?: string): Observable<AnalyticsSyncResult> {
    const params = session ? new HttpParams().set('session', session) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/people-count/sync`, null, { params });
  }

  // ============ Zone Occupancy ============

  getZoneOccupancy(params?: {
    camera_name?: string;
    task_session?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
    aibox_id?: string;
  }): Observable<ZoneOccupancy[]> {
    return this.http.get<ZoneOccupancy[]>(`${this.apiUrl}/zone-occupancy`, {
      params: this.buildParams(params)
    });
  }

  syncZoneOccupancy(session?: string): Observable<AnalyticsSyncResult> {
    const params = session ? new HttpParams().set('session', session) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/zone-occupancy/sync`, null, { params });
  }

  // ============ Zone Occupancy Avg ============

  getZoneOccupancyAvg(params?: {
    camera_name?: string;
    limit?: number;
    offset?: number;
  }): Observable<ZoneOccupancyAvg[]> {
    return this.http.get<ZoneOccupancyAvg[]>(`${this.apiUrl}/zone-occupancy-avg`, {
      params: this.buildParams(params)
    });
  }

  syncZoneOccupancyAvg(session?: string): Observable<AnalyticsSyncResult> {
    const params = session ? new HttpParams().set('session', session) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/zone-occupancy-avg/sync`, null, { params });
  }

  // ============ Store Count ============

  getStoreCount(params?: {
    camera_name?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
    aibox_id?: string;
  }): Observable<StoreCount[]> {
    return this.http.get<StoreCount[]>(`${this.apiUrl}/store-count`, {
      params: this.buildParams(params)
    });
  }

  syncStoreCount(session?: string): Observable<AnalyticsSyncResult> {
    const params = session ? new HttpParams().set('session', session) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/store-count/sync`, null, { params });
  }

  // ============ Stay Duration ============

  getStayDuration(params?: {
    camera_name?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<StayDuration[]> {
    return this.http.get<StayDuration[]>(`${this.apiUrl}/stay-duration`, {
      params: this.buildParams(params)
    });
  }

  syncStayDuration(session?: string): Observable<AnalyticsSyncResult> {
    const params = session ? new HttpParams().set('session', session) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/stay-duration/sync`, null, { params });
  }

  // ============ Schedules ============

  getSchedules(params?: {
    task_session?: string;
    limit?: number;
    offset?: number;
  }): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.apiUrl}/schedules`, {
      params: this.buildParams(params)
    });
  }

  getSchedulesBmapp(aiboxId?: string): Observable<{ schedules: BmappSchedule[] }> {
    const params = aiboxId ? this.buildParams({ aibox_id: aiboxId }) : undefined;
    return this.http.get<{ schedules: BmappSchedule[] }>(`${this.apiUrl}/schedules/bmapp`, { params });
  }

  syncSchedules(): Observable<AnalyticsSyncResult> {
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/schedules/sync`, null);
  }

  createSchedule(name: string, summary: string = '', value: string = ''): Observable<{ success: boolean; schedule_id?: number }> {
    const params = new HttpParams()
      .set('name', name)
      .set('summary', summary)
      .set('value', value);
    return this.http.post<{ success: boolean; schedule_id?: number }>(`${this.apiUrl}/schedules/create`, null, { params });
  }

  deleteSchedule(scheduleId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/schedules/${scheduleId}`);
  }

  // ============ Sensor Devices ============

  getSensorDevices(params?: {
    limit?: number;
    offset?: number;
  }): Observable<SensorDevice[]> {
    return this.http.get<SensorDevice[]>(`${this.apiUrl}/sensor-devices`, {
      params: this.buildParams(params)
    });
  }

  getSensorDeviceTypes(): Observable<{ types: SensorDeviceType[] }> {
    return this.http.get<{ types: SensorDeviceType[] }>(`${this.apiUrl}/sensor-devices/types`);
  }

  getSensorsBmapp(aiboxId?: string): Observable<{ sensors: BmappSensor[] }> {
    const params = aiboxId ? this.buildParams({ aibox_id: aiboxId }) : undefined;
    return this.http.get<{ sensors: BmappSensor[] }>(`${this.apiUrl}/sensor-devices/bmapp`, { params });
  }

  syncSensorDevices(): Observable<AnalyticsSyncResult> {
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/sensor-devices/sync`, null);
  }

  createSensor(sensor: {
    name: string;
    sensor_type: number;
    unique?: string;
    protocol?: string;
    extra_params?: any[];
  }): Observable<{ success: boolean }> {
    const params = new HttpParams()
      .set('name', sensor.name)
      .set('sensor_type', String(sensor.sensor_type))
      .set('unique', sensor.unique || sensor.name)
      .set('protocol', sensor.protocol || 'HTTP');
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/sensor-devices/create`, sensor.extra_params || [], { params });
  }

  updateSensor(sensorName: string, sensor: {
    sensor_type: number;
    unique?: string;
    protocol?: string;
    extra_params?: any[];
  }): Observable<{ success: boolean }> {
    const params = new HttpParams()
      .set('sensor_type', String(sensor.sensor_type))
      .set('unique', sensor.unique || sensorName)
      .set('protocol', sensor.protocol || 'HTTP');
    return this.http.put<{ success: boolean }>(`${this.apiUrl}/sensor-devices/${encodeURIComponent(sensorName)}`, sensor.extra_params || [], { params });
  }

  deleteSensor(sensorName: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/sensor-devices/${encodeURIComponent(sensorName)}`);
  }

  cleanSensorData(sensorName: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/sensor-devices/${encodeURIComponent(sensorName)}/clean-data`, null);
  }

  // ============ Sensor Data ============

  getSensorData(params?: {
    sensor_bmapp_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<SensorData[]> {
    return this.http.get<SensorData[]>(`${this.apiUrl}/sensor-data`, {
      params: this.buildParams(params)
    });
  }

  syncSensorData(sensorId?: string): Observable<AnalyticsSyncResult> {
    const params = sensorId ? new HttpParams().set('sensor_id', sensorId) : undefined;
    return this.http.post<AnalyticsSyncResult>(`${this.apiUrl}/sensor-data/sync`, null, { params });
  }

  // ============ Helpers ============

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return httpParams;
  }
}
