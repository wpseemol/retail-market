import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, STAFF_ROLES } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listOrdersQuerySchema } from "../validators/order.js";

export const dashboardOrdersRouter = Router();

dashboardOrdersRouter.use(requireAuth, requireRoles(...STAFF_ROLES));

function money(value: { toFixed: (n: number) => string } | null | undefined) {
  return value ? value.toFixed(2) : "0.00";
}

function toPublicOrder(
  order: {
    id: bigint;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method: string;
    currency: string;
    subtotal: { toFixed: (n: number) => string };
    shipping_fee: { toFixed: (n: number) => string };
    discount_amount: { toFixed: (n: number) => string };
    tax_amount: { toFixed: (n: number) => string };
    total: { toFixed: (n: number) => string };
    notes: string | null;
    placed_at: Date;
    customer_email: string | null;
    customer_phone: string | null;
    claimed_at: Date | null;
    user: {
      id: bigint;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
    items: Array<{
      id: bigint;
      product_id: bigint | null;
      product_name: string;
      product_sku: string | null;
      variant_title: string | null;
      unit_price: { toFixed: (n: number) => string };
      quantity: number;
      line_total: { toFixed: (n: number) => string };
    }>;
    addresses?: Array<{
      type: string;
      full_name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      postal_code: string;
      country: string;
    }>;
  },
  detailed = false,
) {
  const billing = order.addresses?.find((a) => a.type === "billing");
  return {
    id: order.id.toString(),
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    currency: order.currency,
    subtotal: money(order.subtotal),
    shipping_fee: money(order.shipping_fee),
    discount_amount: money(order.discount_amount),
    tax_amount: money(order.tax_amount),
    total: money(order.total),
    notes: order.notes,
    placed_at: order.placed_at.toISOString(),
    is_guest: order.user == null,
    claimed_at: order.claimed_at?.toISOString() ?? null,
    customer: {
      id: order.user?.id.toString() ?? null,
      name: order.user
        ? `${order.user.first_name} ${order.user.last_name}`.trim()
        : (billing?.full_name ?? "Guest"),
      email: order.user?.email ?? order.customer_email,
      phone: order.customer_phone ?? billing?.phone ?? null,
    },
    item_count: order.items.reduce((n, i) => n + i.quantity, 0),
    items: order.items.map((item) => ({
      id: item.id.toString(),
      product_id: item.product_id?.toString() ?? null,
      product_name: item.product_name,
      product_sku: item.product_sku,
      variant_title: item.variant_title,
      unit_price: money(item.unit_price),
      quantity: item.quantity,
      line_total: money(item.line_total),
    })),
    ...(detailed && order.addresses
      ? {
          addresses: order.addresses.map((a) => ({
            type: a.type,
            full_name: a.full_name,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            state: a.state,
            postal_code: a.postal_code,
            country: a.country,
          })),
        }
      : {}),
  };
}

async function vendorScopedWhere(
  role: string,
  userId: bigint,
): Promise<Prisma.OrderWhereInput | null> {
  if (role !== "vendor") return {};
  const vendor = await prisma.vendor.findFirst({
    where: { user_id: userId, deleted_at: null },
    select: { id: true },
  });
  if (!vendor) return null;
  return {
    items: {
      some: {
        product: { vendor_id: vendor.id },
      },
    },
  };
}

dashboardOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid query",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status } = parsed.data;
    const scope = await vendorScopedWhere(req.auth!.role, req.auth!.userId);
    if (scope === null) {
      return res.json({
        orders: [],
        pagination: { page, limit, total: 0, total_pages: 1 },
      });
    }

    const where: Prisma.OrderWhereInput = {
      ...scope,
      ...(status && status !== "all" ? { status } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          items: true,
          addresses: { where: { type: "billing" } },
        },
        orderBy: { placed_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      orders: rows.map((row) => toPublicOrder(row)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

dashboardOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = BigInt(String(req.params.id));
    const scope = await vendorScopedWhere(req.auth!.role, req.auth!.userId);
    if (scope === null) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await prisma.order.findFirst({
      where: { id, ...scope },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        items: true,
        addresses: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ order: toPublicOrder(order, true) });
  }),
);
