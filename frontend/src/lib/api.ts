const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001";

export type ApiUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: "customer" | "super_admin" | "admin" | "moderator" | "vendor";
  status: string;
  gender: "male" | "female" | "other" | null;
  date_of_birth: string | null;
  avatar: { id: string; path: string } | null;
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  token: string;
  tokenType: "Bearer";
  expiresIn: string;
  refreshExpiresIn: string;
  user: ApiUser;
  message?: string;
};

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Skip one-shot refresh retry (used by the refresh call itself). */
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[] | undefined>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("rm_customer_refresh_token");
}

function persistTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem("rm_customer_token", accessToken);
  window.localStorage.setItem("rm_customer_refresh_token", refreshToken);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;

  try {
    const data = await apiFetch<AuthTokenResponse>("/api/auth/refresh", {
      body: { refreshToken },
      skipRefresh: true,
    });
    persistTokens(data.accessToken, data.refreshToken);
    if (data.user) {
      window.localStorage.setItem(
        "rm_customer_user",
        JSON.stringify(data.user),
      );
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[] | undefined>;
  };

  if (
    response.status === 401 &&
    options.token &&
    !options.skipRefresh &&
    typeof window !== "undefined"
  ) {
    const nextAccess = await refreshAccessToken();
    if (nextAccess) {
      return apiFetch<T>(path, {
        ...options,
        token: nextAccess,
        skipRefresh: true,
      });
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data.message ?? "Request failed",
      response.status,
      data.errors,
    );
  }

  return data as T;
}

export async function fetchHealth() {
  return apiFetch<{
    status: string;
    service: string;
    database: string;
    timestamp: string;
  }>("/api/health");
}

export { API_URL };
