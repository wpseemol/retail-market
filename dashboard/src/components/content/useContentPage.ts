import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { CONTENT_PAGE_META, type ContentPage, type ContentPageKey } from "@/lib/contentPages";
import { toPageApiBody, type PageFormValues } from "@/lib/validators/contentPage";
import { useAuthStore } from "@/store/auth";

/** Load / save / reset one storefront content page (`/api/dashboard/pages/:key`). */
export function useContentPage<K extends ContentPageKey>(key: K) {
  const { token } = useAuthStore();
  const [page, setPage] = useState<ContentPage<K> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const api = CONTENT_PAGE_META[key].api;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ page: ContentPage<K> }>(api, { token })
      .then((data) => {
        if (!cancelled) setPage(data.page);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load the page");
      });
    return () => {
      cancelled = true;
    };
  }, [token, api]);

  const save = useCallback(
    async (values: PageFormValues<K>) => {
      try {
        const data = await apiFetch<{ page: ContentPage<K>; message: string }>(api, {
          method: "PATCH",
          token,
          body: toPageApiBody(values),
        });
        setPage(data.page);
        return { ok: true as const, page: data.page, message: data.message };
      } catch (err) {
        return { ok: false as const, message: err instanceof ApiError ? err.message : "Failed to save the page" };
      }
    },
    [api, token],
  );

  const reset = useCallback(async () => {
    try {
      const data = await apiFetch<{ page: ContentPage<K>; message: string }>(api, { method: "DELETE", token });
      setPage(data.page);
      return { ok: true as const, page: data.page, message: data.message };
    } catch (err) {
      return { ok: false as const, message: err instanceof ApiError ? err.message : "Failed to reset the page" };
    }
  }, [api, token]);

  return { page, loadError, save, reset };
}
