import { api } from "./api";

const sh = (stationId?: string | null): { headers: Record<string, string> } | undefined =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

type R<T> = { success: boolean; data: T; message?: string };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiWaterProduction {
  id: string; stationId: string; date: string; shift: string;
  litresProduced: number; litresWasted: number; netOutput: number;
  operator?: string | null; machineId?: string | null; status: string;
  notes?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiWaterEquipment {
  id: string; stationId: string; name: string; type: string; serialNo?: string | null;
  status: string; lastMaintenance?: string | null; nextMaintenance?: string | null;
  location?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiWaterSale {
  id: string; stationId: string; date: string; receiptNo: string; customer?: string | null;
  litres: number; pricePerLitre: number; discount: number; totalAmount: number;
  paymentMethod: string; paymentStatus: string; attendant?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiWaterOrder {
  id: string; stationId: string; orderNo: string; date: string; client: string;
  clientPhone?: string | null; litres: number; pricePerLitre: number; totalAmount: number;
  orderStatus: string; paymentStatus: string; paymentMethod: string;
  processedBy?: string | null; deliveredBy?: string | null;
  deliveryAddress?: string | null; deliveryDate?: string | null; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiWaterDistribution {
  id: string; stationId: string; date: string; vehicle?: string | null; driver?: string | null;
  destination?: string | null; litresLoaded: number; litresDelivered: number; variance: number;
  client?: string | null; status: string; departureTime?: string | null; arrivalTime?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiWaterInvoiceItem { description: string; litres: number; rate: number; amount: number; }
export interface ApiWaterInvoice {
  id: string; stationId: string; invoiceNo: string; date: string; dueDate?: string | null;
  client: string; type: string; items: ApiWaterInvoiceItem[];
  subtotal: number; vatAmount: number; totalAmount: number; status: string;
  createdAt: string; updatedAt: string;
}

export interface ApiWaterSummary {
  todayRevenue: number; todayLitresSold: number; todayProduced: number;
  totalEquipment: number; maintenanceEquipment: number;
  availableWater: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const waterApi = {
  summary: (stationId?: string | null) =>
    api.get<R<ApiWaterSummary>>("/water/summary", sh(stationId)),

  production: {
    list: (params: { from?: string; to?: string; shift?: string; status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterProduction[]>>(`/water/production${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterProduction>, stationId?: string | null) =>
      api.post<R<ApiWaterProduction>>("/water/production", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterProduction>, stationId?: string | null) =>
      api.put<R<ApiWaterProduction>>(`/water/production/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/production/${id}`, sh(stationId)),
  },

  equipment: {
    list: (params: { status?: string; type?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterEquipment[]>>(`/water/equipment${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterEquipment>, stationId?: string | null) =>
      api.post<R<ApiWaterEquipment>>("/water/equipment", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterEquipment>, stationId?: string | null) =>
      api.put<R<ApiWaterEquipment>>(`/water/equipment/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/equipment/${id}`, sh(stationId)),
  },

  sales: {
    list: (params: { from?: string; to?: string; paymentStatus?: string; paymentMethod?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterSale[]>>(`/water/sales${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterSale> & { date: string; litres: number; pricePerLitre: number }, stationId?: string | null) =>
      api.post<R<ApiWaterSale>>("/water/sales", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterSale>, stationId?: string | null) =>
      api.put<R<ApiWaterSale>>(`/water/sales/${id}`, data, sh(stationId)),
    void: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/sales/${id}`, sh(stationId)),
  },

  orders: {
    list: (params: { from?: string; to?: string; orderStatus?: string; paymentStatus?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterOrder[]>>(`/water/orders${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterOrder>, stationId?: string | null) =>
      api.post<R<ApiWaterOrder>>("/water/orders", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterOrder>, stationId?: string | null) =>
      api.put<R<ApiWaterOrder>>(`/water/orders/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/orders/${id}`, sh(stationId)),
  },

  distribution: {
    list: (params: { from?: string; to?: string; status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterDistribution[]>>(`/water/distribution${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterDistribution>, stationId?: string | null) =>
      api.post<R<ApiWaterDistribution>>("/water/distribution", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterDistribution>, stationId?: string | null) =>
      api.put<R<ApiWaterDistribution>>(`/water/distribution/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/distribution/${id}`, sh(stationId)),
  },

  invoices: {
    list: (params: { status?: string; type?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiWaterInvoice[]>>(`/water/invoices${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiWaterInvoice>, stationId?: string | null) =>
      api.post<R<ApiWaterInvoice>>("/water/invoices", data, sh(stationId)),
    update: (id: string, data: Partial<ApiWaterInvoice>, stationId?: string | null) =>
      api.put<R<ApiWaterInvoice>>(`/water/invoices/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/water/invoices/${id}`, sh(stationId)),
    email: (id: string, data: { email: string; name?: string }, stationId?: string | null) =>
      api.post<R<{ dev?: boolean }>>(`/water/invoices/${id}/email`, data, sh(stationId)),
  },
};
