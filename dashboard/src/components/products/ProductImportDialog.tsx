import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { ApiError, apiDownload, apiUpload } from "@/lib/api";
import type { ProductImportResult, ProductImportRow } from "@/lib/products";
import {
  IMPORT_MODE_LABELS,
  IMPORT_MODES,
  PRODUCT_CSV_MAX_ROWS,
  productImportFormSchema,
  type ProductImportFormValues,
} from "@/lib/validators/productBulk";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { saveBlob } from "./productCsvDownload";

const ACTION_META: Record<ProductImportRow["action"], { label: string; className: string }> = {
  create: { label: "Create", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  update: { label: "Update", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  skip: { label: "Skip", className: "border-border bg-muted text-muted-foreground" },
  error: { label: "Error", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

export function ProductImportDialog({
  open,
  onOpenChange,
  token,
  isVendor,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  isVendor: boolean;
  onImported: () => void;
}) {
  const confirm = useConfirm();
  const [preview, setPreview] = useState<ProductImportResult | null>(null);
  const [done, setDone] = useState<ProductImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | "template" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProductImportFormValues>({
    resolver: zodResolver(productImportFormSchema),
    defaultValues: { file: null, mode: "upsert" },
  });

  function reset() {
    form.reset({ file: null, mode: "upsert" });
    setPreview(null);
    setDone(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (busy === "apply") return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function send(values: ProductImportFormValues, dryRun: boolean) {
    const body = new FormData();
    body.append("file", values.file!);
    body.append("mode", values.mode);
    body.append("dry_run", String(dryRun));
    return apiUpload<ProductImportResult>("/api/dashboard/products/import", body, { token });
  }

  async function runPreview(values: ProductImportFormValues) {
    setBusy("preview");
    setError(null);
    try {
      setPreview(await send(values, true));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read the CSV");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!preview) return;
    const { create, update, error: failed, skip } = preview.summary;
    const ok = await confirm({
      tone: "warning",
      title: `Import ${create + update} product${create + update === 1 ? "" : "s"}?`,
      description: (
        <>
          {create} will be created and {update} updated.
          {failed + skip > 0 ? ` ${failed + skip} row${failed + skip === 1 ? "" : "s"} with errors or skips will be left out.` : ""}{" "}
          Updates overwrite the current values and can't be undone automatically — export the catalog first if you
          need a backup.
        </>
      ),
      confirmLabel: "Import now",
    });
    if (!ok) return;

    setBusy("apply");
    setError(null);
    try {
      const result = await send(form.getValues(), false);
      setDone(result);
      setPreview(null);
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function downloadTemplate() {
    setBusy("template");
    setError(null);
    try {
      const { blob, filename } = await apiDownload("/api/dashboard/products/import-template", { token });
      saveBlob(blob, filename ?? "products-import-template.csv");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the template");
    } finally {
      setBusy(null);
    }
  }

  const result = done ?? preview;
  const willWrite = preview ? preview.summary.create + preview.summary.update : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-brand-primary" />
            Import products from CSV
          </DialogTitle>
          <DialogDescription>
            {done
              ? "Import finished."
              : preview
                ? "Preview only — nothing has been saved yet. Check the rows, then import."
                : "Works with this dashboard's export and with Shopify / WooCommerce product CSVs. Rows are matched by Handle (slug)."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {!result ? (
          <Form {...form}>
            <form id="product-import-form" className="space-y-4" onSubmit={form.handleSubmit(runPreview)}>
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV file</FormLabel>
                    <FormControl>
                      <label
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-brand-primary/50 hover:bg-brand-tint/30",
                          field.value && "border-brand-primary/50 bg-brand-tint/30",
                        )}
                      >
                        <Upload className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {field.value ? field.value.name : "Choose a .csv file"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {field.value
                            ? `${(field.value.size / 1024).toFixed(1)} KB`
                            : `UTF-8 CSV · max 2 MB · up to ${PRODUCT_CSV_MAX_ROWS} products`}
                        </span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          name={field.name}
                          onBlur={field.onBlur}
                          onChange={(e) => {
                            field.onChange(e.target.files?.[0] ?? null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </FormControl>
                    <FormDescription>
                      Required for new products: Title, Price, Category
                      {isVendor ? "" : ", Store"}. Category, Brand and Store accept a slug or name. On updates,
                      an empty cell clears optional fields (brand, descriptions, compare-at price…) — delete the
                      column to leave it unchanged. Images and variants aren&apos;t imported.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Import mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {IMPORT_MODES.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {IMPORT_MODE_LABELS[mode].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{IMPORT_MODE_LABELS[field.value].hint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : (
          <ImportSummary result={result} />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {!result ? (
            <>
              <Button type="button" variant="ghost" onClick={() => void downloadTemplate()} disabled={busy !== null}>
                {busy === "template" ? <Loader2 className="animate-spin" /> : <Download />}
                Download template
              </Button>
              <Button type="submit" form="product-import-form" disabled={busy !== null}>
                {busy === "preview" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                Preview import
              </Button>
            </>
          ) : done ? (
            <>
              <Button type="button" variant="ghost" onClick={reset}>
                Import another file
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)} disabled={busy !== null}>
                Back
              </Button>
              <Button type="button" onClick={() => void apply()} disabled={busy !== null || willWrite === 0}>
                {busy === "apply" ? <Loader2 className="animate-spin" /> : <Upload />}
                {willWrite === 0 ? "Nothing to import" : `Import ${willWrite} product${willWrite === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSummary({ result }: { result: ProductImportResult }) {
  const { summary } = result;
  const stats = [
    { key: "create", label: result.dry_run ? "Will create" : "Created", value: summary.create },
    { key: "update", label: result.dry_run ? "Will update" : "Updated", value: summary.update },
    { key: "skip", label: "Skipped", value: summary.skip },
    { key: "error", label: "Errors", value: summary.error },
  ] as const;
  const problemRows = result.rows.filter((r) => r.errors.length > 0 || r.warnings.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className="rounded-xl border border-border/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "text-xl font-semibold tabular-nums",
                s.key === "error" && s.value > 0 && "text-destructive",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {!result.dry_run && summary.error === 0 ? (
        <p className="flex items-center gap-2 text-sm text-brand-primary">
          <CheckCircle2 className="size-4" />
          {result.message}
        </p>
      ) : null}

      {result.ignored_columns.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Ignored columns: {result.ignored_columns.join(", ")}
        </p>
      ) : null}

      {problemRows.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" />
            Rows that need attention ({problemRows.length})
          </p>
          <ul className="max-h-64 divide-y divide-border/70 overflow-y-auto rounded-xl border border-border/80">
            {problemRows.map((r) => (
              <li key={r.row} className="space-y-1 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">Row {r.row}</span>
                  <Badge variant="outline" className={ACTION_META[r.action].className}>
                    {ACTION_META[r.action].label}
                  </Badge>
                  <span className="min-w-0 truncate font-medium">{r.title ?? r.handle ?? "Untitled"}</span>
                </div>
                {r.errors.map((m) => (
                  <p key={m} className="text-xs text-destructive">
                    {m}
                  </p>
                ))}
                {r.warnings.map((m) => (
                  <p key={m} className="text-xs text-amber-700 dark:text-amber-300">
                    {m}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Every row passed validation.</p>
      )}
    </div>
  );
}
