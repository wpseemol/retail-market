import express, { Router } from "express";
import { z } from "zod";
import {
  appleLogin,
  confirmEmailCode,
  confirmPhoneCode,
  facebookLogin,
  getMe,
  getVerificationStatus,
  googleLogin,
  login,
  refresh,
  register,
  sendEmailCode,
  sendPhoneCode,
  setPassword,
  socialProviders,
  captchaConfig,
  updateMe,
  uploadAvatar,
} from "../controllers/customerAuthController.js";
import {
  facebookDeletionStatusUrl,
  getFacebookAppSecret,
  honourFacebookDataDeletion,
  parseFacebookSignedRequest,
} from "../lib/facebookDataDeletion.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { avatarUpload } from "../middleware/upload.js";
import { AVATAR_MAX_BYTES } from "../lib/avatarImage.js";
import {
  loginAccountLimiter,
  loginIpLimiter,
  rateLimit,
  refreshLimiter,
  registerAccountLimiter,
  registerIpLimiter,
  socialLoginLimiter,
} from "../lib/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireCsrf } from "../middleware/csrf.js";
import {
  appleAuthSchema,
  confirmCodeSchema,
  facebookAuthSchema,
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  sendPhoneCodeSchema,
  setPasswordSchema,
  updateProfileSchema,
} from "../validators/customerAuth.js";
import multer from "multer";

/** Meta signed_request: base64url(sig).base64url(payload). */
const facebookDataDeletionSchema = z.object({
  signed_request: z
    .string()
    .trim()
    .min(1, "signed_request is required.")
    .max(8192)
    .regex(
      /^[A-Za-z0-9_-]+=*\.[A-Za-z0-9_-]+=*$/,
      "Invalid signed_request.",
    ),
});

export const customerAuthRouter = Router();

/** Extra IP throttle on top of per-target send caps in verification.ts. */
const verifySendLimiter = rateLimit({
  name: "VERIFY_SEND",
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: "Too many verification codes requested. Please try again later.",
});

const verifyConfirmLimiter = rateLimit({
  name: "VERIFY_CONFIRM",
  max: 40,
  windowMs: 60 * 60 * 1000,
  message: "Too many verification attempts. Please try again later.",
});

const phoneSendLimiter = rateLimit({
  name: "SMS_SEND",
  max: 8,
  windowMs: 60 * 60 * 1000,
  message: "Too many text messages requested. Please try again later.",
});

customerAuthRouter.post(
  "/register",
  requireCsrf,
  registerIpLimiter,
  registerAccountLimiter,
  validateBody(registerSchema),
  asyncHandler(register),
);
customerAuthRouter.post(
  "/login",
  requireCsrf,
  loginIpLimiter,
  loginAccountLimiter,
  validateBody(loginSchema),
  asyncHandler(login),
);
customerAuthRouter.get("/captcha-config", asyncHandler(captchaConfig));
customerAuthRouter.get("/social-providers", asyncHandler(socialProviders));
customerAuthRouter.post(
  "/google",
  socialLoginLimiter,
  validateBody(googleAuthSchema),
  asyncHandler(googleLogin),
);
customerAuthRouter.post(
  "/facebook",
  socialLoginLimiter,
  validateBody(facebookAuthSchema),
  asyncHandler(facebookLogin),
);
customerAuthRouter.post(
  "/apple",
  socialLoginLimiter,
  validateBody(appleAuthSchema),
  asyncHandler(appleLogin),
);
customerAuthRouter.post(
  "/refresh",
  refreshLimiter,
  validateBody(refreshSchema),
  asyncHandler(refresh),
);

/**
 * Meta App Review — User data deletion callback.
 * Meta POSTs `application/x-www-form-urlencoded` with `signed_request`.
 * Exempt from app keys (see `requireAppKeys`). Set this URL in Meta:
 * `{PUBLIC_API_URL}/api/auth/facebook/data-deletion`
 */
const facebookDeletionLimiter = rateLimit({
  name: "FACEBOOK_DELETION",
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: "Too many deletion callbacks. Try again shortly.",
});

customerAuthRouter.post(
  "/facebook/data-deletion",
  express.urlencoded({ extended: false, limit: "32kb" }),
  facebookDeletionLimiter,
  asyncHandler(async (req, res) => {
    const creds = await getFacebookAppSecret();
    if (!creds) {
      return res.status(503).json({
        message: "Facebook Login is not configured.",
        code: "FACEBOOK_NOT_CONFIGURED",
      });
    }

    const body = facebookDataDeletionSchema.safeParse(req.body ?? {});
    if (!body.success) {
      const message =
        body.error.issues[0]?.message ?? "signed_request is required.";
      return res.status(400).json({
        message,
        code: message.includes("required")
          ? "SIGNED_REQUEST_REQUIRED"
          : "SIGNED_REQUEST_INVALID",
        errors: body.error.flatten().fieldErrors,
      });
    }

    const parsed = parseFacebookSignedRequest(
      body.data.signed_request,
      creds.appSecret,
    );
    if (!parsed) {
      return res.status(400).json({
        message: "Invalid signed_request.",
        code: "SIGNED_REQUEST_INVALID",
      });
    }

    const confirmationCode = await honourFacebookDataDeletion(parsed.userId);
    const url = await facebookDeletionStatusUrl(confirmationCode);
    return res.status(200).json({ url, confirmation_code: confirmationCode });
  }),
);

customerAuthRouter.get("/me", requireAuth, requireRoles("customer"), getMe);

customerAuthRouter.patch(
  "/me",
  requireAuth,
  requireRoles("customer"),
  validateBody(updateProfileSchema),
  asyncHandler(updateMe),
);

customerAuthRouter.post(
  "/me/password",
  requireAuth,
  requireRoles("customer"),
  validateBody(setPasswordSchema),
  asyncHandler(setPassword),
);

const customerOnly = [requireAuth, requireRoles("customer")];

customerAuthRouter.get(
  "/me/verification",
  ...customerOnly,
  asyncHandler(getVerificationStatus),
);
customerAuthRouter.post(
  "/me/verify/email/send",
  ...customerOnly,
  verifySendLimiter,
  asyncHandler(sendEmailCode),
);
customerAuthRouter.post(
  "/me/verify/email/confirm",
  ...customerOnly,
  verifyConfirmLimiter,
  validateBody(confirmCodeSchema),
  asyncHandler(confirmEmailCode),
);
customerAuthRouter.post(
  "/me/verify/phone/send",
  ...customerOnly,
  verifySendLimiter,
  phoneSendLimiter,
  validateBody(sendPhoneCodeSchema),
  asyncHandler(sendPhoneCode),
);
customerAuthRouter.post(
  "/me/verify/phone/confirm",
  ...customerOnly,
  verifyConfirmLimiter,
  validateBody(confirmCodeSchema),
  asyncHandler(confirmPhoneCode),
);

customerAuthRouter.post(
  "/me/avatar",
  requireAuth,
  requireRoles("customer"),
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
