import { z } from "zod";

const MAX_BIGINT_ID = 9223372036854775807n;

/** Numeric product id that fits a signed MySQL BIGINT (larger values make Prisma throw). */
export const productIdField = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{1,19}$/, "Invalid product id")
      .refine((value) => {
        try {
          return BigInt(value) > 0n && BigInt(value) <= MAX_BIGINT_ID;
        } catch {
          return false;
        }
      }, "Invalid product id"),
  );
