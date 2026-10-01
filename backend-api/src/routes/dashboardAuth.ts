import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { uploadAvatar } from "../controllers/customerAuthController.js";
import { AVATAR_MAX_BYTES } from "../lib/avatarImage.js";
import { isAvatarPresetId } from "../lib/avatarPresets.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createUserSession,
  rotateUserSession,
} from "../lib/userSession.js";
import { toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import { verifyRefreshToken } from "../lib/token.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  requireAuth,
  requireRoles,
  STAFF_ROLES,
} from "../middleware/auth.js";
import { avatarUpload } from "../middleware/upload.js";
import { findUnsafeInputReason, refreshSchema } from "../validators/customerAuth.js";

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

/**
 * Exchange a staff refreshToken for a new access + refresh pair.
 * Called by the dashboard when the access token expires (401).
 */
dashboardAuthRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  let payload;
  try {
    payload = verifyRefreshToken(parsed.data.refreshToken);
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  if (!payload.sid) {
    return res.status(401).json({
      message: "Refresh token is missing session id — please log in again",
      code: "SESSION_REQUIRED",
    });
  }

  if (!STAFF_ROLES.includes(payload.role)) {
    return res.status(403).json({
      message: "Refresh is only available for dashboard staff sessions",
    });
  }

  const user = await prisma.user.findFirst({
    where: { id: BigInt(payload.sub), deleted_at: null },
    include: userWithAvatarInclude,
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: `Account is ${user.status}` });
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return res.status(403).json({
      message: "Refresh is only available for dashboard staff sessions",
    });
  }

  const rotated = await rotateUserSession({
    sessionId: payload.sid,
    userId: user.id,
    role: user.role,
    oldRefreshToken: parsed.data.refreshToken,
    req,
  });

  if (!rotated) {
    return res.status(401).json({
      message: "Session revoked or expired — please log in again",
      code: "SESSION_REVOKED",
    });
  }

  return res.json({
    message: "Token refreshed",
    ...rotated.tokens,
    sessionId: rotated.sessionId,
    home: ROLE_HOME[user.role as Exclude<UserRole, "customer">],
    user: toPublicUser(user),
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
    avatar_preset: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value, ctx) => {
        if (value === undefined) return undefined;
        if (value === null || value === "") return null;
        const trimmed = String(value).trim();
        if (!isAvatarPresetId(trimmed)) {
          ctx.addIssue({ code: "custom", message: "Invalid avatar preset" });
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
      data.phone !== undefined ||
      data.avatar_preset !== undefined,
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
        ...(data.avatar_preset === undefined
          ? {}
          : data.avatar_preset === null
            ? { avatar_preset: null }
            : { avatar_preset: data.avatar_preset, avatar_id: null }),
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

dashboardAuthRouter.post(
  "/me/avatar",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              message: `Image must be ${Math.floor(AVATAR_MAX_BYTES / (1024 * 1024))} MB or smaller`,
              code: "AVATAR_TOO_LARGE",
            });
          }
          return res.status(400).json({
            message: "Invalid upload",
            code: err.code,
          });
        }
        const message =
          err instanceof Error ? err.message : "Avatar upload failed";
        return res.status(400).json({ message, code: "AVATAR_UPLOAD_FAILED" });
      }
      return next();
    });
  },
  asyncHandler(uploadAvatar),
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
