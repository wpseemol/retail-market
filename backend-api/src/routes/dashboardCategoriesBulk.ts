import path from "node:path";
import { Router, type Response } from "express";
import multer from "multer";
import { zipSync, type Zippable } from "fflate";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  CATEGORY_CSV_COLUMNS,
  CATEGORY_EXPORT_MAX_ROWS,
  CATEGORY_ZIP_MAX_BYTES,
  readCategoryImportFile,
} from "../lib/categoryCsv.js";
import { CATEGORY_IMAGE_MAX_BYTES } from "../lib/categoryImage.js";
import { toCsv } from "../lib/productCsv.js";
import { readMediaFile } from "../lib/storage/files.js";
import { toPublicMedia } from "../lib/user.js";
import { isZipBuffer } from "../lib/zipArchive.js";
import { runCategoryImport } from "../services/categoryImport.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  exportCategoriesQuerySchema,
  importCategoriesOptionsSchema,
} from "../validators/categoryBulk.js";

/**
 * Export / import for `/api/dashboard/categories` (mounted before `/:id`).
 * Categories are a shared catalog, so both follow the mutation rule:
 * super_admin, admin and moderator. Vendors only pick categories.
 */
export const dashboardCategoriesBulkRouter = Router();

export function categoryBulkPermissions(role: string) {
  const elevated = role === "super_admin" || role === "admin" || role === "moderator";
  return { export: elevated, import: elevated };
}

function deny(res: Response, action: "export" | "import") {
  return res.status(403).json({
    message: `Only super admin, admin, or moderator can ${action} categories`,
    code: "INSUFFICIENT_ROLE",
  });
}

function validationError(res: Response, error: z.ZodError, fallback = "Validation failed") {
  return res.status(400).json({
    message: error.issues[0]?.message ?? fallback,
    errors: error.flatten().fieldErrors,
  });
}

/* ---------- Export ---------- */

/** Cover images bundled per ZIP export; rows past the cap keep their URL instead. */
const ZIP_EXPORT_IMAGE_BYTES = 200 * 1024 * 1024;

const exportInclude = {
  parent: { select: { slug: true } },
  image: true,
} satisfies Prisma.CategoryInclude;

type ExportRow = Prisma.CategoryGetPayload<{ include: typeof exportInclude }>;

function exportRow(c: ExportRow, image: string | null | undefined) {
  return [
    c.slug,
    c.name,
    c.parent?.slug,
    c.description,
    c.icon,
    c.is_active ? "active" : "inactive",
    c.sort_order,
    c.meta_title,
    c.meta_description,
    image,
  ];
}

async function readStoredImage(c: ExportRow) {
  if (!c.image) return null;
  return readMediaFile(c.image.file_path, c.image.file_name, CATEGORY_IMAGE_MAX_BYTES, c.image.disk);
}

dashboardCategoriesBulkRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    if (!categoryBulkPermissions(req.auth!.role).export) return deny(res, "export");

    const parsed = exportCategoriesQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");
    const { q, active, format, ids } = parsed.data;

    const where: Prisma.CategoryWhereInput = { deleted_at: null };
    if (active === "true") where.is_active = true;
    if (active === "false") where.is_active = false;
    if (ids?.length) where.id = { in: ids.map((id) => BigInt(id)) };
    if (q) {
      where.OR = [{ name: { contains: q } }, { slug: { contains: q } }, { description: { contains: q } }];
    }

    const rows = await prisma.category.findMany({
      where,
      include: exportInclude,
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      take: CATEGORY_EXPORT_MAX_ROWS,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Total-Rows", String(rows.length));

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="categories-${stamp}.csv"`);
      return res.send(toCsv(CATEGORY_CSV_COLUMNS, rows.map((c) => exportRow(c, toPublicMedia(c.image)?.path))));
    }

    const files: Zippable = {};
    let imageBytes = 0;
    const csvRows = [];
    for (const c of rows) {
      const data = await readStoredImage(c);
      if (!data || imageBytes + data.length > ZIP_EXPORT_IMAGE_BYTES) {
        csvRows.push(exportRow(c, toPublicMedia(c.image)?.path));
        continue;
      }
      imageBytes += data.length;
      const ext = path.extname(c.image!.file_name).toLowerCase() || ".webp";
      const name = `images/${c.slug}${ext}`;
      files[name] = [new Uint8Array(data), { level: 0 }];
      csvRows.push(exportRow(c, name));
    }
    files["categories.csv"] = [Buffer.from(toCsv(CATEGORY_CSV_COLUMNS, csvRows), "utf8"), { level: 6 }];

    const zip = zipSync(files);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="categories-${stamp}.zip"`);
    return res.send(Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength));
  }),
);

dashboardCategoriesBulkRouter.get("/import-template", (req, res) => {
  if (!categoryBulkPermissions(req.auth!.role).import) return deny(res, "import");
  const samples = [
    ["home-living", "Home & Living", "", "Furniture, decor and kitchen essentials", "Sofa", "active", "10", "", "", ""],
    ["kitchen", "Kitchen", "home-living", "Cookware and dining", "", "active", "11", "", "", "images/kitchen.webp"],
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="categories-import-template.csv"');
  res.setHeader("Cache-Control", "no-store");
  return res.send(toCsv(CATEGORY_CSV_COLUMNS, samples));
});

/* ---------- Import ---------- */

const UPLOAD_MIMES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
]);

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CATEGORY_ZIP_MAX_BYTES, files: 1, fields: 4, parts: 6 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname ?? "";
    const ext = path.extname(name).toLowerCase();
    if (name.length > 255 || /[<>]|<\?|javascript:/i.test(name) || (ext !== ".csv" && ext !== ".zip")) {
      cb(new Error("Upload a .csv or .zip file"));
      return;
    }
    if (!UPLOAD_MIMES.has(file.mimetype)) {
      cb(new Error("Upload a .csv or .zip file"));
      return;
    }
    cb(null, true);
  },
});

dashboardCategoriesBulkRouter.post(
  "/import",
  (req, res, next) => {
    if (!categoryBulkPermissions(req.auth!.role).import) return deny(res, "import");
    importUpload.single("file")(req, res, (err) => {
      if (err) {
        const tooBig = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
        return res.status(400).json({
          message: tooBig ? "File must be 25 MB or smaller" : err instanceof Error ? err.message : "Upload failed",
          code: tooBig ? "FILE_TOO_LARGE" : "INVALID_FILE",
        });
      }
      return next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "CSV or ZIP file is required (field: file)" });

    const options = importCategoriesOptionsSchema.safeParse(req.body ?? {});
    if (!options.success) return validationError(res, options.error);

    const isZipName = path.extname(file.originalname).toLowerCase() === ".zip";
    if (isZipName !== isZipBuffer(file.buffer)) {
      return res.status(400).json({
        message: "File content doesn't match its extension",
        code: "INVALID_FILE",
      });
    }

    const read = readCategoryImportFile(file.buffer);
    if ("error" in read) return res.status(400).json({ message: read.error, code: "INVALID_IMPORT_FILE" });

    const result = await runCategoryImport(read, {
      mode: options.data.mode,
      dryRun: options.data.dry_run,
      userId: req.auth!.userId,
    });

    return res.json({
      message: result.dry_run
        ? "Preview ready — nothing was saved"
        : `Imported: ${result.summary.create} created, ${result.summary.update} updated, ${result.summary.images} image${result.summary.images === 1 ? "" : "s"}`,
      ...result,
    });
  }),
);
