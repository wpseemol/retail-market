import path from "node:path";
import { Router, type Response } from "express";
import multer from "multer";
import { Prisma, type ProductStatus } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  PRODUCT_CSV_COLUMNS,
  PRODUCT_CSV_MAX_BYTES,
  PRODUCT_EXPORT_MAX_ROWS,
  readProductCsv,
  toCsv,
} from "../lib/productCsv.js";
import { getShippingSettings } from "../lib/shipping.js";
import { toPublicMedia } from "../lib/user.js";
import { runProductImport } from "../services/productImport.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  bulkProductDeleteSchema,
  bulkProductUpdateSchema,
  exportProductsQuerySchema,
  importProductsOptionsSchema,
  MODERATOR_BULK_FIELDS,
  type BulkProductChanges,
} from "../validators/productBulk.js";

/**
 * Bulk tools for `/api/dashboard/products` (mounted before `/:id`).
 *
 * | Role        | Export | Import | Bulk edit              | Bulk delete | Scope      |
 * |-------------|--------|--------|------------------------|-------------|------------|
 * | super_admin | yes    | yes    | all fields             | yes         | all stores |
 * | admin       | yes    | yes    | all fields             | yes         | all stores |
 * | moderator   | yes    | no     | status/category/brand/featured | no  | all stores |
 * | vendor      | yes    | yes    | all fields             | no          | own store  |
 */
export const dashboardProductsBulkRouter = Router();

export function productBulkPermissions(role: string) {
  const full = role === "super_admin" || role === "admin";
  return {
    export: full || role === "moderator" || role === "vendor",
    import: full || role === "vendor",
    bulk_edit: full || role === "moderator" || role === "vendor",
    bulk_edit_pricing: full || role === "vendor",
    bulk_delete: full,
    all_stores: full || role === "moderator",
  };
}

type Permission = keyof ReturnType<typeof productBulkPermissions>;

function deny(res: Response, permission: Permission) {
  const label: Record<Permission, string> = {
    export: "export products",
    import: "import products",
    bulk_edit: "bulk-edit products",
    bulk_edit_pricing: "change prices or stock in bulk",
    bulk_delete: "bulk-delete products",
    all_stores: "work across stores",
  };
  return res.status(403).json({
    message: `Your role can't ${label[permission]}`,
    code: "INSUFFICIENT_ROLE",
  });
}

function validationError(res: Response, error: z.ZodError, fallback = "Validation failed") {
  return res.status(400).json({
    message: error.issues[0]?.message ?? fallback,
    errors: error.flatten().fieldErrors,
  });
}

/** Vendor's own shop id, `null` for staff, `undefined` when a vendor has no shop yet. */
async function shopScope(role: string, userId: bigint): Promise<bigint | null | undefined> {
  if (productBulkPermissions(role).all_stores) return null;
  const shop = await prisma.vendor.findFirst({
    where: { user_id: userId, deleted_at: null },
    select: { id: true },
  });
  return shop?.id;
}

/* ---------- Export ---------- */

function exportRow(p: Prisma.ProductGetPayload<{ include: typeof exportInclude }>) {
  return [
    p.slug,
    p.name,
    p.status,
    p.type,
    p.sku,
    p.barcode,
    p.price.toFixed(2),
    p.compare_at_price?.toFixed(2),
    p.cost_price?.toFixed(2),
    p.stock_qty,
    p.category?.slug,
    p.brandRef?.slug ?? p.brand,
    p.vendor?.slug,
    p.short_description,
    p.description,
    p.shipping_fee?.toFixed(2),
    p.is_featured ? "yes" : "no",
    p.meta_title,
    p.meta_description,
    toPublicMedia(p.thumbnail)?.path,
  ];
}

const exportInclude = {
  category: { select: { slug: true } },
  brandRef: { select: { slug: true } },
  vendor: { select: { slug: true } },
  thumbnail: true,
} satisfies Prisma.ProductInclude;

dashboardProductsBulkRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { role, userId } = req.auth!;
    if (!productBulkPermissions(role).export) return deny(res, "export");

    const parsed = exportProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");
    const { q, vendor_id, category_id, status, ids } = parsed.data;

    const scope = await shopScope(role, userId);
    const where: Prisma.ProductWhereInput = { deleted_at: null };
    if (scope !== null) where.vendor_id = scope ?? BigInt(0);
    else if (vendor_id) where.vendor_id = BigInt(vendor_id);
    if (category_id) where.category_id = BigInt(category_id);
    if (status) where.status = status;
    if (ids?.length) where.id = { in: ids.map((id) => BigInt(id)) };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { brand: { contains: q } },
        { sku: { contains: q } },
      ];
    }

    const rows =
      scope === undefined
        ? []
        : await prisma.product.findMany({
            where,
            include: exportInclude,
            orderBy: [{ updated_at: "desc" }, { id: "desc" }],
            take: PRODUCT_EXPORT_MAX_ROWS,
          });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="products-${stamp}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Total-Rows", String(rows.length));
    return res.send(toCsv(PRODUCT_CSV_COLUMNS, rows.map(exportRow)));
  }),
);

