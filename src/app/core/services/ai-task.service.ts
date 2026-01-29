import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AIAbility {
  id: number;
  code: number;
  name: string;
  description: string;
  parameters: any[];
}

export interface AITask {
  AlgTaskSession: string;
  MediaName: string;
  TaskDesc: string;
  TaskIdx: number;  // Task index for WebSocket video streaming (individual camera)
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
  task_name: string;
  media_name: string;
  algorithms: number[];
  description?: string;
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

  getTasks(): Observable<AITask[]> {
    return this.http.get<{ tasks: AITask[] }>(`${this.api}/ai-tasks`).pipe(
      map(res => res.tasks)
    );
  }

  getAbilities(): Observable<AIAbility[]> {
    return this.http.get<{ abilities: AIAbility[] }>(`${this.api}/ai-tasks/abilities`).pipe(
      map(res => res.abilities)
    );
  }

  getMedia(): Observable<BmappMedia[]> {
    return this.http.get<{ media: BmappMedia[] }>(`${this.api}/ai-tasks/media`).pipe(
      map(res => res.media)
    );
  }

  createTask(task: AITaskCreate): Observable<any> {
    return this.http.post(`${this.api}/ai-tasks`, task);
  }

  deleteTask(taskName: string): Observable<any> {
    return this.http.delete(`${this.api}/ai-tasks/${encodeURIComponent(taskName)}`);
  }

  controlTask(taskName: string, action: 'start' | 'stop'): Observable<any> {
    return this.http.post(`${this.api}/ai-tasks/${encodeURIComponent(taskName)}/control`, { action });
  }

  getAvailableStreams(): Observable<ZLMStream[]> {
    return this.http.get<{ streams: ZLMStream[] }>(`${this.api}/ai-tasks/streams`).pipe(
      map(res => res.streams)
    );
  }

  getPreviewChannels(): Observable<any> {
    return this.http.get<{ channels: any }>(`${this.api}/ai-tasks/preview-channels`).pipe(
      map(res => res.channels)
    );
  }
}
