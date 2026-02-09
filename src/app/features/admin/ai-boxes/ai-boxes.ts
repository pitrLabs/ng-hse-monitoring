import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AIBoxService, AIBox, AIBoxCreate, AIBoxUpdate, SyncCamerasResponse } from '../../../core/services/aibox.service';

@Component({
  standalone: true,
  selector: 'app-admin-ai-boxes',
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule
  ],
  template: `
    <div class="admin-ai-boxes">
      <div class="page-header">
        <div class="header-left">
          <h2>AI Boxes</h2>
          <span class="count">{{ aiBoxes().length }} boxes</span>
        </div>
        <div class="header-right">
          <button mat-stroked-button (click)="checkHealth()" [disabled]="checkingHealth()">
            @if (checkingHealth()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>monitor_heart</mat-icon>
            }
            Check Health
          </button>
          <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add AI Box
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (aiBoxes().length === 0) {
        <div class="empty-state">
          <mat-icon>dns</mat-icon>
          <h3>No AI Boxes configured</h3>
          <p>Add your first AI Box to get started</p>
          <button mat-raised-button class="btn-primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add AI Box
          </button>
        </div>
      } @else {
        <div class="boxes-grid">
          @for (box of aiBoxes(); track box.id) {
            <div class="box-card glass-card-static">
              <div class="box-header">
                <div class="box-status" [class.online]="box.is_online" [class.offline]="!box.is_online">
                  <mat-icon>{{ box.is_online ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ box.is_online ? 'Online' : 'Offline' }}
                </div>
                <div class="box-actions">
                  <button mat-icon-button matTooltip="Sync Cameras" (click)="syncCameras(box)" [disabled]="syncing() === box.id || !box.is_online">
                    @if (syncing() === box.id) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>sync</mat-icon>
                    }
                  </button>
                  <button mat-icon-button matTooltip="Test Connection" (click)="testConnection(box)" [disabled]="testing() === box.id">
                    @if (testing() === box.id) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>wifi_tethering</mat-icon>
                    }
                  </button>
                  <button mat-icon-button matTooltip="Edit" (click)="openEditDialog(box)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="deleteBox(box)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <div class="box-info">
                <h3 class="box-name">{{ box.name }}</h3>
                <span class="box-code">{{ box.code }}</span>
              </div>

              <div class="box-details">
                <div class="detail-row">
                  <mat-icon>api</mat-icon>
                  <span class="detail-label">API:</span>
                  <span class="detail-value" [matTooltip]="box.api_url">{{ truncateUrl(box.api_url) }}</span>
                </div>
                <div class="detail-row">
                  <mat-icon>settings_ethernet</mat-icon>
                  <span class="detail-label">Alarm WS:</span>
                  <span class="detail-value" [matTooltip]="box.alarm_ws_url">{{ truncateUrl(box.alarm_ws_url) }}</span>
                </div>
                <div class="detail-row">
                  <mat-icon>videocam</mat-icon>
                  <span class="detail-label">Stream WS:</span>
                  <span class="detail-value" [matTooltip]="box.stream_ws_url">{{ truncateUrl(box.stream_ws_url) }}</span>
                </div>
              </div>

              <div class="box-footer">
                <div class="camera-count">
                  <mat-icon>videocam</mat-icon>
                  {{ box.camera_count }} cameras
                </div>
                @if (box.last_seen_at) {
                  <div class="last-seen">
                    Last seen: {{ formatDate(box.last_seen_at) }}
                  </div>
                }
              </div>

              @if (box.last_error) {
                <div class="box-error">
                  <mat-icon>error</mat-icon>
                  {{ box.last_error }}
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Create/Edit Dialog -->
      @if (dialogOpen()) {
        <div class="dialog-overlay" (click)="closeDialog()">
          <div class="dialog glass-card-static" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>{{ editingBox() ? 'Edit AI Box' : 'Add AI Box' }}</h3>
              <button mat-icon-button (click)="closeDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="dialog-body">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="formData.name" placeholder="e.g., Site Semarang">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Code</mat-label>
                <input matInput [(ngModel)]="formData.code" placeholder="e.g., SMG" style="text-transform: uppercase">
                <mat-hint>Unique identifier (uppercase letters/numbers)</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>API URL</mat-label>
                <input matInput [(ngModel)]="formData.api_url" placeholder="http://192.168.1.100:2323/api">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Alarm WebSocket URL</mat-label>
                <input matInput [(ngModel)]="formData.alarm_ws_url" placeholder="ws://192.168.1.100:2323/alarm/">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Stream WebSocket URL</mat-label>
                <input matInput [(ngModel)]="formData.stream_ws_url" placeholder="ws://192.168.1.100:2323">
              </mat-form-field>

              <mat-slide-toggle [(ngModel)]="formData.is_active" color="primary">
                Active
              </mat-slide-toggle>
            </div>

            <div class="dialog-actions">
              <button mat-button (click)="closeDialog()">Cancel</button>
              <button mat-flat-button color="primary" (click)="saveBox()" [disabled]="saving() || !isFormValid()">
                @if (saving()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  {{ editingBox() ? 'Update' : 'Create' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Dialog -->
      @if (deleteDialogOpen()) {
        <div class="dialog-overlay" (click)="closeDeleteDialog()">
          <div class="dialog delete-dialog glass-card-static" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Delete AI Box</h3>
              <button mat-icon-button (click)="closeDeleteDialog()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="dialog-body">
              <div class="delete-warning">
                <mat-icon class="warning-icon">warning</mat-icon>
                <p>Are you sure you want to delete <strong>{{ deleteTarget()?.name }}</strong>?</p>
                @if ((deleteTarget()?.camera_count || 0) > 0) {
                  <p class="subtext">This AI Box has {{ deleteTarget()?.camera_count }} linked cameras. Please unlink them first.</p>
                }
              </div>
            </div>

            <div class="dialog-actions">
              <button mat-button (click)="closeDeleteDialog()">Cancel</button>
              <button mat-flat-button color="warn" (click)="confirmDelete()" [disabled]="deleting() || (deleteTarget()?.camera_count || 0) > 0">
                @if (deleting()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  Delete
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-ai-boxes {
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .count {
          padding: 4px 12px;
          background: var(--glass-bg);
          border-radius: 20px;
          font-size: 13px;
          color: var(--text-secondary);
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 60px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      text-align: center;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--text-muted);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 24px;
        color: var(--text-secondary);
      }
    }

    .boxes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .box-card {
      padding: 20px;
      border-radius: var(--radius-md);

      .box-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .box-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }

          &.online {
            background: rgba(76, 175, 80, 0.15);
            color: #4caf50;
          }

          &.offline {
            background: rgba(244, 67, 54, 0.15);
            color: #f44336;
          }
        }

        .box-actions {
          display: flex;
          gap: 4px;
        }
      }

      .box-info {
        margin-bottom: 16px;

        .box-name {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .box-code {
          font-size: 13px;
          color: var(--accent-primary);
          font-weight: 500;
        }
      }

      .box-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;

        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: var(--text-tertiary);
          }

          .detail-label {
            color: var(--text-secondary);
            min-width: 70px;
          }

          .detail-value {
            color: var(--text-primary);
            font-family: monospace;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .box-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid var(--glass-border);
        font-size: 12px;
        color: var(--text-secondary);

        .camera-count {
          display: flex;
          align-items: center;
          gap: 4px;

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }
      }

      .box-error {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: var(--radius-sm);
        font-size: 12px;
        color: #f44336;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      border-radius: var(--radius-lg);

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
      }

      .dialog-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
      }

      .full-width {
        width: 100%;
      }
    }

    .delete-dialog {
      width: 400px;

      .delete-warning {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;

        .warning-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #ff9800;
          margin-bottom: 16px;
        }

        p {
          margin: 0;
          color: var(--text-primary);

          &.subtext {
            margin-top: 8px;
            font-size: 13px;
            color: var(--text-secondary);
          }
        }
      }
    }

    .btn-primary {
      background: var(--accent-primary) !important;
      color: white !important;
    }
  `]
})
export class AdminAiBoxesComponent implements OnInit {
  private aiBoxService = inject(AIBoxService);
  private snackBar = inject(MatSnackBar);

