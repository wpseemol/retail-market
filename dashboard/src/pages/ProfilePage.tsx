import { type ReactNode, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Upload, UserRound } from "lucide-react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── SettingsSection ──────────────────────────────────────────────────────────

function SettingsSection({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  description: string;
  icon?: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/50 via-background to-background px-5 py-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-[11px] font-bold text-white">
          {Icon ? <Icon className="size-3.5" /> : step}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {!Icon && (
          <span className="ml-auto shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {step}
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

// ─── Sticky actions bar ───────────────────────────────────────────────────────

function StickyActions({
  children,
  message,
}: {
  children: ReactNode;
  message?: ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">{message}</div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

// ─── Avatar preview ───────────────────────────────────────────────────────────

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
        className={`${dim} rounded-full object-cover ring-2 ring-brand-primary/20`}
      />
    );
  }

  if (user.avatar_preset && isAvatarPresetId(user.avatar_preset)) {
    return (
      <AvatarPresetSvg
        id={user.avatar_preset}
        className={`${dim} rounded-full`}
      />
    );
  }

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-brand-tint text-brand-deep font-semibold ${
        size === "lg" ? "text-2xl" : "text-sm"
      }`}
    >
      {userInitials(user)}
    </div>
  );
}

// ─── Section 01: Photo & avatar ───────────────────────────────────────────────

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
      {/* Large preview + upload */}
      <div className="flex flex-wrap items-end gap-5">
        <AvatarPreview user={user} size="lg" />
        <div className="space-y-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
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
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF · max 5 MB · always resized on the server
          </p>
        </div>
      </div>

      {/* Preset grid */}
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
                {isSaving && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                    <span className="size-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-brand-primary" role="status">
          {success}
        </p>
      )}
    </>
  );
}

// ─── Section 02: Account details ──────────────────────────────────────────────

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
      const data = await apiFetch<{ message: string; user: Record<string, unknown> }>(
        "/api/dashboard/auth/me",
        {
          method: "PATCH",
          token,
          body: {
            first_name: values.first_name.trim(),
            last_name: values.last_name.trim(),
            username: (values.username ?? "").trim() || undefined,
            phone: (values.phone ?? "").trim() || null,
          },
        },
      );
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

        <StickyActions
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
                Changes save immediately to your account.
              </p>
            )
          }
        >
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}

// ─── Section 03: Password ─────────────────────────────────────────────────────

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

        <StickyActions
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
        </StickyActions>
      </form>
    </Form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, setUser } = useAuthStore();

  if (!user) return null;

  const roleLabel = user.role.replace(/_/g, " ");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Manage your photo, avatar, account details, and password.
          </p>
        </div>
        <Badge
          variant="outline"
          className="capitalize border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
        >
          {roleLabel}
        </Badge>
      </div>

      {/* Section 01 */}
      <SettingsSection
        step="01"
        title="Photo & avatar"
        description="Upload a custom photo or pick one of the built-in presets."
        icon={UserRound}
      >
        <PhotoSection user={user} onUserUpdate={setUser} />
      </SettingsSection>

      {/* Section 02 */}
      <SettingsSection
        step="02"
        title="Account details"
        description="Update your name, username, and phone number."
      >
        <AccountDetailsSection user={user} onUserUpdate={setUser} />
      </SettingsSection>

      {/* Section 03 */}
      <SettingsSection
        step="03"
        title="Password"
        description="Change your login password. Use at least 8 characters."
        icon={KeyRound}
      >
        <PasswordSection />
      </SettingsSection>
    </div>
  );
}
