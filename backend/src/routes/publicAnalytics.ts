import { createHash } from "node:crypto";
import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { countryFromIp } from "../lib/geo.js";
import { prisma } from "../lib/prisma.js";
import { parseUserAgent } from "../lib/userSession.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const publicAnalyticsRouter = Router();

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const visitSchema = z.object({
  path: withSafeInput(
    z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((value) => value.startsWith("/"), "Path must start with /"),
  ),
  referrer: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null || value === "") return null;
      return value.slice(0, 500);
    }),
});

function clientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim().slice(0, 45) || null;
  }
  return (req.ip ?? req.socket.remoteAddress ?? null)?.slice(0, 45) || null;
}

/** Lightweight storefront visit beacon — no auth. */
publicAnalyticsRouter.post("/visit", async (req, res) => {
  const parsed = visitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }

  const ip = clientIp(req);
  const ua = typeof req.headers["user-agent"] === "string"
    ? req.headers["user-agent"]
    : undefined;
  const parsedUa = parseUserAgent(ua);

  await prisma.pageVisit.create({
    data: {
      country: countryFromIp(ip),
      path: parsed.data.path.slice(0, 255),
      referrer: parsed.data.referrer,
      ip_hash: ip
        ? createHash("sha256").update(ip).digest("hex").slice(0, 64)
        : null,
      device_type: parsedUa.device_type,
    },
  });

  return res.status(204).send();
});
