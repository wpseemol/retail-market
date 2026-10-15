import { z } from "zod";
import { IMPORT_MODES } from "./productBulk";

/** Mirrors `lib/categoryCsv.ts` in backend-api. */
export const CATEGORY_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CATEGORY_ZIP_MAX_BYTES = 25 * 1024 * 1024;
export const CATEGORY_CSV_MAX_ROWS = 1000;

const CSV_TYPES = ["text/csv", "application/vnd.ms-excel", "text/plain", "application/csv", ""];
const ZIP_TYPES = [
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
  "application/octet-stream",
  "",
];

export function validateCategoryImportFile(file: File | null | undefined): string | null {
  if (!file) return "Choose a .csv or .zip file";
  if (file.name.length > 255 || /[<>]|<\?|javascript:/i.test(file.name)) return "Invalid file name";
  if (file.size === 0) return "The file is empty";
  if (/\.zip$/i.test(file.name)) {
    if (!ZIP_TYPES.includes(file.type)) return "Upload a .zip file";
    if (file.size > CATEGORY_ZIP_MAX_BYTES) return "ZIP must be 25 MB or smaller";
    return null;
  }
  if (/\.csv$/i.test(file.name)) {
    if (!CSV_TYPES.includes(file.type)) return "Upload a .csv file";
    if (file.size > CATEGORY_CSV_MAX_BYTES) return "CSV must be 2 MB or smaller";
    return null;
  }
  return "Upload a .csv or .zip file";
}

export const categoryImportFormSchema = z.object({
  file: z.custom<File | null>().superRefine((file, ctx) => {
    const reason = validateCategoryImportFile(file);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  mode: z.enum(IMPORT_MODES),
});

export type CategoryImportFormValues = z.infer<typeof categoryImportFormSchema>;
