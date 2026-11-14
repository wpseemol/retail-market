import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { uploadAvatar } from "../controllers/customerAuthController.js";
import { AVATAR_MAX_BYTES } from "../lib/avatarImage.js";
import { isAvatarPresetId } from "../lib/avatarPresets.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createUserSession,
  rotateUserSession,
} from "../lib/userSession.js";
import { toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import { verifyRefreshToken } from "../lib/token.js";
import { encryptSecret, decryptSecret } from "../lib/secretBox.js";
import {
  buildOtpauthUrl,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  isTwoFactorEnabled,
  loginNeedsTwoFactor,
  packRecoveryHashes,
  pendingSecretFromToken,
  roleRequiresTwoFactor,
  signTwoFactorToken,
  verifyTotpCode,
  verifyTwoFactorToken,
} from "../lib/totp.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  requireAuth,
  requireRoles,
  STAFF_ROLES,
} from "../middleware/auth.js";
import { avatarUpload } from "../middleware/upload.js";
import { findUnsafeInputReason, refreshSchema } from "../validators/customerAuth.js";
import {
  loginAccountLimiter,
  loginIpLimiter,
  refreshLimiter,
} from "../lib/rateLimit.js";
import type { Request } from "express";

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
dashboardAuthRouter.post("/login", loginIpLimiter, loginAccountLimiter, async (req, res) => {
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

  const step = loginNeedsTwoFactor(user);
  if (step === "setup") {
    const setupToken = signTwoFactorToken({
      userId: user.id,
      role: user.role,
      purpose: "2fa_setup",
    });
    return res.json({
      message: "Authenticator setup required before signing in",
      code: "TWO_FACTOR_SETUP_REQUIRED",
      setupToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        first_name: user.first_name,
        role: user.role,
      },
    });
  }

  if (step === "challenge") {
    const challengeToken = signTwoFactorToken({
      userId: user.id,
      role: user.role,
      purpose: "2fa_challenge",
    });
    return res.json({
      message: "Enter the code from your authenticator app",
      code: "TWO_FACTOR_REQUIRED",
      challengeToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        first_name: user.first_name,
        role: user.role,
      },
    });
  }

  return finishStaffLogin(res, req, user.id);
});

