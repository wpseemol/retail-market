import { appKeyHeaders, publicApiUrl } from "@/lib/api";
import type { Locale } from "@/i18n/config";

export type PublicCategoryChild = {
  id: string;
  name: string;
  name_bn?: string | null;
  slug: string;
  products_count: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  name_bn?: string | null;
  slug: string;
  icon: string | null;
  image: { path: string; alt_text?: string | null } | null;
  products_count: number;
  children: PublicCategoryChild[];
};

/** Fetch active categories for the header mega-menu (cached ~60s). */
export async function getCategories(): Promise<PublicCategory[]> {
  try {
    const res = await fetch(publicApiUrl("/api/categories"), {
      headers: appKeyHeaders(),
      next: { revalidate: 60, tags: ["categories"] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { categories?: PublicCategory[] };
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

/** Bangla name when the shopper uses Bangla and one was entered; otherwise the English name. */
export function categoryName(
  category: { name: string; name_bn?: string | null },
  locale: Locale,
): string {
  const bn = category.name_bn?.trim();
  return locale === "bn" && bn ? bn : category.name;
}

export function categoryShopHref(slug: string) {
  return `/shop?category=${encodeURIComponent(slug)}`;
}
