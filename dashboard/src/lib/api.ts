const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  "",
) ?? "http://localhost:8001";

export type StaffRole = "super_admin" | "admin" | "moderator" | "vendor";

export type StaffUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: StaffRole;
  status: string;
};

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

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
  };

  if (!response.ok) {
    throw new ApiError(data.message ?? "Request failed", response.status);
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
