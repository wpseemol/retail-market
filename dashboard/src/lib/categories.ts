export type CategoryMedia = {
  id: string;
  path: string;
  file_name: string;
  original_name?: string | null;
  alt_text?: string | null;
};

export type Category = {
  id: string;
  parent_id: string | null;
  image_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  image?: CategoryMedia | null;
  parent?: { id: string; name: string; slug: string } | null;
  products_count?: number;
  children_count?: number;
};

export function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
