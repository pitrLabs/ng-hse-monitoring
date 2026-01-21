import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, RoleCreate, RoleUpdate, Permission, PermissionCreate } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  // Roles
  getRoles(skip = 0, limit = 100): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl, { params: { skip, limit } });
  }

  getRole(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`);
  }

  createRole(data: RoleCreate): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, data);
  }

  updateRole(id: string, data: RoleUpdate): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${id}`, data);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Permissions
  getPermissions(skip = 0, limit = 100): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`, { params: { skip, limit } });
  }

  createPermission(data: PermissionCreate): Observable<Permission> {
    return this.http.post<Permission>(`${this.apiUrl}/permissions`, data);
  }

  deletePermission(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/permissions/${id}`);
  }
}
