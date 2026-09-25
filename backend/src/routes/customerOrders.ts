import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notifyNewOrder } from "../lib/notifications.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { placeOrderSchema } from "../validators/order.js";

export const customerOrdersRouter = Router();

customerOrdersRouter.use(requireAuth, requireRoles("customer"));

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

customerOrdersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = placeOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const input = parsed.data;
    const userId = req.auth!.userId;
    const customer = req.auth!.user;

    const productIds = input.items
      .map((item) => {
        if (item.product_id == null || item.product_id === "") return null;
        try {
          return BigInt(item.product_id);
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id != null);

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds }, deleted_at: null },
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              vendor_id: true,
              vendor: { select: { user_id: true } },
            },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id.toString(), p]));

    const lineItems = input.items.map((item) => {
      const pid =
        item.product_id != null && item.product_id !== ""
          ? String(item.product_id)
          : null;
      const product = pid ? productMap.get(pid) : undefined;
      const unit = new Prisma.Decimal(item.unit_price.toFixed(2));
      const qty = item.quantity;
      const lineTotal = unit.mul(qty);
      return {
        product_id: product?.id ?? null,
        product_name: product?.name ?? item.name,
        product_sku: product?.sku ?? null,
        unit_price: unit,
        quantity: qty,
        line_total: lineTotal,
        vendor_user_id: product?.vendor?.user_id ?? null,
      };
    });

    const subtotal = lineItems.reduce(
      (sum, line) => sum.add(line.line_total),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(
      (input.discount_amount ?? 0).toFixed(2),
    );
    const shippingFee = new Prisma.Decimal(
      (input.shipping_fee ?? 0).toFixed(2),
    );
    const total = Prisma.Decimal.max(
      subtotal.sub(discount).add(shippingFee),
      new Prisma.Decimal(0),
    );

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
          payments: {
            create: {
              method: input.payment_method,
              status: "pending",
              amount: total,
              currency: "BDT",
            },
          },
        },
        include: {
          items: true,
        },
      });
      return created;
    });

    const vendorUserIds = lineItems
      .map((l) => l.vendor_user_id)
      .filter((id): id is bigint => id != null);

    const customerName =
      `${customer.first_name} ${customer.last_name}`.trim() || customer.email;

    await notifyNewOrder({
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total.toFixed(2),
      currency: order.currency,
      itemCount: lineItems.reduce((n, l) => n + l.quantity, 0),
      customerName,
      vendorUserIds,
    });

    return res.status(201).json({
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
      },
    });
  }),
);
