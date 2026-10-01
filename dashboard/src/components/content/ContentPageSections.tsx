import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { FormSection } from "@/components/dashboard/page-shell";
import { CharCounter, SearchPreview } from "@/components/seo/SeoPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SEO_LIMITS, STOREFRONT_URL, applyTitleTemplate } from "@/lib/seo";
import { getPrintBranding } from "@/lib/siteBranding";
import { cn } from "@/lib/utils";
import type { PageFormBase } from "@/lib/validators/contentPage";

/** Label + description on the left, switch on the right. */
export function SwitchRow({
  name,
  label,
  description,
  onChangeGuard,
}: {
  name: "content.show_search" | "content.show_category_nav" | "content.expand_first" | "content.show_toc" | "content.numbered" | "content.contact_cta.enabled";
  label: string;
  description: string;
  onChangeGuard?: (next: boolean) => Promise<boolean>;
}) {
  const form = useFormContext<PageFormBase>();
  return (
    <FormField
      control={form.control}
      name={name as "content.contact_cta.enabled"}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3.5">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={async (next) => {
                if (onChangeGuard && !(await onChangeGuard(next))) return;
                field.onChange(next);
              }}
              aria-label={label}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function HeroFields({ step, children }: { step: string; children?: ReactNode }) {
  const form = useFormContext<PageFormBase>();
  return (
    <FormSection step={step} title="Page header" description="The green banner at the top of the page.">
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <FormField
          control={form.control}
          name="content.hero.eyebrow"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eyebrow</FormLabel>
              <FormControl>
                <Input placeholder="Help centre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content.hero.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Shown as the H1 and in the breadcrumb.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="content.hero.subtitle"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Subtitle</FormLabel>
              <span className="text-[11px] tabular-nums text-muted-foreground">{(field.value ?? "").length}/300</span>
            </div>
            <FormControl>
              <Textarea rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {children}
    </FormSection>
  );
}

export function HelpBoxFields({ step }: { step: string }) {
  const form = useFormContext<PageFormBase>();
  const enabled = form.watch("content.contact_cta.enabled");
  return (
    <FormSection step={step} title="Help box" description="A call-to-action at the bottom of the page.">
      <SwitchRow name="content.contact_cta.enabled" label="Show the help box" description="e.g. “Still need help? Contact us”." />
      <div className={cn("space-y-4", !enabled && "pointer-events-none opacity-50")} aria-disabled={!enabled}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="content.contact_cta.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Still need help?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content.contact_cta.text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text</FormLabel>
                <FormControl>
                  <Input placeholder="Our team answers every day." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content.contact_cta.button_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Button label</FormLabel>
                <FormControl>
                  <Input placeholder="Contact us" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content.contact_cta.button_href"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Button link</FormLabel>
                <FormControl>
                  <Input placeholder="/contact" {...field} />
                </FormControl>
                <FormDescription>/path, https://…, mailto: or tel:</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </FormSection>
  );
}

