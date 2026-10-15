import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline problem with an image upload, shown inside the field instead of a toast. */
export function ImageFieldError({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200",
        className,
      )}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <p className="leading-relaxed whitespace-pre-line">{message}</p>
    </div>
  );
}
