import { api, setAccessToken, ApiError } from "./api";
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

  async resendEmailVerification(email: string): Promise<{ message: string }> {
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

  /** Re-auth confirmation step for sensitive UI actions (does not change anything). */
  async verifyPassword(password: string): Promise<void> {
    await api.post("/auth/password/verify", { password });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
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

  /**
   * Cheap read-only poll used to detect an admin-revoked session quickly
   * (access tokens otherwise stay valid for their full 15-minute life
   * regardless of revocation). Distinguishes a confirmed revoke (401 from the
   * server) from a transient network hiccup — only the former should force a
   * logout; a dropped wifi connection should not.
   */
  async checkSession(): Promise<"valid" | "revoked" | "unknown"> {
    try {
      await api.get("/auth/session/check");
      return "valid";
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return "revoked";
      return "unknown";
    }
  },
};
