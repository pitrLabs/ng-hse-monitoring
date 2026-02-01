import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Recording,
  RecordingFilter,
  CalendarDay,
  VideoUrlResponse
} from '../models/recording.model';

@Injectable({
  providedIn: 'root'
})
export class RecordingService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Signals
  private _recordings = signal<Recording[]>([]);
  private _calendarData = signal<CalendarDay[]>([]);
  private _isLoading = signal(false);
  private _selectedRecording = signal<Recording | null>(null);

  // Public readonly signals
  readonly recordings = this._recordings.asReadonly();
  readonly calendarData = this._calendarData.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly selectedRecording = this._selectedRecording.asReadonly();

  /**
   * Load recordings with optional filters
   */
  loadRecordings(params?: RecordingFilter & { skip?: number; limit?: number }): Observable<Recording[]> {
    this._isLoading.set(true);

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<Recording[]>(`${this.apiUrl}/recordings`, { params: httpParams }).pipe(
      tap(recordings => {
        this._recordings.set(recordings);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        console.error('[RecordingService] Failed to load recordings:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Load calendar data for a specific month
   */
  loadCalendar(year: number, month: number, cameraId?: string): Observable<CalendarDay[]> {
    let httpParams = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    if (cameraId) {
      httpParams = httpParams.set('camera_id', cameraId);
    }

    return this.http.get<CalendarDay[]>(`${this.apiUrl}/recordings/calendar`, { params: httpParams }).pipe(
      tap(data => {
        this._calendarData.set(data);
      }),
      catchError(error => {
        console.error('[RecordingService] Failed to load calendar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Load recordings for a specific date
   */
  loadRecordingsByDate(date: string, cameraId?: string): Observable<Recording[]> {
    this._isLoading.set(true);

    let httpParams = new HttpParams().set('date', date);
    if (cameraId) {
      httpParams = httpParams.set('camera_id', cameraId);
    }

    return this.http.get<Recording[]>(`${this.apiUrl}/recordings/by-date`, { params: httpParams }).pipe(
      tap(recordings => {
        this._recordings.set(recordings);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        console.error('[RecordingService] Failed to load recordings by date:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get recordings for a specific alarm
   */
  getRecordingsByAlarm(alarmId: string): Observable<Recording[]> {
    return this.http.get<Recording[]>(`${this.apiUrl}/recordings/by-alarm/${alarmId}`).pipe(
      catchError(error => {
        console.error('[RecordingService] Failed to load recordings by alarm:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single recording by ID
   */
  getRecording(recordingId: string): Observable<Recording> {
    return this.http.get<Recording>(`${this.apiUrl}/recordings/${recordingId}`).pipe(
      tap(recording => {
        this._selectedRecording.set(recording);
      }),
      catchError(error => {
        console.error('[RecordingService] Failed to get recording:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get video URL for playback
   */
  getVideoUrl(recordingId: string): Observable<VideoUrlResponse> {
    return this.http.get<VideoUrlResponse>(`${this.apiUrl}/recordings/video-url/${recordingId}`).pipe(
      catchError(error => {
        console.error('[RecordingService] Failed to get video URL:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get the stream URL for a recording (proxy endpoint)
   */
  getStreamUrl(recordingId: string): string {
    return `${this.apiUrl}/recordings/stream/${recordingId}`;
  }

  /**
   * Sync recordings from alarms
   */
  syncFromAlarms(): Observable<any> {
    return this.http.post(`${this.apiUrl}/recordings/sync-from-alarms`, {}).pipe(
      catchError(error => {
        console.error('[RecordingService] Failed to sync recordings:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set the selected recording
   */
  selectRecording(recording: Recording | null): void {
    this._selectedRecording.set(recording);
  }

  /**
   * Clear recordings
   */
  clearRecordings(): void {
    this._recordings.set([]);
    this._selectedRecording.set(null);
  }
}
