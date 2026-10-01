import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notifyNewOrder } from "../lib/notifications.js";
import { purchasableScope } from "../lib/cart.js";
import {
  isSslcommerzConfigured,
  SslcommerzError,
  SSLCZ_MAX_AMOUNT,
  SSLCZ_MIN_AMOUNT,
  startSslcommerzCheckout,
} from "../lib/sslcommerz.js";
import { optionalAuth, requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  calculateShipping,
  getShippingSettings,
  toPublicShippingSettings,
} from "../lib/shipping.js";
import {
  customerOrdersQuerySchema,
  placeOrderSchema,
  shippingQuoteSchema,
} from "../validators/order.js";

export const customerOrdersRouter = Router();

/** Shipping for a cart — same calculation the order endpoint uses (no auth). */
customerOrdersRouter.post(
  "/shipping-quote",
  asyncHandler(async (req, res) => {
    const parsed = shippingQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const ids = parsed.data.items
      .map((i) => {
        try {
          return i.product_id != null && i.product_id !== "" ? BigInt(i.product_id) : null;
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id != null);
    const [products, settings] = await Promise.all([
      ids.length > 0
        ? prisma.product.findMany({
            where: { id: { in: ids }, deleted_at: null },
            select: { id: true, vendor_id: true, shipping_fee: true },
          })
        : [],
      getShippingSettings(),
    ]);
    const map = new Map(products.map((p) => [p.id.toString(), p]));

    const result = calculateShipping(
      parsed.data.items.map((i) => {
        const p = i.product_id != null ? map.get(String(i.product_id)) : undefined;
        return {
          vendorId: p?.vendor_id ?? null,
          productFee: p?.shipping_fee ?? null,
          lineTotal: new Prisma.Decimal(i.unit_price.toFixed(2)).mul(i.quantity),
        };
      }),
      settings,
    );

    return res.json({
      shipping_fee: Number(result.fee),
      free_shipping_applied: result.freeApplied,
      ...toPublicShippingSettings(settings),
    });
  }),
);

function countryCode(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const map: Record<string, string> = {
    bangladesh: "BD",
    "united states": "US",
    canada: "CA",
    "united kingdom": "GB",
    australia: "AU",
    germany: "DE",
    france: "FR",
    india: "IN",
  };
  return map[trimmed.toLowerCase()] ?? "BD";
}

function orderNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NIY-${y}${m}${day}-${rand}`;
}

/** Guest checkout (no token) or customer checkout (Bearer token). */
customerOrdersRouter.post(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = placeOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    if (req.auth && req.auth.role !== "customer") {
      return res.status(403).json({
        message: "Staff accounts cannot place storefront orders",
        code: "STAFF_CANNOT_ORDER",
      });
    }

    const input = parsed.data;
    const customer = req.auth?.user ?? null;
    const userId = req.auth?.userId ?? null;
    const contactEmail = input.email ?? customer?.email.toLowerCase() ?? null;
    if (!contactEmail) {
      return res.status(400).json({
        message: "Validation failed",
        errors: { email: ["Email is required for guest checkout"] },
      });
    }
    const contactPhone = input.billing.phone;

    // Same product sent twice is one line, so stock is checked against the total.
    const requested = new Map<string, number>();
    for (const item of input.items) {
      requested.set(item.product_id, (requested.get(item.product_id) ?? 0) + item.quantity);
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: [...requested.keys()].map((id) => BigInt(id)) },
        ...purchasableScope(),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock_qty: true,
        shipping_fee: true,
        vendor_id: true,
        vendor: { select: { user_id: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id.toString(), p]));

    const unavailable: Record<string, string> = {};
    for (const [pid, qty] of requested) {
      const product = productMap.get(pid);
      if (!product) unavailable[pid] = "This product is no longer available.";
      else if (product.stock_qty <= 0) unavailable[pid] = `${product.name} is out of stock.`;
      else if (product.stock_qty < qty) {
        unavailable[pid] = `Only ${product.stock_qty} of ${product.name} left in stock.`;
      }
    }
    if (Object.keys(unavailable).length > 0) {
      return res.status(409).json({
        message: "Some items in your order are unavailable. Update your cart and try again.",
        code: "ITEM_UNAVAILABLE",
        errors: unavailable,
      });
    }

    const shippingSettings = await getShippingSettings();

    const lineItems = [...requested].map(([pid, qty]) => {
      const product = productMap.get(pid)!;
      const unit = new Prisma.Decimal(product.price);
      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku ?? null,
        unit_price: unit,
        quantity: qty,
        line_total: unit.mul(qty),
        vendor_user_id: product.vendor?.user_id ?? null,
        vendor_id: product.vendor_id ?? null,
        product_shipping_fee: product.shipping_fee ?? null,
      };
    });

    const requestedDiscount = new Prisma.Decimal(
      (input.discount_amount ?? 0).toFixed(2),
    );
    // Shipping is always computed server-side; any client `shipping_fee` is ignored.
    const { fee: shippingFee, subtotal } = calculateShipping(
      lineItems.map((l) => ({
        vendorId: l.vendor_id,
        productFee: l.product_shipping_fee,
        lineTotal: l.line_total,
      })),
      shippingSettings,
    );
    const discount = Prisma.Decimal.min(requestedDiscount, subtotal);
    const total = Prisma.Decimal.max(
      subtotal.sub(discount).add(shippingFee),
      new Prisma.Decimal(0),
    );

    const payOnline = input.payment_method === "sslcommerz";
    if (payOnline) {
      if (!(await isSslcommerzConfigured())) {
        return res.status(400).json({
          message: "Online payment is not available right now. Choose Cash on Delivery.",
          code: "GATEWAY_NOT_CONFIGURED",
        });
      }
      const amount = Number(total.toFixed(2));
      if (amount < SSLCZ_MIN_AMOUNT || amount > SSLCZ_MAX_AMOUNT) {
        return res.status(400).json({
          message: `Online payment supports orders between ৳${SSLCZ_MIN_AMOUNT} and ৳${SSLCZ_MAX_AMOUNT.toLocaleString("en-US")}.`,
          code: "AMOUNT_OUT_OF_RANGE",
        });
      }
    }

    const shipping = input.shipping ?? input.billing;
    let number = orderNumber();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await prisma.order.findUnique({
        where: { order_number: number },
        select: { id: true },
      });
      if (!clash) break;
      number = orderNumber();
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          user_id: userId,
          customer_email: contactEmail,
          customer_phone: contactPhone,
          order_number: number,
          status: "pending",
          payment_status: "pending",
          payment_method: input.payment_method,
          currency: "BDT",
          subtotal,
          shipping_fee: shippingFee,
          discount_amount: discount,
          tax_amount: 0,
          total,
          notes: input.notes?.trim() || null,
          items: {
            create: lineItems.map((line) => ({
              product_id: line.product_id,
              product_name: line.product_name,
              product_sku: line.product_sku,
              unit_price: line.unit_price,
              quantity: line.quantity,
              line_total: line.line_total,
            })),
          },
          addresses: {
            create: [
              {
                type: "billing",
                full_name: input.billing.full_name,
                phone: input.billing.phone,
                line1: input.billing.line1,
                line2: input.billing.line2?.trim() || null,
                city: input.billing.city,
                state: input.billing.state?.trim() || null,
                postal_code: input.billing.postal_code,
                country: countryCode(input.billing.country),
              },
              {
                type: "shipping",
                full_name: shipping.full_name,
                phone: shipping.phone,
                line1: shipping.line1,
                line2: shipping.line2?.trim() || null,
                city: shipping.city,
                state: shipping.state?.trim() || null,
                postal_code: shipping.postal_code,
                country: countryCode(shipping.country),
              },
            ],
          },
          // Online payments get their own attempt row in startSslcommerzCheckout.
          ...(payOnline
            ? {}
            : {
                payments: {
                  create: {
                    method: input.payment_method,
                    status: "pending" as const,
                    amount: total,
                    currency: "BDT",
                  },
                },
              }),
        },
        include: {
          items: true,
        },
      });
      if (userId != null) {
        await tx.cartItem.deleteMany({
          where: {
            cart: { user_id: userId },
            product_id: { in: lineItems.map((l) => l.product_id) },
          },
        });
      }
      return created;
    });

    const vendorUserIds = lineItems
      .map((l) => l.vendor_user_id)
      .filter((id): id is bigint => id != null);

    const customerName = customer
      ? `${customer.first_name} ${customer.last_name}`.trim() || customer.email
      : `${input.billing.full_name} (guest)`;

    await notifyNewOrder({
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total.toFixed(2),
      currency: order.currency,
      itemCount: lineItems.reduce((n, l) => n + l.quantity, 0),
      customerName,
      vendorUserIds,
    });

    let payment: { gateway_url: string | null; error?: string; code?: string } | undefined;
    if (payOnline) {
      try {
        const started = await startSslcommerzCheckout(order.id);
        payment = { gateway_url: started.gatewayUrl };
      } catch (err) {
        if (!(err instanceof SslcommerzError)) throw err;
        // Order is saved; the customer can retry payment from the result page.
        payment = { gateway_url: null, error: err.message, code: err.code };
      }
    }

    return res.status(201).json({
      ...(payment ? { payment } : {}),
      message: "Order placed",
      order: {
        id: order.id.toString(),
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        currency: order.currency,
        subtotal: order.subtotal.toFixed(2),
        shipping_fee: order.shipping_fee.toFixed(2),
        discount_amount: order.discount_amount.toFixed(2),
        total: order.total.toFixed(2),
        placed_at: order.placed_at.toISOString(),
        item_count: order.items.length,
        is_guest: userId == null,
      },
    });
  }),
);

/** Logged-in customer's orders (includes guest orders claimed after verification). */
customerOrdersRouter.get(
  "/",
  requireAuth,
  requireRoles("customer"),
  asyncHandler(async (req, res) => {
    const parsed = customerOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid query",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { page, limit } = parsed.data;
    const where = { user_id: req.auth!.userId };

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { placed_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      orders: rows.map((order) => ({
        id: order.id.toString(),
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        currency: order.currency,
        total: order.total.toFixed(2),
        placed_at: order.placed_at.toISOString(),
        claimed_at: order.claimed_at?.toISOString() ?? null,
        item_count: order.items.reduce((n, i) => n + i.quantity, 0),
        items: order.items.map((item) => ({
          id: item.id.toString(),
          product_id: item.product_id?.toString() ?? null,
          product_name: item.product_name,
          unit_price: item.unit_price.toFixed(2),
          quantity: item.quantity,
          line_total: item.line_total.toFixed(2),
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);
