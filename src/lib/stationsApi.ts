import { api } from "./api";

export interface ApiStationFull {
  id: string;
  name: string;
  type: string;
  status: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  openedOn?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

type StationForm = {
  name: string;
  type?: string;
  status?: string;
  city?: string;
  address?: string;
  phone?: string;
  openedOn?: string;
};

const qs = (params: Record<string, string | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const stationsApi = {
  list: (params?: { include_deleted?: boolean; status?: string }) =>
    api.get<{ success: boolean; data: ApiStationFull[] }>(`/stations${qs({ ...params })}`),

  get: (id: string) =>
    api.get<{ success: boolean; data: ApiStationFull & { staffCount: number } }>(`/stations/${id}`),

  create: (data: StationForm) =>
    api.post<{ success: boolean; message: string; data: ApiStationFull }>("/stations", data),

  update: (id: string, data: Partial<StationForm>) =>
    api.put<{ success: boolean; message: string; data: ApiStationFull }>(`/stations/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/stations/${id}`),

  restore: (id: string) =>
    api.post<{ success: boolean; message: string; data: ApiStationFull }>(`/stations/${id}/restore`),

  purge: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/stations/${id}/purge`),
};
