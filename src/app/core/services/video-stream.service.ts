import { Injectable, signal, inject } from '@angular/core';
import { AIBoxService } from './aibox.service';

interface StreamSubscription {
  id: string;
  stream: string;           // Full stream ID: "task/AlgTaskSession" or "group/X"
  streamKey: string;        // Normalized key for matching: AlgTaskSession
  mediaName: string;        // MediaName for matching with data.task from BM-APP response
  wsUrl: string;            // Which AI Box WebSocket this subscription belongs to
  callback: (frame: string, task: string) => void;
  // Frame buffering for consistency check
  frameBuffer: { frame: string; task: string }[];
  consecutiveCount: number;  // Count of consecutive frames with same task
}

/**
 * Per-AI Box WebSocket connection with its own cycling logic.
 */
interface BoxConnection {
  wsUrl: string;
  websocket: WebSocket | null;
  isConnected: boolean;
  subscriptions: Map<string, StreamSubscription>; // subscribers on this box
  streamQueue: string[];
  currentStream: string | null;
  cycleTimer: any;
  lastChannelSwitch: number;
  expectedStream: string | null;
  reconnectTimer: any;
}

/**
 * Service to manage BM-APP video WebSocket connections.
 *
 * BM-APP's video WebSocket endpoint (/video/) has a limitation where
 * all connected clients receive the same stream (the last selected channel).
 *
 * This service works around this by:
 * 1. Maintaining ONE WebSocket connection PER AI Box
 * 2. Cycling through requested streams per-box using time-division multiplexing
 * 3. Distributing frames to the correct subscribers based on task name
 */
@Injectable({
  providedIn: 'root'
})
export class VideoStreamService {
  private aiBoxService = inject(AIBoxService);

  // Map of wsUrl -> BoxConnection (one WebSocket per AI Box)
  private connections: Map<string, BoxConnection> = new Map();

  // Global subscription lookup by subscriber ID (for quick unsubscribe)
  private allSubscriptions: Map<string, StreamSubscription> = new Map();

  private cycleInterval = 800; // 800ms per stream (more time for stable frames)
  private settlingPeriod = 200; // 200ms settling after channel switch
  private requiredConsecutiveFrames = 2;  // Need 2 consecutive matching frames

  // Observable for connection status (reflects overall status)
  connectionStatus = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');

  constructor() {}

  /**
   * Extract the task/session key from a stream identifier
   * "task/AlgTaskSession" -> "AlgTaskSession"
   * "group/1" -> "group/1"
   * "AlgTaskSession" -> "AlgTaskSession"
   */
  private extractStreamKey(stream: string): string {
    if (stream.startsWith('task/')) {
      return stream.substring(5).trim();
    }
    return stream.trim();
  }

