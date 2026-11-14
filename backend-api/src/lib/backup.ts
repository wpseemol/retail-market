import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Zip, ZipDeflate } from "fflate";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { storageConfig } from "../config/storage.config.js";

export type BackupKind = "uploads" | "database";

export type BackupManifest = {
  stamp: string;
  created_at: string;
  storage_driver: string;
  uploads: {
    file: string;
    bytes: number;
    file_count: number;
    note?: string;
  };
  database: {
    file: string;
    bytes: number;
    method: "mysqldump" | "prisma";
    tables: number;
  };
  error?: string;
};

export type BackupListItem = {
  stamp: string;
  created_at: string;
  path: string;
  uploads: { file: string; bytes: number } | null;
  database: { file: string; bytes: number } | null;
  storage_driver?: string;
};

const STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{4}$/;
const LOCK_NAME = ".backup.lock";

export function backupRootDir() {
  return path.resolve(process.cwd(), env.backup.dir);
}

export function isValidBackupStamp(stamp: string) {
  return STAMP_RE.test(stamp);
}

function formatStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}${mm}`;
}

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL is missing a database name");
  return {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port || "3306",
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    database,
  };
}

async function pathExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileSize(p: string) {
  try {
    return (await fs.stat(p)).size;
  } catch {
    return 0;
  }
}

async function acquireLock() {
  const root = backupRootDir();
  await ensureDir(root);
  const lockPath = path.join(root, LOCK_NAME);
  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }),
      "utf8",
    );
    await handle.close();
    return lockPath;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      throw new Error("A backup is already running");
    }
    throw err;
  }
}

async function releaseLock(lockPath: string) {
  await fs.unlink(lockPath).catch(() => undefined);
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

/** Stream a directory into a ZIP on disk (deflate). Empty dirs are skipped. */
async function zipDirectoryToFile(
  sourceDir: string,
  zipPath: string,
): Promise<{ bytes: number; fileCount: number }> {
  const files = (await pathExists(sourceDir)) ? await walkFiles(sourceDir) : [];
  await ensureDir(path.dirname(zipPath));

  if (files.length === 0) {
    // Minimal valid empty ZIP (EOCD only).
    const empty = Buffer.from([
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    await fs.writeFile(zipPath, empty);
    return { bytes: empty.length, fileCount: 0 };
  }

  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(zipPath);
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      ws.destroy();
      reject(err);
    };
    const zip = new Zip((err, data, final) => {
      if (err) return fail(err);
      if (data.length) {
        if (!ws.write(Buffer.from(data))) {
          // backpressure ignored — rare for local disk; continue
        }
      }
      if (final) {
        ws.end(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        });
      }
    });

    ws.on("error", fail);

    void (async () => {
      try {
        for (const absolute of files) {
          const relative = path.relative(sourceDir, absolute).split(path.sep).join("/");
          if (!relative || relative.startsWith("..")) continue;
          const data = await fs.readFile(absolute);
          const entry = new ZipDeflate(relative, { level: 6 });
          zip.add(entry);
          entry.push(data, true);
        }
        zip.end();
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });

  return { bytes: await fileSize(zipPath), fileCount: files.length };
}

async function zipBufferToFile(buffer: Buffer, entryName: string, zipPath: string) {
  await ensureDir(path.dirname(zipPath));
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(zipPath);
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      ws.destroy();
      reject(err);
    };
    const zip = new Zip((err, data, final) => {
      if (err) return fail(err);
      if (data.length) ws.write(Buffer.from(data));
      if (final) {
        ws.end(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        });
      }
    });
    ws.on("error", fail);
    const entry = new ZipDeflate(entryName, { level: 6 });
    zip.add(entry);
    entry.push(buffer, true);
    zip.end();
  });
  return fileSize(zipPath);
}

function runMysqldump(cfg: ReturnType<typeof parseDatabaseUrl>, sqlPath: string) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      `-h${cfg.host}`,
      `-P${cfg.port}`,
      `-u${cfg.user}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      "--default-character-set=utf8mb4",
      cfg.database,
    ];
    const child = spawn("mysqldump", args, {
      env: { ...process.env, MYSQL_PWD: cfg.password },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = createWriteStream(sqlPath);
    const chunks: Buffer[] = [];
    child.stderr.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", (err) => {
      out.destroy();
      reject(err);
    });
    void pipeline(child.stdout, out)
      .then(() => {
        child.once("close", (code) => {
          if (code === 0) resolve();
          else {
            const errText = Buffer.concat(chunks).toString("utf8").trim();
            reject(new Error(errText || `mysqldump exited with code ${code}`));
          }
        });
      })
      .catch(reject);
  });
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString("hex")}`;
  }
  if (typeof value === "object") {
    return sqlString(JSON.stringify(value));
  }
  return sqlString(String(value));
}

function sqlString(s: string) {
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
}

/** Best-effort SQL dump when `mysqldump` is not installed. */
async function dumpDatabaseWithPrisma(sqlPath: string): Promise<number> {
  // MySQL may return alias keys as TABLE_NAME / table_name depending on the driver.
  const tableRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
  );
  const tables = tableRows
    .map((row) => String(row.table_name ?? row.TABLE_NAME ?? ""))
    .filter((name) => /^[A-Za-z0-9_]+$/.test(name));

  const parts: string[] = [
    `-- Niyenin Prisma fallback dump`,
    `-- Generated ${new Date().toISOString()}`,
    `SET NAMES utf8mb4;`,
    `SET FOREIGN_KEY_CHECKS=0;`,
    "",
  ];

  for (const table_name of tables) {
    const createRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SHOW CREATE TABLE \`${table_name}\``,
    );
    const createRow = createRows[0] ?? {};
    // Prisma/MySQL often labels SHOW CREATE columns as f0/f1 instead of "Create Table".
    const createSql = String(
      createRow["Create Table"] ??
        createRow["Create table"] ??
        createRow.create_table ??
        createRow.f1 ??
        Object.values(createRow)[1] ??
        "",
    );
    if (!createSql.startsWith("CREATE TABLE")) continue;
    parts.push(`DROP TABLE IF EXISTS \`${table_name}\`;`);
    parts.push(`${createSql};`);
    parts.push("");

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM \`${table_name}\``,
    );
    if (rows.length === 0) {
      parts.push("");
      continue;
    }
    const columns = Object.keys(rows[0]!);
    const colList = columns.map((c) => `\`${c}\``).join(", ");
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      const values = slice
        .map((row) => `(${columns.map((c) => sqlLiteral(row[c])).join(", ")})`)
        .join(",\n");
      parts.push(`INSERT INTO \`${table_name}\` (${colList}) VALUES\n${values};`);
    }
    parts.push("");
  }

  parts.push(`SET FOREIGN_KEY_CHECKS=1;`, "");
  await fs.writeFile(sqlPath, parts.join("\n"), "utf8");
  return tables.length;
}

