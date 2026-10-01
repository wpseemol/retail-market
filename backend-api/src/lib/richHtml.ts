const SCRIPT_TAG_RE = /<\s*\/?\s*script\b/i;
const PHP_TAG_RE = /<\?(?:php|=)?|\?>/i;
const JS_PROTOCOL_RE = /javascript\s*:/i;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=/i;
const DATA_URI_RE = /data\s*:/i;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "blockquote",
  "code",
  "pre",
  "span",
]);

const VOID_TAGS = new Set(["br"]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (JS_PROTOCOL_RE.test(trimmed) || DATA_URI_RE.test(trimmed)) return false;
  return /^(https?:\/\/|\/|#|mailto:)/i.test(trimmed);
}

/**
 * Allow a TipTap-safe HTML subset for product descriptions.
 * Rejects scripts / event handlers and strips unknown tags.
 */
export function sanitizeProductDescriptionHtml(
  input: string,
): { ok: true; html: string } | { ok: false; message: string } {
  if (SCRIPT_TAG_RE.test(input)) {
    return { ok: false, message: "Script tags are not allowed" };
  }
  if (PHP_TAG_RE.test(input)) {
    return { ok: false, message: "PHP tags are not allowed" };
  }
  if (JS_PROTOCOL_RE.test(input) || EVENT_HANDLER_RE.test(input)) {
    return { ok: false, message: "Unsafe HTML is not allowed" };
  }

  const html = input.replace(
    /<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g,
    (match, rawTag: string, rawAttrs?: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      const isClosing = match.startsWith("</");
      if (isClosing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      if (VOID_TAGS.has(tag)) return `<${tag}>`;

      if (tag === "a") {
        const hrefMatch =
          rawAttrs?.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i) ??
          null;
        const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
        if (!isSafeHref(href)) return "<a>";
        const safe = href.replace(/"/g, "&quot;");
        return `<a href="${safe}" rel="noopener noreferrer" target="_blank">`;
      }

      return `<${tag}>`;
    },
  );

  const collapsed = html.trim();
  if (!collapsed || collapsed === "<p></p>" || collapsed === "<p><br></p>") {
    return { ok: true, html: "" };
  }

  return { ok: true, html: collapsed };
}