  aiBoxes = this.aiBoxService.aiBoxes;
  loading = this.aiBoxService.loading;

  checkingHealth = signal(false);
  testing = signal<string | null>(null);
  syncing = signal<string | null>(null);
  saving = signal(false);
  deleting = signal(false);

  dialogOpen = signal(false);
  editingBox = signal<AIBox | null>(null);

  deleteDialogOpen = signal(false);
  deleteTarget = signal<AIBox | null>(null);

  formData: AIBoxCreate = {
    name: '',
    code: '',
    api_url: '',
    alarm_ws_url: '',
    stream_ws_url: '',
    is_active: true
  };

  ngOnInit() {
    this.loadAiBoxes();
  }

  loadAiBoxes() {
    this.aiBoxService.loadAiBoxes().subscribe({
      next: () => {
        // Auto-check health to get real-time online/offline status
        this.checkHealth();
      }
    });
  }

  checkHealth() {
    this.checkingHealth.set(true);
    this.aiBoxService.getHealth().subscribe({
      next: (health) => {
        this.checkingHealth.set(false);
        // Auto-sync cameras for all online boxes
        const onlineBoxes = health.boxes.filter(b => b.is_online);
        if (onlineBoxes.length > 0) {
          this.autoSyncAllOnlineBoxes(onlineBoxes.map(b => b.id));
        }
      },
      error: () => {
        this.checkingHealth.set(false);
        this.snackBar.open('Health check failed', 'Close', { duration: 3000 });
      }
    });
  }

