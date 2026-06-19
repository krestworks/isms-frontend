import { api } from "./api";

// ── Station header helper ─────────────────────────────────────────────────────
const sh = (stationId?: string | null): { headers: Record<string, string> } | undefined =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiFuelTank {
  id: string; stationId: string; name: string; fuelType: string;
  capacity: number; currentLevel: number; lastDipReading?: number | null;
  lastDeliveryDate?: string | null; lastDeliveryAmount?: number | null;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiFuelSale {
  id: string; stationId: string; tankId?: string | null;
  pumpNumber: number; fuelType: string; litres: number;
  pricePerLitre: number; amount: number; discount: number; netAmount: number;
  attendant?: string | null; paymentMethod: string; paymentStatus: string;
  customer?: string | null; receiptNo: string; date: string;
  tank?: { id: string; name: string } | null;
  createdAt: string; updatedAt: string;
}

export interface ApiFuelDelivery {
  id: string; stationId: string; tankId?: string | null;
  litres: number; supplier?: string | null; deliveryNote?: string | null;
  date: string; recordedBy?: string | null;
  tank?: { id: string; name: string; fuelType: string } | null;
  createdAt: string;
}

export interface ApiFuelReconciliation {
  id: string; stationId: string; date: string; fuelType: string;
  tankId?: string | null; openingStock: number; deliveries: number;
  expectedSales: number; actualSales: number;
  closingStockExpected: number; closingStockActual: number;
  variance: number; variancePct: number; status: string;
  notes?: string | null; approvedBy?: string | null; approvedAt?: string | null;
  tank?: { id: string; name: string } | null;
  createdAt: string; updatedAt: string;
}

export interface ApiFuelProduct {
  id: string; stationId: string; fuelType: string;
  buyingPrice: number; markedPrice: number; sellingPrice: number;
  reorderLevel: number; supplier?: string | null; supplierContact?: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface ApiFuelSummary {
  todayRevenue: number; todayLitres: number; todayTransactions: number;
  totalTanks: number; alertTanks: number;
}

type R<T> = { success: boolean; data: T; message?: string };

// ── API ───────────────────────────────────────────────────────────────────────

export interface ApiFuelMonthlySummary {
  month: string;
  fuel: number;
  litres: number;
  transactions: number;
}

export const fuelApi = {
  summary: (stationId?: string | null) =>
    api.get<R<ApiFuelSummary>>(`/fuel/summary`, sh(stationId)),

  monthlySummary: (months = 6, stationId?: string | null) =>
    api.get<R<ApiFuelMonthlySummary[]>>(`/fuel/sales/monthly-summary?months=${months}`, sh(stationId)),

  tanks: {
    list: (stationId?: string | null) =>
      api.get<R<ApiFuelTank[]>>("/fuel/tanks", sh(stationId)),
    create: (data: Partial<ApiFuelTank>, stationId?: string | null) =>
      api.post<R<ApiFuelTank>>("/fuel/tanks", data, sh(stationId)),
    update: (id: string, data: Partial<ApiFuelTank>, stationId?: string | null) =>
      api.put<R<ApiFuelTank>>(`/fuel/tanks/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/fuel/tanks/${id}`, sh(stationId)),
    recordDip: (id: string, reading: number, stationId?: string | null) =>
      api.post<R<ApiFuelTank>>(`/fuel/tanks/${id}/dip`, { reading }, sh(stationId)),
  },

  sales: {
    list: (params: { from?: string; to?: string; fuelType?: string; paymentMethod?: string }, stationId?: string | null) =>
      api.get<R<ApiFuelSale[]>>(`/fuel/sales${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiFuelSale> & { date: string }, stationId?: string | null) =>
      api.post<R<ApiFuelSale>>("/fuel/sales", data, sh(stationId)),
    update: (id: string, data: Partial<ApiFuelSale>, stationId?: string | null) =>
      api.put<R<ApiFuelSale>>(`/fuel/sales/${id}`, data, sh(stationId)),
    void: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/fuel/sales/${id}`, sh(stationId)),
  },

  deliveries: {
    list: (params: { from?: string; to?: string }, stationId?: string | null) =>
      api.get<R<ApiFuelDelivery[]>>(`/fuel/deliveries${qs(params)}`, sh(stationId)),
    create: (data: { tankId: string; litres: number; date: string; supplier?: string; deliveryNote?: string }, stationId?: string | null) =>
      api.post<R<ApiFuelDelivery>>("/fuel/deliveries", data, sh(stationId)),
  },

  reconciliations: {
    list: (params: { from?: string; to?: string }, stationId?: string | null) =>
      api.get<R<ApiFuelReconciliation[]>>(`/fuel/reconciliations${qs(params)}`, sh(stationId)),
    create: (data: Omit<ApiFuelReconciliation, "id"|"stationId"|"createdAt"|"updatedAt"|"approvedBy"|"approvedAt"|"tank">, stationId?: string | null) =>
      api.post<R<ApiFuelReconciliation>>("/fuel/reconciliations", data, sh(stationId)),
    approve: (id: string, stationId?: string | null) =>
      api.post<R<ApiFuelReconciliation>>(`/fuel/reconciliations/${id}/approve`, {}, sh(stationId)),
  },

  products: {
    list: (stationId?: string | null) =>
      api.get<R<ApiFuelProduct[]>>("/fuel/products", sh(stationId)),
    upsert: (data: Partial<ApiFuelProduct>, stationId?: string | null) =>
      api.put<R<ApiFuelProduct>>("/fuel/products", data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/fuel/products/${id}`, sh(stationId)),
  },
};
