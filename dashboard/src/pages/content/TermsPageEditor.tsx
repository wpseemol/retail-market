import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink, Plus, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import {
  HelpBoxFields,
  HeroFields,
  PageSeoFields,
  PageStatusAside,
  RowActions,
  SwitchRow,
} from "@/components/content/ContentPageSections";
import { useContentPage } from "@/components/content/useContentPage";
import { FormSection, FormStatusMessage, PageHero, StickyFormActions } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_PAGE_META, LIST_LIMITS, newItemId } from "@/lib/contentPages";
import { STOREFRONT_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { termsPageFormSchema, toPageFormValues, type PageFormValues } from "@/lib/validators/contentPage";

type TermsForm = PageFormValues<"terms">;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TermsPageEditor() {
  const meta = CONTENT_PAGE_META.terms;
  const confirm = useConfirm();
  const { page, loadError, save, reset } = useContentPage("terms");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const form = useForm<TermsForm>({ resolver: zodResolver(termsPageFormSchema), mode: "onBlur" });
  const sections = useFieldArray({ control: form.control, name: "content.sections", keyName: "_key" });

  useEffect(() => {
    if (!page) return;
    form.reset(toPageFormValues(page));
    setOpen(new Set());
    setHydrated(true);
  }, [page, form]);

  const toggle = (id: string, force?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (force ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  function report(kind: "error" | "success", message: string) {
    setError(kind === "error" ? message : null);
    setSuccess(kind === "success" ? message : null);
  }

  async function onSubmit(values: TermsForm) {
    const result = await save(values);
    if (result.ok) report("success", "Terms saved — the storefront refreshes within a few seconds.");
    else report("error", result.message);
  }

  function onInvalid(errors: FieldErrors<TermsForm>) {
    const list = errors.content?.sections;
    if (Array.isArray(list)) {
      const all = form.getValues("content.sections");
      list.forEach((e, i) => {
        if (e && all[i]) toggle(all[i].id, true);
      });
    }
    report("error", "Some fields need attention — they are highlighted below.");
  }

  async function onReset() {
    const ok = await confirm({
      title: "Reset the terms to the default text?",
      description:
        "Every section, the introduction, effective date and SEO settings for this page are deleted and replaced with the built-in template. This cannot be undone.",
      confirmLabel: "Reset terms",
    });
    if (!ok) return;
    setResetting(true);
    const result = await reset();
    setResetting(false);
    report(result.ok ? "success" : "error", result.message);
  }

  async function removeSection(index: number) {
    const section = form.getValues(`content.sections.${index}`);
    const ok = await confirm({
      title: `Delete section “${section.title || "Untitled"}”?`,
      description: "The section and its text are removed. Nothing changes on the storefront until you save — use Discard to undo.",
      confirmLabel: "Delete section",
    });
    if (ok) sections.remove(index);
  }

  function addSection() {
    const id = newItemId("section");
    sections.append({ id, title: "", body: "", enabled: true });
    toggle(id, true);
  }

  const values = form.watch();
  const list = values.content?.sections ?? [];
  const stats = useMemo(() => {
    const words = list.reduce((n, s) => n + (s.body ?? "").split(/\s+/).filter(Boolean).length, 0);
    return [
      { label: "Sections", value: list.length },
      { label: "Hidden", value: list.filter((s) => !s.enabled).length },
      { label: "Words", value: words.toLocaleString() },
      { label: "Read time", value: `${Math.max(1, Math.round(words / 200))} min` },
    ];
  }, [list]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const { isSubmitting, isDirty } = form.formState;
  const allOpen = list.length > 0 && list.every((s) => open.has(s.id));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <PageHero
        eyebrow="Content pages"
        title="Terms & conditions"
        description="The legal terms shown at /terms. Edit, reorder or hide sections and set the effective date customers see."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={`${STOREFRONT_URL}${meta.path}`} target="_blank" rel="noreferrer">
                View /terms <ExternalLink className="size-3.5" />
              </a>
            </Button>
            {page && !page.is_default ? (
              <Button type="button" variant="secondary" size="sm" disabled={resetting} onClick={() => void onReset()}>
                <RotateCcw className="size-3.5" />
                {resetting ? "Resetting…" : "Reset to default"}
              </Button>
            ) : null}
          </>
        }
      />

      {!page || !hydrated || !values.content?.hero ? (
        <div className="h-96 animate-pulse rounded-2xl bg-muted/60" />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
            noValidate
          >
            <div className="min-w-0 space-y-5">
              <HeroFields step="01">
                <FormField
                  control={form.control}
                  name="content.effective_date"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Effective date</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={() => form.setValue("content.effective_date", today(), { shouldDirty: true })}
                        >
                          Today
                        </Button>
                      </div>
                      <FormDescription>Shown in the header. Update it whenever the terms change.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content.intro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Introduction</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="By using this website you agree to…" {...field} />
                      </FormControl>
                      <FormDescription>Highlighted box above the first section. Optional.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </HeroFields>

              <FormSection step="02" title="Display" description="Reading aids on the storefront page.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SwitchRow name="content.show_toc" label="Table of contents" description="Sticky “On this page” list with jump links." />
                  <SwitchRow name="content.numbered" label="Number the sections" description="1, 2, 3… before each heading." />
                </div>
              </FormSection>

              <FormSection
                step="03"
                title="Sections"
                description={`Up to ${LIST_LIMITS.termsSections} sections. Hidden sections stay saved but aren't shown.`}
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(allOpen ? new Set() : new Set(list.map((s) => s.id)))}
                  >
                    {allOpen ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
                    {allOpen ? "Collapse all" : "Expand all"}
                  </Button>
                </div>
                {form.formState.errors.content?.sections?.root?.message || form.formState.errors.content?.sections?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.content?.sections?.root?.message ?? form.formState.errors.content?.sections?.message}
                  </p>
                ) : null}
                <ol className="space-y-2">
                  {sections.fields.map((field, index) => {
                    const section = list[index];
                    if (!section) return null;
                    const isOpen = open.has(section.id);
                    const hasError = Boolean(form.formState.errors.content?.sections?.[index]);
                    return (
                      <li
                        key={field._key}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-background",
                          hasError ? "border-destructive/50" : "border-border/80",
                          !section.enabled && "opacity-75",
                        )}
                      >
                        <div className="flex items-center gap-2 bg-muted/30 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => toggle(section.id)}
                            aria-expanded={isOpen}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <ChevronDown
                              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")}
                            />
                            {values.content.numbered ? (
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-primary text-[11px] font-bold text-white tabular-nums">
                                {index + 1}
                              </span>
                            ) : null}
                            <span className={cn("truncate text-sm font-semibold", !section.title && "italic text-muted-foreground")}>
                              {section.title || "New section"}
                            </span>
                          </button>
                          <RowActions
                            index={index}
                            count={sections.fields.length}
                            enabled={section.enabled}
                            itemLabel="section"
                            onMove={(to) => sections.move(index, to)}
                            onToggle={(next) => form.setValue(`content.sections.${index}.enabled`, next, { shouldDirty: true })}
                            onRemove={() => void removeSection(index)}
                          />
                        </div>
                        {isOpen ? (
                          <div className="space-y-3 border-t border-border/60 p-4">
                            <FormField
                              control={form.control}
                              name={`content.sections.${index}.title`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Heading</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Returns & refunds" {...f} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`content.sections.${index}.body`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Text</FormLabel>
                                    <span className="text-[11px] tabular-nums text-muted-foreground">
                                      {(f.value ?? "").length.toLocaleString()}/10,000
                                    </span>
                                  </div>
                                  <FormControl>
                                    <Textarea rows={8} className="leading-relaxed" {...f} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  disabled={sections.fields.length >= LIST_LIMITS.termsSections}
                  onClick={addSection}
                >
                  <Plus className="size-4" /> Add section
                </Button>
              </FormSection>

              <HelpBoxFields step="04" />
              <PageSeoFields step="05" />

              <StickyFormActions
                message={
                  <FormStatusMessage
                    error={error}
                    success={success}
                    idle={isDirty ? "Unsaved changes to the terms." : "Saving refreshes /terms within a few seconds."}
                  />
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty || isSubmitting}
                  onClick={() => form.reset(toPageFormValues(page))}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save terms"}
                </Button>
              </StickyFormActions>
            </div>

            <PageStatusAside path={meta.path} isDefault={page.is_default} updatedAt={page.updated_at} stats={stats} />
          </form>
        </Form>
      )}
    </div>
  );
}
