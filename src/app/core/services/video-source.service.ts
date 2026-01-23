import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VideoSource {
  id: string;
  name: string;
  url: string;
  stream_name: string;
  source_type: 'rtsp' | 'http' | 'file';
  description?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoSourceService {
  private readonly apiUrl = environment.apiUrl;

  private videoSourcesSignal = signal<VideoSource[]>([]);
  private isLoadingSignal = signal(false);

  readonly videoSources = this.videoSourcesSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadVideoSources(isActive?: boolean): Observable<VideoSource[]> {
    this.isLoadingSignal.set(true);
    let url = `${this.apiUrl}/video-sources`;
    if (isActive !== undefined) {
      url += `?is_active=${isActive}`;
    }

    return this.http.get<VideoSource[]>(url).pipe(
      tap(sources => {
        this.videoSourcesSignal.set(sources);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  getActiveVideoSources(): Observable<VideoSource[]> {
    return this.loadVideoSources(true);
  }

  getById(id: string): Observable<VideoSource> {
    return this.http.get<VideoSource>(`${this.apiUrl}/video-sources/${id}`);
  }
}
