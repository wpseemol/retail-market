import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useFormContext, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ExternalLink, LayoutGrid, ListCollapse, Plus, RotateCcw, Search } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_PAGE_META, LIST_LIMITS, newItemId, type FaqLayout } from "@/lib/contentPages";
import { STOREFRONT_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { faqPageFormSchema, toPageFormValues, type PageFormValues } from "@/lib/validators/contentPage";

type FaqForm = PageFormValues<"faq">;

const LAYOUTS: { value: FaqLayout; label: string; hint: string; icon: typeof ListCollapse }[] = [
  { value: "accordion", label: "Accordion", hint: "Questions open one by one. Best for long lists.", icon: ListCollapse },
  { value: "grid", label: "Cards", hint: "Every answer visible in a two-column grid.", icon: LayoutGrid },
];

/** First category / question index that has a validation error, so its panel can be opened. */
function firstErrorLocation(errors: FieldErrors<FaqForm>) {
  const cats = errors.content?.categories;
  if (!cats || !Array.isArray(cats)) return null;
  for (let c = 0; c < cats.length; c++) {
    const cat = cats[c];
    if (!cat) continue;
    const items = Array.isArray(cat.items) ? cat.items : [];
    for (let i = 0; i < items.length; i++) if (items[i]) return { c, i };
    return { c, i: -1 };
  }
  return null;
}

export function FaqPageEditor() {
  const meta = CONTENT_PAGE_META.faq;
  const confirm = useConfirm();
  const { page, loadError, save, reset } = useContentPage("faq");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const form = useForm<FaqForm>({ resolver: zodResolver(faqPageFormSchema), mode: "onBlur" });
  const categories = useFieldArray({ control: form.control, name: "content.categories", keyName: "_key" });

  useEffect(() => {
    if (!page) return;
    form.reset(toPageFormValues(page));
    setOpen(new Set(page.content.categories[0] ? [page.content.categories[0].id] : []));
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

  async function onSubmit(values: FaqForm) {
    const result = await save(values);
    if (result.ok) report("success", "FAQ saved — the storefront refreshes within a few seconds.");
    else report("error", result.message);
  }

  function onInvalid(errors: FieldErrors<FaqForm>) {
    const loc = firstErrorLocation(errors);
    if (loc) {
      const cats = form.getValues("content.categories");
      toggle(cats[loc.c].id, true);
      if (loc.i >= 0) toggle(cats[loc.c].items[loc.i].id, true);
    }
    report("error", "Some fields need attention — they are highlighted below.");
  }

  async function onReset() {
    const ok = await confirm({
      title: "Reset the FAQ to the default content?",
      description:
        "All your categories, questions, layout and SEO settings for this page are deleted and replaced with the built-in starter FAQ. This cannot be undone.",
      confirmLabel: "Reset FAQ",
    });
    if (!ok) return;
    setResetting(true);
    const result = await reset();
    setResetting(false);
    report(result.ok ? "success" : "error", result.message);
  }

  async function removeCategory(index: number) {
    const cat = form.getValues(`content.categories.${index}`);
    const ok = await confirm({
      title: `Delete category “${cat.title || "Untitled"}”?`,
      description: `${cat.items.length} question${cat.items.length === 1 ? "" : "s"} inside it will be removed too. Nothing changes on the storefront until you save — use Discard to undo.`,
      confirmLabel: "Delete category",
    });
    if (ok) categories.remove(index);
  }

  function addCategory() {
    const id = newItemId("topic");
    categories.append({ id, title: "", description: "", enabled: true, items: [] });
    toggle(id, true);
  }

  const values = form.watch();
  const allCats = values.content?.categories ?? [];
  const stats = useMemo(() => {
    const questions = allCats.reduce((n, c) => n + (c.items?.length ?? 0), 0);
    const hidden = allCats.reduce(
      (n, c) => n + (c.enabled ? (c.items ?? []).filter((i) => !i.enabled).length : (c.items?.length ?? 0)),
      0,
    );
    return [
      { label: "Categories", value: allCats.length },
      { label: "Questions", value: questions },
      { label: "Hidden", value: hidden },
      { label: "Layout", value: values.content?.layout === "grid" ? "Cards" : "Accordion" },
    ];
  }, [allCats, values.content?.layout]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const { isSubmitting, isDirty } = form.formState;
  const q = filter.trim().toLowerCase();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <PageHero
        eyebrow="Content pages"
        title="FAQ page"
        description="Questions and answers shown at /faq. Group them into categories, reorder, hide or rewrite them and pick how the page looks."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={`${STOREFRONT_URL}${meta.path}`} target="_blank" rel="noreferrer">
                View /faq <ExternalLink className="size-3.5" />
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
              <HeroFields step="01" />

              <FormSection step="02" title="Layout & features" description="How visitors browse the questions.">
                <FormField
                  control={form.control}
                  name="content.layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout</FormLabel>
                      <div role="radiogroup" aria-label="Layout" className="grid gap-3 sm:grid-cols-2">
                        {LAYOUTS.map((opt) => {
                          const Icon = opt.icon;
                          const active = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                                active
                                  ? "border-brand-primary bg-brand-tint/50 ring-1 ring-brand-primary"
                                  : "border-border hover:border-brand-primary/50",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                  active ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground",
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold">{opt.label}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SwitchRow name="content.show_search" label="Search box" description="Instant search across all questions." />
                  <SwitchRow name="content.show_category_nav" label="Topic menu" description="Sticky list of categories to jump to." />
                  {values.content.layout === "accordion" ? (
                    <SwitchRow name="content.expand_first" label="Open the first answer" description="The first question starts expanded." />
                  ) : null}
                </div>
              </FormSection>

              <FormSection
                step="03"
                title="Questions"
                description={`Up to ${LIST_LIMITS.faqCategories} categories with ${LIST_LIMITS.faqItemsPerCategory} questions each. Hidden items stay saved but aren't shown.`}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Find a question to edit…"
                    className="pl-9"
                    aria-label="Filter questions"
                  />
                </div>
                {form.formState.errors.content?.categories?.root?.message || form.formState.errors.content?.categories?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.content?.categories?.root?.message ?? form.formState.errors.content?.categories?.message}
                  </p>
                ) : null}

                <div className="space-y-3">
                  {categories.fields.map((field, index) => (
                    <CategoryCard
                      key={field._key}
                      index={index}
                      count={categories.fields.length}
                      open={open}
                      toggle={toggle}
                      filter={q}
                      onMove={(to) => categories.move(index, to)}
                      onRemove={() => void removeCategory(index)}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  disabled={categories.fields.length >= LIST_LIMITS.faqCategories}
                  onClick={addCategory}
                >
                  <Plus className="size-4" /> Add category
                </Button>
              </FormSection>

              <HelpBoxFields step="04" />
              <PageSeoFields step="05" />

              <StickyFormActions
                message={
                  <FormStatusMessage
                    error={error}
                    success={success}
                    idle={isDirty ? "Unsaved FAQ changes." : "Saving refreshes /faq within a few seconds."}
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
                  {isSubmitting ? "Saving…" : "Save FAQ"}
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

function CategoryCard({
  index,
  count,
  open,
  toggle,
  filter,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  open: Set<string>;
  toggle: (id: string, force?: boolean) => void;
  filter: string;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const form = useFormContext<FaqForm>();
  const confirm = useConfirm();
  const items = useFieldArray({ control: form.control, name: `content.categories.${index}.items`, keyName: "_key" });
  const watched = form.watch(`content.categories.${index}`);
  const cat = { ...watched, title: watched?.title ?? "", items: watched?.items ?? [] };
  const catErrors = form.formState.errors.content?.categories?.[index];
  const isOpen = open.has(cat.id) || Boolean(filter);

  const matches = (item: { question: string; answer: string }) =>
    !filter ||
    (item.question ?? "").toLowerCase().includes(filter) ||
    (item.answer ?? "").toLowerCase().includes(filter);
  const visibleCount = cat.items.filter(matches).length;
  if (!watched) return null;
  if (filter && visibleCount === 0 && !cat.title.toLowerCase().includes(filter)) return null;

  async function removeItem(i: number) {
    const item = form.getValues(`content.categories.${index}.items.${i}`);
    const ok = await confirm({
      title: `Delete “${item.question || "this question"}”?`,
      description: "The question and its answer are removed from this category. Nothing changes on the storefront until you save.",
      confirmLabel: "Delete question",
    });
    if (ok) items.remove(i);
  }

  function addItem() {
    const id = newItemId("q");
    items.append({ id, question: "", answer: "", enabled: true });
    toggle(cat.id, true);
    toggle(id, true);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background",
        catErrors ? "border-destructive/50" : "border-border/80",
        !cat.enabled && "opacity-75",
      )}
    >
      <div className="flex items-center gap-2 bg-muted/30 px-3 py-2.5">
        <button
          type="button"
          onClick={() => toggle(cat.id)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} />
          <span className="truncate text-sm font-semibold">{cat.title || "Untitled category"}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {filter ? `${visibleCount}/${cat.items.length}` : cat.items.length}
          </span>
        </button>
        <RowActions
          index={index}
          count={count}
          enabled={cat.enabled}
          itemLabel="category"
          onMove={onMove}
          onToggle={(next) => form.setValue(`content.categories.${index}.enabled`, next, { shouldDirty: true })}
          onRemove={onRemove}
        />
      </div>

      {isOpen ? (
        <div className="space-y-4 border-t border-border/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`content.categories.${index}.title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category title</FormLabel>
                  <FormControl>
                    <Input placeholder="Orders" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`content.categories.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            {items.fields.map((itemField, i) => {
              const item = cat.items[i];
              if (!item || !matches(item)) return null;
              const itemOpen = open.has(item.id);
              const itemErrors = catErrors?.items?.[i];
              return (
                <div
                  key={itemField._key}
                  className={cn(
                    "rounded-lg border",
                    itemErrors ? "border-destructive/50" : "border-border/70",
                    !item.enabled && "bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={itemOpen}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="text-xs font-semibold text-brand-primary">Q{i + 1}</span>
                      <span className={cn("truncate text-sm", !item.question && "italic text-muted-foreground")}>
                        {item.question || "New question"}
                      </span>
                    </button>
                    <RowActions
                      index={i}
                      count={items.fields.length}
                      enabled={item.enabled}
                      itemLabel="question"
                      onMove={(to) => items.move(i, to)}
                      onToggle={(next) =>
                        form.setValue(`content.categories.${index}.items.${i}.enabled`, next, { shouldDirty: true })
                      }
                      onRemove={() => void removeItem(i)}
                    />
                  </div>
                  {itemOpen ? (
                    <div className="space-y-3 border-t border-border/60 p-3">
                      <FormField
                        control={form.control}
                        name={`content.categories.${index}.items.${i}.question`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                              <Input placeholder="How long does delivery take?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`content.categories.${index}.items.${i}.answer`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Answer</FormLabel>
                              <span className="text-[11px] tabular-nums text-muted-foreground">{(field.value ?? "").length}/3000</span>
                            </div>
                            <FormControl>
                              <Textarea rows={4} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {items.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                No questions yet — empty categories are not shown on the storefront.
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand-primary"
            disabled={items.fields.length >= LIST_LIMITS.faqItemsPerCategory}
            onClick={addItem}
          >
            <Plus className="size-3.5" /> Add question
          </Button>
        </div>
      ) : null}
    </div>
  );
}
