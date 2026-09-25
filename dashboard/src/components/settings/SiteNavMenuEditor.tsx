import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, apiFetch } from "@/lib/api";
import {
  NAV_MENU_LABELS,
  siteNavItemFormSchema,
  type SiteNavItemDto,
  type SiteNavItemFormValues,
  type SiteNavMenu,
} from "@/lib/validators/siteChrome";
import type { SiteSettingsApiResponse } from "@/lib/validators/siteSettings";
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
import { cn } from "@/lib/utils";

type Props = {
  menu: SiteNavMenu;
  items: SiteNavItemDto[];
  token: string;
  onUpdated: (settings: SiteSettingsApiResponse["settings"]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function SiteNavMenuEditor({
  menu,
  items,
  token,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const form = useForm<SiteNavItemFormValues>({
    resolver: zodResolver(siteNavItemFormSchema),
    defaultValues: {
      label: "",
      href: "/",
      external: false,
      is_enabled: true,
    },
  });

  async function persistOrder(next: SiteNavItemDto[]) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings/nav/reorder",
        {
          method: "PUT",
          token,
          body: {
            menu,
            ordered_ids: next.map((i) => i.id),
          },
        },
      );
      onUpdated(data.settings);
      onSuccess("Menu order saved");
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
    const from = items.findIndex((i) => i.id === dragId);
    const to = items.findIndex((i) => i.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
  }

  async function onCreate(values: SiteNavItemFormValues) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings/nav",
        {
          method: "POST",
          token,
          body: { menu, ...values },
        },
      );
      onUpdated(data.settings);
      onSuccess("Menu item added");
      form.reset({
        label: "",
        href: "/",
        external: false,
        is_enabled: true,
      });
      setAdding(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(item: SiteNavItemDto) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        `/api/dashboard/site-settings/nav/${item.id}`,
        {
          method: "PATCH",
          token,
          body: { is_enabled: !item.is_enabled },
        },
      );
      onUpdated(data.settings);
      onSuccess(item.is_enabled ? "Item hidden" : "Item shown");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: SiteNavItemDto) {
    if (!window.confirm(`Delete “${item.label}”?`)) return;
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        `/api/dashboard/site-settings/nav/${item.id}`,
        { method: "DELETE", token },
      );
      onUpdated(data.settings);
      onSuccess("Menu item deleted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(item: SiteNavItemDto, patch: Partial<SiteNavItemDto>) {
    setBusy(true);
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        `/api/dashboard/site-settings/nav/${item.id}`,
        {
          method: "PATCH",
          token,
          body: {
            label: patch.label ?? item.label,
            href: patch.href ?? item.href,
            external: patch.external ?? item.external,
          },
        },
      );
      onUpdated(data.settings);
      onSuccess("Menu item saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{NAV_MENU_LABELS[menu]}</p>
          <p className="text-xs text-muted-foreground">
            Drag rows to change position. Order is saved immediately.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            draggable={!busy}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
            className={cn(
              "flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center",
              dragId === item.id && "opacity-60",
              !item.is_enabled && "opacity-50",
            )}
          >
            <button
              type="button"
              className="inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <Input
                defaultValue={item.label}
                disabled={busy}
                onBlur={(e) => {
                  const label = e.target.value.trim();
                  if (label && label !== item.label) {
                    void saveItem(item, { label });
                  }
                }}
              />
              <Input
                defaultValue={item.href}
                disabled={busy}
                onBlur={(e) => {
                  const href = e.target.value.trim();
                  if (href && href !== item.href) {
                    void saveItem(item, { href });
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void toggleEnabled(item)}
              >
                {item.is_enabled ? "Hide" : "Show"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onDelete(item)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {item.children?.length ? (
              <p className="w-full text-[11px] text-muted-foreground sm:basis-full">
                Children:{" "}
                {item.children.map((c) => c.label).join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {adding ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => void onCreate(v))}
            className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Shop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="href"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path / URL</FormLabel>
                  <FormControl>
                    <Input placeholder="/shop" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={busy}>
                Save item
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  );
}
