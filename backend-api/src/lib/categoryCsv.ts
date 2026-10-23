import fs from "node:fs";
import path from "node:path";
import { storageConfig } from "../config/storage.config.js";
import { env } from "./env.js";
import { mediaObjectKey, readMediaFile } from "./storage/files.js";
import { CATEGORY_IMAGE_MAX_BYTES } from "./categoryImage.js";
import { decodeCsvText, parseCsv, unguard } from "./productCsv.js";
import { isZipBuffer, listZipEntries, readZipEntry, type ZipEntry } from "./zipArchive.js";

/**
 * Category import / export. A plain CSV carries image URLs; a ZIP carries
 * `categories.csv` plus an `images/` folder so covers survive a move between servers.
 */

export const CATEGORY_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CATEGORY_ZIP_MAX_BYTES = 25 * 1024 * 1024;
export const CATEGORY_CSV_MAX_ROWS = 1000;
export const CATEGORY_EXPORT_MAX_ROWS = 5000;
const ZIP_MAX_ENTRIES = 2 * CATEGORY_CSV_MAX_ROWS + 10;

export const CATEGORY_CSV_COLUMNS = [
  "Handle",
  "Name",
  "Parent",
  "Description",
  "Icon",
  "Status",
  "Sort Order",
  "Meta Title",
  "Meta Description",
  "Image",
] as const;

export type CategoryCsvColumn = (typeof CATEGORY_CSV_COLUMNS)[number];

/** Aliases so WooCommerce / Shopify-style category exports import without renaming columns. */
const HEADER_ALIASES: Record<string, CategoryCsvColumn> = {
  handle: "Handle",
  slug: "Handle",
  "category slug": "Handle",
  name: "Name",
  title: "Name",
  "category name": "Name",
  parent: "Parent",
  "parent slug": "Parent",
  "parent handle": "Parent",
  "parent category": "Parent",
  description: "Description",
  icon: "Icon",
  status: "Status",
  active: "Status",
  "is active": "Status",
  "sort order": "Sort Order",
  position: "Sort Order",
  order: "Sort Order",
  "meta title": "Meta Title",
  "seo title": "Meta Title",
  "meta description": "Meta Description",
  "seo description": "Meta Description",
  image: "Image",
  "image url": "Image",
  "image src": "Image",
  thumbnail: "Image",
};

export type ParsedCategoryCsv = {
  columns: CategoryCsvColumn[];
  ignored: string[];
  records: Array<{ row: number; values: Partial<Record<CategoryCsvColumn, string>> }>;
};

function parseCategoryRows(text: string): ParsedCategoryCsv | { error: string } {
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not read CSV" };
  }
  if (rows.length < 2) return { error: "CSV needs a header row and at least one category" };
  if (rows.length - 1 > CATEGORY_CSV_MAX_ROWS) {
    return { error: `CSV can have at most ${CATEGORY_CSV_MAX_ROWS} category rows` };
  }

  const headerRow = rows[0]!;
  const map = headerRow.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  const columns = [...new Set(map.filter((c): c is CategoryCsvColumn => c !== null))];
  const ignored = headerRow.filter((_, i) => map[i] === null).map((h) => h.trim()).filter(Boolean);
  if (!columns.includes("Handle") && !columns.includes("Name")) {
    return { error: "CSV needs a Handle or Name column" };
  }

  const records = rows.slice(1).map((cells, index) => {
    const values: Partial<Record<CategoryCsvColumn, string>> = {};
    map.forEach((column, i) => {
      if (!column || values[column] !== undefined) return;
      values[column] = unguard((cells[i] ?? "").trim());
    });
    return { row: index + 2, values };
  });

  return { columns, ignored, records };
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

/** Images bundled in an uploaded ZIP, looked up by the path written in the Image column. */
export type ImageBundle = {
  count: number;
  read(ref: string): Buffer | { error: string } | null;
};

export type CategoryImportFile = {
  parsed: ParsedCategoryCsv;
  bundle: ImageBundle | null;
  source: "csv" | "zip";
};

