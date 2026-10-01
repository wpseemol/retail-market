"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { format } from "@/i18n/config";
import {
  REVIEW_MAX_PHOTOS,
  REVIEW_PHOTO_MAX_BYTES,
  type CreateReviewResponse,
  type EligibilityResponse,
  type OwnReview,
  type ReviewImage,
  type ReviewStatus,
  type UpdateReviewResponse,
} from "@/lib/reviews";
import {
  createReviewContactSchema,
  createReviewSchema,
  parseReviewContact,
  type ReviewContactValues,
  type ReviewValues,
} from "@/lib/validators/review";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { ReviewStars, StarIcon } from "./ReviewStars";

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-border-default bg-bg-base px-3.5 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-brand-primary aria-invalid:border-error";
const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border-default px-5 text-[14px] font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const DANGER_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-error px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Step = "checking" | "contact" | "manage" | "review" | "done";
type Photo = { file: File; preview: string };
type ReviewContact = { email?: string; phone?: string };

const STATUS_TONE: Record<ReviewStatus, string> = {
  approved: "bg-brand-tint text-brand-deep",
  pending: "bg-warning/15 text-warning",
  hidden: "bg-bg-subtle text-text-secondary",
  rejected: "bg-error/10 text-error",
};

function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "error"
          ? "border-error/40 bg-error/10 text-error"
          : "border-brand-primary/40 bg-brand-tint text-brand-deep",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="m-0">{children}</p>
    </div>
  );
}

function RatingPicker({
  value,
  onChange,
  labels,
  rateLabel,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  labels: string[];
  rateLabel: string;
  invalid: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-invalid={invalid} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={format(rateLabel, { star })}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
          >
            <StarIcon size={28} fill={star <= shown ? 1 : 0} />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-[13px] font-medium text-text-secondary">{labels[shown - 1]}</span>}
    </div>
  );
}

