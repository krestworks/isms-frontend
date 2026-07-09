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

export interface OtpRequiredResponse {
  success: boolean;
  requiresOtp: true;
  message: string;
  data: {
    otpChallenge: string;
    dev_otp?: string;
    dev_email?: unknown;
  };
}

export type LoginResult = LoginResponse | OtpRequiredResponse;

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AllSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  user: { id: string; name: string; email: string; activeRole: string };
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
  async login(email: string, password: string): Promise<LoginResult> {
    const res = await api.post<LoginResult>("/auth/login", { email, password }, { skipAuth: true });
    if ("accessToken" in res.data && res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res;
  },

  async verifyLoginOtp(otpChallenge: string, otp: string, trustDevice?: boolean): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/auth/login/otp", { otpChallenge, otp, trustDevice }, { skipAuth: true });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res;
  },

  async resendEmailVerification(email: string): Promise<{ message: string; dev_email?: unknown }> {
    return api.post("/auth/verify-email/resend", { email }, { skipAuth: true });
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

  // ── Quick-unlock PIN (POS lock screen) ───────────────────────────────────────
  async setPin(pin: string, currentPassword: string): Promise<void> {
    await api.put("/auth/pin", { pin, currentPassword });
  },
  async clearPin(): Promise<void> {
    await api.delete("/auth/pin");
  },
  async verifyPin(pin: string): Promise<void> {
    await api.post("/auth/pin/verify", { pin });
  },

  // ── Active sessions (self-service) ───────────────────────────────────────────
  async listSessions(): Promise<SessionInfo[]> {
    const res = await api.get<{ success: boolean; data: SessionInfo[] }>("/auth/sessions");
    return res.data;
  },
  async listAllSessions(): Promise<AllSessionInfo[]> {
    const res = await api.get<{ success: boolean; data: AllSessionInfo[] }>("/auth/sessions/all");
    return res.data;
  },
  async revokeSession(id: string): Promise<void> {
    await api.delete(`/auth/sessions/${id}`);
  },
};
