import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getShippingSettings, toPublicShippingSettings } from "../lib/shipping.js";
import { updateShippingSettingsSchema } from "../validators/shipping.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ensureSiteSettings } from "./publicSiteSettings.js";

/** Mounted under `/api/dashboard/site-settings/shipping` (super_admin only). */
export const dashboardShippingRouter = Router();

dashboardShippingRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await ensureSiteSettings();
    return res.json({ shipping: toPublicShippingSettings(await getShippingSettings()) });
  }),
);

dashboardShippingRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = updateShippingSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    await ensureSiteSettings();
    const before = toPublicShippingSettings(await getShippingSettings());
    const input = parsed.data;

    const data: Prisma.SiteSettingsUpdateInput = {};
    if (input.default_fee !== undefined) {
      data.shipping_default_fee = new Prisma.Decimal(input.default_fee.toFixed(2));
    }
    if (input.free_threshold !== undefined) {
      data.shipping_free_threshold =
        input.free_threshold === null ? null : new Prisma.Decimal(input.free_threshold.toFixed(2));
    }
    if (input.vendor_override !== undefined) data.shipping_vendor_override = input.vendor_override;

    await prisma.siteSettings.update({ where: { id: 1 }, data });
    const after = toPublicShippingSettings(await getShippingSettings());

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after) as Array<keyof typeof after>) {
      if (before[key] !== after[key]) {
        changes[`shipping_${key}`] = { from: before[key], to: after[key] };
      }
    }
    if (Object.keys(changes).length > 0) {
      await prisma.siteSettingsHistory.create({
        data: {
          settings_id: 1,
          actor_id: req.auth!.userId,
          action: "shipping_updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return res.json({ message: "Shipping settings saved", shipping: after });
  }),
);
