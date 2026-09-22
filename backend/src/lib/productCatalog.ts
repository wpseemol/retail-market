import type { Media, Prisma } from "@prisma/client";
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