  /**
   * Resolve WebSocket URL - ensure it ends with /video/
   */
  private resolveWsUrl(wsBaseUrl?: string): string {
    if (wsBaseUrl) {
      let url = wsBaseUrl;
      if (!url.endsWith('/')) url += '/';
      if (!url.endsWith('video/')) url += 'video/';
      return url;
    }

    // Fallback: try selected AI Box, then proxy
    let url = this.aiBoxService.getSelectedStreamWsUrl();
    if (url) {
      if (!url.endsWith('/')) url += '/';
      if (!url.endsWith('video/')) url += 'video/';
      return url;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/bmapp-api/video/`;
  }

  /**
   * Subscribe to a video stream
   * @param id Unique subscriber ID
   * @param stream Stream identifier (e.g., "task/AlgTaskSession")
   * @param callback Function to receive frame data with task name for verification
   * @param mediaName Optional MediaName for matching with data.task from BM-APP
   * @param wsBaseUrl Optional WebSocket base URL for the AI Box this stream belongs to
   */
  subscribe(id: string, stream: string, callback: (frame: string, task: string) => void, mediaName?: string, wsBaseUrl?: string): void {
    const streamKey = this.extractStreamKey(stream);
    const resolvedMediaName = mediaName?.trim() || streamKey;
    const wsUrl = this.resolveWsUrl(wsBaseUrl);

    const sub: StreamSubscription = {
      id,
      stream,
      streamKey,
      mediaName: resolvedMediaName,
      wsUrl,
      callback,
      frameBuffer: [],
      consecutiveCount: 0
    };

    // Remove previous subscription if re-subscribing
    this.unsubscribe(id);

    this.allSubscriptions.set(id, sub);

    // Get or create BoxConnection for this wsUrl
    let box = this.connections.get(wsUrl);
    if (!box) {
      box = this.createBoxConnection(wsUrl);
      this.connections.set(wsUrl, box);
    }

    box.subscriptions.set(id, sub);
    this.updateBoxStreamQueue(box);

    if (!box.isConnected && !box.websocket) {
      this.connectBox(box);
    } else if (box.isConnected) {
      // Restart cycling with updated stream queue
      this.stopBoxCycling(box);
      this.startBoxCycling(box);
    }

    this.updateGlobalStatus();
  }

  /**
   * Unsubscribe from a video stream
   */
  unsubscribe(id: string): void {
    const sub = this.allSubscriptions.get(id);
    if (!sub) return;

    this.allSubscriptions.delete(id);

    const box = this.connections.get(sub.wsUrl);
    if (!box) return;

    box.subscriptions.delete(id);
    this.updateBoxStreamQueue(box);

    // If no more subscriptions for this box, disconnect
    if (box.subscriptions.size === 0) {
      this.stopBoxCycling(box);
      this.disconnectBox(box);
      this.connections.delete(sub.wsUrl);
    }

    this.updateGlobalStatus();
  }

  /**
   * Get the number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.allSubscriptions.size;
  }

  // ========== Per-Box Connection Management ==========

  private createBoxConnection(wsUrl: string): BoxConnection {
    return {
      wsUrl,
      websocket: null,
      isConnected: false,
      subscriptions: new Map(),
      streamQueue: [],
      currentStream: null,
      cycleTimer: null,
      lastChannelSwitch: 0,
      expectedStream: null,
      reconnectTimer: null
    };
  }

  private updateBoxStreamQueue(box: BoxConnection) {
    const uniqueStreams = new Set<string>();
    box.subscriptions.forEach(sub => uniqueStreams.add(sub.stream));
    box.streamQueue = Array.from(uniqueStreams);
  }

  private connectBox(box: BoxConnection) {
    if (box.websocket) return;

    this.updateGlobalStatus();

    try {
      box.websocket = new WebSocket(box.wsUrl);

      box.websocket.onopen = () => {
        box.isConnected = true;
        this.updateGlobalStatus();
        this.startBoxCycling(box);
      };

      box.websocket.onmessage = (event) => {
        this.handleBoxMessage(box, event);
      };

      box.websocket.onclose = () => {
        box.isConnected = false;
        box.websocket = null;
        this.stopBoxCycling(box);
        this.updateGlobalStatus();

        // Reconnect if there are active subscriptions
        if (box.subscriptions.size > 0) {
          box.reconnectTimer = setTimeout(() => {
            box.reconnectTimer = null;
            if (box.subscriptions.size > 0) {
              this.connectBox(box);
            }
          }, 3000);
        }
      };

      box.websocket.onerror = (error) => {
        console.error(`[VideoStreamService] WebSocket error for ${box.wsUrl}:`, error);
      };

    } catch (e) {
      console.error(`[VideoStreamService] Connection error for ${box.wsUrl}:`, e);
      this.updateGlobalStatus();
    }
  }

  private disconnectBox(box: BoxConnection) {
    if (box.reconnectTimer) {
      clearTimeout(box.reconnectTimer);
      box.reconnectTimer = null;
    }
    if (box.websocket) {
      box.websocket.close();
      box.websocket = null;
    }
    box.isConnected = false;
    this.updateGlobalStatus();
  }

  // ========== Per-Box Cycling ==========

  private startBoxCycling(box: BoxConnection) {
    if (box.cycleTimer) return;
    if (box.streamQueue.length === 0) return;

    // If only one stream, just select it and don't cycle
    if (box.streamQueue.length === 1) {
      this.selectBoxStream(box, box.streamQueue[0]);
      return;
    }

    // Multiple streams - start cycling
    let currentIndex = 0;

    const cycle = () => {
      if (box.streamQueue.length === 0) {
        this.stopBoxCycling(box);
        return;
      }

      const stream = box.streamQueue[currentIndex];
      this.selectBoxStream(box, stream);

      currentIndex = (currentIndex + 1) % box.streamQueue.length;
    };

    // Select first stream immediately
    cycle();

    // Then cycle through streams
    box.cycleTimer = setInterval(cycle, this.cycleInterval);
  }

  private stopBoxCycling(box: BoxConnection) {
    if (box.cycleTimer) {
      clearInterval(box.cycleTimer);
      box.cycleTimer = null;
    }
  }

  private selectBoxStream(box: BoxConnection, stream: string) {
    if (!box.websocket || box.websocket.readyState !== WebSocket.OPEN) return;

    box.currentStream = stream;
    box.lastChannelSwitch = Date.now();

    // Find the expected mediaName for this stream
    const sub = Array.from(box.subscriptions.values()).find(s => s.stream === stream);
    box.expectedStream = sub?.mediaName || this.extractStreamKey(stream);

    // Reset consecutive count for ALL subscribers on this box when switching channels
    box.subscriptions.forEach(s => {
      s.consecutiveCount = 0;
    });

    const message = JSON.stringify({ chn: stream });
    box.websocket.send(message);
  }

  // ========== Per-Box Message Handling ==========

  private handleBoxMessage(box: BoxConnection, event: MessageEvent) {
    // Check settling period
    const timeSinceSwitch = Date.now() - box.lastChannelSwitch;
    if (timeSinceSwitch < this.settlingPeriod) {
      return;
    }

    // Handle binary data
    if (event.data instanceof Blob) {
      this.handleBoxBinaryFrame(box, event.data);
      return;
    }

    if (event.data instanceof ArrayBuffer) {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      this.handleBoxBinaryFrame(box, blob);
      return;
    }

    // Handle text/JSON data
    try {
      const data = JSON.parse(event.data);

      if (data.image) {
        const frameUrl = 'data:image/jpeg;base64,' + data.image;
        const frameTask = data.task?.trim();

        if (frameTask) {
          const frameTaskNormalized = frameTask.toLowerCase();

          // Only match against subscribers on THIS box
          box.subscriptions.forEach(sub => {
            const mediaNameNormalized = sub.mediaName.toLowerCase();
            const streamKeyNormalized = sub.streamKey.toLowerCase();

            const isMatch = mediaNameNormalized === frameTaskNormalized || streamKeyNormalized === frameTaskNormalized;

            if (isMatch) {
              sub.consecutiveCount++;

              if (sub.consecutiveCount >= this.requiredConsecutiveFrames) {
                sub.callback(frameUrl, frameTask);
              }
            } else {
              sub.consecutiveCount = 0;
            }
          });
        } else {
          // No task info - only deliver if 1 subscription on this box
          if (box.subscriptions.size === 1) {
            const sub = box.subscriptions.values().next().value;
            if (sub) {
              sub.callback(frameUrl, sub.mediaName);
            }
          }
        }
      }

      if (data.error) {
        console.error(`[VideoStreamService] Stream error on ${box.wsUrl}:`, data.error);
      }

    } catch (e) {
      if (event.data && typeof event.data === 'string' && event.data.length > 100) {
        return;
      }
      console.warn(`[VideoStreamService] Message parse error on ${box.wsUrl}:`, e);
    }
  }

  private handleBoxBinaryFrame(box: BoxConnection, blob: Blob) {
    const timeSinceSwitch = Date.now() - box.lastChannelSwitch;
    if (timeSinceSwitch < this.settlingPeriod) {
      return;
    }

    // Binary frames don't have task info - only safe if 1 subscriber on this box
    if (box.subscriptions.size === 1 && box.streamQueue.length === 1) {
      const frameUrl = URL.createObjectURL(blob);
      const sub = box.subscriptions.values().next().value;
      if (sub) {
        sub.callback(frameUrl, sub.mediaName);
      }
    }
  }

  // ========== Global Status ==========

  private updateGlobalStatus() {
    if (this.connections.size === 0) {
      this.connectionStatus.set('disconnected');
      return;
    }

    let anyConnected = false;
    let anyConnecting = false;

    this.connections.forEach(box => {
      if (box.isConnected) anyConnected = true;
      else if (box.websocket) anyConnecting = true;
    });

    if (anyConnected) {
      this.connectionStatus.set('connected');
    } else if (anyConnecting) {
      this.connectionStatus.set('connecting');
    } else {
      this.connectionStatus.set('disconnected');
    }
  }
}
