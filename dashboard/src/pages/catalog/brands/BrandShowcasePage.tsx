import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { FormPageHeader } from "@/components/dashboard/page-shell";
import { ShowcaseEditor } from "@/components/showcase/ShowcaseEditor";
import { TAXONOMY_MANAGE_ROLES } from "@/lib/rbac";
import type { ShowcasePayload } from "@/lib/showcase";
import { useAuthStore } from "@/store/auth";

/** `/brands/:id/showcase` — admins for any brand, vendors for brands linked to their store. */
export function BrandShowcasePage() {
  const { id = "" } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [payload, setPayload] = useState<ShowcasePayload | null>(null);
  const onLoaded = useCallback((p: ShowcasePayload) => setPayload(p), []);
  const canManage = Boolean(user && TAXONOMY_MANAGE_ROLES.includes(user.role));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <FormPageHeader
        backTo={canManage ? `/brands/${id}` : "/brands?mine=1"}
        backLabel={canManage ? "Back to brand" : "My brands"}
        title={payload?.name ? `${payload.name} — brand page` : "Brand page"}
        subtitle="Design the public page at /brands/… — logo, banner, layout, story, policies and SEO. Name, slug and visibility are managed by admins."
      />
      <ShowcaseEditor kind="brand" apiBase={`/api/dashboard/brands/${encodeURIComponent(id)}`} onLoaded={onLoaded} />
    </div>
  );
}
