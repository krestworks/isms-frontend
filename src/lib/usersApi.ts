import { api } from "./api";

type R<T> = { success: boolean; data: T; meta?: { page: number; limit: number; total: number; pages: number } };

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  employeeId?: string | null;
  activeRole: string;
  isEmployee: boolean;
  homeLocation?: string | null;
  status: string;
  roles: string[];
  lastLogin?: string | null;
  createdAt: string;
}

export interface ApiRole {
  id: string;
  name: string;
  description?: string | null;
  usersCount: number;
  permissions: string[];
  status: string;
}

export const usersApi = {
  list: (params?: { status?: string; role?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.status) p.set("status", params.status);
    if (params?.role)   p.set("role",   params.role);
    if (params?.page)   p.set("page",   String(params.page));
    if (params?.limit)  p.set("limit",  String(params.limit));
    const qs = p.toString();
    return api.get<R<ApiUser[]>>(`/users${qs ? `?${qs}` : ""}`);
  },
  create: (body: { name: string; email: string; password: string; phone?: string; activeRole?: string; homeLocation?: string; roles?: string[]; isEmployee?: boolean }) =>
    api.post<R<ApiUser>>("/users", body),
  get: (id: string) =>
    api.get<R<ApiUser>>(`/users/${id}`),
  assignRoles: (id: string, roles: string[]) =>
    api.put<R<ApiUser>>(`/users/${id}/roles`, { roles }),
  updateStatus: (id: string, status: string) =>
    api.put<R<ApiUser>>(`/users/${id}/status`, { status }),
};

export const rolesApi = {
  list: () =>
    api.get<R<ApiRole[]>>("/permissions/roles"),
  create: (body: { name: string; description?: string; permissions?: string[] }) =>
    api.post<R<ApiRole>>("/permissions/roles", body),
  update: (id: string, body: { name?: string; description?: string; permissions?: string[] }) =>
    api.put<R<ApiRole>>(`/permissions/roles/${id}`, body),
  delete: (id: string) =>
    api.delete<R<{ id: string }>>(`/permissions/roles/${id}`),
};

export const allPermissionsApi = {
  list: () => api.get<R<{ permissions: Record<string, { code: string; description: string }[]>; total: number }>>("/permissions"),
};
