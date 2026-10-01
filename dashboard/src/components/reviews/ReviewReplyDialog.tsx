import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquareReply } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { ReviewRow } from "@/lib/reviews";
import { reviewReplyFormSchema, type ReviewReplyFormValues } from "@/lib/validators/review";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ReviewStars } from "./ReviewStars";

export function ReviewReplyDialog({
  review,
  onOpenChange,
  onSubmit,
  onRemove,
}: {
  review: ReviewRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (review: ReviewRow, reply: string) => Promise<void>;
  onRemove: (review: ReviewRow) => Promise<boolean>;
}) {
  const form = useForm<ReviewReplyFormValues>({
    resolver: zodResolver(reviewReplyFormSchema),
    defaultValues: { reply: "" },
  });

  useEffect(() => {
    if (review) form.reset({ reply: review.vendor_reply ?? "" });
  }, [review, form]);

  const submitting = form.formState.isSubmitting;
  const length = form.watch("reply").length;

  async function handleSubmit(values: ReviewReplyFormValues) {
    if (!review) return;
    try {
      await onSubmit(review, values.reply);
      onOpenChange(false);
    } catch (err) {
      form.setError("root", { message: err instanceof ApiError ? err.message : "Could not save the reply" });
    }
  }

  async function handleRemove() {
    if (!review) return;
    try {
      if (await onRemove(review)) onOpenChange(false);
    } catch (err) {
      form.setError("root", { message: err instanceof ApiError ? err.message : "Could not remove the reply" });
    }
  }

  return (
    <Dialog open={review !== null} onOpenChange={(open) => !submitting && onOpenChange(open)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareReply className="size-4 text-brand-primary" />
            {review?.vendor_reply ? "Edit public reply" : "Reply to review"}
          </DialogTitle>
          <DialogDescription>
            Your reply is shown under the review on the product page. The customer&apos;s rating and text can&apos;t be changed.
          </DialogDescription>
        </DialogHeader>

        {review ? (
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{review.author_name}</span>
              <ReviewStars rating={review.rating} />
            </div>
            {review.title ? <p className="mt-1.5 font-medium">{review.title}</p> : null}
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-muted-foreground">{review.comment}</p>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant reply</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      maxLength={1000}
                      placeholder="Thank the customer or explain how you resolved their issue."
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Plain text only — links and HTML are blocked.</span>
                    <span className="tabular-nums">{length}/1000</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-between">
              {review?.vendor_reply ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void handleRemove()}
                  disabled={submitting}
                >
                  Remove reply
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : null}
                  Publish reply
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
