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

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
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

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
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
