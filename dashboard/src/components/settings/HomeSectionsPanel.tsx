import { useState } from "react";
import { GripVertical } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { HomeSectionDto } from "@/lib/validators/siteChrome";
import type { SiteSettingsApiResponse } from "@/lib/validators/siteSettings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  sections: HomeSectionDto[];
  onUpdated: (settings: SiteSettingsApiResponse["settings"]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function HomeSectionsPanel({
  token,
  sections,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persistOrder(next: HomeSectionDto[]) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings/home-sections/reorder",
        {
          method: "PUT",
          token,
          body: { ordered_ids: next.map((s) => s.id) },
        },
      );
      onUpdated(data.settings);
      onSuccess("Home section order saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reorder failed");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = sections.findIndex((s) => s.id === dragId);
    const to = sections.findIndex((s) => s.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
  }

  async function toggle(section: HomeSectionDto) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        `/api/dashboard/site-settings/home-sections/${section.id}`,
        {
          method: "PATCH",
          token,
          body: { is_enabled: !section.is_enabled },
        },
      );
      onUpdated(data.settings);
      onSuccess(
        section.is_enabled
          ? `${section.label} hidden`
          : `${section.label} shown`,
      );
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag to reorder home page sections. Each block maps to a separate
        frontend component. Disabled sections are skipped on the storefront.
      </p>
      <ul className="space-y-2">
        {sections.map((section, index) => (
          <li
            key={section.id}
            draggable={!busy}
            onDragStart={() => setDragId(section.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(section.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-background p-3",
              dragId === section.id && "opacity-60",
              !section.is_enabled && "opacity-50",
            )}
          >
            <button
              type="button"
              className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{section.label}</p>
              <p className="text-[11px] text-muted-foreground">{section.key}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void toggle(section)}
            >
              {section.is_enabled ? "Enabled" : "Disabled"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
