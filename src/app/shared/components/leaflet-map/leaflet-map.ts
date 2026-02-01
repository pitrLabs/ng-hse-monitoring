import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  input,
  output,
  signal,
  effect,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
  isOnline?: boolean;
  data?: unknown;
}

@Component({
  selector: 'app-leaflet-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div #mapContainer class="map-container"></div>
      @if (loading()) {
        <div class="map-loading">
          <span>Loading map...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 200px;
    }

    .map-container {
      width: 100%;
      height: 100%;
      border-radius: var(--radius-md, 12px);
      overflow: hidden;
    }

    .map-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      color: var(--text-primary, #fff);
      font-size: 14px;
    }

    // Dark theme for Leaflet
    :host ::ng-deep {
      .leaflet-container {
        background: #1a1a25;
      }

      .leaflet-control-zoom {
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
        border-radius: 8px;
        overflow: hidden;

        a {
          background: var(--bg-secondary, #12121a);
          color: var(--text-primary, #fff);
          border-color: var(--glass-border, rgba(255, 255, 255, 0.08));

          &:hover {
            background: var(--glass-bg-hover, rgba(255, 255, 255, 0.06));
            color: var(--accent-primary, #00d4ff);
          }
        }
      }

      .leaflet-control-attribution {
        background: rgba(0, 0, 0, 0.6);
        color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
        font-size: 10px;

        a {
          color: var(--accent-primary, #00d4ff);
        }
      }

      .leaflet-popup-content-wrapper {
        background: var(--bg-secondary, #12121a);
        color: var(--text-primary, #fff);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }

      .leaflet-popup-tip {
        background: var(--bg-secondary, #12121a);
        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
      }

      .leaflet-popup-close-button {
        color: var(--text-secondary, rgba(255, 255, 255, 0.7));

        &:hover {
          color: var(--text-primary, #fff);
        }
      }

      .marker-cluster {
        background: rgba(0, 212, 255, 0.3);
        border-radius: 50%;

        div {
          background: var(--accent-primary, #00d4ff);
          color: #fff;
          font-weight: 600;
          font-size: 12px;
          border-radius: 50%;
        }
      }
    }
  `]
})
export class LeafletMapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  // Inputs
  markers = input<MapMarker[]>([]);
  center = input<[number, number]>([-6.2088, 106.8456]); // Default: Jakarta
  zoom = input<number>(10);
  showZoomControl = input<boolean>(true);
  tileLayer = input<'standard' | 'satellite' | 'dark'>('dark');

  // Outputs
  markerClick = output<MapMarker>();
  mapClick = output<{ lat: number; lng: number }>();
  mapReady = output<L.Map>();

  loading = signal(true);
  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private tileLayerInstance: L.TileLayer | null = null;

  // Custom marker icons
  private onlineIcon: L.Icon;
  private offlineIcon: L.Icon;
  private defaultIcon: L.Icon;

  constructor() {
    // Initialize custom icons
    this.onlineIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#10b981"/>
          <circle cx="16" cy="14" r="8" fill="white"/>
          <circle cx="16" cy="14" r="4" fill="#10b981"/>
        </svg>
      `),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });

    this.offlineIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#ef4444"/>
          <circle cx="16" cy="14" r="8" fill="white"/>
          <circle cx="16" cy="14" r="4" fill="#ef4444"/>
        </svg>
      `),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });

    this.defaultIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#00d4ff"/>
          <circle cx="16" cy="14" r="8" fill="white"/>
          <circle cx="16" cy="14" r="4" fill="#00d4ff"/>
        </svg>
      `),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });

    // React to marker changes
    effect(() => {
      const mkrs = this.markers();
      if (this.map && this.markerLayer) {
        this.updateMarkers(mkrs);
      }
    });

    // React to tile layer changes
    effect(() => {
      const layer = this.tileLayer();
      if (this.map) {
        this.updateTileLayer(layer);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Create map
    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.center(),
      zoom: this.zoom(),
      zoomControl: this.showZoomControl()
    });

    // Add tile layer
    this.updateTileLayer(this.tileLayer());

    // Create marker layer group
    this.markerLayer = L.layerGroup().addTo(this.map);

    // Add initial markers
    this.updateMarkers(this.markers());

    // Map click handler
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Emit map ready
    this.mapReady.emit(this.map);

    this.loading.set(false);
  }

  private updateTileLayer(type: 'standard' | 'satellite' | 'dark'): void {
    if (!this.map) return;

    // Remove existing tile layer
    if (this.tileLayerInstance) {
      this.map.removeLayer(this.tileLayerInstance);
    }

    // Add new tile layer
    let url: string;
    let attribution: string;

    switch (type) {
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = 'Esri, Maxar, Earthstar Geographics';
        break;
      case 'standard':
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        break;
      case 'dark':
      default:
        url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
        break;
    }

    this.tileLayerInstance = L.tileLayer(url, {
      attribution,
      maxZoom: 19
    }).addTo(this.map);
  }

  private updateMarkers(markers: MapMarker[]): void {
    if (!this.markerLayer) return;

    // Clear existing markers
    this.markerLayer.clearLayers();

    // Add new markers
    markers.forEach(marker => {
      if (marker.latitude && marker.longitude) {
        const icon = marker.isOnline === true
          ? this.onlineIcon
          : marker.isOnline === false
            ? this.offlineIcon
            : this.defaultIcon;

        const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
          .bindPopup(this.createPopupContent(marker))
          .on('click', () => {
            this.markerClick.emit(marker);
          });

        this.markerLayer?.addLayer(leafletMarker);
      }
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const validMarkers = markers.filter(m => m.latitude && m.longitude);
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(
          validMarkers.map(m => [m.latitude, m.longitude] as [number, number])
        );
        this.map?.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }

  private createPopupContent(marker: MapMarker): string {
    const statusHtml = marker.isOnline !== undefined
      ? `<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
           <span style="width: 8px; height: 8px; border-radius: 50%; background: ${marker.isOnline ? '#10b981' : '#ef4444'};"></span>
           <span style="font-size: 11px; color: ${marker.isOnline ? '#10b981' : '#ef4444'};">${marker.isOnline ? 'Online' : 'Offline'}</span>
         </div>`
      : '';

    return `
      <div style="min-width: 150px; padding: 4px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${marker.name}</div>
        ${marker.type ? `<div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 2px;">${marker.type}</div>` : ''}
        ${statusHtml}
        <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 6px;">
          ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
        </div>
      </div>
    `;
  }

  // Public methods for external control
  setView(lat: number, lng: number, zoom?: number): void {
    this.map?.setView([lat, lng], zoom ?? this.map.getZoom());
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  fitBounds(bounds: L.LatLngBoundsExpression): void {
    this.map?.fitBounds(bounds);
  }

  getMap(): L.Map | null {
    return this.map;
  }
}
