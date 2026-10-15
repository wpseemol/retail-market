import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

/** Public and polled by the dashboard badge, so one DB ping is shared per window instead of one per request. */
const CACHE_MS = 5_000;
const DB_TIMEOUT_MS = 3_000;

let cached: { ok: boolean; at: number } | null = null;
let inFlight: Promise<boolean> | null = null;

async function pingDatabase(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function databaseHealthy(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.ok;
  inFlight ??= pingDatabase().finally(() => {
    inFlight = null;
  });
  const ok = await inFlight;
  cached = { ok, at: Date.now() };
  return ok;
}

healthRouter.get("/", async (_req, res) => {
  const ok = await databaseHealthy();
  res.setHeader("Cache-Control", "no-store");
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "backend",
    database: ok ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});
