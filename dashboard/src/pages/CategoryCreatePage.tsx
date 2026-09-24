import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Category } from "@/lib/categories";
import { useAuthStore } from "@/store/auth";
import { CategoryIconPicker } from "@/components/categories/CategoryIconPicker";
import {
  CategoryCoverDropzone,
  CategoryFormHeader,
  CategoryFormSection,
  CategoryLivePreview,
  CategoryStickyActions,
} from "@/components/categories/CategoryFormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryLucideIcon } from "@/lib/categoryIcons";

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string | null>("ShoppingBag");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState("active");
  const [sortOrder, setSortOrder] = useState("0");
  const [parents, setParents] = useState<Category[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<{ categories: Category[] }>(
          "/api/dashboard/categories?limit=100&active=all",
          { token },
        );
        if (!cancelled) setParents(data.categories);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || slugTouched || name.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/categories/slug-preview?name=${encodeURIComponent(name.trim())}`,
            { token },
          );
          setSlug(data.slug);
        } catch {
          setSlug(slugifyClient(name));
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [name, slugTouched, token]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const parentName = useMemo(
    () => parents.find((p) => p.id === parentId)?.name ?? null,
    [parents, parentId],
  );

  function onPickCover(file: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ category: Category }>(
        "/api/dashboard/categories",
        {
          method: "POST",
          token,
          body: {
            name: name.trim(),
            slug: slug.trim() || undefined,
            description: description.trim() || null,
            icon: icon || null,
            parent_id: parentId || null,
            is_active: isActive === "active",
            sort_order: Number(sortOrder) || 0,
          },
        },
      );

      if (coverFile) {
        const form = new FormData();
        form.append("image", coverFile);
        await apiUpload<{ category: Category }>(
          `/api/dashboard/categories/${data.category.id}/image`,
          form,
          { token },
        );
      }

      navigate(`/categories/${data.category.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create category",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <CategoryFormHeader
        title="Add category"
        subtitle="Design the catalog entry with an SVG icon, details, and an optional cover photo."
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <CategoryFormSection
            step="01"
            title="Visual identity"
            description="Pick an SVG icon and optional cover used across admin and storefront."
          >
            <CategoryIconPicker
              value={icon}
              onChange={setIcon}
              disabled={loading}
              compact
            />
            <CategoryCoverDropzone
              previewUrl={coverPreview}
              disabled={loading}
              inputRef={fileRef}
              onPick={() => fileRef.current?.click()}
              onFile={onPickCover}
              onClear={
                coverFile
                  ? () => {
                      onPickCover(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }
                  : undefined
              }
            />
          </CategoryFormSection>

          <CategoryFormSection
            step="02"
            title="Category details"
            description="Name, slug, hierarchy, and visibility for the shared catalog."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  placeholder="Electronics"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug {previewing ? "(updating…)" : ""}
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugifyClient(e.target.value));
                  }}
                  placeholder="electronics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort">Sort order</Label>
                <Input
                  id="sort"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional short description shown in catalog"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Parent category</Label>
                <Select
                  value={parentId || "none"}
                  onValueChange={(value) =>
                    setParentId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None (top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top level)</SelectItem>
                    {parents.map((p) => {
                      const Icon = getCategoryLucideIcon(p.icon);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="inline-flex items-center gap-2">
                            <Icon className="size-3.5 text-brand-deep" />
                            {p.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={isActive} onValueChange={setIsActive}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CategoryFormSection>

          <CategoryStickyActions
            message={
              error ? (
                <p className="text-destructive" role="alert">
                  {error}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Ready when the name looks good.
                </p>
              )
            }
          >
            <Button asChild type="button" variant="outline">
              <Link to="/categories">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? "Creating…" : "Create category"}
            </Button>
          </CategoryStickyActions>
        </div>

        <CategoryLivePreview
          mode="create"
          name={name}
          slug={slug}
          description={description}
          icon={icon}
          coverUrl={coverPreview}
          parentName={parentName}
          isActive={isActive === "active"}
          sortOrder={sortOrder}
        />
      </form>
    </div>
  );
}
