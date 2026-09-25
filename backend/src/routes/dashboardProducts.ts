import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Prisma, ProductStatus, ProductType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  productWithCatalogInclude,
  toPublicProduct,
  toPublicProductDetail,
  createProductMedia,
} from "../lib/productCatalog.js";
import {
  finalizeProductImageUpload,
  PRODUCT_IMAGES_DIR,
} from "../lib/productImage.js";
import { sanitizeProductDescriptionHtml } from "../lib/richHtml.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { productImageUpload } from "../middleware/upload.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardProductsRouter = Router();

dashboardProductsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
);

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

function isElevated(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

function parseId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

const PRODUCT_STATUSES = ["draft", "active", "archived", "out_of_stock"] as const;
const PRODUCT_TYPES = ["simple", "variable"] as const;

const optionSchema = z.object({
  name: withSafeInput(z.string().trim().min(1).max(80)),
  values: z
    .array(withSafeInput(z.string().trim().min(1).max(120)))
    .min(1)
    .max(40),
});

const variantInputSchema = z.object({
  title: withSafeInput(z.string().trim().max(255)).optional().nullable(),
  sku: withSafeInput(z.string().trim().max(100)).optional().nullable(),
  price: z.coerce.number().min(0).max(99_999_999),
  stock_qty: z.coerce.number().int().min(0).max(10_000_000).default(0),
  option_values: z.record(z.string(), z.string()).optional().default({}),
  is_default: z.boolean().optional(),
});

const productBodySchema = z.object({
  vendor_id: z.string().regex(/^\d+$/).optional(),
  category_id: z.string().regex(/^\d+$/),
  brand_id: z.string().regex(/^\d+$/).optional().nullable(),
  name: withSafeInput(z.string().trim().min(2).max(255)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(270)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  brand: withSafeInput(z.string().trim().max(120)).optional().nullable(),
  description: z
    .union([z.string().trim().max(20_000), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const sanitized = sanitizeProductDescriptionHtml(value);
      if (!sanitized.ok) {
        ctx.addIssue({ code: "custom", message: sanitized.message });
        return z.NEVER;
      }
      return sanitized.html || null;
    }),
  short_description: withSafeInput(z.string().trim().max(500))
    .optional()
    .nullable(),
  type: z.enum(PRODUCT_TYPES).default("simple"),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  price: z.coerce.number().min(0).max(99_999_999).optional(),
  compare_at_price: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  stock_qty: z.coerce.number().int().min(0).max(10_000_000).optional(),
  sku: withSafeInput(z.string().trim().max(100)).optional().nullable(),
  options: z.array(optionSchema).max(5).optional(),
  variants: z.array(variantInputSchema).max(200).optional(),
});

const listQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  vendor_id: z.string().regex(/^\d+$/).optional(),
  category_id: z.string().regex(/^\d+$/).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

async function slugTaken(slug: string, excludeId?: bigint) {
  const existing = await prisma.product.findFirst({
    where: {
      slug,
      deleted_at: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function resolveVendorIdForActor(input: {
  role: string;
  userId: bigint;
  requestedVendorId?: string;
}) {
  if (input.role === "vendor") {
    const shop = await prisma.vendor.findFirst({
      where: { user_id: input.userId, deleted_at: null },
      select: { id: true },
    });
    if (!shop) {
      return { error: "Create a shop before adding products" as const };
    }
    return { vendorId: shop.id };
  }

  if (!input.requestedVendorId) {
    return { error: "Select a shop for this product" as const };
  }

  const vendorId = BigInt(input.requestedVendorId);
  const shop = await prisma.vendor.findFirst({
    where: { id: vendorId, deleted_at: null },
    select: { id: true },
  });
  if (!shop) return { error: "Shop not found" as const };
  return { vendorId };
}

async function assertCanAccessProduct(
  product: { vendor_id: bigint | null },
  userId: bigint,
  role: string,
) {
  if (isElevated(role)) return true;
  if (!product.vendor_id) return false;
  const shop = await prisma.vendor.findFirst({
    where: { id: product.vendor_id, user_id: userId, deleted_at: null },
    select: { id: true },
  });
  return Boolean(shop);
}

function cartesianOptions(
  options: Array<{ name: string; values: string[] }>,
): Array<Record<string, string>> {
  if (options.length === 0) return [{}];
  return options.reduce<Array<Record<string, string>>>(
    (acc, opt) => {
      const next: Array<Record<string, string>> = [];
      for (const row of acc) {
        for (const value of opt.values) {
          next.push({ ...row, [opt.name]: value });
        }
      }
      return next;
    },
    [{}],
  );
}

async function replaceOptionsAndVariants(input: {
  productId: bigint;
  type: ProductType;
  basePrice: number;
  baseStock: number;
  baseSku?: string | null;
  options?: Array<{ name: string; values: string[] }>;
  variants?: Array<{
    title?: string | null;
    sku?: string | null;
    price: number;
    stock_qty: number;
    option_values?: Record<string, string>;
    is_default?: boolean;
  }>;
}) {
  // Soft-delete all variants for this product and free SKUs
  // (unique index still applies to soft-deleted rows).
  await prisma.productVariant.updateMany({
    where: { product_id: input.productId },
    data: { deleted_at: new Date(), is_active: false, sku: null },
  });
  await prisma.productOption.deleteMany({
    where: { product_id: input.productId },
  });

  if (input.type === "simple") {
    await prisma.productVariant.create({
      data: {
        product_id: input.productId,
        title: "Default",
        sku: input.baseSku || null,
        price: input.basePrice,
        stock_qty: input.baseStock,
        is_default: true,
        is_active: true,
        position: 0,
      },
    });
    return;
  }

  const options = input.options ?? [];
  if (options.length === 0) {
    throw new Error("Variable products need at least one option");
  }

  const optionRows: Array<{
    id: bigint;
    name: string;
    values: Map<string, bigint>;
  }> = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const created = await prisma.productOption.create({
      data: {
        product_id: input.productId,
        name: opt.name,
        position: i,
        values: {
          create: opt.values.map((value, vi) => ({
            value,
            position: vi,
          })),
        },
      },
      include: { values: true },
    });
    optionRows.push({
      id: created.id,
      name: created.name,
      values: new Map(created.values.map((v) => [v.value, v.id])),
    });
  }

  const combos =
    input.variants && input.variants.length > 0
      ? input.variants
      : cartesianOptions(options).map((combo, index) => ({
          title: Object.values(combo).join(" / "),
          sku: null as string | null,
          price: input.basePrice,
          stock_qty: 0,
          option_values: combo,
          is_default: index === 0,
        }));

  for (let i = 0; i < combos.length; i++) {
    const variant = combos[i]!;
    const created = await prisma.productVariant.create({
      data: {
        product_id: input.productId,
        title:
          variant.title ||
          Object.values(variant.option_values ?? {}).join(" / ") ||
          `Variant ${i + 1}`,
        sku: variant.sku || null,
        price: variant.price,
        stock_qty: variant.stock_qty,
        is_default: variant.is_default ?? i === 0,
        is_active: true,
        position: i,
      },
    });

    const links: Array<{ variant_id: bigint; option_value_id: bigint }> = [];
    for (const opt of optionRows) {
      const picked = variant.option_values?.[opt.name];
      if (!picked) continue;
      const valueId = opt.values.get(picked);
      if (!valueId) continue;
      links.push({ variant_id: created.id, option_value_id: valueId });
    }
    if (links.length > 0) {
      await prisma.productVariantOption.createMany({ data: links });
    }
  }
}

dashboardProductsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }

  const { q, vendor_id, category_id, status, page, limit } = parsed.data;
  const where: Prisma.ProductWhereInput = { deleted_at: null };

  if (req.auth!.role === "vendor") {
    const shop = await prisma.vendor.findFirst({
      where: { user_id: req.auth!.userId, deleted_at: null },
      select: { id: true },
    });
    if (!shop) {
      return res.json({
        products: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }
    where.vendor_id = shop.id;
  } else if (vendor_id) {
    where.vendor_id = BigInt(vendor_id);
  }

  if (category_id) where.category_id = BigInt(category_id);
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { brand: { contains: q } },
      { sku: { contains: q } },
    ];
  }

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productWithCatalogInclude,
      orderBy: [{ updated_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return res.json({
    products: rows.map(toPublicProduct),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

dashboardProductsRouter.get("/slug-preview", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (name.length < 2) {
    return res.status(400).json({ message: "Name is required" });
  }
  const slug = await uniqueVendorSlug(name, (s) => slugTaken(s));
  return res.json({ slug });
});

dashboardProductsRouter.get("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const row = await prisma.product.findFirst({
    where: { id, deleted_at: null },
    include: productWithCatalogInclude,
  });
  if (!row) return res.status(404).json({ message: "Product not found" });

  if (!(await assertCanAccessProduct(row, req.auth!.userId, req.auth!.role))) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  return res.json({ product: await toPublicProductDetail(row) });
});

dashboardProductsRouter.post("/", async (req, res) => {
  const parsed = productBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const vendorResolved = await resolveVendorIdForActor({
    role: req.auth!.role,
    userId: req.auth!.userId,
    requestedVendorId: data.vendor_id,
  });
  if ("error" in vendorResolved) {
    return res.status(400).json({ message: vendorResolved.error });
  }

  const categoryId = BigInt(data.category_id);
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deleted_at: null, is_active: true },
    select: { id: true },
  });
  if (!category) {
    return res.status(400).json({ message: "Category not found or inactive" });
  }

  let brandId: bigint | null = null;
  let brandName: string | null = data.brand?.trim() || null;
  if (data.brand_id) {
    const brandRow = await prisma.brand.findFirst({
      where: { id: BigInt(data.brand_id), deleted_at: null, is_active: true },
      select: { id: true, name: true },
    });
    if (!brandRow) {
      return res.status(400).json({ message: "Brand not found or inactive" });
    }
    brandId = brandRow.id;
    brandName = brandRow.name;
  }

  if (data.type === "variable" && (!data.options || data.options.length === 0)) {
    return res.status(400).json({
      message: "Add at least one option (e.g. Size, Color) for variant products",
    });
  }

  const price = data.price ?? data.variants?.[0]?.price ?? 0;
  const stock = data.stock_qty ?? 0;
  const slug = data.slug
    ? (await slugTaken(data.slug)
        ? await uniqueVendorSlug(data.slug, (s) => slugTaken(s))
        : data.slug)
    : await uniqueVendorSlug(data.name, (s) => slugTaken(s));

  const status = data.status as ProductStatus;
  const type = data.type as ProductType;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          vendor_id: vendorResolved.vendorId,
          category_id: categoryId,
          brand_id: brandId,
          name: data.name,
          slug,
          sku: data.sku ?? null,
          brand: brandName,
          description: data.description ?? null,
          short_description: data.short_description ?? null,
          type,
          status,
          price,
          compare_at_price: data.compare_at_price ?? null,
          stock_qty: type === "simple" ? stock : 0,
          published_at: status === "active" ? new Date() : null,
        },
      });

      // Use outer helpers with prisma — options need product id.
      return created;
    });

    await replaceOptionsAndVariants({
      productId: product.id,
      type,
      basePrice: price,
      baseStock: stock,
      baseSku: data.sku,
      options: data.options,
      variants: data.variants,
    });

    if (type === "variable") {
      const totalStock = await prisma.productVariant.aggregate({
        where: { product_id: product.id, deleted_at: null },
        _sum: { stock_qty: true },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stock_qty: totalStock._sum.stock_qty ?? 0 },
      });
    }

    const full = await prisma.product.findFirstOrThrow({
      where: { id: product.id },
      include: productWithCatalogInclude,
    });

    return res.status(201).json({
      message: "Product created",
      product: await toPublicProductDetail(full),
    });
  } catch (err) {
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Failed to create product",
    });
  }
});

