import type { VendorMemberRole } from "@prisma/client";
import { prisma } from "./prisma.js";

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

export function isElevatedStaff(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

/** Max store team size: 1 owner + 2 helpers. */
export const VENDOR_MEMBER_MAX = 3;
export const VENDOR_HELPER_MAX = 2;

/**
 * Store ids the actor may work on.
 * - Elevated staff → `null` (all stores)
 * - Vendor with membership(s) → those shop ids
 * - Vendor with no membership → empty array
 */
export async function actorStoreIds(
  userId: bigint,
  role: string,
): Promise<bigint[] | null> {
  if (isElevatedStaff(role)) return null;

  const rows = await prisma.vendorMember.findMany({
    where: { user_id: userId },
    select: { vendor_id: true },
  });
  return rows.map((r) => r.vendor_id);
}

/** First (only) shop a vendor belongs to, or null. */
export async function actorPrimaryShopId(
  userId: bigint,
  role: string,
): Promise<bigint | null> {
  const ids = await actorStoreIds(userId, role);
  if (ids === null) return null;
  return ids[0] ?? null;
}

export async function actorMembership(
  userId: bigint,
  vendorId: bigint,
): Promise<{ role: VendorMemberRole } | null> {
  return prisma.vendorMember.findFirst({
    where: { user_id: userId, vendor_id: vendorId },
    select: { role: true },
  });
}

/**
 * Whether the actor may access a shop.
 * - `read` / `design`: owner, helper, or elevated (admin for design/read)
 * - `manage`: owner or super_admin (helpers cannot change store settings)
 */
export async function canAccessShop(
  vendor: { id: bigint; user_id: bigint },
  userId: bigint,
  role: string,
  mode: "read" | "design" | "manage" = "manage",
): Promise<boolean> {
  if (role === "super_admin") return true;
  if (role === "admin") return mode !== "manage";
  if (role === "moderator") {
    // Moderators assign helpers and view stores; they do not edit store settings.
    return mode === "read";
  }

  const membership = await actorMembership(userId, vendor.id);
  if (!membership) {
    // Legacy fallback while memberships are backfilled.
    if (vendor.user_id === userId) return true;
    return false;
  }
  if (mode === "manage") return membership.role === "owner";
  return true;
}

/** Vendor product/order scope: shop id list, or null for elevated (all). */
export async function productVendorScope(
  userId: bigint,
  role: string,
): Promise<bigint[] | null> {
  return actorStoreIds(userId, role);
}
