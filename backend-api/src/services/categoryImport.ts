import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { slugify } from "../lib/slug.js";
import {
  checkCategoryImageBuffer,
  finalizeCategoryImageBuffer,
  PRODUCT_IMAGES_RELATIVE,
} from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import {
  classifyImageRef,
  type CategoryCsvColumn,
  type CategoryImportFile,
} from "../lib/categoryCsv.js";
import { categoryCsvCellSchemas } from "../validators/categoryBulk.js";
import type { ImportMode } from "./productImport.js";

export type CategoryImportRowResult = {
  row: number;
  handle: string | null;
  title: string | null;
  action: "create" | "update" | "skip" | "error";
  /** `true` when this row sets a new cover image. */
  image: boolean;
  errors: string[];
  warnings: string[];
};

type Fields = {
  handle: string | null;
  name: string | null;
  parent: string | null;
  description: string | null;
  icon: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  meta_title: string | null;
  meta_description: string | null;
  image: string | null;
};

const FIELD_OF: Record<CategoryCsvColumn, keyof Fields> = {
  Handle: "handle",
  Name: "name",
  Parent: "parent",
  Description: "description",
  Icon: "icon",
  Status: "is_active",
  "Sort Order": "sort_order",
  "Meta Title": "meta_title",
  "Meta Description": "meta_description",
  Image: "image",
};

type ImageLoad = () => Buffer | { error: string };

type Plan = {
  result: CategoryImportRowResult;
  fields: Fields;
  present: Set<CategoryCsvColumn>;
  existingId: bigint | null;
  loadImage: ImageLoad | null;
};

type ExistingCategory = {
  id: bigint;
  slug: string;
  parent_id: bigint | null;
  image: { id: bigint; file_name: string; file_path: string | null } | null;
};

/** A re-imported export carries the exact stored file — no need to store it again. */
function sameAsStored(image: NonNullable<ExistingCategory["image"]>, data: Buffer) {
  try {
    const stored = path.join(PRODUCT_IMAGES_DIR, image.file_name);
    return fs.statSync(stored).size === data.length && fs.readFileSync(stored).equals(data);
  } catch {
    return false;
  }
}

function resolveImage(
  value: string,
  file: CategoryImportFile,
  existing: ExistingCategory | undefined,
  errors: string[],
  warnings: string[],
): ImageLoad | null {
  const ref = classifyImageRef(value);
  if (ref.kind === "invalid") {
    errors.push(ref.message);
    return null;
  }
  if (ref.kind === "external") {
    warnings.push("Images on other websites aren't downloaded — import a ZIP with the image file instead");
    return null;
  }

  let load: ImageLoad;
  if (ref.kind === "local") {
    const current = existing?.image
      ? `${(existing.image.file_path ?? "").replace(/^\/+|\/+$/g, "")}/${existing.image.file_name}`
      : null;
    if (current && current === ref.relative) return null;
    load = ref.read;
  } else {
    if (!file.bundle) {
      errors.push(`Image "${value.slice(0, 80)}" needs a ZIP upload with the image inside`);
      return null;
    }
    const bundle = file.bundle;
    load = () => bundle.read(ref.ref) ?? { error: `Image "${ref.ref.slice(0, 80)}" is not in the ZIP` };
  }

  const data = load();
  if ("error" in data) {
    errors.push(data.error);
    return null;
  }
  if (existing?.image && sameAsStored(existing.image, data)) return null;
  const problem = checkCategoryImageBuffer(data);
  if (problem) {
    errors.push(problem);
    return null;
  }
  return load;
}

