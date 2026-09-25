import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Pencil,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import {
  ApiError,
  apiFetch,
  type ManagedUser,
  type UserRole,
  type UserStatus,
  USER_ROLES,
  USER_STATUSES,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { PageHero } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-brand-primary/30 bg-brand-tint/60 text-brand-deep";
    case "pending":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "inactive":
      return "border-border bg-muted text-muted-foreground";
    case "suspended":
      return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "banned":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

function initials(user: ManagedUser) {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || user.role.slice(0, 2).toUpperCase();
}

export function UsersPage() {
  const token = useAuthStore((s) => s.token);
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const role = (searchParams.get("role") ?? "all") as UserRole | "all";
  const status = (searchParams.get("status") ?? "all") as UserStatus | "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (q.trim()) params.set("q", q.trim());
        if (role !== "all") params.set("role", role);
        if (status !== "all") params.set("status", status);

        const data = await apiFetch<{
          users: ManagedUser[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        }>(`/api/dashboard/users?${params.toString()}`, { token });

        if (cancelled) return;
        setUsers(data.users);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, q, role, status, page]);

  function updateFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || (key === "page" && value === "1")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (!("page" in next)) params.delete("page");
    setSearchParams(params);
  }

  const staffCount = users.filter((u) => u.role !== "customer").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Access control"
        title="Users"
        description="Manage staff and customer accounts — roles, profiles, and restrictions."
      />

      <Stagger className="grid gap-3 sm:grid-cols-3">
        <StaggerItem className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
            <Users className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Total matches</p>
            <p className="text-xl font-semibold tabular-nums">
              {loading ? "…" : total}
            </p>
          </div>
        </StaggerItem>
        <StaggerItem className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
            <Shield className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Staff on page</p>
            <p className="text-xl font-semibold tabular-nums">
              {loading ? "…" : staffCount}
            </p>
          </div>
        </StaggerItem>
        <StaggerItem className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
            <UserRound className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Page</p>
            <p className="text-xl font-semibold tabular-nums">
              {page} / {totalPages}
            </p>
          </div>
        </StaggerItem>
      </Stagger>

      <FadeIn>
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/70 bg-gradient-to-r from-brand-tint/40 via-background to-background px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
                <Users className="size-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  Directory
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Search and filter, then open a profile to edit
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_150px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateFilters({ q: searchDraft.trim() });
                    }
                  }}
                  placeholder="Search name, email, username, phone…"
                  className="pl-9"
                />
              </div>
              <Select
                value={role}
                onValueChange={(value) => updateFilters({ role: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {USER_ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => updateFilters({ status: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {USER_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateFilters({ q: searchDraft.trim() })}
              >
                Search
              </Button>
            </div>
          </div>

          <div className="p-5">
            {error ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                Loading users…
              </p>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center">
                <Users className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">No users found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different search or clear filters.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {users.map((user) => (
                  <li key={user.id}>
                    <Link
                      to={`/users/${user.id}`}
                      className="group flex h-full flex-col gap-3 rounded-2xl border border-border/80 bg-gradient-to-br from-background to-muted/20 p-4 transition-all hover:border-brand-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-tint text-sm font-semibold text-brand-deep ring-1 ring-brand-primary/15">
                          {user.avatar?.path ? (
                            <img
                              src={user.avatar.path}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            initials(user)
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          {user.username ? (
                            <p className="truncate text-[11px] text-muted-foreground">
                              @{user.username}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="capitalize">
                          {user.role.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            statusBadgeClass(user.status),
                          )}
                        >
                          {user.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-brand-primary">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Pencil className="size-3" />
                          Edit profile
                        </span>
                        <span className="text-muted-foreground">
                          {user.phone || "No phone"}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => updateFilters({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
