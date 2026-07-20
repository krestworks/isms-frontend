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

export interface ApiAutoServiceRecord {
  id: string; stationId: string; serviceNo: string; date: string;
  vehicleReg: string; vehicleMake?: string | null; customerName: string; customerPhone?: string | null;
  serviceType: string; description?: string | null; technician?: string | null;
  estimatedCost: number; actualCost: number; status: string;
  startTime?: string | null; endTime?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiAutoBill {
  id: string; stationId: string; billNo: string; date: string; serviceRef?: string | null;
  customerName: string; vehicleReg: string; labourCharges: number; partsCost: number;
  discount: number; totalAmount: number; paymentMethod: string; paymentStatus: string;
  paidAmount: number; balance: number; createdAt: string; updatedAt: string;
}

export interface ApiAutoInvoiceItem { desc: string; qty: number; rate: number; amount: number; }
export interface ApiAutoInvoice {
  id: string; stationId: string; invoiceNo: string; date: string; dueDate?: string | null;
  type: string; client: string; vehicleReg?: string | null; serviceRef?: string | null;
  items: ApiAutoInvoiceItem[]; subtotal: number; vatAmount: number; totalAmount: number;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiAutoPart {
  id: string; stationId: string; name: string; category: string; partNumber?: string | null;
  supplier?: string | null; buyingPrice: number; sellingPrice: number;
  stockQty: number; reorderLevel: number; status: string; createdAt: string; updatedAt: string;
}

export interface ApiAutoServicePrice {
  id: string; stationId: string; serviceName: string; category: string;
  labourCost: number; partsEstimate: number; totalPrice: number;
  duration?: string | null; warranty?: string | null; status: string;
  createdAt: string; updatedAt: string;
}

export interface ApiAutoTechnician {
  id: string; stationId: string; name: string; phone?: string | null; specialization?: string | null;
  experience?: string | null; certifications?: string | null; dailyRate: number;
  jobsCompleted: number; rating: number; status: string; createdAt: string; updatedAt: string;
}

export const autoApi = {
  serviceRecords: {
    list: (params: { from?: string; to?: string; status?: string; serviceType?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoServiceRecord[]>>(`/auto/service-records${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoServiceRecord>, stationId?: string | null) =>
      api.post<R<ApiAutoServiceRecord>>("/auto/service-records", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoServiceRecord>, stationId?: string | null) =>
      api.put<R<ApiAutoServiceRecord>>(`/auto/service-records/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/service-records/${id}`, sh(stationId)),
  },
  bills: {
    list: (params: { from?: string; to?: string; paymentStatus?: string; paymentMethod?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoBill[]>>(`/auto/bills${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoBill>, stationId?: string | null) =>
      api.post<R<ApiAutoBill>>("/auto/bills", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoBill>, stationId?: string | null) =>
      api.put<R<ApiAutoBill>>(`/auto/bills/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/bills/${id}`, sh(stationId)),
  },
  invoices: {
    list: (params: { status?: string; type?: string; from?: string; to?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoInvoice[]>>(`/auto/invoices${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoInvoice>, stationId?: string | null) =>
      api.post<R<ApiAutoInvoice>>("/auto/invoices", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoInvoice>, stationId?: string | null) =>
      api.put<R<ApiAutoInvoice>>(`/auto/invoices/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/invoices/${id}`, sh(stationId)),
    email: (id: string, data: { email: string; name?: string }, stationId?: string | null) =>
      api.post<R<{ dev?: boolean }>>(`/auto/invoices/${id}/email`, data, sh(stationId)),
  },
  parts: {
    list: (params: { status?: string; category?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoPart[]>>(`/auto/parts${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoPart>, stationId?: string | null) =>
      api.post<R<ApiAutoPart>>("/auto/parts", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoPart>, stationId?: string | null) =>
      api.put<R<ApiAutoPart>>(`/auto/parts/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/parts/${id}`, sh(stationId)),
  },
  pricing: {
    list: (params: { status?: string; category?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoServicePrice[]>>(`/auto/pricing${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoServicePrice>, stationId?: string | null) =>
      api.post<R<ApiAutoServicePrice>>("/auto/pricing", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoServicePrice>, stationId?: string | null) =>
      api.put<R<ApiAutoServicePrice>>(`/auto/pricing/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/pricing/${id}`, sh(stationId)),
  },
  technicians: {
    list: (params: { status?: string; specialization?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiAutoTechnician[]>>(`/auto/technicians${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiAutoTechnician>, stationId?: string | null) =>
      api.post<R<ApiAutoTechnician>>("/auto/technicians", data, sh(stationId)),
    update: (id: string, data: Partial<ApiAutoTechnician>, stationId?: string | null) =>
      api.put<R<ApiAutoTechnician>>(`/auto/technicians/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/auto/technicians/${id}`, sh(stationId)),
  },
};
