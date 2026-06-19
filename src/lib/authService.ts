import { api, setAccessToken } from "./api";
import type { Role, SessionUser } from "@/data/sessionStore";
import type { AccountBranding } from "@/data/brandingStore";

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: SessionUser;
  };
}

export interface AuthUser extends SessionUser {
  status: string;
  createdAt?: string;
}

export interface ApiUserResponse {
  success: boolean;
  data: { user: AuthUser };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/auth/login", { email, password }, { skipAuth: true });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<AuthUser> {
    const res = await api.get<ApiUserResponse>("/auth/me");
    return res.data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put("/auth/change-password", { currentPassword, newPassword });
    setAccessToken(null);
  },

  async forgotPassword(email: string): Promise<{ message: string; dev_otp?: string }> {
    const res = await api.post<{ success: boolean; message: string; dev_otp?: string }>(
      "/auth/password/reset",
      { email },
      { skipAuth: true },
    );
    return res;
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post("/auth/password/confirm", { token, password }, { skipAuth: true });
  },

  async switchRole(role: Role): Promise<LoginResponse> {
    const res = await api.put<LoginResponse>("/auth/switch-role", { role });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res;
  },

  async getMyAccount(): Promise<AccountBranding | null> {
    const res = await api.get<{ success: boolean; data: AccountBranding | null }>("/auth/my-account");
    return res.data ?? null;
  },

  async updateMyAccount(data: Partial<AccountBranding>): Promise<AccountBranding> {
    const res = await api.put<{ success: boolean; data: AccountBranding }>("/auth/my-account", data);
    return res.data;
  },
};
