import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type ShippingSettings = {
  defaultFee: Prisma.Decimal;
  freeThreshold: Prisma.Decimal | null;
  vendorOverride: boolean;
};

export async function getShippingSettings(): Promise<ShippingSettings> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: {
      shipping_default_fee: true,
      shipping_free_threshold: true,
      shipping_vendor_override: true,
    },
  });
  return {
    defaultFee: row?.shipping_default_fee ?? new Prisma.Decimal(60),
    freeThreshold: row?.shipping_free_threshold ?? null,
    vendorOverride: row?.shipping_vendor_override ?? true,
  };
}

export function toPublicShippingSettings(s: ShippingSettings) {
  return {
    default_fee: Number(s.defaultFee),
    free_threshold: s.freeThreshold === null ? null : Number(s.freeThreshold),
    vendor_override: s.vendorOverride,
  };
}

export type ShippingLine = {
  /** Lines from the same store ship together as one parcel. */
  vendorId: bigint | null;
  /** Product's own fee; null → site default. */
  productFee: Prisma.Decimal | null;
  lineTotal: Prisma.Decimal;
};

/**
 * Order shipping = for each store, the highest fee among its items (one parcel
 * per store), summed. Whole order is free once the subtotal reaches the
 * free-shipping threshold.
 */
export function calculateShipping(lines: ShippingLine[], settings: ShippingSettings) {
  const zero = new Prisma.Decimal(0);
  const subtotal = lines.reduce((sum, l) => sum.add(l.lineTotal), zero);

  if (lines.length === 0) {
    return { fee: zero, subtotal, freeApplied: false };
  }
  if (settings.freeThreshold !== null && subtotal.gte(settings.freeThreshold)) {
    return { fee: zero, subtotal, freeApplied: true };
  }

  const perStore = new Map<string, Prisma.Decimal>();
  for (const line of lines) {
    const key = line.vendorId?.toString() ?? "platform";
    const fee = line.productFee ?? settings.defaultFee;
    const current = perStore.get(key);
    if (!current || fee.gt(current)) perStore.set(key, fee);
  }
  const fee = [...perStore.values()].reduce((sum, f) => sum.add(f), zero);
  return { fee, subtotal, freeApplied: false };
}
