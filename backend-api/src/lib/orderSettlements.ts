import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type SettlementLineInput = {
  vendorId: bigint | null;
  shopName: string | null;
  lineTotal: number;
  commissionPercent: number;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Build per-store settlement rows from checkout line totals.
 * Platform fee applies to product subtotal only (after proportional discount share).
 * `vendor_id` null = Niyenin platform lines (100% platform fee).
 */
export function buildOrderSettlements(input: {
  lines: SettlementLineInput[];
  orderDiscount: number;
}): Array<{
  vendor_id: bigint | null;
  shop_name: string | null;
  subtotal: number;
  discount_share: number;
  commission_percent: number;
  platform_fee: number;
  vendor_net: number;
}> {
  const groups = new Map<
    string,
    {
      vendorId: bigint | null;
      shopName: string | null;
      subtotal: number;
      commissionPercent: number;
    }
  >();

  for (const line of input.lines) {
    const key = line.vendorId?.toString() ?? "platform";
    const existing = groups.get(key);
    if (existing) {
      existing.subtotal += line.lineTotal;
    } else {
      groups.set(key, {
        vendorId: line.vendorId,
        shopName: line.shopName,
        subtotal: line.lineTotal,
        commissionPercent: line.vendorId === null ? 100 : line.commissionPercent,
      });
    }
  }

  const orderSubtotal = [...groups.values()].reduce((s, g) => s + g.subtotal, 0);
  const discount = Math.max(0, input.orderDiscount);

  const rows: Array<{
    vendor_id: bigint | null;
    shop_name: string | null;
    subtotal: number;
    discount_share: number;
    commission_percent: number;
    platform_fee: number;
    vendor_net: number;
  }> = [];

  let allocatedDiscount = 0;
  const entries = [...groups.values()];
  entries.forEach((g, index) => {
    const isLast = index === entries.length - 1;
    const discountShare =
      orderSubtotal <= 0
        ? 0
        : isLast
          ? roundMoney(discount - allocatedDiscount)
          : roundMoney((discount * g.subtotal) / orderSubtotal);
    allocatedDiscount = roundMoney(allocatedDiscount + discountShare);

    const netSubtotal = Math.max(0, roundMoney(g.subtotal - discountShare));
    const percent = g.vendorId === null ? 100 : Math.min(100, Math.max(0, g.commissionPercent));
    const platformFee = roundMoney((netSubtotal * percent) / 100);
    const vendorNet = g.vendorId === null ? 0 : roundMoney(netSubtotal - platformFee);

    rows.push({
      vendor_id: g.vendorId,
      shop_name: g.shopName,
      subtotal: roundMoney(g.subtotal),
      discount_share: discountShare,
      commission_percent: percent,
      platform_fee: platformFee,
      vendor_net: vendorNet,
    });
  });

  return rows;
}

export async function persistOrderSettlements(
  tx: Prisma.TransactionClient | typeof prisma,
  orderId: bigint,
  settlements: ReturnType<typeof buildOrderSettlements>,
) {
  if (settlements.length === 0) return;
  await tx.orderVendorSettlement.createMany({
    data: settlements.map((s) => ({
      order_id: orderId,
      vendor_id: s.vendor_id,
      shop_name: s.shop_name,
      subtotal: s.subtotal,
      discount_share: s.discount_share,
      commission_percent: s.commission_percent,
      platform_fee: s.platform_fee,
      vendor_net: s.vendor_net,
    })),
  });
}

export function toPublicSettlement(row: {
  id: bigint;
  vendor_id: bigint | null;
  shop_name: string | null;
  subtotal: { toString(): string } | number;
  discount_share: { toString(): string } | number;
  commission_percent: { toString(): string } | number;
  platform_fee: { toString(): string } | number;
  vendor_net: { toString(): string } | number;
  vendor?: { id: bigint; shop_name: string; slug: string } | null;
}) {
  return {
    id: row.id.toString(),
    vendor_id: row.vendor_id?.toString() ?? null,
    shop_name: row.shop_name ?? row.vendor?.shop_name ?? "Niyenin",
    vendor: row.vendor
      ? {
          id: row.vendor.id.toString(),
          shop_name: row.vendor.shop_name,
          slug: row.vendor.slug,
        }
      : null,
    subtotal: Number(row.subtotal),
    discount_share: Number(row.discount_share),
    commission_percent: Number(row.commission_percent),
    platform_fee: Number(row.platform_fee),
    vendor_net: Number(row.vendor_net),
  };
}
