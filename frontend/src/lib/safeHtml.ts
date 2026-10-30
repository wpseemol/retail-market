/**
 * Allow a TipTap-safe HTML subset for product descriptions (mirrors backend-api richHtml).
 * Strips unknown tags and rejects scripts / event handlers.
 */

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

/** TipTap HTML has visible text (an empty editor still yields `<p></p>`). */
export function hasRichText(html: string | null | undefined): html is string {
  return Boolean(
    html && html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(),
  );
}

/** Strip tags for plain-text blurb / meta fallbacks. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeProductHtml(input: string): string {
  if (!input) return "";
  if (
    SCRIPT_TAG_RE.test(input) ||
    PHP_TAG_RE.test(input) ||
    JS_PROTOCOL_RE.test(input) ||
    EVENT_HANDLER_RE.test(input)
  ) {
    return stripHtml(input);
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
    return "";
  }
  return collapsed;
}
