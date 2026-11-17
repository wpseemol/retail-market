import { ApiError } from "./api";

type CsrfResponse = {
  csrfToken: string;
  expires_at: string;
};

let cached: { token: string; expiresAt: number } | null = null;

/** Fetch a CSRF token from the API (via same-origin `/api` proxy). */
export async function fetchCsrfToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cached && cached.expiresAt > now + 60_000) {
    return cached.token;
  }

  const response = await fetch("/api/csrf", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const data = (await response.json().catch(() => ({}))) as CsrfResponse & {
    message?: string;
    code?: string;
  };
  if (!response.ok || !data.csrfToken) {
    throw new ApiError(
      data.message ?? "Could not get a CSRF token",
      response.status,
      data.code,
    );
  }

  const expiresAt = Date.parse(data.expires_at) || now + 2 * 60 * 60 * 1000;
  cached = { token: data.csrfToken, expiresAt };
  return data.csrfToken;
}

export function clearCsrfCache() {
  cached = null;
}
