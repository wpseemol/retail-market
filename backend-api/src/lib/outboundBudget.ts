import { env } from "./env.js";

/** Thrown when this process has already sent the hourly SMS, email, or WhatsApp budget. */
export class OutboundLimitError extends Error {
  readonly code = "OUTBOUND_HOURLY_LIMIT";

  constructor(public channel: "email" | "sms" | "whatsapp") {
    super(`Too many ${channel} messages sent this hour. Try again later.`);
  }
}

function hourlyGate(max: number) {
  let windowStart = 0;
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - windowStart >= 60 * 60 * 1000) {
      windowStart = now;
      count = 0;
    }
    if (count >= max) return false;
    count += 1;
    return true;
  };
}

const gates = {
  email: hourlyGate(env.outbound.emailPerHour),
  sms: hourlyGate(env.outbound.smsPerHour),
  whatsapp: hourlyGate(env.outbound.whatsappPerHour),
};

/** Counts one real provider send. Dev console logging does not call this. */
export function consumeOutbound(channel: "email" | "sms" | "whatsapp") {
  if (!gates[channel]()) throw new OutboundLimitError(channel);
}

const userTests = new Map<string, { count: number; resetAt: number }>();

/**
 * Dashboard "send a test" buttons. Returns seconds to wait when this staff
 * user is over the hourly cap, otherwise 0 and the attempt is counted.
 */
export function userOutboundRetryAfter(
  userId: string,
  channel: string,
  maxPerHour = 8,
): number {
  const now = Date.now();
  if (userTests.size > 5_000) {
    for (const [key, bucket] of userTests) {
      if (bucket.resetAt <= now) userTests.delete(key);
    }
  }
  const key = `${channel}:${userId}`;
  const current = userTests.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + 60 * 60 * 1000 };
  if (bucket.count >= maxPerHour) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }
  bucket.count += 1;
  userTests.set(key, bucket);
  return 0;
}
