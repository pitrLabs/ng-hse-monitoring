import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AlgorithmThreshold {
  id: string;
  aibox_id?: string;
  algorithm_index: number;
  algorithm_name: string;
  threshold_value: number;
  is_synced_bmapp: boolean;
  created_at: string;
  updated_at: string;
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
export class ThresholdsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/thresholds`;

  getThresholds(params?: { aibox_id?: string; limit?: number; offset?: number }): Observable<AlgorithmThreshold[]> {
    return this.http.get<AlgorithmThreshold[]>(this.apiUrl, {
      params: this.buildParams(params)
    });
  }

  createThreshold(data: Partial<AlgorithmThreshold>): Observable<AlgorithmThreshold> {
    return this.http.post<AlgorithmThreshold>(this.apiUrl, data);
  }

  updateThreshold(id: string, data: { threshold_value?: number; algorithm_name?: string }): Observable<AlgorithmThreshold> {
    return this.http.put<AlgorithmThreshold>(`${this.apiUrl}/${id}`, data);
  }

  deleteThreshold(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkUpdate(aiboxId: string, updates: { id: string; threshold_value: number }[]): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.apiUrl}/bulk`, {
      aibox_id: aiboxId,
      updates
    });
  }

  fetchFromBmapp(aiboxId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/bmapp/${aiboxId}`);
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
