import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface FaceRecord {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  imageUrl: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastSeen: string;
}

@Component({
  selector: 'app-admin-face-database',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="face-database-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Face Database</h2>
          <p class="subtitle">Manage face recognition database for access control</p>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" (click)="importFaces()">
            <mat-icon>upload_file</mat-icon>
            Import
          </button>
          <button class="action-btn secondary" (click)="exportFaces()">
            <mat-icon>download</mat-icon>
            Export
          </button>
          <button class="action-btn primary" (click)="addFace()">
            <mat-icon>person_add</mat-icon>
            Add Face
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <mat-icon>people</mat-icon>
          <div class="stat-info">
            <span class="value">{{ faces().length }}</span>
            <span class="label">Total Faces</span>
          </div>
        </div>
        <div class="stat-card active">
          <mat-icon>check_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getActiveCount() }}</span>
            <span class="label">Active</span>
          </div>
        </div>
        <div class="stat-card inactive">
          <mat-icon>pause_circle</mat-icon>
          <div class="stat-info">
            <span class="value">{{ getInactiveCount() }}</span>
            <span class="label">Inactive</span>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Search by name or ID..." (input)="filterFaces()">
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filterDept" (change)="filterFaces()">
            <option value="">All Departments</option>
            @for (dept of departments; track dept) {
              <option [value]="dept">{{ dept }}</option>
            }
          </select>
          <select [(ngModel)]="filterStatus" (change)="filterFaces()">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div class="faces-grid">
        @for (face of filteredFaces(); track face.id) {
          <div class="face-card" [class]="face.status">
            <div class="face-image">
              <div class="avatar-placeholder">
                <mat-icon>person</mat-icon>
              </div>
              <span class="status-dot" [class]="face.status"></span>
            </div>
            <div class="face-info">
              <h4>{{ face.name }}</h4>
              <span class="employee-id">{{ face.employeeId }}</span>
              <span class="department">{{ face.department }}</span>
            </div>
            <div class="face-meta">
              <div class="meta-item">
                <mat-icon>add_circle</mat-icon>
                <span>{{ face.createdAt }}</span>
              </div>
              <div class="meta-item">
                <mat-icon>visibility</mat-icon>
                <span>{{ face.lastSeen }}</span>
              </div>
            </div>
            <div class="face-actions">
              <button mat-icon-button (click)="editFace(face)" matTooltip="Edit">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="viewHistory(face)" matTooltip="History">
                <mat-icon>history</mat-icon>
              </button>
              <button mat-icon-button (click)="toggleStatus(face)" [matTooltip]="face.status === 'active' ? 'Deactivate' : 'Activate'">
                <mat-icon>{{ face.status === 'active' ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteFace(face)" matTooltip="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        }
      </div>

      @if (filteredFaces().length === 0) {
        <div class="empty-state">
          <mat-icon>face</mat-icon>
          <h3>No faces found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .face-database-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left h2 { margin: 0; font-size: 24px; color: var(--text-primary); }
    .subtitle { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .header-actions { display: flex; gap: 12px; }
    .action-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .action-btn.primary { background: var(--accent-primary); color: white; }
    .action-btn.secondary { background: var(--glass-bg); color: var(--text-primary); border: 1px solid var(--glass-border); }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 12px; flex: 1; }
    .stat-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--accent-primary); }
    .stat-card.active mat-icon { color: #22c55e; }
    .stat-card.inactive mat-icon { color: #6b7280; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .value { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .stat-info .label { font-size: 12px; color: var(--text-muted); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; flex: 1; max-width: 400px; }
    .search-box mat-icon { color: var(--text-muted); font-size: 20px; width: 20px; height: 20px; }
    .search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 14px; }
    .filter-group { display: flex; gap: 12px; }
    .filter-group select { padding: 10px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); font-size: 14px; cursor: pointer; }

    .faces-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .face-card { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px; transition: all 0.2s; }
    .face-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .face-card.active { border-left: 4px solid #22c55e; }
    .face-card.inactive { border-left: 4px solid #6b7280; opacity: 0.7; }

    .face-image { position: relative; display: flex; justify-content: center; margin-bottom: 16px; }
    .avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; }
    .avatar-placeholder mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--text-muted); }
    .status-dot { position: absolute; bottom: 4px; right: calc(50% - 44px); width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--bg-primary); }
    .status-dot.active { background: #22c55e; }
    .status-dot.inactive { background: #6b7280; }

    .face-info { text-align: center; margin-bottom: 16px; }
    .face-info h4 { margin: 0 0 4px; font-size: 16px; color: var(--text-primary); }
    .employee-id { display: block; font-size: 12px; color: var(--accent-primary); font-weight: 500; margin-bottom: 4px; }
    .department { display: block; font-size: 12px; color: var(--text-muted); }

    .face-meta { display: flex; justify-content: center; gap: 16px; padding: 12px 0; border-top: 1px solid var(--glass-border); margin-bottom: 12px; }
    .meta-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
    .meta-item mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .face-actions { display: flex; justify-content: center; gap: 8px; }
    .face-actions button { color: var(--text-secondary); width: 36px; height: 36px; }
    .face-actions button mat-icon { font-size: 18px; }

    .empty-state { text-align: center; padding: 60px 20px; background: var(--glass-bg); border-radius: 16px; border: 1px solid var(--glass-border); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 16px; }
    .empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty-state p { margin: 0; color: var(--text-muted); }
  `]
})
export class AdminFaceDatabaseComponent {
  searchQuery = '';
  filterDept = '';
  filterStatus = '';
  departments = ['Engineering', 'Operations', 'Security', 'Administration', 'Logistics'];

  faces = signal<FaceRecord[]>([
    { id: '1', name: 'John Doe', employeeId: 'EMP001', department: 'Engineering', imageUrl: '', status: 'active', createdAt: 'Jan 10, 2024', lastSeen: '2 hours ago' },
    { id: '2', name: 'Jane Smith', employeeId: 'EMP002', department: 'Operations', imageUrl: '', status: 'active', createdAt: 'Jan 12, 2024', lastSeen: '1 hour ago' },
    { id: '3', name: 'Robert Johnson', employeeId: 'EMP003', department: 'Security', imageUrl: '', status: 'active', createdAt: 'Jan 8, 2024', lastSeen: '30 min ago' },
    { id: '4', name: 'Emily Davis', employeeId: 'EMP004', department: 'Administration', imageUrl: '', status: 'inactive', createdAt: 'Dec 15, 2023', lastSeen: '2 weeks ago' },
    { id: '5', name: 'Michael Wilson', employeeId: 'EMP005', department: 'Logistics', imageUrl: '', status: 'active', createdAt: 'Jan 5, 2024', lastSeen: '4 hours ago' },
    { id: '6', name: 'Sarah Brown', employeeId: 'EMP006', department: 'Engineering', imageUrl: '', status: 'active', createdAt: 'Jan 14, 2024', lastSeen: '1 day ago' }
  ]);

  filteredFaces = signal<FaceRecord[]>(this.faces());

  getActiveCount(): number { return this.faces().filter(f => f.status === 'active').length; }
  getInactiveCount(): number { return this.faces().filter(f => f.status === 'inactive').length; }

  filterFaces() {
    let result = this.faces();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.employeeId.toLowerCase().includes(q));
    }
    if (this.filterDept) {
      result = result.filter(f => f.department === this.filterDept);
    }
    if (this.filterStatus) {
      result = result.filter(f => f.status === this.filterStatus);
    }
    this.filteredFaces.set(result);
  }

  addFace() { console.log('Adding new face...'); }
  importFaces() { console.log('Importing faces...'); }
  exportFaces() { console.log('Exporting faces...'); }
  editFace(face: FaceRecord) { console.log('Editing face:', face.name); }
  viewHistory(face: FaceRecord) { console.log('Viewing history for:', face.name); }
  toggleStatus(face: FaceRecord) {
    face.status = face.status === 'active' ? 'inactive' : 'active';
    this.filterFaces();
  }
  deleteFace(face: FaceRecord) {
    if (confirm(`Delete face record for "${face.name}"?`)) {
      this.faces.update(f => f.filter(x => x.id !== face.id));
      this.filterFaces();
    }
  }
}
