import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type NotificationPayload = {
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  /** Absolute dashboard path, e.g. `/orders/12` */
  link?: string;
};

function mergeData(
  data: Record<string, unknown> | undefined,
  link: string | undefined,
): Prisma.InputJsonValue | undefined {
  if (!data && !link) return undefined;
  return {
    ...(data ?? {}),
    ...(link ? { link } : {}),
  } as Prisma.InputJsonValue;
}

/** Create one inbox row for a user. */
export async function notifyUser(
  userId: bigint,
  payload: NotificationPayload,
) {
  return prisma.notification.create({
    data: {
      user_id: userId,
      type: payload.type.slice(0, 80),
      title: payload.title.slice(0, 200),
      body: payload.body?.slice(0, 2000) ?? null,
      data: mergeData(payload.data, payload.link),
    },
  });
}

/** Fan-out the same notification to many users (deduped). */
export async function notifyUsers(
  userIds: bigint[],
  payload: NotificationPayload,
) {
  const unique = [...new Set(userIds.map((id) => id.toString()))].map(
    (id) => BigInt(id),
  );
  if (unique.length === 0) return { count: 0 };

  await prisma.notification.createMany({
    data: unique.map((user_id) => ({
      user_id,
      type: payload.type.slice(0, 80),
      title: payload.title.slice(0, 200),
      body: payload.body?.slice(0, 2000) ?? null,
      data: mergeData(payload.data, payload.link),
    })),
  });

  return { count: unique.length };
}

/** Active staff users by role (dashboard recipients). */
export async function findStaffUserIds(
  roles: Array<"super_admin" | "admin" | "moderator" | "vendor">,
) {
  const users = await prisma.user.findMany({
    where: {
      deleted_at: null,
      status: "active",
      role: { in: roles },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export type NewOrderNotifyInput = {
  orderId: bigint;
  orderNumber: string;
  total: string;
  currency: string;
  itemCount: number;
  customerName: string;
  /** Vendor user IDs who own products in this order */
  vendorUserIds: bigint[];
};

/** Notify elevated staff + relevant vendors when a customer places an order. */
export async function notifyNewOrder(input: NewOrderNotifyInput) {
  const link = `/orders/${input.orderId.toString()}`;
  const money = `${input.currency} ${input.total}`;
  const baseData = {
    order_id: input.orderId.toString(),
    order_number: input.orderNumber,
    total: input.total,
    currency: input.currency,
    item_count: input.itemCount,
  };

  const staffIds = await findStaffUserIds([
    "super_admin",
    "admin",
    "moderator",
  ]);

  await notifyUsers(staffIds, {
    type: "order.new",
    title: `New order ${input.orderNumber}`,
    body: `${input.customerName} placed an order · ${input.itemCount} item(s) · ${money}`,
    data: baseData,
    link,
  });

  if (input.vendorUserIds.length > 0) {
    await notifyUsers(input.vendorUserIds, {
      type: "order.new",
      title: `Sale on your store · ${input.orderNumber}`,
      body: `${input.customerName} bought ${input.itemCount} item(s) · ${money}`,
      data: baseData,
      link,
    });
  }
}

export function toPublicNotification(row: {
  id: bigint;
  type: string;
  title: string;
  body: string | null;
  data: Prisma.JsonValue;
  read_at: Date | null;
  created_at: Date;
}) {
  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {};
  const link =
    typeof data.link === "string" && data.link.startsWith("/")
      ? data.link
      : null;

  return {
    id: row.id.toString(),
    type: row.type,
    title: row.title,
    body: row.body,
    data,
    link,
    read: row.read_at != null,
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  };
}
