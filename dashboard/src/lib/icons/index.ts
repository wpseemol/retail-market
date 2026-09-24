import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import catalog from "./category-icons.json";

export type CategoryIconGroup = string;

export type CategoryIconMeta = {
  name: string;
  label: string;
  group: string;
};

/** Internal project icon catalog (loaded from local JSON library). */
export const CATEGORY_ICON_CATALOG = catalog as CategoryIconMeta[];

export const CATEGORY_ICON_NAMES = CATEGORY_ICON_CATALOG.map(
  (item) => item.name,
) as [string, ...string[]];

export const CATEGORY_ICON_NAME_SET = new Set(CATEGORY_ICON_NAMES);

export const CATEGORY_ICON_GROUPS = Array.from(
  new Set(CATEGORY_ICON_CATALOG.map((item) => item.group)),
);

type LucideModule = typeof LucideIcons & Record<string, LucideIcon | unknown>;

const lucide = LucideIcons as LucideModule;

function resolveLucideIcon(name: string): LucideIcon {
  const candidate = lucide[name];
  if (typeof candidate === "function" || (candidate && typeof candidate === "object" && "$$typeof" in (candidate as object))) {
    return candidate as LucideIcon;
  }
  return LucideIcons.FolderTree;
}

export type CategoryIconDef = CategoryIconMeta & {
  Icon: LucideIcon;
};

/** All catalog icons with Lucide components resolved from the library. */
export const CATEGORY_ICONS: CategoryIconDef[] = CATEGORY_ICON_CATALOG.map(
  (item) => ({
    ...item,
    Icon: resolveLucideIcon(item.name),
  }),
);

const iconMap = new Map(CATEGORY_ICONS.map((item) => [item.name, item]));

export function isAllowedCategoryIcon(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  return CATEGORY_ICON_NAME_SET.has(name);
}

export function resolveCategoryIcon(
  name: string | null | undefined,
): CategoryIconDef {
  if (name && iconMap.has(name)) return iconMap.get(name)!;
  return iconMap.get("FolderTree") ?? {
    name: "FolderTree",
    label: "Category tree",
    group: "Popular",
    Icon: LucideIcons.FolderTree,
  };
}

export function getCategoryLucideIcon(
  name: string | null | undefined,
): LucideIcon {
  return resolveCategoryIcon(name).Icon;
}

/** @deprecated Prefer CATEGORY_ICONS from the internal icons library. */
export { CATEGORY_ICONS as default };
