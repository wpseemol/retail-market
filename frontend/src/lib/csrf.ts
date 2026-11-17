import { ApiError } from "./api";

type CsrfResponse = {
  csrfToken: string;
  expires_at: string;
};

let cached: { token: string; expiresAt: number } | null = null;

/** Fetch a CSRF token via the storefront BFF (`/api/backend/csrf`). */
export async function fetchCsrfToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cached && cached.expiresAt > now + 60_000) {
    return cached.token;
  }

  const response = await fetch("/api/backend/csrf", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = (await response.json().catch(() => ({}))) as CsrfResponse & {
    message?: string;
    code?: string;
  };
  if (!response.ok || !data.csrfToken) {
    throw new ApiError(
      data.message ?? "Could not get a CSRF token",
      response.status,
      undefined,
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
