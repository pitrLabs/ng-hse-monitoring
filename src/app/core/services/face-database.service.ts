import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FaceAlbum {
  id: string;
  aibox_id?: string;
  bmapp_id?: number;
  name: string;
  feature_count: number;
  is_synced_bmapp: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceFeatureRecord {
  id: string;
  album_id: string;
  aibox_id?: string;
  bmapp_id?: number;
  jpeg_path?: string;
  minio_path?: string;
  name?: string;
  extra_data?: Record<string, any>;
  is_synced_bmapp: boolean;
  created_at: string;
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
export class FaceDatabaseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/face-database`;

  // ============ Albums ============

  getAlbums(params?: { aibox_id?: string; limit?: number; offset?: number }): Observable<FaceAlbum[]> {
    return this.http.get<FaceAlbum[]>(`${this.apiUrl}/albums`, {
      params: this.buildParams(params)
    });
  }

  createAlbum(data: { name: string; aibox_id?: string; bmapp_id?: number }): Observable<FaceAlbum> {
    return this.http.post<FaceAlbum>(`${this.apiUrl}/albums`, data);
  }

  updateAlbum(id: string, data: { name: string }): Observable<FaceAlbum> {
    return this.http.put<FaceAlbum>(`${this.apiUrl}/albums/${id}`, data);
  }

  deleteAlbum(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/albums/${id}`);
  }

  syncAlbumsFromBmapp(aiboxId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.apiUrl}/albums/sync/${aiboxId}`, null);
  }

  // ============ Features ============

  getFeatures(albumId: string, params?: { limit?: number; offset?: number }): Observable<FaceFeatureRecord[]> {
    return this.http.get<FaceFeatureRecord[]>(`${this.apiUrl}/albums/${albumId}/features`, {
      params: this.buildParams(params)
    });
  }

  createFeature(albumId: string, data: Partial<FaceFeatureRecord>): Observable<FaceFeatureRecord> {
    return this.http.post<FaceFeatureRecord>(`${this.apiUrl}/albums/${albumId}/features`, {
      ...data,
      album_id: albumId
    });
  }

  deleteFeature(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/features/${id}`);
  }

  syncFeaturesFromBmapp(aiboxId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.apiUrl}/features/sync/${aiboxId}`, null);
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