function PhotoThumb({ src, removeLabel, onRemove }: { src: string; removeLabel: string; onRemove: () => void }) {
  return (
    <div className="relative size-20 overflow-hidden rounded-lg border border-border-default bg-bg-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Write, edit or delete a review. Guests prove the purchase with their checkout email or
 * phone; signed-in customers are matched by their account automatically.
 */
export default function WriteReviewDialog({
  productSlug,
  productName,
  trigger,
  onChanged,
}: {
  productSlug: string;
  productName: string;
  trigger: React.ReactNode;
  /** Called after a review is created, updated or deleted. */
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const copy = t.reviews.dialog;
  const user = useAppSelector((state) => state.auth.user);
  const contactSchema = useMemo(() => createReviewContactSchema(t.reviews.validation), [t]);
  const reviewSchema = useMemo(() => createReviewSchema(t.reviews.validation), [t]);
  const reviewsPath = `/api/products/${encodeURIComponent(productSlug)}/reviews`;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("contact");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [contact, setContact] = useState<ReviewContact | null>(null);
  const [orderName, setOrderName] = useState("");
  const [ownReview, setOwnReview] = useState<OwnReview | null>(null);
  const [keptImages, setKeptImages] = useState<ReviewImage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<Photo[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  const contactForm = useForm<ReviewContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { contact: "" },
  });
  const reviewForm = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { name: "", rating: 5, comment: "" },
  });

  function clearPhotos() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    setPhotoError(null);
  }

  function reset() {
    setStep("contact");
    setMode("create");
    setContact(null);
    setOrderName("");
    setOwnReview(null);
    setKeptImages([]);
    setNotice(null);
    setDoneMessage("");
    clearPhotos();
    contactForm.reset({ contact: "" });
    reviewForm.reset({ name: "", rating: 5, comment: "" });
  }

  function errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.status === 429) return copy.rateLimited;
      if (error.code === "REVIEW_NOT_OWNER") return copy.notOwner;
      if (error.code === "REVIEW_NOT_ELIGIBLE" || error.status === 403) return copy.notVerified;
      if (error.code === "REVIEW_ALREADY_SUBMITTED" || error.status === 409) return copy.alreadyReviewed;
      if (error.status === 400 && error.message) return error.message;
    }
    return copy.genericError;
  }

  async function verify(body: ReviewContact, automatic = false) {
    setNotice(null);
    if (automatic) setStep("checking");
    try {
      const result = await apiFetch<EligibilityResponse>(`${reviewsPath}/check-eligibility`, {
        method: "POST",
        body,
      });
      if (result.canReview) {
        setContact(body);
        setOrderName(result.authorName);
        reviewForm.reset({ name: result.authorName, rating: 5, comment: "" });
        setMode("create");
        setStep("review");
        return;
      }
      if (result.reason === "already_reviewed" && result.review) {
        setContact(body);
        setOwnReview(result.review);
        setStep("manage");
        return;
      }
      setStep("contact");
      setNotice(result.reason === "already_reviewed" ? copy.alreadyReviewed : copy.notVerified);
    } catch (error) {
      setStep("contact");
      setNotice(errorMessage(error));
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && user && step === "contact" && !contact) {
      contactForm.reset({ contact: user.phone || user.email });
      void verify({ email: user.email, ...(user.phone ? { phone: user.phone } : {}) }, true);
    }
    if (!next && step === "done") reset();
  }

  async function checkContact(values: ReviewContactValues) {
    const body = parseReviewContact(values.contact);
    if (body) await verify(body);
  }

  function startEdit() {
    if (!ownReview) return;
    setNotice(null);
    clearPhotos();
    setKeptImages(ownReview.images);
    setOrderName(ownReview.author_name);
    reviewForm.reset({ name: ownReview.author_name, rating: ownReview.rating, comment: ownReview.comment });
    setMode("edit");
    setStep("review");
  }

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoError(null);
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      if (keptImages.length + photos.length + next.length >= REVIEW_MAX_PHOTOS) {
        setPhotoError(format(copy.tooManyPhotos, { max: REVIEW_MAX_PHOTOS }));
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setPhotoError(copy.photoType);
        continue;
      }
      if (file.size > REVIEW_PHOTO_MAX_BYTES) {
        setPhotoError(copy.photoSize);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    if (next.length) setPhotos((current) => [...current, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.preview);
      return current.filter((_, i) => i !== index);
    });
  }

  async function submitReview(values: ReviewValues) {
    if (!contact) return;
    setNotice(null);
    const formData = new FormData();
    if (contact.email) formData.append("email", contact.email);
    if (contact.phone) formData.append("phone", contact.phone);
    if (values.name !== orderName) formData.append("author_name", values.name);
    formData.append("rating", String(values.rating));
    formData.append("comment", values.comment);
    photos.forEach((photo) => formData.append("images", photo.file));

    try {
      if (mode === "edit" && ownReview) {
        if (ownReview.title) formData.append("title", ownReview.title);
        keptImages.forEach((image) => formData.append("keep_images", image.id));
        const result = await apiUpload<UpdateReviewResponse>(`${reviewsPath}/${ownReview.id}`, formData, "PATCH");
        setOwnReview(result.review);
        setDoneMessage(result.status === "approved" ? copy.updatedLive : copy.updatedPending);
      } else {
        const result = await apiUpload<CreateReviewResponse>(reviewsPath, formData);
        setDoneMessage(result.status === "approved" ? copy.successLive : copy.successPending);
      }
      clearPhotos();
      setStep("done");
      onChanged();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        for (const field of ["name", "rating", "comment"] as const) {
          const message = error.errors[field === "name" ? "author_name" : field]?.[0];
          if (message) reviewForm.setError(field, { message });
        }
      }
      setNotice(errorMessage(error));
    }
  }

  async function deleteReview() {
    if (!ownReview || !contact) return;
    setDeleting(true);
    try {
      await apiFetch(`${reviewsPath}/${ownReview.id}`, { method: "DELETE", body: contact });
      setConfirmOpen(false);
      setOwnReview(null);
      setDoneMessage(copy.deleted);
      setStep("done");
      onChanged();
    } catch (error) {
      setConfirmOpen(false);
      setNotice(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const contactSubmitting = contactForm.formState.isSubmitting;
  const reviewSubmitting = reviewForm.formState.isSubmitting;
  const commentLength = useWatch({ control: reviewForm.control, name: "comment" })?.length ?? 0;
  const photoCount = keptImages.length + photos.length;
  const title = step === "manage" ? copy.manageTitle : mode === "edit" && step === "review" ? copy.editTitle : copy.title;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel={copy.close} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>

        {step === "checking" && (
          <p role="status" className="m-0 flex items-center gap-2 py-6 text-[14px] text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {copy.checking}
          </p>
        )}

        {step === "contact" && (
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(checkContact)} noValidate className="flex flex-col gap-4">
              <p className="m-0 text-[13px] leading-relaxed text-text-secondary">{copy.verifyIntro}</p>
              <FormField
                control={contactForm.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{copy.contact}</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={copy.contactPlaceholder}
                        className={INPUT_CLASS}
                      />
                    </FormControl>
                    <FormDescription>{copy.contactHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {notice && <Notice tone="error">{notice}</Notice>}
              <DialogFooter>
                <button type="submit" disabled={contactSubmitting} className={PRIMARY_BUTTON}>
                  {contactSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {contactSubmitting ? copy.verifying : copy.verify}
                </button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === "manage" && ownReview && (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[13px] leading-relaxed text-text-secondary">{copy.manageIntro}</p>
            <article className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-subtle p-4">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-[14px] font-semibold text-text-primary">{ownReview.author_name}</span>
                <ReviewStars
                  rating={ownReview.rating}
                  size={14}
                  label={format(t.reviews.starsLabel, { rating: ownReview.rating })}
                />
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold sm:ml-auto",
                    STATUS_TONE[ownReview.status],
                  )}
                >
                  {copy.status[ownReview.status]}
                </span>
              </header>
              <p className="m-0 text-[13px] leading-relaxed whitespace-pre-line text-text-secondary">
                {ownReview.comment}
              </p>
              {ownReview.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ownReview.images.map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={image.id}
                      src={image.url}
                      alt=""
                      className="size-16 rounded-lg border border-border-default object-cover"
                    />
                  ))}
                </div>
              )}
            </article>
            {notice && <Notice tone="error">{notice}</Notice>}
            <DialogFooter className="sm:justify-between">
              <button type="button" className={SECONDARY_BUTTON} onClick={() => setConfirmOpen(true)}>
                <Trash2 className="size-4 text-error" aria-hidden="true" />
                {copy.delete}
              </button>
              <button type="button" className={PRIMARY_BUTTON} onClick={startEdit}>
                <Pencil className="size-4" aria-hidden="true" />
                {copy.edit}
              </button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && (
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(submitReview)} noValidate className="flex flex-col gap-4">
              {mode === "create" && <Notice tone="success">{copy.verifiedNotice}</Notice>}
              <FormField
                control={reviewForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{copy.name}</FormLabel>
                    <FormControl>
                      <input {...field} maxLength={80} autoComplete="name" className={INPUT_CLASS} />
                    </FormControl>
                    <FormDescription>{copy.nameHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reviewForm.control}
                name="rating"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{copy.rating}</FormLabel>
                    <FormControl>
                      <RatingPicker
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        labels={copy.ratingLabels}
                        rateLabel={copy.rateStar}
                        invalid={Boolean(fieldState.error)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reviewForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{copy.comment}</FormLabel>
                      <span className="text-[12px] text-text-secondary tabular-nums">
                        {format(copy.commentCount, { count: commentLength })}
                      </span>
                    </div>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={5}
                        maxLength={2000}
                        placeholder={copy.commentPlaceholder}
                        className={cn(INPUT_CLASS, "h-auto min-h-28 resize-y py-3 leading-relaxed")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2">
                <Label htmlFor="review-photos">{copy.photos}</Label>
                <div className="flex flex-wrap gap-2.5">
                  {keptImages.map((image, index) => (
                    <PhotoThumb
                      key={image.id}
                      src={image.url}
                      removeLabel={format(copy.removePhoto, { index: index + 1 })}
                      onRemove={() => setKeptImages((current) => current.filter((item) => item.id !== image.id))}
                    />
                  ))}
                  {photos.map((photo, index) => (
                    <PhotoThumb
                      key={photo.preview}
                      src={photo.preview}
                      removeLabel={format(copy.removePhoto, { index: keptImages.length + index + 1 })}
                      onRemove={() => removePhoto(index)}
                    />
                  ))}
                  {photoCount < REVIEW_MAX_PHOTOS && (
                    <label
                      htmlFor="review-photos"
                      className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-default text-center text-[11px] text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
                    >
                      <ImagePlus className="size-5" aria-hidden="true" />
                      {copy.addPhoto}
                    </label>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="review-photos"
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  multiple
                  className="sr-only"
                  onChange={(event) => addPhotos(event.target.files)}
                />
                <p className="m-0 text-[12px] text-text-secondary">
                  {format(copy.photosHint, { max: REVIEW_MAX_PHOTOS })}
                </p>
                {photoError && (
                  <p role="alert" className="m-0 text-[12px] font-medium text-error">
                    {photoError}
                  </p>
                )}
              </div>

              {notice && <Notice tone="error">{notice}</Notice>}
              <DialogFooter className="sm:justify-between">
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() => {
                    setNotice(null);
                    clearPhotos();
                    setStep(mode === "edit" ? "manage" : "contact");
                  }}
                >
                  {mode === "edit" ? copy.cancel : copy.changeContact}
                </button>
                <button type="submit" disabled={reviewSubmitting} className={PRIMARY_BUTTON}>
                  {reviewSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {mode === "edit"
                    ? reviewSubmitting
                      ? copy.saving
                      : copy.saveChanges
                    : reviewSubmitting
                      ? copy.submitting
                      : copy.submit}
                </button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-4">
            <Notice tone="success">{doneMessage}</Notice>
            <DialogFooter>
              <button type="button" className={PRIMARY_BUTTON} onClick={() => handleOpenChange(false)}>
                {copy.done}
              </button>
            </DialogFooter>
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={(next) => !deleting && setConfirmOpen(next)}>
          <DialogContent closeLabel={copy.close} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{copy.deleteConfirmTitle}</DialogTitle>
              <DialogDescription>{copy.deleteConfirmBody}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button" disabled={deleting} className={SECONDARY_BUTTON}>
                  {copy.cancel}
                </button>
              </DialogClose>
              <button type="button" disabled={deleting} onClick={deleteReview} className={DANGER_BUTTON}>
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {deleting ? copy.deleting : copy.delete}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
