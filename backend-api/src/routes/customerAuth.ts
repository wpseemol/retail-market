import { Router } from "express";
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
  socialProviders,
  updateMe,
  uploadAvatar,
} from "../controllers/customerAuthController.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { avatarUpload } from "../middleware/upload.js";
import { AVATAR_MAX_BYTES } from "../lib/avatarImage.js";
import { rateLimit } from "../lib/rateLimit.js";
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

customerAuthRouter.post("/register", asyncHandler(register));
customerAuthRouter.post("/login", asyncHandler(login));
customerAuthRouter.get("/social-providers", asyncHandler(socialProviders));
customerAuthRouter.post("/google", asyncHandler(googleLogin));
customerAuthRouter.post("/facebook", asyncHandler(facebookLogin));
customerAuthRouter.post("/apple", asyncHandler(appleLogin));
customerAuthRouter.post("/refresh", asyncHandler(refresh));

customerAuthRouter.get("/me", requireAuth, requireRoles("customer"), getMe);

customerAuthRouter.patch(
  "/me",
  requireAuth,
  requireRoles("customer"),
  asyncHandler(updateMe),
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
