import type { Request, Response } from "express";
import type { User, UserAvatar } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyGoogleIdToken } from "../lib/googleAuth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { issueAuthTokens, verifyRefreshToken } from "../lib/token.js";
import { toPublicUser } from "../lib/user.js";
import {
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/customerAuth.js";

type UserWithAvatar = User & { avatar: UserAvatar | null };

/**
 * Customer auth tokens (see `lib/token.ts`):
 *
 * - accessToken  — short-lived JWT (`typ: "access"`, default 1h).
 *                  Client sends it as `Authorization: Bearer <accessToken>`.
 *                  Checked by `requireAuth` on protected routes (`/me`, etc.).
 *
 * - refreshToken — long-lived JWT (`typ: "refresh"`, default 365d / ~1 year).
 *                  Stored by the client; NOT sent on normal API calls.
 *                  Sent only to `POST /api/auth/refresh` to get a new token pair
 *                  when the access token expires (keeps the user logged in).
 *
 * `issueAuthTokens()` returns both, plus legacy `token` (= accessToken).
 */

async function markLoginAndIssueTokens(
  user: UserWithAvatar,
  req: Request,
  message: string,
  status = 200,
) {
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

  return {
    status,
    body: {
      message,
      ...tokens,
      user: toPublicUser(updated),
    },
  };
}

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
    if (existing.provider_name === "google" && !existing.password) {
      return res.status(409).json({
        message:
          "An account with this email already uses Google sign-in. Continue with Google instead.",
        code: "USE_GOOGLE",
      });
    }
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

  // Issue accessToken (API calls) + refreshToken (stay logged in ~1 year).
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

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Google-only account (no local password) — guide user to Continue with Google.
  if (!user.password) {
    if (user.provider_name === "google") {
      return res.status(401).json({
        message:
          "This account uses Google sign-in. Continue with Google instead of a password.",
        code: "USE_GOOGLE",
      });
    }
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (!(await verifyPassword(parsed.data.password, user.password))) {
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

  const result = await markLoginAndIssueTokens(
    user,
    req,
    "Logged in successfully",
  );
  return res.status(result.status).json(result.body);
}

/**
 * Google Sign-In (storefront customers only).
 *
 * Client sends Google Identity Services ID token (`credential`).
 * Professional account resolution:
 *
 * 1. Match `provider_name=google` + `provider_id` → sign in.
 * 2. Match email of an existing email/password customer → if Google email is
 *    verified, link Google to that account (keep password) and sign in.
 *    Both methods work afterward (standard trusted-provider linking).
 * 3. Email already linked to a different OAuth provider → reject.
 * 4. Staff email → reject (dashboard only).
 * 5. No account → create customer with Google (no password).
 */
export async function googleLogin(req: Request, res: Response) {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(parsed.data.idToken);
  } catch {
    return res.status(401).json({
      message: "Invalid or expired Google sign-in token",
      code: "INVALID_GOOGLE_TOKEN",
    });
  }

  if (!identity.emailVerified) {
    return res.status(403).json({
      message:
        "Google email is not verified. Verify the email with Google, then try again.",
      code: "GOOGLE_EMAIL_UNVERIFIED",
    });
  }

  // 1) Already linked Google identity
  let user = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      provider_name: "google",
      provider_id: identity.sub,
    },
    include: { avatar: true },
  });

  if (user) {
    if (user.role !== "customer") {
      return res.status(403).json({
        message:
          "Staff accounts cannot sign in on the storefront. Use the dashboard login instead.",
        code: "STAFF_USE_DASHBOARD",
      });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: `Account is ${user.status}` });
    }

    const result = await markLoginAndIssueTokens(
      user,
      req,
      "Logged in with Google",
    );
    return res.status(result.status).json(result.body);
  }

  // 2) Existing account with same email (email/password or other)
  const byEmail = await prisma.user.findFirst({
    where: { email: identity.email, deleted_at: null },
    include: { avatar: true },
  });

  if (byEmail) {
    if (byEmail.role !== "customer") {
      return res.status(403).json({
        message:
          "Staff accounts cannot sign in on the storefront. Use the dashboard login instead.",
        code: "STAFF_USE_DASHBOARD",
      });
    }

    if (byEmail.status !== "active") {
      return res.status(403).json({ message: `Account is ${byEmail.status}` });
    }

    // Linked to a different social provider — do not silently take over.
    if (byEmail.provider_name && byEmail.provider_name !== "google") {
      return res.status(409).json({
        message: `This email is already linked to ${byEmail.provider_name} sign-in.`,
        code: "LINKED_TO_OTHER_PROVIDER",
      });
    }

    // Email/password account (or unlinked): link Google (trusted verified email).
    // Keep the existing password so the user can still sign in either way.
    user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        provider_name: "google",
        provider_id: identity.sub,
        email_verified_at: byEmail.email_verified_at ?? new Date(),
        first_name: byEmail.first_name || identity.givenName,
        last_name: byEmail.last_name || identity.familyName,
      },
      include: { avatar: true },
    });

    const result = await markLoginAndIssueTokens(
      user,
      req,
      "Google linked to your existing account. You can sign in with Google or your password.",
    );
    return res.status(result.status).json({
      ...result.body,
      code: "GOOGLE_LINKED",
    });
  }

  // 3) New customer via Google
  user = await prisma.user.create({
    data: {
      first_name: identity.givenName,
      last_name: identity.familyName,
      email: identity.email,
      password: null,
      role: "customer",
      status: "active",
      provider_name: "google",
      provider_id: identity.sub,
      email_verified_at: new Date(),
    },
    include: { avatar: true },
  });

  const result = await markLoginAndIssueTokens(
    user,
    req,
    "Registered and logged in with Google",
    201,
  );
  return res.status(result.status).json(result.body);
}

/**
 * Use refreshToken (body) to get a new accessToken + refreshToken pair.
 *
 * Flow:
 * 1. Client accessToken expired → API returns 401.
 * 2. Client POSTs `{ refreshToken }` here.
 * 3. We verify `typ: "refresh"` and that the user is still an active customer.
 * 4. We return a fresh pair so the session can continue (up to ~1 year).
 *
 * Access tokens are NOT accepted here — only refresh tokens.
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
    // Rejects access tokens — only typ: "refresh" is accepted here.
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

  // Rotate both tokens (new access for APIs + new refresh for the next year window).
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

/**
 * Protected with accessToken via `requireAuth` middleware
 * (`Authorization: Bearer <accessToken>` — refreshToken is not used here).
 */
export function getMe(req: Request, res: Response) {
  return res.json({ user: req.auth!.user });
}

/**
 * Protected with accessToken via `requireAuth` middleware
 * (`Authorization: Bearer <accessToken>` — refreshToken is not used here).
 */
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
