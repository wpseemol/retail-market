import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { FormPageHeader } from "@/components/dashboard/page-shell";
import { ShowcaseEditor } from "@/components/showcase/ShowcaseEditor";
import { Badge } from "@/components/ui/badge";
import { STORE_MANAGE_ROLES } from "@/lib/rbac";
import type { ShowcasePayload } from "@/lib/showcase";
import { useAuthStore } from "@/store/auth";

/** `/stores/:slug/design` — public store page: branding, layout, about, policies, announcement, SEO. */
export function StoreDesignPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const user = useAuthStore((s) => s.user);
  const [payload, setPayload] = useState<ShowcasePayload | null>(null);
  const onLoaded = useCallback((p: ShowcasePayload) => setPayload(p), []);

  const canManage = Boolean(user && STORE_MANAGE_ROLES.includes(user.role));
  const isOverride = Boolean(payload && !payload.owned_by_actor && user?.role !== "vendor");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <FormPageHeader
        backTo={canManage ? `/stores/${slug}` : "/stores"}
        backLabel={canManage ? "Back to store settings" : "All stores"}
        title={payload?.shop_name ? `${payload.shop_name} — store page` : "Store page"}
        subtitle="Design the public page shoppers see at /stores/… — branding, section layout, story, policies and SEO."
        badge={
          isOverride ? (
            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-3" />
              Admin override — changes are logged
            </Badge>
          ) : null
        }
      />
      <ShowcaseEditor kind="store" apiBase={`/api/dashboard/shops/${encodeURIComponent(slug)}`} onLoaded={onLoaded} />
    </div>
  );
}
