import { env } from "./env.js";

/**
 * Asks the storefront to drop cached fetches for these tags (`POST /api/revalidate`).
 * Fire-and-forget: the storefront still refreshes on its own after 60 s if this fails.
 */
export function revalidateFrontend(tags: string[]) {
  const unique = [...new Set(tags.filter(Boolean))];
  if (!env.revalidateSecret || unique.length === 0) return;

  void fetch(`${env.frontendUrl}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidate-secret": env.revalidateSecret,
    },
    body: JSON.stringify({ tags: unique }),
    signal: AbortSignal.timeout(4000),
  }).catch((err: unknown) => {
    if (env.nodeEnv !== "production") {
      console.warn(
        "[revalidate] storefront refresh failed:",
        err instanceof Error ? err.message : err,
      );
    }
  });
}
