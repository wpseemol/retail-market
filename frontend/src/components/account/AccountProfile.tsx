"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthInput from "@/components/auth/AuthInput";
import ApiHealthBadge from "@/components/ApiHealthBadge";
import { apiFetch, apiUpload, ApiError, type ApiUser } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setSessionUser, setUser } from "@/store/authSlice";
import { logoutSession } from "@/lib/logoutSession";
import {
  type UpdateProfileField,
  validateUpdateProfileField,
  validateUpdateProfileForm,
} from "@/lib/validators/customerAuth";
import {
  AVATAR_ALLOWED_MIMES,
  AVATAR_MAX_BYTES,
  validateAvatarFile,
} from "@/lib/validators/avatarImage";
import { syncSessionUserAction } from "@/app/actions/auth";

function initials(user: ApiUser) {
  const a = user.first_name?.trim()?.[0] ?? "";
  const b = user.last_name?.trim()?.[0] ?? "";
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 2).toUpperCase();
}

function providerLabel(provider?: string | null) {
  if (!provider) return "Email account";
  if (provider === "google") return "Google account";
  return `${provider} account`;
}

type FieldErrors = Partial<Record<UpdateProfileField, string>>;

type AccountProfileProps = {
  /** From Auth.js cookie on the server — no client fetch delay. */
  initialUser: ApiUser;
};