dashboardProductsRouter.patch("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const parsed = productBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.product.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Product not found" });

  if (
    !(await assertCanAccessProduct(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "At least one field is required" });
  }

  if (data.category_id) {
    const category = await prisma.category.findFirst({
      where: {
        id: BigInt(data.category_id),
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });
    if (!category) {
      return res.status(400).json({ message: "Category not found or inactive" });
    }
  }

  let nextBrandId: bigint | null | undefined;
  let nextBrandName: string | null | undefined;
  if (data.brand_id === null) {
    nextBrandId = null;
    nextBrandName = null;
  } else if (data.brand_id) {
    const brandRow = await prisma.brand.findFirst({
      where: { id: BigInt(data.brand_id), deleted_at: null, is_active: true },
      select: { id: true, name: true },
    });
    if (!brandRow) {
      return res.status(400).json({ message: "Brand not found or inactive" });
    }
    nextBrandId = brandRow.id;
    nextBrandName = brandRow.name;
  }

  if (data.slug && (await slugTaken(data.slug, id))) {
    return res.status(409).json({ message: "Slug already in use" });
  }

  let vendorId: bigint | undefined;
  if (isElevated(req.auth!.role) && data.vendor_id) {
    const shop = await prisma.vendor.findFirst({
      where: { id: BigInt(data.vendor_id), deleted_at: null },
      select: { id: true },
    });
    if (!shop) return res.status(400).json({ message: "Shop not found" });
    vendorId = shop.id;
  }

  const nextType = (data.type ?? existing.type) as ProductType;
  const nextStatus = (data.status ?? existing.status) as ProductStatus;
  const price =
    data.price ??
    Number(existing.price) ??
    0;
  const stock = data.stock_qty ?? existing.stock_qty;

  try {
    await prisma.product.update({
      where: { id },
      data: {
        vendor_id: vendorId,
        category_id: data.category_id ? BigInt(data.category_id) : undefined,
        brand_id: nextBrandId,
        name: data.name,
        slug: data.slug,
        sku: data.sku === undefined ? undefined : data.sku,
        brand:
          nextBrandName !== undefined
            ? nextBrandName
            : data.brand === undefined
              ? undefined
              : data.brand,
        description:
          data.description === undefined ? undefined : data.description,
        short_description:
          data.short_description === undefined
            ? undefined
            : data.short_description,
        type: data.type,
        status: data.status,
        price: data.price,
        compare_at_price:
          data.compare_at_price === undefined
            ? undefined
            : data.compare_at_price,
        stock_qty: nextType === "simple" ? stock : undefined,
        published_at:
          nextStatus === "active" && !existing.published_at
            ? new Date()
            : nextStatus !== "active"
              ? null
              : undefined,
      },
    });

    if (
      data.type !== undefined ||
      data.options !== undefined ||
      data.variants !== undefined
    ) {
      if (nextType === "variable" && (!data.options || data.options.length === 0)) {
        return res.status(400).json({
          message:
            "Variable products need options when changing type or variants",
        });
      }

      await replaceOptionsAndVariants({
        productId: id,
        type: nextType,
        basePrice: price,
        baseStock: stock,
        baseSku: data.sku === undefined ? existing.sku : data.sku,
        options: data.options,
        variants: data.variants,
      });

      if (nextType === "variable") {
        const totalStock = await prisma.productVariant.aggregate({
          where: { product_id: id, deleted_at: null },
          _sum: { stock_qty: true },
        });
        await prisma.product.update({
          where: { id },
          data: { stock_qty: totalStock._sum.stock_qty ?? 0 },
        });
      }
    } else if (
      nextType === "simple" &&
      (data.price !== undefined ||
        data.stock_qty !== undefined ||
        data.sku !== undefined)
    ) {
      await prisma.productVariant.updateMany({
        where: { product_id: id, deleted_at: null, is_default: true },
        data: {
          price: data.price,
          stock_qty: data.stock_qty,
          sku: data.sku === undefined ? undefined : data.sku,
        },
      });
    }

    const full = await prisma.product.findFirstOrThrow({
      where: { id },
      include: productWithCatalogInclude,
    });

    return res.json({
      message: "Product updated",
      product: await toPublicProductDetail(full),
    });
  } catch (err) {
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Failed to update product",
    });
  }
});