async function finishStaffLogin(
  res: import("express").Response,
  req: Request,
  userId: bigint,
) {
  const updated = await prisma.user.update({
    where: { id: userId },
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
}

const twoFactorCodeSchema = z.object({
  code: withSafeInput(z.string().trim().min(6).max(64)),
  recovery: z.boolean().optional(),
});

const challengeLoginSchema = twoFactorCodeSchema.extend({
  challengeToken: z.string().trim().min(20).max(2000),
});

dashboardAuthRouter.post(
  "/login/2fa",
  loginIpLimiter,
  asyncHandler(async (req, res) => {
    const parsed = challengeLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    let payload;
    try {
      payload = verifyTwoFactorToken(parsed.data.challengeToken, "2fa_challenge");
    } catch {
      return res.status(401).json({
        message: "Challenge expired — sign in again",
        code: "TWO_FACTOR_CHALLENGE_EXPIRED",
      });
    }

    const userId = BigInt(payload.sub);
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
    });
    if (!user || user.status !== "active" || !STAFF_ROLES.includes(user.role)) {
      return res.status(401).json({ message: "Invalid challenge" });
    }
    if (!isTwoFactorEnabled(user)) {
      return res.status(400).json({
        message: "Authenticator is not enabled for this account",
        code: "TWO_FACTOR_NOT_ENABLED",
      });
    }

    const secret = decryptSecret(user.two_factor_secret);
    if (!secret) {
      return res.status(500).json({
        message: "Authenticator secret cannot be read — contact support",
        code: "TWO_FACTOR_SECRET_UNREADABLE",
      });
    }

    if (parsed.data.recovery) {
      const used = await consumeRecoveryCode(
        user.two_factor_recovery_codes,
        parsed.data.code,
      );
      if (!used.ok) {
        return res.status(401).json({
          message: "Invalid recovery code",
          code: "TWO_FACTOR_INVALID",
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { two_factor_recovery_codes: used.nextEncrypted },
      });
    } else if (!verifyTotpCode(secret, parsed.data.code)) {
      return res.status(401).json({
        message: "Invalid authenticator code",
        code: "TWO_FACTOR_INVALID",
      });
    }

    return finishStaffLogin(res, req, user.id);
  }),
);

function readSetupOrBearer(req: Request): {
  userId: bigint;
  role: UserRole;
  setupToken?: string;
  payload?: ReturnType<typeof verifyTwoFactorToken>;
  via: "bearer" | "setup";
} | null {
  const setupHeader =
    typeof req.body?.setupToken === "string"
      ? req.body.setupToken
      : typeof req.headers["x-2fa-setup-token"] === "string"
        ? req.headers["x-2fa-setup-token"]
        : null;

  if (setupHeader) {
    try {
      const payload = verifyTwoFactorToken(setupHeader, "2fa_setup");
      return {
        userId: BigInt(payload.sub),
        role: payload.role,
        setupToken: setupHeader,
        payload,
        via: "setup",
      };
    } catch {
      return null;
    }
  }

  if (req.auth) {
    return {
      userId: req.auth.userId,
      role: req.auth.role,
      via: "bearer",
    };
  }
  return null;
}

/** Optional auth: Bearer OR setupToken in body. */
async function optionalStaffOrSetup(
  req: Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return requireAuth(req, res, () => {
      if (!req.auth || !STAFF_ROLES.includes(req.auth.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      return next();
    });
  }
  return next();
}

dashboardAuthRouter.post(
  "/2fa/setup",
  optionalStaffOrSetup,
  asyncHandler(async (req, res) => {
    const ctx = readSetupOrBearer(req);
    if (!ctx) {
      return res.status(401).json({
        message: "Authentication or setup token required",
        code: "AUTH_REQUIRED",
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, deleted_at: null },
      include: userWithAvatarInclude,
    });
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "User not found" });
    }

    if (isTwoFactorEnabled(user) && ctx.via === "bearer") {
      return res.status(409).json({
        message: "Authenticator is already enabled",
        code: "TWO_FACTOR_ALREADY_ENABLED",
      });
    }

    const secret = generateTotpSecret();
    const accountName = user.email || user.username || user.id.toString();
    const otpauth_url = buildOtpauthUrl({ secret, accountName });
    const setupToken = signTwoFactorToken({
      userId: user.id,
      role: user.role,
      purpose: "2fa_setup",
      pendingSecret: secret,
    });

    return res.json({
      message: "Scan the QR code with your authenticator app, then confirm with a code",
      secret,
      otpauth_url,
      setupToken,
      issuer: env.appName,
      account: accountName,
    });
  }),
);

const confirmSetupSchema = z.object({
  code: withSafeInput(z.string().trim().min(6).max(12)),
  setupToken: z.string().trim().min(20).max(2000).optional(),
});

dashboardAuthRouter.post(
  "/2fa/confirm",
  optionalStaffOrSetup,
  asyncHandler(async (req, res) => {
    const parsed = confirmSetupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    // Prefer body setupToken (carries pending secret) over bare Bearer.
    let payload;
    try {
      const token =
        parsed.data.setupToken ??
        (typeof req.body?.setupToken === "string" ? req.body.setupToken : null);
      if (!token) {
        return res.status(400).json({
          message: "setupToken is required to confirm enrollment",
          code: "SETUP_TOKEN_REQUIRED",
        });
      }
      payload = verifyTwoFactorToken(token, "2fa_setup");
    } catch {
      return res.status(401).json({
        message: "Setup expired — start again",
        code: "TWO_FACTOR_SETUP_EXPIRED",
      });
    }

    const pending = pendingSecretFromToken(payload);
    if (!pending) {
      return res.status(400).json({
        message: "Call /2fa/setup first to get a QR code",
        code: "TWO_FACTOR_SETUP_INCOMPLETE",
      });
    }

    if (!verifyTotpCode(pending, parsed.data.code)) {
      return res.status(401).json({
        message: "Invalid authenticator code — check the time on your phone",
        code: "TWO_FACTOR_INVALID",
      });
    }

    const userId = BigInt(payload.sub);
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
    });
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "User not found" });
    }

    const { plain, hashed } = await generateRecoveryCodes(8);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_secret: encryptSecret(pending),
        two_factor_recovery_codes: packRecoveryHashes(hashed),
        two_factor_confirmed_at: new Date(),
      },
      include: userWithAvatarInclude,
    });

    if (req.auth) {
      return res.json({
        message: "Authenticator enabled",
        recovery_codes: plain,
        user: toPublicUser(updated),
      });
    }

    const stamped = await prisma.user.update({
      where: { id: updated.id },
      data: {
        last_login_at: new Date(),
        last_login_ip: req.ip ?? null,
      },
      include: userWithAvatarInclude,
    });
    const { sessionId, tokens } = await createUserSession({
      userId: stamped.id,
      role: stamped.role,
      req,
      loginMethod: "password",
    });

    return res.json({
      message: "Authenticator enabled — you are signed in",
      recovery_codes: plain,
      ...tokens,
      sessionId,
      home: ROLE_HOME[stamped.role as Exclude<UserRole, "customer">],
      user: toPublicUser(stamped),
    });
  }),
);

