import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { VideoSource } from './video-source.service';

export interface AIAbility {
  id: number;
  code: number;
  name: string;
  description: string;
  parameters: any[];
}

// New format from backend (database-backed)
export interface AITask {
  id: string; // UUID
  task_name: string;
  video_source_id: string; // UUID
  algorithms: number[] | null;
  description: string | null;
  status: 'pending' | 'running' | 'stopped' | 'failed';
  is_synced_bmapp: boolean;
  bmapp_sync_error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  stopped_at: string | null;
  created_by_id: string | null;
  video_source?: VideoSource;
}

// Legacy format from BM-APP (for comparison/debugging)
export interface BmappTask {
  AlgTaskSession: string;
  MediaName: string;
  TaskDesc: string;
  TaskIdx: number;
  AlgInfo: number[];
  BaseAlgItem: {
    majorId: number;
    minorId: number;
    name: string;
  }[];
  AlgTaskStatus: {
    label: string;
    style: string;
    type: number;
  };
  UserData: {
    MethodConfig: number[];
    [key: string]: any;
  };
}

export interface BmappMedia {
  name: string;
  url: string;
  description: string;
  status: string;
  status_type: number;
  status_style: string;
  resolution: { width?: number; height?: number };
}

export interface AITaskCreate {
  video_source_id: string; // UUID
  task_name?: string; // Optional - auto-generated if not provided
  algorithms: number[];
  description?: string;
  auto_start?: boolean; // Default true
}

export interface AITaskUpdate {
  algorithms?: number[];
  description?: string;
  status?: 'pending' | 'running' | 'stopped' | 'failed';
}

export interface AITaskControl {
  action: 'start' | 'stop' | 'restart';
}

export interface ZLMStream {
  app: string;
  stream: string;
  schema: string;
  vhost: string;
  tracks: any[];
  readers: number;
}

@Injectable({ providedIn: 'root' })
export class AITaskService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get all tasks from database (new format)
  getTasks(): Observable<AITask[]> {
    return this.http.get<AITask[]>(`${this.api}/ai-tasks`);
  }

  // Get a specific task by ID
  getTask(taskId: string): Observable<AITask> {
    return this.http.get<AITask>(`${this.api}/ai-tasks/${taskId}`);
  }

  // Get tasks directly from BM-APP (for comparison/debugging)
  getBmappTasks(): Observable<BmappTask[]> {
    return this.http.get<{ tasks: BmappTask[] }>(`${this.api}/ai-tasks/bmapp`).pipe(
      map(res => res.tasks)
    );
  }

  // Create a new task
  createTask(task: AITaskCreate): Observable<AITask> {
    return this.http.post<AITask>(`${this.api}/ai-tasks`, task);
  }

  // Update a task
  updateTask(taskId: string, update: AITaskUpdate): Observable<AITask> {
    return this.http.put<AITask>(`${this.api}/ai-tasks/${taskId}`, update);
  }

  // Delete a task
  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/ai-tasks/${taskId}`);
  }

  // Start, stop, or restart a task
  controlTask(taskId: string, action: 'start' | 'stop' | 'restart'): Observable<AITask> {
    return this.http.post<AITask>(`${this.api}/ai-tasks/${taskId}/control`, { action });
  }

  // Sync all tasks to BM-APP
  syncToBmapp(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/ai-tasks/sync-bmapp`, {});
  }

  // Import tasks from BM-APP into database
  importFromBmapp(): Observable<{ message: string; imported: number; skipped: number; total_from_bmapp: number; errors: string[] | null }> {
    return this.http.post<{ message: string; imported: number; skipped: number; total_from_bmapp: number; errors: string[] | null }>(`${this.api}/ai-tasks/import-from-bmapp`, {});
  }

  // Get available AI abilities/algorithms
  getAbilities(): Observable<AIAbility[]> {
    return this.http.get<{ abilities: AIAbility[] }>(`${this.api}/ai-tasks/abilities/list`).pipe(
      map(res => res.abilities)
    );
  }

  // Get media from BM-APP
  getMedia(): Observable<BmappMedia[]> {
    return this.http.get<{ media: BmappMedia[] }>(`${this.api}/ai-tasks/media/list`).pipe(
      map(res => res.media)
    );
  }

  // Get available ZLMediaKit streams
  getAvailableStreams(): Observable<ZLMStream[]> {
    return this.http.get<{ streams: ZLMStream[] }>(`${this.api}/ai-tasks/streams/list`).pipe(
      map(res => res.streams)
    );
  }

  // Get preview channels from BM-APP
  getPreviewChannels(): Observable<any> {
    return this.http.get<{ channels: any }>(`${this.api}/ai-tasks/preview/channels`).pipe(
      map(res => res.channels)
    );
  }
}
