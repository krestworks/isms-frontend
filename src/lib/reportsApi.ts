import { api } from "./api";

type R<T> = { success: boolean; data: T };

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface ApiReportTemplate {
  id: string;
  stationId: string;
  name: string;
  module: string;
  frequency: string;
  sections: string;
  status: string;
  lastUsed?: string | null;
  createdAt: string;
}

export interface ApiGeneratedReport {
  id: string;
  stationId: string;
  title: string;
  type: string;
  module: string;
  period: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  fileSize?: string | null;
  status: string;
  createdAt: string;
}

export interface ApiScheduledReport {
  id: string;
  stationId: string;
  name: string;
  type: string;
  frequency: string;
  modules: string;
  recipients: string;
  lastRun?: string | null;
  nextRun?: string | null;
  status: string;
}

export const reportsApi = {
  templates: {
    list: (stationId?: string | null) =>
      api.get<R<ApiReportTemplate[]>>("/reports/templates", sh(stationId)),
    create: (body: Partial<ApiReportTemplate>, stationId?: string | null) =>
      api.post<R<ApiReportTemplate>>("/reports/templates", body, sh(stationId)),
    update: (id: string, body: Partial<ApiReportTemplate>) =>
      api.put<R<ApiReportTemplate>>(`/reports/templates/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/templates/${id}`),
  },

  generated: {
    list: (stationId?: string | null, params?: { type?: string; module?: string; status?: string }) =>
      api.get<R<ApiGeneratedReport[]>>(`/reports/generated${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiGeneratedReport>, stationId?: string | null) =>
      api.post<R<ApiGeneratedReport>>("/reports/generated", body, sh(stationId)),
    update: (id: string, body: Partial<ApiGeneratedReport>) =>
      api.put<R<ApiGeneratedReport>>(`/reports/generated/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/generated/${id}`),
  },

  scheduled: {
    list: (stationId?: string | null, params?: { status?: string }) =>
      api.get<R<ApiScheduledReport[]>>(`/reports/scheduled${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiScheduledReport>, stationId?: string | null) =>
      api.post<R<ApiScheduledReport>>("/reports/scheduled", body, sh(stationId)),
    update: (id: string, body: Partial<ApiScheduledReport>) =>
      api.put<R<ApiScheduledReport>>(`/reports/scheduled/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/scheduled/${id}`),
  },
};
