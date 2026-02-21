import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ModbusDevice {
  id: string;
  aibox_id?: string;
  bmapp_id?: number;
  description: string;
  alarm_url?: string;
  port: number;
  poll_interval: number;
  device_path?: string;
  slave_addr: number;
  start_reg_addr: number;
  end_reg_addr: number;
  start_data: number;
  end_data: number;
  device_type: number;
  is_active: boolean;
  is_synced_bmapp: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModbusDeviceCreate {
  aibox_id?: string;
  description: string;
  alarm_url?: string;
  port?: number;
  poll_interval?: number;
  device_path?: string;
  slave_addr?: number;
  start_reg_addr?: number;
  end_reg_addr?: number;
  start_data?: number;
  end_data?: number;
  device_type?: number;
  is_active?: boolean;
}

export interface SyncResult {
  success: boolean;
  synced_count: number;
  message: string;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ModbusService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/modbus`;

  getDevices(params?: { aibox_id?: string; limit?: number; offset?: number }): Observable<ModbusDevice[]> {
    return this.http.get<ModbusDevice[]>(this.apiUrl, {
      params: this.buildParams(params)
    });
  }

  createDevice(data: ModbusDeviceCreate): Observable<ModbusDevice> {
    return this.http.post<ModbusDevice>(this.apiUrl, data);
  }

  updateDevice(id: string, data: Partial<ModbusDeviceCreate>): Observable<ModbusDevice> {
    return this.http.put<ModbusDevice>(`${this.apiUrl}/${id}`, data);
  }

  deleteDevice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleDevice(id: string): Observable<ModbusDevice> {
    return this.http.patch<ModbusDevice>(`${this.apiUrl}/${id}/toggle`, null);
  }

  syncFromBmapp(aiboxId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.apiUrl}/sync/${aiboxId}`, null);
  }

  applyToBmapp(aiboxId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.apiUrl}/apply/${aiboxId}`, null);
  }

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