async function createDatabaseZip(runDir: string, stamp: string) {
  const sqlName = `database-${stamp}.sql`;
  const sqlPath = path.join(runDir, sqlName);
  const zipName = `database-${stamp}.sql.zip`;
  const zipPath = path.join(runDir, zipName);
  const cfg = parseDatabaseUrl(env.databaseUrl);

  let method: "mysqldump" | "prisma" = "mysqldump";
  let tables = 0;

  try {
    await runMysqldump(cfg, sqlPath);
    // Count tables from dump header when possible
    tables = await countTablesFromSqlFile(sqlPath);
  } catch (err) {
    console.warn(
      "[backup] mysqldump unavailable or failed — using Prisma fallback:",
      err instanceof Error ? err.message : err,
    );
    method = "prisma";
    tables = await dumpDatabaseWithPrisma(sqlPath);
  }

  const bytes = await zipBufferToFile(await fs.readFile(sqlPath), sqlName, zipPath);
  await fs.unlink(sqlPath).catch(() => undefined);
  return { file: zipName, bytes, method, tables };
}

async function countTablesFromSqlFile(sqlPath: string) {
  const text = await fs.readFile(sqlPath, "utf8");
  const matches = text.match(/CREATE TABLE/gi);
  return matches?.length ?? 0;
}

async function createUploadsZip(runDir: string, stamp: string) {
  const zipName = `uploads-${stamp}.zip`;
  const zipPath = path.join(runDir, zipName);
  const uploadsDir = path.resolve(process.cwd(), "uploads");

  if (storageConfig.driver !== "local") {
    const note = `STORAGE_DRIVER=${storageConfig.driver}: media lives in object storage, not uploads/. This ZIP only includes any leftover local files.`;
    const result = await zipDirectoryToFile(uploadsDir, zipPath);
    return { file: zipName, bytes: result.bytes, file_count: result.fileCount, note };
  }

  const result = await zipDirectoryToFile(uploadsDir, zipPath);
  return {
    file: zipName,
    bytes: result.bytes,
    file_count: result.fileCount,
    note: result.fileCount === 0 ? "uploads/ was empty" : undefined,
  };
}

