import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Loader2,
  Package,
  Trash2,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { DashboardNotification } from "@/components/dashboard/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleString();
}

function typeLabel(type: string) {
  if (type.startsWith("order.")) return "Order";
  if (type.startsWith("product.")) return "Product";
  if (type.startsWith("user.")) return "User";
  if (type.startsWith("shop.") || type.startsWith("store.")) return "Store";
  return type.replaceAll(".", " ") || "Update";
}

export function NotificationsPage() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        notifications: DashboardNotification[];
        unread_count: number;
      }>("/api/dashboard/notifications?limit=50", { token });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/dashboard/notifications/${id}/read`, {
        method: "PATCH",
        token,
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const removeOne = async (id: string, wasUnread: boolean) => {
    if (!token) return;
    try {
      await apiFetch(`/api/dashboard/notifications/${id}`, {
        method: "DELETE",
        token,
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await apiFetch("/api/dashboard/notifications/read-all", {
        method: "POST",
        token,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const openNotification = async (n: DashboardNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All inbox updates — orders, catalog, and anything else staff need
            to see.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="size-3.5" />
            Mark all read ({unreadCount})
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
            <Bell className="size-4" />
          </div>
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : unreadCount > 0
                ? `${notifications.length} total · ${unreadCount} unread`
                : `${notifications.length} notification(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New orders and other alerts will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group relative flex items-start gap-3 px-5 py-4",
                    !n.read && "bg-brand-tint/20",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 gap-3 text-left"
                    onClick={() => void openNotification(n)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        n.read
                          ? "bg-muted text-muted-foreground"
                          : "bg-brand-primary text-white",
                      )}
                    >
                      <Package className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {typeLabel(n.type)}
                        </Badge>
                        {!n.read ? (
                          <span className="size-1.5 rounded-full bg-brand-primary" />
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      <p
                        className={cn(
                          "mt-1 text-sm leading-snug",
                          !n.read && "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      ) : null}
                      {n.link ? (
                        <p className="mt-1.5 text-[11px] font-medium text-brand-primary">
                          Open linked page
                        </p>
                      ) : null}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                    aria-label="Remove notification"
                    onClick={() => void removeOne(n.id, !n.read)}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
