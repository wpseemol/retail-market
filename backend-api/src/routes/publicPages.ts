import { Router } from "express";
import { toPublicContentPage } from "../lib/contentPages.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { contentPageKeySchema } from "../validators/contentPage.js";

/** Storefront content pages — `GET /api/pages/:key` (`faq` | `terms`). */
export const publicPagesRouter = Router();

publicPagesRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const key = contentPageKeySchema.safeParse(req.params.key);
    if (!key.success) return res.status(404).json({ message: "Page not found" });

    const row = await prisma.contentPage.findUnique({ where: { page_key: key.data } });
    if (row && !row.is_published) return res.status(404).json({ message: "Page not found" });

    return res.json({ page: toPublicContentPage(key.data, row) });
  }),
);