dashboardProductsBulkRouter.get("/import-template", (req, res) => {
  if (!productBulkPermissions(req.auth!.role).import) return deny(res, "import");
  const sample = [
    "cotton-panjabi-white",
    "Cotton Panjabi (White)",
    "draft",
    "simple",
    "PNJ-WHT-001",
    "",
    "1450.00",
    "1800.00",
    "",
    "25",
    "mens-fashion",
    "",
    req.auth!.role === "vendor" ? "" : "your-store-slug",
    "Breathable cotton for everyday wear",
    "<p>Soft, breathable cotton panjabi.</p>",
    "",
    "no",
    "",
    "",
    "",
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="products-import-template.csv"');
  res.setHeader("Cache-Control", "no-store");
  return res.send(toCsv(PRODUCT_CSV_COLUMNS, [sample]));
});

/* ---------- Import ---------- */

const CSV_MIMES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_CSV_MAX_BYTES, files: 1, fields: 4, parts: 6 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname ?? "";
    if (name.length > 255 || /[<>]|<\?|javascript:/i.test(name) || path.extname(name).toLowerCase() !== ".csv") {
      cb(new Error("Upload a .csv file"));
      return;
    }
    if (!CSV_MIMES.has(file.mimetype)) {
      cb(new Error("Upload a .csv file"));
      return;
    }
    cb(null, true);
  },
});

dashboardProductsBulkRouter.post(
  "/import",
  (req, res, next) => {
    if (!productBulkPermissions(req.auth!.role).import) return deny(res, "import");
    csvUpload.single("file")(req, res, (err) => {
      if (err) {
        const tooBig = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          message: tooBig ? "CSV must be 2 MB or smaller" : err instanceof Error ? err.message : "Upload failed",
          code: tooBig ? "FILE_TOO_LARGE" : "INVALID_FILE",
        });
      }
      return next();
    });
  },
  asyncHandler(async (req, res) => {
    const { role, userId } = req.auth!;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "CSV file is required (field: file)" });

    const options = importProductsOptionsSchema.safeParse(req.body ?? {});
    if (!options.success) return validationError(res, options.error);

    const scope = await shopScope(role, userId);
    if (scope === undefined) {
      return res.status(400).json({ message: "Create a shop before importing products" });
    }

    const parsed = readProductCsv(file.buffer);
    if ("error" in parsed) return res.status(400).json({ message: parsed.error, code: "INVALID_CSV" });

    const isVendor = scope !== null;
    const canSetShipping = !isVendor || (await getShippingSettings()).vendorOverride;
    const result = await runProductImport(parsed, {
      vendorShopId: scope,
      userIsVendor: isVendor,
      canSetShipping,
      mode: options.data.mode,
      dryRun: options.data.dry_run,
    });

    return res.json({
      message: result.dry_run
        ? "Preview ready — nothing was saved"
        : `Imported: ${result.summary.create} created, ${result.summary.update} updated`,
      ...result,
    });
  }),
);

/* ---------- Bulk edit / delete ---------- */

type BulkSkip = { id: string; name: string; reason: string };

function adjustPrice(current: number, change: NonNullable<BulkProductChanges["price"]>) {
  const { mode, value } = change;
  const next =
    mode === "set"
      ? value
      : mode === "increase_percent"
        ? current * (1 + value / 100)
        : mode === "decrease_percent"
          ? current * (1 - value / 100)
          : mode === "increase_amount"
            ? current + value
            : current - value;
  return Math.max(0, Math.round(next * 100) / 100);
}

function adjustStock(current: number, change: NonNullable<BulkProductChanges["stock"]>) {
  const next =
    change.mode === "set" ? change.value : change.mode === "increase" ? current + change.value : current - change.value;
  return Math.min(10_000_000, Math.max(0, next));
}

