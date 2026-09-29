import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma.js";
import { verifyGoogleCredential } from "../lib/googleAuth.js";
import {
  verifyFacebookAccessToken,
  type SocialIdentity,
} from "../lib/facebookAuth.js";
import { verifyAppleIdToken } from "../lib/appleAuth.js";
import {
  getPublicSocialProviders,
  getSocialProviderConfig,
  isSocialProvider,
  type SocialProvider,
} from "../lib/socialLogin.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { verifyRefreshToken } from "../lib/token.js";
import { createUserSession, rotateUserSession } from "../lib/userSession.js";
import {
  toPublicUser,
  userWithAvatarInclude,
  type UserWithAvatar,
} from "../lib/user.js";
import {
  USER_PHOTOS_DIR,
  USER_PHOTOS_RELATIVE,
} from "../middleware/upload.js";
import {
  finalizeAvatarUpload,
  sanitizeOriginalName,
} from "../lib/avatarImage.js";
import { claimGuestOrders, countPendingGuestOrders } from "../lib/guestOrders.js";
import { maskEmail, maskPhone, normalizePhone } from "../lib/phone.js";
import {
  confirmVerificationCode,
  sendVerificationCode,
  VerificationError,
} from "../lib/verification.js";
import {
  appleAuthSchema,
  confirmCodeSchema,
  facebookAuthSchema,
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  sendPhoneCodeSchema,
  updateProfileSchema,
} from "../validators/customerAuth.js";

/** Mirrors Prisma `LoginMethod` — keeps TS working if client generate is stale. */
type LoginMethod = "password" | "google" | "facebook" | "apple" | "refresh";

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
 * Sessions are tracked in `user_sessions` (hashed refresh token + device info).
 */

/**
 * Shared by password login, register, and Google login.
 * Updates `users.last_login_*` and upserts a `user_sessions` row
 * (token hash, IP, UA, device, browser, os, expires_at, last_activity_at).
 */
async function markLoginAndIssueTokens(
  user: UserWithAvatar,
  req: Request,
  message: string,
  status = 200,
  loginMethod: LoginMethod = "password",
) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      last_login_at: new Date(),
      last_login_ip: req.ip ?? null,
    },
    include: userWithAvatarInclude,
  });

  // Writes / updates `user_sessions` for this login (hashed refresh token + device).
  const { sessionId, tokens } = await createUserSession({
    userId: updated.id,
    role: updated.role,
    req,
    loginMethod,
  });

  const claimedOrders = await claimGuestOrders(updated);

  return {
    status,
    body: {
      message,
      ...tokens,
      sessionId,
      user: toPublicUser(updated),
      claimed_orders: claimedOrders,
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
    if (isSocialProvider(existing.provider_name) && !existing.password) {
      const label = PROVIDER_LABEL[existing.provider_name];
      return res.status(409).json({
        message: `An account with this email already uses ${label} sign-in. Continue with ${label} instead.`,
        code: `USE_${existing.provider_name.toUpperCase()}`,
      });
    }
    return res.status(409).json({
      message: "An account with this email or phone already exists. Try logging in instead.",
      code: "EMAIL_IN_USE",
    });
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
    include: userWithAvatarInclude,
  });

  const result = await markLoginAndIssueTokens(
    user,
    req,
    "Registered successfully",
    201,
    "password",
  );
  return res.status(result.status).json(result.body);
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
    include: userWithAvatarInclude,
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Social-only account (no local password) — guide user to the right button.
  if (!user.password) {
    if (isSocialProvider(user.provider_name)) {
      const label = PROVIDER_LABEL[user.provider_name];
      return res.status(401).json({
        message: `This account uses ${label} sign-in. Continue with ${label} instead of a password.`,
        code: `USE_${user.provider_name.toUpperCase()}`,
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
    200,
    "password",
  );
  return res.status(result.status).json(result.body);
}

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

function providerDisabled(res: Response, provider: SocialProvider) {
  return res.status(403).json({
    message: `${PROVIDER_LABEL[provider]} sign-in is currently disabled.`,
    code: "PROVIDER_DISABLED",
  });
}

function invalidToken(res: Response, provider: SocialProvider) {
  return res.status(401).json({
    message: `Invalid or expired ${PROVIDER_LABEL[provider]} sign-in token`,
    code: `INVALID_${provider.toUpperCase()}_TOKEN`,
  });
}

/** Public: which social buttons the storefront should render (no secrets). */
export async function socialProviders(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "public, max-age=30");
  return res.json({ providers: await getPublicSocialProviders() });
}

/** Google Sign-In — client ID comes from dashboard settings (env fallback). */
export async function googleLogin(req: Request, res: Response) {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const config = await getSocialProviderConfig("google");
  if (!config.enabled || !config.clientId) return providerDisabled(res, "google");

  let identity: SocialIdentity;
  try {
    identity = await verifyGoogleCredential(parsed.data, config.clientId);
  } catch {
    return invalidToken(res, "google");
  }
  return completeSocialLogin(req, res, "google", identity);
}

/** Facebook Login — verified with the App ID + App Secret from dashboard settings. */
export async function facebookLogin(req: Request, res: Response) {
  const parsed = facebookAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const config = await getSocialProviderConfig("facebook");
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    return providerDisabled(res, "facebook");
  }

  let identity: SocialIdentity;
  try {
    identity = await verifyFacebookAccessToken(
      parsed.data.accessToken,
      config.clientId,
      config.clientSecret,
    );
  } catch {
    return invalidToken(res, "facebook");
  }
  return completeSocialLogin(req, res, "facebook", identity);
}

