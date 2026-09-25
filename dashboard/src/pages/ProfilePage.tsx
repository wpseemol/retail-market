import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Upload, UserRound } from "lucide-react";
import { ApiError, apiFetch, apiUpload, type StaffUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  passwordFormSchema,
  profileFormSchema,
  validateProfileImageFile,
  type PasswordFormValues,
  type ProfileFormValues,
} from "@/lib/validators/profile";
import {
  AVATAR_PRESET_IDS,
  AvatarPresetSvg,
  isAvatarPresetId,
} from "@/lib/avatarPresets";
import { FadeUp, Stagger, StaggerItem } from "@/components/motion";
import {
  FormSection,
  PageHero,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

function toStaffUser(raw: Record<string, unknown>): StaffUser {
  return {
    id: String(raw.id ?? ""),
    first_name: String(raw.first_name ?? ""),
    last_name: String(raw.last_name ?? ""),
    username: (raw.username as string | null | undefined) ?? null,
    email: String(raw.email ?? ""),
    phone: (raw.phone as string | null | undefined) ?? null,
    role: raw.role as StaffUser["role"],
    status: String(raw.status ?? ""),
    avatar_id: (raw.avatar_id as string | null | undefined) ?? null,
    avatar_preset: (raw.avatar_preset as string | null | undefined) ?? null,
    avatar: raw.avatar as StaffUser["avatar"],
  };
}

function userInitials(user: StaffUser) {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || user.role.slice(0, 2).toUpperCase();
}

function AvatarPreview({
  user,
  size = "lg",
}: {
  user: StaffUser;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "size-20" : "size-10";

  if (user.avatar?.path) {
    return (
      <img
        src={user.avatar.path}
        alt="Profile photo"
        className={`${dim} rounded-2xl object-cover ring-2 ring-brand-primary/20`}
      />
    );
  }

  if (user.avatar_preset && isAvatarPresetId(user.avatar_preset)) {
    return (
      <AvatarPresetSvg
        id={user.avatar_preset}
        className={`${dim} rounded-2xl`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-2xl bg-brand-tint font-semibold text-brand-deep ${
        size === "lg" ? "text-2xl" : "text-sm"
      }`}
    >
      {userInitials(user)}
    </div>
  );
}

function PhotoSection({
  user,
  onUserUpdate,
}: {
  user: StaffUser;
  onUserUpdate: (u: StaffUser) => void;
}) {
  const { token } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [presetSaving, setPresetSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(file: File | null) {
    if (!token || !file) return;
    const checked = validateProfileImageFile(file);
    if (!checked.ok) {
      setError(checked.message);
      setSuccess(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const data = await apiUpload<{ user: Record<string, unknown> }>(
        "/api/dashboard/auth/me/avatar",
        fd,
        { token },
      );
      onUserUpdate(toStaffUser(data.user));
      setSuccess("Photo updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handlePresetSelect(id: string) {
    if (!token) return;
    setPresetSaving(id);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ user: Record<string, unknown> }>(
        "/api/dashboard/auth/me",
        { method: "PATCH", token, body: { avatar_preset: id } },
      );
      onUserUpdate(toStaffUser(data.user));
      setSuccess("Avatar updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set avatar");
    } finally {
      setPresetSaving(null);
    }
  }

  const activePreset = user.avatar_preset ?? null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-muted/40 via-background to-brand-tint/20 p-4">
        <div className="flex flex-wrap items-center gap-5">
          <AvatarPreview user={user} size="lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium">Profile photo</p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF · max 5 MB · always resized on the
                server
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) =>
                void handleFileChange(e.target.files?.[0] ?? null)
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Or choose a built-in avatar
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {AVATAR_PRESET_IDS.map((id) => {
            const isSelected = !user.avatar?.path && activePreset === id;
            const isSaving = presetSaving === id;
            return (
              <button
                key={id}
                type="button"
                title={id}
                disabled={!!presetSaving}
                onClick={() => void handlePresetSelect(id)}
                className={`relative flex size-10 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:opacity-60 ${
                  isSelected
                    ? "ring-2 ring-brand-primary ring-offset-2"
                    : "ring-1 ring-border/60 hover:ring-brand-primary/40 hover:ring-offset-1"
                }`}
              >
                <AvatarPresetSvg id={id} className="size-10 rounded-full" />
                {isSaving ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                    <span className="size-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-brand-primary" role="status">
          {success}
        </p>
      ) : null}
    </>
  );
}

function AccountDetailsSection({
  user,
  onUserUpdate,
}: {
  user: StaffUser;
  onUserUpdate: (u: StaffUser) => void;
}) {
  const { token } = useAuthStore();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username ?? "",
      phone: user.phone ?? "",
    },
    mode: "onBlur",
  });

  async function onSubmit(values: ProfileFormValues) {
    if (!token) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const data = await apiFetch<{
        message: string;
        user: Record<string, unknown>;
      }>("/api/dashboard/auth/me", {
        method: "PATCH",
        token,
        body: {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          username: (values.username ?? "").trim() || undefined,
          phone: (values.phone ?? "").trim() || null,
        },
      });
      onUserUpdate(toStaffUser(data.user));
      setSaveSuccess(data.message || "Profile updated");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to update profile",
      );
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="given-name"
                    placeholder="Jane"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="family-name"
                    placeholder="Smith"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    placeholder="janesmith"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Optional. Max 50 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="tel"
                    placeholder="+8801…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Optional.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium leading-none">Email</p>
            <Input
              value={user.email}
              disabled
              readOnly
              autoComplete="email"
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email address is read-only.
            </p>
          </div>
        </div>

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
                Validated with Zod · injection-safe strings
              </p>
            )
          }
        >
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </StickyFormActions>
      </form>
    </Form>
  );
}

function PasswordSection() {
  const { token } = useAuthStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
    mode: "onBlur",
  });

  async function onSubmit(values: PasswordFormValues) {
    if (!token) return;
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const data = await apiFetch<{ message: string }>(
        "/api/dashboard/auth/change-password",
        {
          method: "POST",
          token,
          body: {
            current_password: values.current_password,
            new_password: values.new_password,
            confirm_password: values.confirm_password,
          },
        },
      );
      setSaveSuccess(data.message || "Password updated");
      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to change password",
      );
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="max-w-sm space-y-4">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-11"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label={
                        showCurrent
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >
                      {showCurrent ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={
                        showNew ? "Hide new password" : "Show new password"
                      }
                    >
                      {showNew ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>Minimum 8 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className="pr-11"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                You will stay logged in after changing your password.
              </p>
            )
          }
        >
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </StickyFormActions>
      </form>
    </Form>
  );
}

function ProfileLivePreview({ user }: { user: StaffUser }) {
  return (
    <FadeUp>
      <aside className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm lg:sticky lg:top-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-[#0a4a10] to-brand-primary px-5 pb-10 pt-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/10 blur-2xl" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Your profile
          </p>
          <div className="relative mt-5 flex items-end gap-3">
            <div className="overflow-hidden rounded-2xl border border-white/20 shadow-lg">
              <AvatarPreview user={user} size="lg" />
            </div>
            <div className="min-w-0 pb-0.5">
              <p className="truncate text-lg font-semibold tracking-tight">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-sm text-white/70">{user.email}</p>
            </div>
          </div>
        </div>
        <Stagger className="-mt-5 space-y-2 px-5 pb-5">
          <StaggerItem className="rounded-xl border border-border bg-background p-3 text-xs shadow-sm">
            <p className="text-muted-foreground">Role</p>
            <p className="mt-0.5 font-medium capitalize">
              {user.role.replace(/_/g, " ")}
            </p>
          </StaggerItem>
          <StaggerItem className="rounded-xl border border-border bg-background p-3 text-xs shadow-sm">
            <p className="text-muted-foreground">Username</p>
            <p className="mt-0.5 font-medium">
              {user.username ? `@${user.username}` : "—"}
            </p>
          </StaggerItem>
          <StaggerItem className="flex items-start gap-2 rounded-xl border border-brand-primary/15 bg-brand-tint/40 px-3 py-2.5 text-xs text-brand-deep">
            <UserRound className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Photo, details, and password update independently — save each
              section when ready.
            </p>
          </StaggerItem>
        </Stagger>
      </aside>
    </FadeUp>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuthStore();

  if (!user) return null;

  const roleLabel = user.role.replace(/_/g, " ");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <PageHero
        eyebrow="Account"
        title="Profile"
        description="Manage your photo, account details, and password."
        actions={
          <Badge className="border-white/25 bg-white/10 capitalize text-white hover:bg-white/15">
            {roleLabel}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <FormSection
            step="01"
            title="Photo & avatar"
            description="Upload a custom photo or pick a built-in preset."
          >
            <PhotoSection user={user} onUserUpdate={setUser} />
          </FormSection>

          <FormSection
            step="02"
            title="Account details"
            description="Update your name, username, and phone number."
          >
            <AccountDetailsSection user={user} onUserUpdate={setUser} />
          </FormSection>

          <FormSection
            step="03"
            title="Password"
            description="Change your login password. Use at least 8 characters."
          >
            <PasswordSection />
          </FormSection>
        </div>

        <ProfileLivePreview user={user} />
      </div>
    </div>
  );
}