dashboardProductsBulkRouter.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const { role, userId } = req.auth!;
    const perms = productBulkPermissions(role);
    if (!perms.bulk_edit) return deny(res, "bulk_edit");

    const parsed = bulkProductUpdateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const { ids, changes } = parsed.data;

    if (!perms.bulk_edit_pricing) {
      const blocked = Object.entries(changes).some(
        ([key, value]) => value !== undefined && !(MODERATOR_BULK_FIELDS as readonly string[]).includes(key),
      );
      if (blocked) return deny(res, "bulk_edit_pricing");
    }

    const scope = await shopScope(role, userId);
    if (scope === undefined) return res.status(400).json({ message: "Create a shop first" });

    if (changes.category_id) {
      const category = await prisma.category.findFirst({
        where: { id: BigInt(changes.category_id), deleted_at: null, is_active: true },
        select: { id: true },
      });
      if (!category) return res.status(400).json({ message: "Category not found or inactive" });
    }
    let brand: { id: bigint; name: string } | null | undefined;
    if (changes.brand_id === null) brand = null;
    else if (changes.brand_id) {
      brand = await prisma.brand.findFirst({
        where: { id: BigInt(changes.brand_id), deleted_at: null, is_active: true },
        select: { id: true, name: true },
      });
      if (!brand) return res.status(400).json({ message: "Brand not found or inactive" });
    }

    let shippingFee = changes.shipping_fee;
    const skipped: BulkSkip[] = [];
    if (shippingFee !== undefined && scope !== null && !(await getShippingSettings()).vendorOverride) {
      shippingFee = undefined;
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids.map((id) => BigInt(id)) },
        deleted_at: null,
        ...(scope !== null ? { vendor_id: scope } : {}),
      },
      select: { id: true, name: true, type: true, price: true, stock_qty: true, published_at: true },
    });
    const found = new Set(products.map((p) => p.id.toString()));
    for (const id of ids) {
      if (!found.has(id)) skipped.push({ id, name: `#${id}`, reason: "Not found or not in your store" });
    }

    const touchesVariants = changes.price !== undefined || changes.stock !== undefined;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const p of products) {
        const isVariable = p.type === "variable";
        if (isVariable && touchesVariants) {
          skipped.push({
            id: p.id.toString(),
            name: p.name,
            reason: "Variable product — price and stock are set per variant",
          });
        }
        const nextPrice =
          changes.price && !isVariable ? adjustPrice(Number(p.price), changes.price) : undefined;
        const nextStock = changes.stock && !isVariable ? adjustStock(p.stock_qty, changes.stock) : undefined;

        const data: Prisma.ProductUpdateInput = {
          status: changes.status as ProductStatus | undefined,
          category: changes.category_id ? { connect: { id: BigInt(changes.category_id) } } : undefined,
          brandRef:
            brand === undefined ? undefined : brand === null ? { disconnect: true } : { connect: { id: brand.id } },
          brand: brand === undefined ? undefined : (brand?.name ?? null),
          is_featured: changes.is_featured,
          compare_at_price:
            changes.compare_at_price === undefined || isVariable
              ? undefined
              : changes.compare_at_price === null
                ? null
                : new Prisma.Decimal(changes.compare_at_price.toFixed(2)),
          shipping_fee:
            shippingFee === undefined ? undefined : shippingFee === null ? null : new Prisma.Decimal(shippingFee.toFixed(2)),
          price: nextPrice === undefined ? undefined : new Prisma.Decimal(nextPrice.toFixed(2)),
          stock_qty: nextStock,
          published_at:
            changes.status === undefined
              ? undefined
              : changes.status === "active"
                ? (p.published_at ?? new Date())
                : null,
        };
        const hasProductChange = Object.values(data).some((v) => v !== undefined);
        if (!hasProductChange) continue;

        await tx.product.update({ where: { id: p.id }, data });
        if (nextPrice !== undefined || nextStock !== undefined) {
          await tx.productVariant.updateMany({
            where: { product_id: p.id, deleted_at: null, is_default: true },
            data: {
              price: nextPrice === undefined ? undefined : new Prisma.Decimal(nextPrice.toFixed(2)),
              stock_qty: nextStock,
            },
          });
        }
        updated++;
      }
    });

    return res.json({
      message: `${updated} product${updated === 1 ? "" : "s"} updated`,
      updated,
      skipped,
    });
  }),
);

dashboardProductsBulkRouter.post(
  "/bulk-delete",
  asyncHandler(async (req, res) => {
    const { role } = req.auth!;
    if (!productBulkPermissions(role).bulk_delete) return deny(res, "bulk_delete");

    const parsed = bulkProductDeleteSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const ids = parsed.data.ids.map((id) => BigInt(id));

    const now = new Date();
    const deleted = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: ids }, deleted_at: null },
        select: { id: true },
      });
      const live = products.map((p) => p.id);
      if (live.length === 0) return 0;
      const result = await tx.product.updateMany({
        where: { id: { in: live }, deleted_at: null },
        data: { deleted_at: now, status: "archived" },
      });
      await tx.productVariant.updateMany({
        where: { product_id: { in: live }, deleted_at: null },
        data: { deleted_at: now, is_active: false },
      });
      return result.count;
    });

    return res.json({
      message: `${deleted} product${deleted === 1 ? "" : "s"} deleted`,
      deleted,
      skipped: ids.length - deleted,
    });
  }),
);
