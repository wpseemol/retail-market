import { z } from "zod";

export const OVERVIEW_RANGES = [7, 30, 90] as const;

export const overviewQuerySchema = z.object({
  range: z
    .enum(["7", "30", "90"])
    .default("30")
    .transform((v) => Number(v) as (typeof OVERVIEW_RANGES)[number]),
});
