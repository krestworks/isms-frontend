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

export interface ApiLpgCylinder {
  id: string; stationId: string; serialNo: string; size: string; weight: number;
  condition: string; status: string; buyingPrice: number; markedPrice: number;
  sellingPrice: number; supplier?: string | null; lastRefillDate?: string | null;
  location?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiLpgSale {
  id: string; stationId: string; date: string; receiptNo: string; customer?: string | null;
  cylinderSize: string; quantity: number; unitPrice: number; discount: number; totalAmount: number;
  paymentMethod: string; paymentStatus: string; attendant?: string | null; exchangeType: string;
  createdAt: string; updatedAt: string;
}

export interface ApiLpgRefill {
  id: string; stationId: string; date: string; batchNo: string; cylinderSize: string;
  quantity: number; costPerUnit: number; totalCost: number; supplier: string;
  receivedBy?: string | null; status: string; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiLpgSupplier {
  id: string; stationId: string; name: string; contactPerson?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  cylinderTypes?: string | null; paymentTerms: string; rating: number; status: string;
  totalOrders: number; lastOrderDate?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiLpgOrder {
  id: string; stationId: string; orderNo: string; date: string; client: string;
  clientPhone?: string | null; cylinderSize: string; quantity: number; unitPrice: number;
  totalAmount: number; orderStatus: string; paymentStatus: string; paymentMethod: string;
  processedBy?: string | null; deliveredBy?: string | null; deliveryAddress?: string | null;
  deliveryDate?: string | null; notes?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiLpgInvoiceItem { description: string; qty: number; unitPrice: number; discount?: number; total: number; }
export interface ApiLpgInvoice {
  id: string; stationId: string; invoiceNo: string; date: string; dueDate?: string | null;
  client: string; clientPhone?: string | null; clientAddress?: string | null;
  items: ApiLpgInvoiceItem[]; subtotal: number; vatRate: number; vatAmount: number;
  discount: number; totalAmount: number; paymentStatus: string; paymentMethod: string;
  paidDate?: string | null; type: string; createdAt: string; updatedAt: string;
}

export interface ApiLpgSummary {
  todayRevenue: number; todayTransactions: number;
  fullCylinders: number; emptyCylinders: number; damagedCylinders: number; totalCylinders: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const lpgApi = {
  summary: (stationId?: string | null) =>
    api.get<R<ApiLpgSummary>>("/lpg/summary", sh(stationId)),

  cylinders: {
    list: (params: { condition?: string; status?: string; size?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgCylinder[]>>(`/lpg/cylinders${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgCylinder>, stationId?: string | null) =>
      api.post<R<ApiLpgCylinder>>("/lpg/cylinders", data, sh(stationId)),
    update: (id: string, data: Partial<ApiLpgCylinder>, stationId?: string | null) =>
      api.put<R<ApiLpgCylinder>>(`/lpg/cylinders/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/lpg/cylinders/${id}`, sh(stationId)),
  },

  sales: {
    list: (params: { from?: string; to?: string; cylinderSize?: string; paymentStatus?: string; exchangeType?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgSale[]>>(`/lpg/sales${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgSale> & { date: string; cylinderSize: string; unitPrice: number }, stationId?: string | null) =>
      api.post<R<ApiLpgSale>>("/lpg/sales", data, sh(stationId)),
    void: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/lpg/sales/${id}`, sh(stationId)),
  },

  refills: {
    list: (params: { from?: string; to?: string; cylinderSize?: string; status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgRefill[]>>(`/lpg/refills${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgRefill>, stationId?: string | null) =>
      api.post<R<ApiLpgRefill>>("/lpg/refills", data, sh(stationId)),
    update: (id: string, data: Partial<ApiLpgRefill>, stationId?: string | null) =>
      api.put<R<ApiLpgRefill>>(`/lpg/refills/${id}`, data, sh(stationId)),
  },

  suppliers: {
    list: (params: { status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgSupplier[]>>(`/lpg/suppliers${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgSupplier>, stationId?: string | null) =>
      api.post<R<ApiLpgSupplier>>("/lpg/suppliers", data, sh(stationId)),
    update: (id: string, data: Partial<ApiLpgSupplier>, stationId?: string | null) =>
      api.put<R<ApiLpgSupplier>>(`/lpg/suppliers/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/lpg/suppliers/${id}`, sh(stationId)),
  },

  orders: {
    list: (params: { from?: string; to?: string; orderStatus?: string; paymentStatus?: string; cylinderSize?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgOrder[]>>(`/lpg/orders${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgOrder>, stationId?: string | null) =>
      api.post<R<ApiLpgOrder>>("/lpg/orders", data, sh(stationId)),
    update: (id: string, data: Partial<ApiLpgOrder>, stationId?: string | null) =>
      api.put<R<ApiLpgOrder>>(`/lpg/orders/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/lpg/orders/${id}`, sh(stationId)),
  },

  invoices: {
    list: (params: { paymentStatus?: string; type?: string; from?: string; to?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiLpgInvoice[]>>(`/lpg/invoices${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiLpgInvoice>, stationId?: string | null) =>
      api.post<R<ApiLpgInvoice>>("/lpg/invoices", data, sh(stationId)),
    update: (id: string, data: Partial<ApiLpgInvoice>, stationId?: string | null) =>
      api.put<R<ApiLpgInvoice>>(`/lpg/invoices/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/lpg/invoices/${id}`, sh(stationId)),
    email: (id: string, data: { email: string; name?: string }, stationId?: string | null) =>
      api.post<R<{ dev?: boolean }>>(`/lpg/invoices/${id}/email`, data, sh(stationId)),
  },
};
