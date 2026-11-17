"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiFetch, apiUpload, ApiError } from "@/lib/api";
import { clearCsrfCache, fetchCsrfToken } from "@/lib/csrf";
import { useAppSelector } from "@/store/hooks";
import { selectAuthHydrated, selectAuthUser } from "@/store/authSlice";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
  becomeSellerDraftSchema,
  becomeSellerSubmitSchema,
  SELLER_KYC_ACCEPT,
  type BecomeSellerDraftInput,
  validateSellerKycFile,
} from "@/lib/validators/becomeSeller";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SellerKycDocThumb } from "@/components/become-seller/SellerKycDocThumb";
import { cn } from "@/lib/utils";

type PartnerTerms = {
  title: string;
  summary: string;
  default_commission_percent: number;
  fee_plans: Array<{ id: string; label: string; description: string }>;
  rent_note: string;
  checklist: string[];
};

type Application = {
  id: string;
  status: string;
  shop_name: string | null;
  shop_name_bn: string | null;
  description: string | null;
  contact_phone: string | null;
  business_address: string | null;
  rejection_reason: string | null;
  documents: Array<{
    id: string;
    doc_type: string;
    media: { path: string } | null;
    file_url?: string;
  }>;
  docs_checklist: {
    nid_front: boolean;
    nid_back: boolean;
    birth_certificate: boolean;
    identity_complete: boolean;
    required_hint: string;
  };
};

type MeResponse = {
  application: Application | null;
  account: {
    email_verified: boolean;
    phone_verified: boolean;
    role: string;
    has_shop: boolean;
  };
  terms: PartnerTerms;
};

const DOC_UPLOADS: Array<{
  type: string;
  labelKey: "nidFront" | "nidBack" | "birthCert" | "tradeLicense";
}> = [
  { type: "nid_front", labelKey: "nidFront" },
  { type: "nid_back", labelKey: "nidBack" },
  { type: "birth_certificate", labelKey: "birthCert" },
  { type: "trade_license", labelKey: "tradeLicense" },
];

const fieldClass =
  "w-full rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-brand-primary disabled:opacity-60";
const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60";
const outlineBtn =
  "inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface px-6 text-sm font-semibold text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary";

