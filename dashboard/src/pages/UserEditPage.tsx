import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
    return <p className="text-sm text-muted-foreground">Loading user…</p>;
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/users">
            <ArrowLeft />
            Back to users
          </Link>
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {error ?? "User not found"}
        </p>
      </div>
    );
  }

  const isSelf = me?.id === user.id;
  const isOtherSuperAdmin = user.role === "super_admin" && !isSelf;
  const isRestricted = user.status !== "active" && user.status !== "pending";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/users">
              <ArrowLeft />
              Users
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.first_name} {user.last_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">
            {user.role.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {user.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <UserRound className="size-4" />
          </div>
          <CardTitle>User information</CardTitle>
          <CardDescription>
            Edit profile details and account permission (role).
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Permission / role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={isOtherSuperAdmin || (isSelf && role === "super_admin")}
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
                      <span className="capitalize">{item.replace("_", " ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Change between super admin, admin, moderator, vendor, or
                customer.
              </p>
            </div>
            {saveError ? (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p
                className="text-sm text-brand-primary sm:col-span-2"
                role="status"
              >
                {saveSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving || isOtherSuperAdmin}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <ShieldAlert className="size-4" />
          </div>
          <CardTitle>Restriction</CardTitle>
          <CardDescription>
            Block customers or staff. Suspended/inactive restrict access;
            banned is a complete block and revokes active sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
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
                  <Ban />
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
                    <KeyRound />
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

          <Separator />
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <strong className="text-foreground">Inactive</strong> — account
              disabled
            </li>
            <li>
              <strong className="text-foreground">Suspended</strong> — temporary
              restriction
            </li>
            <li>
              <strong className="text-foreground">Banned</strong> — complete block
              + session revoke
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