  private autoSyncAllOnlineBoxes(boxIds: string[]) {
    // Sync cameras for all online boxes in parallel
    boxIds.forEach(id => {
      this.aiBoxService.syncCameras(id).subscribe({
        // Silent sync - no snackbar notification
        error: (err) => console.warn(`Auto-sync failed for ${id}:`, err)
      });
    });
  }

  testConnection(box: AIBox) {
    this.testing.set(box.id);
    this.aiBoxService.testConnection(box.id).subscribe({
      next: (status) => {
        this.testing.set(null);
        if (status.is_online) {
          this.snackBar.open(`${box.name} is online (${status.latency_ms}ms)`, 'Close', { duration: 3000 });
        } else {
          this.snackBar.open(`${box.name} is offline: ${status.last_error}`, 'Close', { duration: 5000 });
        }
      },
      error: () => {
        this.testing.set(null);
        this.snackBar.open('Connection test failed', 'Close', { duration: 3000 });
      }
    });
  }

  syncCameras(box: AIBox) {
    this.syncing.set(box.id);
    this.aiBoxService.syncCameras(box.id).subscribe({
      next: (response) => {
        this.syncing.set(null);
        const msg = `Synced ${box.name}: ${response.imported} new, ${response.updated} updated, ${response.camera_count} total`;
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      },
      error: (err) => {
        this.syncing.set(null);
        this.snackBar.open(err.error?.detail || 'Sync failed', 'Close', { duration: 3000 });
      }
    });
  }

  openCreateDialog() {
    this.editingBox.set(null);
    this.formData = {
      name: '',
      code: '',
      api_url: '',
      alarm_ws_url: '',
      stream_ws_url: '',
      is_active: true
    };
    this.dialogOpen.set(true);
  }

  openEditDialog(box: AIBox) {
    this.editingBox.set(box);
    this.formData = {
      name: box.name,
      code: box.code,
      api_url: box.api_url,
      alarm_ws_url: box.alarm_ws_url,
      stream_ws_url: box.stream_ws_url,
      is_active: box.is_active
    };
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.editingBox.set(null);
  }

  isFormValid(): boolean {
    return !!(
      this.formData.name &&
      this.formData.code &&
      this.formData.api_url &&
      this.formData.alarm_ws_url &&
      this.formData.stream_ws_url
    );
  }

  saveBox() {
    if (!this.isFormValid()) return;

    this.saving.set(true);
    // Ensure code is uppercase
    this.formData.code = this.formData.code.toUpperCase();

    const editing = this.editingBox();
    if (editing) {
      this.aiBoxService.updateAiBox(editing.id, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeDialog();
          this.snackBar.open('AI Box updated', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(err.error?.detail || 'Failed to update', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.aiBoxService.createAiBox(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeDialog();
          this.snackBar.open('AI Box created', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(err.error?.detail || 'Failed to create', 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteBox(box: AIBox) {
    this.deleteTarget.set(box);
    this.deleteDialogOpen.set(true);
  }

  closeDeleteDialog() {
    this.deleteDialogOpen.set(false);
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.aiBoxService.deleteAiBox(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteDialog();
        this.snackBar.open('AI Box deleted', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.deleting.set(false);
        this.snackBar.open(err.error?.detail || 'Failed to delete', 'Close', { duration: 3000 });
      }
    });
  }

  truncateUrl(url: string): string {
    if (url.length > 40) {
      return url.substring(0, 40) + '...';
    }
    return url;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
