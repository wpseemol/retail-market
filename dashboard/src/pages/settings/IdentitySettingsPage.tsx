import { useRef, useState, type RefObject } from "react";
import { Globe } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import {
    applyFaviconHref,
    FALLBACK_FAVICON,
    FALLBACK_LOGIN_LOGO,
    invalidateSiteBrandingCache,
} from "@/lib/siteBranding";
import {
    validateFaviconFile,
    validateLoginLogoFile,
    type SiteSettingsApiResponse,
} from "@/lib/validators/siteSettings";
import { BrandingImageDropzone } from "@/components/settings/BrandingImageDropzone";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GeneralSettingsForm } from "./GeneralSettingsForm";
import { useSiteSettings } from "./settingsContext";

type UploadKind = "favicon" | "login-logo";

export function IdentitySettingsPage() {
    const { token, form, settings, setSettings, showError, showSuccess } = useSiteSettings();
    const [uploading, setUploading] = useState<UploadKind | null>(null);
    const faviconRef = useRef<HTMLInputElement>(null);
    const loginLogoRef = useRef<HTMLInputElement>(null);

    async function upload(kind: UploadKind, file: File | null, input: RefObject<HTMLInputElement | null>) {
        if (!file) return;
        const checked = kind === "favicon" ? validateFaviconFile(file) : validateLoginLogoFile(file);
        if (!checked.ok) {
            showError(checked.message);
            if (input.current) input.current.value = "";
            return;
        }
        setUploading(kind);
        try {
            const fd = new FormData();
            fd.append("image", file);
            const data = await apiUpload<SiteSettingsApiResponse>(
                `/api/dashboard/site-settings/${kind}`,
                fd,
                { token },
            );
            setSettings(data.settings);
            if (kind === "favicon" && data.settings.favicon?.path) {
                applyFaviconHref(data.settings.favicon.path);
            }
            invalidateSiteBrandingCache();
            showSuccess(kind === "favicon" ? "Favicon updated" : "Login logo updated");
        } catch (err) {
            showError(
                err instanceof ApiError
                    ? err.message
                    : kind === "favicon"
                      ? "Favicon upload failed"
                      : "Login logo upload failed",
            );
        } finally {
            setUploading(null);
            if (input.current) input.current.value = "";
        }
    }

    const isSubmitting = form.formState.isSubmitting;

    return (
        <GeneralSettingsForm>
            <SettingsSection
                title="Website identity"
                description="Site name, page title, meta description, keywords, login logo, and favicon."
                icon={Globe}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="site_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Site name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Niyenin" {...field} />
                                </FormControl>
                                <FormDescription>Short brand name.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="site_title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Page title</FormLabel>
                                <FormControl>
                                    <Input placeholder="Niyenin | Retail Market" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Shown in the browser tab and search results.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="site_description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta description</FormLabel>
                            <FormControl>
                                <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormDescription>
                                10–500 characters. Shown in search engine snippets.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Keywords</FormLabel>
                            <FormControl>
                                <Input placeholder="retail, electronics, gadgets, …" {...field} />
                            </FormControl>
                            <FormDescription>Optional comma-separated keywords.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                    <BrandingImageDropzone
                        title="Login logo"
                        emptyLabel="Login"
                        description="Shown on the dashboard sign-in screen. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                        previewUrl={settings.login_logo?.path ?? null}
                        fallbackUrl={FALLBACK_LOGIN_LOGO}
                        previewClassName="h-16 w-56 bg-brand-primary"
                        uploading={uploading === "login-logo"}
                        disabled={isSubmitting}
                        onPick={() => loginLogoRef.current?.click()}
                        inputRef={loginLogoRef}
                        onFile={(file) => void upload("login-logo", file, loginLogoRef)}
                    />
                    <BrandingImageDropzone
                        title="Favicon"
                        emptyLabel="Favicon"
                        description="Browser tab icon for the dashboard and storefront. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                        previewUrl={settings.favicon?.path ?? null}
                        fallbackUrl={FALLBACK_FAVICON}
                        previewClassName="size-16 bg-muted/40"
                        uploading={uploading === "favicon"}
                        disabled={isSubmitting}
                        onPick={() => faviconRef.current?.click()}
                        inputRef={faviconRef}
                        onFile={(file) => void upload("favicon", file, faviconRef)}
                    />
                </div>
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
