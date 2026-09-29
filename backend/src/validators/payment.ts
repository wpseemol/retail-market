import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const tranId = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[A-Za-z0-9-]+$/, "Invalid transaction id");

/** SSLCOMMERZ browser callback / IPN (form-urlencoded). Extra gateway fields are ignored. */
export const sslczCallbackSchema = z.object({
  tran_id: tranId,
  val_id: z
    .string()
    .trim()
    .max(50)
    .regex(/^[A-Za-z0-9]*$/, "Invalid validation id")
    .optional(),
  status: z.string().trim().max(20).optional(),
  error: z.string().trim().max(255).optional(),
});

export const retryPaymentSchema = z.object({
  order_number: withSafeInput(
    z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, "Invalid order number"),
  ),
  /** Required for guests; logged-in owners can omit it. */
  email: withSafeInput(z.string().trim().toLowerCase().email().max(255)).optional(),
});
