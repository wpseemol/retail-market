import { env } from "./env.js";
import { runBackup } from "./backup.js";

type CronParts = {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
};

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function parseField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = /^(\*|\d+)(?:-(\d+))?\/(\d+)$/.exec(part);
    if (stepMatch) {
      const start = stepMatch[1] === "*" ? min : Number(stepMatch[1]);
      const end = stepMatch[2] ? Number(stepMatch[2]) : max;
      const step = Number(stepMatch[3]);
      for (let n = start; n <= end; n += step) out.add(n);
      continue;
    }
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) out.add(n);
      continue;
    }
    const n = Number(part);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new Error(`Invalid cron field value: ${part}`);
    }
    out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Five-field cron: `minute hour day-of-month month day-of-week` (UTC). */
export function parseCron(expression: string): CronParts {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`BACKUP_CRON must have 5 fields (got ${parts.length}): ${expression}`);
  }
  return {
    minute: parseField(parts[0]!, 0, 59),
    hour: parseField(parts[1]!, 0, 23),
    dayOfMonth: parseField(parts[2]!, 1, 31),
    month: parseField(parts[3]!, 1, 12),
    dayOfWeek: parseField(parts[4]!, 0, 7).map((d) => (d === 7 ? 0 : d)),
  };
}

function matchesCron(parts: CronParts, date: Date) {
  return (
    parts.minute.includes(date.getUTCMinutes()) &&
    parts.hour.includes(date.getUTCHours()) &&
    parts.dayOfMonth.includes(date.getUTCDate()) &&
    parts.month.includes(date.getUTCMonth() + 1) &&
    parts.dayOfWeek.includes(date.getUTCDay())
  );
}

async function tick(parts: CronParts, lastKey: { value: string }) {
  if (!env.backup.enabled) return;
  const now = new Date();
  // Fire at most once per UTC minute when the expression matches.
  const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
  if (key === lastKey.value) return;
  if (!matchesCron(parts, now)) return;
  lastKey.value = key;
  if (running) {
    console.warn("[backup] Skipping scheduled run — previous backup still in progress");
    return;
  }
  running = true;
  try {
    await runBackup();
  } catch (err) {
    console.error("[backup] Scheduled backup failed:", err);
  } finally {
    running = false;
  }
}

/**
 * Starts an in-process cron for backups when `BACKUP_ENABLED=true`.
 * Prefer a system crontab calling `pnpm backup` on Spaceship/Passenger if the
 * Node process may sleep; both paths write the same `backups/` folder.
 */
export function startBackupScheduler() {
  if (!env.backup.enabled) {
    console.log("[backup] Scheduler off (BACKUP_ENABLED is not true)");
    return;
  }

  let parts: CronParts;
  try {
    parts = parseCron(env.backup.cron);
  } catch (err) {
    console.error("[backup] Invalid BACKUP_CRON — scheduler not started:", err);
    return;
  }

  if (timer) clearInterval(timer);
  const lastKey = { value: "" };
  // Check every 20s so we do not miss the matching minute.
  timer = setInterval(() => {
    void tick(parts, lastKey);
  }, 20_000);
  // Do not keep the process alive solely for the timer on CLI scripts.
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  console.log(
    `[backup] Scheduler on — cron "${env.backup.cron}" (UTC), keep ${env.backup.retentionDays} day(s) under ${env.backup.dir}/`,
  );
}

export function stopBackupScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
