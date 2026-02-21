import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PingResult {
  host: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface OnvifDevice {
  ip: string;
  port: number;
  manufacturer?: string;
  model?: string;
  name?: string;
  profiles?: string[];
  extra_data?: Record<string, any>;
}

export interface SystemInfo {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  uptime?: string;
  version?: string;
  extra_data?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class ToolsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tools`;

  ping(aiboxId: string, host: string, count: number = 4): Observable<PingResult> {
    return this.http.post<PingResult>(`${this.apiUrl}/ping/${aiboxId}`, { host, count });
  }

  discoverOnvif(aiboxId: string): Observable<OnvifDevice[]> {
    return this.http.post<OnvifDevice[]>(`${this.apiUrl}/discover-onvif/${aiboxId}`, null);
  }

  getSystemInfo(aiboxId: string): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.apiUrl}/system-info/${aiboxId}`);
  }

  restartService(aiboxId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/restart-service/${aiboxId}`, null);
  }

  factoryReset(aiboxId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-factory/${aiboxId}`, null);
  }

  getLogs(aiboxId: string): Observable<{ logs: string[] }> {
    return this.http.get<{ logs: string[] }>(`${this.apiUrl}/logs/${aiboxId}`);
  }
}
