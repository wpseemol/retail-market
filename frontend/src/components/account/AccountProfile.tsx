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
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import AuthInput from "@/components/auth/AuthInput";
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
import AccountVerification from "@/components/account/AccountVerification";
import AccountPassword from "@/components/account/AccountPassword";
import { IdCardDecor } from "@/components/account/AccountDecor";
import {
  BannerArrowIcon,
  BannerCameraIcon,
  BannerCrownIcon,
  BannerGoogleMark,
  BannerMailIcon,
  BannerUserWatermark,
} from "@/components/account/AccountBannerIcons";
import {
  AVATAR_PRESET_IDS,
  AvatarPresetSvg,
  isAvatarPresetId,
  type AvatarPresetId,
} from "@/lib/avatarPresets";

function initials(user: ApiUser) {
  const a = user.first_name?.trim()?.[0] ?? "";
  const b = user.last_name?.trim()?.[0] ?? "";
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 2).toUpperCase();
}

function ProfileAvatarFace({ user }: { user: ApiUser }) {
  if (user.avatar?.path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={user.avatar_id ?? user.avatar.path}
        src={user.avatar.path}
        alt=""
        className="size-full object-cover"
      />
    );
  }
  if (user.avatar_preset && isAvatarPresetId(user.avatar_preset)) {
    return <AvatarPresetSvg id={user.avatar_preset} className="size-full" />;
  }
  return <>{initials(user)}</>;
}

function providerLabel(provider?: string | null) {
  if (!provider) return "Email account";
  if (provider === "google") return "Google Account";
  return `${provider} account`;
}

type FieldErrors = Partial<Record<UpdateProfileField, string>>;

type AccountProfileProps = {
  /** From Auth.js cookie on the server — no client fetch delay. */
  initialUser: ApiUser;
};

/** Stable fingerprint so SSR/HMR re-renders with a new object don't loop setState. */
function userFingerprint(u: ApiUser) {
  return [
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone ?? "",
    u.gender ?? "",
    u.date_of_birth ?? "",
    u.email_verified_at ?? "",
    u.phone_verified_at ?? "",
    u.avatar_id ?? "",
    u.avatar?.path ?? "",
    u.avatar_preset ?? "",
    u.has_password ? "1" : "0",
  ].join("|");
}