export async function runCategoryImport(
  file: CategoryImportFile,
  ctx: { mode: ImportMode; dryRun: boolean; userId: bigint },
) {
  const { parsed } = file;
  const all = await prisma.category.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      slug: true,
      parent_id: true,
      image: { select: { id: true, file_name: true, file_path: true } },
    },
  });
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const slugById = new Map(all.map((c) => [c.id, c.slug]));
  // `slug` is unique across soft-deleted rows too.
  const deletedSlugs = new Set(
    (
      await prisma.category.findMany({ where: { deleted_at: { not: null } }, select: { slug: true } })
    ).map((c) => c.slug),
  );

  const plans: Plan[] = [];
  const firstRowOf = new Map<string, number>();

  for (const record of parsed.records) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const present = new Set<CategoryCsvColumn>();
    const fields: Fields = {
      handle: null,
      name: null,
      parent: null,
      description: null,
      icon: null,
      is_active: null,
      sort_order: null,
      meta_title: null,
      meta_description: null,
      image: null,
    };

    for (const column of parsed.columns) {
      const raw = record.values[column] ?? "";
      const out = categoryCsvCellSchemas[column].safeParse(raw);
      if (!out.success) {
        errors.push(`${column}: ${out.error.issues[0]?.message ?? "invalid value"}`);
        continue;
      }
      present.add(column);
      (fields as Record<string, unknown>)[FIELD_OF[column]] = out.data;
    }

    const handle = fields.handle ?? (fields.name ? slugify(fields.name).slice(0, 160) || null : null);
    const result: CategoryImportRowResult = {
      row: record.row,
      handle,
      title: fields.name,
      action: "error",
      image: false,
      errors,
      warnings,
    };
    const plan: Plan = { result, fields: { ...fields, handle }, present, existingId: null, loadImage: null };
    plans.push(plan);

    if (!handle) {
      if (errors.length === 0) errors.push("Add a Handle (slug) — the name can't be turned into one");
      continue;
    }
    const first = firstRowOf.get(handle);
    if (first !== undefined) {
      result.action = "skip";
      warnings.push(`Same handle as row ${first} — only the first row is imported`);
      continue;
    }
    firstRowOf.set(handle, record.row);
    if (errors.length > 0) continue;

    const existing = bySlug.get(handle);
    if (existing && ctx.mode === "create") {
      result.action = "skip";
      warnings.push("Category already exists (import mode: create only)");
      continue;
    }
    if (!existing && ctx.mode === "update") {
      result.action = "skip";
      warnings.push("No category with this handle (import mode: update only)");
      continue;
    }
    if (!existing && !fields.name) {
      errors.push("Name is required for new categories");
      continue;
    }
    if (!existing && deletedSlugs.has(handle)) {
      errors.push("A deleted category still uses this handle — pick another Handle");
      continue;
    }
    if (present.has("Name") && !fields.name) {
      warnings.push("Name is empty — keeping the current name");
    }
    if (fields.parent && fields.parent === handle) {
      errors.push("A category can't be its own parent");
      continue;
    }

    if (fields.image) {
      plan.loadImage = resolveImage(fields.image, file, existing, errors, warnings);
      if (errors.length > 0) continue;
      result.image = plan.loadImage !== null;
    }

    plan.existingId = existing?.id ?? null;
    result.action = existing ? "update" : "create";
  }

  // Parents may point at categories created earlier in the same file; drop rows whose
  // parent ends up missing, until nothing changes (a missing parent can cascade).
  const ok = () => plans.filter((p) => p.result.action === "create" || p.result.action === "update");
  for (let changed = true; changed; ) {
    changed = false;
    const available = new Set([...bySlug.keys(), ...ok().map((p) => p.fields.handle!)]);
    for (const plan of ok()) {
      const parent = plan.fields.parent;
      if (plan.present.has("Parent") && parent && !available.has(parent)) {
        plan.result.action = "error";
        plan.result.errors.push(`Parent "${parent}" not found`);
        changed = true;
      }
    }
  }

  // Reject parent loops against the final tree (database parents + this file's changes).
  const parentOf = new Map<string, string | null>();
  for (const c of all) parentOf.set(c.slug, c.parent_id ? (slugById.get(c.parent_id) ?? null) : null);
  for (const plan of ok()) {
    if (plan.present.has("Parent") || !plan.existingId) parentOf.set(plan.fields.handle!, plan.fields.parent);
  }
  for (const plan of ok()) {
    const self = plan.fields.handle!;
    let cursor = parentOf.get(self) ?? null;
    for (let depth = 0; cursor && depth < 100; depth++) {
      if (cursor === self) {
        plan.result.action = "error";
        plan.result.errors.push("Parent would create a loop (a category inside its own child)");
        break;
      }
      cursor = parentOf.get(cursor) ?? null;
    }
  }

  const count = (action: CategoryImportRowResult["action"]) => plans.filter((p) => p.result.action === action).length;
  const summary = () => ({
    total: plans.length,
    create: count("create"),
    update: count("update"),
    skip: count("skip"),
    error: count("error"),
    images: ok().filter((p) => p.result.image).length,
  });

  const base = {
    dry_run: ctx.dryRun,
    mode: ctx.mode,
    source: file.source,
    images_in_zip: file.bundle?.count ?? 0,
    columns: parsed.columns,
    ignored_columns: parsed.ignored,
  };

  if (ctx.dryRun) {
    return { ...base, summary: summary(), rows: plans.map((p) => p.result) };
  }

  const writable = ok();
  const idBySlug = new Map(all.map((c) => [c.slug, c.id]));

  await prisma.$transaction(async (tx) => {
    for (const plan of writable) {
      const f = plan.fields;
      const has = (c: CategoryCsvColumn) => plan.present.has(c);
      if (plan.existingId) {
        const data: Prisma.CategoryUpdateInput = {
          name: has("Name") && f.name ? f.name : undefined,
          description: has("Description") ? f.description : undefined,
          icon: has("Icon") ? f.icon : undefined,
          is_active: has("Status") && f.is_active !== null ? f.is_active : undefined,
          sort_order: has("Sort Order") && f.sort_order !== null ? f.sort_order : undefined,
          meta_title: has("Meta Title") ? f.meta_title : undefined,
          meta_description: has("Meta Description") ? f.meta_description : undefined,
        };
        if (Object.values(data).some((v) => v !== undefined)) {
          await tx.category.update({ where: { id: plan.existingId }, data });
        }
      } else {
        const created = await tx.category.create({
          data: {
            name: f.name!,
            slug: f.handle!,
            description: f.description,
            icon: f.icon,
            is_active: f.is_active ?? true,
            sort_order: f.sort_order ?? 0,
            meta_title: f.meta_title,
            meta_description: f.meta_description,
          },
          select: { id: true },
        });
        plan.existingId = created.id;
        idBySlug.set(f.handle!, created.id);
      }
    }

    for (const plan of writable) {
      if (!plan.present.has("Parent")) continue;
      const parentId = plan.fields.parent ? (idBySlug.get(plan.fields.parent) ?? null) : null;
      await tx.category.update({ where: { id: plan.existingId! }, data: { parent_id: parentId } });
    }
  });

  for (const plan of writable) {
    if (!plan.loadImage) continue;
    const warn = (msg: string) => {
      plan.result.image = false;
      plan.result.warnings.push(`Saved, but the image wasn't: ${msg}`);
    };
    const data = plan.loadImage();
    if ("error" in data) {
      warn(data.error);
      continue;
    }
    const finalized = await finalizeCategoryImageBuffer(data);
    if (!finalized.ok) {
      warn(finalized.message);
      continue;
    }
    try {
      const id = plan.existingId!;
      const previous = bySlug.get(plan.fields.handle!)?.image ?? null;
      const media = await prisma.media.create({
        data: {
          user_id: ctx.userId,
          disk: "public",
          file_name: finalized.fileName,
          original_name: `${plan.fields.handle}${finalized.detected.ext}`,
          file_path: PRODUCT_IMAGES_RELATIVE,
          file_size: BigInt(finalized.size),
          mime_type: finalized.detected.mime,
          alt_text: (plan.fields.name ?? plan.fields.handle!).slice(0, 255),
          collection_name: "product_images",
          is_public: true,
          mediable_type: "Category",
          mediable_id: id,
          sort_order: 0,
        },
      });
      await prisma.category.update({ where: { id }, data: { image_id: media.id } });
      if (previous) {
        try {
          const old = path.join(PRODUCT_IMAGES_DIR, previous.file_name);
          if (fs.existsSync(old)) fs.unlinkSync(old);
        } catch {
          /* ignore */
        }
        await prisma.media.delete({ where: { id: previous.id } }).catch(() => undefined);
      }
    } catch {
      try {
        fs.unlinkSync(finalized.absolutePath);
      } catch {
        /* ignore */
      }
      warn("could not be stored");
    }
  }

  return { ...base, summary: summary(), rows: plans.map((p) => p.result) };
}
