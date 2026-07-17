import { api } from "./api";

type R<T> = { success: boolean; data: T; message?: string };

export interface ApiApprovalRequest {
  id: string;
  module: string;
  actionKey: string;
  entityType: string;
  entityId: string;
  stationId?: string | null;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

export const approvalsApi = {
  /** Pending requests the current user can act on (excludes their own requests). */
  listActionable: (module?: string) =>
    api.get<R<ApiApprovalRequest[]>>(`/approvals${qs({ scope: "actionable", module })}`),
  /** The current user's own requests, optionally filtered by status. */
  listMine: (params: { module?: string; status?: string } = {}) =>
    api.get<R<ApiApprovalRequest[]>>(`/approvals${qs({ scope: "mine", ...params })}`),
  /** entityIds of a given entityType with a pending delete-approval request — for list-view "Pending Deletion" badges. */
  pendingIds: (entityType: string, stationId?: string | null) =>
    api.get<R<string[]>>(`/approvals/pending-ids${qs({ entityType })}`, sh(stationId)),
  approve: (id: string) => api.post<R<{ request: ApiApprovalRequest; result: unknown }>>(`/approvals/${id}/approve`),
  reject: (id: string, reason?: string) => api.post<R<ApiApprovalRequest>>(`/approvals/${id}/reject`, { reason }),
};
