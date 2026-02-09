import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { VideoSource } from './video-source.service';

export interface AIBox {
  id: string;
  name: string;
  code: string;
  api_url: string;
  alarm_ws_url: string;
  stream_ws_url: string;
  is_active: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  camera_count: number;
}

export interface AIBoxCreate {
  name: string;
  code: string;
  api_url: string;
  alarm_ws_url: string;
  stream_ws_url: string;
  is_active?: boolean;
}

export interface AIBoxUpdate {
  name?: string;
  code?: string;
  api_url?: string;
  alarm_ws_url?: string;
  stream_ws_url?: string;
  is_active?: boolean;
}

export interface AIBoxStatus {
  id: string;
  name: string;
  code: string;
  is_online: boolean;
  last_seen_at: string | null;
  last_error: string | null;
  latency_ms: number | null;
}

export interface AIBoxHealthResponse {
  total: number;
  online: number;
  offline: number;
  boxes: AIBoxStatus[];
}

export interface SyncCamerasResponse {
  message: string;
  aibox_id: string;
  aibox_name: string;
  imported: number;
  updated: number;
  skipped: number;
  total_from_bmapp: number;
  camera_count: number;
  errors: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class AIBoxService {
  private api = environment.apiUrl;

  // Signals for reactive state
  aiBoxes = signal<AIBox[]>([]);
  selectedAiBox = signal<AIBox | null>(null);
  loading = signal(false);

  constructor(private http: HttpClient) {}

  // Load all AI boxes
  loadAiBoxes(): Observable<AIBox[]> {
    this.loading.set(true);
    return this.http.get<AIBox[]>(`${this.api}/ai-boxes`).pipe(
      tap(boxes => {
        this.aiBoxes.set(boxes);
        this.loading.set(false);
        // Auto-select first active & online box if none selected
        if (!this.selectedAiBox() && boxes.length > 0) {
          const onlineBox = boxes.find(b => b.is_active && b.is_online);
          this.selectedAiBox.set(onlineBox || boxes[0]);
        }
      })
    );
  }

  // Get a single AI box
  getAiBox(id: string): Observable<AIBox> {
    return this.http.get<AIBox>(`${this.api}/ai-boxes/${id}`);
  }

  // Create a new AI box
  createAiBox(data: AIBoxCreate): Observable<AIBox> {
    return this.http.post<AIBox>(`${this.api}/ai-boxes`, data).pipe(
      tap(newBox => {
        this.aiBoxes.update(boxes => [...boxes, newBox]);
      })
    );
  }

  // Update an AI box
  updateAiBox(id: string, data: AIBoxUpdate): Observable<AIBox> {
    return this.http.put<AIBox>(`${this.api}/ai-boxes/${id}`, data).pipe(
      tap(updatedBox => {
        this.aiBoxes.update(boxes =>
          boxes.map(b => b.id === id ? updatedBox : b)
        );
        if (this.selectedAiBox()?.id === id) {
          this.selectedAiBox.set(updatedBox);
        }
      })
    );
  }

  // Delete an AI box
  deleteAiBox(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/ai-boxes/${id}`).pipe(
      tap(() => {
        this.aiBoxes.update(boxes => boxes.filter(b => b.id !== id));
        if (this.selectedAiBox()?.id === id) {
          this.selectedAiBox.set(this.aiBoxes()[0] || null);
        }
      })
    );
  }

  // Test connection to an AI box
  testConnection(id: string): Observable<AIBoxStatus> {
    return this.http.post<AIBoxStatus>(`${this.api}/ai-boxes/${id}/test`, {}).pipe(
      tap(status => {
        // Update the box's online status in the list
        this.aiBoxes.update(boxes =>
          boxes.map(b => b.id === id ? { ...b, is_online: status.is_online, last_seen_at: status.last_seen_at, last_error: status.last_error } : b)
        );
      })
    );
  }

  // Get health status of all AI boxes
  getHealth(): Observable<AIBoxHealthResponse> {
    return this.http.get<AIBoxHealthResponse>(`${this.api}/ai-boxes/health`).pipe(
      tap(health => {
        // Update online status for all boxes
        this.aiBoxes.update(boxes =>
          boxes.map(b => {
            const status = health.boxes.find(s => s.id === b.id);
            return status ? { ...b, is_online: status.is_online, last_seen_at: status.last_seen_at, last_error: status.last_error } : b;
          })
        );
      })
    );
  }

  // Get cameras for an AI box
  getCameras(id: string): Observable<VideoSource[]> {
    return this.http.get<VideoSource[]>(`${this.api}/ai-boxes/${id}/cameras`);
  }

  // Sync cameras from AI box's BM-APP
  syncCameras(id: string): Observable<SyncCamerasResponse> {
    return this.http.post<SyncCamerasResponse>(`${this.api}/ai-boxes/${id}/sync-cameras`, {}).pipe(
      tap(response => {
        // Update camera_count in the list
        this.aiBoxes.update(boxes =>
          boxes.map(b => b.id === id ? { ...b, camera_count: response.camera_count } : b)
        );
      })
    );
  }

  // Select an AI box
  selectAiBox(box: AIBox | null) {
    this.selectedAiBox.set(box);
  }

  // Get WebSocket URL for selected AI box (for video streaming)
  getSelectedStreamWsUrl(): string | null {
    const box = this.selectedAiBox();
    return box ? box.stream_ws_url : null;
  }

  // Get WebSocket URL for selected AI box (for alarms)
  getSelectedAlarmWsUrl(): string | null {
    const box = this.selectedAiBox();
    return box ? box.alarm_ws_url : null;
  }
}
