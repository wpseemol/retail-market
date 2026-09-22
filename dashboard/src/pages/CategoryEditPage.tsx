import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FolderTree, ImagePlus, Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Category } from "@/lib/categories";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState("active");
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
        setParentId(next.parent_id ?? "");
        setIsActive(next.is_active ? "active" : "inactive");
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

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !id) return;
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
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            parent_id: parentId || null,
            is_active: isActive === "active",
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

  async function onUploadIcon(file: File | null) {
    if (!token || !id || !file) return;
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
      setSaveSuccess("Category icon updated");
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Icon upload failed",
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
      <p className="text-sm text-muted-foreground">Loading category…</p>
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/categories">
              <ArrowLeft />
              Categories
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            /{category.slug}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {category.is_active ? "active" : "inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <FolderTree className="size-4" />
          </div>
          <CardTitle>Edit category</CardTitle>
          <CardDescription>
            Changes apply to the shared catalog for all stores.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category icon</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {category.image?.path ? (
                    <img
                      src={category.image.path}
                      alt={category.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) =>
                      void onUploadIcon(e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={iconUploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {iconUploading ? "Uploading…" : "Change icon"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveSuccess ? (
              <p className="text-sm text-brand-primary" role="status">
                {saveSuccess}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              <Trash2 />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
