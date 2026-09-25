import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type Props = {
  token: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const BLOCK_LABELS: Record<string, string> = {
  welcome_modal: "Welcome modal",
  featured: "Featured USPs",
  deals_banner: "Deals banner cards",
  product_groups: "Product groups",
  promo_slider: "Promo slider",
  best_sellers: "Best sellers",
  latest_products: "Latest products",
  deals_of_day: "Deals of the day",
  laptop_repair: "Laptop repair banner",
  top_brands: "Top brands",
};

type BlocksResponse = {
  blocks: Record<string, unknown>;
  keys: string[];
};

export function HomeBlocksSettingsPanel({
  token,
  onError,
  onSuccess,
}: Props) {
  const [blocks, setBlocks] = useState<Record<string, unknown>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BlocksResponse>(
          "/api/dashboard/home-blocks",
          { token },
        );
        if (cancelled) return;
        setBlocks(data.blocks ?? {});
        setKeys(data.keys ?? Object.keys(data.blocks ?? {}));
      } catch (err) {
        if (!cancelled) {
          onError(
            err instanceof ApiError
              ? err.message
              : "Failed to load home blocks",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, onError]);

  function openBlock(key: string) {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    setDraft(JSON.stringify(blocks[key] ?? {}, null, 2));
  }

  async function saveBlock(key: string) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        onError("Content must be a JSON object");
        return;
      }
    } catch {
      onError("Invalid JSON — fix syntax before saving");
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch<{
        message?: string;
        content: unknown;
      }>(`/api/dashboard/home-blocks/${key}`, {
        method: "PATCH",
        token,
        body: { content: parsed },
      });
      setBlocks((prev) => ({ ...prev, [key]: data.content }));
      setDraft(JSON.stringify(data.content, null, 2));
      onSuccess(data.message ?? `${BLOCK_LABELS[key] ?? key} saved`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetBlock(key: string) {
    setSaving(true);
    try {
      const data = await apiFetch<{
        message?: string;
        content: unknown;
      }>(`/api/dashboard/home-blocks/${key}/reset`, {
        method: "POST",
        token,
      });
      setBlocks((prev) => ({ ...prev, [key]: data.content }));
      setDraft(JSON.stringify(data.content, null, 2));
      onSuccess(data.message ?? "Reset to defaults");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading home sections…</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Edit copy, images paths, and CTAs for each home section. Content is
        fetched server-side on the storefront (cached). Use JSON for structured
        fields — image paths can be{" "}
        <code className="text-[11px]">/images/…</code> or uploaded media URLs.
      </p>

      <ul className="space-y-2">
        {keys.map((key) => {
          const open = openKey === key;
          return (
            <li
              key={key}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <button
                type="button"
                onClick={() => openBlock(key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">
                    {BLOCK_LABELS[key] ?? key}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{key}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open ? (
                <div className="space-y-3 border-t border-border p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`block-${key}`}>Section content (JSON)</Label>
                    <Textarea
                      id={`block-${key}`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={16}
                      className="font-mono text-xs leading-relaxed"
                      spellCheck={false}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Save writes to the API immediately. Storefront refreshes
                      within ~60s (ISR cache).
                    </p>
                  </div>
                  <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/95 p-2 shadow-md backdrop-blur">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => void resetBlock(key)}
                    >
                      Reset defaults
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveBlock(key)}
                    >
                      {saving ? "Saving…" : "Save section"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tiny helper kept for possible future field UIs */
export function HomeBlockTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
