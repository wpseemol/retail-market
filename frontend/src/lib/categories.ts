import { API_URL } from "@/lib/api";

export type PublicCategoryChild = {
  id: string;
  name: string;
  slug: string;
  products_count: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: { path: string; alt_text?: string | null } | null;
  products_count: number;
  children: PublicCategoryChild[];
};

/** Fetch active categories for the header mega-menu (cached ~60s). */
export async function getCategories(): Promise<PublicCategory[]> {
  try {
    const res = await fetch(`${API_URL}/api/categories`, {
      next: { revalidate: 60, tags: ["categories"] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { categories?: PublicCategory[] };
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

export function categoryShopHref(slug: string) {
  return `/shop?category=${encodeURIComponent(slug)}`;
}
