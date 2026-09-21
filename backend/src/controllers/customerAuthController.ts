import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { issueAuthTokens, verifyRefreshToken } from "../lib/token.js";
import { toPublicUser } from "../lib/user.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/customerAuth.js";

/** Storefront only — always creates a customer account. */
export async function register(req: Request, res: Response) {
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
      OR: [{ email: normalizedEmail }, ...(phone ? [{ phone }] : [])],
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

  const tokens = issueAuthTokens({
    sub: user.id.toString(),
    role: user.role,
  });

  return res.status(201).json({
    message: "Registered successfully",
    ...tokens,
    user: toPublicUser(user),
  });
}

/** Storefront only — customers may log in here. */
export async function login(req: Request, res: Response) {
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

  if (
    !user?.password ||
    !(await verifyPassword(parsed.data.password, user.password))
  ) {
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

  const tokens = issueAuthTokens({
    sub: updated.id.toString(),
    role: updated.role,
  });

  return res.json({
    message: "Logged in successfully",
    ...tokens,
    user: toPublicUser(updated),
  });
}

/**
 * Exchange a valid refresh token for a new access + refresh pair.
 * Refresh tokens are custom-typed (`typ: "refresh"`) and last ~1 year.
 */
export async function refresh(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  let payload;
  try {
    payload = verifyRefreshToken(parsed.data.refreshToken);
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  if (payload.role !== "customer") {
    return res.status(403).json({
      message: "Refresh is only available for customer storefront sessions",
    });
  }

  const user = await prisma.user.findFirst({
    where: { id: BigInt(payload.sub), deleted_at: null },
    include: { avatar: true },
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: `Account is ${user.status}` });
  }

  if (user.role !== "customer") {
    return res.status(403).json({
      message: "Refresh is only available for customer storefront sessions",
    });
  }

  const tokens = issueAuthTokens({
    sub: user.id.toString(),
    role: user.role,
  });

  return res.json({
    message: "Token refreshed",
    ...tokens,
    user: toPublicUser(user),
  });
}

export function getMe(req: Request, res: Response) {
  return res.json({ user: req.auth!.user });
}

export async function updateMe(req: Request, res: Response) {
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
}
