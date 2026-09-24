export type BrandMedia = {
  id: string;
  path: string;
  file_name: string;
  mime_type?: string | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  image_id?: string | null;
  image?: BrandMedia | null;
  products_count?: number;
};

export function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}
