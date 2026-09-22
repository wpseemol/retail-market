import { Router } from "express";
import { z } from "zod";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardUsersRouter = Router();

dashboardUsersRouter.use(requireAuth, requireRoles("super_admin"));

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const ALL_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "vendor",
  "customer",
];

const ALL_STATUSES: UserStatus[] = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "banned",
];

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]).optional(),
  status: z.enum(ALL_STATUSES as [UserStatus, ...UserStatus[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateUserSchema = z.object({
  first_name: withSafeInput(z.string().trim().min(1).max(100)).optional(),
  last_name: withSafeInput(z.string().trim().min(1).max(100)).optional(),
  username: withSafeInput(
    z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username may only contain letters, numbers, dots, underscores, and hyphens",
      ),
  )
    .optional()
    .transform((value) => value?.toLowerCase()),
  phone: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const reason = findUnsafeInputReason(trimmed);
      if (reason) {
        ctx.addIssue({ code: "custom", message: reason });
        return z.NEVER;
      }
      if (trimmed.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "Phone must be at most 30 characters",
        });
        return z.NEVER;
      }
      return trimmed;
    }),
  email: withSafeInput(z.string().trim().email().max(255))
    .optional()
    .transform((value) => value?.toLowerCase()),
  role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]).optional(),
  status: z.enum(ALL_STATUSES as [UserStatus, ...UserStatus[]]).optional(),
});

const restrictSchema = z.object({
  status: z.enum(["inactive", "suspended", "banned"]),
  reason: withSafeInput(z.string().trim().min(3).max(500)).optional(),
});

async function revokeUserSessions(userId: bigint) {
  await prisma.userSession.updateMany({
    where: { user_id: userId, is_revoked: false },
    data: {
      is_revoked: true,
      revoked_at: new Date(),
    },
  });
}

function parseUserId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

dashboardUsersRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { q, role, status, page, limit } = parsed.data;
  const where: Prisma.UserWhereInput = {
    deleted_at: null,
  };

  if (role) where.role = role;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { username: { contains: q } },
      { phone: { contains: q } },
      { first_name: { contains: q } },
      { last_name: { contains: q } },
    ];
  }

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: userWithAvatarInclude,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return res.json({
    users: rows.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

dashboardUsersRouter.get("/:id", async (req, res) => {
  const userId = parseUserId(String(req.params.id));
  if (!userId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    include: userWithAvatarInclude,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: toPublicUser(user) });
});

dashboardUsersRouter.patch("/:id", async (req, res) => {
  const userId = parseUserId(String(req.params.id));
  if (!userId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "At least one field is required" });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!existing) {
    return res.status(404).json({ message: "User not found" });
  }

  const actorId = req.auth!.userId;

  // Protect other super admins from role/status demotion by peers.
  if (
    existing.role === "super_admin" &&
    existing.id !== actorId &&
    (data.role !== undefined || data.status !== undefined)
  ) {
    return res.status(403).json({
      message: "You cannot change another super admin's role or status",
    });
  }

  if (existing.id === actorId && data.role && data.role !== "super_admin") {
    return res.status(400).json({
      message: "You cannot remove your own super admin role",
    });
  }

  if (
    existing.id === actorId &&
    data.status &&
    data.status !== "active"
  ) {
    return res.status(400).json({
      message: "You cannot restrict your own account",
    });
  }

  if (data.username) {
    const taken = await prisma.user.findFirst({
      where: {
        username: data.username,
        deleted_at: null,
        NOT: { id: userId },
      },
    });
    if (taken) {
      return res.status(409).json({ message: "Username already in use" });
    }
  }

  if (data.email) {
    const taken = await prisma.user.findFirst({
      where: {
        email: data.email,
        deleted_at: null,
        NOT: { id: userId },
      },
    });
    if (taken) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  if (data.phone) {
    const taken = await prisma.user.findFirst({
      where: {
        phone: data.phone,
        deleted_at: null,
        NOT: { id: userId },
      },
    });
    if (taken) {
      return res.status(409).json({ message: "Phone already in use" });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      phone: data.phone === undefined ? undefined : data.phone,
      email: data.email,
      role: data.role,
      status: data.status,
    },
    include: userWithAvatarInclude,
  });

  if (data.status && data.status !== "active") {
    await revokeUserSessions(userId);
  }

  return res.json({
    message: "User updated",
    user: toPublicUser(user),
  });
});

/** Restrict / block: inactive, suspended, or banned (full block). */
dashboardUsersRouter.post("/:id/restrict", async (req, res) => {
  const userId = parseUserId(String(req.params.id));
  if (!userId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const parsed = restrictSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!existing) {
    return res.status(404).json({ message: "User not found" });
  }

  if (existing.id === req.auth!.userId) {
    return res.status(400).json({ message: "You cannot restrict your own account" });
  }

  if (existing.role === "super_admin") {
    return res.status(403).json({
      message: "You cannot restrict another super admin",
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: parsed.data.status },
    include: userWithAvatarInclude,
  });

  await revokeUserSessions(userId);

  return res.json({
    message:
      parsed.data.status === "banned"
        ? "User completely blocked"
        : `User marked as ${parsed.data.status}`,
    reason: parsed.data.reason ?? null,
    user: toPublicUser(user),
  });
});

dashboardUsersRouter.post("/:id/unblock", async (req, res) => {
  const userId = parseUserId(String(req.params.id));
  if (!userId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!existing) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
    include: userWithAvatarInclude,
  });

  return res.json({
    message: "User unrestricted and set to active",
    user: toPublicUser(user),
  });
});
