import type { CSSProperties } from "react";
import { SHOWCASE_SECTION_META, textOnAccent, isHexColor, type ShowcaseMedia } from "@/lib/showcase";
import type { ShowcaseFormValues } from "@/lib/validators/showcase";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  info: "bg-sky-600 text-white",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-400 text-zinc-900",
} as const;

/** Miniature of the storefront page so owners see layout / colour changes before saving. */
export function ShowcasePreview({
  name,
  kicker,
  values,
  logo,
  banner,
}: {
  name: string;
  kicker: string;
  values: ShowcaseFormValues;
  logo?: ShowcaseMedia;
  banner?: ShowcaseMedia;
}) {
  const accent = isHexColor(values.accent_color) ? values.accent_color : "#00B207";
  const onAccent = textOnAccent(accent);
  const style = { "--pv-accent": accent, "--pv-on-accent": onAccent } as CSSProperties;
  const s = values.showcase;
  const enabled = s.sections.filter((row) => row.enabled);

  const logoBox = (cls: string) => (
    <span className={cn("flex items-center justify-center overflow-hidden bg-white text-sm font-semibold text-zinc-900", cls)}>
      {logo?.path ? <img src={logo.path} alt="" className="size-full object-contain" /> : name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div style={style} className="overflow-hidden rounded-xl border border-border/80 bg-background text-left shadow-sm">
      <p className="border-b border-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Live preview
      </p>

      {s.announcement.enabled && s.announcement.text ? (
        <div
          className={cn(
            "truncate px-3 py-1.5 text-center text-[10px] font-medium",
            s.announcement.tone === "brand" ? "bg-(--pv-accent) text-(--pv-on-accent)" : TONE_CLASS[s.announcement.tone],
          )}
        >
          {s.announcement.text}
        </div>
      ) : null}

      {s.hero_style === "banner" ? (
        <div className="relative h-28 bg-linear-to-br from-zinc-800 to-(--pv-accent)">
          {banner?.path ? <img src={banner.path} alt="" className="absolute inset-0 size-full object-cover" /> : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-3 bottom-2.5 flex items-end gap-2 text-white">
            {logoBox("size-9 rounded-lg")}
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-widest text-white/70">{kicker}</p>
              <p className="truncate text-sm font-semibold">{name}</p>
              {values.tagline ? <p className="truncate text-[10px] text-white/85">{values.tagline}</p> : null}
            </div>
          </div>
        </div>
      ) : s.hero_style === "split" ? (
        <div className="grid grid-cols-2 items-center gap-2 bg-muted/40 p-3">
          <div className="min-w-0">
            {logoBox("size-7 rounded-md border border-border")}
            <p className="mt-1.5 truncate text-sm font-semibold">{name}</p>
            {values.tagline ? <p className="line-clamp-2 text-[10px] text-muted-foreground">{values.tagline}</p> : null}
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-linear-to-br from-zinc-700 to-(--pv-accent)">
            {banner?.path ? <img src={banner.path} alt="" className="absolute inset-0 size-full object-cover" /> : null}
          </div>
        </div>
      ) : (
        <div>
          <div className="h-1 bg-(--pv-accent)" />
          <div className="flex items-center gap-2 p-3">
            {logoBox("size-8 rounded-full border border-border")}
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-widest text-(--pv-accent)">{kicker}</p>
              <p className="truncate text-sm font-semibold">{name}</p>
            </div>
          </div>
        </div>
      )}

      <ol className="space-y-1.5 p-3">
        {enabled.map((row, i) => (
          <li key={row.key} className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-[11px]">
            <span className="h-3 w-0.5 rounded-full bg-(--pv-accent)" />
            <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
            <span className="font-medium">{SHOWCASE_SECTION_META[row.key].label}</span>
            {row.key === "products" ? (
              <span className="ml-auto rounded-full bg-(--pv-accent) px-1.5 py-px text-[9px] text-(--pv-on-accent)">Sort</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
