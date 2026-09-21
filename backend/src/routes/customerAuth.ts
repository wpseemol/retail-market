import { Router } from "express";
import {
  getMe,
  login,
  refresh,
  register,
  updateMe,
} from "../controllers/customerAuthController.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const customerAuthRouter = Router();

customerAuthRouter.post("/register", asyncHandler(register));
customerAuthRouter.post("/login", asyncHandler(login));
customerAuthRouter.post("/refresh", asyncHandler(refresh));

customerAuthRouter.get("/me", requireAuth, requireRoles("customer"), getMe);

customerAuthRouter.patch(
  "/me",
  requireAuth,
  requireRoles("customer"),
  asyncHandler(updateMe),
);
