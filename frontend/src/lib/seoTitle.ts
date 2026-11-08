/**
 * Keep titles in the SEO “square” ranges tools expect (~30–60 for documents,
 * product titles long enough after the site template is applied).
 * Clear wording also helps ChatGPT, Gemini, DeepSeek, Perplexity, etc.
 */

/** Prefer a candidate title when it is long enough; otherwise use the fallback. */
export function preferSeoTitle(
  candidate: string | null | undefined,
  fallback: string,
  minChars = 30,
): string {
  const value = candidate?.trim() ?? "";
  return value.length >= minChars ? value : fallback;
}

/** Build a product document title segment (layout template adds `| Site`). */
export function productSeoTitle(input: {
  name: string;
  brand?: string | null;
}): string {
  const name = input.name.trim();
  const brand = input.brand?.trim();
  const withBrand = brand && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name} by ${brand}`
    : name;

  if (withBrand.length >= 28) return withBrand.slice(0, 70);
  return `${withBrand} – Buy Online in Bangladesh`.slice(0, 70);
}
