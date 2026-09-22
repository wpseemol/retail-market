import { Router } from "express";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
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

/** Email or phone + password (staff only). */
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

function looksLikeEmail(value: string) {
  return value.includes("@");
}

/** Dashboard only — staff roles; customers are rejected. */
dashboardAuthRouter.post("/login", async (req, res) => {
  // Accept `identifier`, or legacy `email` / `phone`.
  const body = {
    identifier:
      typeof req.body?.identifier === "string"
        ? req.body.identifier
        : typeof req.body?.email === "string"
          ? req.body.email
          : typeof req.body?.phone === "string"
            ? req.body.phone
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

  const user = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      OR: looksLikeEmail(raw)
        ? [{ email: raw.toLowerCase() }]
        : [{ phone: raw }, { email: raw.toLowerCase() }],
    },
    include: userWithAvatarInclude,
  });

  if (!user?.password || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ message: "Invalid email/phone or password" });
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
