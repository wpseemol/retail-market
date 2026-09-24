import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Category } from "@/lib/categories";
import { getCategoryLucideIcon } from "@/lib/icons";
import {
  firstZodError,
  validateCategoryForm,
  validateCategoryImageFile,
} from "@/lib/validators/category";
import { useAuthStore } from "@/store/auth";
import { CategoryIconPicker } from "@/components/categories/CategoryIconPicker";
import {
  CategoryCoverDropzone,
  CategoryFormHeader,
  CategoryFormSection,
  CategoryLivePreview,
  CategoryStickyActions,
} from "@/components/categories/CategoryFormShell";
import { Badge } from "@/components/ui/badge";
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

export function CategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [parents, setParents] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState("active");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, listRes] = await Promise.all([
          apiFetch<{ category: Category }>(
            `/api/dashboard/categories/${id}`,
            { token },
          ),
          apiFetch<{ categories: Category[] }>(
            "/api/dashboard/categories?limit=100&active=all",
            { token },
          ),
        ]);
        if (cancelled) return;
        const next = catRes.category;
        setCategory(next);
        setName(next.name);
        setSlug(next.slug);
        setDescription(next.description ?? "");
        setIcon(next.icon ?? null);
        setParentId(next.parent_id ?? "");
        setIsActive(next.is_active ? "active" : "inactive");
        setSortOrder(String(next.sort_order ?? 0));
        setParents(listRes.categories.filter((c) => c.id !== id));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load category",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const parentName = useMemo(
    () => parents.find((p) => p.id === parentId)?.name ?? null,
    [parents, parentId],
  );

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;

    const parsed = validateCategoryForm({
      name,
      slug,
      description,
      icon,
      parent_id: parentId || null,
      is_active: isActive === "active",
      sort_order: sortOrder,
    });
    if (!parsed.success) {
      setSaveError(firstZodError(parsed));
      setSaveSuccess(null);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const data = await apiFetch<{ category: Category }>(
        `/api/dashboard/categories/${id}`,
        {
          method: "PATCH",
          token,
          body: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description ?? null,
            icon: parsed.data.icon ?? null,
            parent_id: parsed.data.parent_id ?? null,
            is_active: parsed.data.is_active,
            sort_order: parsed.data.sort_order,
          },
        },
      );
      setCategory(data.category);
      setSaveSuccess("Category saved");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onUploadCover(file: File | null) {
    if (!token || !id || !file) return;
    const checked = validateCategoryImageFile(file);
    if (!checked.ok) {
      setSaveError(checked.message);
      setSaveSuccess(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setIconUploading(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const data = await apiUpload<{ category: Category }>(
        `/api/dashboard/categories/${id}/image`,
        form,
        { token },
      );
      setCategory(data.category);
      setSaveSuccess("Cover image updated");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Cover upload failed",
      );
    } finally {
      setIconUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    if (!window.confirm("Delete this category? Stores keep their products.")) {
      return;
    }
    setDeleting(true);
    setSaveError(null);
    try {
      await apiFetch(`/api/dashboard/categories/${id}`, {
        method: "DELETE",
        token,
      });
      navigate("/categories");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to delete category",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-96 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? "Not found"}</p>
        <Button asChild variant="outline">
          <Link to="/categories">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <CategoryFormHeader
        title={category.name}
        subtitle={`Update icon, cover, hierarchy, and visibility · /${category.slug}`}
        badge={
          <Badge
            variant="outline"
            className={
              category.is_active
                ? "border-brand-primary/30 bg-brand-tint/60 capitalize text-brand-deep"
                : "capitalize"
            }
          >
            {category.is_active ? "active" : "inactive"}
          </Badge>
        }
      />

      <form
        onSubmit={onSave}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-5">
          <CategoryFormSection
            step="01"
            title="Visual identity"
            description="Change the SVG icon or cover photo shown in catalog views."
          >
            <CategoryIconPicker
              value={icon}
              onChange={setIcon}
              disabled={saving}
              compact
            />
            <CategoryCoverDropzone
              previewUrl={category.image?.path}
              uploading={iconUploading}
              disabled={saving}
              inputRef={fileRef}
              onPick={() => fileRef.current?.click()}
              onFile={(file) => void onUploadCover(file)}
            />
          </CategoryFormSection>

          <CategoryFormSection
            step="02"
            title="Category details"
            description="Name, slug, parent, sort order, and publish status."
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(slugifyClient(e.target.value))}
                  required
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
                    <SelectValue />
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
              saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError}
                </p>
              ) : saveSuccess ? (
                <p className="text-brand-primary" role="status">
                  {saveSuccess}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {category.products_count ?? 0} product
                  {(category.products_count ?? 0) === 1 ? "" : "s"} linked
                </p>
              )
            }
          >
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || saving}
              onClick={() => void onDelete()}
            >
              <Trash2 />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/categories">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CategoryStickyActions>
        </div>

        <CategoryLivePreview
          mode="edit"
          name={name}
          slug={slug}
          description={description}
          icon={icon}
          coverUrl={category.image?.path}
          parentName={parentName}
          isActive={isActive === "active"}
          sortOrder={sortOrder}
          productsCount={category.products_count ?? 0}
          childrenCount={category.children_count ?? 0}
        />
      </form>
    </div>
  );
}
