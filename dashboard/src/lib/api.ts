const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  "",
) ?? "http://localhost:8001";

export type StaffRole = "super_admin" | "admin" | "moderator" | "vendor";

export type StaffUser = {
  id: string;
  first_name: string;
  last_name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  role: StaffRole;
  status: string;
};

export type {
  ManagedUser,
  UserRole,
  UserStatus,
} from "./users";

export {
  USER_ROLES,
  USER_STATUSES,
  RESTRICT_STATUSES,
} from "./users";

import {
  STAFF_REFRESH_KEY,
  STAFF_TOKEN_KEY,
  clearStaffSessionStorage,
} from "./authKeys";

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Skip refresh+retry (used by the refresh call itself). */
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function readStoredAccessToken() {
  try {
    return sessionStorage.getItem(STAFF_TOKEN_KEY);
  } catch {
    return null;
  }
}

function readStoredRefreshToken() {
  try {
    return sessionStorage.getItem(STAFF_REFRESH_KEY);
  } catch {
    return null;
  }
}

function persistTokens(accessToken: string, refreshToken?: string | null) {
  try {
    sessionStorage.setItem(STAFF_TOKEN_KEY, accessToken);
    if (refreshToken) {
      sessionStorage.setItem(STAFF_REFRESH_KEY, refreshToken);
    }
  } catch {
    /* ignore */
  }

  void import("../store/auth").then(({ useAuthStore }) => {
    const state = useAuthStore.getState();
    if (state.user) {
      state.setSession(
        accessToken,
        state.user,
        refreshToken ?? state.refreshToken,
      );
    }
  });
}

/** Secure logout: clear tokens and force login (used when refresh expires). */
export function forceLogout(reason?: string) {
  clearStaffSessionStorage();

  void import("../store/auth").then(({ useAuthStore }) => {
    useAuthStore.getState().logout();
  });

  if (typeof window === "undefined") return;
  if (window.location.pathname.includes("/login")) return;

  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  const qs = params.toString();
  window.location.assign(qs ? `/login?${qs}` : "/login");
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh staff access token.
 * Returns null and caller must logout when refresh token is missing/expired/revoked.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readStoredRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_URL}/api/dashboard/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        accessToken?: string;
        token?: string;
        refreshToken?: string;
        message?: string;
        code?: string;
      };

      if (!response.ok) return null;

      const accessToken = data.accessToken ?? data.token;
      if (!accessToken || !data.refreshToken) {
        // Require rotated refresh token for secure staff sessions.
        return null;
      }

      persistTokens(accessToken, data.refreshToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function requestJson(
  path: string,
  options: ApiOptions,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const initialToken =
    options.token !== undefined ? options.token : readStoredAccessToken();

  let response = await requestJson(path, options, initialToken);
  let data = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };

  if (
    response.status === 401 &&
    !options.skipRefresh &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/refresh")
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await requestJson(path, options, newToken);
      data = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
    } else {
      // Refresh missing/expired/revoked → hard logout (secure).
      forceLogout("session_expired");
      throw new ApiError(
        data.message ?? "Session expired — please log in again",
        401,
        data.code ?? "SESSION_EXPIRED",
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(data.message ?? "Request failed", response.status, data.code);
  }

  return data as T;
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { method?: string; token?: string | null; skipRefresh?: boolean } = {},
): Promise<T> {
  const initialToken =
    options.token !== undefined ? options.token : readStoredAccessToken();

  async function send(token: string | null) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      method: options.method ?? "POST",
      headers,
      body: formData,
    });
  }

  let response = await send(initialToken);
  let data = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
  };

  if (response.status === 401 && !options.skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await send(newToken);
      data = (await response.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };
    } else {
      forceLogout("session_expired");
      throw new ApiError(
        data.message ?? "Session expired — please log in again",
        401,
        data.code ?? "SESSION_EXPIRED",
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(data.message ?? "Upload failed", response.status, data.code);
  }

  return data as T;
}

export async function fetchHealth() {
  return apiFetch<{
    status: string;
    service: string;
    database: string;
    timestamp: string;
  }>("/api/health", { skipRefresh: true });
}

export { API_URL };
