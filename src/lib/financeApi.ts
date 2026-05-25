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

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApiFinanceRevenue {
  id: string;
  stationId: string;
  date: string;
  module: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFinanceExpense {
  id: string;
  stationId: string;
  date: string;
  module: string;
  category: string;
  vendor?: string | null;
  description: string;
  amount: number;
  paymentMethod: string;
  approvedBy?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPLByModule {
  module: string;
  revenue: number;
  cogs: number;
  opex: number;
}

export interface ApiProfitLoss {
  byModule: ApiPLByModule[];
  totalRevenue: number;
  totalCogs: number;
  generalOpex: number;
  grossProfit: number;
  netProfit: number;
}

// ── Finance API ────────────────────────────────────────────────────────────────

export const financeApi = {
  revenue: {
    list: (stationId?: string | null, params?: { from?: string; to?: string; module?: string; status?: string }) =>
      api.get<R<ApiFinanceRevenue[]>>(`/finance/revenue${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiFinanceRevenue>, stationId?: string | null) =>
      api.post<R<ApiFinanceRevenue>>("/finance/revenue", body, sh(stationId)),
    update: (id: string, body: Partial<ApiFinanceRevenue>) =>
      api.put<R<ApiFinanceRevenue>>(`/finance/revenue/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/finance/revenue/${id}`),
  },

  expenses: {
    list: (stationId?: string | null, params?: { from?: string; to?: string; module?: string; status?: string; category?: string }) =>
      api.get<R<ApiFinanceExpense[]>>(`/finance/expenses${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiFinanceExpense>, stationId?: string | null) =>
      api.post<R<ApiFinanceExpense>>("/finance/expenses", body, sh(stationId)),
    update: (id: string, body: Partial<ApiFinanceExpense>) =>
      api.put<R<ApiFinanceExpense>>(`/finance/expenses/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/finance/expenses/${id}`),
  },

  pl: (stationId?: string | null, params?: { from?: string; to?: string }) =>
    api.get<R<ApiProfitLoss>>(`/finance/pl${qs(params ?? {})}`, sh(stationId)),

  budgets: {
    list: (stationId?: string | null, params?: { year?: string; month?: string }) =>
      api.get<R<ApiBudget[]>>(`/finance/budgets${qs(params ?? {})}`, sh(stationId)),
    upsert: (body: { year: number; month: number; module: string; metric: string; amount: number }, stationId?: string | null) =>
      api.post<R<ApiBudget>>("/finance/budgets", body, sh(stationId)),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/finance/budgets/${id}`),
  },

  variance: (stationId?: string | null, params?: { year?: string; month?: string }) =>
    api.get<R<ApiVariance>>(`/finance/variance${qs(params ?? {})}`, sh(stationId)),
};

export interface ApiBudget {
  id: string;
  stationId: string;
  year: number;
  month: number;
  module: string;
  metric: string;
  amount: number;
}

export interface ApiVarianceRow {
  module: string;
  metric: string;
  budget: number;
  actual: number;
}

export interface ApiVariance {
  rows: ApiVarianceRow[];
  year: number;
  month: number;
}
