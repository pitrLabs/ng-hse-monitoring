import { Injectable, signal } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

interface StreamSubscription {
  id: string;
  stream: string;
  callback: (frame: string) => void;
}

/**
 * Service to manage BM-APP video WebSocket connections.
 *
 * BM-APP's video WebSocket endpoint (/video/) has a limitation where
 * all connected clients receive the same stream (the last selected channel).
 *
 * This service works around this by:
 * 1. Maintaining only ONE active WebSocket connection at a time
 * 2. Cycling through requested streams using time-division multiplexing
 * 3. Distributing frames to the correct subscribers based on task name
 */
@Injectable({
  providedIn: 'root'
})
export class VideoStreamService {
  private websocket: WebSocket | null = null;
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private currentStream: string | null = null;
  private streamQueue: string[] = [];
  private cycleTimer: any = null;
  private cycleInterval = 2000; // 2 seconds per stream
  private isConnected = false;

  // Observable for connection status
  connectionStatus = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');

  constructor() {}

  /**
   * Subscribe to a video stream
   */
  subscribe(id: string, stream: string, callback: (frame: string) => void): void {
    console.log(`[VideoStreamService] Subscribing: ${id} -> ${stream}`);

    this.subscriptions.set(id, { id, stream, callback });
    this.updateStreamQueue();

    if (!this.isConnected) {
      this.connect();
    } else {
      // If already connected, start cycling if needed
      this.startCycling();
    }
  }

  /**
   * Unsubscribe from a video stream
   */
  unsubscribe(id: string): void {
    console.log(`[VideoStreamService] Unsubscribing: ${id}`);
    this.subscriptions.delete(id);
    this.updateStreamQueue();

    if (this.subscriptions.size === 0) {
      this.stopCycling();
      this.disconnect();
    }
  }

  private updateStreamQueue() {
    // Get unique streams from subscriptions
    const uniqueStreams = new Set<string>();
    this.subscriptions.forEach(sub => uniqueStreams.add(sub.stream));
    this.streamQueue = Array.from(uniqueStreams);
    console.log(`[VideoStreamService] Stream queue updated:`, this.streamQueue);
  }

  private connect() {
    if (this.websocket) return;

    this.connectionStatus.set('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/bmapp-api/video/`;

    console.log(`[VideoStreamService] Connecting to: ${wsUrl}`);

    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('[VideoStreamService] WebSocket connected');
        this.isConnected = true;
        this.connectionStatus.set('connected');
        this.startCycling();
      };

      this.websocket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.websocket.onclose = () => {
        console.log('[VideoStreamService] WebSocket closed');
        this.isConnected = false;
        this.connectionStatus.set('disconnected');
        this.websocket = null;
        this.stopCycling();

        // Reconnect if there are active subscriptions
        if (this.subscriptions.size > 0) {
          setTimeout(() => this.connect(), 3000);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('[VideoStreamService] WebSocket error:', error);
      };

    } catch (e) {
      console.error('[VideoStreamService] Connection error:', e);
      this.connectionStatus.set('disconnected');
    }
  }

  private disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
    this.connectionStatus.set('disconnected');
  }

  private startCycling() {
    if (this.cycleTimer) return;
    if (this.streamQueue.length === 0) return;

    // If only one stream, just select it and don't cycle
    if (this.streamQueue.length === 1) {
      this.selectStream(this.streamQueue[0]);
      return;
    }

    // Multiple streams - start cycling
    console.log(`[VideoStreamService] Starting stream cycling with ${this.streamQueue.length} streams`);
    let currentIndex = 0;

    const cycle = () => {
      if (this.streamQueue.length === 0) {
        this.stopCycling();
        return;
      }

      const stream = this.streamQueue[currentIndex];
      this.selectStream(stream);

      currentIndex = (currentIndex + 1) % this.streamQueue.length;
    };

    // Select first stream immediately
    cycle();

    // Then cycle through streams
    this.cycleTimer = setInterval(cycle, this.cycleInterval);
  }

  private stopCycling() {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  private selectStream(stream: string) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // BM-APP expects just the channel identifier (TaskIdx number or "group/X")
    // Don't prepend "task/" - the stream value should already be in the correct format
    this.currentStream = stream;

    const message = JSON.stringify({ chn: stream });
    console.log(`[VideoStreamService] Selecting stream:`, {
      stream: stream,
      message: message
    });
    this.websocket.send(message);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.image) {
        // BM-APP sends frames for the currently selected channel
        // Since we're cycling through channels, we need to match frames to the
        // subscriber who requested the current stream
        const frameUrl = 'data:image/jpeg;base64,' + data.image;

        // data.task contains the task NAME (e.g., "BWC SALATIGA 1")
        // But we subscribe by TaskIdx (e.g., "7")
        // Since BM-APP only sends one stream at a time based on current selection,
        // we distribute to subscribers who match the CURRENT stream being requested
        if (this.currentStream) {
          this.subscriptions.forEach(sub => {
            if (sub.stream === this.currentStream) {
              sub.callback(frameUrl);
            }
          });
        }
      }

      if (data.error) {
        console.error('[VideoStreamService] Stream error:', data.error);
      }

    } catch (e) {
      console.error('[VideoStreamService] Message parse error:', e);
    }
  }

  /**
   * Get the number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
