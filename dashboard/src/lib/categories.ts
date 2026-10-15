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
  icon?: string | null;
  name: string;
  name_bn?: string | null;
  slug: string;
  description?: string | null;
  description_bn?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  image?: CategoryMedia | null;
  parent?: { id: string; name: string; slug: string } | null;
  products_count?: number;
  children_count?: number;
};

/** Returned by `GET /api/dashboard/categories` — what the current role may do in bulk. */
export type CategoryBulkPermissions = { export: boolean; import: boolean };

export const NO_CATEGORY_BULK_PERMISSIONS: CategoryBulkPermissions = {
  export: false,
  import: false,
};

export type CategoryImportRow = {
  row: number;
  handle: string | null;
  title: string | null;
  action: "create" | "update" | "skip" | "error";
  image: boolean;
  errors: string[];
  warnings: string[];
};

export type CategoryImportResult = {
  message: string;
  dry_run: boolean;
  mode: "upsert" | "create" | "update";
  source: "csv" | "zip";
  images_in_zip: number;
  columns: string[];
  ignored_columns: string[];
  summary: {
    total: number;
    create: number;
    update: number;
    skip: number;
    error: number;
    images: number;
  };
  rows: CategoryImportRow[];
};

export function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
