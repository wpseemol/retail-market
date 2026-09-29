import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { getSslcommerzConfig, sslcommerzBaseUrl, type SslcommerzConfig } from "./paymentGateway.js";

/** SSLCOMMERZ only accepts 10.00 – 500000.00 BDT per transaction. */
export const SSLCZ_MIN_AMOUNT = 10;
export const SSLCZ_MAX_AMOUNT = 500_000;

export const SSLCZ_CALLBACK_BASE = "/api/payments/sslcommerz";

export async function isSslcommerzConfigured() {
  return (await getSslcommerzConfig()) !== null;
}

type InitResponse = {
  status?: string;
  failedreason?: string;
  GatewayPageURL?: string;
  sessionkey?: string;
};

/** POST the session-init form; never throws — failures come back as `status: "FAILED"`. */
export async function initSslcommerzSession(
  cfg: SslcommerzConfig,
  fields: Record<string, string>,
): Promise<InitResponse> {
  const params = new URLSearchParams({
    ...fields,
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
  });
  try {
    const res = await fetch(`${sslcommerzBaseUrl(cfg.isLive)}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as InitResponse;
    } catch {
      return {
        status: "FAILED",
        failedreason: `HTTP ${res.status}: ${text.slice(0, 200) || "empty response"}`,
      };
    }
  } catch (err) {
    return { status: "FAILED", failedreason: err instanceof Error ? err.message : "Network error" };
  }
}

export class SslcommerzError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Max 30 chars; random suffix makes it unguessable for the public fail/cancel callbacks. */
function newTranId(orderNumber: string) {
  return `${orderNumber}-${crypto.randomBytes(4).toString("hex")}`.slice(0, 30);
}

/** The gateway answers HTTP 500 with an empty body if any field contains `"` (e.g. `10.1"` screens). */
const clip = (value: string | null | undefined, max: number) =>
  (value ?? "")
    .replace(/["\\<>`\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** SSLCOMMERZ `cus_phone` is max 20 chars and expects local format for BD numbers. */
function gatewayPhone(phone: string) {
  return phone.startsWith("+880") ? `0${phone.slice(4)}` : phone.slice(0, 20);
}

function amountCents(value: string | number | { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

type PaymentPayload = Record<string, unknown>;

function asPayload(value: Prisma.JsonValue | null): PaymentPayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PaymentPayload)
    : {};
}

/**
 * Create a new payment attempt (own `tran_id` + `payments` row) and an SSLCOMMERZ
 * session. Each retry gets a fresh row so a late success on an old attempt still settles.
 */
export async function startSslcommerzCheckout(orderId: bigint) {
  const cfg = await getSslcommerzConfig();
  if (!cfg) {
    throw new SslcommerzError(
      "GATEWAY_NOT_CONFIGURED",
      "Online payment is not available right now. Choose Cash on Delivery or try later.",
    );
  }

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, addresses: true, payments: true },
  });

  if (order.payment_status === "paid" || order.payments.some((p) => p.status === "paid")) {
    throw new SslcommerzError("ALREADY_PAID", "This order is already paid.");
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    throw new SslcommerzError("ORDER_CLOSED", "This order can no longer be paid.");
  }

  const total = Number(order.total.toFixed(2));
  if (total < SSLCZ_MIN_AMOUNT || total > SSLCZ_MAX_AMOUNT) {
    throw new SslcommerzError(
      "AMOUNT_OUT_OF_RANGE",
      `Online payment supports orders between ৳${SSLCZ_MIN_AMOUNT} and ৳${SSLCZ_MAX_AMOUNT.toLocaleString("en-US")}.`,
    );
  }

  const billing = order.addresses.find((a) => a.type === "billing");
  const shipping = order.addresses.find((a) => a.type === "shipping") ?? billing;
  if (!billing || !shipping) {
    throw new SslcommerzError("ADDRESS_MISSING", "Order address is missing.");
  }

  const tranId = newTranId(order.order_number);
  const payment = await prisma.payment.create({
    data: {
      order_id: order.id,
      method: "sslcommerz",
      provider: "sslcommerz",
      status: "pending",
      amount: order.total,
      currency: order.currency,
      transaction_id: tranId,
    },
  });

  const callback = (path: string) => `${env.publicBaseUrl}${SSLCZ_CALLBACK_BASE}/${path}`;
  const data = await initSslcommerzSession(cfg, {
    total_amount: order.total.toFixed(2),
    currency: order.currency,
    tran_id: tranId,
    success_url: callback("success"),
    fail_url: callback("fail"),
    cancel_url: callback("cancel"),
    ipn_url: callback("ipn"),
    cus_name: clip(billing.full_name, 50),
    cus_email: clip(order.customer_email ?? "", 50),
    cus_add1: clip(billing.line1, 50),
    cus_add2: clip(billing.line2, 50),
    cus_city: clip(billing.city, 50),
    cus_state: clip(billing.state, 50),
    cus_postcode: clip(billing.postal_code, 30),
    cus_country: clip(billing.country === "BD" ? "Bangladesh" : billing.country, 50),
    cus_phone: clip(gatewayPhone(order.customer_phone ?? billing.phone), 20),
    shipping_method: "Courier",
    num_of_item: String(order.items.reduce((n, i) => n + i.quantity, 0)),
    ship_name: clip(shipping.full_name, 50),
    ship_add1: clip(shipping.line1, 50),
    ship_add2: clip(shipping.line2, 50),
    ship_city: clip(shipping.city, 50),
    ship_state: clip(shipping.state, 50),
    ship_postcode: clip(shipping.postal_code, 50),
    ship_country: clip(shipping.country === "BD" ? "Bangladesh" : shipping.country, 50),
    product_name: clip(order.items.map((i) => i.product_name).join(", "), 255),
    product_category: "General",
    product_profile: "physical-goods",
    value_a: order.id.toString(),
    value_b: order.order_number,
  });

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        provider_payload: { stage: "init", failedreason: data.failedreason ?? "Unknown" },
      },
    });
    console.error("[sslcommerz] session init failed", data.failedreason);
    throw new SslcommerzError(
      "GATEWAY_INIT_FAILED",
      "Could not start online payment. Please try again.",
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { provider_payload: { stage: "init", session_key: data.sessionkey ?? null } },
  });

  return { gatewayUrl: data.GatewayPageURL, tranId, orderNumber: order.order_number };
}

type ValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  currency_amount?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_brand?: string;
  risk_level?: string;
  risk_title?: string;
  tran_date?: string;
};

async function validateWithGateway(valId: string): Promise<ValidationResponse> {
  const cfg = await getSslcommerzConfig();
  if (!cfg) throw new Error("SSLCOMMERZ is not configured");
  const params = new URLSearchParams({
    val_id: valId,
    store_id: cfg.storeId,
    store_passwd: cfg.storePassword,
    v: "1",
    format: "json",
  });
  const res = await fetch(
    `${sslcommerzBaseUrl(cfg.isLive)}/validator/api/validationserverAPI.php?${params.toString()}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  return (await res.json()) as ValidationResponse;
}

export type SettleResult =
  | { outcome: "paid" | "already_paid" | "under_review" | "failed"; orderNumber: string }
  | { outcome: "not_found" };

/**
 * Validate a callback/IPN with the SSLCOMMERZ server and record the result.
 * Never trusts the posted fields — only the server-side validation response
 * (tran_id, amount, currency must match our payment row). Idempotent.
 */
export async function settleSslcommerzPayment(input: {
  tranId: string;
  valId: string;
}): Promise<SettleResult> {
  const payment = await prisma.payment.findFirst({
    where: { transaction_id: input.tranId, provider: "sslcommerz" },
    include: { order: { select: { id: true, order_number: true, status: true } } },
  });
  if (!payment) return { outcome: "not_found" };
  const orderNumber = payment.order.order_number;
  if (payment.status === "paid") return { outcome: "already_paid", orderNumber };

  let validation: ValidationResponse;
  try {
    validation = await validateWithGateway(input.valId);
  } catch (err) {
    console.error("[sslcommerz] validation request failed", err);
    // Leave pending — IPN or a later callback can settle it.
    return { outcome: "under_review", orderNumber };
  }

  const payload = { ...asPayload(payment.provider_payload), validation };
  const valid =
    (validation.status === "VALID" || validation.status === "VALIDATED") &&
    validation.tran_id === input.tranId &&
    amountCents(validation.currency_amount ?? validation.amount ?? "0") ===
      amountCents(payment.amount) &&
    (validation.currency_type ?? validation.currency) === payment.currency;

  if (!valid) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: { status: "failed", provider_payload: payload as Prisma.InputJsonValue },
    });
    console.warn("[sslcommerz] validation mismatch", { tranId: input.tranId, status: validation.status });
    return { outcome: "failed", orderNumber };
  }

  if (validation.risk_level === "1") {
    // Risky payment: money captured but hold fulfilment until staff review.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { provider_payload: { ...payload, under_review: true } as Prisma.InputJsonValue },
    });
    return { outcome: "under_review", orderNumber };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        paid_at: new Date(),
        provider_payload: payload as Prisma.InputJsonValue,
      },
    }),
    prisma.order.update({
      where: { id: payment.order.id },
      data: {
        payment_status: "paid",
        ...(payment.order.status === "pending" ? { status: "confirmed" as const } : {}),
      },
    }),
  ]);

  return { outcome: "paid", orderNumber };
}

/** Customer cancelled / gateway failed — only touches a still-pending attempt. */
export async function markSslcommerzUnpaid(
  tranId: string,
  reason: "failed" | "cancelled",
  posted: Record<string, unknown>,
) {
  const payment = await prisma.payment.findFirst({
    where: { transaction_id: tranId, provider: "sslcommerz" },
    include: { order: { select: { order_number: true } } },
  });
  if (!payment) return null;
  if (payment.status === "pending") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        provider_payload: {
          ...asPayload(payment.provider_payload),
          stage: reason,
          gateway_status: String(posted.status ?? ""),
          error: String(posted.error ?? ""),
        } as Prisma.InputJsonValue,
      },
    });
  }
  return payment.order.order_number;
}
