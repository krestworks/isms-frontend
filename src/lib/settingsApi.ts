import { api } from "./api";

type R<T> = { success: boolean; data: T };

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

export interface BusinessConfig {
  name: string;
  registration: string;
  pin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  tagline: string;
}

export interface VatConfig {
  currency: string;
  currencySymbol: string;
  vatEnabled: boolean;
  defaultRate: number;
  invoicePrefix: string;
  receiptPrefix: string;
}

export interface ApiVatRate {
  id: string;
  stationId: string;
  name: string;
  rate: number;
  appliesTo: string;
  status: string;
}

export const settingsApi = {
  config: {
    get: <T>(section: string, stationId?: string | null) =>
      api.get<R<T>>(`/settings/config/${section}`, sh(stationId)),
    set: <T>(section: string, body: T, stationId?: string | null) =>
      api.put<R<T>>(`/settings/config/${section}`, body as object, sh(stationId)),
  },

  vatRates: {
    list: (stationId?: string | null) =>
      api.get<R<ApiVatRate[]>>("/settings/vat-rates", sh(stationId)),
    create: (body: Omit<ApiVatRate, "id" | "stationId">, stationId?: string | null) =>
      api.post<R<ApiVatRate>>("/settings/vat-rates", body, sh(stationId)),
    update: (id: string, body: Partial<Omit<ApiVatRate, "id" | "stationId">>) =>
      api.put<R<ApiVatRate>>(`/settings/vat-rates/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/settings/vat-rates/${id}`),
  },
};
