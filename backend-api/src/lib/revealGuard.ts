import { prisma } from "./prisma.js";
import { verifyPassword } from "./password.js";

const REVEAL_MAX_FAILS = 5;
const REVEAL_WINDOW_MS = 15 * 60 * 1000;
const revealFails = new Map<string, { count: number; resetAt: number }>();

type GuardResult =
  | { ok: true }
  | { ok: false; status: 401 | 429; body: { message: string; code: string; errors?: Record<string, string[]> } };

/**
 * Re-auth before showing decrypted settings secrets. Wrong passwords are
 * counted per user across every reveal endpoint (5 per 15 minutes).
 */
export async function confirmActorPassword(actorId: bigint, password: string): Promise<GuardResult> {
  const key = actorId.toString();
  const now = Date.now();
  const fails = revealFails.get(key);
  if (fails && fails.resetAt > now && fails.count >= REVEAL_MAX_FAILS) {
    return {
      ok: false,
      status: 429,
      body: { message: "Too many wrong passwords. Try again in a few minutes.", code: "REVEAL_RATE_LIMITED" },
    };
  }

  const user = await prisma.user.findUnique({ where: { id: actorId }, select: { password: true } });
  const ok = Boolean(user?.password) && (await verifyPassword(password, user!.password!));

  if (!ok) {
    const entry = fails && fails.resetAt > now ? fails : { count: 0, resetAt: now + REVEAL_WINDOW_MS };
    entry.count += 1;
    revealFails.set(key, entry);
    return {
      ok: false,
      status: 401,
      body: { message: "Incorrect password", code: "INVALID_PASSWORD", errors: { password: ["Incorrect password"] } },
    };
  }
  revealFails.delete(key);
  return { ok: true };
}