export default function AccountProfile({ initialUser }: AccountProfileProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [user, setLocalUser] = useState(initialUser);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<UpdateProfileField, boolean>>
  >({});
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Keep Redux / header in sync without waiting on client session fetch.
  useEffect(() => {
    dispatch(setSessionUser(initialUser));
  }, [dispatch, initialUser]);

  useEffect(() => {
    setLocalUser(initialUser);
  }, [initialUser]);

  const applyUser = (next: ApiUser) => {
    setLocalUser(next);
    dispatch(setUser(next));
  };

  const markTouched = (field: UpdateProfileField, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateUpdateProfileField(field, value),
    }));
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setSuccess(null);

    const checked = await validateAvatarFile(file);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setAvatarLoading(true);
    try {
      const data = await apiUpload<{ user: ApiUser }>(
        "/api/auth/me/avatar",
        formData,
      );
      applyUser(data.user);
      await syncSessionUserAction();
      setSuccess("Profile photo updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Photo upload failed");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const raw = {
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      gender: String(form.get("gender") ?? ""),
      date_of_birth: String(form.get("date_of_birth") ?? ""),
    };

    const validated = validateUpdateProfileForm(raw);
    if (!validated.success) {
      setFieldErrors(validated.errors);
      setTouched({
        first_name: true,
        last_name: true,
        phone: true,
        gender: true,
        date_of_birth: true,
      });
      setError("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch<{ user: ApiUser }>("/api/auth/me", {
        method: "PATCH",
        body: validated.data,
      });
      applyUser(data.user);
      await syncSessionUserAction();
      setFieldErrors({});
      setSuccess("Profile updated successfully");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const next: FieldErrors = {};
        for (const key of Object.keys(err.errors) as UpdateProfileField[]) {
          const msg = err.errors[key]?.[0];
          if (msg) next[key] = msg;
        }
        if (Object.keys(next).length > 0) {
          setFieldErrors(next);
        }
      }
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${user.first_name} ${user.last_name}`.trim();

  return (
    <main className="flex-1 bg-bg-base">
      <div className="border-b border-border-default bg-bg-subtle/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex items-center gap-2 text-text-secondary">
              <li>
                <Link
                  href="/"
                  className="hover:text-brand-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-text-secondary/60">
                &gt;
              </li>
              <li className="text-text-primary font-medium">My account</li>
            </ol>
          </nav>
          <ApiHealthBadge />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto max-w-3xl"
        >
          <section
            aria-labelledby="account-heading"
            className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface"
          >
            <div
              className="absolute inset-x-0 top-0 h-24 sm:h-28 bg-linear-to-br from-brand-primary/20 via-brand-primary/5 to-transparent"
              aria-hidden
            />
            <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-7 flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div
                    className="size-16 sm:size-20 rounded-full bg-brand-primary text-white flex items-center justify-center text-xl sm:text-2xl font-bold shadow-sm ring-4 ring-bg-surface overflow-hidden"
                    aria-hidden
                  >
                    {user.avatar?.path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar.path}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials(user)
                    )}
                    {avatarLoading ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span
                          className="size-6 rounded-full border-2 border-white/30 border-t-white animate-spin"
                          aria-hidden
                        />
                        <span className="sr-only">Uploading photo</span>
                      </span>
                    ) : null}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={AVATAR_ALLOWED_MIMES.join(",")}
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    disabled={avatarLoading}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-8 rounded-full border border-border-default bg-bg-surface px-2.5 text-[11px] font-semibold text-text-primary shadow-sm hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-60 cursor-pointer"
                    title={`JPEG, PNG, WebP, or GIF · max ${Math.floor(AVATAR_MAX_BYTES / (1024 * 1024))} MB`}
                  >
                    Photo
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-primary mb-1">
                    Customer profile
                  </p>
                  <h1
                    id="account-heading"
                    className="text-2xl sm:text-[28px] font-semibold text-text-primary leading-tight truncate"
                  >
                    {fullName || "My account"}
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary truncate">
                    {user.email}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-border-default bg-bg-base px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                      {providerLabel(user.provider_name)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span
                        className="size-1.5 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      {user.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void logoutSession(dispatch).then(() => {
                    router.push("/login");
                  });
                }}
                className="self-start sm:self-auto h-10 shrink-0 rounded-md border border-border-default bg-bg-base px-4 text-sm font-semibold text-text-primary hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.04, ease: "easeOut" }}
            aria-labelledby="details-heading"
            className="mt-6 rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8"
          >
            <div className="mb-6">
              <h2
                id="details-heading"
                className="relative inline-block text-lg sm:text-xl font-semibold text-text-primary pb-2"
              >
                Personal details
                <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Keep your shopper profile up to date for orders and delivery.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AuthInput
                  name="first_name"
                  label="First name"
                  defaultValue={user.first_name}
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  error={
                    touched.first_name ? fieldErrors.first_name : undefined
                  }
                  onBlur={(e) => markTouched("first_name", e.target.value)}
                  onChange={(e) => {
                    if (touched.first_name) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        first_name: validateUpdateProfileField(
                          "first_name",
                          e.target.value,
                        ),
                      }));
                    }
                  }}
                />
                <AuthInput
                  name="last_name"
                  label="Last name"
                  defaultValue={user.last_name}
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  error={touched.last_name ? fieldErrors.last_name : undefined}
                  onBlur={(e) => markTouched("last_name", e.target.value)}
                  onChange={(e) => {
                    if (touched.last_name) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        last_name: validateUpdateProfileField(
                          "last_name",
                          e.target.value,
                        ),
                      }));
                    }
                  }}
                />
              </div>

              <AuthInput
                name="phone"
                label="Phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                maxLength={30}
                placeholder="Optional"
                error={touched.phone ? fieldErrors.phone : undefined}
                onBlur={(e) => markTouched("phone", e.target.value)}
                onChange={(e) => {
                  if (touched.phone) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: validateUpdateProfileField(
                        "phone",
                        e.target.value,
                      ),
                    }));
                  }
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium text-text-primary"
                    htmlFor="gender"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    defaultValue={user.gender ?? ""}
                    aria-invalid={
                      touched.gender && fieldErrors.gender ? true : undefined
                    }
                    aria-describedby={
                      touched.gender && fieldErrors.gender
                        ? "gender-error"
                        : undefined
                    }
                    onBlur={(e) => markTouched("gender", e.target.value)}
                    onChange={(e) => {
                      if (touched.gender) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          gender: validateUpdateProfileField(
                            "gender",
                            e.target.value,
                          ),
                        }));
                      }
                    }}
                    className={`h-11 rounded border bg-bg-surface px-3.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-primary ${
                      touched.gender && fieldErrors.gender
                        ? "border-rose-500 focus:border-rose-500"
                        : "border-border-default"
                    }`}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {touched.gender && fieldErrors.gender ? (
                    <p
                      id="gender-error"
                      className="text-sm text-rose-600"
                      role="alert"
                    >
                      {fieldErrors.gender}
                    </p>
                  ) : null}
                </div>

                <AuthInput
                  name="date_of_birth"
                  label="Date of birth"
                  type="date"
                  defaultValue={
                    user.date_of_birth ? user.date_of_birth.slice(0, 10) : ""
                  }
                  error={
                    touched.date_of_birth
                      ? fieldErrors.date_of_birth
                      : undefined
                  }
                  onBlur={(e) => markTouched("date_of_birth", e.target.value)}
                  onChange={(e) => {
                    if (touched.date_of_birth) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        date_of_birth: validateUpdateProfileField(
                          "date_of_birth",
                          e.target.value,
                        ),
                      }));
                    }
                  }}
                />
              </div>

              {error ? (
                <p
                  className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {success ? (
                <p
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
                  role="status"
                >
                  {success}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span
                        className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                        aria-hidden
                      />
                      Saving…
                    </>
                  ) : (
                    "Save details"
                  )}
                </button>
                <Link
                  href="/"
                  className="h-11 inline-flex items-center rounded-md px-4 text-sm font-medium text-text-secondary hover:text-brand-primary transition-colors"
                >
                  Back to shop
                </Link>
              </div>
            </form>
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}
