import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemPreference {
  id: string;
  aibox_id?: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  value_type: string;
  is_synced_bmapp: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemPreferenceCreate {
  aibox_id?: string;
  key: string;
  value: string;
  description?: string;
  category?: string;
  value_type?: string;
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
export class PreferencesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/preferences`;

  getPreferences(params?: { aibox_id?: string; category?: string; limit?: number; offset?: number }): Observable<SystemPreference[]> {
    return this.http.get<SystemPreference[]>(this.apiUrl, {
      params: this.buildParams(params)
    });
  }

  createPreference(data: SystemPreferenceCreate): Observable<SystemPreference> {
    return this.http.post<SystemPreference>(this.apiUrl, data);
  }

  updatePreference(id: string, data: Partial<SystemPreferenceCreate>): Observable<SystemPreference> {
    return this.http.put<SystemPreference>(`${this.apiUrl}/${id}`, data);
  }

  deletePreference(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  bulkUpdate(aiboxId: string | null, prefs: { key: string; value: string }[]): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.apiUrl}/bulk`, {
      aibox_id: aiboxId,
      preferences: prefs
    });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
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
