import express, { Router } from "express";
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
import multer from "multer";

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
  registerIpLimiter,
  registerAccountLimiter,
  asyncHandler(register),
);
customerAuthRouter.post("/login", loginIpLimiter, loginAccountLimiter, asyncHandler(login));
customerAuthRouter.get("/social-providers", asyncHandler(socialProviders));
customerAuthRouter.post("/google", socialLoginLimiter, asyncHandler(googleLogin));
customerAuthRouter.post("/facebook", socialLoginLimiter, asyncHandler(facebookLogin));
customerAuthRouter.post("/apple", socialLoginLimiter, asyncHandler(appleLogin));
customerAuthRouter.post("/refresh", refreshLimiter, asyncHandler(refresh));

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

    const signed =
      typeof req.body?.signed_request === "string" ? req.body.signed_request.trim() : "";
    if (!signed) {
      return res.status(400).json({
        message: "signed_request is required.",
        code: "SIGNED_REQUEST_REQUIRED",
      });
    }

    const parsed = parseFacebookSignedRequest(signed, creds.appSecret);
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
  asyncHandler(updateMe),
);

customerAuthRouter.post(
  "/me/password",
  requireAuth,
  requireRoles("customer"),
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
  asyncHandler(confirmEmailCode),
);
customerAuthRouter.post(
  "/me/verify/phone/send",
  ...customerOnly,
  verifySendLimiter,
  phoneSendLimiter,
  asyncHandler(sendPhoneCode),
);
customerAuthRouter.post(
  "/me/verify/phone/confirm",
  ...customerOnly,
  verifyConfirmLimiter,
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
