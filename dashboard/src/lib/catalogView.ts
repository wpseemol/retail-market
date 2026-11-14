import { useEffect, useState } from "react";
import {
  CATALOG_VIEW_DEFAULT,
  parseCatalogViewMode,
  type CatalogViewMode,
} from "@/lib/validators/catalogView";

const STORAGE_PREFIX = "rm_catalog_view:";

function storageKey(page: string) {
  return `${STORAGE_PREFIX}${page}`;
}

export function readCatalogViewMode(
  page: "products" | "categories" | "brands",
  fallback: CatalogViewMode = CATALOG_VIEW_DEFAULT,
): CatalogViewMode {
  if (typeof window === "undefined") return fallback;
  try {
    return parseCatalogViewMode(
      window.localStorage.getItem(storageKey(page)),
      fallback,
    );
  } catch {
    return fallback;
  }
}

export function writeCatalogViewMode(
  page: "products" | "categories" | "brands",
  mode: CatalogViewMode,
) {
  try {
    window.localStorage.setItem(storageKey(page), mode);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Persist grid4|grid3|grid2|list preference per catalog page. */
export function useCatalogViewMode(
  page: "products" | "categories" | "brands",
  fallback: CatalogViewMode = CATALOG_VIEW_DEFAULT,
) {
  const [viewMode, setViewModeState] = useState<CatalogViewMode>(fallback);

  useEffect(() => {
    setViewModeState(readCatalogViewMode(page, fallback));
  }, [page, fallback]);

  function setViewMode(mode: CatalogViewMode) {
    setViewModeState(mode);
    writeCatalogViewMode(page, mode);
  }

  return [viewMode, setViewMode] as const;
}

export type { CatalogViewMode };
export {
  CATALOG_VIEW_DEFAULT,
  isCatalogGridView,
  isCatalogListView,
} from "@/lib/validators/catalogView";
