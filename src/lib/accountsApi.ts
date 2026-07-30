import { api } from "./api";

export interface ApiAccount {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  phone?: string | null;
  status: "Active" | "Suspended" | "Pending" | "Inactive" | "Cancelled";
  plan?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; stations: number };
}

export interface ApiAccountUser {
  id: string;
  name: string;
  email: string;
  activeRole: string;
  status: string;
  createdAt: string;
}

export interface ApiAccountStation {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface ApiAccountDetail extends ApiAccount {
  users: ApiAccountUser[];
  stations: ApiAccountStation[];
  adminUser?: {
    id: string;
    name: string;
    email: string;
    status: string;
  } | null;
}

export const accountsApi = {
  list(params: { status?: string; page?: number; limit?: number } = {}) {
    const p = new URLSearchParams();
    if (params.status) p.set("status", params.status);
    if (params.page)   p.set("page",   String(params.page));
    if (params.limit)  p.set("limit",  String(params.limit));
    const qs = p.toString();
    return api.get<{ success: boolean; data: ApiAccount[]; meta: { total: number; page: number; limit: number; pages: number } }>(
      `/accounts${qs ? `?${qs}` : ""}`,
    );
  },

  get(id: string) {
    return api.get<{ success: boolean; data: ApiAccountDetail }>(`/accounts/${id}`);
  },

  create(body: { name: string; contactEmail: string; adminName: string; adminEmail: string; phone?: string; plan?: string }) {
    return api.post<{ success: boolean; message: string; data: { account: ApiAccount; adminUser: object }; emailSent?: boolean; emailError?: string }>(
      "/accounts",
      body,
    );
  },

  update(id: string, data: { name?: string; contactEmail?: string; contactPhone?: string }) {
    return api.put<{ success: boolean; data: ApiAccount }>(`/accounts/${id}`, data);
  },

  updateStatus(id: string, status: ApiAccount["status"]) {
    return api.put<{ success: boolean; data: ApiAccount }>(`/accounts/${id}/status`, { status });
  },

  resendInvite(id: string) {
    return api.post<{ success: boolean; message: string; emailSent?: boolean; emailError?: string }>(`/accounts/${id}/resend-invite`, {});
  },
};
