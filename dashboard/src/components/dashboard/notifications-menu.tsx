import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, Package, Trash2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DashboardNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsMenu() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ unread_count: number }>(
        "/api/dashboard/notifications/unread-count",
        { token },
      );
      setUnreadCount(data.unread_count);
    } catch {
      /* ignore polling errors */
    }
  }, [token]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<{
        notifications: DashboardNotification[];
        unread_count: number;
      }>("/api/dashboard/notifications?limit=20", { token });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), 30_000);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

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
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <Badge
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white hover:bg-brand-primary"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[min(100vw-1.5rem,22rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
            {unreadCount > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                · {unreadCount} new
              </span>
            ) : null}
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void markAllRead()}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[min(70vh,22rem)] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New alerts of any type will show up here.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group relative border-b border-border/60 last:border-b-0",
                    !n.read && "bg-brand-tint/25",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
                    onClick={() => void openNotification(n)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        n.read
                          ? "bg-muted text-muted-foreground"
                          : "bg-brand-primary text-white",
                      )}
                    >
                      <Package className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm leading-snug",
                            !n.read && "font-semibold",
                          )}
                        >
                          {n.title}
                        </span>
                        {!n.read ? (
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-primary" />
                        ) : null}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{timeAgo(n.created_at)}</span>
                        {n.link ? (
                          <span className="text-brand-primary">View order</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeOne(n.id, !n.read);
                    }}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-center text-xs"
            onClick={() => setOpen(false)}
          >
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