dashboardProductsRouter.post(
  "/:id/thumbnail",
  (req, res, next) => {
    productImageUpload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const id = parseId(String(req.params.id));
    if (!id) return res.status(400).json({ message: "Invalid product id" });

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Product image is required (field: image)",
      });
    }

    const existing = await prisma.product.findFirst({
      where: { id, deleted_at: null },
      include: { thumbnail: true },
    });
    if (!existing) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(404).json({ message: "Product not found" });
    }

    if (
      !(await assertCanAccessProduct(
        existing,
        req.auth!.userId,
        req.auth!.role,
      ))
    ) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const finalized = await finalizeProductImageUpload(file.path, file.mimetype);
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message,
        code: finalized.code,
      });
    }

    const media = await createProductMedia({
      userId: req.auth!.userId,
      fileName: finalized.fileName,
      originalName: file.originalname,
      fileSize: finalized.size,
      mimeType: finalized.detected.mime,
      mediableType: "Product",
      mediableId: id,
      altText: existing.name,
    });

    await prisma.product.update({
      where: { id },
      data: { thumbnail_id: media.id },
    });

    const full = await prisma.product.findFirstOrThrow({
      where: { id },
      include: productWithCatalogInclude,
    });

    return res.json({
      message: "Product image updated",
      product: await toPublicProductDetail(full),
    });
  },
);

