// Thin fetch wrapper with automatic access-token injection and silent refresh.
const BASE_URL = import.meta.env.VITE_API_URL || "https://isms-backend-production.up.railway.app/api/v1";

let accessToken: string | null = null;
let activeStationId: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setActiveStationId(id: string | null) {
  activeStationId = id;
}

export function getAccessToken() {
  return accessToken;
}

type RequestOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };

  if (!skipAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (!skipAuth && activeStationId) {
    headers["x-station-id"] = activeStationId;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });

  // Try silent refresh on 401 TOKEN_EXPIRED
  if (res.status === 401 && !skipAuth) {
    const body = await res.clone().json().catch(() => ({}));
    if (body?.code === "TOKEN_EXPIRED") {
      const refreshed = await silentRefresh();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        const retry = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });
        return handleResponse<T>(retry);
      }
    }
    // Refresh failed — clear token and dispatch event for AuthProvider
    setAccessToken(null);
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError(res.status, data?.message || "Request failed", data);
  }
  return data as T;
}

async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.data?.accessToken) {
      setAccessToken(data.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "GET", ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...opts }),
};
