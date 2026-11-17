import { Router } from "express";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "../controllers/customerAddressController.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseBigIntId } from "../utils/ids.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../validators/customerAddress.js";

export const customerAddressRouter = Router();

customerAddressRouter.use(requireAuth, requireRoles("customer"));

function requireAddressId(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  if (parseBigIntId(req.params.id) === null) {
    return res.status(400).json({ message: "Invalid address id" });
  }
  return next();
}

customerAddressRouter.get("/", asyncHandler(listAddresses));
customerAddressRouter.post(
  "/",
  validateBody(createAddressSchema),
  asyncHandler(createAddress),
);
customerAddressRouter.patch(
  "/:id",
  requireAddressId,
  validateBody(updateAddressSchema),
  asyncHandler(updateAddress),
);
customerAddressRouter.delete(
  "/:id",
  requireAddressId,
  asyncHandler(deleteAddress),
);
