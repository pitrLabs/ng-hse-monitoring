export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  user_level: number;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface UserCreate {
  username: string;
  email: string;
  full_name?: string;
  password: string;
  user_level?: number;
  role_ids?: number[];
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  user_level?: number;
  role_ids?: number[];
}

export interface RoleCreate {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

export interface PermissionCreate {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
