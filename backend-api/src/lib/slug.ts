/** URL-safe slug from a shop name. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/**
 * Ensure a unique slug. If `base` is taken, appends -2, -3, …
 * `excludeId` skips the current vendor when updating.
 */
export async function uniqueVendorSlug(
  baseInput: string,
  exists: (slug: string) => Promise<boolean>,
  excludeCheck?: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(baseInput) || "shop";
  let candidate = base;
  let n = 2;

  while (true) {
    const taken = excludeCheck
      ? await excludeCheck(candidate)
      : await exists(candidate);
    if (!taken) return candidate;
    candidate = `${base.slice(0, 190)}-${n}`;
    n += 1;
    if (n > 10_000) {
      candidate = `${base.slice(0, 160)}-${Date.now()}`;
      return candidate;
    }
  }
}
