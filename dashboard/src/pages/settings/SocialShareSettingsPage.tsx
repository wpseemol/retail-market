import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import {
    validateOgImageFile,
    type SiteSettingsApiResponse,
    type SiteSettingsFormValues,
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

type TextField = keyof Pick<
    SiteSettingsFormValues,
    "og_title" | "twitter_title" | "og_description" | "twitter_description"
>;

function TextRow({
    name,
    label,
    placeholder,
    multiline,
}: {
    name: TextField;
    label: string;
    placeholder?: string;
    multiline?: boolean;
}) {
    const { form } = useSiteSettings();
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        {multiline ? (
                            <Textarea rows={3} {...field} />
                        ) : (
                            <Input placeholder={placeholder} {...field} />
                        )}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export function SocialShareSettingsPage() {
    const { token, form, settings, setSettings, showError, showSuccess } = useSiteSettings();
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function onOgImageFile(file: File | null) {
        if (!file) return;
        const checked = validateOgImageFile(file);
        if (!checked.ok) {
            showError(checked.message);
            if (fileRef.current) fileRef.current.value = "";
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("image", file);
            const data = await apiUpload<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings/og-image",
                fd,
                { token },
            );
            setSettings(data.settings);
            showSuccess("OG image updated");
        } catch (err) {
            showError(err instanceof ApiError ? err.message : "OG image upload failed");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    return (
        <GeneralSettingsForm>
            <SettingsSection
                title="Social share"
                description="Open Graph and Twitter/X card metadata for link previews."
                icon={Share2}
            >
                <BrandingImageDropzone
                    title="Open Graph image"
                    emptyLabel="OG Image"
                    description="Optional. JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server."
                    previewUrl={settings.og_image?.path ?? null}
                    previewClassName="h-24 w-40"
                    uploading={uploading}
                    disabled={form.formState.isSubmitting}
                    inputRef={fileRef}
                    onPick={() => fileRef.current?.click()}
                    onFile={(file) => void onOgImageFile(file)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <TextRow name="og_title" label="OG title" placeholder="Same as page title if blank" />
                    <TextRow
                        name="twitter_title"
                        label="Twitter/X title"
                        placeholder="Same as OG title if blank"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <TextRow name="og_description" label="OG description" multiline />
                    <TextRow name="twitter_description" label="Twitter/X description" multiline />
                </div>

                <FormField
                    control={form.control}
                    name="twitter_handle"
                    render={({ field }) => (
                        <FormItem className="max-w-xs">
                            <FormLabel>Twitter/X handle</FormLabel>
                            <FormControl>
                                <Input placeholder="@yourhandle" {...field} />
                            </FormControl>
                            <FormDescription>Include the @ sign, e.g. @niyenin.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