export async function pruneOldBackups(retentionDays = env.backup.retentionDays) {
  if (retentionDays <= 0) return { removed: [] as string[] };
  const root = backupRootDir();
  if (!(await pathExists(root))) return { removed: [] as string[] };

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const removed: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidBackupStamp(entry.name)) continue;
    const full = path.join(root, entry.name);
    const st = await fs.stat(full);
    if (st.mtimeMs < cutoff) {
      await fs.rm(full, { recursive: true, force: true });
      removed.push(entry.name);
    }
  }
  return { removed };
}

export async function runBackup(options?: { stamp?: string }): Promise<BackupManifest> {
  const stamp = options?.stamp ?? formatStamp();
  if (!isValidBackupStamp(stamp)) {
    throw new Error("Invalid backup stamp");
  }

  const lockPath = await acquireLock();
  const runDir = path.join(backupRootDir(), stamp);

  try {
    if (await pathExists(runDir)) {
      throw new Error(`Backup folder already exists: ${stamp}`);
    }
    await ensureDir(runDir);

    const uploads = await createUploadsZip(runDir, stamp);
    const database = await createDatabaseZip(runDir, stamp);

    const manifest: BackupManifest = {
      stamp,
      created_at: new Date().toISOString(),
      storage_driver: storageConfig.driver,
      uploads,
      database,
    };

    await fs.writeFile(
      path.join(runDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    await pruneOldBackups();
    console.log(`[backup] Created ${stamp} (uploads ${uploads.bytes} B, database ${database.bytes} B)`);
    return manifest;
  } catch (err) {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  } finally {
    await releaseLock(lockPath);
  }
}

export async function listBackups(): Promise<BackupListItem[]> {
  const root = backupRootDir();
  if (!(await pathExists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const items: BackupListItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidBackupStamp(entry.name)) continue;
    const dir = path.join(root, entry.name);
    const manifestPath = path.join(dir, "manifest.json");
    let created_at = (await fs.stat(dir)).mtime.toISOString();
    let storage_driver: string | undefined;
    let uploads: BackupListItem["uploads"] = null;
    let database: BackupListItem["database"] = null;

    if (await pathExists(manifestPath)) {
      try {
        const raw = JSON.parse(await fs.readFile(manifestPath, "utf8")) as BackupManifest;
        created_at = raw.created_at || created_at;
        storage_driver = raw.storage_driver;
        if (raw.uploads?.file) {
          uploads = {
            file: raw.uploads.file,
            bytes: raw.uploads.bytes ?? (await fileSize(path.join(dir, raw.uploads.file))),
          };
        }
        if (raw.database?.file) {
          database = {
            file: raw.database.file,
            bytes: raw.database.bytes ?? (await fileSize(path.join(dir, raw.database.file))),
          };
        }
      } catch {
        // fall through to directory scan
      }
    }

    if (!uploads) {
      const uploadsFile = `uploads-${entry.name}.zip`;
      if (await pathExists(path.join(dir, uploadsFile))) {
        uploads = { file: uploadsFile, bytes: await fileSize(path.join(dir, uploadsFile)) };
      }
    }
    if (!database) {
      const dbFile = `database-${entry.name}.sql.zip`;
      if (await pathExists(path.join(dir, dbFile))) {
        database = { file: dbFile, bytes: await fileSize(path.join(dir, dbFile)) };
      }
    }

    items.push({
      stamp: entry.name,
      created_at,
      path: path.join(env.backup.dir, entry.name),
      uploads,
      database,
      storage_driver,
    });
  }

  items.sort((a, b) => b.stamp.localeCompare(a.stamp));
  return items;
}

export async function resolveBackupFile(stamp: string, kind: BackupKind) {
  if (!isValidBackupStamp(stamp)) return null;
  const dir = path.join(backupRootDir(), stamp);
  if (!(await pathExists(dir))) return null;

  const fileName =
    kind === "uploads" ? `uploads-${stamp}.zip` : `database-${stamp}.sql.zip`;
  const absolute = path.join(dir, fileName);
  // Prevent path escape even if stamp is somehow weird.
  if (!absolute.startsWith(backupRootDir() + path.sep)) return null;
  if (!(await pathExists(absolute))) return null;
  return { absolute, fileName, bytes: await fileSize(absolute) };
}
