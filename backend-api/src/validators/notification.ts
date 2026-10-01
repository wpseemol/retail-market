import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z
    .enum(["0", "1", "true", "false", "all"])
    .optional()
    .default("all"),
});
