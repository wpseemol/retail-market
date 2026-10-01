import { useRef, useState, type RefObject } from "react";
import { Globe } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import { imageUploadHint } from "@/lib/imagePresets";
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
import { GeneralSettingsForm } from "../GeneralSettingsForm";
import { SeoMovedNotice } from "./SeoMovedNotice";
import { useSiteSettings } from "../settingsContext";

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
                description="Site name, login logo, and favicon."
                icon={Globe}
            >
                <FormField
                    control={form.control}
                    name="site_name"
                    render={({ field }) => (
                        <FormItem className="max-w-md">
                            <FormLabel>Site name</FormLabel>
                            <FormControl>
                                <Input placeholder="Niyenin" {...field} />
                            </FormControl>
                            <FormDescription>Short brand name.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <SeoMovedNotice what="Page title, meta description and keywords" />
                <div className="grid gap-4 lg:grid-cols-2">
                    <BrandingImageDropzone
                        title="Login logo"
                        emptyLabel="Login"
                        description={imageUploadHint("loginLogo", 1, {
                            prefix: "Shown on the dashboard sign-in screen",
                        })}
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
                        description={imageUploadHint("favicon", 1, {
                            prefix: "Browser tab icon for the dashboard and storefront",
                        })}
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
