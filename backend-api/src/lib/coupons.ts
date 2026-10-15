import { Prisma } from "@prisma/client";

export type Coupon = { code: string; percent: number };

/**
 * Storefront coupons. The discount is always computed here from the order subtotal;
 * clients only send the code. Move to a DB table when coupons need expiry / usage limits.
 */
const COUPONS: Record<string, Coupon> = {
  SAVE10: { code: "SAVE10", percent: 10 },
  SAVE20: { code: "SAVE20", percent: 20 },
};

export function findCoupon(code: string | null | undefined): Coupon | null {
  if (!code) return null;
  return COUPONS[code.trim().toUpperCase()] ?? null;
}

export function couponDiscount(coupon: Coupon, subtotal: Prisma.Decimal): Prisma.Decimal {
  const discount = subtotal.mul(coupon.percent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  return Prisma.Decimal.min(discount, subtotal);
}

export function publicCoupon(coupon: Coupon) {
  return { code: coupon.code, percent: coupon.percent };
}
