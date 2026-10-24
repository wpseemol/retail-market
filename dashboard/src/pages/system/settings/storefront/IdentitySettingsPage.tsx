import { useRef, useState, type RefObject } from "react";
import { Globe } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import { checkImageDimensions, imageUploadHint } from "@/lib/imagePresets";
import {
    applyFaviconHref,
    FALLBACK_FAVICON,
    FALLBACK_LOGIN_LOGO,
    invalidateSiteBrandingCache,
} from "@/lib/siteBranding";
import {
    validateFaviconFile,
    validateLoginImageFile,
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

type UploadKind = "favicon" | "login-logo" | "login-image";

const UPLOAD_COPY: Record<
    UploadKind,
    { preset: "favicon" | "loginLogo" | "loginPanel"; success: string; failure: string }
> = {
    favicon: { preset: "favicon", success: "Favicon updated", failure: "Favicon upload failed" },
    "login-logo": {
        preset: "loginLogo",
        success: "Login logo updated",
        failure: "Login logo upload failed",
    },
    "login-image": {
        preset: "loginPanel",
        success: "Login image updated",
        failure: "Login image upload failed",
    },
};

export function IdentitySettingsPage() {
    const { token, form, settings, setSettings, showError, showSuccess } = useSiteSettings();
    const [uploading, setUploading] = useState<UploadKind | null>(null);
    const faviconRef = useRef<HTMLInputElement>(null);
    const loginLogoRef = useRef<HTMLInputElement>(null);
    const loginImageRef = useRef<HTMLInputElement>(null);

    async function upload(kind: UploadKind, file: File | null, input: RefObject<HTMLInputElement | null>) {
        if (!file) return;
        const typeCheck =
            kind === "favicon"
                ? validateFaviconFile(file)
                : kind === "login-logo"
                  ? validateLoginLogoFile(file)
                  : validateLoginImageFile(file);
        const checked = typeCheck.ok
            ? await checkImageDimensions(file, UPLOAD_COPY[kind].preset)
            : typeCheck;
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
            showSuccess(UPLOAD_COPY[kind].success);
        } catch (err) {
            showError(err instanceof ApiError ? err.message : UPLOAD_COPY[kind].failure);
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
                description="Site name, dashboard login logo, storefront login photo, and favicon."
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
                        preset="loginLogo"
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
                        preset="favicon"
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
                    <div className="max-w-xl lg:col-span-2">
                        <BrandingImageDropzone
                            title="Storefront login image"
                            preset="loginPanel"
                            emptyLabel="Login"
                            description={imageUploadHint("loginPanel", 1, {
                                prefix: "Left side of the storefront login and create-account pages",
                            })}
                            previewUrl={settings.login_image?.path ?? null}
                            previewClassName="h-40 w-32 bg-muted/40"
                            imgClassName="object-cover p-0"
                            uploading={uploading === "login-image"}
                            disabled={isSubmitting}
                            onPick={() => loginImageRef.current?.click()}
                            inputRef={loginImageRef}
                            onFile={(file) => void upload("login-image", file, loginImageRef)}
                        />
                    </div>
                </div>
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
