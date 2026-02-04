import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CameraGroup {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CameraGroupsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // State
  private _groups = signal<CameraGroup[]>([]);
  private _assignments = signal<Record<string, string>>({}); // {video_source_id: group_id}
  private _loading = signal(false);

  // Public signals
  readonly groups = this._groups.asReadonly();
  readonly assignments = this._assignments.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed map for quick lookup by id
  readonly groupsById = computed(() => {
    const map = new Map<string, CameraGroup>();
    this._groups().forEach(g => map.set(g.id, g));
    return map;
  });

  // Computed map for quick lookup by name
  readonly groupsMap = computed(() => {
    const map = new Map<string, CameraGroup>();
    this._groups().forEach(g => map.set(g.name, g));
    return map;
  });

  /**
   * Get the group_id for a given video source (per-user assignment)
   */
  getAssignedGroupId(videoSourceId: string): string | null {
    return this._assignments()[videoSourceId] || null;
  }

  /**
   * Get display name for a group
   */
  getDisplayName(groupName: string): string {
    const group = this.groupsMap().get(groupName);
    return group?.display_name || groupName;
  }

  /**
   * Load current user's personal folders and assignments
   */
  loadGroups(): void {
    this._loading.set(true);
    // Load groups and assignments in parallel
    this.http.get<CameraGroup[]>(`${this.apiUrl}/locations/groups/my`).subscribe({
      next: (groups) => {
        this._groups.set(groups);
        this._loading.set(false);
      },
      error: (err) => {
        console.error('[CameraGroupsService] Failed to load groups:', err);
        this._loading.set(false);
      }
    });

    this.loadAssignments();
  }

  /**
   * Load current user's camera-to-group assignments
   */
  loadAssignments(): void {
    this.http.get<{ assignments: Record<string, string> }>(`${this.apiUrl}/locations/groups/my/assignments`).subscribe({
      next: (res) => {
        this._assignments.set(res.assignments || {});
      },
      error: (err) => {
        console.error('[CameraGroupsService] Failed to load assignments:', err);
        this._assignments.set({});
      }
    });
  }

  /**
   * Create a personal folder (upsert by name)
   */
  createGroup(name: string, displayName?: string): Promise<CameraGroup> {
    return new Promise((resolve, reject) => {
      let params = new HttpParams().set('name', name);
      if (displayName) {
        params = params.set('display_name', displayName);
      }

      this.http.post<CameraGroup>(`${this.apiUrl}/locations/groups/my`, null, { params }).subscribe({
        next: (group) => {
          this._groups.update(groups => {
            const index = groups.findIndex(g => g.name === name);
            if (index >= 0) {
              const updated = [...groups];
              updated[index] = group;
              return updated;
            }
            return [...groups, group];
          });
          resolve(group);
        },
        error: reject
      });
    });
  }

  /**
   * Rename a personal folder
   */
  renameGroup(groupId: string, newDisplayName: string): Promise<CameraGroup> {
    return new Promise((resolve, reject) => {
      const params = new HttpParams().set('display_name', newDisplayName);
      this.http.patch<CameraGroup>(`${this.apiUrl}/locations/groups/my/${groupId}`, null, { params }).subscribe({
        next: (group) => {
          this._groups.update(groups => groups.map(g => g.id === groupId ? group : g));
          resolve(group);
        },
        error: reject
      });
    });
  }

  /**
   * Delete a personal folder (also removes its assignments)
   */
  deleteGroup(groupId: string): Promise<{ message: string }> {
    return new Promise((resolve, reject) => {
      this.http.delete<{ message: string }>(`${this.apiUrl}/locations/groups/my/${groupId}`).subscribe({
        next: (result) => {
          this._groups.update(groups => groups.filter(g => g.id !== groupId));
          // Remove assignments for this group
          this._assignments.update(assignments => {
            const updated = { ...assignments };
            for (const [vsId, gId] of Object.entries(updated)) {
              if (gId === groupId) delete updated[vsId];
            }
            return updated;
          });
          resolve(result);
        },
        error: reject
      });
    });
  }

  /**
   * Assign cameras to a personal folder
   */
  assignCamerasToGroup(groupId: string, videoSourceIds: string[]): Promise<{ message: string }> {
    return new Promise((resolve, reject) => {
      let params = new HttpParams().set('group_id', groupId);
      videoSourceIds.forEach(id => {
        params = params.append('video_source_ids', id);
      });

      this.http.post<{ message: string }>(`${this.apiUrl}/locations/groups/my/assign`, null, { params }).subscribe({
        next: (result) => {
          // Update local assignments
          this._assignments.update(assignments => {
            const updated = { ...assignments };
            videoSourceIds.forEach(id => { updated[id] = groupId; });
            return updated;
          });
          resolve(result);
        },
        error: reject
      });
    });
  }

  /**
   * Remove cameras from their folders (back to ungrouped)
   */
  unassignCameras(videoSourceIds: string[]): Promise<{ message: string }> {
    return new Promise((resolve, reject) => {
      let params = new HttpParams();
      videoSourceIds.forEach(id => {
        params = params.append('video_source_ids', id);
      });

      this.http.post<{ message: string }>(`${this.apiUrl}/locations/groups/my/unassign`, null, { params }).subscribe({
        next: (result) => {
          // Update local assignments
          this._assignments.update(assignments => {
            const updated = { ...assignments };
            videoSourceIds.forEach(id => { delete updated[id]; });
            return updated;
          });
          resolve(result);
        },
        error: reject
      });
    });
  }
}
