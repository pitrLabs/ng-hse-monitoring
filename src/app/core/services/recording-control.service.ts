import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ActiveRecording {
  id: string;
  stream_id: string;
  camera_name: string;
  started_by: string;
  started_by_name: string;
  start_time: string;
  status: string;
}

interface ActiveRecordingStatus {
  is_recording: boolean;
  recording_id?: string;
  started_by?: string;
  start_time?: string;
  elapsed_seconds?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecordingControlService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Track which streams are recording locally
  private _recordingStreams = signal<Map<string, ActiveRecording>>(new Map());
  readonly recordingStreams = this._recordingStreams.asReadonly();

  // Check if a stream is recording
  isRecording(streamId: string): boolean {
    return this._recordingStreams().has(streamId);
  }

  // Get recording info for a stream
  getRecordingInfo(streamId: string): ActiveRecording | undefined {
    return this._recordingStreams().get(streamId);
  }

  // Start recording a stream
  async startRecording(streamId: string, cameraName: string): Promise<void> {
    const params = new URLSearchParams({
      stream_id: streamId,
      camera_name: cameraName
    });

    try {
      const response = await this.http.post<any>(
        `${this.apiUrl}/recordings/start?${params.toString()}`,
        {}
      ).toPromise();

      // Update local state
      this._recordingStreams.update(map => {
        const newMap = new Map(map);
        newMap.set(streamId, {
          id: response.recording_id,
          stream_id: streamId,
          camera_name: cameraName,
          started_by: '',
          started_by_name: 'You',
          start_time: response.start_time,
          status: 'recording'
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  // Stop recording a stream
  async stopRecording(streamId: string): Promise<void> {
    const params = new URLSearchParams({
      stream_id: streamId
    });

    try {
      await this.http.post<any>(
        `${this.apiUrl}/recordings/stop?${params.toString()}`,
        {}
      ).toPromise();

      // Update local state
      this._recordingStreams.update(map => {
        const newMap = new Map(map);
        newMap.delete(streamId);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  // Load all active recordings from server
  async loadActiveRecordings(): Promise<void> {
    try {
      const response = await this.http.get<{
        active_recordings: ActiveRecording[];
        count: number;
      }>(`${this.apiUrl}/recordings/active`).toPromise();

      const map = new Map<string, ActiveRecording>();
      for (const rec of response?.active_recordings || []) {
        map.set(rec.stream_id, rec);
      }
      this._recordingStreams.set(map);
    } catch (error) {
      console.error('Failed to load active recordings:', error);
    }
  }

  // Check if a specific stream is recording
  async checkRecordingStatus(streamId: string): Promise<ActiveRecordingStatus> {
    try {
      const response = await this.http.get<ActiveRecordingStatus>(
        `${this.apiUrl}/recordings/active/${encodeURIComponent(streamId)}`
      ).toPromise();
      return response || { is_recording: false };
    } catch (error) {
      return { is_recording: false };
    }
  }

  // Get elapsed time for a recording
  getElapsedTime(streamId: string): string {
    const info = this._recordingStreams().get(streamId);
    if (!info) return '00:00';

    const startTime = new Date(info.start_time);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
