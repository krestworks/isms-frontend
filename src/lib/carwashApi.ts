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

export interface ApiCarwashSale {
  id: string; stationId: string; receiptNo: string; date: string; vehicleReg: string;
  washPackage: string; attendant?: string | null; paymentMethod: string;
  amount: number; status: string; createdAt: string; updatedAt: string;
}

export interface ApiCarwashBooking {
  id: string; stationId: string; bookingRef: string; date: string; time?: string | null;
  client: string; phone?: string | null; vehicleReg: string; washPackage: string;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiCarwashStaff {
  id: string; stationId: string; name: string; phone?: string | null;
  role: string; shift: string; rating: number; washesCompleted: number;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiCarwashQueue {
  id: string; stationId: string; ticketNo: string; date: string; vehicleReg: string;
  vehicleType: string; washPackage: string; assignedTo?: string | null;
  amount: number; status: string; createdAt: string; updatedAt: string;
}

export interface ApiCarwashPackage {
  id: string; stationId: string; name: string; description?: string | null;
  duration: number; price: number; vehicleTypes: string; status: string;
  createdAt: string; updatedAt: string;
}

export const carwashApi = {
  sales: {
    list: (params: { from?: string; to?: string; status?: string; paymentMethod?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiCarwashSale[]>>(`/carwash/sales${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiCarwashSale>, stationId?: string | null) =>
      api.post<R<ApiCarwashSale>>("/carwash/sales", data, sh(stationId)),
    update: (id: string, data: Partial<ApiCarwashSale>, stationId?: string | null) =>
      api.put<R<ApiCarwashSale>>(`/carwash/sales/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/carwash/sales/${id}`, sh(stationId)),
  },
  bookings: {
    list: (params: { from?: string; to?: string; status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiCarwashBooking[]>>(`/carwash/bookings${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiCarwashBooking>, stationId?: string | null) =>
      api.post<R<ApiCarwashBooking>>("/carwash/bookings", data, sh(stationId)),
    update: (id: string, data: Partial<ApiCarwashBooking>, stationId?: string | null) =>
      api.put<R<ApiCarwashBooking>>(`/carwash/bookings/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/carwash/bookings/${id}`, sh(stationId)),
  },
  staff: {
    list: (params: { status?: string; shift?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiCarwashStaff[]>>(`/carwash/staff${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiCarwashStaff>, stationId?: string | null) =>
      api.post<R<ApiCarwashStaff>>("/carwash/staff", data, sh(stationId)),
    update: (id: string, data: Partial<ApiCarwashStaff>, stationId?: string | null) =>
      api.put<R<ApiCarwashStaff>>(`/carwash/staff/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/carwash/staff/${id}`, sh(stationId)),
  },
  queue: {
    list: (params: { from?: string; to?: string; status?: string; washPackage?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiCarwashQueue[]>>(`/carwash/queue${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiCarwashQueue>, stationId?: string | null) =>
      api.post<R<ApiCarwashQueue>>("/carwash/queue", data, sh(stationId)),
    update: (id: string, data: Partial<ApiCarwashQueue>, stationId?: string | null) =>
      api.put<R<ApiCarwashQueue>>(`/carwash/queue/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/carwash/queue/${id}`, sh(stationId)),
  },
  packages: {
    list: (params: { status?: string } = {}, stationId?: string | null) =>
      api.get<R<ApiCarwashPackage[]>>(`/carwash/packages${qs(params)}`, sh(stationId)),
    create: (data: Partial<ApiCarwashPackage>, stationId?: string | null) =>
      api.post<R<ApiCarwashPackage>>("/carwash/packages", data, sh(stationId)),
    update: (id: string, data: Partial<ApiCarwashPackage>, stationId?: string | null) =>
      api.put<R<ApiCarwashPackage>>(`/carwash/packages/${id}`, data, sh(stationId)),
    delete: (id: string, stationId?: string | null) =>
      api.delete<R<void>>(`/carwash/packages/${id}`, sh(stationId)),
  },
};
