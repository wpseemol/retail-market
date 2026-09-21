import { Router } from "express";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { signAuthToken } from "../lib/token.js";
import { toPublicUser } from "../lib/user.js";
import {
  requireAuth,
  requireRoles,
  STAFF_ROLES,
} from "../middleware/auth.js";

export const dashboardAuthRouter = Router();

const staffLoginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const ROLE_HOME: Record<Exclude<UserRole, "customer">, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

/** Dashboard only — staff roles; customers are rejected. */
dashboardAuthRouter.post("/login", async (req, res) => {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
    include: { avatar: true },
  });

  if (!user?.password || !(await verifyPassword(parsed.data.password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return res.status(403).json({
      message: "Customer accounts must sign in through the storefront",
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
    include: { avatar: true },
  });

  const token = signAuthToken({
    sub: updated.id.toString(),
    role: updated.role,
  });

  return res.json({
    message: "Logged in successfully",
    token,
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

/** Each staff role keeps its own workspace endpoint. */
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