export function PageSeoFields({ step }: { step: string }) {
  const form = useFormContext<PageFormBase>();
  const confirm = useConfirm();
  return (
    <FormSection step={step} title="Search engines" description="Optional — leave blank to use the page title and subtitle.">
      <FormField
        control={form.control}
        name="seo_title"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>SEO title</FormLabel>
              <CharCounter value={field.value} {...SEO_LIMITS.title} />
            </div>
            <FormControl>
              <Input placeholder={form.watch("content.hero.title")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="seo_description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Meta description</FormLabel>
              <CharCounter value={field.value} {...SEO_LIMITS.description} />
            </div>
            <FormControl>
              <Textarea rows={2} placeholder={form.watch("content.hero.subtitle")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="noindex"
        render={({ field }) => (
          <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3.5">
            <div className="space-y-0.5">
              <FormLabel>Hide this page from search engines</FormLabel>
              <FormDescription>Adds noindex and removes the page from sitemap.xml.</FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={async (next) => {
                  if (next) {
                    const ok = await confirm({
                      title: "Hide this page from Google?",
                      description: "Search engines will drop the page from results over the next few days. It stays visible to visitors.",
                      confirmLabel: "Hide from search",
                      tone: "warning",
                    });
                    if (!ok) return;
                  }
                  field.onChange(next);
                }}
                aria-label="Noindex"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </FormSection>
  );
}

/** Aside: publish switch, live link, search preview, formatting help. */
export function PageStatusAside({
  path,
  isDefault,
  updatedAt,
  stats,
}: {
  path: string;
  isDefault: boolean;
  updatedAt: string | null;
  stats: { label: string; value: number | string }[];
}) {
  const form = useFormContext<PageFormBase>();
  const confirm = useConfirm();
  const v = form.watch();
  const siteName = getPrintBranding().siteName || "Niyenin";

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Status</p>
          {isDefault ? (
            <Badge variant="outline" className="text-[11px]">
              Built-in default
            </Badge>
          ) : (
            <Badge variant="outline" className="border-brand-primary/30 bg-brand-tint/60 text-[11px] text-brand-deep">
              Customized
            </Badge>
          )}
        </div>
        <FormField
          control={form.control}
          name="is_published"
          render={({ field }) => (
            <FormItem className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
              <div>
                <FormLabel className="text-sm">{field.value ? "Published" : "Unpublished"}</FormLabel>
                <FormDescription className="text-xs">
                  {field.value ? "Visible on the storefront." : "Visitors get a 404."}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={async (next) => {
                    if (!next) {
                      const ok = await confirm({
                        title: "Unpublish this page?",
                        description:
                          "After you save, visitors and search engines get “page not found” and footer links to it will be broken until you publish again.",
                        confirmLabel: "Unpublish",
                        tone: "warning",
                      });
                      if (!ok) return;
                    }
                    field.onChange(next);
                  }}
                  aria-label="Published"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 px-3 py-2">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Not saved yet — showing the default text."}
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
          <a href={`${STOREFRONT_URL}${path}`} target="_blank" rel="noreferrer">
            View live page <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>

      <SearchPreview
        title={applyTitleTemplate(v.seo_title || v.content.hero.title, null, siteName)}
        description={v.seo_description || v.content.hero.subtitle}
        path={path}
        siteName={siteName}
        noIndex={v.noindex || !v.is_published}
      />

      <div className="rounded-2xl border border-border/80 bg-card p-4 text-xs text-muted-foreground shadow-sm">
        <p className="mb-2 text-sm font-semibold text-foreground">Formatting</p>
        <ul className="space-y-1.5">
          <li>Leave a blank line to start a new paragraph.</li>
          <li>
            Start a line with <code className="rounded bg-muted px-1">- </code> to make a bullet list.
          </li>
          <li>HTML and code are not allowed. Phrases like “select … from” on one line are blocked by the security filter — reword them.</li>
        </ul>
      </div>
    </aside>
  );
}

/** Up / down / hide / delete buttons for one row of a list editor. */
export function RowActions({
  index,
  count,
  enabled,
  onMove,
  onToggle,
  onRemove,
  itemLabel,
}: {
  index: number;
  count: number;
  enabled: boolean;
  onMove: (to: number) => void;
  onToggle: (next: boolean) => void;
  onRemove: () => void;
  itemLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {!enabled ? (
        <Badge variant="outline" className="mr-1 gap-1 text-[10px] text-muted-foreground">
          <EyeOff className="size-3" /> Hidden
        </Badge>
      ) : null}
      <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Show ${itemLabel}`} className="mr-1 scale-90" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        aria-label={`Move ${itemLabel} up`}
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        aria-label={`Move ${itemLabel} down`}
      >
        <ArrowDown className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:text-destructive"
        onClick={onRemove}
        aria-label={`Delete ${itemLabel}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
