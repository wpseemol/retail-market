import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { ParsedProductCsv, ProductCsvColumn } from "../lib/productCsv.js";
import { sanitizeProductDescriptionHtml } from "../lib/richHtml.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import { productCsvCellSchemas } from "../validators/productBulk.js";

export type ImportMode = "upsert" | "create" | "update";

export type ImportContext = {
  /** Vendors can only touch this shop; null for staff working across stores. */
  vendorShopId: bigint | null;
  userIsVendor: boolean;
  /** False when a vendor's per-product shipping fee would be ignored. */
  canSetShipping: boolean;
  mode: ImportMode;
  dryRun: boolean;
};

export type ImportRowResult = {
  row: number;
  handle: string | null;
  title: string | null;
  action: "create" | "update" | "skip" | "error";
  errors: string[];
  warnings: string[];
  product_id?: string;
};

type Fields = {
  handle?: string | null;
  title?: string | null;
  status?: ProductStatus | null;
  type?: "simple" | "variable" | null;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  stock?: number | null;
  category?: string | null;
  brand?: string | null;
  store?: string | null;
  short_description?: string | null;
  description?: string | null;
  shipping_fee?: number | null;
  featured?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
};

const FIELD_FOR: Partial<Record<ProductCsvColumn, keyof Fields>> = {
  Handle: "handle",
  Title: "title",
  Status: "status",
  Type: "type",
  SKU: "sku",
  Barcode: "barcode",
  Price: "price",
  "Compare At Price": "compare_at_price",
  "Cost Price": "cost_price",
  Stock: "stock",
  Category: "category",
  Brand: "brand",
  Store: "store",
  "Short Description": "short_description",
  "Description (HTML)": "description",
  "Shipping Fee": "shipping_fee",
  Featured: "featured",
  "Meta Title": "meta_title",
  "Meta Description": "meta_description",
};

