import type { Media, Prisma, ProductStatus, ProductType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { toPublicMedia } from "./user.js";
import {
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "./productImage.js";

type CreateProductMediaInput = {
  userId: bigint | null;
  fileName: string;
  originalName?: string | null;
  fileSize: number;
  mimeType: string;
  mediableType: "Product" | "ProductVariant" | "Category";
  mediableId: bigint;
  altText?: string | null;
  sortOrder?: number;
};

/** Persist a product image row in `medias` (files live under uploads/products/). */
export async function createProductMedia(
  input: CreateProductMediaInput,
): Promise<Media> {
  return prisma.media.create({
    data: {
      user_id: input.userId,
      disk: "public",
      file_name: input.fileName,
      original_name: sanitizeOriginalName(input.originalName ?? undefined),
      file_path: PRODUCT_IMAGES_RELATIVE,
      file_size: BigInt(input.fileSize),
      mime_type: input.mimeType,
      alt_text: input.altText?.slice(0, 255) ?? null,
      collection_name: "product_images",
      is_public: true,
      mediable_type: input.mediableType,
      mediable_id: input.mediableId,
      sort_order: input.sortOrder ?? 0,
    },
  });
}

export async function listProductGallery(productId: bigint) {
  const medias = await prisma.media.findMany({
    where: {
      collection_name: "product_images",
      mediable_type: "Product",
      mediable_id: productId,
    },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });
  return medias.map(toPublicMedia);
}

export type ProductMediaPublic = ReturnType<typeof toPublicMedia>;

export const productWithCatalogInclude = {
  category: true,
  brandRef: true,
  vendor: true,
  thumbnail: true,
  options: {
    orderBy: { position: "asc" as const },
    include: {
      values: { orderBy: { position: "asc" as const } },
    },
  },
  variants: {
    where: { deleted_at: null },
    orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
    include: {
      image: true,
      optionValues: {
        include: {
          optionValue: {
            include: { option: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{
  include: typeof productWithCatalogInclude;
}>;

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function toPublicProduct(row: ProductRow) {
  return {
    id: row.id.toString(),
    vendor_id: row.vendor_id?.toString() ?? null,
    category_id: row.category_id?.toString() ?? null,
    brand_id: row.brand_id?.toString() ?? null,
    thumbnail_id: row.thumbnail_id?.toString() ?? null,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    barcode: row.barcode,
    brand_name: row.brandRef?.name ?? row.brand,
    brand: row.brandRef
      ? {
          id: row.brandRef.id.toString(),
          name: row.brandRef.name,
          slug: row.brandRef.slug,
          is_active: row.brandRef.is_active,
        }
      : row.brand
        ? {
            id: null as string | null,
            name: row.brand,
            slug: null as string | null,
            is_active: true,
          }
        : null,
    /** True when linked brand is inactive (banned from catalog). */
    brand_banned: row.brandRef ? !row.brandRef.is_active : false,
    description: row.description,
    short_description: row.short_description,
    type: row.type as ProductType,
    price: decimalToNumber(row.price) ?? 0,
    compare_at_price: decimalToNumber(row.compare_at_price),
    cost_price: decimalToNumber(row.cost_price),
    stock_qty: row.stock_qty,
    status: row.status as ProductStatus,
    is_featured: row.is_featured,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    thumbnail: toPublicMedia(row.thumbnail),
    category: row.category
      ? {
          id: row.category.id.toString(),
          name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    vendor: row.vendor
      ? {
          id: row.vendor.id.toString(),
          shop_name: row.vendor.shop_name,
          slug: row.vendor.slug,
        }
      : null,
    options: row.options.map((opt) => ({
      id: opt.id.toString(),
      name: opt.name,
      position: opt.position,
      values: opt.values.map((v) => ({
        id: v.id.toString(),
        value: v.value,
        color_hex: v.color_hex,
        position: v.position,
      })),
    })),
    variants: row.variants.map((variant) => ({
      id: variant.id.toString(),
      sku: variant.sku,
      title: variant.title,
      price: decimalToNumber(variant.price),
      compare_at_price: decimalToNumber(variant.compare_at_price),
      stock_qty: variant.stock_qty,
      is_default: variant.is_default,
      is_active: variant.is_active,
      position: variant.position,
      image: toPublicMedia(variant.image),
      option_values: variant.optionValues.map((link) => ({
        option: link.optionValue.option.name,
        value: link.optionValue.value,
        option_value_id: link.optionValue.id.toString(),
      })),
    })),
  };
}

/** Detail payload with gallery media for create/edit screens. */
export async function toPublicProductDetail(row: ProductRow) {
  const gallery = await listProductGallery(row.id);
  return {
    ...toPublicProduct(row),
    gallery,
  };
}

export type PublicProduct = ReturnType<typeof toPublicProduct>;
