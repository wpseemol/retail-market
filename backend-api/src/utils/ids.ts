const MAX_BIGINT_ID = 9223372036854775807n;

/** Positive id that fits a signed MySQL BIGINT, or null (larger values make Prisma throw). */
export function parseBigIntId(raw: unknown): bigint | null {
  const value = String(raw ?? "").trim();
  if (!/^\d{1,19}$/.test(value)) return null;
  const id = BigInt(value);
  return id > 0n && id <= MAX_BIGINT_ID ? id : null;
}
