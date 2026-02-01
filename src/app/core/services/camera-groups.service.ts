import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CameraGroup {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

export interface CameraGroupUpdate {
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CameraGroupsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // State
  private _groups = signal<CameraGroup[]>([]);
  private _loading = signal(false);

  // Public signals
  readonly groups = this._groups.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed map for quick lookup by name
  readonly groupsMap = computed(() => {
    const map = new Map<string, CameraGroup>();
    this._groups().forEach(g => map.set(g.name, g));
    return map;
  });

  /**
   * Get display name for a group
   * Returns custom display_name if set, otherwise returns original name
   */
  getDisplayName(groupName: string): string {
    const group = this.groupsMap().get(groupName);
    return group?.display_name || groupName;
  }

  /**
   * Load all camera groups from API
   */
  loadGroups(): void {
    this._loading.set(true);
    this.http.get<CameraGroup[]>(`${this.apiUrl}/locations/groups`).subscribe({
      next: (groups) => {
        this._groups.set(groups);
        this._loading.set(false);
      },
      error: (err) => {
        console.error('[CameraGroupsService] Failed to load groups:', err);
        this._loading.set(false);
      }
    });
  }

  /**
   * Create or update a group (upsert)
   * Used to ensure a group exists when cameras are loaded
   */
  upsertGroup(name: string, displayName?: string): Promise<CameraGroup> {
    return new Promise((resolve, reject) => {
      let params = new HttpParams().set('name', name);
      if (displayName) {
        params = params.set('display_name', displayName);
      }

      this.http.post<CameraGroup>(`${this.apiUrl}/locations/groups/upsert`, null, { params }).subscribe({
        next: (group) => {
          // Update local state
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
   * Update a group (rename display name)
   */
  updateGroup(groupId: string, update: CameraGroupUpdate): Promise<CameraGroup> {
    return new Promise((resolve, reject) => {
      this.http.patch<CameraGroup>(`${this.apiUrl}/locations/groups/${groupId}`, update).subscribe({
        next: (group) => {
          // Update local state
          this._groups.update(groups => {
            return groups.map(g => g.id === groupId ? group : g);
          });
          resolve(group);
        },
        error: reject
      });
    });
  }

  /**
   * Rename a group by its original name
   */
  renameGroup(originalName: string, newDisplayName: string): Promise<CameraGroup> {
    const group = this.groupsMap().get(originalName);
    if (!group) {
      // Group doesn't exist in DB yet, create it
      return this.upsertGroup(originalName, newDisplayName);
    }
    return this.updateGroup(group.id, { display_name: newDisplayName });
  }

  /**
   * Delete a group
   */
  deleteGroup(groupId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/locations/groups/${groupId}`).subscribe({
        next: () => {
          this._groups.update(groups => groups.filter(g => g.id !== groupId));
          resolve();
        },
        error: reject
      });
    });
  }

  /**
   * Sync groups from a list of group names
   * Creates any missing groups in the database
   */
  async syncGroups(groupNames: string[]): Promise<void> {
    const existingNames = new Set(this._groups().map(g => g.name));
    const missingNames = groupNames.filter(name => !existingNames.has(name));

    // Create missing groups
    for (const name of missingNames) {
      try {
        await this.upsertGroup(name);
      } catch (err) {
        console.warn(`[CameraGroupsService] Failed to create group ${name}:`, err);
      }
    }
  }
}
