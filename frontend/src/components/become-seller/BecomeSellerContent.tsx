"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch, apiUpload, ApiError } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { selectAuthHydrated, selectAuthUser } from "@/store/authSlice";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
  becomeSellerDraftSchema,
  SELLER_KYC_ACCEPT,
  type BecomeSellerDraftInput,
  validateSellerKycFile,
} from "@/lib/validators/becomeSeller";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SellerKycDocThumb } from "@/components/become-seller/SellerKycDocThumb";

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
  "w-full rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primary disabled:opacity-60";
const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60";
const outlineBtn =
  "inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface px-6 text-sm font-semibold text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary";

export default function BecomeSellerContent() {
  const { t } = useI18n();
  const copy = t.becomeSeller;
  const user = useAppSelector(selectAuthUser);
  const hydrated = useAppSelector(selectAuthHydrated);
  const [terms, setTerms] = useState<PartnerTerms | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
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

  async function saveDraft(values: BecomeSellerDraftInput) {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ application: Application; message: string }>(
        "/api/seller-applications",
        {
          method: "POST",
          body: {
            shop_name: values.shop_name,
            shop_name_bn: values.shop_name_bn || null,
            description: values.description || null,
            contact_phone: values.contact_phone || null,
            business_address: values.business_address || null,
          },
        },
      );
      setSuccess(data.message);
      await loadMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.saveFailed);
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
      await apiUpload("/api/seller-applications/me/documents", fd);
      setSuccess(copy.docUploaded);
      await loadMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.uploadFailed);
    } finally {
      setUploading(null);
    }
  }

  async function submitApplication() {
    if (!acceptTerms) {
      setError(copy.acceptRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/seller-applications/me/submit", {
        method: "POST",
        body: { accept_fee_terms: true },
      });
      setSuccess(copy.submitted);
      await loadMe();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const app = me?.application;
  const locked =
    app?.status === "submitted" ||
    app?.status === "under_review" ||
    app?.status === "approved";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <p className="text-sm font-medium text-brand-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{copy.subtitle}</p>
      </header>

      {!hydrated ? (
        <p className="text-text-secondary">{copy.loading}</p>
      ) : !user ? (
        <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            {copy.stepAccount}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{copy.needAccount}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register?next=/become-seller" className={primaryBtn}>
              {copy.createAccount}
            </Link>
            <Link href="/login?next=/become-seller" className={outlineBtn}>
              {copy.signIn}
            </Link>
          </div>
        </section>
      ) : me?.account.has_shop || me?.account.role === "vendor" ? (
        <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <p className="text-text-primary">{copy.alreadySeller}</p>
          <Link href="/account" className={`${outlineBtn} mt-4`}>
            {copy.goAccount}
          </Link>
        </section>
      ) : !me?.account.email_verified || !me?.account.phone_verified ? (
        <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            {copy.verifyTitle}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{copy.verifyBody}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
            <li>
              {copy.email}:{" "}
              {me?.account.email_verified ? copy.verified : copy.notVerified}
            </li>
            <li>
              {copy.phone}:{" "}
              {me?.account.phone_verified ? copy.verified : copy.notVerified}
            </li>
          </ul>
          <Link href="/account" className={`${primaryBtn} mt-5`}>
            {copy.verifyCta}
          </Link>
        </section>
      ) : (
        <div className="space-y-8">
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

          <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              {copy.stepShop}
            </h2>
            <Form {...form}>
              <form
                className="mt-4 space-y-4"
                onSubmit={form.handleSubmit(saveDraft)}
                noValidate
              >
                {(
                  [
                    ["shop_name", copy.shopName],
                    ["shop_name_bn", copy.shopNameBn],
                    ["contact_phone", copy.contactPhone],
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

          <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              {copy.stepDocs}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {app?.docs_checklist.required_hint || copy.docsHint}
            </p>
            <p className="mt-1 text-xs text-text-secondary">{copy.docsResize}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {DOC_UPLOADS.map((doc) => {
                const existing = app?.documents.find(
                  (d) => d.doc_type === doc.type,
                );
                return (
                  <div
                    key={doc.type}
                    className="rounded-xl border border-border-default p-3"
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
                      <label className="mt-3 inline-flex cursor-pointer text-sm text-brand-primary">
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
              <p className="mt-3 text-sm text-text-secondary">{copy.saveFirst}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border-default bg-bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              {copy.stepTerms}
            </h2>
            {terms ? (
              <div className="mt-3 space-y-3 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">{terms.title}</p>
                <p>{terms.summary}</p>
                <p>
                  {copy.defaultCommission}: {terms.default_commission_percent}%
                </p>
                <ul className="space-y-2">
                  {terms.fee_plans.map((plan) => (
                    <li
                      key={plan.id}
                      className="rounded-lg border border-border-default p-3"
                    >
                      <p className="font-medium text-text-primary">
                        {plan.label}
                      </p>
                      <p className="mt-1">{plan.description}</p>
                    </li>
                  ))}
                </ul>
                <p>{terms.rent_note}</p>
                <ol className="list-decimal space-y-1 pl-5">
                  {terms.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">{copy.loading}</p>
            )}

            {!locked ? (
              <label className="mt-5 flex items-start gap-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>{copy.acceptTerms}</span>
              </label>
            ) : null}

            {!locked ? (
              <button
                type="button"
                className={`${primaryBtn} mt-5`}
                disabled={submitting || !app}
                onClick={() => void submitApplication()}
              >
                {submitting ? copy.submitting : copy.submit}
              </button>
            ) : null}
          </section>
        </div>
      )}

      {error ? (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-6 text-sm text-brand-primary" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
