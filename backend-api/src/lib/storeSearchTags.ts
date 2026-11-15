/** Normalize comma-separated store search tags (max 20, each ≤40 chars). */
export function normalizeSearchTags(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const parts = String(raw)
    .split(/[,，]/)
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((t) => t.slice(0, 40));
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
    if (unique.length >= 20) break;
  }
  return unique.length > 0 ? unique.join(", ") : null;
}
