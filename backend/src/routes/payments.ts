import express, { Router, type Response } from "express";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import {
  markSslcommerzUnpaid,
  settleSslcommerzPayment,
  SslcommerzError,
  startSslcommerzCheckout,
} from "../lib/sslcommerz.js";
import { optionalAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { retryPaymentSchema, sslczCallbackSchema } from "../validators/payment.js";

export const paymentsRouter = Router();

// SSLCOMMERZ posts callbacks / IPN as application/x-www-form-urlencoded.
paymentsRouter.use(express.urlencoded({ extended: false, limit: "32kb" }));

type ResultStatus = "success" | "review" | "failed" | "cancelled";

function redirectToResult(res: Response, status: ResultStatus, orderNumber?: string | null) {
  const url = new URL("/checkout/result", env.frontendUrl);
  url.searchParams.set("status", status);
  if (orderNumber) url.searchParams.set("order", orderNumber);
  // 303 turns the gateway's POST into a GET on the storefront.
  return res.redirect(303, url.toString());
}

paymentsRouter.post(
  "/sslcommerz/success",
  asyncHandler(async (req, res) => {
    const parsed = sslczCallbackSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.val_id) return redirectToResult(res, "failed");

    const result = await settleSslcommerzPayment({
      tranId: parsed.data.tran_id,
      valId: parsed.data.val_id,
    });
    if (result.outcome === "not_found") return redirectToResult(res, "failed");
    const status: ResultStatus =
      result.outcome === "paid" || result.outcome === "already_paid"
        ? "success"
        : result.outcome === "under_review"
          ? "review"
          : "failed";
    return redirectToResult(res, status, result.orderNumber);
  }),
);

paymentsRouter.post(
  "/sslcommerz/fail",
  asyncHandler(async (req, res) => {
    const parsed = sslczCallbackSchema.safeParse(req.body);
    if (!parsed.success) return redirectToResult(res, "failed");
    const orderNumber = await markSslcommerzUnpaid(parsed.data.tran_id, "failed", req.body);
    return redirectToResult(res, "failed", orderNumber);
  }),
);

paymentsRouter.post(
  "/sslcommerz/cancel",
  asyncHandler(async (req, res) => {
    const parsed = sslczCallbackSchema.safeParse(req.body);
    if (!parsed.success) return redirectToResult(res, "cancelled");
    const orderNumber = await markSslcommerzUnpaid(parsed.data.tran_id, "cancelled", req.body);
    return redirectToResult(res, "cancelled", orderNumber);
  }),
);

/** Server-to-server notification — settles even if the customer never returns. */
paymentsRouter.post(
  "/sslcommerz/ipn",
  asyncHandler(async (req, res) => {
    const parsed = sslczCallbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send("INVALID");

    const { tran_id, val_id, status } = parsed.data;
    if (status === "VALID" && val_id) {
      await settleSslcommerzPayment({ tranId: tran_id, valId: val_id });
    } else if (status && ["FAILED", "CANCELLED", "EXPIRED", "UNATTEMPTED"].includes(status)) {
      await markSslcommerzUnpaid(
        tran_id,
        status === "CANCELLED" ? "cancelled" : "failed",
        req.body,
      );
    }
    return res.status(200).send("OK");
  }),
);

/** Start a new payment attempt for an unpaid order (after fail / cancel). */
paymentsRouter.post(
  "/sslcommerz/retry",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = retryPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const order = await prisma.order.findUnique({
      where: { order_number: parsed.data.order_number },
      select: { id: true, user_id: true, customer_email: true },
    });
    const ownsOrder =
      order != null &&
      ((req.auth && order.user_id === req.auth.userId) ||
        (parsed.data.email != null && order.customer_email === parsed.data.email));
    if (!order || !ownsOrder) {
      return res.status(404).json({
        message: "Order not found. Check the order number and email.",
        code: "ORDER_NOT_FOUND",
      });
    }

    try {
      const started = await startSslcommerzCheckout(order.id);
      return res.json({ gateway_url: started.gatewayUrl, order_number: started.orderNumber });
    } catch (err) {
      if (err instanceof SslcommerzError) {
        const status = err.code === "GATEWAY_INIT_FAILED" ? 502 : 400;
        return res.status(status).json({ message: err.message, code: err.code });
      }
      throw err;
    }
  }),
);
