/** Storefront currency — Bangladeshi Taka. */
export const CURRENCY_CODE = "BDT" as const;
export const CURRENCY_LOCALE = "en-BD" as const;

/**
 * Format a product/cart amount as BDT (৳).
 * Whole-taka by default; keeps decimals when present.
 */
export function formatPrice(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  return amount.toLocaleString(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPriceRange(min: number, max: number): string {
  if (max > min) return `${formatPrice(min)} - ${formatPrice(max)}`;
  return formatPrice(min);
}