export default function AccountProfile({ initialUser }: AccountProfileProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { update: updateSession } = useSession();
  const [user, setLocalUser] = useState(initialUser);
  const [prevFingerprint, setPrevFingerprint] = useState(() =>
    userFingerprint(initialUser),
  );
  const nextFingerprint = userFingerprint(initialUser);
  if (prevFingerprint !== nextFingerprint) {
    setPrevFingerprint(nextFingerprint);
    setLocalUser(initialUser);
  }
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<UpdateProfileField, boolean>>
  >({});
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(setSessionUser(initialUser));
  }, [dispatch, nextFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps -- fingerprint tracks meaningful user changes

  const applyUser = async (next: ApiUser) => {
    setLocalUser(next);
    dispatch(setUser(next));
    await updateSession({ backendUser: next });
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
      await applyUser(data.user);
      setSuccess("Profile image updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePresetSelect = async (id: AvatarPresetId) => {
    if (presetSaving || avatarLoading) return;
    setError(null);
    setSuccess(null);
    setPresetSaving(id);
    try {
      const data = await apiFetch<{ user: ApiUser }>("/api/auth/me", {
        method: "PATCH",
        body: { avatar_preset: id },
      });
      await applyUser(data.user);
      setSuccess("Avatar updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set avatar");
    } finally {
      setPresetSaving(null);
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
      await applyUser(data.user);
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
  const isGoogle = user.provider_name === "google";

  return (
    <main className="min-w-0 flex-1">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        <section
          aria-labelledby="account-heading"
          className="overflow-hidden rounded-2xl border border-border-default/80 bg-bg-surface shadow-[0_8px_30px_rgba(0,178,7,0.08)]"
        >
          {/* Soft mint hero — matches design (not solid brand green) */}
          <div className="relative overflow-hidden bg-linear-to-br from-[#E8FCEC] via-[#D8F5DF] to-[#C6EED1] px-5 py-7 sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full bg-[#7ED992]/35 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 right-16 size-52 rounded-full bg-[#00B207]/18 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 opacity-[0.12] lg:block"
              aria-hidden
            >
              <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#002603" />
                <path
                  d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                  fill="#002603"
                />
              </svg>
            </div>

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div
                    className="flex size-[72px] sm:size-[84px] items-center justify-center overflow-hidden rounded-full bg-brand-primary text-xl font-bold text-white shadow-[0_10px_28px_rgba(0,178,7,0.28)] ring-4 ring-white/80"
                    aria-hidden
                  >
                    <ProfileAvatarFace user={user} />
                    {avatarLoading || presetSaving ? (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <span
                          className="size-6 rounded-full border-2 border-white/30 border-t-white animate-spin"
                          aria-hidden
                        />
                        <span className="sr-only">Updating avatar</span>
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
                    disabled={avatarLoading || Boolean(presetSaving)}
                    onClick={() => avatarInputRef.current?.click()}
                    title={`JPEG, PNG, WebP, or GIF · max ${Math.floor(AVATAR_MAX_BYTES / (1024 * 1024))} MB · always resized on the server`}
                    aria-label="Upload profile image"
                    className="absolute -bottom-0.5 -right-0.5 inline-flex size-8 items-center justify-center rounded-full border border-white bg-white text-brand-primary shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-colors hover:text-brand-hover disabled:opacity-60 cursor-pointer"
                  >
                    <Camera className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </div>

                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7FFE4] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-hover shadow-[0_2px_8px_rgba(0,178,7,0.12)] ring-1 ring-[#00B207]/15">
                    <Crown className="size-3 text-brand-primary" aria-hidden />
                    Customer Profile
                  </span>
                  <h1
                    id="account-heading"
                    className="mt-2 truncate text-2xl sm:text-[28px] font-semibold leading-tight text-text-primary"
                  >
                    {fullName || "My account"}
                  </h1>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-text-secondary">
                    <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{user.email}</span>
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-[0_4px_14px_rgba(0,0,0,0.06)] ring-1 ring-black/4">
                      {isGoogle ? (
                        <GoogleMark className="size-3.5" />
                      ) : null}
                      {providerLabel(user.provider_name)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-hover">
                      <span
                        className="size-1.5 rounded-full bg-brand-primary shadow-[0_0_0_3px_rgba(0,178,7,0.2)]"
                        aria-hidden
                      />
                      {user.status === "active" ? "Active" : user.status}
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
                className="self-start sm:self-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition-colors hover:text-brand-primary cursor-pointer"
              >
                Log out
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className="border-t border-border-default/60 px-5 sm:px-8 py-5">
            <p className="mb-3 text-sm font-medium text-text-secondary">
              Or choose a built-in avatar
            </p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {AVATAR_PRESET_IDS.map((id) => {
                const isSelected =
                  !user.avatar?.path && user.avatar_preset === id;
                const isSaving = presetSaving === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    disabled={Boolean(presetSaving) || avatarLoading}
                    onClick={() => void handlePresetSelect(id)}
                    aria-pressed={isSelected}
                    aria-label={`Use ${id} avatar`}
                    className={`relative flex size-10 items-center justify-center overflow-hidden rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 disabled:opacity-60 cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-brand-primary ring-offset-2 ring-offset-bg-surface shadow-[0_4px_12px_rgba(0,178,7,0.25)]"
                        : "ring-1 ring-border-default/60 hover:ring-brand-primary/40"
                    }`}
                  >
                    <AvatarPresetSvg id={id} className="size-10" />
                    {isSaving ? (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-bg-surface/60">
                        <span className="size-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04, ease: "easeOut" }}
          aria-labelledby="details-heading"
          className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8 shadow-[0_6px_24px_rgba(0,0,0,0.04)]"
        >
          <IdCardDecor className="pointer-events-none absolute -right-3 bottom-0 hidden w-[150px] sm:block lg:w-[180px]" />

          <div className="relative mb-6 max-w-2xl">
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
            className="relative flex max-w-2xl flex-col gap-4"
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
                className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-brand-primary px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,178,7,0.28)] hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
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
                className="h-11 inline-flex items-center rounded-md border border-border-default bg-white px-4 text-sm font-semibold text-text-primary shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Back to shop
              </Link>
            </div>
          </form>
        </motion.section>

        <AccountVerification
          user={user}
          onUserChange={async (next) => {
            await applyUser(next);
          }}
        />

        <AccountPassword
          user={user}
          onUserChange={async (next) => {
            await applyUser(next);
          }}
        />
      </motion.div>
    </main>
  );
}
