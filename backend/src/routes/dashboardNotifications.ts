import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toPublicNotification } from "../lib/notifications.js";
import { requireAuth, requireRoles, STAFF_ROLES } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listNotificationsQuerySchema } from "../validators/notification.js";

export const dashboardNotificationsRouter = Router();

dashboardNotificationsRouter.use(requireAuth, requireRoles(...STAFF_ROLES));

dashboardNotificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const unread_count = await prisma.notification.count({
      where: {
        user_id: req.auth!.userId,
        read_at: null,
      },
    });
    return res.json({ unread_count });
  }),
);

dashboardNotificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listNotificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid query",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, unread } = parsed.data;
    const where = {
      user_id: req.auth!.userId,
      ...(unread === "1" || unread === "true"
        ? { read_at: null }
        : unread === "0" || unread === "false"
          ? { read_at: { not: null } }
          : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const unread_count = await prisma.notification.count({
      where: { user_id: req.auth!.userId, read_at: null },
    });

    return res.json({
      notifications: rows.map(toPublicNotification),
      unread_count,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

dashboardNotificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { user_id: req.auth!.userId, read_at: null },
      data: { read_at: new Date() },
    });
    return res.json({ message: "All marked as read", updated: result.count });
  }),
);

dashboardNotificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const id = BigInt(String(req.params.id));
    const row = await prisma.notification.findFirst({
      where: { id, user_id: req.auth!.userId },
    });
    if (!row) {
      return res.status(404).json({ message: "Notification not found" });
    }
    const updated =
      row.read_at != null
        ? row
        : await prisma.notification.update({
            where: { id },
            data: { read_at: new Date() },
          });
    return res.json({ notification: toPublicNotification(updated) });
  }),
);

dashboardNotificationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(String(req.params.id));
    const row = await prisma.notification.findFirst({
      where: { id, user_id: req.auth!.userId },
      select: { id: true },
    });
    if (!row) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await prisma.notification.delete({ where: { id } });
    return res.json({ message: "Notification removed" });
  }),
);