function StepRail({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <ol className="mb-8 grid gap-2 sm:grid-cols-5">
      {steps.map((label, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={label}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-brand-primary/40 bg-brand-primary/5"
                : done
                  ? "border-border-default bg-bg-surface"
                  : "border-border-default/70 bg-bg-muted/40",
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.12em]",
                active ? "text-brand-primary" : "text-text-secondary",
              )}
            >
              {index + 1}
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-medium leading-snug",
                active ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function BecomeSellerContent() {
  const { t } = useI18n();
  const copy = t.becomeSeller;
  const user = useAppSelector(selectAuthUser);
  const hydrated = useAppSelector(selectAuthHydrated);
  const [terms, setTerms] = useState<PartnerTerms | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BecomeSellerDraftInput>({
    resolver: zodResolver(becomeSellerDraftSchema),
    defaultValues: {
      shop_name: "",
      shop_name_bn: "",
      description: "",
      contact_phone: "",
      business_address: "",
    },
  });

  const acceptSchema = useMemo(
    () =>
      z.object({
        accept_fee_terms: z.boolean().refine((value) => value === true, {
          message: copy.acceptRequired,
        }),
      }),
    [copy.acceptRequired],
  );

  const submitForm = useForm<{ accept_fee_terms: boolean }>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { accept_fee_terms: false },
  });

  const loadPublicTerms = useCallback(async () => {
    try {
      const data = await apiFetch<{ terms: PartnerTerms }>(
        "/api/seller-applications/terms",
      );
      setTerms(data.terms);
    } catch {
      /* /me also returns terms when signed in */
    }
  }, []);

  const loadMe = useCallback(async () => {
    if (!user) {
      setMe(null);
      return;
    }
    try {
      const data = await apiFetch<MeResponse>("/api/seller-applications/me");
      setMe(data);
      setTerms(data.terms);
      if (data.application) {
        form.reset({
          shop_name: data.application.shop_name ?? "",
          shop_name_bn: data.application.shop_name_bn ?? "",
          description: data.application.description ?? "",
          contact_phone: data.application.contact_phone ?? "",
          business_address: data.application.business_address ?? "",
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.loadFailed);
    }
  }, [copy.loadFailed, form, user]);

  useEffect(() => {
    void loadPublicTerms();
  }, [loadPublicTerms]);

  useEffect(() => {
    if (hydrated && user) void loadMe();
  }, [hydrated, user, loadMe]);

  async function withCsrf<T>(run: (csrfToken: string) => Promise<T>): Promise<T> {
    try {
      const csrfToken = await fetchCsrfToken();
      return await run(csrfToken);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === "CSRF_INVALID" || err.code === "CSRF_MISMATCH")
      ) {
        clearCsrfCache();
        const csrfToken = await fetchCsrfToken(true);
        return run(csrfToken);
      }
      throw err;
    }
  }

  async function saveDraft(values: BecomeSellerDraftInput) {
    setError(null);
    setSuccess(null);
    try {
      const data = await withCsrf((csrfToken) =>
        apiFetch<{ application: Application; message: string }>(
          "/api/seller-applications",
          {
            method: "POST",
            csrfToken,
            body: {
              shop_name: values.shop_name,
              shop_name_bn: values.shop_name_bn || null,
              description: values.description || null,
              contact_phone: values.contact_phone || null,
              business_address: values.business_address || null,
            },
          },
        ),
      );
      setSuccess(data.message || copy.draftSaved);
      await loadMe();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code?.startsWith("CSRF")
            ? copy.csrfFailed
            : err.message
          : copy.saveFailed,
      );
    }
  }

  async function uploadDoc(docType: string, file: File) {
    const invalid = validateSellerKycFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading(docType);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("document", file);
      fd.append("doc_type", docType);
      await withCsrf((csrfToken) =>
        apiUpload("/api/seller-applications/me/documents", fd, "POST", {
          csrfToken,
        }),
      );
      setSuccess(copy.docUploaded);
      await loadMe();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code?.startsWith("CSRF")
            ? copy.csrfFailed
            : err.message
          : copy.uploadFailed,
      );
    } finally {
      setUploading(null);
    }
  }

  async function onSubmitApplication(values: { accept_fee_terms: boolean }) {
    const parsed = becomeSellerSubmitSchema.safeParse({
      accept_fee_terms: values.accept_fee_terms ? true : false,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? copy.acceptRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await withCsrf((csrfToken) =>
        apiFetch("/api/seller-applications/me/submit", {
          method: "POST",
          csrfToken,
          body: { accept_fee_terms: true },
        }),
      );
      setSuccess(copy.submitted);
      await loadMe();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code?.startsWith("CSRF")
            ? copy.csrfFailed
            : err.message
          : copy.submitFailed,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const app = me?.application;
  const locked =
    app?.status === "submitted" ||
    app?.status === "under_review" ||
    app?.status === "approved";

  const stepLabels = [
    copy.railAccount,
    copy.railVerify,
    copy.railShop,
    copy.railDocs,
    copy.railTerms,
  ];

  let activeStep = 0;
  if (!user) activeStep = 0;
  else if (me?.account.has_shop || me?.account.role === "vendor") activeStep = 4;
  else if (!me?.account.email_verified || !me?.account.phone_verified) activeStep = 1;
  else if (!app) activeStep = 2;
  else if (!app.docs_checklist.identity_complete) activeStep = 3;
  else activeStep = 4;

  return (
    <div className="mx-auto max-w-3xl">
      {!hydrated ? (
        <p className="text-text-secondary">{copy.loading}</p>
      ) : (
        <>
          <StepRail steps={stepLabels} activeIndex={activeStep} />

          {!user ? (
            <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                {copy.stepAccount}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {copy.needAccount}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/register?next=/become-seller" className={primaryBtn}>
                  {copy.createAccount}
                </Link>
                <Link href="/login?next=/become-seller" className={outlineBtn}>
                  {copy.signIn}
                </Link>
              </div>
            </section>
          ) : me?.account.has_shop || me?.account.role === "vendor" ? (
            <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
              <p className="text-text-primary">{copy.alreadySeller}</p>
              <Link href="/account" className={`${outlineBtn} mt-5`}>
                {copy.goAccount}
              </Link>
            </section>
          ) : !me?.account.email_verified || !me?.account.phone_verified ? (
            <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                {copy.verifyTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {copy.verifyBody}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2">
                  <span className="text-text-secondary">{copy.email}</span>
                  <span
                    className={
                      me?.account.email_verified
                        ? "font-medium text-brand-primary"
                        : "font-medium text-amber-700 dark:text-amber-400"
                    }
                  >
                    {me?.account.email_verified ? copy.verified : copy.notVerified}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2">
                  <span className="text-text-secondary">{copy.phone}</span>
                  <span
                    className={
                      me?.account.phone_verified
                        ? "font-medium text-brand-primary"
                        : "font-medium text-amber-700 dark:text-amber-400"
                    }
                  >
                    {me?.account.phone_verified ? copy.verified : copy.notVerified}
                  </span>
                </li>
              </ul>
              <Link href="/account" className={`${primaryBtn} mt-6`}>
                {copy.verifyCta}
              </Link>
            </section>
          ) : (
            <div className="space-y-6">
              {app?.status === "submitted" || app?.status === "under_review" ? (
                <section className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-6">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {copy.pendingTitle}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">{copy.pendingBody}</p>
                </section>
              ) : null}

              {app?.status === "approved" ? (
                <section className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-6">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {copy.approvedTitle}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">{copy.approvedBody}</p>
                </section>
              ) : null}

              {app?.status === "rejected" ? (
                <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {copy.rejectedTitle}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    {app.rejection_reason || copy.rejectedBody}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  {copy.stepShop}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{copy.shopHint}</p>
                <Form {...form}>
                  <form
                    className="mt-5 space-y-4"
                    onSubmit={form.handleSubmit(saveDraft)}
                    noValidate
                  >
                    {(
                      [
                        ["shop_name", copy.shopName, true],
                        ["shop_name_bn", copy.shopNameBn, false],
                        ["contact_phone", copy.contactPhone, false],
                      ] as const
                    ).map(([name, label]) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              <input
                                className={fieldClass}
                                disabled={locked}
                                autoComplete={
                                  name === "contact_phone" ? "tel" : "organization"
                                }
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.description}</FormLabel>
                          <FormControl>
                            <textarea
                              className={fieldClass}
                              rows={4}
                              disabled={locked}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>{copy.descriptionHint}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="business_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{copy.address}</FormLabel>
                          <FormControl>
                            <textarea
                              className={fieldClass}
                              rows={2}
                              disabled={locked}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!locked ? (
                      <button
                        type="submit"
                        className={primaryBtn}
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? copy.saving : copy.saveDraft}
                      </button>
                    ) : null}
                  </form>
                </Form>
              </section>

              <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  {copy.stepDocs}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  {app?.docs_checklist.required_hint || copy.docsHint}
                </p>
                <p className="mt-1 text-xs text-text-secondary">{copy.docsResize}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {DOC_UPLOADS.map((doc) => {
                    const existing = app?.documents.find(
                      (d) => d.doc_type === doc.type,
                    );
                    return (
                      <div
                        key={doc.type}
                        className="rounded-xl border border-border-default bg-bg-base/40 p-3"
                      >
                        <p className="text-sm font-medium text-text-primary">
                          {copy[doc.labelKey]}
                        </p>
                        {existing?.file_url || existing?.media?.path ? (
                          <SellerKycDocThumb
                            fileUrl={existing.file_url || existing.media!.path}
                            alt={copy[doc.labelKey]}
                          />
                        ) : (
                          <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-bg-muted text-xs text-text-secondary">
                            {copy.noDoc}
                          </div>
                        )}
                        {!locked ? (
                          <label
                            className={cn(
                              "mt-3 inline-flex cursor-pointer text-sm font-medium text-brand-primary",
                              (uploading === doc.type || !app) &&
                                "pointer-events-none opacity-50",
                            )}
                          >
                            <input
                              type="file"
                              accept={SELLER_KYC_ACCEPT}
                              className="sr-only"
                              disabled={uploading === doc.type || !app}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadDoc(doc.type, file);
                                e.target.value = "";
                              }}
                            />
                            {uploading === doc.type
                              ? copy.uploading
                              : existing
                                ? copy.replaceDoc
                                : copy.uploadDoc}
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {!app ? (
                  <p className="mt-4 text-sm text-text-secondary">{copy.saveFirst}</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
                <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                  {copy.stepTerms}
                </h2>
                {terms ? (
                  <div className="mt-4 space-y-4 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">{terms.title}</p>
                    <p className="leading-relaxed">{terms.summary}</p>
                    <p>
                      {copy.defaultCommission}:{" "}
                      <span className="font-semibold text-text-primary">
                        {terms.default_commission_percent}%
                      </span>
                    </p>
                    <ul className="grid gap-3 sm:grid-cols-1">
                      {terms.fee_plans.map((plan) => (
                        <li
                          key={plan.id}
                          className="rounded-lg border border-border-default bg-bg-base/50 p-4"
                        >
                          <p className="font-medium text-text-primary">
                            {plan.label}
                          </p>
                          <p className="mt-1 leading-relaxed">{plan.description}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="leading-relaxed">{terms.rent_note}</p>
                    <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
                      {terms.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-secondary">{copy.loading}</p>
                )}

                {!locked ? (
                  <Form {...submitForm}>
                    <form
                      className="mt-6 space-y-4"
                      onSubmit={submitForm.handleSubmit(onSubmitApplication)}
                      noValidate
                    >
                      <FormField
                        control={submitForm.control}
                        name="accept_fee_terms"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start gap-3">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="mt-1 size-4 accent-brand-primary"
                                  checked={field.value === true}
                                  onChange={(e) =>
                                    field.onChange(e.target.checked)
                                  }
                                  onBlur={field.onBlur}
                                  ref={field.ref}
                                  name={field.name}
                                />
                              </FormControl>
                              <FormLabel className="font-normal leading-relaxed text-text-primary">
                                {copy.acceptTerms}
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <button
                        type="submit"
                        className={primaryBtn}
                        disabled={submitting || !app}
                      >
                        {submitting ? copy.submitting : copy.submit}
                      </button>
                    </form>
                  </Form>
                ) : null}
              </section>
            </div>
          )}
        </>
      )}

      {error ? (
        <p
          className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="mt-6 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-sm text-brand-primary"
          role="status"
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}
