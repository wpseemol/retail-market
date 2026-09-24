import catalog from "../data/category-icons.json" with { type: "json" };

export type CategoryIconMeta = {
  name: string;
  label: string;
  group: string;
};

export const CATEGORY_ICON_CATALOG = catalog as CategoryIconMeta[];

export const CATEGORY_ICON_NAMES = CATEGORY_ICON_CATALOG.map(
  (item) => item.name,
) as [string, ...string[]];

export const CATEGORY_ICON_NAME_SET = new Set(CATEGORY_ICON_NAMES);

export function isAllowedCategoryIcon(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  return CATEGORY_ICON_NAME_SET.has(name);
}
