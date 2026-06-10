import { api } from "./api";

type R<T> = { success: boolean; data: T };

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApiClient {
  id: string;
  stationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  type: string;
  modules: string[];
  notes?: string | null;
  totalSpent: number;
  visits: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClientOrder {
  id: string;
  stationId: string;
  clientId?: string | null;
  clientName: string;
  orderRef: string;
  module: string;
  description: string;
  amount: number;
  paymentMethod: string;
  status: string;
  orderDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCoupon {
  id: string;
  stationId: string;
  code: string;
  module: string;
  discountType: string;
  discountValue: number;
  minSpend: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ── Client API ─────────────────────────────────────────────────────────────────

export const clientsApi = {
  clients: {
    list: (stationId?: string | null, params?: { status?: string; type?: string }) => {
      const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : "";
      return api.get<R<ApiClient[]>>(`/crm/clients${qs}`, sh(stationId));
    },
    create: (body: Partial<ApiClient> & { stationId?: string }, stationId?: string | null) =>
      api.post<R<ApiClient>>("/crm/clients", body, sh(stationId)),
    update: (id: string, body: Partial<ApiClient>) =>
      api.put<R<ApiClient>>(`/crm/clients/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/crm/clients/${id}`),
  },

  coupons: {
    list: (stationId?: string | null, params?: { status?: string; module?: string }) => {
      const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : "";
      return api.get<R<ApiCoupon[]>>(`/crm/coupons${qs}`, sh(stationId));
    },
    create: (body: Partial<ApiCoupon>, stationId?: string | null) =>
      api.post<R<ApiCoupon>>("/crm/coupons", body, sh(stationId)),
    update: (id: string, body: Partial<ApiCoupon>) =>
      api.put<R<ApiCoupon>>(`/crm/coupons/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/crm/coupons/${id}`),
  },

  orders: {
    list: (stationId?: string | null, params?: { status?: string; module?: string; clientId?: string; page?: number; limit?: number }) => {
      const p = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
      const qs = p.toString() ? `?${p.toString()}` : "";
      return api.get<R<ApiClientOrder[]> & { meta?: any }>(`/crm/orders${qs}`, sh(stationId));
    },
    create: (body: Partial<ApiClientOrder>, stationId?: string | null) =>
      api.post<R<ApiClientOrder>>("/crm/orders", body, sh(stationId)),
    update: (id: string, body: Partial<ApiClientOrder>) =>
      api.put<R<ApiClientOrder>>(`/crm/orders/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/crm/orders/${id}`),
  },
};
