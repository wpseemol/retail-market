import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows a toast whenever a page's success / error message changes.
 * Handlers must reset the message to `null` before each request, otherwise
 * repeating the same message will not fire a second toast.
 */
export function useToastMessages(
  success: string | null | undefined,
  error?: string | null,
) {
  useEffect(() => {
    if (success) toast.success(success);
  }, [success]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
}

export type Notice = { tone: "success" | "error"; text: string } | null;

/** Toast for list pages that report results as a `{ tone, text }` notice. */
export function toastNotice(notice: Notice) {
  if (!notice) return;
  if (notice.tone === "success") toast.success(notice.text);
  else toast.error(notice.text);
}
