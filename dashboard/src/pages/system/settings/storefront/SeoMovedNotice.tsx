import { Link } from "react-router-dom";
import { ArrowRight, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Points super admins to Marketing & SEO, which now owns search and share metadata. */
export function SeoMovedNotice({ what }: { what: string }) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-primary/30 bg-brand-tint/30 p-4 sm:flex-row sm:items-center">
            <SearchCheck className="size-5 shrink-0 text-brand-primary" aria-hidden="true" />
            <p className="flex-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{what}</span> are managed in{" "}
                <span className="font-medium text-foreground">Marketing &amp; SEO</span>, with a search preview,
                per-page defaults and verification codes.
            </p>
            <Button asChild variant="outline" size="sm">
                <Link to="/seo">
                    Open SEO settings
                    <ArrowRight className="size-3.5" />
                </Link>
            </Button>
        </div>
    );
}