dashboardAuthRouter.get(
  "/2fa/status",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.auth!.userId, deleted_at: null },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
      required: roleRequiresTwoFactor(user.role),
      enabled: isTwoFactorEnabled(user),
      confirmed_at: user.two_factor_confirmed_at?.toISOString() ?? null,
    });
  }),
);

const disableTwoFactorSchema = z.object({
  password: withSafeInput(z.string().min(1).max(128)),
  code: withSafeInput(z.string().trim().min(6).max(64)),
  recovery: z.boolean().optional(),
});

dashboardAuthRouter.post(
  "/2fa/disable",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    if (roleRequiresTwoFactor(req.auth!.role)) {
      return res.status(403).json({
        message: "Authenticator cannot be disabled for your role",
        code: "TWO_FACTOR_REQUIRED_ROLE",
      });
    }

    const parsed = disableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.auth!.userId, deleted_at: null },
      include: userWithAvatarInclude,
    });
    if (!user?.password) {
      return res.status(400).json({ message: "Password verification required" });
    }
    if (!isTwoFactorEnabled(user)) {
      return res.status(400).json({
        message: "Authenticator is not enabled",
        code: "TWO_FACTOR_NOT_ENABLED",
      });
    }
    if (!(await verifyPassword(parsed.data.password, user.password))) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const secret = decryptSecret(user.two_factor_secret);
    let codeOk = false;
    if (parsed.data.recovery) {
      const used = await consumeRecoveryCode(
        user.two_factor_recovery_codes,
        parsed.data.code,
      );
      codeOk = used.ok;
    } else if (secret) {
      codeOk = verifyTotpCode(secret, parsed.data.code);
    }
    if (!codeOk) {
      return res.status(401).json({
        message: "Invalid authenticator or recovery code",
        code: "TWO_FACTOR_INVALID",
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        two_factor_secret: null,
        two_factor_recovery_codes: null,
        two_factor_confirmed_at: null,
      },
      include: userWithAvatarInclude,
    });

    return res.json({
      message: "Authenticator disabled",
      user: toPublicUser(updated),
    });
  }),
);

const regenerateRecoverySchema = z.object({
  code: withSafeInput(z.string().trim().min(6).max(64)),
});

dashboardAuthRouter.post(
  "/2fa/recovery-codes",
  requireAuth,
  requireRoles(...STAFF_ROLES),
  asyncHandler(async (req, res) => {
    const parsed = regenerateRecoverySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.auth!.userId, deleted_at: null },
    });
    if (!user || !isTwoFactorEnabled(user)) {
      return res.status(400).json({
        message: "Authenticator is not enabled",
        code: "TWO_FACTOR_NOT_ENABLED",
      });
    }

    const secret = decryptSecret(user.two_factor_secret);
    if (!secret || !verifyTotpCode(secret, parsed.data.code)) {
      return res.status(401).json({
        message: "Invalid authenticator code",
        code: "TWO_FACTOR_INVALID",
      });
    }

    const { plain, hashed } = await generateRecoveryCodes(8);
    await prisma.user.update({
      where: { id: user.id },
      data: { two_factor_recovery_codes: packRecoveryHashes(hashed) },
    });

    return res.json({
      message: "New recovery codes generated — store them somewhere safe",
      recovery_codes: plain,
    });
  }),
);

/**
 * Exchange a staff refreshToken for a new access + refresh pair.
 * Called by the dashboard when the access token expires (401).
 */
dashboardAuthRouter.post("/refresh", refreshLimiter, async (req, res) => {
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