dashboardProductsRouter.post(
  "/:id/images",
  (req, res, next) => {
    productImageUpload.array("images", 12)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const id = parseId(String(req.params.id));
    if (!id) return res.status(400).json({ message: "Invalid product id" });

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({
        message: "At least one image is required (field: images)",
      });
    }

    const existing = await prisma.product.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, vendor_id: true, name: true, thumbnail_id: true },
    });
    if (!existing) {
      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
      }
      return res.status(404).json({ message: "Product not found" });
    }

    if (
      !(await assertCanAccessProduct(
        existing,
        req.auth!.userId,
        req.auth!.role,
      ))
    ) {
      for (const file of files) {
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
      }
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const createdIds: bigint[] = [];
    let firstCreatedId: bigint | null = null;

    for (const file of files) {
      const finalized = await finalizeProductImageUpload(file.path, file.mimetype);
      if (!finalized.ok) {
        return res.status(400).json({
          message: finalized.message,
          code: finalized.code,
        });
      }

      const media = await createProductMedia({
        userId: req.auth!.userId,
        fileName: finalized.fileName,
        originalName: file.originalname,
        fileSize: finalized.size,
        mimeType: finalized.detected.mime,
        mediableType: "Product",
        mediableId: id,
        altText: existing.name,
        sortOrder: createdIds.length,
      });
      createdIds.push(media.id);
      if (!firstCreatedId) firstCreatedId = media.id;
    }

    if (!existing.thumbnail_id && firstCreatedId) {
      await prisma.product.update({
        where: { id },
        data: { thumbnail_id: firstCreatedId },
      });
    }

    const full = await prisma.product.findFirstOrThrow({
      where: { id },
      include: productWithCatalogInclude,
    });

    return res.status(201).json({
      message: "Product images uploaded",
      product: await toPublicProductDetail(full),
    });
  },
);

