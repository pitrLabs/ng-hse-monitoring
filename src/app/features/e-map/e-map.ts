import { Component, signal, OnInit, OnDestroy, inject, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LocationsService, CameraLocation, LiveKoperItem, TrackPoint as ServiceTrackPoint } from '../../core/services/locations.service';
import { LeafletMapComponent, MapMarker, TrackPoint } from '../../shared/components/leaflet-map/leaflet-map';

interface DeviceItem {
  id: string;
  name: string;
  online: boolean;
  hasGps: boolean;
  location: CameraLocation | null;
  liveData?: LiveKoperItem;
}

type SortOption = 'status' | 'name' | 'id';

@Component({
  selector: 'app-e-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LeafletMapComponent
  ],
  template: `
    <div class="emap-container">
      <!-- Left Panel -->
      <div class="left-panel glass-card-static">
        <!-- Search -->
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="Search devices..." [(ngModel)]="searchQuery" class="search-input">
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ totalDevices() }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat-item online">
            <span class="stat-value">{{ onlineDevices() }}</span>
            <span class="stat-label">Online</span>
          </div>
          <div class="stat-item offline">
            <span class="stat-value">{{ totalDevices() - onlineDevices() }}</span>
            <span class="stat-label">Offline</span>
          </div>
          <div class="stat-item gps">
            <span class="stat-value">{{ withGpsDevices() }}</span>
            <span class="stat-label">With GPS</span>
          </div>
        </div>

        <!-- Filters -->
        <div class="filter-options">
          <mat-checkbox [(ngModel)]="liveMode" (change)="onLiveModeChange()" color="primary">
            <span class="live-label">
              <span class="live-dot" [class.active]="liveMode"></span>
              Live Mode
            </span>
          </mat-checkbox>
          <mat-checkbox [(ngModel)]="onlineOnly" color="primary">Online Only</mat-checkbox>
          <mat-checkbox [(ngModel)]="showOnlyWithGps" color="primary">With GPS Only</mat-checkbox>
        </div>

        <!-- Sort Options -->
        <div class="sort-options">
          <mat-form-field appearance="outline" class="sort-select">
            <mat-label>Sort by</mat-label>
            <mat-select [(ngModel)]="sortBy">
              <mat-option value="status">Status (ON first)</mat-option>
              <mat-option value="name">Name</mat-option>
              <mat-option value="id">ID Alat</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Selected Device Info -->
        @if (selectedDeviceId) {
          <div class="selected-device-bar">
            <div class="selected-info">
              <mat-icon>timeline</mat-icon>
              <span>Track: {{ selectedDeviceId }}</span>
              @if (loadingTrack()) {
                <mat-spinner diameter="14"></mat-spinner>
              }
            </div>
            <button mat-icon-button (click)="clearSelection()" matTooltip="Clear Track">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }

        <!-- Device List -->
        <div class="device-list">
          @if (loading()) {
            <div class="list-loading">
              <mat-spinner diameter="24"></mat-spinner>
              <span>Loading devices...</span>
            </div>
          } @else if (sortedDevices().length === 0) {
            <div class="list-empty">
              <mat-icon>location_off</mat-icon>
              <span>No devices found</span>
              <button mat-stroked-button (click)="syncLocations()">
                <mat-icon>sync</mat-icon>
                Sync from API
              </button>
            </div>
          } @else {
            @for (device of sortedDevices(); track device.id) {
              <div
                class="device-item"
                [class.selected]="selectedDeviceId === device.id"
                [class.online]="device.online"
                [class.no-gps]="!device.hasGps"
                (click)="selectDevice(device)"
              >
                <div class="device-status">
                  <span class="status-indicator" [class.online]="device.online"></span>
                </div>
                <div class="device-info">
                  <span class="device-id">{{ device.id }}</span>
                  <span class="device-name">{{ device.name }}</span>
                </div>
                <div class="device-actions">
                  @if (!device.hasGps) {
                    <mat-icon class="no-gps-icon" matTooltip="No GPS">gps_off</mat-icon>
                  } @else {
                    <mat-icon class="gps-icon" matTooltip="Has GPS">gps_fixed</mat-icon>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Map Area -->
      <div class="map-area glass-card-static">
        <!-- Left Toolbar -->
        <div class="map-toolbar-left">
          <button mat-icon-button class="map-tool-btn" matTooltip="Zoom In" (click)="mapZoomIn()">
            <mat-icon>add</mat-icon>
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Zoom Out" (click)="mapZoomOut()">
            <mat-icon>remove</mat-icon>
          </button>
          <div class="toolbar-divider"></div>
          <button mat-icon-button class="map-tool-btn" matTooltip="Sync Locations" (click)="syncLocations()" [disabled]="syncing()">
            @if (syncing()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>sync</mat-icon>
            }
          </button>
          <button mat-icon-button class="map-tool-btn" matTooltip="Fit All Markers" (click)="fitAllMarkers()">
            <mat-icon>fit_screen</mat-icon>
          </button>
          <div class="toolbar-divider"></div>
          <button mat-icon-button class="map-tool-btn" matTooltip="Filter: Online Only" [class.active]="onlineOnly" (click)="onlineOnly = !onlineOnly">
            <mat-icon>wifi</mat-icon>
          </button>
        </div>

        <!-- Right Toolbar -->
        <div class="map-toolbar-right">
          <button mat-button class="map-menu-btn" [matMenuTriggerFor]="mapTypeMenu">
            <mat-icon>layers</mat-icon>
            Map Type
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #mapTypeMenu="matMenu">
            <button mat-menu-item (click)="setMapType('dark')">
              <mat-icon>dark_mode</mat-icon>
              <span>Dark</span>
            </button>
            <button mat-menu-item (click)="setMapType('standard')">
              <mat-icon>map</mat-icon>
              <span>Standard</span>
            </button>
            <button mat-menu-item (click)="setMapType('satellite')">
              <mat-icon>satellite</mat-icon>
              <span>Satellite</span>
            </button>
          </mat-menu>
        </div>

        <!-- Compass -->
        <div class="compass">
          <mat-icon>explore</mat-icon>
          <span class="compass-label">N</span>
        </div>

        <!-- Leaflet Map -->
        <app-leaflet-map
          #mapComponent
          [markers]="mapMarkers()"
          [track]="deviceTrack()"
          [tileLayer]="mapTileLayer()"
          [center]="mapCenter"
          [zoom]="10"
          (markerClick)="onMarkerClick($event)"
        ></app-leaflet-map>
      </div>
    </div>
  `,
  styles: [`
    .emap-container {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      overflow: hidden;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--text-tertiary);
      }

      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 14px;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .stat-label {
        font-size: 10px;
        color: var(--text-tertiary);
        text-transform: uppercase;
      }

      &.online .stat-value { color: var(--success); }
      &.offline .stat-value { color: var(--error); }
      &.gps .stat-value { color: var(--accent-primary); }
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 13px;
        color: var(--text-secondary);
      }
    }

    .live-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      transition: all 0.3s ease;

      &.active {
        background: var(--error);
        box-shadow: 0 0 8px var(--error);
        animation: pulse 1.5s infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .sort-options {
      padding: 8px 0;
      border-bottom: 1px solid var(--glass-border);

      .sort-select {
        width: 100%;

        ::ng-deep .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }

        ::ng-deep .mat-mdc-text-field-wrapper {
          background: var(--glass-bg);
        }

        ::ng-deep .mdc-notched-outline__leading,
        ::ng-deep .mdc-notched-outline__notch,
        ::ng-deep .mdc-notched-outline__trailing {
          border-color: var(--glass-border) !important;
        }

        ::ng-deep .mat-mdc-select-value {
          color: var(--text-primary);
          font-size: 13px;
        }

        ::ng-deep .mat-mdc-floating-label {
          color: var(--text-tertiary);
        }
      }
    }

    .selected-device-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(0, 212, 255, 0.15);
      border: 1px solid var(--accent-primary);
      border-radius: var(--radius-sm);
      margin-top: 8px;

      .selected-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--accent-primary);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      button {
        width: 24px;
        height: 24px;
        line-height: 24px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    .device-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }

    .list-loading, .list-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 20px;
      color: var(--text-tertiary);
      font-size: 13px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        opacity: 0.5;
      }

      button {
        margin-top: 8px;
      }
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: var(--glass-bg);
      border: 1px solid transparent;
      transition: all 0.2s ease;

      &:hover {
        background: var(--glass-bg-hover);
        border-color: var(--glass-border);
      }

      &.selected {
        background: rgba(0, 212, 255, 0.15);
        border-color: var(--accent-primary);
      }

      &.online {
        border-left: 3px solid var(--success);
      }

      &:not(.online) {
        border-left: 3px solid var(--text-muted);
      }
    }

    .device-status {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text-muted);

      &.online {
        background: var(--success);
        box-shadow: 0 0 8px var(--success);
      }
    }

    .device-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .device-id {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .device-name {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .device-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .gps-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--success);
    }

    .no-gps-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--warning);
      opacity: 0.7;
    }

    .device-item.no-gps {
      opacity: 0.7;

      .device-name {
        color: var(--text-tertiary);
      }
    }

    // Map Area
    .map-area {
      position: relative;
      overflow: hidden;
    }

    .map-toolbar-left {
      position: absolute;
      left: 12px;
      top: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 10;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 4px;
    }

    .toolbar-divider {
      height: 1px;
      background: var(--glass-border);
      margin: 4px 0;
    }

    .map-tool-btn {
      width: 36px;
      height: 36px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        color: var(--accent-primary);
        background: var(--glass-bg-hover);
      }

      &.active {
        color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.15);
      }
    }

    .map-toolbar-right {
      position: absolute;
      right: 12px;
      top: 12px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }

    .map-menu-btn {
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
      }
    }

    .compass {
      position: absolute;
      right: 12px;
      bottom: 12px;
      width: 48px;
      height: 48px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-primary);
      }

      .compass-label {
        font-size: 8px;
        font-weight: 600;
        color: var(--error);
        margin-top: -4px;
      }
    }

    app-leaflet-map {
      position: absolute;
      inset: 0;
      z-index: 1;
    }

    @media (max-width: 900px) {
      .emap-container {
        grid-template-columns: 1fr;
        grid-template-rows: 300px 1fr;
      }
    }
  `]
})
export class EMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: LeafletMapComponent;

  private locationsService = inject(LocationsService);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  searchQuery = '';
  onlineOnly = false;
  showOnlyWithGps = false; // Default: show all devices
  liveMode = true; // Default: live mode on
  sortBy: SortOption = 'status'; // Default: sort by status (ON first)
  selectedDeviceId: string | null = null;
  loading = signal(false);
  syncing = signal(false);

  // Map state
  mapTileLayer = signal<'dark' | 'standard' | 'satellite'>('dark');
  mapCenter: [number, number] = [-7.0, 110.4]; // Central Java default
  locations = signal<CameraLocation[]>([]);
  liveDevices = signal<LiveKoperItem[]>([]);
  deviceTrack = signal<TrackPoint[]>([]);
  loadingTrack = signal(false);

  // Stats computed signals
  totalDevices = computed(() => this.liveMode ? this.liveDevices().length : this.locations().length);
  onlineDevices = computed(() => this.liveMode
    ? this.liveDevices().filter(d => d.is_online).length
    : this.locations().filter(l => l.is_active).length
  );
  withGpsDevices = computed(() => this.liveMode
    ? this.liveDevices().filter(d => d.has_gps).length
    : this.locations().filter(l => l.latitude && l.longitude).length
  );

  // Sorted and filtered device list
  sortedDevices = computed(() => {
    let devices: DeviceItem[] = [];

    if (this.liveMode) {
      // Convert live data to DeviceItem
      devices = this.liveDevices().map(item => ({
        id: item.id,
        name: item.name,
        online: item.is_online,
        hasGps: item.has_gps || false,
        location: null,
        liveData: item
      }));
    } else {
      // Convert locations to DeviceItem
      devices = this.locations().map(loc => ({
        id: loc.id,
        name: loc.name,
        online: loc.is_active,
        hasGps: !!(loc.latitude && loc.longitude),
        location: loc,
        liveData: undefined
      }));
    }

    // Apply filters
    if (this.onlineOnly) {
      devices = devices.filter(d => d.online);
    }
    if (this.showOnlyWithGps) {
      devices = devices.filter(d => d.hasGps);
    }
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      devices = devices.filter(d =>
        d.id.toLowerCase().includes(query) ||
        d.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'status':
        // Online first, then by name
        devices.sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'name':
        devices.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'id':
        devices.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }

    return devices;
  });

  // Computed markers from locations
  mapMarkers = computed(() => {
    if (this.liveMode) {
      let devices = this.liveDevices();

      // Filter by online only
      if (this.onlineOnly) {
        devices = devices.filter(d => d.is_online);
      }

      // Filter by has GPS (required for map markers)
      if (this.showOnlyWithGps) {
        devices = devices.filter(d => d.has_gps && d.latitude && d.longitude);
      }

      return devices
        .filter(d => d.latitude && d.longitude)
        .map(d => ({
          id: d.id,
          name: d.name,
          latitude: d.latitude,
          longitude: d.longitude,
          type: d.jenis_har || 'Koper CCTV',
          isOnline: d.is_online,
          data: d
        }));
    } else {
      let locs = this.locations();

      if (this.onlineOnly) {
        locs = locs.filter(l => l.is_active);
      }

      return locs
        .filter(loc => loc.latitude && loc.longitude)
        .map(loc => ({
          id: loc.id,
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          type: loc.location_type || loc.source,
          isOnline: loc.is_active,
          data: loc
        }));
    }
  });

  ngOnInit(): void {
    if (this.liveMode) {
      this.loadLiveData();
      this.startAutoRefresh();
    } else {
      this.loadLocations();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  onLiveModeChange(): void {
    if (this.liveMode) {
      this.loadLiveData();
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
      this.loadLocations();
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    // Refresh every 30 seconds in live mode
    this.refreshInterval = setInterval(() => {
      if (this.liveMode) {
        this.loadLiveData();
      }
    }, 30000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async loadLiveData(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.locationsService.getLiveTimKoper();
      if (response) {
        this.liveDevices.set(response.data);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadLocations(): Promise<void> {
    this.loading.set(true);
    try {
      const locations = await this.locationsService.loadLocations({ limit: 1000 });
      this.locations.set(locations);
    } finally {
      this.loading.set(false);
    }
  }

  async syncLocations(): Promise<void> {
    this.syncing.set(true);
    try {
      if (this.liveMode) {
        await this.loadLiveData();
      } else {
        await this.locationsService.syncLocations('tim_koper');
        await this.loadLocations();
      }
    } finally {
      this.syncing.set(false);
    }
  }

  // Select device and focus on map + load history
  async selectDevice(device: DeviceItem): Promise<void> {
    this.selectedDeviceId = device.id;

    // Clear previous track
    this.deviceTrack.set([]);

    // Load device history (last 24 hours)
    this.loadingTrack.set(true);
    try {
      const history = await this.locationsService.getDeviceHistory(device.id, 24, 500);
      if (history && history.track.length > 0) {
        // Convert service TrackPoint to leaflet TrackPoint
        const track: TrackPoint[] = history.track.map(p => ({
          lat: p.lat,
          lng: p.lng,
          status: p.status,
          is_online: p.is_online,
          recorded_at: p.recorded_at
        }));
        this.deviceTrack.set(track);

        // If track exists, fit bounds to show the entire track
        // The leaflet-map component will handle this
      } else {
        // No history, just focus on current position
        this.focusOnDevice(device);
      }
    } catch (err) {
      console.error('Failed to load device history:', err);
      // Fallback to just focusing on device
      this.focusOnDevice(device);
    } finally {
      this.loadingTrack.set(false);
    }
  }

  // Clear selected device and track
  clearSelection(): void {
    this.selectedDeviceId = null;
    this.deviceTrack.set([]);
    this.mapComponent?.clearTrack();
  }

  // Map controls
  mapZoomIn(): void {
    this.mapComponent?.zoomIn();
  }

  mapZoomOut(): void {
    this.mapComponent?.zoomOut();
  }

  fitAllMarkers(): void {
    const markers = this.mapMarkers();
    if (markers.length > 0 && this.mapComponent) {
      const map = this.mapComponent.getMap();
      if (map) {
        const bounds = markers.map(m => [m.latitude, m.longitude] as [number, number]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  setMapType(type: 'dark' | 'standard' | 'satellite'): void {
    this.mapTileLayer.set(type);
  }

  onMarkerClick(marker: MapMarker): void {
    console.log('Location clicked:', marker);
    // Could open a detail popup or highlight in the list
  }

  focusOnDevice(device: DeviceItem): void {
    let lat: number | undefined;
    let lng: number | undefined;

    if (device.liveData) {
      lat = device.liveData.latitude;
      lng = device.liveData.longitude;
    } else if (device.location) {
      lat = device.location.latitude;
      lng = device.location.longitude;
    }

    if (lat && lng) {
      this.mapComponent?.setView(lat, lng, 15);
    }
  }
}
