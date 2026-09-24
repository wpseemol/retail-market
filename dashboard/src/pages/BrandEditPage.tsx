import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Brand } from "@/lib/brands";
import {
  brandFormSchema,
  toBrandApiBody,
  validateBrandImageFile,
  type BrandFormValues,
} from "@/lib/validators/brand";
import { useAuthStore } from "@/store/auth";
import {
  BrandFormHeader,
  BrandFormSection,
  BrandImageDropzone,
  BrandLivePreview,
  BrandStickyActions,
} from "@/components/brands/BrandFormShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function BrandEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      is_active: true,
      sort_order: 0,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await apiFetch<{ brand: Brand }>(
          `/api/dashboard/brands/${id}`,
          { token },
        );
        if (cancelled) return;
        setBrand(data.brand);
        form.reset({
          name: data.brand.name,
          slug: data.brand.slug,
          description: data.brand.description ?? "",
          is_active: data.brand.is_active,
          sort_order: data.brand.sort_order ?? 0,
        });
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load brand",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id, form]);

  const name = form.watch("name");
  const slug = form.watch("slug");
  const description = form.watch("description");
  const isActive = form.watch("is_active");
  const sortOrder = form.watch("sort_order");

  async function onSubmit(values: BrandFormValues) {
    if (!token || !id) return;
    setSubmitError(null);
    setSaveSuccess(null);
    try {
      const data = await apiFetch<{ brand: Brand }>(
        `/api/dashboard/brands/${id}`,
        {
          method: "PATCH",
          token,
          body: toBrandApiBody(values),
        },
      );
      setBrand(data.brand);
      setSaveSuccess("Brand saved");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to save brand",
      );
    }
  }

  async function onUploadImage(file: File | null) {
    if (!token || !id || !file) return;
    const checked = validateBrandImageFile(file);
    if (!checked.ok) {
      setSubmitError(checked.message);
      setSaveSuccess(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setImageUploading(true);
    setSubmitError(null);
    setSaveSuccess(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await apiUpload<{ brand: Brand }>(
        `/api/dashboard/brands/${id}/image`,
        formData,
        { token },
      );
      setBrand(data.brand);
      setSaveSuccess("Brand image updated");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Image upload failed",
      );
    } finally {
      setImageUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete() {
    if (!token || !id) return;
    if (!window.confirm("Delete this brand? Products keep their data.")) return;
    setDeleting(true);
    setSubmitError(null);
    try {
      await apiFetch(`/api/dashboard/brands/${id}`, {
        method: "DELETE",
        token,
      });
      navigate("/brands");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to delete brand",
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

  if (loadError || !brand) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{loadError ?? "Not found"}</p>
        <Button asChild variant="outline">
          <Link to="/brands">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <BrandFormHeader
        title={brand.name}
        subtitle={`Update logo and brand details · /${brand.slug}`}
        badge={
          <Badge
            variant="outline"
            className={
              brand.is_active
                ? "border-brand-primary/30 bg-brand-tint/60 capitalize text-brand-deep"
                : "capitalize"
            }
          >
            {brand.is_active ? "active" : "inactive"}
          </Badge>
        }
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          noValidate
        >
          <div className="space-y-5">
            <BrandFormSection
              step="01"
              title="Brand identity"
              description="Logo, name, and slug shown when assigning brands to products."
            >
              <BrandImageDropzone
                previewUrl={brand.image?.path}
                uploading={imageUploading}
                disabled={form.formState.isSubmitting || deleting}
                inputRef={fileRef}
                onPick={() => fileRef.current?.click()}
                onFile={(file) => void onUploadImage(file)}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) =>
                          field.onChange(slugifyClient(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase letters, numbers, and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </BrandFormSection>

            <BrandFormSection
              step="02"
              title="Details & visibility"
              description="Description, sort order, and active status."
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value ? "active" : "inactive"}
                        onValueChange={(v) => field.onChange(v === "active")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </BrandFormSection>

            <BrandStickyActions
              message={
                submitError ? (
                  <p className="text-destructive" role="alert">
                    {submitError}
                  </p>
                ) : saveSuccess ? (
                  <p className="text-brand-primary" role="status">
                    {saveSuccess}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {brand.products_count ?? 0} product
                    {(brand.products_count ?? 0) === 1 ? "" : "s"} linked
                  </p>
                )
              }
            >
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || form.formState.isSubmitting}
                onClick={() => void onDelete()}
              >
                <Trash2 />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/brands">Cancel</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </BrandStickyActions>
          </div>

          <BrandLivePreview
            mode="edit"
            name={name}
            slug={slug}
            description={description}
            isActive={isActive}
            sortOrder={sortOrder}
            productsCount={brand.products_count ?? 0}
            imageUrl={brand.image?.path}
          />
        </form>
      </Form>
    </div>
  );
}
