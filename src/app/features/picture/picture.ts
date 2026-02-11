import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlarmService } from '../../core/services/alarm.service';
import { Alarm, getBestAlarmImageUrl, getAlarmSeverity, AlarmSeverity } from '../../core/models/alarm.model';
import { environment } from '../../../environments/environment';
import { BboxImageComponent } from '../../shared/components/bbox-image/bbox-image.component';

interface AlarmPicture {
  alarm: Alarm;
  imageUrl: string;
  selected: boolean;
}

@Component({
  selector: 'app-picture',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BboxImageComponent
  ],
  template: `
    <div class="picture-container">
      <!-- Left Panel - Filters -->
      <div class="left-panel glass-card-static">
        <h3 class="panel-title">
          <mat-icon>filter_list</mat-icon>
          Filters
        </h3>

        <div class="filter-section">
          <label>Search</label>
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search camera or location..." [(ngModel)]="searchQuery">
          </div>
        </div>

        <div class="filter-section">
          <label>Alarm Type</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select [(ngModel)]="selectedType" (selectionChange)="applyFilters()">
              <mat-option value="">All Types</mat-option>
              @for (type of alarmTypes(); track type) {
                <mat-option [value]="type">{{ type }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-section">
          <label>Camera</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-select [(ngModel)]="selectedCamera" (selectionChange)="applyFilters()">
              <mat-option value="">All Cameras</mat-option>
              @for (camera of cameras(); track camera) {
                <mat-option [value]="camera">{{ camera }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-section">
          <label>Date Range</label>
          <mat-form-field appearance="outline" class="full-width">
            <input matInput type="date" [(ngModel)]="startDate" (change)="applyFilters()">
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <input matInput type="date" [(ngModel)]="endDate" (change)="applyFilters()">
          </mat-form-field>
        </div>

        <button mat-flat-button class="refresh-btn" (click)="loadAlarms()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>

        <div class="stats-section">
          <div class="stat-item">
            <span class="stat-label">Total Images</span>
            <span class="stat-value">{{ filteredPictures().length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Selected</span>
            <span class="stat-value">{{ selectedCount() }}</span>
          </div>
        </div>
      </div>

      <!-- Right Panel - Gallery -->
      <div class="right-panel">
        <!-- Toolbar -->
        <div class="toolbar glass-card-static">
          <div class="toolbar-left">
            <mat-checkbox [(ngModel)]="selectAll" (change)="toggleSelectAll()" color="primary">
              Select All
            </mat-checkbox>
            <span class="result-count">{{ filteredPictures().length }} images found</span>
          </div>
          <div class="toolbar-right">
            <button mat-icon-button matTooltip="Grid view" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'">
              <mat-icon>grid_view</mat-icon>
            </button>
            <button mat-icon-button matTooltip="List view" [class.active]="viewMode === 'list'" (click)="viewMode = 'list'">
              <mat-icon>view_list</mat-icon>
            </button>
            <button mat-stroked-button class="export-btn" (click)="exportToExcel()" [disabled]="downloading()">
              <mat-icon>table_chart</mat-icon>
              Export Excel
            </button>
            <button mat-flat-button class="download-btn" [disabled]="selectedCount() === 0 || downloading()" (click)="bulkDownload()">
              @if (downloading()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <mat-icon>download</mat-icon>
              }
              Download ({{ selectedCount() }})
            </button>
          </div>
        </div>

        <!-- Gallery Grid -->
        <div class="gallery-container" [class.list-mode]="viewMode === 'list'">
          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Loading images...</span>
            </div>
          } @else if (filteredPictures().length === 0) {
            <div class="empty-state">
              <mat-icon>photo_library</mat-icon>
              <span>No images found</span>
              <p>Try adjusting your filters or wait for new alarms</p>
            </div>
          } @else {
            @for (pic of paginatedPictures(); track pic.alarm.id) {
              <div class="picture-card" [class.selected]="pic.selected" (click)="toggleSelection(pic)">
                <div class="picture-checkbox" (click)="$event.stopPropagation()">
                  <mat-checkbox [ngModel]="pic.selected" (ngModelChange)="onCheckboxChange(pic, $event)" color="primary"></mat-checkbox>
                </div>
                <div class="picture-image" (click)="openViewer(pic); $event.stopPropagation()">
                  <app-bbox-image
                    [src]="pic.imageUrl"
                    [alt]="pic.alarm.alarm_type"
                    [rawData]="pic.alarm.raw_data"
                    [showLabels]="false">
                  </app-bbox-image>
                  <div class="picture-overlay">
                    <mat-icon>zoom_in</mat-icon>
                  </div>
                </div>
                <div class="picture-info">
                  <div class="picture-header">
                    <span class="severity-badge" [class]="getSeverityClass(pic.alarm.alarm_type)">
                      {{ pic.alarm.alarm_type }}
                    </span>
                    <span class="picture-time">{{ formatTime(pic.alarm.alarm_time) }}</span>
                  </div>
                  <div class="picture-location">
                    <mat-icon>videocam</mat-icon>
                    {{ pic.alarm.camera_name || 'Unknown Camera' }}
                  </div>
                  @if (pic.alarm.confidence) {
                    <div class="picture-confidence">
                      Confidence: {{ (pic.alarm.confidence * 100).toFixed(0) }}%
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination glass-card-static">
            <button mat-icon-button [disabled]="currentPage() === 1" (click)="goToPage(1)">
              <mat-icon>first_page</mat-icon>
            </button>
            <button mat-icon-button [disabled]="currentPage() === 1" (click)="prevPage()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <button mat-icon-button [disabled]="currentPage() === totalPages()" (click)="nextPage()">
              <mat-icon>chevron_right</mat-icon>
            </button>
            <button mat-icon-button [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())">
              <mat-icon>last_page</mat-icon>
            </button>
          </div>
        }
      </div>

      <!-- Image Viewer Modal -->
      @if (viewerOpen() && currentViewerPic(); as pic) {
        <div class="viewer-overlay" (click)="closeViewer()">
          <div class="viewer-content" (click)="$event.stopPropagation()">
            <button class="viewer-close" (click)="closeViewer()">
              <mat-icon>close</mat-icon>
            </button>
            <button class="viewer-nav prev" (click)="viewerPrev()" [disabled]="!canViewerPrev()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <button class="viewer-nav next" (click)="viewerNext()" [disabled]="!canViewerNext()">
              <mat-icon>chevron_right</mat-icon>
            </button>

            <div class="viewer-image">
              <app-bbox-image
                [src]="pic.imageUrl"
                [alt]="pic.alarm.alarm_type"
                [rawData]="pic.alarm.raw_data"
                [showLabels]="true">
              </app-bbox-image>
            </div>

            <div class="viewer-info">
              <div class="viewer-header">
                <span class="severity-badge large" [class]="getSeverityClass(pic.alarm.alarm_type)">
                  {{ pic.alarm.alarm_type }}
                </span>
                <span class="viewer-time">{{ formatDateTime(pic.alarm.alarm_time) }}</span>
              </div>
              <div class="viewer-details">
                <div class="detail-row">
                  <mat-icon>videocam</mat-icon>
                  <span>{{ pic.alarm.camera_name || 'Unknown Camera' }}</span>
                </div>
                @if (pic.alarm.location) {
                  <div class="detail-row">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ pic.alarm.location }}</span>
                  </div>
                }
                @if (pic.alarm.confidence) {
                  <div class="detail-row">
                    <mat-icon>analytics</mat-icon>
                    <span>Confidence: {{ (pic.alarm.confidence * 100).toFixed(1) }}%</span>
                  </div>
                }
              </div>
              <div class="viewer-actions">
                <button mat-flat-button class="download-single-btn" (click)="downloadSingleImage(pic.alarm)" [disabled]="downloading()">
                  @if (downloading()) {
                    <mat-spinner diameter="16"></mat-spinner>
                  } @else {
                    <mat-icon>download</mat-icon>
                  }
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .picture-container {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 20px;
      height: calc(100vh - 118px);
    }

    // Left Panel
    .left-panel {
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 16px;
      overflow-y: auto;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--accent-primary);
      }
    }

    .filter-section {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
      }
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
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--text-tertiary);
      }

      input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 13px;

        &::placeholder {
          color: var(--text-muted);
        }
      }
    }

    .full-width {
      width: 100%;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    .refresh-btn {
      background: var(--accent-primary);
      color: white;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    .stats-section {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-primary);
    }

    // Right Panel
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .result-count {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;

      button.active {
        color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.1);
      }
    }

    .download-btn {
      background: var(--accent-primary);
      color: white;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      &:disabled {
        opacity: 0.5;
      }
    }

    // Gallery
    .gallery-container {
      flex: 1;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 4px;
      align-content: start;

      &.list-mode {
        grid-template-columns: 1fr;
        gap: 8px;

        .picture-card {
          flex-direction: row;
          height: 100px;

          .picture-image {
            width: 140px;
            height: 100%;
            flex-shrink: 0;
          }

          .picture-info {
            flex: 1;
            padding: 12px;
          }
        }
      }
    }

    .picture-card {
      display: flex;
      flex-direction: column;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;

      &:hover {
        border-color: var(--accent-primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

        .picture-overlay {
          opacity: 1;
        }
      }

      &.selected {
        border-color: var(--accent-primary);
        background: rgba(0, 212, 255, 0.05);
      }
    }

    .picture-checkbox {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 2;
    }

    .picture-image {
      position: relative;
      width: 100%;
      height: 160px;
      background: var(--bg-tertiary);
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .picture-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: white;
      }
    }

    .picture-info {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .picture-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .severity-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;

      &.critical {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      &.high {
        background: rgba(249, 115, 22, 0.2);
        color: #f97316;
      }

      &.medium {
        background: rgba(234, 179, 8, 0.2);
        color: #eab308;
      }

      &.low {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
      }

      &.large {
        padding: 6px 12px;
        font-size: 13px;
      }
    }

    .picture-time {
      font-size: 11px;
      color: var(--text-muted);
    }

    .picture-location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .picture-confidence {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    // Empty/Loading States
    .loading-state, .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-muted);
      gap: 16px;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
      }

      span {
        font-size: 16px;
        font-weight: 500;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--text-tertiary);
      }
    }

    // Pagination
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 12px;
    }

    .page-info {
      font-size: 13px;
      color: var(--text-secondary);
      min-width: 120px;
      text-align: center;
    }

    // Viewer Modal
    .viewer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .viewer-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;

      img {
        max-width: 100%;
        max-height: calc(90vh - 150px);
        object-fit: contain;
        border-radius: 8px;
      }
    }

    .viewer-image {
      max-width: 100%;
      max-height: calc(90vh - 150px);
      border-radius: 8px;
      overflow: hidden;
      background: #0a0b0f;

      app-bbox-image {
        display: block;
        width: auto;
        height: auto;
        max-width: 80vw;
        max-height: calc(90vh - 150px);
      }
    }

    .viewer-close {
      position: absolute;
      top: -30px;
      right: -30px;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .viewer-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      cursor: pointer;
      padding: 16px 8px;
      border-radius: 4px;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      &.prev {
        left: -60px;
      }

      &.next {
        right: -60px;
      }
    }

    .viewer-info {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 16px 24px;
      min-width: 400px;
    }

    .viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .viewer-time {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .viewer-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--text-tertiary);
      }
    }

    .viewer-actions {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--glass-border);
      display: flex;
      justify-content: center;
    }

    .download-single-btn {
      background: var(--accent-primary);
      color: white;
      display: flex;
      align-items: center;
      gap: 6px;

      mat-icon, mat-spinner {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .export-btn {
      color: var(--text-primary);
      border-color: var(--glass-border);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      &:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
      }
    }

    @media (max-width: 900px) {
      .picture-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .left-panel {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 12px;
        overflow-x: auto;
      }

      .filter-section {
        min-width: 150px;
      }

      .stats-section {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
        flex-direction: row;
        gap: 16px;
      }

      .viewer-nav {
        &.prev { left: 10px; }
        &.next { right: 10px; }
      }

      .viewer-info {
        min-width: unset;
        width: 100%;
      }
    }
  `]
})
export class PictureComponent implements OnInit {
  private alarmService = inject(AlarmService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Filters
  searchQuery = '';
  selectedType = '';
  selectedCamera = '';
  startDate = '';
  endDate = '';
  selectAll = false;
  viewMode: 'grid' | 'list' = 'grid';

  // State
  loading = signal(false);
  downloading = signal(false);
  currentPage = signal(1);
  pageSize = 20;

  // All pictures (alarms with images)
  private allPictures = signal<AlarmPicture[]>([]);

  // Viewer
  viewerOpen = signal(false);
  viewerIndex = signal(0);

  // Derived values
  alarmTypes = computed(() => {
    const types = new Set<string>();
    this.allPictures().forEach(p => types.add(p.alarm.alarm_type));
    return Array.from(types).sort();
  });

  cameras = computed(() => {
    const cameras = new Set<string>();
    this.allPictures().forEach(p => {
      if (p.alarm.camera_name) cameras.add(p.alarm.camera_name);
    });
    return Array.from(cameras).sort();
  });

  filteredPictures = computed(() => {
    let pics = this.allPictures();

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      pics = pics.filter(p =>
        (p.alarm.camera_name?.toLowerCase().includes(query)) ||
        (p.alarm.location?.toLowerCase().includes(query)) ||
        (p.alarm.alarm_type?.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (this.selectedType) {
      pics = pics.filter(p => p.alarm.alarm_type === this.selectedType);
    }

    // Camera filter
    if (this.selectedCamera) {
      pics = pics.filter(p => p.alarm.camera_name === this.selectedCamera);
    }

    // Date filters
    if (this.startDate) {
      const start = new Date(this.startDate);
      pics = pics.filter(p => new Date(p.alarm.alarm_time) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      pics = pics.filter(p => new Date(p.alarm.alarm_time) <= end);
    }

    return pics;
  });

  totalPages = computed(() => Math.ceil(this.filteredPictures().length / this.pageSize) || 1);

  paginatedPictures = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredPictures().slice(start, start + this.pageSize);
  });

  selectedCount = computed(() => this.allPictures().filter(p => p.selected).length);

  currentViewerPic = computed(() => {
    const pics = this.filteredPictures();
    return pics[this.viewerIndex()] || null;
  });

  ngOnInit() {
    this.loadAlarms();
  }

  loadAlarms() {
    this.loading.set(true);

    // Load alarms with images (limit to recent 500)
    this.alarmService.loadAlarms({ limit: 500 });

    // Subscribe to alarms and filter those with images
    setTimeout(() => {
      const alarms = this.alarmService.alarms();
      const pictures: AlarmPicture[] = [];

      for (const alarm of alarms) {
        // Use getBestAlarmImageUrl to prefer labeled images (with detection boxes)
        const imageUrl = getBestAlarmImageUrl(alarm);
        if (imageUrl) {
          pictures.push({
            alarm,
            imageUrl,
            selected: false
          });
        }
      }

      this.allPictures.set(pictures);
      this.loading.set(false);
      this.currentPage.set(1);
    }, 500);
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  toggleSelection(pic: AlarmPicture) {
    pic.selected = !pic.selected;
    // Trigger signal update
    this.allPictures.update(pics => [...pics]);
  }

  onCheckboxChange(pic: AlarmPicture, checked: boolean) {
    pic.selected = checked;
    // Trigger signal update so computed signals recalculate
    this.allPictures.update(pics => [...pics]);
  }

  toggleSelectAll() {
    const pics = this.filteredPictures();
    pics.forEach(p => p.selected = this.selectAll);
    // Trigger signal update
    this.allPictures.update(pics => [...pics]);
  }

  getSeverityClass(alarmType: string): string {
    return getAlarmSeverity(alarmType);
  }

  formatTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ago`;
    }
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  }

  formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
  }

  // Pagination
  goToPage(page: number) {
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  // Viewer
  openViewer(pic: AlarmPicture) {
    const index = this.filteredPictures().indexOf(pic);
    if (index >= 0) {
      this.viewerIndex.set(index);
      this.viewerOpen.set(true);
    }
  }

  closeViewer() {
    this.viewerOpen.set(false);
  }

  canViewerPrev(): boolean {
    return this.viewerIndex() > 0;
  }

  canViewerNext(): boolean {
    return this.viewerIndex() < this.filteredPictures().length - 1;
  }

  viewerPrev() {
    if (this.canViewerPrev()) {
      this.viewerIndex.update(i => i - 1);
    }
  }

  viewerNext() {
    if (this.canViewerNext()) {
      this.viewerIndex.update(i => i + 1);
    }
  }

  // Download single image
  async downloadSingleImage(alarm: Alarm) {
    this.downloading.set(true);
    try {
      const response = await fetch(`${this.apiUrl}/alarms/${alarm.id}/download-image`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hse_access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download image');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alarm_${alarm.alarm_type}_${new Date(alarm.alarm_time).toISOString().slice(0, 19).replace(/[:-]/g, '')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
      alert('Failed to download image');
    } finally {
      this.downloading.set(false);
    }
  }

  // Bulk download as ZIP
  async bulkDownload() {
    const selectedPics = this.allPictures().filter(p => p.selected);
    if (selectedPics.length === 0) return;

    this.downloading.set(true);
    try {
      const alarmIds = selectedPics.map(p => p.alarm.id);

      const response = await fetch(`${this.apiUrl}/alarms/bulk-download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hse_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alarmIds)
      });

      if (!response.ok) {
        throw new Error('Failed to download images');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bukti_foto_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clear selection after download
      this.allPictures().forEach(p => p.selected = false);
      this.selectAll = false;
    } catch (err) {
      console.error('Failed to bulk download:', err);
      alert('Failed to download images');
    } finally {
      this.downloading.set(false);
    }
  }

  // Export to Excel
  async exportToExcel() {
    this.downloading.set(true);
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      if (this.selectedType) params.append('alarm_type', this.selectedType);
      if (this.selectedCamera) params.append('camera_id', this.selectedCamera);
      if (this.startDate) params.append('start_date', this.startDate);
      if (this.endDate) params.append('end_date', this.endDate);
      params.append('limit', '50'); // Limit to 50 images for faster export

      const url = `${this.apiUrl}/alarms/export/excel-images${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[Export] Starting Excel export:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('hse_access_token')}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Export] Server error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Empty response from server');
      }

      console.log('[Export] Received blob:', blob.size, 'bytes');
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `bukti_foto_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      console.log('[Export] Download triggered successfully');
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Gagal export ke Excel. Silakan coba lagi atau kurangi jumlah data dengan filter.');
    } finally {
      this.downloading.set(false);
    }
  }
}
