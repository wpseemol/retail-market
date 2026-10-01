import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const TAG_RE = /^(site-settings|stores|brands|sitemap|reviews|(store|brand):[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const MAX_TAGS = 20;

function secretMatches(given: string | null) {
    const expected = process.env.REVALIDATE_SECRET ?? "";
    if (!expected || !given) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by backend-api after store / brand / SEO edits so pages refresh at once
 * instead of waiting for the 60 s fetch cache. Header `x-revalidate-secret` must match
 * `REVALIDATE_SECRET`; body `{ tags: string[] }`.
 */
export async function POST(req: NextRequest) {
    if (!secretMatches(req.headers.get("x-revalidate-secret"))) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const raw = (body as { tags?: unknown })?.tags;
    const tags = Array.isArray(raw)
        ? [...new Set(raw.filter((t): t is string => typeof t === "string" && TAG_RE.test(t)))].slice(0, MAX_TAGS)
        : [];
    if (tags.length === 0) {
        return NextResponse.json({ message: "No valid tags" }, { status: 400 });
    }

    for (const tag of tags) revalidateTag(tag, { expire: 0 });
    return NextResponse.json({ revalidated: tags });
}
