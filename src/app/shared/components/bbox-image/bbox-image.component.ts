import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Bounding box data structure from BM-APP raw_data
 * RelativeBox: [x, y, width, height] - all values 0-1 relative to image dimensions
 */
export interface BoundingBox {
  x: number;      // Left edge (0-1)
  y: number;      // Top edge (0-1)
  width: number;  // Width (0-1)
  height: number; // Height (0-1)
  label?: string; // Detection label (e.g., "No Helmet")
  confidence?: number; // Detection confidence (0-1)
  color?: string; // Box color (default: red)
}

/**
 * BboxImageComponent - Renders images with AI detection bounding boxes overlay
 *
 * Usage:
 * <app-bbox-image
 *   [src]="imageUrl"
 *   [rawData]="alarm.raw_data"
 *   [alt]="'Alarm image'"
 *   [showLabels]="true">
 * </app-bbox-image>
 */
@Component({
  selector: 'app-bbox-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bbox-container" [class.loading]="loading()">
      <img
        [src]="src"
        [alt]="alt"
        (load)="onImageLoad($event)"
        (error)="onImageError($event)"
        class="bbox-image"
        [style.display]="loading() ? 'none' : 'block'"
      >

      @if (!loading() && !error()) {
        @for (box of boxes(); track $index) {
          <div
            class="bbox-overlay"
            [style.left.%]="box.x * 100"
            [style.top.%]="box.y * 100"
            [style.width.%]="box.width * 100"
            [style.height.%]="box.height * 100"
            [style.borderColor]="box.color || '#ef4444'"
          >
            @if (showLabels && box.label) {
              <span
                class="bbox-label"
                [style.backgroundColor]="box.color || '#ef4444'"
              >
                {{ box.label }}
                @if (box.confidence) {
                  <span class="confidence">{{ (box.confidence * 100).toFixed(0) }}%</span>
                }
              </span>
            }
          </div>
        }
      }

      @if (loading()) {
        <div class="loading-placeholder">
          <div class="spinner"></div>
        </div>
      }

      @if (error()) {
        <div class="error-placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <span>Failed to load image</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .bbox-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: var(--bg-tertiary, #1a1b1f);
      overflow: hidden;
    }

    .bbox-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .bbox-overlay {
      position: absolute;
      border: 2px solid #ef4444;
      box-sizing: border-box;
      pointer-events: none;
    }

    .bbox-label {
      position: absolute;
      top: -1px;
      left: -1px;
      transform: translateY(-100%);
      padding: 2px 6px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      border-radius: 2px 2px 0 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .confidence {
      opacity: 0.8;
      font-weight: 400;
    }

    .loading-placeholder,
    .error-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-muted, #666);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--glass-border, #333);
      border-top-color: var(--accent-primary, #00d4ff);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-placeholder svg {
      width: 40px;
      height: 40px;
      opacity: 0.5;
    }

    .error-placeholder span {
      font-size: 12px;
    }
  `]
})
export class BboxImageComponent implements OnChanges {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() rawData: any = null;
  @Input() showLabels: boolean = true;

  loading = signal(true);
  error = signal(false);
  boxes = signal<BoundingBox[]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rawData']) {
      this.parseRawData();
    }
    if (changes['src']) {
      this.loading.set(true);
      this.error.set(false);
    }
  }

  onImageLoad(event: Event) {
    this.loading.set(false);
    this.error.set(false);
  }

  onImageError(event: Event) {
    this.loading.set(false);
    this.error.set(true);
  }

  /**
   * Parse raw_data from BM-APP to extract bounding box information
   *
   * BM-APP raw_data structure:
   * {
   *   "Result": {
   *     "RegType": "Rectangle",
   *     "RelativeBox": [x, y, width, height],  // 0-1 relative values
   *     "Description": "No Helmet"
   *   },
   *   "RecognitionInfo": {  // Alternative location
   *     "RegType": "Rectangle",
   *     "RelativeBox": [x, y, width, height],
   *     "Description": "..."
   *   },
   *   "Items": [  // Multiple detections
   *     { "RelativeBox": [...], "Description": "..." }
   *   ]
   * }
   */
  private parseRawData() {
    if (!this.rawData) {
      this.boxes.set([]);
      return;
    }

    const detectedBoxes: BoundingBox[] = [];
    let data = this.rawData;

    // If rawData is a string, try to parse it
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        this.boxes.set([]);
        return;
      }
    }

    // Extract from Result object
    if (data.Result?.RelativeBox) {
      const box = this.parseRelativeBox(data.Result);
      if (box) detectedBoxes.push(box);
    }

    // Extract from RecognitionInfo object
    if (data.RecognitionInfo?.RelativeBox) {
      const box = this.parseRelativeBox(data.RecognitionInfo);
      if (box) detectedBoxes.push(box);
    }

    // Extract from Items array (multiple detections)
    if (Array.isArray(data.Items)) {
      for (const item of data.Items) {
        if (item.RelativeBox) {
          const box = this.parseRelativeBox(item);
          if (box) detectedBoxes.push(box);
        }
      }
    }

    // Extract from Objects array (alternative structure)
    if (Array.isArray(data.Objects)) {
      for (const obj of data.Objects) {
        if (obj.RelativeBox) {
          const box = this.parseRelativeBox(obj);
          if (box) detectedBoxes.push(box);
        }
      }
    }

    // Extract from nested AlarmInfo
    if (data.AlarmInfo?.Result?.RelativeBox) {
      const box = this.parseRelativeBox(data.AlarmInfo.Result);
      if (box) detectedBoxes.push(box);
    }

    this.boxes.set(detectedBoxes);
  }

  /**
   * Parse a RelativeBox array into a BoundingBox object
   * RelativeBox format: [x, y, width, height] - all values 0-1
   */
  private parseRelativeBox(item: any): BoundingBox | null {
    const relBox = item.RelativeBox;

    if (!Array.isArray(relBox) || relBox.length < 4) {
      return null;
    }

    // Validate values are in 0-1 range
    const [x, y, width, height] = relBox.map((v: number) => {
      const num = parseFloat(String(v));
      return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
    });

    // Skip invalid boxes
    if (width <= 0 || height <= 0) {
      return null;
    }

    // Get label from various possible fields
    const label = item.Description ||
                  item.Label ||
                  item.Name ||
                  item.Type ||
                  item.ClassName ||
                  '';

    // Get confidence from various possible fields
    let confidence = item.Confidence ||
                     item.Score ||
                     item.Probability ||
                     null;

    if (confidence !== null) {
      confidence = parseFloat(String(confidence));
      // Normalize to 0-1 if value seems to be percentage
      if (confidence > 1) {
        confidence = confidence / 100;
      }
    }

    // Determine box color based on label type
    const color = this.getBoxColor(label);

    return { x, y, width, height, label, confidence, color };
  }

  /**
   * Get box color based on detection label
   */
  private getBoxColor(label: string): string {
    const lowerLabel = label.toLowerCase();

    // Critical - Red
    if (lowerLabel.includes('fire') ||
        lowerLabel.includes('smoke') ||
        lowerLabel.includes('fall')) {
      return '#ef4444';
    }

    // High - Orange
    if (lowerLabel.includes('helmet') ||
        lowerLabel.includes('vest') ||
        lowerLabel.includes('smoking') ||
        lowerLabel.includes('intrusion')) {
      return '#f97316';
    }

    // Medium - Yellow
    if (lowerLabel.includes('mask') ||
        lowerLabel.includes('crowd')) {
      return '#eab308';
    }

    // Low - Blue
    if (lowerLabel.includes('loiter') ||
        lowerLabel.includes('person')) {
      return '#3b82f6';
    }

    // Default - Red
    return '#ef4444';
  }
}
