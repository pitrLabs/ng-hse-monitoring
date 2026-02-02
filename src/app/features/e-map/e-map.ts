import { Component, signal, OnInit, inject, ViewChild, computed, effect } from '@angular/core';
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
import { LocationsService, CameraLocation } from '../../core/services/locations.service';
import { LeafletMapComponent, MapMarker } from '../../shared/components/leaflet-map/leaflet-map';

interface DeviceItem {
  id: string;
  name: string;
  online: boolean;
  location: CameraLocation;
}

interface RegionGroup {
  id: string;
  name: string;
  expanded: boolean;
  visible: boolean;
  devices: DeviceItem[];
}

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

        <!-- Filters -->
        <div class="filter-options">
          <mat-checkbox [(ngModel)]="onlineOnly" color="primary">Online Only</mat-checkbox>
          <mat-checkbox [(ngModel)]="onlineInGroup" color="primary">Online in Group</mat-checkbox>
        </div>

        <!-- Device Groups - Region > Device -->
        <div class="device-tree">
          @if (loading()) {
            <div class="tree-loading">
              <mat-spinner diameter="24"></mat-spinner>
              <span>Loading locations...</span>
            </div>
          } @else if (filteredRegionGroups().length === 0) {
            <div class="tree-empty">
              <mat-icon>location_off</mat-icon>
              <span>No locations found</span>
              <button mat-stroked-button (click)="syncLocations()">
                <mat-icon>sync</mat-icon>
                Sync from API
              </button>
            </div>
          } @else {
            @for (region of filteredRegionGroups(); track region.id) {
              <div class="tree-node region-node">
                <div class="node-header region-header">
                  <mat-icon class="expand-icon" [class.expanded]="region.expanded" (click)="toggleRegionGroup(region)">
                    chevron_right
                  </mat-icon>
                  <mat-checkbox
                    [checked]="region.visible"
                    (change)="toggleRegionVisibility(region)"
                    color="primary"
                    class="visibility-check"
                  ></mat-checkbox>
                  <mat-icon class="folder-icon region-folder">folder</mat-icon>
                  <span class="node-name" (click)="toggleRegionGroup(region)">{{ region.name }}</span>
                  <span class="node-count">({{ region.devices.length }})</span>
                </div>
                @if (region.expanded) {
                  <div class="node-children">
                    @for (device of getFilteredDevices(region); track device.id) {
                      <div class="device-item" (click)="focusOnDevice(device)">
                        <mat-icon class="device-icon" [class.online]="device.online">
                          {{ device.online ? 'location_on' : 'location_off' }}
                        </mat-icon>
                        <span class="device-name">{{ device.name }}</span>
                        <span class="status-dot" [class.online]="device.online"></span>
                      </div>
                    }
                  </div>
                }
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

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--glass-border);

      ::ng-deep .mat-mdc-checkbox-label {
        font-size: 13px;
        color: var(--text-secondary);
      }
    }

    .device-tree {
      flex: 1;
      overflow-y: auto;
    }

    .tree-loading, .tree-empty {
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

    .tree-node {
      margin-bottom: 4px;
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: var(--glass-bg-hover);
      }
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      min-width: 18px;
      color: var(--text-tertiary);
      transition: transform 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;

      &.expanded {
        transform: rotate(90deg);
      }
    }

    .visibility-check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      min-width: 24px;
      height: 24px;
      margin: 0;

      ::ng-deep .mdc-form-field {
        padding: 0;
      }

      ::ng-deep .mdc-checkbox {
        width: 18px;
        height: 18px;
        padding: 0;
        margin: 0;
        flex: 0 0 18px;
      }

      ::ng-deep .mdc-checkbox__background {
        width: 16px;
        height: 16px;
        top: 1px;
        left: 1px;
      }

      ::ng-deep .mat-mdc-checkbox-touch-target {
        width: 24px;
        height: 24px;
      }
    }

    .folder-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      min-width: 18px;
      color: var(--warning);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .node-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
      line-height: 24px;
      margin-left: 4px;
    }

    .node-count {
      font-size: 11px;
      color: var(--text-tertiary);
      line-height: 24px;
      margin-left: 4px;
    }

    .node-children {
      padding-left: 24px;
    }

    .region-header {
      background: rgba(0, 212, 255, 0.05);
      border-radius: var(--radius-sm);
    }

    .region-folder {
      color: var(--accent-primary) !important;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;

      &:hover {
        background: var(--glass-bg);
      }
    }

    .device-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);

      &.online {
        color: var(--success);
      }
    }

    .device-name {
      flex: 1;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);

      &.online {
        background: var(--success);
        box-shadow: 0 0 6px var(--success);
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
export class EMapComponent implements OnInit {
  @ViewChild('mapComponent') mapComponent!: LeafletMapComponent;

  private locationsService = inject(LocationsService);

  searchQuery = '';
  onlineOnly = false;
  onlineInGroup = false;
  loading = signal(false);
  syncing = signal(false);

  // Map state
  mapTileLayer = signal<'dark' | 'standard' | 'satellite'>('dark');
  mapCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta default
  locations = signal<CameraLocation[]>([]);

  // Track visibility state per region
  private visibleRegions = signal<Set<string>>(new Set());
  private visibilityInitialized = false;

  // Effect to initialize visibility when locations change
  private visibilityEffect = effect(() => {
    const locs = this.locations();
    if (locs.length > 0 && !this.visibilityInitialized) {
      const allRegionIds = new Set<string>();
      for (const loc of locs) {
        const regionName = this.extractRegion(loc);
        allRegionIds.add(regionName);
      }
      this.visibleRegions.set(allRegionIds);
      this.visibilityInitialized = true;
    }
  }, { allowSignalWrites: true });

  // Flat region groups: Region > Devices
  regionGroups = computed(() => {
    const locs = this.locations();
    const visibleSet = this.visibleRegions();
    const regionMap = new Map<string, RegionGroup>();

    for (const loc of locs) {
      const regionName = this.extractRegion(loc);

      // Get or create region group
      if (!regionMap.has(regionName)) {
        regionMap.set(regionName, {
          id: regionName,
          name: regionName,
          expanded: false,
          visible: visibleSet.has(regionName),
          devices: []
        });
      }

      const region = regionMap.get(regionName)!;
      region.devices.push({
        id: loc.id,
        name: loc.name,
        online: loc.is_active,
        location: loc
      });
    }

    return Array.from(regionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed markers from locations (filtered by visibility)
  mapMarkers = computed(() => {
    const visibleSet = this.visibleRegions();
    let locs = this.locations();

    // If visibility is initialized, filter by visible regions
    if (visibleSet.size > 0) {
      locs = locs.filter(loc => {
        const regionName = this.extractRegion(loc);
        return visibleSet.has(regionName);
      });
    }

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
  });

  ngOnInit(): void {
    this.loadLocations();
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
      await this.locationsService.syncLocations('gps_tim_har');
      await this.loadLocations();
    } finally {
      this.syncing.set(false);
    }
  }

  private extractRegion(loc: CameraLocation): string {
    // Try to extract region from extra_data fields
    const extraData = loc.extra_data as Record<string, unknown> | null;

    if (extraData) {
      // Try FEEDER_01 first (common in keypoint data)
      if (extraData['FEEDER_01']) {
        return String(extraData['FEEDER_01']).trim();
      }
      // Try TYPE_KP
      if (extraData['TYPE_KP']) {
        return String(extraData['TYPE_KP']).trim();
      }
      // Try KEYPOINT_SCADA and extract region part
      if (extraData['KEYPOINT_SCADA']) {
        const scada = String(extraData['KEYPOINT_SCADA']);
        // Extract first part before underscore or dash
        const match = scada.match(/^([A-Za-z]+)/);
        if (match) {
          return match[1].toUpperCase();
        }
      }
    }

    // Try location_type
    if (loc.location_type) {
      return loc.location_type;
    }

    // Fallback: try to extract from address
    if (loc.address) {
      // Common Indonesian city/region patterns
      const addressLower = loc.address.toLowerCase();
      const regions = ['jakarta', 'bogor', 'depok', 'tangerang', 'bekasi', 'bandung', 'surabaya', 'semarang', 'yogyakarta', 'malang'];
      for (const region of regions) {
        if (addressLower.includes(region)) {
          return region.charAt(0).toUpperCase() + region.slice(1);
        }
      }
      // Return first word of address
      const firstWord = loc.address.split(/[\s,]+/)[0];
      if (firstWord && firstWord.length > 2) {
        return firstWord;
      }
    }

    // Fallback: extract from name
    if (loc.name) {
      const parts = loc.name.split(/[-_\s]/);
      if (parts.length > 0 && parts[0].length > 2) {
        return parts[0].toUpperCase();
      }
    }

    return 'Other';
  }

  filteredRegionGroups(): RegionGroup[] {
    let regions = this.regionGroups();
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      regions = regions.filter(region =>
        region.name.toLowerCase().includes(query) ||
        region.devices.some(d => d.name.toLowerCase().includes(query))
      );
    }
    return regions;
  }

  getFilteredDevices(region: RegionGroup): DeviceItem[] {
    let devices = region.devices;
    if (this.onlineOnly) {
      devices = devices.filter(d => d.online);
    }
    if (this.searchQuery) {
      devices = devices.filter(d =>
        d.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    return devices;
  }

  toggleRegionGroup(region: RegionGroup): void {
    region.expanded = !region.expanded;
  }

  toggleRegionVisibility(region: RegionGroup): void {
    this.visibleRegions.update(s => {
      const newSet = new Set(s);
      if (newSet.has(region.id)) {
        newSet.delete(region.id);
        region.visible = false;
      } else {
        newSet.add(region.id);
        region.visible = true;
      }
      return newSet;
    });
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
    if (device.location.latitude && device.location.longitude) {
      this.mapComponent?.setView(device.location.latitude, device.location.longitude, 15);
    }
  }
}
