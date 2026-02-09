import { Injectable, signal, inject } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { AIBoxService } from './aibox.service';

interface StreamSubscription {
  id: string;
  stream: string;           // Full stream ID: "task/AlgTaskSession" or "group/X"
  streamKey: string;        // Normalized key for matching: AlgTaskSession
  mediaName: string;        // MediaName for matching with data.task from BM-APP response
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
  private aiBoxService = inject(AIBoxService);
  private websocket: WebSocket | null = null;
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private currentStream: string | null = null;
  private streamQueue: string[] = [];
  private cycleTimer: any = null;
  private cycleInterval = 800; // 800ms per stream (balance between smoothness and stability)
  private isConnected = false;

  // Channel switch settling - ignore frames briefly after switching to avoid stale frames
  private lastChannelSwitch = 0;
  private settlingPeriod = 250; // 250ms settling (longer to avoid stale frames from previous channel)

  // Track which stream we're currently expecting frames from
  private expectedStream: string | null = null;

  // Observable for connection status
  connectionStatus = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');

  constructor() {}

  /**
   * Extract the task/session key from a stream identifier
   * "task/AlgTaskSession" -> "AlgTaskSession"
   * "group/1" -> "group/1"
   * "AlgTaskSession" -> "AlgTaskSession"
   */
  private extractStreamKey(stream: string): string {
    // Remove "task/" prefix if present to get the actual session name
    if (stream.startsWith('task/')) {
      return stream.substring(5).trim();
    }
    return stream.trim();
  }

  /**
   * Subscribe to a video stream
   * @param id Unique subscriber ID
   * @param stream Stream identifier (e.g., "task/AlgTaskSession")
   * @param callback Function to receive frame data
   * @param mediaName Optional MediaName for matching with data.task from BM-APP
   */
  subscribe(id: string, stream: string, callback: (frame: string) => void, mediaName?: string): void {
    const streamKey = this.extractStreamKey(stream);
    const resolvedMediaName = mediaName?.trim() || streamKey;
    console.log(`[VideoStreamService] Subscribing: ${id} -> ${stream} (streamKey: ${streamKey}, mediaName: ${resolvedMediaName})`);

    this.subscriptions.set(id, { id, stream, streamKey, mediaName: resolvedMediaName, callback });
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

    // Get WebSocket URL from selected AI Box
    let wsUrl = this.aiBoxService.getSelectedStreamWsUrl();
    if (wsUrl) {
      // Ensure URL ends with /video/ path
      if (!wsUrl.endsWith('/')) wsUrl += '/';
      if (!wsUrl.endsWith('video/')) wsUrl += 'video/';
    } else {
      // Fallback to proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/bmapp-api/video/`;
    }

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
    this.lastChannelSwitch = Date.now(); // Record switch time for settling

    // Find the expected mediaName for this stream so we can validate incoming frames
    const sub = Array.from(this.subscriptions.values()).find(s => s.stream === stream);
    this.expectedStream = sub?.mediaName || this.extractStreamKey(stream);

    const message = JSON.stringify({ chn: stream });
    this.websocket.send(message);
  }

  private handleMessage(event: MessageEvent) {
    // Check settling period - ignore frames briefly after channel switch
    const timeSinceSwitch = Date.now() - this.lastChannelSwitch;
    if (timeSinceSwitch < this.settlingPeriod) {
      // Still settling after channel switch, ignore frame to avoid stale data
      return;
    }

    // Handle binary data (Blob or ArrayBuffer)
    if (event.data instanceof Blob) {
      this.handleBinaryFrame(event.data);
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      this.handleBinaryFrame(blob);
      return;
    }

    // Handle text/JSON data
    try {
      const data = JSON.parse(event.data);

      if (data.image) {
        const frameUrl = 'data:image/jpeg;base64,' + data.image;

        // IMPORTANT: Use data.task from server response to identify which stream
        // this frame actually belongs to, NOT this.currentStream
        // This prevents frames from wrong streams being delivered during channel switching
        const frameTask = data.task?.trim();

        if (frameTask) {
          // Normalize the frame task for matching (lowercase, trim whitespace)
          // BM-APP returns data.task = MediaName (e.g., "KOPER02", "BWC SALATIGA 1")
          const frameTaskNormalized = frameTask.toLowerCase();

          // STRICT VALIDATION: Only accept frames that match what we're currently expecting
          // This prevents frames from other channels (selected by other clients) from being delivered
          if (this.expectedStream) {
            const expectedNormalized = this.expectedStream.toLowerCase();
            if (frameTaskNormalized !== expectedNormalized) {
              // Frame is from a different channel than what we selected - discard silently
              // This happens because BM-APP broadcasts the same stream to all clients
              return;
            }
          }

          // Match frame to subscribers based on mediaName (which matches data.task from BM-APP)
          let delivered = false;
          this.subscriptions.forEach(sub => {
            const mediaNameNormalized = sub.mediaName.toLowerCase();
            const streamKeyNormalized = sub.streamKey.toLowerCase();

            // Match by mediaName (primary) or streamKey (fallback)
            // BM-APP data.task is MediaName, so mediaName should match
            if (mediaNameNormalized === frameTaskNormalized || streamKeyNormalized === frameTaskNormalized) {
              sub.callback(frameUrl);
              delivered = true;
            }
          });

          if (!delivered && this.subscriptions.size > 0) {
            // This shouldn't happen often now with strict validation above
            // Log for debugging if it does
            const subInfo = Array.from(this.subscriptions.values()).map(s => ({
              mediaName: s.mediaName,
              streamKey: s.streamKey
            }));
            console.warn(`[VideoStreamService] Frame not delivered - task "${frameTask}" doesn't match any subscriber:`, subInfo);
          }
        } else {
          // No task info in response - this is problematic for multi-stream
          // Only deliver if we have exactly 1 subscription (no ambiguity)
          if (this.subscriptions.size === 1) {
            const sub = this.subscriptions.values().next().value;
            if (sub) {
              sub.callback(frameUrl);
            }
          }
          // Don't log warning - just silently discard
        }
      }

      if (data.error) {
        console.error('[VideoStreamService] Stream error:', data.error);
      }

    } catch (e) {
      // If JSON parse fails, the data might be raw binary sent as string
      // This happens when server sends binary data without proper framing
      // Just silently ignore these malformed messages
      if (event.data && typeof event.data === 'string' && event.data.length > 100) {
        // Likely a corrupted/partial message, skip logging to avoid console spam
        return;
      }
      console.warn('[VideoStreamService] Message parse error:', e);
    }
  }

  private handleBinaryFrame(blob: Blob) {
    // Check settling period
    const timeSinceSwitch = Date.now() - this.lastChannelSwitch;
    if (timeSinceSwitch < this.settlingPeriod) {
      return; // Still settling, ignore frame
    }

    // Binary frames don't have task info - only safe to deliver if 1 subscriber
    // AND we're not in cycling mode (multiple streams would cause ambiguity)
    if (this.subscriptions.size === 1 && this.streamQueue.length === 1) {
      const frameUrl = URL.createObjectURL(blob);
      const sub = this.subscriptions.values().next().value;
      if (sub) {
        sub.callback(frameUrl);
      }
    }
    // For multiple subscribers, silently discard binary frames to prevent wrong delivery
  }

  /**
   * Get the number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
