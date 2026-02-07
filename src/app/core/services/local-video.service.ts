import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LocalVideo {
  id: string;
  name: string;
  description?: string;
  original_filename: string;
  minio_path: string;
  thumbnail_path?: string;
  file_size: number;
  duration?: number;
  resolution?: string;
  format?: string;
  status: 'processing' | 'ready' | 'error';
  error_message?: string;
  uploaded_by_id?: string;
  created_at: string;
  updated_at: string;
  stream_url?: string;
  thumbnail_url?: string;
}

export interface LocalVideoStats {
  total_videos: number;
  total_size: number;
  total_size_formatted: string;
  by_status: Record<string, number>;
  by_format: Record<string, number>;
}

export interface UploadInitResponse {
  video_id: string;
  upload_url: string;
  minio_path: string;
  expires_in: number;
}

export interface StorageHealth {
  status: string;
  endpoint?: string;
  buckets?: string[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalVideoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Signals
  private _videos = signal<LocalVideo[]>([]);
  private _stats = signal<LocalVideoStats | null>(null);
  private _loading = signal<boolean>(false);
  private _uploading = signal<boolean>(false);
  private _uploadProgress = signal<number>(0);
  private _storageHealth = signal<StorageHealth | null>(null);

  // Public readonly signals
  readonly videos = this._videos.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly uploading = this._uploading.asReadonly();
  readonly uploadProgress = this._uploadProgress.asReadonly();
  readonly storageHealth = this._storageHealth.asReadonly();

  // ============ Video CRUD ============

  loadVideos(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    format?: string;
    search?: string;
  }): void {
    this._loading.set(true);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    this.http.get<LocalVideo[]>(`${this.apiUrl}/local-videos`, { params: httpParams }).subscribe({
      next: (videos) => {
        this._videos.set(videos);
        this._loading.set(false);
      },
      error: (err) => {
        console.error('[LocalVideoService] Failed to load videos:', err);
        this._loading.set(false);
      }
    });
  }

  getVideo(id: string): Promise<LocalVideo> {
    return new Promise((resolve, reject) => {
      this.http.get<LocalVideo>(`${this.apiUrl}/local-videos/${id}`).subscribe({
        next: resolve,
        error: reject
      });
    });
  }

  updateVideo(id: string, data: Partial<LocalVideo>): Promise<LocalVideo> {
    return new Promise((resolve, reject) => {
      this.http.put<LocalVideo>(`${this.apiUrl}/local-videos/${id}`, data).subscribe({
        next: (video) => {
          this._videos.update(videos =>
            videos.map(v => v.id === id ? video : v)
          );
          resolve(video);
        },
        error: reject
      });
    });
  }

  deleteVideo(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/local-videos/${id}`).subscribe({
        next: () => {
          this._videos.update(videos => videos.filter(v => v.id !== id));
          resolve();
        },
        error: reject
      });
    });
  }

  // ============ Upload Methods ============

  /**
   * Upload a video file using presigned URL flow for large files
   * or direct upload for smaller files.
   */
  async uploadVideo(
    file: File,
    name: string,
    description?: string
  ): Promise<LocalVideo> {
    this._uploading.set(true);
    this._uploadProgress.set(0);

    const MAX_DIRECT_SIZE = 50 * 1024 * 1024; // 50MB

    try {
      let video: LocalVideo;

      if (file.size <= MAX_DIRECT_SIZE) {
        // Direct upload for smaller files
        video = await this.directUpload(file, name, description);
      } else {
        // Presigned URL upload for larger files
        video = await this.presignedUpload(file, name, description);
      }

      // Add to videos list
      this._videos.update(videos => [video, ...videos]);
      this._uploading.set(false);
      this._uploadProgress.set(100);

      return video;

    } catch (error) {
      this._uploading.set(false);
      this._uploadProgress.set(0);
      throw error;
    }
  }

  private async directUpload(
    file: File,
    name: string,
    description?: string
  ): Promise<LocalVideo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    return new Promise((resolve, reject) => {
      this.http.post<LocalVideo>(
        `${this.apiUrl}/local-videos/upload`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      ).subscribe({
        next: (event: HttpEvent<LocalVideo>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            this._uploadProgress.set(progress);
          } else if (event.type === HttpEventType.Response && event.body) {
            resolve(event.body);
          }
        },
        error: reject
      });
    });
  }

  private async presignedUpload(
    file: File,
    name: string,
    description?: string
  ): Promise<LocalVideo> {
    // Step 1: Initialize upload and get presigned URL
    const initResponse = await this.initUpload({
      filename: file.name,
      name,
      description,
      file_size: file.size,
      content_type: file.type || 'video/mp4'
    });

    // Step 2: Upload directly to MinIO using presigned URL
    await this.uploadToPresignedUrl(initResponse.upload_url, file);

    // Step 3: Mark upload as complete
    const video = await this.completeUpload({
      video_id: initResponse.video_id,
      format: this.getFileExtension(file.name).toUpperCase()
    });

    return video;
  }

  private initUpload(data: {
    filename: string;
    name: string;
    description?: string;
    file_size: number;
    content_type: string;
  }): Promise<UploadInitResponse> {
    return new Promise((resolve, reject) => {
      this.http.post<UploadInitResponse>(
        `${this.apiUrl}/local-videos/upload/init`,
        data
      ).subscribe({
        next: resolve,
        error: reject
      });
    });
  }

  private async uploadToPresignedUrl(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round(100 * event.loaded / event.total);
          this._uploadProgress.set(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));

      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
    });
  }

  private completeUpload(data: {
    video_id: string;
    duration?: number;
    resolution?: string;
    format?: string;
  }): Promise<LocalVideo> {
    return new Promise((resolve, reject) => {
      this.http.post<LocalVideo>(
        `${this.apiUrl}/local-videos/upload/complete`,
        data
      ).subscribe({
        next: resolve,
        error: reject
      });
    });
  }

  // ============ Stream URL ============

  getStreamUrl(id: string): Promise<{ video_id: string; stream_url: string; expires_in: number }> {
    return new Promise((resolve, reject) => {
      this.http.get<{ video_id: string; stream_url: string; expires_in: number }>(
        `${this.apiUrl}/local-videos/${id}/stream-url`
      ).subscribe({
        next: resolve,
        error: reject
      });
    });
  }

  // ============ Statistics ============

  loadStats(): void {
    this.http.get<LocalVideoStats>(`${this.apiUrl}/local-videos/stats/summary`).subscribe({
      next: (stats) => this._stats.set(stats),
      error: (err) => console.error('[LocalVideoService] Failed to load stats:', err)
    });
  }

  // ============ Storage Health ============

  checkStorageHealth(): void {
    this.http.get<StorageHealth>(`${this.apiUrl}/storage/health`).subscribe({
      next: (health) => this._storageHealth.set(health),
      error: (err) => {
        console.error('[LocalVideoService] Failed to check storage health:', err);
        this._storageHealth.set({ status: 'error', message: 'Failed to check storage health' });
      }
    });
  }

  // ============ Helpers ============

  private getFileExtension(filename: string): string {
    if (!filename || !filename.includes('.')) return 'mp4';
    return filename.split('.').pop()?.toLowerCase() || 'mp4';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds: number | undefined): string {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  }
}
