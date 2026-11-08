"use client";

import { type FormEvent, useState } from "react";
import AuthInput from "@/components/auth/AuthInput";
import { LockIcon } from "@/components/auth/icons";
import { PadlockDecor } from "@/components/account/AccountDecor";
import { apiFetch, ApiError, type ApiUser } from "@/lib/api";
import {
  type SetPasswordField,
  validateSetPasswordForm,
} from "@/lib/validators/customerAuth";

type Props = {
  user: ApiUser;
  onUserChange: (user: ApiUser) => void | Promise<void>;
};

type FieldErrors = Partial<Record<SetPasswordField, string>>;

export default function AccountPassword({ user, onUserChange }: Props) {
  const isSocial = Boolean(user.provider_name);
  // Old JWTs may omit has_password — email accounts require current; social first-set does not.
  const [requireCurrent, setRequireCurrent] = useState(
    () => user.has_password ?? !isSocial,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formKey, setFormKey] = useState(0);

  if (user.has_password !== undefined && requireCurrent !== user.has_password) {
    setRequireCurrent(user.has_password);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const raw = {
      current_password: String(form.get("current_password") ?? ""),
      new_password: String(form.get("new_password") ?? ""),
      confirm_password: String(form.get("confirm_password") ?? ""),
    };

    const validated = validateSetPasswordForm(raw, {
      requireCurrent,
    });
    if (!validated.success) {
      setFieldErrors(validated.errors);
      setError("Please fix the highlighted fields");
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      const data = await apiFetch<{ user: ApiUser; message?: string }>(
        "/api/auth/me/password",
        {
          method: "POST",
          body: validated.data,
        },
      );
      await onUserChange(data.user);
      setRequireCurrent(true);
      setSuccess(
        data.message ??
          (requireCurrent
            ? "Password updated"
            : "Password set — you can also sign in with email and password"),
      );
      setFormKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CURRENT_PASSWORD_REQUIRED") {
          setRequireCurrent(true);
          setFieldErrors({
            current_password: "Current password is required",
          });
        }
        if (err.errors) {
          const next: FieldErrors = {};
          for (const key of Object.keys(err.errors) as SetPasswordField[]) {
            const msg = err.errors[key]?.[0];
            if (msg) next[key] = msg;
          }
          if (Object.keys(next).length > 0) setFieldErrors(next);
        }
        setError(err.message);
      } else {
        setError("Could not update password");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="password-heading"
      className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-8 shadow-sm"
    >
      <PadlockDecor className="pointer-events-none absolute -right-2 bottom-1 hidden w-[120px] sm:block lg:w-[150px]" />

      <div className="relative mb-6 max-w-2xl">
        <h2
          id="password-heading"
          className="relative inline-block text-lg sm:text-xl font-semibold text-text-primary pb-2"
        >
          {requireCurrent ? "Change password" : "Set a password"}
          <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {requireCurrent
            ? isSocial
              ? "Update your password. You can still sign in with Google (or your other provider)."
              : "Keep your account secure with a strong password."
            : "Optional for Google sign-in. After you set one, you can use email and password as well as Google."}
        </p>
      </div>

      <form
        key={formKey}
        onSubmit={handleSubmit}
        className="relative flex max-w-xl flex-col gap-4"
        noValidate
      >
        {requireCurrent ? (
          <AuthInput
            name="current_password"
            type="password"
            autoComplete="current-password"
            label="Current password"
            placeholder="Enter current password"
            leadingIcon={<LockIcon />}
            showPasswordToggle
            required
            error={fieldErrors.current_password}
          />
        ) : null}

        <AuthInput
          name="new_password"
          type="password"
          autoComplete="new-password"
          label={requireCurrent ? "New password" : "Password"}
          placeholder="At least 8 characters"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          required
          error={fieldErrors.new_password}
        />

        <AuthInput
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          placeholder="Re-enter password"
          leadingIcon={<LockIcon />}
          showPasswordToggle
          required
          error={fieldErrors.confirm_password}
        />

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

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 w-fit min-w-36 items-center justify-center gap-2 rounded-md bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : requireCurrent
              ? "Update password"
              : "Set password"}
        </button>
      </form>
    </section>
  );
}
