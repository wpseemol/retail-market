import { Router } from "express";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createUserSession } from "../lib/userSession.js";
import { toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import {
  requireAuth,
  requireRoles,
  STAFF_ROLES,
} from "../middleware/auth.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardAuthRouter = Router();

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

/** Username, email, or phone + password (staff only). */
const staffLoginSchema = z.object({
  identifier: withSafeInput(z.string().trim().min(3).max(255)),
  password: withSafeInput(z.string().min(1).max(128)),
});

const ROLE_HOME: Record<Exclude<UserRole, "customer">, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

/** Dashboard only — staff roles; customers are rejected. */
dashboardAuthRouter.post("/login", async (req, res) => {
  // Accept `identifier`, or legacy `email` / `phone` / `username`.
  const body = {
    identifier:
      typeof req.body?.identifier === "string"
        ? req.body.identifier
        : typeof req.body?.email === "string"
          ? req.body.email
          : typeof req.body?.phone === "string"
            ? req.body.phone
            : typeof req.body?.username === "string"
              ? req.body.username
              : "",
    password: req.body?.password,
  };

  const parsed = staffLoginSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const raw = parsed.data.identifier.trim();
  const password = parsed.data.password;
  const normalized = raw.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      OR: [
        { email: normalized },
        { username: normalized },
        { phone: raw },
      ],
    },
    include: userWithAvatarInclude,
  });

  if (!user?.password || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({
      message: "Invalid username, email, phone, or password",
    });
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return res.status(403).json({
      message:
        "Customer accounts cannot sign in on the dashboard. Use the storefront login instead.",
      code: "CUSTOMER_USE_STOREFRONT",
    });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: `Account is ${user.status}` });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      last_login_at: new Date(),
      last_login_ip: req.ip ?? null,
    },
    include: userWithAvatarInclude,
  });

  const { sessionId, tokens } = await createUserSession({
    userId: updated.id,
    role: updated.role,
    req,
    loginMethod: "password",
  });

  return res.json({
    message: "Logged in successfully",
    ...tokens,
    sessionId,
    home: ROLE_HOME[updated.role as Exclude<UserRole, "customer">],
    user: toPublicUser(updated),
  });
});

function withSafeTrimmed(min: number, max: number) {
  return withSafeInput(z.string().trim().min(min).max(max));
}

const updateStaffProfileSchema = z
  .object({
    first_name: withSafeTrimmed(1, 100).optional(),
    last_name: withSafeTrimmed(1, 100).optional(),
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
  })
  .refine(
    (data) =>
      data.first_name !== undefined ||
      data.last_name !== undefined ||
      data.username !== undefined ||
      data.phone !== undefined,
    { message: "At least one field is required" },
  );

const changePasswordSchema = z
  .object({
    current_password: withSafeInput(z.string().min(1).max(128)),
    new_password: withSafeInput(z.string().min(8).max(128)),
    confirm_password: withSafeInput(z.string().min(8).max(128)),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from the current password",
    path: ["new_password"],
  });

dashboardAuthRouter.get(
  "/me",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  (req, res) => {
    return res.json({
      user: req.auth!.user,
      home: ROLE_HOME[req.auth!.role as Exclude<UserRole, "customer">],
    });
  },
);

dashboardAuthRouter.patch(
  "/me",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  async (req, res) => {
    const parsed = updateStaffProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const userId = req.auth!.userId;

    if (data.username) {
      const usernameTaken = await prisma.user.findFirst({
        where: {
          username: data.username,
          deleted_at: null,
          NOT: { id: userId },
        },
      });
      if (usernameTaken) {
        return res.status(409).json({ message: "Username already in use" });
      }
    }

    if (data.phone) {
      const phoneTaken = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          deleted_at: null,
          NOT: { id: userId },
        },
      });
      if (phoneTaken) {
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
      },
      include: userWithAvatarInclude,
    });

    return res.json({
      message: "Profile updated",
      user: toPublicUser(user),
    });
  },
);

dashboardAuthRouter.post(
  "/change-password",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message:
          parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.auth!.userId, deleted_at: null },
    });

    if (!user?.password) {
      return res.status(400).json({
        message: "Password change is not available for this account",
      });
    }

    const { current_password, new_password } = parsed.data;
    if (!(await verifyPassword(current_password, user.password))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(new_password) },
    });

    return res.json({ message: "Password updated successfully" });
  },
);

dashboardAuthRouter.get(
  "/workspace/super-admin",
  requireAuth,
  requireRoles("super_admin"),
  (req, res) => {
    return res.json({
      workspace: "super_admin",
      user: req.auth!.user,
    });
  },
);

dashboardAuthRouter.get(
  "/workspace/admin",
  requireAuth,
  requireRoles("admin", "super_admin"),
  (req, res) => {
    return res.json({
      workspace: "admin",
      user: req.auth!.user,
    });
  },
);

dashboardAuthRouter.get(
  "/workspace/moderator",
  requireAuth,
  requireRoles("moderator", "super_admin"),
  (req, res) => {
    return res.json({
      workspace: "moderator",
      user: req.auth!.user,
    });
  },
);

dashboardAuthRouter.get(
  "/workspace/vendor",
  requireAuth,
  requireRoles("vendor", "super_admin"),
  (req, res) => {
    return res.json({
      workspace: "vendor",
      user: req.auth!.user,
    });
  },
);
