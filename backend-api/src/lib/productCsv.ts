/**
 * Product CSV import / export (one row per product, Shopify-style headers).
 * Variants are not expanded into rows: variable products export their base price
 * and total stock, and import only updates their non-variant fields.
 */

export const PRODUCT_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_CSV_MAX_ROWS = 1000;
export const PRODUCT_EXPORT_MAX_ROWS = 5000;

export const PRODUCT_CSV_COLUMNS = [
  "Handle",
  "Title",
  "Status",
  "Type",
  "SKU",
  "Barcode",
  "Price",
  "Compare At Price",
  "Cost Price",
  "Stock",
  "Category",
  "Brand",
  "Store",
  "Short Description",
  "Description (HTML)",
  "Shipping Fee",
  "Featured",
  "Meta Title",
  "Meta Description",
  "Image URL",
] as const;

export type ProductCsvColumn = (typeof PRODUCT_CSV_COLUMNS)[number];

/** Header aliases so Shopify and WooCommerce exports import without renaming columns. */
const HEADER_ALIASES: Record<string, ProductCsvColumn> = {
  handle: "Handle",
  slug: "Handle",
  "url handle": "Handle",
  title: "Title",
  name: "Title",
  status: "Status",
  type: "Type",
  sku: "SKU",
  "variant sku": "SKU",
  barcode: "Barcode",
  "variant barcode": "Barcode",
  "gtin, upc, ean, or isbn": "Barcode",
  price: "Price",
  "variant price": "Price",
  "regular price": "Price",
  "compare at price": "Compare At Price",
  "variant compare at price": "Compare At Price",
  "cost price": "Cost Price",
  "cost per item": "Cost Price",
  stock: "Stock",
  "stock quantity": "Stock",
  inventory: "Stock",
  "variant inventory qty": "Stock",
  category: "Category",
  categories: "Category",
  "product category": "Category",
  brand: "Brand",
  brands: "Brand",
  vendor: "Brand",
  store: "Store",
  shop: "Store",
  "short description": "Short Description",
  "description (html)": "Description (HTML)",
  description: "Description (HTML)",
  "body (html)": "Description (HTML)",
  "shipping fee": "Shipping Fee",
  featured: "Featured",
  "is featured?": "Featured",
  "meta title": "Meta Title",
  "seo title": "Meta Title",
  "meta description": "Meta Description",
  "seo description": "Meta Description",
  "image url": "Image URL",
  "image src": "Image URL",
  images: "Image URL",
};

export function canonicalHeader(raw: string): ProductCsvColumn | null {
  return HEADER_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/** Spreadsheet formulas in a cell (`=`, `+`, `-`, `@`) run when opened in Excel. */
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: unknown[][]) {
  const lines = [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  // BOM so Excel reads ৳ / Bangla text as UTF-8.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Undo the formula guard added by `csvCell` on export. */
function unguard(value: string) {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF / LF, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new Error("Unclosed quote in CSV");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type ParsedProductCsv = {
  columns: ProductCsvColumn[];
  ignored: string[];
  records: Array<{ row: number; values: Partial<Record<ProductCsvColumn, string>> }>;
};

/**
 * Decode and parse an uploaded file. Rejects binary data and HTML / PHP polyglots
 * before parsing; every cell is still validated per field afterwards.
 */
export function readProductCsv(buffer: Buffer): ParsedProductCsv | { error: string } {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return { error: "File must be UTF-8 encoded CSV" };
  }
  if (text.includes("\u0000")) return { error: "File is not a text CSV" };
  const head = text.replace(/^\uFEFF/, "").trimStart().slice(0, 64).toLowerCase();
  if (head.startsWith("<") || head.startsWith("%pdf") || /<\?php/i.test(text)) {
    return { error: "File is not a CSV" };
  }

  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not read CSV" };
  }
  if (rows.length < 2) return { error: "CSV needs a header row and at least one product" };
  if (rows.length - 1 > PRODUCT_CSV_MAX_ROWS) {
    return { error: `CSV can have at most ${PRODUCT_CSV_MAX_ROWS} product rows` };
  }

  const headerRow = rows[0]!;
  const map: Array<ProductCsvColumn | null> = headerRow.map(canonicalHeader);
  const columns = [...new Set(map.filter((c): c is ProductCsvColumn => c !== null))];
  const ignored = headerRow.filter((_, i) => map[i] === null).map((h) => h.trim()).filter(Boolean);
  if (!columns.includes("Handle") && !columns.includes("Title")) {
    return { error: "CSV needs a Handle or Title column" };
  }

  const records = rows.slice(1).map((cells, index) => {
    const values: Partial<Record<ProductCsvColumn, string>> = {};
    map.forEach((column, i) => {
      if (!column || values[column] !== undefined) return;
      values[column] = unguard((cells[i] ?? "").trim());
    });
    return { row: index + 2, values };
  });

  return { columns, ignored, records };
}
