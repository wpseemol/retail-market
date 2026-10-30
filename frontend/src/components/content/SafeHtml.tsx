import { sanitizeProductHtml } from "@/lib/safeHtml";
import { cn } from "@/lib/utils";

type SafeHtmlProps = {
  html: string;
  className?: string;
  as?: "div" | "section";
};

/**
 * Renders admin TipTap HTML after a client-side allow-list sanitize.
 * Prefer this over nesting rich HTML inside a raw `<p>`.
 */
export function SafeHtml({ html, className, as: Tag = "div" }: SafeHtmlProps) {
  const safe = sanitizeProductHtml(html);
  if (!safe) return null;
  return (
    <Tag
      className={cn(
        "product-rich-text text-[14px] text-text-secondary leading-relaxed",
        "[&_p]:m-0 [&_p+p]:mt-3",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_a]:text-brand-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_strong]:font-semibold [&_b]:font-semibold",
        "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:text-text-primary",
        "[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-text-primary",
        "[&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-[14px] [&_h4]:font-semibold [&_h4]:text-text-primary",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border-default [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_code]:rounded [&_code]:bg-bg-subtle [&_code]:px-1 [&_code]:text-[13px]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
