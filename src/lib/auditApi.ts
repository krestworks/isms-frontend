import { api } from "./api";

type R<T> = { success: boolean; data: T; message?: string };

export interface ApiAuditLogEntry {
  id: string;
  userId: string;
  action: string;
  subject: string;
  detail: string;
  module: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const auditApi = {
  /** Per-module audit/history trail — currently populated by the approval workflow. */
  list: (module: string, params: { entityType?: string; entityId?: string; limit?: string } = {}) =>
    api.get<R<ApiAuditLogEntry[]>>(`/audit${qs({ module, ...params })}`),
};
