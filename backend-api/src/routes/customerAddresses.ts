import { Router } from "express";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from "../controllers/customerAddressController.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const customerAddressRouter = Router();

customerAddressRouter.use(requireAuth, requireRoles("customer"));

customerAddressRouter.get("/", asyncHandler(listAddresses));
customerAddressRouter.post("/", asyncHandler(createAddress));
customerAddressRouter.patch("/:id", asyncHandler(updateAddress));
customerAddressRouter.delete("/:id", asyncHandler(deleteAddress));