/** Sign in with Apple — `id_token` audience must equal the Services ID. */
export async function appleLogin(req: Request, res: Response) {
  const parsed = appleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const config = await getSocialProviderConfig("apple");
  if (!config.enabled || !config.clientId) return providerDisabled(res, "apple");

  let identity: SocialIdentity;
  try {
    identity = await verifyAppleIdToken(parsed.data.idToken, config.clientId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
  } catch {
    return invalidToken(res, "apple");
  }
  return completeSocialLogin(req, res, "apple", identity);
}

/**
 * Shared social account resolution (storefront customers only):
 *
 * 1. Match `provider_name` + `provider_id` → sign in.
 * 2. Match email of an existing email/password customer → if the provider email
 *    is verified, link the provider to that account (keep password) and sign in.
 * 3. Email already linked to a different OAuth provider → reject.
 * 4. Staff email → reject (dashboard only).
 * 5. No account → create customer with the provider (no password).
 */
async function completeSocialLogin(
  req: Request,
  res: Response,
  provider: SocialProvider,
  identity: SocialIdentity,
) {
  const label = PROVIDER_LABEL[provider];
  const upper = provider.toUpperCase();

  if (!identity.email) {
    return res.status(403).json({
      message: `${label} did not share an email address. Allow email access and try again.`,
      code: `${upper}_EMAIL_REQUIRED`,
    });
  }

  if (!identity.emailVerified) {
    return res.status(403).json({
      message: `${label} email is not verified. Verify the email with ${label}, then try again.`,
      code: `${upper}_EMAIL_UNVERIFIED`,
    });
  }

  // 1) Already linked identity
  let user = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      provider_name: provider,
      provider_id: identity.sub,
    },
    include: userWithAvatarInclude,
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
      `Logged in with ${label}`,
      200,
      provider,
    );
    return res.status(result.status).json(result.body);
  }

  // 2) Existing account with same email (email/password or other)
  const byEmail = await prisma.user.findFirst({
    where: { email: identity.email, deleted_at: null },
    include: userWithAvatarInclude,
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
    if (byEmail.provider_name && byEmail.provider_name !== provider) {
      return res.status(409).json({
        message: `This email is already linked to ${byEmail.provider_name} sign-in.`,
        code: "LINKED_TO_OTHER_PROVIDER",
      });
    }

    // Email/password account (or unlinked): link provider (trusted verified email).
    // Keep the existing password so the user can still sign in either way.
    user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        provider_name: provider,
        provider_id: identity.sub,
        email_verified_at: byEmail.email_verified_at ?? new Date(),
        first_name: byEmail.first_name || identity.givenName,
        last_name: byEmail.last_name || identity.familyName,
      },
      include: userWithAvatarInclude,
    });

    const result = await markLoginAndIssueTokens(
      user,
      req,
      `${label} linked to your existing account. You can sign in with ${label} or your password.`,
      200,
      provider,
    );
    return res.status(result.status).json({
      ...result.body,
      code: `${upper}_LINKED`,
    });
  }

  // 3) New customer via provider
  user = await prisma.user.create({
    data: {
      first_name: identity.givenName,
      last_name: identity.familyName,
      email: identity.email,
      password: null,
      role: "customer",
      status: "active",
      provider_name: provider,
      provider_id: identity.sub,
      email_verified_at: new Date(),
    },
    include: userWithAvatarInclude,
  });

  const result = await markLoginAndIssueTokens(
    user,
    req,
    `Registered and logged in with ${label}`,
    201,
    provider,
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

  if (!payload.sid) {
    return res.status(401).json({
      message: "Refresh token is missing session id — please log in again",
      code: "SESSION_REQUIRED",
    });
  }

  if (payload.role !== "customer") {
    return res.status(403).json({
      message: "Refresh is only available for customer storefront sessions",
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

  if (user.role !== "customer") {
    return res.status(403).json({
      message: "Refresh is only available for customer storefront sessions",
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
  const currentPhone = normalizePhone(req.auth!.user.phone);
  const phoneChanged =
    data.phone !== undefined && (data.phone ?? null) !== currentPhone;

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
      ...(phoneChanged ? { phone_verified_at: null } : {}),
      gender: data.gender === undefined ? undefined : data.gender,
      date_of_birth:
        data.date_of_birth === undefined
          ? undefined
          : data.date_of_birth
            ? new Date(data.date_of_birth)
            : null,
    },
    include: userWithAvatarInclude,
  });

  return res.json({
    message: "Profile updated",
    user: toPublicUser(user),
  });
}

/**
 * Upload / replace profile photo.
 * Files are stored under `uploads/users/photos/` and linked via `medias` + `users.avatar_id`.
 * Multipart field name: `avatar`.
 *
 * Security: multer size/MIME filter + magic-byte sniff + rename to UUID+real ext.
 */
export async function uploadAvatar(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      message: "Profile image is required (field: avatar)",
      code: "AVATAR_REQUIRED",
    });
  }

  const tempPath = file.path;
  const finalized = finalizeAvatarUpload(tempPath, file.mimetype);
  if (!finalized.ok) {
    return res.status(400).json({
      message: finalized.message,
      code: finalized.code,
    });
  }

  const {
    fileName,
    absolutePath,
    size: fileSize,
    detected,
  } = finalized;

  const userId = req.auth!.userId;
  const previous = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    include: { avatar: true },
  });

  if (!previous) {
    try {
      fs.unlinkSync(absolutePath);
    } catch {
      /* ignore */
    }
    return res.status(401).json({ message: "User not found" });
  }

  try {
    const media = await prisma.media.create({
      data: {
        user_id: userId,
        disk: "public",
        file_name: fileName,
        original_name: sanitizeOriginalName(file.originalname),
        file_path: USER_PHOTOS_RELATIVE,
        file_size: BigInt(fileSize),
        mime_type: detected.mime,
        alt_text: `${previous.first_name} ${previous.last_name}`
          .trim()
          .slice(0, 255),
        collection_name: "avatars",
        is_public: true,
        mediable_type: "User",
        mediable_id: userId,
        sort_order: 0,
      },
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar_id: media.id, avatar_preset: null },
      include: userWithAvatarInclude,
    });

    const oldAvatar = previous.avatar;
    if (oldAvatar && oldAvatar.id !== media.id) {
      const oldPath = path.join(USER_PHOTOS_DIR, oldAvatar.file_name);
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch {
        /* ignore */
      }
      await prisma.media
        .delete({ where: { id: oldAvatar.id } })
        .catch(() => undefined);
    }

    return res.json({
      message: "Profile photo updated",
      user: toPublicUser(user),
    });
  } catch (err) {
    try {
      fs.unlinkSync(absolutePath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

// ─── Email / phone verification (unlocks guest-order merging) ───────────────

function sendVerificationError(res: Response, err: unknown) {
  if (err instanceof VerificationError) {
    return res
      .status(err.status)
      .json({ message: err.message, code: err.code, ...err.extra });
  }
  throw err;
}

async function loadAuthUser(userId: bigint) {
  return prisma.user.findFirstOrThrow({
    where: { id: userId, deleted_at: null },
    include: userWithAvatarInclude,
  });
}

/** Verified flags + guest orders waiting for verification. */
export async function getVerificationStatus(req: Request, res: Response) {
  const user = await loadAuthUser(req.auth!.userId);
  const pending = await countPendingGuestOrders(user);
  return res.json({
    email: user.email,
    email_verified: Boolean(user.email_verified_at),
    phone: user.phone,
    phone_verified: Boolean(user.phone_verified_at),
    pending_guest_orders: pending,
  });
}

export async function sendEmailCode(req: Request, res: Response) {
  const user = await loadAuthUser(req.auth!.userId);
  if (user.email_verified_at) {
    return res
      .status(400)
      .json({ message: "Email is already verified", code: "ALREADY_VERIFIED" });
  }
  try {
    const result = await sendVerificationCode(user.id, "email", user.email);
    return res.json({
      message: `Code sent to ${maskEmail(user.email)}`,
      expires_in: result.expiresInSeconds,
      resend_in: result.resendInSeconds,
    });
  } catch (err) {
    return sendVerificationError(res, err);
  }
}

export async function confirmEmailCode(req: Request, res: Response) {
  const parsed = confirmCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const current = await loadAuthUser(req.auth!.userId);
  try {
    const target = await confirmVerificationCode(current.id, "email", parsed.data.code);
    if (target !== current.email.toLowerCase()) {
      return res.status(400).json({
        message: "Your email changed since the code was sent. Request a new code.",
        code: "TARGET_CHANGED",
      });
    }
  } catch (err) {
    return sendVerificationError(res, err);
  }

  const user = await prisma.user.update({
    where: { id: current.id },
    data: { email_verified_at: current.email_verified_at ?? new Date() },
    include: userWithAvatarInclude,
  });
  const claimedOrders = await claimGuestOrders(user);

  return res.json({
    message: "Email verified",
    user: toPublicUser(user),
    claimed_orders: claimedOrders,
  });
}

export async function sendPhoneCode(req: Request, res: Response) {
  const parsed = sendPhoneCodeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await loadAuthUser(req.auth!.userId);
  const target = parsed.data.phone ?? normalizePhone(user.phone);
  if (!target) {
    return res.status(400).json({
      message: "Add a mobile number first",
      code: "PHONE_REQUIRED",
      errors: { phone: ["Mobile number is required"] },
    });
  }
  if (user.phone_verified_at && normalizePhone(user.phone) === target) {
    return res
      .status(400)
      .json({ message: "Phone is already verified", code: "ALREADY_VERIFIED" });
  }

  const taken = await prisma.user.findFirst({
    where: { phone: target, deleted_at: null, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return res.status(409).json({
      message: "This number is linked to another account",
      code: "PHONE_IN_USE",
      errors: { phone: ["This number is linked to another account"] },
    });
  }

  try {
    const result = await sendVerificationCode(user.id, "sms", target);
    return res.json({
      message: `Code sent to ${maskPhone(target)}`,
      phone: target,
      expires_in: result.expiresInSeconds,
      resend_in: result.resendInSeconds,
    });
  } catch (err) {
    return sendVerificationError(res, err);
  }
}

export async function confirmPhoneCode(req: Request, res: Response) {
  const parsed = confirmCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const userId = req.auth!.userId;
  let target: string;
  try {
    target = await confirmVerificationCode(userId, "sms", parsed.data.code);
  } catch (err) {
    return sendVerificationError(res, err);
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data: { phone: target, phone_verified_at: new Date() },
      include: userWithAvatarInclude,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return res.status(409).json({
        message: "This number is linked to another account",
        code: "PHONE_IN_USE",
      });
    }
    throw err;
  }
  const claimedOrders = await claimGuestOrders(user);

  return res.json({
    message: "Phone verified",
    user: toPublicUser(user),
    claimed_orders: claimedOrders,
  });
}
