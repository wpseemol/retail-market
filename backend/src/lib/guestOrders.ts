import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { normalizeEmail, normalizePhone } from "./phone.js";

type ClaimableUser = {
  id: bigint;
  role: string;
  email: string;
  phone: string | null;
  email_verified_at: Date | null;
  phone_verified_at: Date | null;
};

/**
 * Attach guest orders to a customer account.
 *
 * Only *verified* contact details are trusted — otherwise anyone could
 * register with a stranger's email/phone and read their orders and addresses.
 * Safe to call on every login / verification (no-op when nothing matches).
 */
export async function claimGuestOrders(user: ClaimableUser): Promise<number> {
  if (user.role !== "customer") return 0;

  const matches: Prisma.OrderWhereInput[] = [];
  const email = normalizeEmail(user.email);
  if (user.email_verified_at && email) matches.push({ customer_email: email });
  const phone = normalizePhone(user.phone);
  if (user.phone_verified_at && phone) matches.push({ customer_phone: phone });
  if (matches.length === 0) return 0;

  const result = await prisma.order.updateMany({
    where: { user_id: null, OR: matches },
    data: { user_id: user.id, claimed_at: new Date() },
  });
  return result.count;
}

/** Guest orders waiting for this user to verify email / phone (for UI hints). */
export async function countPendingGuestOrders(user: ClaimableUser) {
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  const [byEmail, byPhone] = await Promise.all([
    !user.email_verified_at && email
      ? prisma.order.count({ where: { user_id: null, customer_email: email } })
      : 0,
    !user.phone_verified_at && phone
      ? prisma.order.count({ where: { user_id: null, customer_phone: phone } })
      : 0,
  ]);
  return { email: byEmail, phone: byPhone };
}
