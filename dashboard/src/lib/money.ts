/** Dashboard currency — Bangladeshi Taka. */
export const CURRENCY_CODE = "BDT" as const;
export const CURRENCY_LOCALE = "en-BD" as const;

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
