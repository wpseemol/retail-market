import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderTree, ImagePlus } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Category } from "@/lib/categories";
import { useAuthStore } from "@/store/auth";
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

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState("active");
  const [parents, setParents] = useState<Category[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
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
      if (iconPreview) URL.revokeObjectURL(iconPreview);
    };
  }, [iconPreview]);

  function onPickIcon(file: File | null) {
    if (iconPreview) URL.revokeObjectURL(iconPreview);
    setIconFile(file);
    setIconPreview(file ? URL.createObjectURL(file) : null);
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
            parent_id: parentId || null,
            is_active: isActive === "active",
          },
        },
      );

      if (iconFile) {
        const form = new FormData();
        form.append("image", iconFile);
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/categories">
            <ArrowLeft />
            Categories
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Add category
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform category shared by all stores when they add products.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <FolderTree className="size-4" />
          </div>
          <CardTitle>Category details</CardTitle>
          <CardDescription>
            Only super admin, admin, and moderator can create categories.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category icon</Label>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt="Category icon preview"
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
                    onChange={(e) => onPickIcon(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose icon
                  </Button>
                  {iconFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onPickIcon(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
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
                placeholder="Electronics"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug {previewing ? "(updating…)" : "(unique)"}
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
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description"
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
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading || name.trim().length < 2}
            >
              {loading ? "Creating…" : "Create category"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