export function readCategoryImportFile(buffer: Buffer): CategoryImportFile | { error: string } {
  if (!isZipBuffer(buffer)) {
    if (buffer.length > CATEGORY_CSV_MAX_BYTES) return { error: "CSV must be 2 MB or smaller" };
    const text = decodeCsvText(buffer);
    if (typeof text !== "string") return text;
    const parsed = parseCategoryRows(text);
    return "error" in parsed ? parsed : { parsed, bundle: null, source: "csv" };
  }

  const entries = listZipEntries(buffer, ZIP_MAX_ENTRIES);
  if ("error" in entries) return entries;

  const csvEntries = entries.filter((e) => e.name.toLowerCase().endsWith(".csv") && !e.name.startsWith("__MACOSX/"));
  const csvEntry =
    csvEntries.find((e) => e.name.toLowerCase() === "categories.csv") ??
    (csvEntries.length === 1 ? csvEntries[0] : undefined);
  if (!csvEntry) {
    return {
      error: csvEntries.length
        ? "ZIP has several CSV files — name the one to import categories.csv"
        : "ZIP must contain categories.csv",
    };
  }
  const csvBuffer = readZipEntry(buffer, csvEntry, CATEGORY_CSV_MAX_BYTES);
  if ("error" in csvBuffer) {
    return { error: csvBuffer.error === "File is too large" ? "categories.csv must be 2 MB or smaller" : csvBuffer.error };
  }
  const text = decodeCsvText(csvBuffer);
  if (typeof text !== "string") return text;
  const parsed = parseCategoryRows(text);
  if ("error" in parsed) return parsed;

  const csvDir = path.posix.dirname(csvEntry.name);
  const images = new Map<string, ZipEntry>();
  for (const e of entries) {
    if (IMAGE_EXT.test(e.name) && !e.name.startsWith("__MACOSX/")) images.set(e.name.toLowerCase(), e);
  }

  return {
    parsed,
    source: "zip",
    bundle: {
      count: images.size,
      read(ref) {
        const clean = ref.replace(/\\/g, "/").replace(/^\.\/+/, "").toLowerCase();
        const entry =
          images.get(clean) ?? (csvDir !== "." ? images.get(`${csvDir.toLowerCase()}/${clean}`) : undefined);
        if (!entry) return null;
        const data = readZipEntry(buffer, entry, CATEGORY_IMAGE_MAX_BYTES);
        return "error" in data
          ? { error: data.error === "File is too large" ? "Image must be 1 MB or smaller" : data.error }
          : data;
      },
    },
  };
}

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/** How the Image column was resolved. */
export type ImageRef =
  | { kind: "local"; relative: string; read: () => Promise<Buffer | { error: string }> }
  | { kind: "external" }
  | { kind: "bundle"; ref: string }
  | { kind: "invalid"; message: string };

/** Object key when the cell is this deployment's public object URL. Never fetches other hosts. */
function storageKeyFromPublicUrl(value: string): string | null {
  const base = storageConfig.publicBaseUrl;
  if (!base) return null;
  let url: URL;
  let baseUrl: URL;
  try {
    url = new URL(value);
    baseUrl = new URL(base);
  } catch {
    return null;
  }
  if (url.origin !== baseUrl.origin) return null;
  const prefix = baseUrl.pathname.replace(/\/$/, "");
  if (!url.pathname.startsWith(`${prefix}/`)) return null;
  let key: string;
  try {
    key = decodeURIComponent(url.pathname.slice(prefix.length + 1));
  } catch {
    return null;
  }
  if (!key || key.includes("..") || key.includes("\\") || !IMAGE_EXT.test(key)) return null;
  const parts = key.split("/");
  const fileName = parts.pop();
  if (!fileName || !mediaObjectKey(parts.join("/"), fileName)) return null;
  return key;
}

/**
 * Classify an Image cell. URLs on this API's own `/uploads/` are read from disk.
 * URLs on the configured object-storage base are read with the storage credentials.
 * Other hosts are never fetched.
 */
export function classifyImageRef(value: string): ImageRef {
  const remoteKey = storageKeyFromPublicUrl(value);
  if (remoteKey) {
    const parts = remoteKey.split("/");
    const fileName = parts.pop() ?? "";
    const filePath = parts.join("/");
    return {
      kind: "local",
      relative: remoteKey,
      read: async () => {
        const data = await readMediaFile(filePath, fileName, CATEGORY_IMAGE_MAX_BYTES, "s3");
        return data ?? { error: "Image not found on this server" };
      },
    };
  }

  let pathname: string | null = null;
  if (value.startsWith("/uploads/")) {
    pathname = value;
  } else if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { kind: "invalid", message: "Image URL is not valid" };
    }
    let ownHost: string;
    try {
      ownHost = new URL(env.publicBaseUrl).host;
    } catch {
      ownHost = "";
    }
    if (url.host !== ownHost) return { kind: "external" };
    pathname = url.pathname;
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return { kind: "invalid", message: "Image must be a file in the ZIP or an http(s) URL" };
  }

  if (pathname === null) {
    if (!IMAGE_EXT.test(value) || value.includes("..")) {
      return { kind: "invalid", message: "Image file must be a .jpg, .png, .webp or .gif inside the ZIP" };
    }
    return { kind: "bundle", ref: value };
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { kind: "invalid", message: "Image URL is not valid" };
  }
  if (!decoded.startsWith("/uploads/") || decoded.includes("..") || !IMAGE_EXT.test(decoded)) {
    return { kind: "invalid", message: "Image URL must point to an uploaded image" };
  }
  const relative = decoded.slice("/uploads/".length);
  const absolute = path.resolve(UPLOADS_ROOT, relative);
  if (!absolute.startsWith(UPLOADS_ROOT + path.sep)) {
    return { kind: "invalid", message: "Image URL must point to an uploaded image" };
  }
  return {
    kind: "local",
    relative,
    read: async () => {
      try {
        const stat = fs.statSync(absolute);
        if (!stat.isFile()) return { error: "Image not found on this server" };
        if (stat.size > CATEGORY_IMAGE_MAX_BYTES) return { error: "Image must be 1 MB or smaller" };
        return fs.readFileSync(absolute);
      } catch {
        return { error: "Image not found on this server" };
      }
    },
  };
}