dashboardProductsRouter.post("/:id/images/:mediaId/primary", async (req, res) => {
  const id = parseId(String(req.params.id));
  const mediaId = parseId(String(req.params.mediaId));
  if (!id || !mediaId) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const existing = await prisma.product.findFirst({
    where: { id, deleted_at: null },
    select: { id: true, vendor_id: true },
  });
  if (!existing) return res.status(404).json({ message: "Product not found" });

  if (
    !(await assertCanAccessProduct(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const media = await prisma.media.findFirst({
    where: {
      id: mediaId,
      collection_name: "product_images",
      mediable_type: "Product",
      mediable_id: id,
    },
  });
  if (!media) return res.status(404).json({ message: "Image not found" });

  await prisma.product.update({
    where: { id },
    data: { thumbnail_id: media.id },
  });

  const full = await prisma.product.findFirstOrThrow({
    where: { id },
    include: productWithCatalogInclude,
  });

  return res.json({
    message: "Primary image updated",
    product: await toPublicProductDetail(full),
  });
});

dashboardProductsRouter.delete("/:id/images/:mediaId", async (req, res) => {
  const id = parseId(String(req.params.id));
  const mediaId = parseId(String(req.params.mediaId));
  if (!id || !mediaId) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const existing = await prisma.product.findFirst({
    where: { id, deleted_at: null },
    select: { id: true, vendor_id: true, thumbnail_id: true },
  });
  if (!existing) return res.status(404).json({ message: "Product not found" });

  if (
    !(await assertCanAccessProduct(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const media = await prisma.media.findFirst({
    where: {
      id: mediaId,
      collection_name: "product_images",
      mediable_type: "Product",
      mediable_id: id,
    },
  });
  if (!media) return res.status(404).json({ message: "Image not found" });

  if (existing.thumbnail_id === media.id) {
    const next = await prisma.media.findFirst({
      where: {
        collection_name: "product_images",
        mediable_type: "Product",
        mediable_id: id,
        NOT: { id: media.id },
      },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    });
    await prisma.product.update({
      where: { id },
      data: { thumbnail_id: next?.id ?? null },
    });
  }

  const diskPath = path.join(PRODUCT_IMAGES_DIR, media.file_name);
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch {
    /* ignore */
  }
  await prisma.media.delete({ where: { id: media.id } }).catch(() => undefined);

  const full = await prisma.product.findFirstOrThrow({
    where: { id },
    include: productWithCatalogInclude,
  });

  return res.json({
    message: "Product image deleted",
    product: await toPublicProductDetail(full),
  });
});

dashboardProductsRouter.delete("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid product id" });

  const existing = await prisma.product.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Product not found" });

  if (
    !(await assertCanAccessProduct(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  await prisma.product.update({
    where: { id },
    data: { deleted_at: new Date(), status: "archived" },
  });
  await prisma.productVariant.updateMany({
    where: { product_id: id, deleted_at: null },
    data: { deleted_at: new Date(), is_active: false },
  });

  return res.json({ message: "Product deleted" });
});
