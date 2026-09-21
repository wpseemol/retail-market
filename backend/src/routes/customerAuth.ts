import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAuthToken } from "../lib/token.js";
import { toPublicUser } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const customerAuthRouter = Router();

const registerSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const updateProfileSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    date_of_birth: z.string().date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

/** Storefront only — always creates a customer account. */
customerAuthRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { first_name, last_name, email, password, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      OR: [
        { email: normalizedEmail },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existing) {
    return res.status(409).json({ message: "Email or phone already in use" });
  }

  const user = await prisma.user.create({
    data: {
      first_name,
      last_name,
      email: normalizedEmail,
      phone: phone || null,
      password: await hashPassword(password),
      role: "customer",
      status: "active",
    },
    include: { avatar: true },
  });

  const token = signAuthToken({
    sub: user.id.toString(),
    role: user.role,
  });

  return res.status(201).json({
    message: "Registered successfully",
    token,
    user: toPublicUser(user),
  });
});

/** Storefront only — customers may log in here. */
customerAuthRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
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

  if (user.role !== "customer") {
    return res.status(403).json({
      message:
        "Staff accounts (super admin, admin, moderator, vendor) cannot sign in on the storefront. Use the dashboard login instead.",
      code: "STAFF_USE_DASHBOARD",
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
    user: toPublicUser(updated),
  });
});

customerAuthRouter.get(
  "/me",
  requireAuth,
  requireRoles("customer"),
  (req, res) => {
    return res.json({ user: req.auth!.user });
  },
);

customerAuthRouter.patch(
  "/me",
  requireAuth,
  requireRoles("customer"),
  async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    if (data.phone) {
      const phoneTaken = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          deleted_at: null,
          NOT: { id: req.auth!.userId },
        },
      });

      if (phoneTaken) {
        return res.status(409).json({ message: "Phone already in use" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone === undefined ? undefined : data.phone,
        gender: data.gender === undefined ? undefined : data.gender,
        date_of_birth:
          data.date_of_birth === undefined
            ? undefined
            : data.date_of_birth
              ? new Date(data.date_of_birth)
              : null,
      },
      include: { avatar: true },
    });

    return res.json({
      message: "Profile updated",
      user: toPublicUser(user),
    });
  },
);
