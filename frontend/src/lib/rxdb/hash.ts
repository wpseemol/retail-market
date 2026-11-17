/** Stable cache id for list/query endpoints. */
export function queryCacheId(prefix: string, queryKey: string): string {
  return `${prefix}:${queryKey || "_"}`;
}

/** Hash a small query object into a short key (FNV-1a 32-bit). */
export function hashQuery(
  parts: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort();
  const raw = entries.join("&") || "_";
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
