import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { ApiError, apiFetch, apiUpload } from "@/lib/api";
import { slugifyClient, type Shop } from "@/lib/shops";
import {
  shopCreateFormSchema,
  toShopCreateApiBody,
  validateShopImageFile,
  type ShopCreateFormValues,
} from "@/lib/validators/shop";
import { useAuthStore } from "@/store/auth";
import {
  ShopFormHeader,
  ShopFormSection,
  ShopImageDropzone,
  ShopLivePreview,
  ShopStickyActions,
} from "@/components/shops/ShopFormShell";
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

type OwnerOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

const OWNER_SEARCH_LIMIT = 6;
const OWNER_ROLES = "super_admin,admin,moderator,vendor";

export function ShopCreatePage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const ownerWrapRef = useRef<HTMLDivElement>(null);

  const [slugTouched, setSlugTouched] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerResults, setOwnerResults] = useState<OwnerOption[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);

  const form = useForm<ShopCreateFormValues>({
    resolver: zodResolver(shopCreateFormSchema),
    defaultValues: {
      shop_name: "",
      slug: "",
      description: "",
      status: "draft",
      user_id: "",
    },
    mode: "onBlur",
  });

  const shopName = form.watch("shop_name");
  const slug = form.watch("slug");
  const description = form.watch("description");
  const status = form.watch("status");
  const ownerId = form.watch("user_id");

  useEffect(() => {
    if (!token || !isSuper) return;

    const q = ownerQuery.trim();
    if (q.length < 1) {
      setOwnerResults([]);
      setOwnerSearching(false);
      return;
    }

    if (ownerId && q.toLowerCase() === ownerEmail.trim().toLowerCase()) {
      setOwnerResults([]);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setOwnerSearching(true);
        try {
          const params = new URLSearchParams({
            roles: OWNER_ROLES,
            limit: String(OWNER_SEARCH_LIMIT),
            q,
          });
          const data = await apiFetch<{ users: OwnerOption[] }>(
            `/api/dashboard/users?${params.toString()}`,
            { token },
          );
          if (!cancelled) setOwnerResults(data.users);
        } catch {
          if (!cancelled) setOwnerResults([]);
        } finally {
          if (!cancelled) setOwnerSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [token, isSuper, ownerQuery, ownerId, ownerEmail]);

  useEffect(() => {
    if (!ownerOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (
        ownerWrapRef.current &&
        !ownerWrapRef.current.contains(event.target as Node)
      ) {
        setOwnerOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [ownerOpen]);

  useEffect(() => {
    if (!token || slugTouched || shopName.trim().length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setPreviewing(true);
        try {
          const data = await apiFetch<{ slug: string }>(
            `/api/dashboard/shops/slug-preview?name=${encodeURIComponent(shopName.trim())}`,
            { token },
          );
          form.setValue("slug", data.slug, { shouldValidate: true });
        } catch {
          form.setValue("slug", slugifyClient(shopName), {
            shouldValidate: true,
          });
        } finally {
          setPreviewing(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [shopName, slugTouched, token, form]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function onPickLogo(file: File | null) {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (file) {
      const checked = validateShopImageFile(file);
      if (!checked.ok) {
        setSubmitError(checked.message);
        setLogoFile(null);
        setLogoPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setSubmitError(null);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function selectOwner(member: OwnerOption) {
    form.setValue("user_id", member.id, { shouldValidate: true });
    setOwnerEmail(member.email);
    setOwnerQuery(member.email);
    setOwnerOpen(false);
    setSubmitError(null);
  }

  function selectMyself() {
    if (!user) return;
    form.setValue("user_id", user.id, { shouldValidate: true });
    setOwnerEmail(user.email);
    setOwnerQuery(user.email);
    setOwnerOpen(false);
    setSubmitError(null);
  }

  function clearOwner() {
    form.setValue("user_id", "", { shouldValidate: true });
    setOwnerEmail("");
    setOwnerQuery("");
    setOwnerOpen(false);
  }

  async function onSubmit(values: ShopCreateFormValues) {
    if (!token) return;

    if (isSuper && !values.user_id) {
      setSubmitError("Search and select an owner email for this store");
      return;
    }

    const imageCheck = validateShopImageFile(logoFile);
    if (!imageCheck.ok) {
      setSubmitError(imageCheck.message);
      return;
    }

    setSubmitError(null);
    try {
      const data = await apiFetch<{ message: string; shop: Shop }>(
        "/api/dashboard/shops",
        {
          method: "POST",
          token,
          body: toShopCreateApiBody(values, { includeOwner: isSuper }),
        },
      );

      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await apiUpload<{ shop: Shop }>(
          `/api/dashboard/shops/${data.shop.id}/logo`,
          formData,
          { token },
        );
      }

      navigate(`/stores/${data.shop.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to create store",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-4">
      <ShopFormHeader
        title="Create store"
        subtitle="Name, slug, and optional store image. Products and brands attach later."
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          noValidate
        >
          <div className="space-y-5">
            <ShopFormSection
              step="01"
              title="Store identity"
              description="Logo, store name, and URL slug shown on the storefront."
            >
              <ShopImageDropzone
                previewUrl={logoPreview}
                disabled={form.formState.isSubmitting}
                inputRef={fileRef}
                onPick={() => fileRef.current?.click()}
                onFile={onPickLogo}
                onClear={
                  logoFile
                    ? () => {
                        onPickLogo(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }
                    : undefined
                }
              />
              <FormField
                control={form.control}
                name="shop_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Niyenin Gadgets"
                        autoFocus
                        {...field}
                      />
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
                    <FormLabel>
                      Slug {previewing ? "(updating…)" : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          setSlugTouched(true);
                          field.onChange(slugifyClient(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase letters, numbers, and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ShopFormSection>

            <ShopFormSection
              step="02"
              title="Details & visibility"
              description="Optional description and draft vs publish. Brands stay on products."
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Optional short store description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="publish">Publish</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Draft keeps the store private; publish makes it live.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isSuper ? (
                <div className="space-y-2" ref={ownerWrapRef}>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel htmlFor="owner_email">
                      Owner (member email)
                    </FormLabel>
                    {user?.email ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={selectMyself}
                      >
                        Use my email
                      </Button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="owner_email"
                      type="search"
                      autoComplete="off"
                      value={ownerQuery}
                      placeholder="Search email (super admin, admin, moderator, vendor)…"
                      className="pr-9 pl-9"
                      onFocus={() => setOwnerOpen(true)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setOwnerQuery(value);
                        setOwnerOpen(true);
                        if (
                          ownerId &&
                          value.trim().toLowerCase() !==
                            ownerEmail.trim().toLowerCase()
                        ) {
                          form.setValue("user_id", "", {
                            shouldValidate: true,
                          });
                          setOwnerEmail("");
                        }
                      }}
                    />
                    {ownerQuery ? (
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                        onClick={clearOwner}
                        aria-label="Clear owner"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}

                    {ownerOpen ? (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                        {ownerSearching ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            Searching…
                          </p>
                        ) : ownerResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            {ownerQuery.trim()
                              ? "No member email matched"
                              : "Type to search member emails"}
                          </p>
                        ) : (
                          <ul className="max-h-56 overflow-auto py-1">
                            {ownerResults.map((member) => (
                              <li key={member.id}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => selectOwner(member)}
                                >
                                  <span className="font-medium">
                                    {member.email}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {member.first_name} {member.last_name} ·{" "}
                                    {member.role.replace("_", " ")}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {ownerId ? (
                    <p className="text-xs text-brand-primary">
                      Selected owner: {ownerEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Assign to your email or any staff member. Shows up to{" "}
                      {OWNER_SEARCH_LIMIT} matches.
                    </p>
                  )}
                </div>
              ) : null}
            </ShopFormSection>

            <ShopStickyActions
              message={
                submitError ? (
                  <p className="text-destructive" role="alert">
                    {submitError}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Validated with Zod · injection-safe strings
                  </p>
                )
              }
            >
              <Button asChild type="button" variant="outline">
                <Link to="/stores">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting || (isSuper && !ownerId)
                }
              >
                {form.formState.isSubmitting ? "Creating…" : "Create store"}
              </Button>
            </ShopStickyActions>
          </div>

          <ShopLivePreview
            mode="create"
            shopName={shopName}
            slug={slug}
            description={description}
            status={status}
            imageUrl={logoPreview}
            ownerEmail={isSuper ? ownerEmail || undefined : user?.email}
          />
        </form>
      </Form>
    </div>
  );
}