function parseCells(values: Partial<Record<ProductCsvColumn, string>>) {
  const fields: Fields = {};
  const errors: string[] = [];
  for (const [column, raw] of Object.entries(values) as Array<[ProductCsvColumn, string]>) {
    const key = FIELD_FOR[column];
    const schema = productCsvCellSchemas[column];
    if (!key) continue;
    if (key === "description") {
      if (raw === "") {
        fields.description = null;
        continue;
      }
      const sanitized = sanitizeProductDescriptionHtml(raw);
      if (!sanitized.ok) errors.push(`${column}: ${sanitized.message}`);
      else fields.description = sanitized.html || null;
      continue;
    }
    if (!schema) continue;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${column}: ${parsed.error.issues[0]?.message ?? "Invalid value"}`);
      continue;
    }
    (fields as Record<string, unknown>)[key] = parsed.data;
  }
  return { fields, errors };
}

const lower = (v: string) => v.toLowerCase();

/** Look up a row by slug first, then by (case-insensitive) name. */
function byKey<T extends { slug: string | null; name: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const r of rows) map.set(lower(r.name), r);
  for (const r of rows) if (r.slug) map.set(lower(r.slug), r);
  return map;
}

function decimal(value: number | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : new Prisma.Decimal(value.toFixed(2));
}

export async function runProductImport(parsed: ParsedProductCsv, ctx: ImportContext) {
  const rows = parsed.records.map((record) => ({ row: record.row, ...parseCells(record.values) }));

  const collect = (key: keyof Fields) =>
    [...new Set(rows.map((r) => r.fields[key]).filter((v): v is string => typeof v === "string" && v !== ""))];

  const handles = collect("handle");
  const categoryKeys = collect("category");
  const brandKeys = collect("brand");
  const storeKeys = collect("store");
  const skus = collect("sku");

  const [existing, categories, brands, stores, productSkus, variantSkus] = await Promise.all([
    handles.length
      ? prisma.product.findMany({
          where: { slug: { in: handles } },
          select: {
            id: true,
            slug: true,
            vendor_id: true,
            type: true,
            status: true,
            published_at: true,
            deleted_at: true,
            vendor: { select: { slug: true, shop_name: true } },
          },
        })
      : [],
    categoryKeys.length
      ? prisma.category.findMany({
          where: {
            deleted_at: null,
            is_active: true,
            OR: [{ slug: { in: categoryKeys } }, { name: { in: categoryKeys } }],
          },
          select: { id: true, name: true, slug: true },
        })
      : [],
    brandKeys.length
      ? prisma.brand.findMany({
          where: {
            deleted_at: null,
            is_active: true,
            OR: [{ slug: { in: brandKeys } }, { name: { in: brandKeys } }],
          },
          select: { id: true, name: true, slug: true },
        })
      : [],
    storeKeys.length && !ctx.userIsVendor
      ? prisma.vendor.findMany({
          where: {
            deleted_at: null,
            OR: [{ slug: { in: storeKeys } }, { shop_name: { in: storeKeys } }],
          },
          select: { id: true, slug: true, shop_name: true },
        })
      : [],
    skus.length
      ? prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } })
      : [],
    skus.length
      ? prisma.productVariant.findMany({
          where: { sku: { in: skus } },
          select: { product_id: true, sku: true },
        })
      : [],
  ]);

  const existingBySlug = new Map(existing.map((p) => [p.slug, p]));
  const categoryBy = byKey(categories);
  const brandBy = byKey(brands);
  const storeBy = byKey(stores.map((s) => ({ ...s, name: s.shop_name })));
  const skuOwner = new Map<string, bigint>();
  for (const p of productSkus) if (p.sku) skuOwner.set(lower(p.sku), p.id);
  for (const v of variantSkus) if (v.sku) skuOwner.set(lower(v.sku), v.product_id);

  const seenHandles = new Map<string, number>();
  const seenSkus = new Map<string, number>();
  const reservedSlugs = new Set<string>();
  const slugFree = async (slug: string) =>
    !reservedSlugs.has(slug) && !(await prisma.product.findFirst({ where: { slug }, select: { id: true } }));

  const results: ImportRowResult[] = [];

  for (const { row, fields, errors } of rows) {
    const warnings: string[] = [];
    const result: ImportRowResult = {
      row,
      handle: fields.handle ?? null,
      title: fields.title ?? null,
      action: "error",
      errors,
      warnings,
    };
    results.push(result);

    if (fields.handle) {
      const first = seenHandles.get(fields.handle);
      if (first) {
        // Shopify / WooCommerce add extra rows per variant or image under the same handle.
        result.action = "skip";
        warnings.push(`Extra row for the handle on row ${first} — variant and image rows aren't imported`);
        continue;
      }
      seenHandles.set(fields.handle, row);
    }
    if (fields.sku) {
      const first = seenSkus.get(lower(fields.sku));
      if (first) errors.push(`SKU is repeated (first used on row ${first})`);
      else seenSkus.set(lower(fields.sku), row);
    }

    const match = fields.handle ? existingBySlug.get(fields.handle) : undefined;
    if (match?.deleted_at) {
      errors.push("Handle belongs to a deleted product — use a different handle");
    }
    const target = match && !match.deleted_at ? match : undefined;

    if (target && ctx.mode === "create") {
      result.action = "skip";
      warnings.push("Product already exists (import mode: create only)");
      continue;
    }
    if (!target && ctx.mode === "update") {
      result.action = "skip";
      warnings.push(
        fields.handle ? "No product with this handle (import mode: update only)" : "Handle is required to update",
      );
      continue;
    }
    if (target && ctx.vendorShopId !== null && target.vendor_id !== ctx.vendorShopId) {
      errors.push("Handle is already used by another product");
    }

    // Lookups shared by create and update.
    let categoryId: bigint | undefined;
    if (fields.category) {
      const c = categoryBy.get(lower(fields.category));
      if (c) categoryId = c.id;
      else errors.push(`Category "${fields.category}" not found or inactive`);
    }
    let brand: { id: bigint; name: string } | null | undefined;
    if (fields.brand === null) brand = null;
    else if (fields.brand) {
      const b = brandBy.get(lower(fields.brand));
      if (b) brand = { id: b.id, name: b.name };
      else errors.push(`Brand "${fields.brand}" not found or inactive`);
    }
    let vendorId: bigint | undefined;
    if (ctx.vendorShopId !== null) {
      vendorId = target ? undefined : ctx.vendorShopId;
      if (fields.store) warnings.push("Store column is ignored — products go to your store");
    } else if (
      fields.store &&
      target?.vendor &&
      [target.vendor.slug, target.vendor.shop_name].some((k) => k && lower(k) === lower(fields.store!))
    ) {
      vendorId = undefined;
    } else if (fields.store) {
      const s = storeBy.get(lower(fields.store));
      if (s) vendorId = s.id;
      else errors.push(`Store "${fields.store}" not found`);
    }
    if (fields.sku) {
      const owner = skuOwner.get(lower(fields.sku));
      if (owner !== undefined && owner !== target?.id) errors.push(`SKU "${fields.sku}" is used by another product`);
    }

    let shippingFee = fields.shipping_fee;
    if (shippingFee !== undefined && !ctx.canSetShipping) {
      warnings.push("Shipping fee ignored — store owners can't override shipping");
      shippingFee = undefined;
    }

    if (!target) {
      if (!fields.title || fields.title.length < 2) errors.push("Title is required (at least 2 characters)");
      if (!categoryId && !fields.category) errors.push("Category is required for new products");
      if (fields.price == null) errors.push("Price is required for new products");
      if (vendorId === undefined && !fields.store) errors.push("Store is required for new products");
      if (fields.type === "variable") {
        errors.push("Variable products can't be created by import — create them in the editor, then import updates");
      }
      if (errors.length > 0) continue;

      const slug = fields.handle
        ? fields.handle
        : await uniqueVendorSlug(fields.title!, async (s) => !(await slugFree(s)));
      if (fields.handle && !(await slugFree(fields.handle))) {
        errors.push("Handle is already used by another product");
        continue;
      }
      reservedSlugs.add(slug);
      result.handle = slug;
      result.action = "create";
      if (ctx.dryRun) continue;

      const status = fields.status ?? "draft";
      const price = decimal(fields.price)!;
      const stock = fields.stock ?? 0;
      const created = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            vendor_id: vendorId!,
            category_id: categoryId!,
            brand_id: brand?.id ?? null,
            brand: brand?.name ?? null,
            name: fields.title!,
            slug,
            sku: fields.sku ?? null,
            barcode: fields.barcode ?? null,
            description: fields.description ?? null,
            short_description: fields.short_description ?? null,
            type: "simple",
            status,
            price,
            compare_at_price: decimal(fields.compare_at_price) ?? null,
            cost_price: decimal(fields.cost_price) ?? null,
            shipping_fee: decimal(shippingFee) ?? null,
            stock_qty: stock,
            is_featured: fields.featured ?? false,
            meta_title: fields.meta_title ?? null,
            meta_description: fields.meta_description ?? null,
            published_at: status === "active" ? new Date() : null,
          },
        });
        await tx.productVariant.create({
          data: {
            product_id: product.id,
            title: "Default",
            sku: fields.sku ?? null,
            price,
            stock_qty: stock,
            is_default: true,
            is_active: true,
            position: 0,
          },
        });
        return product;
      });
      result.product_id = created.id.toString();
      continue;
    }

    // Update an existing product: only non-empty cells of required fields change them;
    // empty optional cells clear the field.
    if (fields.title && fields.title.length < 2) errors.push("Title must be at least 2 characters");
    if (fields.type && fields.type !== target.type) {
      errors.push(`Type can't be changed by import (product is ${target.type})`);
    }
    if (errors.length > 0) continue;

    const isVariable = target.type === "variable";
    const variantFields = (["price", "stock", "sku", "compare_at_price"] as const).filter(
      (k) => fields[k] !== undefined,
    );
    if (isVariable && variantFields.length > 0) {
      warnings.push("Price, stock and SKU of variable products are edited per variant — skipped");
    }

    result.action = "update";
    result.product_id = target.id.toString();
    if (ctx.dryRun) continue;

    const nextStatus = fields.status ?? target.status;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: target.id },
        data: {
          name: fields.title ?? undefined,
          status: fields.status ?? undefined,
          vendor_id: vendorId,
          category_id: categoryId,
          brand_id: brand === undefined ? undefined : (brand?.id ?? null),
          brand: brand === undefined ? undefined : (brand?.name ?? null),
          barcode: fields.barcode,
          cost_price: decimal(fields.cost_price),
          short_description: fields.short_description,
          description: fields.description,
          shipping_fee: decimal(shippingFee),
          is_featured: fields.featured,
          meta_title: fields.meta_title,
          meta_description: fields.meta_description,
          ...(isVariable
            ? {}
            : {
                sku: fields.sku,
                price: fields.price != null ? decimal(fields.price)! : undefined,
                compare_at_price: decimal(fields.compare_at_price),
                stock_qty: fields.stock ?? undefined,
              }),
          published_at:
            nextStatus === "active" && !target.published_at
              ? new Date()
              : nextStatus !== "active"
                ? null
                : undefined,
        },
      });
      if (!isVariable && (fields.price != null || fields.stock != null || fields.sku !== undefined)) {
        await tx.productVariant.updateMany({
          where: { product_id: target.id, deleted_at: null, is_default: true },
          data: {
            price: fields.price != null ? decimal(fields.price) : undefined,
            stock_qty: fields.stock ?? undefined,
            sku: fields.sku,
          },
        });
      }
    });
  }

  for (const r of results) {
    if (r.errors.length > 0) r.action = "error";
  }

  const count = (action: ImportRowResult["action"]) => results.filter((r) => r.action === action).length;
  return {
    dry_run: ctx.dryRun,
    mode: ctx.mode,
    columns: parsed.columns,
    ignored_columns: parsed.ignored,
    summary: {
      total: results.length,
      create: count("create"),
      update: count("update"),
      skip: count("skip"),
      error: count("error"),
    },
    rows: results,
  };
}
