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
  provider_name?: string | null;
  avatar_id?: string | null;
  avatar: {
    id: string;
    path: string;
    file_name?: string;
    file_path?: string;
    mime_type?: string | null;
    alt_text?: string | null;
    collection_name?: string;
  } | null;
};

/** Returned by Next.js session routes (tokens stay in httpOnly cookie). */
export type SessionResponse = {
  authenticated: boolean;
  user?: ApiUser;
  message?: string;
};

/** Shape returned by the Express auth API (used only on the server). */
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
  /** @deprecated Tokens are httpOnly — proxy attaches Bearer server-side. */
  token?: string | null;
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[] | undefined>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[] | undefined>,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

/**
 * Browser API helper.
 * - Session auth → `/api/auth/session/*` (sets encrypted httpOnly cookie)
 * - Backend data → `/api/backend/*` (server reads cookie, adds Bearer)
 * Tokens never touch localStorage or document.cookie.
 */
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

  const url = path.startsWith("/api/auth/session")
    ? path
    : path.startsWith("/api/backend/")
      ? path
      : path.startsWith("/api/")
        ? `/api/backend/${path.slice("/api/".length)}`
        : path;

  const response = await fetch(url, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    errors?: Record<string, string[] | undefined>;
  };

  if (!response.ok) {
    throw new ApiError(
      data.message ?? "Request failed",
      response.status,
      data.errors,
      data.code,
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

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001";
