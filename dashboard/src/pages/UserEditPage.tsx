import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Ban,
  KeyRound,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  ApiError,
  apiFetch,
  type ManagedUser,
  type UserRole,
  USER_ROLES,
  RESTRICT_STATUSES,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import {
  FormPageHeader,
  FormSection,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "active") {
    return "border-brand-primary/30 bg-brand-tint/60 text-brand-deep";
  }
  if (status === "banned" || status === "suspended") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "";
}

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.user);

  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("customer");

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [restrictStatus, setRestrictStatus] = useState<
    "inactive" | "suspended" | "banned"
  >("suspended");
  const [restrictReason, setRestrictReason] = useState("");
  const [restrictError, setRestrictError] = useState<string | null>(null);
  const [restrictSuccess, setRestrictSuccess] = useState<string | null>(null);
  const [restricting, setRestricting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ user: ManagedUser }>(
          `/api/dashboard/users/${id}`,
          { token },
        );
        if (cancelled) return;
        applyUser(data.user);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  function applyUser(next: ManagedUser) {
    setUser(next);
    setFirstName(next.first_name);
    setLastName(next.last_name);
    setUsername(next.username ?? "");
    setEmail(next.email);
    setPhone(next.phone ?? "");
    setRole(next.role);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const data = await apiFetch<{ message: string; user: ManagedUser }>(
        `/api/dashboard/users/${id}`,
        {
          method: "PATCH",
          token,
          body: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim() || undefined,
            email: email.trim(),
            phone: phone.trim() || null,
            role,
          },
        },
      );
      applyUser(data.user);
      setSaveSuccess(data.message || "User updated");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRestrict() {
    if (!token || !id) return;
    setRestricting(true);
    setRestrictError(null);
    setRestrictSuccess(null);

    try {
      const data = await apiFetch<{ message: string; user: ManagedUser }>(
        `/api/dashboard/users/${id}/restrict`,
        {
          method: "POST",
          token,
          body: {
            status: restrictStatus,
            reason: restrictReason.trim() || undefined,
          },
        },
      );
      applyUser(data.user);
      setRestrictSuccess(data.message);
      setRestrictReason("");
    } catch (err) {
      setRestrictError(
        err instanceof ApiError ? err.message : "Restriction failed",
      );
    } finally {
      setRestricting(false);
    }
  }

  async function onUnblock() {
    if (!token || !id) return;
    setRestricting(true);
    setRestrictError(null);
    setRestrictSuccess(null);

    try {
      const data = await apiFetch<{ message: string; user: ManagedUser }>(
        `/api/dashboard/users/${id}/unblock`,
        { method: "POST", token },
      );
      applyUser(data.user);
      setRestrictSuccess(data.message);
    } catch (err) {
      setRestrictError(
        err instanceof ApiError ? err.message : "Unblock failed",
      );
    } finally {
      setRestricting(false);
    }
  }

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Loading user…
      </p>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <FormPageHeader
          backTo="/users"
          backLabel="Users"
          title="User not found"
          subtitle="This account may have been removed or you do not have access."
        />
        <p className="text-sm text-destructive" role="alert">
          {error ?? "User not found"}
        </p>
      </div>
    );
  }

  const isSelf = me?.id === user.id;
  const isOtherSuperAdmin = user.role === "super_admin" && !isSelf;
  const isRestricted = user.status !== "active" && user.status !== "pending";
  const displayName = `${user.first_name} ${user.last_name}`.trim();
  const initial =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
    user.role.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <FormPageHeader
        backTo="/users"
        backLabel="Users"
        title={displayName}
        subtitle={user.email}
        badge={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {user.role.replace("_", " ")}
            </Badge>
            <Badge
              variant="outline"
              className={cn("capitalize", statusTone(user.status))}
            >
              {user.status}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={onSave} className="space-y-5" noValidate>
          <FormSection
            step="01"
            title="Profile details"
            description="Name, contact, and login identifiers for this account."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            step="02"
            title="Role & access"
            description="Permission level for the dashboard and storefront."
          >
            <div className="space-y-2">
              <Label>Permission / role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={
                  isOtherSuperAdmin || (isSelf && role === "super_admin")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((item) => (
                    <SelectItem
                      key={item}
                      value={item}
                      disabled={isSelf && item !== "super_admin"}
                    >
                      <span className="capitalize">
                        {item.replace("_", " ")}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Super admin, admin, moderator, vendor, or customer.
              </p>
            </div>
          </FormSection>

          <StickyFormActions
            message={
              saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError}
                </p>
              ) : saveSuccess ? (
                <p className="text-brand-primary" role="status">
                  {saveSuccess}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Save profile and role changes for this user.
                </p>
              )
            }
          >
            <Button asChild type="button" variant="outline">
              <Link to="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || isOtherSuperAdmin}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </StickyFormActions>

          <FormSection
            step="03"
            title="Restriction"
            description="Block access when needed. Banned also revokes sessions."
            tone="danger"
          >
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm">
              Current status:{" "}
              <span className="font-medium capitalize">{user.status}</span>
            </div>

            {isSelf || isOtherSuperAdmin ? (
              <p className="text-sm text-muted-foreground">
                {isSelf
                  ? "You cannot restrict your own account."
                  : "Another super admin cannot be restricted here."}
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Restriction type</Label>
                    <Select
                      value={restrictStatus}
                      onValueChange={(value) =>
                        setRestrictStatus(
                          value as "inactive" | "suspended" | "banned",
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESTRICT_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item === "banned"
                              ? "Banned (complete block)"
                              : item === "suspended"
                                ? "Suspended"
                                : "Inactive"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Input
                      id="reason"
                      value={restrictReason}
                      onChange={(e) => setRestrictReason(e.target.value)}
                      placeholder="Policy violation, fraud…"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={restricting}
                    onClick={() => void onRestrict()}
                  >
                    <Ban className="size-3.5" />
                    {restrictStatus === "banned"
                      ? "Block completely"
                      : "Apply restriction"}
                  </Button>
                  {isRestricted ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={restricting}
                      onClick={() => void onUnblock()}
                    >
                      <KeyRound className="size-3.5" />
                      Unblock / set active
                    </Button>
                  ) : null}
                </div>
              </>
            )}

            {restrictError ? (
              <p className="text-sm text-destructive" role="alert">
                {restrictError}
              </p>
            ) : null}
            {restrictSuccess ? (
              <p className="text-sm text-brand-primary" role="status">
                {restrictSuccess}
              </p>
            ) : null}

            <ul className="space-y-1.5 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
              <li>
                <strong className="text-foreground">Inactive</strong> — account
                disabled
              </li>
              <li>
                <strong className="text-foreground">Suspended</strong> —
                temporary restriction
              </li>
              <li>
                <strong className="text-foreground">Banned</strong> — complete
                block + session revoke
              </li>
            </ul>
          </FormSection>
        </form>

        <FadeUp>
          <aside className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm lg:sticky lg:top-4">
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary px-5 pb-10 pt-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/10 blur-2xl" />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Profile preview
              </p>
              <div className="relative mt-5 flex items-end gap-3">
                <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-xl font-semibold shadow-lg backdrop-blur-sm">
                  {user.avatar?.path ? (
                    <img
                      src={user.avatar.path}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </span>
                <div className="min-w-0 pb-0.5">
                  <p className="truncate text-lg font-semibold tracking-tight">
                    {firstName.trim() || lastName.trim()
                      ? `${firstName} ${lastName}`.trim()
                      : displayName}
                  </p>
                  <p className="truncate text-sm text-white/70">
                    {email.trim() || user.email}
                  </p>
                </div>
              </div>
            </div>
            <Stagger className="-mt-5 space-y-2 px-5 pb-5">
              <StaggerItem className="rounded-xl border border-border bg-background p-3 text-xs shadow-sm">
                <p className="text-muted-foreground">Role</p>
                <p className="mt-0.5 font-medium capitalize">
                  {role.replace("_", " ")}
                </p>
              </StaggerItem>
              <StaggerItem className="rounded-xl border border-border bg-background p-3 text-xs shadow-sm">
                <p className="text-muted-foreground">Username</p>
                <p className="mt-0.5 font-medium">
                  {username.trim() ? `@${username.trim()}` : "—"}
                </p>
              </StaggerItem>
              <StaggerItem className="rounded-xl border border-border bg-background p-3 text-xs shadow-sm">
                <p className="text-muted-foreground">Phone</p>
                <p className="mt-0.5 font-medium">{phone.trim() || "—"}</p>
              </StaggerItem>
              <StaggerItem className="flex items-start gap-2 rounded-xl border border-brand-primary/15 bg-brand-tint/40 px-3 py-2.5 text-xs text-brand-deep">
                {user.status === "active" ? (
                  <UserRound className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                )}
                <p>
                  Live status stays{" "}
                  <span className="font-semibold capitalize">{user.status}</span>
                  until you save or apply a restriction.
                </p>
              </StaggerItem>
            </Stagger>
          </aside>
        </FadeUp>
      </div>
    </div>
  );
}
