import { type FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { ApiError, apiFetch, type StaffUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
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
import { Badge } from "@/components/ui/badge";

function toStaffUser(user: StaffUser): StaffUser {
  return {
    id: String(user.id),
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username ?? null,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
  };
}

export function ProfilePage() {
  const { token, user, setUser } = useAuthStore();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setUsername(user.username ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const data = await apiFetch<{ message: string; user: StaffUser }>(
        "/api/dashboard/auth/me",
        {
          method: "PATCH",
          token,
          body: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim() || undefined,
            phone: phone.trim() || null,
          },
        },
      );
      setUser(toStaffUser(data.user));
      setProfileSuccess(data.message || "Profile updated");
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Failed to update profile",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("current_password") ?? "");
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    try {
      const data = await apiFetch<{ message: string }>(
        "/api/dashboard/auth/change-password",
        {
          method: "POST",
          token,
          body: {
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
        },
      );
      setPasswordSuccess(data.message || "Password updated");
      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Failed to change password",
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) return null;

  const roleLabel = user.role.replace("_", " ");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your account information and password.
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {roleLabel}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <UserRound className="size-4" />
          </div>
          <CardTitle>Account information</CardTitle>
          <CardDescription>
            Name, username, and phone. Email is read-only.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSaveProfile}>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+8801…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                readOnly
                autoComplete="email"
              />
            </div>
            {profileError ? (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {profileError}
              </p>
            ) : null}
            {profileSuccess ? (
              <p className="text-sm text-brand-primary sm:col-span-2" role="status">
                {profileSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <KeyRound className="size-4" />
          </div>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Use at least 8 characters for your new password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onChangePassword}>
          <CardContent className="grid max-w-md gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  name="current_password"
                  type={showCurrent ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={
                    showCurrent ? "Hide current password" : "Show current password"
                  }
                >
                  {showCurrent ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  name="new_password"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                >
                  {showNew ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={
                    showConfirm ? "Hide confirm password" : "Show confirm password"
                  }
                >
                  {showConfirm ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {passwordError ? (
              <p className="text-sm text-destructive" role="alert">
                {passwordError}
              </p>
            ) : null}
            {passwordSuccess ? (
              <p className="text-sm text-brand-primary" role="status">
                {passwordSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
